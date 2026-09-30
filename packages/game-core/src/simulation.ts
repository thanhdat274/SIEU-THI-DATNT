import {
  Direction,
  GameTileMap,
  InventoryItem,
  PlayerData,
  SaveGameData,
  StoreFixture,
  TILE_SIZE,
  Vector2D,
  WorldTime,
  SupplierOrder,
  COLD_WAREHOUSE_CAPACITY,
  CustomerState,
  isSalesFixture,
  isWarehouseFixture,
  TransferShelfResult,
  UnstockShelfResult,
  SupplierCartItem,
  SupplierCartValidationResult,
  HoldingItem,
  PlanogramApplyResult,
  PlanogramBatchResult,
  RestockJobTarget,
  StockLot,
  DailyRecord,
  LedgerEntry,
  RestockSuggestionResult,
  QuestState,
  StallState,
  StallDayReport,
  StaffRole,
  StaffShift,
  StaffMember,
  StaffCandidate,
  STAFF_SHIFTS,
  PayrollResult,
  AutoBuyRule,
  AutoBuyReport,
} from '@game/shared';
import {
  INITIAL_REFRIGERATOR,
  PRODUCT_MAP,
  generateStarterTileMap,
  WAREHOUSE_FIXTURES,
  WAREHOUSE_ENTRANCE,
  STORE_BOUNDS,
  SUPPLIERS,
  SUPPLIER_MAP,
  DEFAULT_SUPPLIER_ID,
  getMaxStaffSlots,
  isShiftWithinStoreHours,
  STALLS,
  STALL_MAP,
  getSeasonForDay,
  type StallDefinition,
} from '@game/data';
import { CollisionSystem } from './collision';
import { buyLandPlot, validateStoreLayout, type LayoutResult } from './store-layout';
import { GameInputSource, vectorToDirection } from './input';
import { GameClock } from './clock';
import { expiryDay, mergeLots, normalizeLots, sumLots, takeLots } from './stock';
import { findPath, GridPoint, tileCenter } from './pathfinding';
import { CustomerManager } from './customers';
import { generateRestockSuggestions } from './suggestions';
import { emptyStallState, normalizeStallState, planStallDay } from './stalls';
import { emptyQuestState, findClaimableQuest, getDailyQuests, getStoryQuest, markQuestClaimed, normalizeQuestState, type QuestContext, type QuestProgress, type QuestReward } from './quests';
import { generateCandidatesForDay, validateHireStaff, calculatePayroll } from './staff';

function normalizeStaffSchedule(
  schedule: Record<string, StaffShift> | undefined,
  staff: StaffMember[]
): Record<string, StaffShift> {
  const staffIds = new Set(staff.map((member) => member.id));
  return Object.fromEntries(
    Object.entries(schedule ?? {}).filter(([staffId, shift]) =>
      staffIds.has(staffId) && isShiftWithinStoreHours(shift)
    )
  ) as Record<string, StaffShift>;
}

interface RestockJobClaim {
  actorId: string;
  fixtureId: string;
}

export interface GameSimulationCallbacks {
  onInteractionAvailable?: (fixture: StoreFixture | null) => void;
  onOpenFixtureModal?: (fixture: StoreFixture) => void;
  onOpenInventoryModal?: () => void;
  onDayChanged?: (newDay: number) => void;
  onTimeChanged?: () => void;
  onStockExpired?: (quantity: number) => void;
  onStateChanged?: () => void;
  onPlayerRelocated?: () => void;
  onMapChanged?: (map: GameTileMap) => void;
  onOrdersDelivered?: (quantity:number) => void;
  onLevelUp?: (level: number) => void;
}

export class GameSimulation {
  private playerData: PlayerData;
  private fixtures: StoreFixture[];
  private storedFixtures: StoreFixture[];
  private unlockedPlotIds: string[];
  private inventory: InventoryItem[];
  private holdingArea: HoldingItem[];
  private planogram: Record<string, string> = {};
  private staff: StaffMember[] = [];
  private staffSchedule: Record<string, StaffShift> = {};
  private restockJobClaims = new Map<string, RestockJobClaim>();
  private wageDebt: number = 0;
  private processedPayrollDayIds: Set<number> = new Set();
  private autoBuyEnabled = false;
  private autoBuyRules: AutoBuyRule[] = [];
  private processedAutoBuyDayIds = new Set<number>();
  private autoBuyReports: Record<number, AutoBuyReport> = {};
  private pendingOrders: SupplierOrder[];
  private dailyRecords: Record<number, DailyRecord> = {};
  private quests: QuestState = emptyQuestState();
  private stalls: StallState = emptyStallState();
  private currentDayRecord: DailyRecord;
  private ledger: LedgerEntry[] = [];
  private closedDayIds: Set<number> = new Set();
  private statistics: SaveGameData['statistics'];
  private createdAt: string;
  private tileMap: GameTileMap;
  private collisionSystem: CollisionSystem;
  private clock: GameClock;
  private inputManager: GameInputSource;
  private customerManager: CustomerManager;
  private completedCheckoutIds: Set<string>;

  private activeFixture: StoreFixture | null = null;
  private playerSpeed: number = 130; // Pixels per second
  private isMoving: boolean = false;
  private isPaused: boolean = false;
  private callbacks: GameSimulationCallbacks = {};

  constructor(
    initialSave: SaveGameData,
    tileMap: GameTileMap,
    inputManager: GameInputSource,
    callbacks: GameSimulationCallbacks = {}
  ) {
    this.playerData = { ...initialSave.player };
    this.fixtures = initialSave.storeLayout.fixtures.map((f) => ({ ...f }));
    this.storedFixtures = (initialSave.storeLayout.storedFixtures ?? []).map(f => ({ ...f }));
    this.unlockedPlotIds = [...(initialSave.storeLayout.unlockedPlotIds ?? [])];
    this.inventory = initialSave.inventory.map((i) => ({ ...i }));
    this.holdingArea = (initialSave.holdingArea ?? []).map((h) => ({ ...h }));
    this.planogram = initialSave.planogram ? { ...initialSave.planogram } : {};
    this.pendingOrders = (initialSave.pendingOrders ?? []).map((order) => ({
      ...order,
      supplierId: order.supplierId ?? DEFAULT_SUPPLIER_ID,
      delivered: order.delivered ?? false,
    }));
    this.staff = (initialSave.staff ?? []).map((s) => ({
      ...s,
      shift: isShiftWithinStoreHours(s.shift) ? s.shift : 'full_day',
    }));
    this.staffSchedule = normalizeStaffSchedule(initialSave.staffSchedule, this.staff);
    for (const member of this.staff) {
      if (member.workerTask) this.restockJobClaims.set(member.workerTask.fixtureId, { actorId: member.id, fixtureId: member.workerTask.fixtureId });
    }
    this.wageDebt = Math.max(0, initialSave.wageDebt ?? 0);
    this.processedPayrollDayIds = new Set(initialSave.processedPayrollDayIds ?? []);
    this.autoBuyEnabled = initialSave.autoBuyEnabled ?? false;
    this.autoBuyRules = this.validateAutoBuyRules(initialSave.autoBuyRules ?? []);
    this.processedAutoBuyDayIds = new Set(initialSave.processedAutoBuyDayIds ?? []);
    this.autoBuyReports = structuredClone(initialSave.autoBuyReports ?? {});
    this.statistics = { ...initialSave.statistics };
    this.createdAt = initialSave.createdAt;
    this.stalls = normalizeStallState(initialSave.stalls);
    this.tileMap = this.stalls.owned.length ? generateStarterTileMap(this.unlockedPlotIds, this.stalls.owned) : tileMap;
    this.inputManager = inputManager;
    this.callbacks = callbacks;
    this.customerManager = new CustomerManager(
      initialSave.customers ?? (initialSave.customer ? [initialSave.customer] : []),
      initialSave.customerSequence ?? 0,
      initialSave.customerSpawnCooldown ?? 4
    );
    this.dailyRecords = initialSave.dailyRecords ? structuredClone(initialSave.dailyRecords) : {};
    this.quests = normalizeQuestState(initialSave.quests);
    this.stalls = normalizeStallState(initialSave.stalls);
    this.closedDayIds = new Set(initialSave.closedDayIds ?? []);
    this.ledger = (initialSave.ledger ?? []).map((e) => ({ ...e }));
    if (initialSave.currentDayRecord) {
      this.currentDayRecord = { ...initialSave.currentDayRecord };
    } else {
      this.currentDayRecord = this.createEmptyDailyRecord(initialSave.worldTime.day);
    }
    this.completedCheckoutIds = new Set(initialSave.completedCheckoutIds ?? []);
    this.hydrateStock(initialSave.worldTime.day);

    this.collisionSystem = new CollisionSystem(this.tileMap, this.fixtures);
    this.ensureSafePlayerPosition();
    this.clock = new GameClock(initialSave.worldTime, (day) => {
      for (const cust of this.customerManager.getCustomers()) {
        this.customerManager.abandonBasket(cust, this.fixtures, this.inventory, (cnt) => {
          this.statistics.totalSpoiled = (this.statistics.totalSpoiled ?? 0) + cnt;
        }, day - 1);
        this.customerManager.routeCustomer(cust, 'leaving', this.tileMap, this.fixtures);
      }
      for (const member of this.staff) this.finishStaffJob(member, true);
      this.processPayroll(day - 1);
      this.processStalls(day - 1);
      // Close previous day's record (day - 1) idempotently and initialize new day record
      this.closeDailyRecord(day - 1);
      this.initDailyRecord(day);
      const spoiled = this.expireStock(day);
      this.deliverOrders(day);
      this.processAutoBuy(day);
      this.statistics.totalDaysPassed = Math.max(this.statistics.totalDaysPassed, day - 1);
      if (spoiled > 0) this.callbacks.onStockExpired?.(spoiled);
      if (this.callbacks.onDayChanged) {
        this.callbacks.onDayChanged(day);
      }
      this.notifyStateChanged();
    }, () => this.callbacks.onTimeChanged?.());
  }

  public getPlayerData(): PlayerData {
    return { ...this.playerData };
  }

  public getFixtures(): StoreFixture[] {
    return this.fixtures;
  }

  public setPaused(paused: boolean): void { this.isPaused = paused; }

  public getTileMap(): GameTileMap { return this.tileMap; }

  public getStoredFixtures(): StoreFixture[] { return structuredClone(this.storedFixtures); }
  public getUnlockedPlotIds(): string[] { return [...this.unlockedPlotIds]; }

  public applyStoreLayout(save: SaveGameData): LayoutResult {
    if (this.clock.getTime().isStoreOpen || this.customerManager.getCustomers().some(customer => customer.stage !== 'leaving') || this.staff.some(member => !!member.workerTask)) {
      return { error: 'store_open' };
    }
    const nextMap = generateStarterTileMap(save.storeLayout.unlockedPlotIds ?? [], this.stalls.owned);
    const valid = validateStoreLayout(save, nextMap);
    if (valid.error) return valid;
    this.tileMap = nextMap;
    this.collisionSystem.updateTileMap(nextMap);
    this.importSaveData(save);
    this.callbacks.onMapChanged?.(nextMap);
    return { save: this.exportSaveData(save.id, Math.max(0, save.revision - 1)) };
  }

  public purchaseLand(plotId: string): LayoutResult {
    const result = buyLandPlot(this.exportSaveData(), plotId);
    if (!result.save || result.error) return result;
    return this.applyStoreLayout(result.save);
  }

  public getInventory(): InventoryItem[] {
    return this.inventory.map((item) => ({ ...item, lots: item.lots?.map((lot) => ({ ...lot })) }));
  }

  public getColdWarehouseCount(): number {
    return this.inventory.reduce((count, item) => count + (PRODUCT_MAP[item.productId]?.storageType === 'cold' ? item.quantity : 0), 0);
  }

  public getPendingOrders(): SupplierOrder[] {
    return this.pendingOrders.map((order) => ({ ...order }));
  }

  public getHoldingArea(): HoldingItem[] {
    return this.holdingArea.map((item) => ({ ...item }));
  }

  public getStatistics(): SaveGameData['statistics'] {
    return { ...this.statistics };
  }

  public getDailyRecords(): Record<number, DailyRecord> {
    return structuredClone(this.dailyRecords);
  }

  public getCurrentDayRecord(): DailyRecord {
    return { ...this.currentDayRecord };
  }

  public getLedger(): LedgerEntry[] {
    return this.ledger.map((e) => ({ ...e }));
  }

  public getSeason(day = this.clock.getTime().day) {
    return getSeasonForDay(day);
  }

  public getStalls(): Array<StallDefinition & { owned: boolean; buyable: boolean; reason?: string }> {
    return STALLS.map(stall => {
      const owned = this.stalls.owned.includes(stall.id);
      const reason = owned ? undefined : this.playerData.level < stall.unlockLevel ? `Mở khóa ở cấp ${stall.unlockLevel}` : this.playerData.money < stall.price ? 'Không đủ tiền' : undefined;
      return { ...stall, owned, buyable: !owned && !reason, reason };
    });
  }

  public buyStall(stallId: string): { success: boolean; reason?: string } {
    const stall = this.getStalls().find(item => item.id === stallId);
    if (!stall) return { success: false, reason: 'Quầy không tồn tại.' };
    if (stall.owned) return { success: false, reason: 'Quầy đã mở.' };
    if (!stall.buyable) return { success: false, reason: stall.reason };
    this.playerData.money -= stall.price;
    this.stalls.owned.push(stall.id);
    this.tileMap = generateStarterTileMap(this.unlockedPlotIds, this.stalls.owned);
    this.collisionSystem.updateTileMap(this.tileMap);
    this.ensureSafePlayerPosition();
    for (const cust of this.customerManager.getCustomers()) {
      if (cust.stage !== 'checkout') this.customerManager.routeCustomer(cust, cust.stage, this.tileMap, this.fixtures);
    }
    this.callbacks.onMapChanged?.(this.tileMap);
    this.notifyStateChanged();
    return { success: true };
  }

  public getStallReport(): StallDayReport | undefined {
    return this.stalls.lastReport ? structuredClone(this.stalls.lastReport) : undefined;
  }

  /** Số đơn vị nguyên liệu quầy còn dùng được trong kho nhà (chưa quá hạn). */
  private warehouseUnits(productId: string): number {
    return this.inventory.find(item => item.productId === productId)?.quantity ?? 0;
  }

  /**
   * Tính quầy ăn uống của `day` đúng một lần: lấy nguyên liệu từ kho nhà theo FEFO,
   * giá vốn = giá lô thực lấy + nguyên liệu tiền mặt; thiếu nguyên liệu thì bán ít suất hơn.
   */
  private processStalls(day: number): void {
    if (day < 1 || this.stalls.processedDayIds.includes(day)) return;
    this.stalls.processedDayIds.push(day);
    const record = day === this.currentDayRecord.day ? this.currentDayRecord : (this.dailyRecords[day] ?? this.createEmptyDailyRecord(day));
    const report: StallDayReport = { day, entries: [] };
    for (const stallId of this.stalls.owned) {
      const stall = STALL_MAP[stallId];
      const plan = planStallDay(stallId, day, this.playerData.reputation, id => this.warehouseUnits(id));
      if (!stall || !plan) continue;
      let cogs = plan.servings * stall.cashCostPerServing;
      for (const [productId, units] of Object.entries(plan.ingredientUnits)) {
        if (units <= 0) continue;
        const slot = this.inventory.find(item => item.productId === productId);
        if (!slot) continue;
        slot.lots ??= normalizeLots(slot.quantity, undefined, productId, this.clock.getTime().day);
        for (const lot of takeLots(slot.lots, units)) cogs += lot.quantity * (lot.unitCost ?? PRODUCT_MAP[productId]?.purchasePrice ?? 0);
        slot.quantity = sumLots(slot.lots);
      }
      this.inventory = this.inventory.filter(item => item.quantity > 0);
      const revenue = plan.servings * stall.servingPrice;
      report.entries.push({ stallId, demand: plan.demand, servings: plan.servings, revenue, cogs, limitedBy: plan.limitedBy });
      if (plan.servings <= 0) continue;
      this.playerData.money += revenue;
      this.statistics.totalRevenue += revenue;
      record.revenue += revenue;
      record.cogs += cogs;
      record.itemsSold += plan.servings;
      this.recordLedger({ day, type: 'sale', amount: revenue, cogs, quantity: plan.servings, description: `${stall.name}: bán ${plan.servings}/${plan.demand} suất` });
    }
    record.grossProfit = record.revenue - record.cogs;
    record.netProfit = record.grossProfit - record.spoilageCost - record.wagesPaid;
    if (record !== this.currentDayRecord) this.dailyRecords[day] = record;
    this.stalls.lastReport = report;
  }

  private questContext(): QuestContext {
    return {
      day: this.currentDayRecord.day,
      player: this.playerData,
      statistics: this.statistics,
      currentDay: this.currentDayRecord,
      staffCount: this.staff.length,
      unlockedPlotCount: this.unlockedPlotIds.length,
      state: this.quests,
    };
  }

  public getQuests(): { daily: QuestProgress[]; story: QuestProgress | null } {
    const ctx = this.questContext();
    return { daily: getDailyQuests(ctx), story: getStoryQuest(ctx) };
  }

  /** Thưởng nhiệm vụ là tiền thưởng ngoài sổ GAAP (không tính vào doanh thu/lãi). */
  public claimQuest(questId: string): { success: boolean; reward?: QuestReward } {
    const quest = findClaimableQuest(this.questContext(), questId);
    if (!quest) return { success: false };
    markQuestClaimed(this.quests, this.currentDayRecord.day, questId);
    this.playerData.money += quest.reward.money;
    this.addExperience(quest.reward.experience);
    this.notifyStateChanged();
    return { success: true, reward: quest.reward };
  }

  public getStaff(): StaffMember[] {
    return this.staff.map((member) => ({ ...member }));
  }

  public getAutoBuyConfig(): { enabled: boolean; rules: AutoBuyRule[]; reports: Record<number, AutoBuyReport> } {
    return { enabled: this.autoBuyEnabled, rules: structuredClone(this.autoBuyRules), reports: structuredClone(this.autoBuyReports) };
  }

  public setAutoBuyConfig(enabled: boolean, rules: AutoBuyRule[]): { success: boolean; reason?: string } {
    const valid = this.validateAutoBuyRules(rules);
    if (valid.length !== rules.length) return { success: false, reason: 'Quy tắc có sản phẩm, nhà cung cấp hoặc giới hạn không hợp lệ.' };
    this.autoBuyEnabled = !!enabled;
    this.autoBuyRules = valid;
    this.notifyStateChanged();
    return { success: true };
  }

  private validateAutoBuyRules(rules: AutoBuyRule[]): AutoBuyRule[] {
    return rules.filter((rule) => !!PRODUCT_MAP[rule.productId] && !!SUPPLIER_MAP[rule.supplierId] &&
      Number.isSafeInteger(rule.threshold) && rule.threshold >= 0 && Number.isSafeInteger(rule.quantity) && rule.quantity > 0 &&
      Number.isSafeInteger(rule.priority) && rule.priority >= 0 && Number.isSafeInteger(rule.maxBudget) && rule.maxBudget > 0 &&
      typeof rule.id === 'string' && rule.id.length > 0).map((rule) => ({ ...rule }));
  }

  private processAutoBuy(day: number): void {
    if (this.processedAutoBuyDayIds.has(day)) return;
    this.processedAutoBuyDayIds.add(day);
    const report: AutoBuyReport = { day, placed: [], skipped: [] };
    this.autoBuyReports[day] = report;
    if (!this.autoBuyEnabled) return;
    const coldIncoming = () => this.pendingOrders.reduce((sum, order) => sum + (!order.delivered && PRODUCT_MAP[order.productId]?.storageType === 'cold' ? order.quantity : 0), 0);
    let remainingBudget = Math.max(0, this.playerData.money);
    const rules = [...this.autoBuyRules].sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id));
    for (const rule of rules) {
      const product = PRODUCT_MAP[rule.productId]!;
      const onHand = this.inventory.find((item) => item.productId === rule.productId)?.quantity ?? 0;
      const incoming = this.pendingOrders.filter((order) => order.productId === rule.productId && !order.delivered).reduce((sum, order) => sum + order.quantity, 0);
      if (onHand + incoming > rule.threshold) continue;
      let quantity = rule.quantity;
      const supplier = SUPPLIER_MAP[rule.supplierId]!;
      const unitPrice = Math.max(1, Math.round(product.purchasePrice * (1 - supplier.discountRate)));
      const affordable = Math.floor(Math.min(remainingBudget, rule.maxBudget) / unitPrice);
      quantity = Math.min(quantity, affordable);
      if (product.storageType === 'cold') quantity = Math.min(quantity, Math.max(0, COLD_WAREHOUSE_CAPACITY - this.getColdWarehouseCount() - coldIncoming()));
      if (quantity <= 0) {
        report.skipped.push({ ruleId: rule.id, productId: rule.productId, reason: 'Vượt ngân sách hoặc không còn chỗ kho mát.' });
        continue;
      }
      const result = this.orderSupplierCart(rule.supplierId, [{ productId: rule.productId, quantity }]);
      if (!result.success) {
        report.skipped.push({ ruleId: rule.id, productId: rule.productId, reason: result.reasons?.join(' · ') ?? 'Không thể đặt đơn.' });
        continue;
      }
      const paidTotal = result.paidTotal ?? 0;
      remainingBudget = Math.max(0, remainingBudget - paidTotal);
      report.placed.push({ ruleId: rule.id, productId: rule.productId, quantity, supplierId: rule.supplierId, paidTotal });
    }
    this.notifyStateChanged();
  }

  public getWageDebt(): number {
    return this.wageDebt;
  }

  public getStaffCandidates(day = this.clock.getTime().day): StaffCandidate[] {
    return generateCandidatesForDay(day);
  }

  public hireStaff(candidateId: string): { success: boolean; reason?: string } {
    const candidate = this.getStaffCandidates().find((item) => item.id === candidateId);
    if (!candidate) return { success: false, reason: 'Ứng viên hôm nay không còn khả dụng.' };
    const validation = validateHireStaff({
      playerLevel: this.playerData.level,
      playerMoney: this.playerData.money,
      currentStaffCount: this.staff.length,
      candidate,
      existingStaffIds: this.staff.map((member) => member.id),
    });
    if (!validation.valid) {
      const reasons: Record<string, string> = {
        level_locked: 'Cần đạt cấp 2 mới được thuê nhân viên.',
        slots_full: 'Tiệm đã dùng hết vị trí nhân viên.',
        insufficient_funds: 'Không đủ tiền trả phí tuyển dụng.',
        already_hired: 'Ứng viên này đã được tuyển.',
      };
      return { success: false, reason: reasons[validation.reason ?? ''] ?? 'Không thể tuyển ứng viên.' };
    }

    this.playerData.money -= candidate.hiringFee;
    {
      const hireDay = this.clock.getTime().day;
      this.recordLedger({ day: hireDay, type: 'wage', amount: candidate.hiringFee, description: `Phí tuyển ${candidate.name}` });
      const hireRecord = hireDay === this.currentDayRecord.day ? this.currentDayRecord : (this.dailyRecords[hireDay] ??= this.createEmptyDailyRecord(hireDay));
      hireRecord.wagesPaid += candidate.hiringFee;
      hireRecord.netProfit = hireRecord.revenue - hireRecord.cogs - hireRecord.spoilageCost - hireRecord.wagesPaid;
    }
    const member: StaffMember = {
      id: candidate.id,
      name: candidate.name,
      role: candidate.role,
      speed: candidate.speed,
      accuracy: candidate.accuracy,
      stamina: candidate.stamina,
      dailyWage: candidate.dailyWage,
      hiredOnDay: this.clock.getTime().day,
      shift: 'full_day',
      position: candidate.role === 'cashier'
        ? (() => {
            const counter = this.fixtures.find((fixture) => fixture.type === 'cashier_counter');
            return counter
              ? { x: (counter.tileX + counter.widthTiles / 2) * TILE_SIZE, y: (counter.tileY + counter.heightTiles + 1) * TILE_SIZE }
              : { ...WAREHOUSE_ENTRANCE };
          })()
        : { ...WAREHOUSE_ENTRANCE },
    };
    this.staff.push(member);
    this.staffSchedule[member.id] = member.shift;
    return { success: true };
  }

  public setStaffShift(staffId: string, shift: StaffShift): boolean {
    const member = this.staff.find((item) => item.id === staffId);
    if (!member || !isShiftWithinStoreHours(shift)) return false;
    member.shift = shift;
    this.staffSchedule[staffId] = shift;
    if (member.workerTask && !this.isActorAvailableForRestock(staffId)) this.finishStaffJob(member, true);
    if (member.role === 'cashier' && member.currentCheckoutId && !this.isStaffOnShift(member)) {
      this.completeCustomerCheckout(member.currentCheckoutId);
      this.customerManager.assignCashier(member.currentCheckoutId, undefined);
      member.checkoutServiceRemaining = 0;
      member.currentCheckoutId = undefined;
    }
    this.notifyStateChanged();
    return true;
  }

  private routeToFixture(startPosition: Vector2D, fixture: StoreFixture): Vector2D[] | undefined {
    const start = { x: Math.floor(startPosition.x / TILE_SIZE), y: Math.floor(startPosition.y / TILE_SIZE) };
    const goals: GridPoint[] = [];
    for (let x = fixture.tileX; x < fixture.tileX + fixture.widthTiles; x++) {
      goals.push({ x, y: fixture.tileY - 1 }, { x, y: fixture.tileY + fixture.heightTiles });
    }
    for (let y = fixture.tileY; y < fixture.tileY + fixture.heightTiles; y++) {
      goals.push({ x: fixture.tileX - 1, y }, { x: fixture.tileX + fixture.widthTiles, y });
    }
    const paths = goals.map((goal) => findPath(this.tileMap, this.collisionSystem, start, goal)).filter((path) => path.length > 0);
    paths.sort((a, b) => a.length - b.length);
    return paths[0]?.slice(1).map(tileCenter);
  }

  public assignRefillJob(staffId: string, fixtureId: string): { success: boolean; reason?: string } {
    const member = this.staff.find((item) => item.id === staffId && item.role === 'refill');
    if (!member || !this.isActorAvailableForRestock(staffId)) return { success: false, reason: 'actor_unavailable' };
    const claimed = this.claimRestockJob(staffId, fixtureId);
    if (!claimed.claimed || !claimed.target) return { success: false, reason: claimed.reason };
    const product = PRODUCT_MAP[claimed.target.productId];
    const warehouse = this.fixtures.find((fixture) => fixture.id === (product.storageType === 'cold' ? 'warehouse_cold_storage' : 'warehouse_dry_rack'));
    if (!warehouse) {
      this.releaseRestockJob(staffId, fixtureId);
      return { success: false, reason: 'warehouse_missing' };
    }
    const position = member.position ?? { ...WAREHOUSE_ENTRANCE };
    const route = this.routeToFixture(position, warehouse);
    if (!route) {
      this.releaseRestockJob(staffId, fixtureId);
      return { success: false, reason: 'no_path_to_warehouse' };
    }
    member.position = { ...position };
    member.lastWorkerError = undefined;
    member.workerTask = { fixtureId, productId: claimed.target.productId, stage: 'to_warehouse', route, carriedLots: [] };
    return { success: true };
  }

  private returnWorkerCargo(member: StaffMember): void {
    const task = member.workerTask;
    if (!task?.carriedLots.length) return;
    const inventoryItem = this.inventory.find((item) => item.productId === task.productId);
    if (inventoryItem) {
      inventoryItem.lots ??= normalizeLots(inventoryItem.quantity, undefined, task.productId, this.clock.getTime().day);
      mergeLots(inventoryItem.lots, task.carriedLots);
      inventoryItem.quantity = sumLots(inventoryItem.lots);
    } else {
      const lots = task.carriedLots.map((lot) => ({ ...lot }));
      this.inventory.push({ productId: task.productId, lots, quantity: sumLots(lots) });
    }
    task.carriedLots = [];
  }

  private finishStaffJob(member: StaffMember, returnCargo: boolean): void {
    const task = member.workerTask;
    if (!task) return;
    if (returnCargo) this.returnWorkerCargo(member);
    this.releaseRestockJob(member.id, task.fixtureId);
    if (returnCargo && !member.lastWorkerError) member.lastWorkerError = 'Đã hoàn việc, hàng mang theo được trả về kho.';
    member.workerTask = undefined;
  }

  public assignNextCashierCustomer(staffId: string): boolean {
    const member = this.staff.find((candidate) => candidate.id === staffId && candidate.role === 'cashier');
    if (!member || !this.isStaffOnShift(member)) return false;
    const customer = this.customerManager.getCustomers().find((candidate) => candidate.stage === 'checkout' && !candidate.cashierStaffId && candidate.checkoutId);
    if (!customer?.checkoutId) return false;
    member.currentCheckoutId = customer.checkoutId;
    this.customerManager.assignCashier(customer.checkoutId, staffId);
    member.checkoutServiceRemaining = Math.max(0.6, 2.4 - member.accuracy * 0.15);
    return true;
  }

  private updateStaffWorkers(dt: number): void {
    for (const member of this.staff) {
      const task = member.workerTask;
      if (!task) continue;
      if (!this.isActorAvailableForRestock(member.id)) {
        this.finishStaffJob(member, true);
        continue;
      }

      const position = member.position ?? { ...WAREHOUSE_ENTRANCE };
      member.position = position;
      const waypoint = task.route[0];
      if (waypoint) {
        const dx = waypoint.x - position.x;
        const dy = waypoint.y - position.y;
        const distance = Math.hypot(dx, dy);
        const step = Math.max(35, member.speed * 16) * Math.max(0, dt);
        if (distance <= step) {
          member.position = { ...waypoint };
          task.route.shift();
        } else if (distance > 0) {
          member.position = { x: position.x + dx / distance * step, y: position.y + dy / distance * step };
        }
        if (task.route.length) continue;
      }

      const valid = this.revalidateRestockJob(member.id, task.fixtureId);
      if (!valid.valid || !valid.target) {
        member.lastWorkerError = valid.reason ?? 'Kệ hoặc đường đi không còn hợp lệ.';
        this.finishStaffJob(member, true);
        continue;
      }
      if (task.stage === 'to_warehouse') {
        const source = this.inventory.find((item) => item.productId === task.productId);
        if (!source || source.quantity <= 0) {
          member.lastWorkerError = 'Kho không còn hàng theo yêu cầu.';
          this.finishStaffJob(member, true);
          continue;
        }
        source.lots ??= normalizeLots(source.quantity, undefined, task.productId, this.clock.getTime().day);
        const quantity = Math.min(4, valid.target.needed, source.quantity);
        task.carriedLots = takeLots(source.lots, quantity);
        source.quantity = sumLots(source.lots);
        this.inventory = this.inventory.filter((item) => item.quantity > 0);
        const shelf = this.fixtures.find((item) => item.id === task.fixtureId);
        const route = shelf ? this.routeToFixture(member.position, shelf) : undefined;
        if (!route) {
          member.lastWorkerError = 'Không tìm thấy đường đến kệ.';
          this.returnWorkerCargo(member);
          this.finishStaffJob(member, false);
          continue;
        }
        task.stage = 'to_shelf';
        task.route = route;
        continue;
      }

      const shelf = this.fixtures.find((item) => item.id === task.fixtureId);
      const product = PRODUCT_MAP[task.productId];
      if (!shelf || !isSalesFixture(shelf) || !product ||
          (shelf.currentStock > 0 && shelf.assignedProductId !== task.productId)) {
        member.lastWorkerError = 'Kệ không còn khớp với việc được giao.';
        this.finishStaffJob(member, true);
        continue;
      }
      const capacity = Math.min(shelf.maxCapacity, product.shelfCapacity);
      const moved = Math.min(Math.max(0, capacity - shelf.currentStock), sumLots(task.carriedLots));
      if (moved > 0) {
        const movedLots = takeLots(task.carriedLots, moved);
        shelf.assignedProductId = task.productId;
        shelf.stockLots ??= [];
        mergeLots(shelf.stockLots, movedLots);
        shelf.currentStock = sumLots(shelf.stockLots);
      }
      this.finishStaffJob(member, true);
      member.lastWorkerError = undefined;
      this.notifyStateChanged();
    }
  }

  private isStaffOnShift(member: StaffMember): boolean {
    if (member.hiredOnDay > this.clock.getTime().day) return false;
    const shift = this.staffSchedule[member.id] ?? member.shift;
    const config = STAFF_SHIFTS[shift];
    const { hour } = this.clock.getTime();
    return !!config && hour >= config.startHour && hour < config.endHour;
  }

  private updateCashierWorkers(dt: number): void {
    for (const member of this.staff.filter((candidate) => candidate.role === 'cashier')) {
      const currentId = member.currentCheckoutId;
      if (currentId) {
        if (this.completedCheckoutIds.has(currentId)) {
          member.currentCheckoutId = undefined;
          member.checkoutServiceRemaining = 0;
        } else if (!this.isStaffOnShift(member)) {
          this.completeCustomerCheckout(currentId);
          this.customerManager.assignCashier(currentId, undefined);
          member.currentCheckoutId = undefined;
          member.checkoutServiceRemaining = 0;
        } else {
          member.checkoutServiceRemaining = Math.max(0, (member.checkoutServiceRemaining ?? 0) - dt);
          if (member.checkoutServiceRemaining <= 0) {
            this.completeCustomerCheckout(currentId);
            member.currentCheckoutId = undefined;
          }
        }
      }
      if (member.currentCheckoutId || !this.isStaffOnShift(member)) continue;
      this.assignNextCashierCustomer(member.id);
    }
  }

  /** Pay one day's scheduled wages at most once; unpaid cash becomes carried wage debt. */
  public processPayroll(day: number): PayrollResult {
    if (this.processedPayrollDayIds.has(day)) {
      return {
        day,
        totalGrossWage: 0,
        previousDebt: this.wageDebt,
        totalDue: this.wageDebt,
        paidAmount: 0,
        remainingDebt: this.wageDebt,
        unpaidStaffIds: [],
      };
    }

    const dueStaff = this.staff
      .filter((member) => member.hiredOnDay <= day)
      .map((member) => ({
        ...member,
        shift: this.staffSchedule[member.id] ?? member.shift,
      }));
    const payroll = calculatePayroll({
      day,
      staff: dueStaff,
      playerMoney: this.playerData.money,
      existingDebt: this.wageDebt,
    });
    this.playerData.money -= payroll.paidAmount;
    this.wageDebt = payroll.newDebt;
    this.processedPayrollDayIds.add(day);

    let cashForCurrentWages = Math.max(0, payroll.paidAmount - payroll.previousDebt);
    const unpaidStaffIds: string[] = [];
    for (const member of dueStaff) {
      const wage = Math.round(member.dailyWage * (STAFF_SHIFTS[member.shift]?.wageMultiplier ?? 1));
      if (cashForCurrentWages >= wage) cashForCurrentWages -= wage;
      else {
        unpaidStaffIds.push(member.id);
        cashForCurrentWages = 0;
      }
    }

    if (payroll.paidAmount > 0) {
      this.recordLedger({
        day,
        type: 'wage',
        amount: payroll.paidAmount,
        description: `Trả lương nhân viên ngày ${day}${payroll.newDebt > 0 ? `; còn nợ ${payroll.newDebt.toLocaleString('vi-VN')} ₫` : ''}`,
      });
    }

    const record = day === this.currentDayRecord.day
      ? this.currentDayRecord
      : (this.dailyRecords[day] ?? this.createEmptyDailyRecord(day));
    record.wagesPaid += payroll.paidAmount;
    record.grossProfit = record.revenue - record.cogs;
    record.netProfit = record.grossProfit - record.spoilageCost - record.wagesPaid;
    if (day !== this.currentDayRecord.day) this.dailyRecords[day] = record;

    return {
      day,
      totalGrossWage: payroll.grossWageToday,
      previousDebt: payroll.previousDebt,
      totalDue: payroll.totalDue,
      paidAmount: payroll.paidAmount,
      remainingDebt: payroll.newDebt,
      unpaidStaffIds,
    };
  }

  public getClosedDayIds(): number[] {
    return [...this.closedDayIds];
  }

  public createEmptyDailyRecord(day: number): DailyRecord {
    return {
      day,
      revenue: 0,
      cogs: 0,
      purchaseTotal: 0,
      spoilageCost: 0,
      wagesPaid: 0,
      grossProfit: 0,
      netProfit: 0,
      customersServed: 0,
      transactionsCount: 0,
      itemsSold: 0,
      spoilageCount: 0,
      productSales: {},
    };
  }

  public initDailyRecord(day: number): void {
    if (!this.dailyRecords[day]) {
      this.currentDayRecord = this.createEmptyDailyRecord(day);
    } else {
      this.currentDayRecord = { ...this.dailyRecords[day] };
      this.currentDayRecord.productSales ??= {};
    }
  }

  public closeDailyRecord(day: number): void {
    if (this.closedDayIds.has(day)) {
      return; // Idempotent: already closed
    }
    const rec = this.dailyRecords[day] ?? { ...this.currentDayRecord, day };
    rec.closedAt = rec.closedAt ?? new Date().toISOString();
    rec.grossProfit = rec.revenue - rec.cogs;
    rec.netProfit = rec.grossProfit - rec.spoilageCost - rec.wagesPaid;
    rec.productSales = { ...(rec.productSales ?? this.currentDayRecord.productSales ?? {}) };
    this.dailyRecords[day] = rec;
    this.closedDayIds.add(day);
  }

  /** Record or increment product sales in daily record */
  public recordProductSale(productId: string, quantity = 1, day?: number): void {
    const targetDay = day ?? this.clock.getTime().day;
    if (targetDay === this.clock.getTime().day) {
      this.currentDayRecord.productSales ??= {};
      this.currentDayRecord.productSales[productId] =
        (this.currentDayRecord.productSales[productId] ?? 0) + quantity;
    } else {
      if (!this.dailyRecords[targetDay]) {
        this.dailyRecords[targetDay] = this.createEmptyDailyRecord(targetDay);
      }
      this.dailyRecords[targetDay].productSales ??= {};
      this.dailyRecords[targetDay].productSales![productId] =
        (this.dailyRecords[targetDay].productSales![productId] ?? 0) + quantity;
    }
  }

  /**
   * Generate intelligent restock suggestions based on sales velocity and store state.
   */
  public suggestRestock(supplierId?: string, budget?: number): RestockSuggestionResult {
    return generateRestockSuggestions({
      supplierId,
      playerLevel: this.playerData.level,
      playerMoney: this.playerData.money,
      currentDay: this.clock.getTime().day,
      fixtures: this.fixtures,
      inventory: this.inventory,
      holdingArea: this.holdingArea,
      pendingOrders: this.pendingOrders,
      dailyRecords: this.dailyRecords,
      currentDayRecord: this.currentDayRecord,
      coldWarehouseCount: this.getColdWarehouseCount(),
      budget,
    });
  }

  private recordLedger(entry: Omit<LedgerEntry, 'id' | 'timestamp'>): LedgerEntry {
    const fullEntry: LedgerEntry = {
      ...entry,
      id: `led-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
    };
    this.ledger.push(fullEntry);
    return fullEntry;
  }

  public getClock(): GameClock {
    return this.clock;
  }

  public getCustomer(): CustomerState | null {
    return this.customerManager.getActiveCustomer();
  }

  public getCustomers(): CustomerState[] {
    return this.customerManager.getCustomers();
  }

  public getCustomerManager(): CustomerManager {
    return this.customerManager;
  }

  public getTime(): WorldTime {
    return this.clock.getTime();
  }

  public getActiveFixture(): StoreFixture | null {
    return this.activeFixture;
  }

  public getIsMoving(): boolean {
    return this.isMoving;
  }

  public setCallbacks(callbacks: GameSimulationCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  private hydrateStock(day: number): void {
    const sideRoom=this.fixtures.some(f=>f.id==='warehouse_dry_rack'&&f.tileX>=15);
    const p=this.playerData.position;
    if(sideRoom&&p.x>=15*32&&p.x<23*32&&p.y>=32&&p.y<8*32){this.playerData.position={...WAREHOUSE_ENTRANCE};this.callbacks.onPlayerRelocated?.();}
    for(const fixture of WAREHOUSE_FIXTURES) {
      const index=this.fixtures.findIndex(f=>f.id===fixture.id);
      if(index<0)this.fixtures.push({...fixture});
      else this.fixtures[index]={...fixture};
    }
    // A version-1 save has no refrigerator or lot data. Preserve its quantities
    // and assign a fresh shelf life when first loaded into version 2.
    if (!this.fixtures.some((fixture) => fixture.id === INITIAL_REFRIGERATOR.id)) {
      this.fixtures.push({ ...INITIAL_REFRIGERATOR, stockLots: [] });
    }
    this.inventory = this.inventory.map((item) => {
      const lots = normalizeLots(item.quantity, item.lots, item.productId, day);
      return { productId: item.productId, quantity: sumLots(lots), lots };
    }).filter((item) => item.quantity > 0);
    this.fixtures = this.fixtures.map((fixture) => {
      if(isWarehouseFixture(fixture)) return {...fixture,assignedProductId:undefined,currentStock:0,stockLots:[]};
      if (!fixture.assignedProductId || fixture.currentStock <= 0) {
        return { ...fixture, assignedProductId: undefined, currentStock: 0, stockLots: [] };
      }
      const stockLots = normalizeLots(fixture.currentStock, fixture.stockLots, fixture.assignedProductId, day);
      return { ...fixture, currentStock: sumLots(stockLots), stockLots };
    });
    this.expireStock(day);
  }

  private expireStock(day: number): number {
    let spoiled = 0;
    let spoilageCost = 0;

    this.inventory = this.inventory.map((item) => {
      const prod = PRODUCT_MAP[item.productId];
      const fallbackCost = prod?.purchasePrice ?? 0;
      const expired = (item.lots ?? []).filter((lot) => lot.expiresOnDay <= day);
      for (const lot of expired) {
        spoiled += lot.quantity;
        spoilageCost += lot.quantity * (lot.unitCost ?? fallbackCost);
      }
      const lots = (item.lots ?? []).filter((lot) => lot.expiresOnDay > day);
      return { ...item, lots, quantity: sumLots(lots) };
    }).filter((item) => item.quantity > 0);

    for (const fixture of this.fixtures) {
      const lots = fixture.stockLots ?? [];
      const prod = fixture.assignedProductId ? PRODUCT_MAP[fixture.assignedProductId] : undefined;
      const fallbackCost = prod?.purchasePrice ?? 0;
      const expired = lots.filter((lot) => lot.expiresOnDay <= day);
      for (const lot of expired) {
        spoiled += lot.quantity;
        spoilageCost += lot.quantity * (lot.unitCost ?? fallbackCost);
      }
      fixture.stockLots = lots.filter((lot) => lot.expiresOnDay > day);
      fixture.currentStock = sumLots(fixture.stockLots);
      if (fixture.currentStock === 0) fixture.assignedProductId = undefined;
    }

    const expiredHolding = this.holdingArea.filter((item) => item.expiresOnDay <= day);
    for (const h of expiredHolding) {
      spoiled += h.quantity;
      const fallbackCost = PRODUCT_MAP[h.productId]?.purchasePrice ?? 0;
      spoilageCost += h.quantity * (h.unitCost ?? fallbackCost);
    }
    this.holdingArea = this.holdingArea.filter((item) => item.expiresOnDay > day);

    this.statistics.totalSpoiled = (this.statistics.totalSpoiled ?? 0) + spoiled;

    if (spoiled > 0) {
      this.currentDayRecord.spoilageCount += spoiled;
      this.currentDayRecord.spoilageCost += spoilageCost;
      this.currentDayRecord.netProfit = this.currentDayRecord.grossProfit - this.currentDayRecord.spoilageCost - this.currentDayRecord.wagesPaid;
      this.recordLedger({
        day,
        type: 'spoilage',
        amount: spoilageCost,
        quantity: spoiled,
        description: `Hàng hết hạn hủy bỏ (${spoiled} sản phẩm)`,
      });
    }

    return spoiled;
  }

  private reservedColdWarehouseCount(): number {
    return this.getColdWarehouseCount() + this.pendingOrders.reduce((count, order) =>
      count + (!order.delivered && PRODUCT_MAP[order.productId]?.storageType === 'cold' ? order.quantity : 0), 0);
  }

  /**
   * Fixed update step
   */
  public update(dt: number): void {
    if (this.isPaused) return;
    // 1. Advance game clock
    this.clock.update(dt);
    this.customerManager.update(
      dt,
      this.clock.getTime().isStoreOpen,
      this.clock.getTime().day,
      this.tileMap,
      this.fixtures,
      this.inventory,
      (repLoss) => {
        this.playerData.reputation = Math.max(0, this.playerData.reputation - repLoss);
        this.notifyStateChanged();
      },
      (spoiled) => {
        this.statistics.totalSpoiled = (this.statistics.totalSpoiled ?? 0) + spoiled;
        this.callbacks.onStockExpired?.(spoiled);
        this.notifyStateChanged();
      }
    );
    this.customerManager.maybeSpawnCustomer(
      dt,
      this.clock.getTime().isStoreOpen,
      this.fixtures,
      this.tileMap,
      this.clock.getTime().day,
      this.statistics.totalCustomersServed,
      this.getSeason()?.demandMultiplier ?? 1,
      this.getSeason()?.preferredCategories ?? []
    );

    this.updateStaffWorkers(dt);
    this.updateCashierWorkers(dt);

    // Auto checkout for customer waiting at counter if checkoutWait timer reaches 0
    const activeCust = this.customerManager.getActiveCustomer();
    if (activeCust && activeCust.stage === 'checkout' && activeCust.checkoutWait <= 0 && activeCust.checkoutId) {
      this.completeCustomerCheckout(activeCust.checkoutId);
    }

    // 2. Process player movement
    const moveVec = this.inputManager.getMovementVector();
    this.isMoving = Math.abs(moveVec.x) > 0.05 || Math.abs(moveVec.y) > 0.05;

    if (this.isMoving) {
      this.playerData.direction = vectorToDirection(
        moveVec,
        this.playerData.direction
      );

      const velocity: Vector2D = {
        x: moveVec.x * this.playerSpeed,
        y: moveVec.y * this.playerSpeed,
      };

      this.playerData.position = this.collisionSystem.resolveMovement(
        this.playerData.position,
        velocity,
        dt
      );
    }

    // 3. Check proximity to fixtures (Interaction detection)
    this.checkNearbyInteractions();

    // 4. Handle input action requests
    if (this.inputManager.consumeInteract()) {
      if (this.activeFixture && this.callbacks.onOpenFixtureModal) {
        this.callbacks.onOpenFixtureModal(this.activeFixture);
      }
    }

    if (this.inputManager.consumeInventoryToggle()) {
      if (this.callbacks.onOpenInventoryModal) {
        this.callbacks.onOpenInventoryModal();
      }
    }
  }

  private checkNearbyInteractions(): void {
    const pX = this.playerData.position.x;
    const pY = this.playerData.position.y;
    let closestFixture: StoreFixture | null = null;
    let minDistance = 56; // Interaction reach distance in pixels

    for (const fix of this.fixtures) {
      // Center of fixture
      const fCenterX = (fix.tileX + fix.widthTiles / 2) * TILE_SIZE;
      const fCenterY = (fix.tileY + fix.heightTiles / 2) * TILE_SIZE;

      const dist = Math.hypot(pX - fCenterX, pY - fCenterY);
      if (dist < minDistance) {
        minDistance = dist;
        closestFixture = fix;
      }
    }

    if (this.activeFixture?.id !== closestFixture?.id) {
      this.activeFixture = closestFixture;
      if (this.callbacks.onInteractionAvailable) {
        this.callbacks.onInteractionAvailable(this.activeFixture);
      }
    }
  }

  /**
   * Transfer items to a sales shelf with detailed result.
   */
  public transferToShelf(fixtureId: string, productId: string, amount: number = 1): TransferShelfResult {
    const fixture = this.fixtures.find((f) => f.id === fixtureId);
    if (!fixture || !isSalesFixture(fixture)) {
      return { success: false, actualQuantity: 0, reason: !fixture ? 'fixture_not_found' : 'not_sales_fixture' };
    }
    if (!Number.isSafeInteger(amount) || amount <= 0) {
      return { success: false, actualQuantity: 0, reason: 'invalid_amount' };
    }

    const product = PRODUCT_MAP[productId];
    if (!product || product.unlockLevel > this.playerData.level) {
      return { success: false, actualQuantity: 0, reason: 'product_locked' };
    }
    if (product.storageType === 'cold' && fixture.type !== 'refrigerator') {
      return { success: false, actualQuantity: 0, reason: 'storage_mismatch' };
    }
    if (product.storageType !== 'cold' && fixture.type === 'refrigerator') {
      return { success: false, actualQuantity: 0, reason: 'storage_mismatch' };
    }

    const inventorySlot = this.inventory.find((i) => i.productId === productId);
    if (!inventorySlot || inventorySlot.quantity <= 0) {
      return { success: false, actualQuantity: 0, reason: 'no_inventory' };
    }

    // If shelf already has a different product, can't mix
    if (fixture.assignedProductId && fixture.assignedProductId !== productId && fixture.currentStock > 0) {
      return { success: false, actualQuantity: 0, reason: 'product_mismatch' };
    }

    const effectiveCapacity = Math.min(fixture.maxCapacity, product.shelfCapacity);
    const availableSpace = effectiveCapacity - fixture.currentStock;
    if (availableSpace <= 0) {
      return { success: false, actualQuantity: 0, reason: 'no_space' };
    }

    const actualTransfer = Math.min(amount, inventorySlot.quantity, availableSpace);
    if (actualTransfer <= 0) {
      return { success: false, actualQuantity: 0, reason: 'no_space' };
    }

    const moved = takeLots(inventorySlot.lots!, actualTransfer);
    inventorySlot.quantity = sumLots(inventorySlot.lots!);
    fixture.assignedProductId = productId;
    fixture.stockLots ??= [];
    mergeLots(fixture.stockLots, moved);
    fixture.currentStock = sumLots(fixture.stockLots);

    // Clean up empty inventory slots
    if (inventorySlot.quantity <= 0) {
      this.inventory = this.inventory.filter((i) => i.quantity > 0);
    }

    this.notifyStateChanged();
    return { success: true, actualQuantity: actualTransfer, reason: 'success' };
  }

  /**
   * Restock a shelf from player's inventory
   */
  public restockShelf(fixtureId: string, productId: string, amount: number = 1): boolean {
    return this.transferToShelf(fixtureId, productId, amount).success;
  }

  /**
   * Transfer items from shelf back into inventory with detailed result.
   */
  public transferFromShelf(fixtureId: string, amount: number = 1): UnstockShelfResult {
    const fixture = this.fixtures.find((f) => f.id === fixtureId);
    if (!fixture || !isSalesFixture(fixture)) {
      return { success: false, actualQuantity: 0, reason: !fixture ? 'fixture_not_found' : 'not_sales_fixture' };
    }
    if (!fixture.assignedProductId || fixture.currentStock <= 0) {
      return { success: false, actualQuantity: 0, reason: 'empty_shelf' };
    }
    if (!Number.isSafeInteger(amount) || amount <= 0) {
      return { success: false, actualQuantity: 0, reason: 'invalid_amount' };
    }

    const available = fixture.currentStock - this.reservedShelfStock(fixtureId);
    if (available <= 0) {
      return { success: false, actualQuantity: 0, reason: 'empty_shelf' };
    }
    const actualAmount = Math.min(amount, available);
    if (PRODUCT_MAP[fixture.assignedProductId]?.storageType === 'cold' &&
      this.reservedColdWarehouseCount() + actualAmount > COLD_WAREHOUSE_CAPACITY) {
      return { success: false, actualQuantity: 0, reason: 'cold_storage_full' };
    }
    const moved = takeLots(fixture.stockLots!, actualAmount);
    fixture.currentStock = sumLots(fixture.stockLots!);

    let slot = this.inventory.find((i) => i.productId === fixture.assignedProductId);
    if (slot) {
      mergeLots(slot.lots!, moved);
      slot.quantity = sumLots(slot.lots!);
    } else {
      this.inventory.push({
        productId: fixture.assignedProductId,
        quantity: actualAmount,
        lots: moved,
      });
    }

    if (fixture.currentStock === 0) {
      fixture.assignedProductId = undefined;
    }

    this.notifyStateChanged();
    return { success: true, actualQuantity: actualAmount, reason: 'success' };
  }

  /**
   * Remove items from shelf back into inventory
   */
  public unstockShelf(fixtureId: string, amount: number = 1): boolean {
    return this.transferFromShelf(fixtureId, amount).success;
  }

  // ==========================================
  // Planogram (Sơ đồ bày kệ) Methods
  // ==========================================

  /**
   * Get current planogram mapping (fixtureId -> productId).
   */
  public getPlanogram(): Record<string, string> {
    return { ...this.planogram };
  }

  /**
   * Get assigned planogram product for a specific fixture.
   */
  public getPlanogramForFixture(fixtureId: string): string | undefined {
    return this.planogram[fixtureId];
  }

  /**
   * Assign or clear a product for a specific fixture in the planogram.
   */
  public setPlanogramAssignment(
    fixtureId: string,
    productId?: string
  ): { success: boolean; reason?: 'fixture_not_found' | 'not_sales_fixture' | 'invalid_product' | 'storage_type_mismatch' } {
    const fix = this.fixtures.find((f) => f.id === fixtureId);
    if (!fix || !isSalesFixture(fix)) {
      return { success: false, reason: !fix ? 'fixture_not_found' : 'not_sales_fixture' };
    }
    if (!productId) {
      delete this.planogram[fixtureId];
      this.notifyStateChanged();
      return { success: true };
    }
    const prod = PRODUCT_MAP[productId];
    if (!prod) {
      return { success: false, reason: 'invalid_product' };
    }
    const isColdFixture = fix.type === 'refrigerator';
    const isColdProduct = prod.storageType === 'cold';
    if (isColdFixture !== isColdProduct) {
      return { success: false, reason: 'storage_type_mismatch' };
    }
    this.planogram[fixtureId] = productId;
    this.notifyStateChanged();
    return { success: true };
  }

  /**
   * Bulk set planogram mapping with validation.
   */
  public setPlanogram(planogram: Record<string, string>): {
    successCount: number;
    errors: { fixtureId: string; reason: string }[];
  } {
    const errors: { fixtureId: string; reason: string }[] = [];
    let successCount = 0;
    const newMap: Record<string, string> = {};
    for (const [fixtureId, productId] of Object.entries(planogram)) {
      const fix = this.fixtures.find((f) => f.id === fixtureId);
      if (!fix || !isSalesFixture(fix)) {
        errors.push({ fixtureId, reason: !fix ? 'fixture_not_found' : 'not_sales_fixture' });
        continue;
      }
      const prod = PRODUCT_MAP[productId];
      if (!prod) {
        errors.push({ fixtureId, reason: 'invalid_product' });
        continue;
      }
      const isColdFixture = fix.type === 'refrigerator';
      const isColdProduct = prod.storageType === 'cold';
      if (isColdFixture !== isColdProduct) {
        errors.push({ fixtureId, reason: 'storage_type_mismatch' });
        continue;
      }
      newMap[fixtureId] = productId;
      successCount++;
    }
    this.planogram = newMap;
    this.notifyStateChanged();
    return { successCount, errors };
  }

  /**
   * Apply planogram for a single fixture:
   * - Does NOT replace a shelf currently occupied by another product.
   * - Restocks from inventory up to effective shelf capacity using FEFO.
   */
  public applyPlanogramEntry(fixtureId: string): PlanogramApplyResult {
    const productId = this.planogram[fixtureId];
    if (!productId) {
      return { fixtureId, productId: '', applied: false, actualQuantity: 0, reason: 'invalid_product' };
    }
    const fix = this.fixtures.find((f) => f.id === fixtureId);
    if (!fix || !isSalesFixture(fix)) {
      return { fixtureId, productId, applied: false, actualQuantity: 0, reason: !fix ? 'fixture_not_found' : 'not_sales_fixture' };
    }
    const prod = PRODUCT_MAP[productId];
    if (!prod) {
      return { fixtureId, productId, applied: false, actualQuantity: 0, reason: 'invalid_product' };
    }
    const isColdFixture = fix.type === 'refrigerator';
    const isColdProduct = prod.storageType === 'cold';
    if (isColdFixture !== isColdProduct) {
      return { fixtureId, productId, applied: false, actualQuantity: 0, reason: 'storage_type_mismatch' };
    }

    // Spec Requirement:
    // WHEN áp dụng sơ đồ chỉ định A vào kệ còn B
    // THEN B và lô giữ nguyên, kệ bị bỏ qua với lý do
    if (fix.currentStock > 0 && fix.assignedProductId && fix.assignedProductId !== productId) {
      return { fixtureId, productId, applied: false, actualQuantity: 0, reason: 'product_mismatch' };
    }

    // If shelf is empty, assign product
    if (fix.currentStock === 0) {
      fix.assignedProductId = productId;
    }

    const effectiveCap = Math.min(fix.maxCapacity, prod.shelfCapacity);
    const needed = effectiveCap - fix.currentStock;
    if (needed <= 0) {
      return { fixtureId, productId, applied: true, actualQuantity: 0, reason: 'fixture_full' };
    }

    const invSlot = this.inventory.find((i) => i.productId === productId);
    if (!invSlot || invSlot.quantity <= 0) {
      return { fixtureId, productId, applied: false, actualQuantity: 0, reason: 'no_inventory' };
    }

    const res = this.transferToShelf(fixtureId, productId, needed);
    if (res.success && res.actualQuantity > 0) {
      return { fixtureId, productId, applied: true, actualQuantity: res.actualQuantity, reason: 'success' };
    }

    return {
      fixtureId,
      productId,
      applied: false,
      actualQuantity: 0,
      reason: res.reason === 'no_space' ? 'fixture_full' : 'no_inventory',
    };
  }

  /**
   * Apply planogram across all assigned shelves in batch.
   */
  public applyPlanogram(): PlanogramBatchResult {
    let totalRefilled = 0;
    const results: PlanogramApplyResult[] = [];
    for (const fixtureId of Object.keys(this.planogram)) {
      const res = this.applyPlanogramEntry(fixtureId);
      results.push(res);
      if (res.actualQuantity > 0) {
        totalRefilled += res.actualQuantity;
      }
    }
    return { totalRefilled, results };
  }

  /**
   * Query candidate refill job targets for future employee automation (Task 5.3).
   */
  public getRestockJobTargets(): RestockJobTarget[] {
    const targets: RestockJobTarget[] = [];
    for (const [fixtureId, productId] of Object.entries(this.planogram)) {
      const fix = this.fixtures.find((f) => f.id === fixtureId);
      if (!fix || !isSalesFixture(fix)) continue;
      const prod = PRODUCT_MAP[productId];
      if (!prod) continue;
      // Shelf must not be blocked by another product with remaining stock
      if (fix.currentStock > 0 && fix.assignedProductId && fix.assignedProductId !== productId) continue;

      const effectiveCap = Math.min(fix.maxCapacity, prod.shelfCapacity);
      const needed = Math.max(0, effectiveCap - fix.currentStock);
      if (needed <= 0) continue;

      const invSlot = this.inventory.find((i) => i.productId === productId);
      const available = invSlot ? invSlot.quantity : 0;

      targets.push({
        fixtureId,
        productId,
        currentStock: fix.currentStock,
        maxCapacity: effectiveCap,
        needed,
        availableInInventory: available,
      });
    }
    return targets;
  }

  private isActorAvailableForRestock(actorId: string): boolean {
    if (actorId === 'player') return true;
    const member = this.staff.find((item) => item.id === actorId && item.role === 'refill');
    if (!member || member.hiredOnDay > this.clock.getTime().day) return false;
    const shift = this.staffSchedule[actorId] ?? member.shift;
    const config = STAFF_SHIFTS[shift];
    const { hour } = this.clock.getTime();
    return !!config && hour >= config.startHour && hour < config.endHour;
  }

  public claimRestockJob(actorId: string, fixtureId: string): { claimed: boolean; reason?: string; target?: RestockJobTarget } {
    if (!this.isActorAvailableForRestock(actorId)) return { claimed: false, reason: 'actor_unavailable' };
    const target = this.getRestockJobTargets().find((item) => item.fixtureId === fixtureId);
    if (!target || target.availableInInventory <= 0) return { claimed: false, reason: 'target_invalid' };
    const current = this.restockJobClaims.get(fixtureId);
    if (current && (!this.isActorAvailableForRestock(current.actorId) || !this.getRestockJobTargets().some((item) => item.fixtureId === fixtureId))) {
      this.restockJobClaims.delete(fixtureId);
    }
    const activeClaim = this.restockJobClaims.get(fixtureId);
    if (activeClaim && activeClaim.actorId !== actorId) return { claimed: false, reason: 'target_claimed' };
    this.restockJobClaims.set(fixtureId, { actorId, fixtureId });
    return { claimed: true, target: { ...target } };
  }

  public revalidateRestockJob(actorId: string, fixtureId: string): { valid: boolean; reason?: string; target?: RestockJobTarget } {
    const claim = this.restockJobClaims.get(fixtureId);
    if (!claim || claim.actorId !== actorId) return { valid: false, reason: 'claim_lost' };
    if (!this.isActorAvailableForRestock(actorId)) {
      this.restockJobClaims.delete(fixtureId);
      return { valid: false, reason: 'actor_unavailable' };
    }
    const target = this.getRestockJobTargets().find((item) => item.fixtureId === fixtureId);
    const carryingJob = this.staff.some((member) =>
      member.id === actorId && member.workerTask?.fixtureId === fixtureId && sumLots(member.workerTask.carriedLots) > 0
    );
    if (!target || (target.availableInInventory <= 0 && !carryingJob)) {
      this.restockJobClaims.delete(fixtureId);
      return { valid: false, reason: 'target_invalid' };
    }
    return { valid: true, target: { ...target } };
  }

  public releaseRestockJob(actorId: string, fixtureId: string): boolean {
    const claim = this.restockJobClaims.get(fixtureId);
    if (!claim || claim.actorId !== actorId) return false;
    return this.restockJobClaims.delete(fixtureId);
  }

  /**
   * Validate an entire shopping cart of items from a chosen supplier.
   * Atomic validation: returns reasons if any condition is not met.
   */
  public validateSupplierCart(
    supplierId: string,
    items: SupplierCartItem[]
  ): SupplierCartValidationResult {
    const reasons: string[] = [];
    const supplier = SUPPLIER_MAP[supplierId];
    if (!supplier) {
      reasons.push('Nhà cung cấp không tồn tại');
    } else if (supplier.unlockLevel > this.playerData.level) {
      reasons.push(`Nhà cung cấp mở khóa ở cấp ${supplier.unlockLevel}`);
    }

    if (!items || items.length === 0) {
      reasons.push('Giỏ hàng trống');
    }

    let subtotal = 0;
    let itemCount = 0;
    let coldItemCount = 0;

    for (const line of items ?? []) {
      if (!Number.isSafeInteger(line.quantity) || line.quantity <= 0) {
        reasons.push(`Số lượng sản phẩm ${line.productId} không hợp lệ`);
        continue;
      }
      const product = PRODUCT_MAP[line.productId];
      if (!product) {
        reasons.push(`Sản phẩm ${line.productId} không tồn tại`);
        continue;
      }
      if (product.unlockLevel > this.playerData.level) {
        reasons.push(`Sản phẩm ${product.name} mở khóa ở cấp ${product.unlockLevel}`);
      }
      subtotal += product.purchasePrice * line.quantity;
      itemCount += line.quantity;
      if (product.storageType === 'cold') {
        coldItemCount += line.quantity;
      }
    }

    if (supplier && subtotal < supplier.minOrderValue) {
      reasons.push(`Chưa đạt giá trị đơn tối thiểu ${supplier.minOrderValue.toLocaleString('vi-VN')} ₫ của ${supplier.name}`);
    }

    const discountRate = supplier?.discountRate ?? 0;
    const discountAmount = Math.round(subtotal * discountRate);
    const totalCost = Math.max(0, subtotal - discountAmount);

    if (totalCost > this.playerData.money) {
      reasons.push(`Không đủ tiền (cần ${totalCost.toLocaleString('vi-VN')} ₫, hiện có ${this.playerData.money.toLocaleString('vi-VN')} ₫)`);
    }

    if (coldItemCount > 0) {
      const reservedCold = this.reservedColdWarehouseCount();
      if (reservedCold + coldItemCount > COLD_WAREHOUSE_CAPACITY) {
        reasons.push(`Kho mát không đủ chỗ (cần thêm ${coldItemCount}, còn ${Math.max(0, COLD_WAREHOUSE_CAPACITY - reservedCold)} chỗ)`);
      }
    }

    return {
      valid: reasons.length === 0,
      supplierId,
      subtotal,
      discountAmount,
      totalCost,
      itemCount,
      coldItemCount,
      reasons,
    };
  }

  /**
   * Commit a supplier cart atomically.
   * If any validation fails, the entire cart is rejected without deducting funds.
   */
  public orderSupplierCart(
    supplierId: string,
    items: SupplierCartItem[]
  ): { success: boolean; paidTotal?: number; orderIds?: string[]; reasons?: string[] } {
    const validation = this.validateSupplierCart(supplierId, items);
    if (!validation.valid) {
      return { success: false, reasons: validation.reasons };
    }

    const supplier = SUPPLIER_MAP[supplierId]!;
    this.playerData.money -= validation.totalCost;

    const discountMultiplier = 1 - supplier.discountRate;
    const arrivalDay = this.clock.getTime().day + supplier.delayDays;
    const orderIds: string[] = [];

    for (const line of items) {
      const product = PRODUCT_MAP[line.productId]!;
      const unitCost = Math.max(1, Math.round(product.purchasePrice * discountMultiplier));
      const orderId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      orderIds.push(orderId);
      this.pendingOrders.push({
        id: orderId,
        productId: line.productId,
        quantity: line.quantity,
        unitCost,
        arrivalDay,
        supplierId,
        delivered: false,
      });
    }

    const currentDay = this.clock.getTime().day;
    this.currentDayRecord.purchaseTotal += validation.totalCost;
    this.recordLedger({
      day: currentDay,
      type: 'purchase',
      amount: validation.totalCost,
      quantity: validation.itemCount,
      description: `Nhập hàng từ ${supplier.name} (${validation.itemCount} món)`,
    });

    if (supplier.delayDays === 0) {
      this.deliverOrders(this.clock.getTime().day);
    }

    this.notifyStateChanged();
    return { success: true, paidTotal: validation.totalCost, orderIds };
  }

  /** Pay when ordering; backward-compatible single item order delegating to default supplier. */
  public orderFromSupplier(productId: string, quantity: number): boolean {
    const res = this.orderSupplierCart(DEFAULT_SUPPLIER_ID, [{ productId, quantity }]);
    return res.success;
  }

  /**
   * Deliver due supplier orders.
   * If cold space is full or partially full, excess quantity overflows into holdingArea.
   * Delivered orders are processed exactly once.
   */
  public deliverOrders(day: number): void {
    const arrived = this.pendingOrders.filter((order) => !order.delivered && order.arrivalDay <= day);
    if (!arrived.length) return;

    let deliveredCount = 0;
    for (const order of arrived) {
      order.delivered = true;
      order.deliveryDay = day;
      const product = PRODUCT_MAP[order.productId];
      const expiry = expiryDay(order.productId, day);

      if (product?.storageType === 'cold') {
        const currentCold = this.getColdWarehouseCount();
        const freeCold = Math.max(0, COLD_WAREHOUSE_CAPACITY - currentCold);
        const fitQty = Math.min(order.quantity, freeCold);
        const overflowQty = order.quantity - fitQty;

        if (fitQty > 0) {
          const slot = this.inventory.find((item) => item.productId === order.productId);
          const lot: StockLot = {
            quantity: fitQty,
            expiresOnDay: expiry,
            unitCost: order.unitCost,
            provenance: 'known',
          };
          if (slot) {
            mergeLots(slot.lots!, [lot]);
            slot.quantity = sumLots(slot.lots!);
          } else {
            this.inventory.push({ productId: order.productId, quantity: fitQty, lots: [lot] });
          }
          deliveredCount += fitQty;
        }

        if (overflowQty > 0) {
          this.holdingArea.push({
            id: `holding-${order.id}-${this.holdingArea.length + 1}`,
            productId: order.productId,
            quantity: overflowQty,
            expiresOnDay: expiry,
            originalArrivalDay: order.arrivalDay,
            unitCost: order.unitCost,
            provenance: 'known',
          });
        }
      } else {
        const slot = this.inventory.find((item) => item.productId === order.productId);
        const lot: StockLot = {
          quantity: order.quantity,
          expiresOnDay: expiry,
          unitCost: order.unitCost,
          provenance: 'known',
        };
        if (slot) {
          mergeLots(slot.lots!, [lot]);
          slot.quantity = sumLots(slot.lots!);
        } else {
          this.inventory.push({ productId: order.productId, quantity: order.quantity, lots: [lot] });
        }
        deliveredCount += order.quantity;
      }
    }

    this.pendingOrders = this.pendingOrders.filter((order) => !order.delivered);
    if (deliveredCount > 0) {
      this.callbacks.onOrdersDelivered?.(deliveredCount);
    }
    this.notifyStateChanged();
  }

  /**
   * Stow an item from the holding area into the warehouse inventory.
   * Cold items stow up to available cold capacity.
   * Retains original expiresOnDay!
   */
  public stowHoldingItem(holdingId: string): { success: boolean; stowedQuantity: number; reason?: string } {
    const index = this.holdingArea.findIndex((h) => h.id === holdingId);
    if (index === -1) return { success: false, stowedQuantity: 0, reason: 'not_found' };

    const item = this.holdingArea[index];
    const product = PRODUCT_MAP[item.productId];
    if (!product) return { success: false, stowedQuantity: 0, reason: 'unknown_product' };

    let stowQty = item.quantity;
    if (product.storageType === 'cold') {
      const freeCold = Math.max(0, COLD_WAREHOUSE_CAPACITY - this.getColdWarehouseCount());
      if (freeCold <= 0) {
        return { success: false, stowedQuantity: 0, reason: 'cold_warehouse_full' };
      }
      stowQty = Math.min(item.quantity, freeCold);
    }

    const slot = this.inventory.find((i) => i.productId === item.productId);
    const lot: StockLot = {
      quantity: stowQty,
      expiresOnDay: item.expiresOnDay,
      unitCost: item.unitCost,
      provenance: item.provenance ?? (item.unitCost !== undefined ? 'known' : 'estimated'),
    };
    if (slot) {
      mergeLots(slot.lots!, [lot]);
      slot.quantity = sumLots(slot.lots!);
    } else {
      this.inventory.push({ productId: item.productId, quantity: stowQty, lots: [lot] });
    }

    if (stowQty === item.quantity) {
      this.holdingArea.splice(index, 1);
    } else {
      item.quantity -= stowQty;
    }

    this.notifyStateChanged();
    return { success: true, stowedQuantity: stowQty };
  }

  /**
   * Attempt to stow all items from the holding area into the warehouse inventory.
   */
  public stowAllHolding(): { success: boolean; totalStowed: number } {
    let totalStowed = 0;
    const holdingIds = this.holdingArea.map((h) => h.id);
    for (const id of holdingIds) {
      const res = this.stowHoldingItem(id);
      if (res.success) {
        totalStowed += res.stowedQuantity;
      }
    }
    return { success: totalStowed > 0, totalStowed };
  }

  /** Complete one in-store sale from customer basket at the cashier counter. */
  public checkoutShelf(fixtureId?: string): boolean {
    if (!this.clock.getTime().isStoreOpen) return false;
    const activeCustomer = this.customerManager.getActiveCustomer();
    if (!activeCustomer || activeCustomer.stage !== 'checkout') {
      return false;
    }
    return this.completeCustomerCheckout(activeCustomer.checkoutId ?? '', fixtureId ?? activeCustomer.targetFixtureId);
  }

  /** Complete one waiting customer's sale; receipt IDs make retries safe across save/reload. */
  public completeCustomerCheckout(checkoutId: string, fixtureId?: string): boolean {
    if (!checkoutId) return false;
    if (this.completedCheckoutIds.has(checkoutId)) return true;

    const customers = this.customerManager.getCustomers();
    const customer = customers.find((c) => c.checkoutId === checkoutId && c.stage === 'checkout');
    if (!customer) return false;

    if (fixtureId && customer.targetFixtureId && customer.targetFixtureId !== fixtureId) {
      return false;
    }

    // Modern flow: Customer with basket
    if (customer.basket && customer.basket.length > 0) {
      this.customerManager.assignCashier(checkoutId, undefined);
      const res = this.customerManager.completeCheckout(checkoutId, this.completedCheckoutIds, this.tileMap, this.fixtures);
      if (!res.success) return false;

      this.playerData.money += res.paidTotal;
      this.statistics.totalRevenue += res.paidTotal;
      this.statistics.totalCustomersServed += 1;
      this.addExperience(5 * res.itemCount);

      const cogs = res.cogs ?? 0;
      this.currentDayRecord.customersServed += 1;
      this.currentDayRecord.transactionsCount += 1;
      this.currentDayRecord.itemsSold += res.itemCount;
      this.currentDayRecord.revenue += res.paidTotal;
      this.currentDayRecord.cogs += cogs;
      this.currentDayRecord.grossProfit = this.currentDayRecord.revenue - this.currentDayRecord.cogs;
      this.currentDayRecord.netProfit = this.currentDayRecord.grossProfit - this.currentDayRecord.spoilageCost - this.currentDayRecord.wagesPaid;

      if (res.items) {
        for (const it of res.items) {
          this.recordProductSale(it.productId, it.quantity);
        }
      }

      this.recordLedger({
        day: this.clock.getTime().day,
        type: 'sale',
        amount: res.paidTotal,
        cogs,
        quantity: res.itemCount,
        description: `Bán lẻ cho khách hàng #${checkoutId} (${res.itemCount} món)`,
      });

      this.notifyStateChanged();
      return true;
    }

    // Legacy customer flow: Customer with reservedProductId
    if (customer.reservedProductId) {
      const fId = fixtureId ?? customer.targetFixtureId;
      const fixture = this.fixtures.find((item) => item.id === fId);
      if (!fixture || !isSalesFixture(fixture) || fixture.assignedProductId !== customer.reservedProductId || fixture.currentStock < 1) {
        return false;
      }
      const product = PRODUCT_MAP[customer.reservedProductId];
      if (!product) return false;

      const taken = takeLots(fixture.stockLots!, 1);
      fixture.currentStock = sumLots(fixture.stockLots!);
      if (fixture.currentStock === 0) fixture.assignedProductId = undefined;

      this.completedCheckoutIds.add(checkoutId);
      this.customerManager.assignCashier(checkoutId, undefined);
      customer.reservedProductId = undefined;
      customer.stage = 'leaving';
      this.customerManager.routeCustomer(customer, 'leaving', this.tileMap, this.fixtures);

      this.playerData.money += product.baseSellingPrice;
      this.statistics.totalRevenue += product.baseSellingPrice;
      this.statistics.totalCustomersServed += 1;
      this.addExperience(5);

      const cogs = (taken[0]?.unitCost ?? product.purchasePrice) * 1;
      this.currentDayRecord.customersServed += 1;
      this.currentDayRecord.transactionsCount += 1;
      this.currentDayRecord.itemsSold += 1;
      this.currentDayRecord.revenue += product.baseSellingPrice;
      this.currentDayRecord.cogs += cogs;
      this.currentDayRecord.grossProfit = this.currentDayRecord.revenue - this.currentDayRecord.cogs;
      this.currentDayRecord.netProfit = this.currentDayRecord.grossProfit - this.currentDayRecord.spoilageCost - this.currentDayRecord.wagesPaid;
      this.recordProductSale(product.id, 1);

      this.recordLedger({
        day: this.clock.getTime().day,
        type: 'sale',
        amount: product.baseSellingPrice,
        cogs,
        quantity: 1,
        productId: product.id,
        description: `Bán lẻ cho khách hàng #${checkoutId} (${product.name})`,
      });

      this.notifyStateChanged();
      return true;
    }

    return false;
  }

  private reservedShelfStock(fixtureId: string): number {
    return this.customerManager
      .getCustomers()
      .filter(
        (c) =>
          c.stage !== 'leaving' &&
          c.targetFixtureId === fixtureId &&
          !!c.checkoutId &&
          !!c.reservedProductId &&
          (!c.basket || c.basket.length === 0)
      ).length;
  }

  /**
   * Add money to player
   */
  public addMoney(amount: number): void {
    this.playerData.money += amount;
    this.notifyStateChanged();
  }

  /**
   * Add experience points & handle level up
   */
  public addExperience(xp: number): void {
    this.playerData.experience += xp;
    while (this.playerData.experience >= this.playerData.experienceToNextLevel) {
      this.playerData.experience -= this.playerData.experienceToNextLevel;
      this.playerData.level += 1;
      this.playerData.experienceToNextLevel = Math.floor(
        this.playerData.experienceToNextLevel * 1.5
      );
      this.callbacks.onLevelUp?.(this.playerData.level);
    }
    this.notifyStateChanged();
  }

  private notifyStateChanged(): void {
    if (this.callbacks.onStateChanged) {
      this.callbacks.onStateChanged();
    }
  }

  private ensureSafePlayerPosition(): void {
    const p=this.playerData.position;
    if(!Number.isFinite(p.x)||!Number.isFinite(p.y)||this.collisionSystem.isColliding({x:p.x-10,y:p.y-4,width:20,height:14})) {
      this.playerData.position={...WAREHOUSE_ENTRANCE};
      this.callbacks.onPlayerRelocated?.();
    }
  }

  /**
   * Export complete save game data snapshot
   */
  public exportSaveData(existingSaveId?: string, currentRevision: number = 1): SaveGameData {
    return {
      id: existingSaveId || 'local_save_default',
      schemaVersion: 3,
      revision: currentRevision + 1,
      createdAt: this.createdAt,
      updatedAt: new Date().toISOString(),
      player: { ...this.playerData },
      worldTime: this.clock.getTime(),
      storeLayout: {
        widthTiles: (this.tileMap.storeBounds?.right ?? STORE_BOUNDS.right) - STORE_BOUNDS.left + 1,
        heightTiles: (this.tileMap.storeBounds?.bottom ?? STORE_BOUNDS.bottom) - STORE_BOUNDS.top + 1,
        fixtures: this.fixtures.map((f) => ({ ...f, stockLots: f.stockLots?.map((lot) => ({ ...lot })) })),
        storedFixtures: this.storedFixtures.map(f => ({ ...f, stockLots: f.stockLots?.map(lot => ({ ...lot })) })),
        unlockedPlotIds: [...this.unlockedPlotIds],
      },
      inventory: this.getInventory(),
      holdingArea: this.getHoldingArea(),
      planogram: this.getPlanogram(),
      staff: this.staff.map((s) => ({ ...s })),
      staffSchedule: { ...this.staffSchedule },
      wageDebt: this.wageDebt,
      processedPayrollDayIds: [...this.processedPayrollDayIds],
      autoBuyEnabled: this.autoBuyEnabled,
      autoBuyRules: structuredClone(this.autoBuyRules),
      processedAutoBuyDayIds: [...this.processedAutoBuyDayIds],
      autoBuyReports: structuredClone(this.autoBuyReports),
      quests: normalizeQuestState(this.quests),
      stalls: normalizeStallState(this.stalls),
      pendingOrders: this.getPendingOrders(),
      customer: this.getCustomer() ?? undefined,
      customers: this.customerManager.getCustomers(),
      customerSpawnCooldown: this.customerManager.getSpawnCooldown(),
      customerSequence: this.customerManager.getCustomerSequence(),
      completedCheckoutIds: [...this.completedCheckoutIds],
      dailyRecords: structuredClone(this.dailyRecords),
      currentDayRecord: { ...this.currentDayRecord },
      ledger: this.ledger.map((e) => ({ ...e })),
      closedDayIds: [...this.closedDayIds],
      statistics: { ...this.statistics },
    };
  }

  /**
   * Import saved game data
   */
  public importSaveData(saveData: SaveGameData): void {
    this.restockJobClaims.clear();
    this.playerData = { ...saveData.player };
    this.fixtures = saveData.storeLayout.fixtures.map((f) => ({ ...f }));
    this.storedFixtures = (saveData.storeLayout.storedFixtures ?? []).map(f => ({ ...f }));
    this.unlockedPlotIds = [...(saveData.storeLayout.unlockedPlotIds ?? [])];
    this.inventory = saveData.inventory.map((i) => ({ ...i }));
    this.holdingArea = (saveData.holdingArea ?? []).map((h) => ({ ...h }));
    this.planogram = saveData.planogram ? { ...saveData.planogram } : {};
    this.staff = (saveData.staff ?? []).map((s) => ({
      ...s,
      shift: isShiftWithinStoreHours(s.shift) ? s.shift : 'full_day',
    }));
    this.staffSchedule = normalizeStaffSchedule(saveData.staffSchedule, this.staff);
    this.wageDebt = Math.max(0, saveData.wageDebt ?? 0);
    this.processedPayrollDayIds = new Set(saveData.processedPayrollDayIds ?? []);
    this.autoBuyEnabled = saveData.autoBuyEnabled ?? false;
    this.autoBuyRules = this.validateAutoBuyRules(saveData.autoBuyRules ?? []);
    this.processedAutoBuyDayIds = new Set(saveData.processedAutoBuyDayIds ?? []);
    this.autoBuyReports = structuredClone(saveData.autoBuyReports ?? {});
    this.quests = normalizeQuestState(saveData.quests);
    this.stalls = normalizeStallState(saveData.stalls);
    this.pendingOrders = (saveData.pendingOrders ?? []).map((order) => ({
      ...order,
      supplierId: order.supplierId ?? DEFAULT_SUPPLIER_ID,
      delivered: order.delivered ?? false,
    }));
    this.completedCheckoutIds = new Set(saveData.completedCheckoutIds ?? []);
    this.dailyRecords = saveData.dailyRecords ? structuredClone(saveData.dailyRecords) : {};
    this.closedDayIds = new Set(saveData.closedDayIds ?? []);
    this.ledger = (saveData.ledger ?? []).map((e) => ({ ...e }));
    if (saveData.currentDayRecord) {
      this.currentDayRecord = { ...saveData.currentDayRecord };
    } else {
      this.currentDayRecord = this.createEmptyDailyRecord(saveData.worldTime.day);
    }
    this.customerManager = new CustomerManager(
      saveData.customers ?? (saveData.customer ? [saveData.customer] : []),
      saveData.customerSequence ?? 0,
      saveData.customerSpawnCooldown ?? 4
    );
    this.statistics = { ...saveData.statistics };
    this.createdAt = saveData.createdAt;
    this.hydrateStock(saveData.worldTime.day);
    this.clock.setTime(saveData.worldTime);
    this.collisionSystem.updateFixtures(this.fixtures);
    this.tileMap = generateStarterTileMap(this.unlockedPlotIds, this.stalls.owned);
    this.collisionSystem.updateTileMap(this.tileMap);
    this.callbacks.onMapChanged?.(this.tileMap);
    this.ensureSafePlayerPosition();
    for (const cust of this.customerManager.getCustomers()) {
      if (cust.stage !== 'checkout') {
        this.customerManager.routeCustomer(cust, cust.stage, this.tileMap, this.fixtures);
      }
    }
    this.activeFixture = null;
    this.notifyStateChanged();
  }
}
