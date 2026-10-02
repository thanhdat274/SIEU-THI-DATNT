import {
  GameTileMap,
  InventoryItem,
  ProductionJob,
  PlayerData,
  SaveGameData,
  StoreFixture,
  TILE_SIZE,
  Vector2D,
  WorldTime,
  SupplierOrder,
  COLD_WAREHOUSE_CAPACITY,
  CustomerState,
  CustomerReview,
  SecurityIncident,
  SecurityState,
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
  MarketState,
  SupplierDayState,
  SupplierCartLine,
  SupplierBulkTier,
  StallDayReport,
  StaffShift,
  StaffMember,
  StaffCandidate,
  STAFF_SHIFTS,
  PayrollResult,
  AutoBuyRule,
  AutoBuyReport,
  RegularCustomerProgress,
  CustomerCreditAccount,
  StreetVehicleState,
  StreetPedestrianState,
  TrafficSignalState,
  StoreLogisticsState,
  PartyOrderState,
  GoalState,
  SkillState,
  SkillType
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
  isShiftWithinStoreHours,
  STALLS,
  STALL_MAP,
  ALL_PRODUCTS,
  PRICED_CATEGORIES,
  PRODUCT_CATEGORY_LABELS,
  WEATHER_MAP,
  MAX_PLAYER_LEVEL,
  PRESTIGE_XP_PER_STAR,
  PRESTIGE_MAX_STARS,
  prestigeTrafficMultiplier,
  getLevelTrafficMultiplier,
  maxActiveCustomersForLevel,
  xpToNextLevel,
  CLIMATE_SEASON_MAP,
  TIME_BANDS,
  WEEKDAY_LABELS,
  SHOPKEEPER_POSITION,
  getSeasonForDay,
  seasonDaysLeft,
  SPOILAGE_RULES,
  FORECAST_RULES,
  PRICE_RULES,
  type StallDefinition,
  REGULAR_CUSTOMERS_MAP
  } from '@game/data';
import { buildMorningBrief, type MorningBrief } from './day-rhythm';
import { pickAvailableRegular, processRegularCheckout, processRegularWalkout } from './regulars';
import { StreetTrafficManager } from './street-traffic';
import { StoreLogisticsManager } from './store-logistics';
import { CollisionSystem } from './collision';
import { appendRating, averageRating, ratingForVisit, reputationDeltaFromRating, reputationTrafficMultiplier, type CustomerFeedbackReason } from './reputation';
import { rainIntensityAt, rainForecastForDay, describeRainForecast, roadWetnessAt } from './weather';
import { appendIncident, emptySecurityState, openPoliceCase, planBurglary, rollShoplifter, sanitizeSecurity, securityUnlocked, shopliftCaught, shopliftDetectChance } from './security';
import { assessCounterfeit } from './counterfeit';
import { summarizeAnnualRevenue, calculateDailyTax } from './tax/annual-revenue';
import { appendReview, composeReview, sanitizeReviews, summarizeReviews } from './reviews';
import { listMaintenance, maintainFixture as applyMaintenance, wearOvernight, coldBreakExtraDecay, staffServiceTargets, MAINTENANCE_FAILURE_TEXT, type MaintenanceAction, type MaintenanceEntry, type MaintenanceNotice } from './maintenance';
import { slotCategoryConflict } from './shelf-slots';
import { decorAttraction, decorTrafficMultiplier } from './decor';
import { buyLandPlot, validateStoreLayout, totalWarehouseCells, type LayoutResult } from './store-layout';
import { GameInputSource, vectorToDirection } from './input';
import { GameClock } from './clock';
import { expiryDay, mergeLots, normalizeLots, sumLots, takeLots } from './stock';
import { decayLot, spoilageRate } from './spoilage';
import { findPath, GridPoint, tileCenter } from './pathfinding';
import { normalizePlayerProgression, saleExperienceMultiplier, trafficAtLevel } from './progression';
import { CustomerManager } from './customers';
import { calculateSalesVelocity, generateRestockSuggestions, getIncomingOrdersCount, getUsableStock } from './suggestions';
import { buildProductPlans, type ProductPlan, type ProductPlanInput } from './forecast';
import { climateSeasonForDay } from './weather';
import { advanceMarketState, assertMarketData, buildMarketContext, effectiveWeatherId, marketNoticesForDay, normalizeMarketState, NoticeThrottle, timeBandFor, visibleMarketEvents, weekdayOf, type MarketNotice } from './market';
import { computeSupplierDay, nextDeliveryDay, wholesaleQuote } from './supplier-market';
import { advancePriceIndex, clampSellingPrice, computePriceTargets, demandPriceFactor, keepChance, priceRatio, productSensitivity } from './price';
import { availabilityFactor, buildDemandTable, demandContextKey, effectiveTraffic, type DemandTable, type ProductDemand } from './demand';
import { emptyStallState, normalizeStallState, planStallDay } from './stalls';
import { emptyQuestState, findClaimableQuest, getDailyQuests, getStoryQuest, markQuestClaimed, normalizeQuestState, type QuestContext, type QuestProgress, type QuestReward } from './quests';
import { generateCandidatesForDay, validateHireStaff, calculatePayroll, Mulberry32Rng } from './staff';
import {
  createInitialPartyOrderState,
  refreshAvailablePartyOrders,
  respondPartyOrder,
  fulfillPartyOrder,
  type FulfillPartyOrderResult,
} from './party-orders';
import {
  createInitialGoalState,
  getGoalProgress,
  claimGoal,
  getWeeklyQuestProgress,
  claimWeeklyQuest,
  getFestivalGoalProgress,
  claimFestivalGoal,
  type FestivalGoalProgressInfo,
  type GoalProgressInfo,
  type WeeklyQuestProgressInfo,
  type SimulationGoalContext,
} from './goals';
import {
  createInitialSkillState,
  addSkillXp,
  choosePerk,
  getSkillModifier,
  hasPerk,
} from './skills';
import { RECIPES, RECIPE_MAP, Recipe, SELLABLE_PRODUCTS } from '@game/data';
import { aggregateHeatmap, appendPricePoint, pruneHeatmap, sanitizeHeatmap, sanitizePriceHistory } from './analytics';
import { addProductionOutput, consumeIngredients, missingIngredients, sanitizeProductionJobs } from './production';
import { LONG_TERM_GOALS, WEEKLY_QUESTS, PARTY_ORDER_MAP, TITLES, effectiveShelfCapacity, SECURITY_RULES } from '@game/data';
import { getUnlockedTitles, setActiveTitle, type TitleContext } from './titles';
import { syncSlotChildren, type TitleDef } from '@game/shared';

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
  onStockWarning?: (info: { lowStock: number; slowMoving: number; examples: string[] }) => void;
  onExpiringSoon?: (items: Array<{ productId: string; quantity: number; daysLeft: number }>) => void;
  onStateChanged?: () => void;
  onPlayerRelocated?: () => void;
  onMapChanged?: (map: GameTileMap) => void;
  onOrdersDelivered?: (quantity:number) => void;
  onLevelUp?: (level: number) => void;
  onWeatherChanged?: (weatherId: string) => void;
  onMarketNotice?: (notice: MarketNotice) => void;
  onMaintenanceNotice?: (notices: MaintenanceNotice[]) => void;
  onSecurityNotice?: (notice: { text: string; severity: 'info' | 'warn' }) => void;
  onCustomerRated?: (event: { stars: number; average: number; reason?: CustomerFeedbackReason; review?: CustomerReview }) => void;
  onToast?: (message: string, type?: 'info' | 'success' | 'warn') => void;
}

export class GameSimulation {
  private playerData: PlayerData;
  private sellingPrices: Record<string, number> = {};
  private fixtures: StoreFixture[];
  private storedFixtures: StoreFixture[];
  private unlockedPlotIds: string[];
  private decorOwned: string[];
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
  private orderSequence = 0;
  private ledgerSequence = 0;
  private dailyRecords: Record<number, DailyRecord> = {};
  private quests: QuestState = emptyQuestState();
  private stalls: StallState = emptyStallState();
  private market: MarketState;
  private demandTable?: DemandTable;
  private demandBuildCount = 0;
  private noticeThrottle = new NoticeThrottle();
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
  private regulars: Record<string, RegularCustomerProgress> = {};
  private customerCredits: CustomerCreditAccount[] = [];
  private customerCreditSequence = 0;
  private diningDirtyTableIds = new Set<string>();
  private productionJobs: ProductionJob[] = [];
  private productionJobSequence = 0;
  private priceHistory: NonNullable<SaveGameData['priceHistory']> = {};
  private heatmap: NonNullable<SaveGameData['heatmap']> = {};
  /** Ô cuối cùng của từng khách, chỉ trong bộ nhớ, để đếm lượt vào ô thay vì mỗi khung hình. */
  private heatmapLastTile = new Map<string, string>();
  private reviews: CustomerReview[] = [];
  private security: SecurityState = emptySecurityState();
  private partyOrders: PartyOrderState;
  private goals: GoalState;
  private skills: SkillState;
  private streetTraffic = new StreetTrafficManager();
  private logisticsManager = new StoreLogisticsManager();
  private warehouseTier: number;
  private storageRackCount: number;

  private activeFixture: StoreFixture | null = null;
  private playerSpeed: number = 130; // Pixels per second
  private isMoving: boolean = false;
  private isPaused: boolean = false;
  private callbacks: GameSimulationCallbacks = {};
  private readonly weatherSeed: string;

  constructor(
    initialSave: SaveGameData,
    tileMap: GameTileMap,
    inputManager: GameInputSource,
    callbacks: GameSimulationCallbacks = {}
  ) {
    this.weatherSeed = initialSave.id ?? 'local_save';
    this.playerData = normalizePlayerProgression(initialSave.player);
    this.warehouseTier = initialSave.warehouseTier ?? 0;
    this.storageRackCount = initialSave.storageRackCount ?? 0;
    this.sellingPrices = { ...(initialSave.sellingPrices ?? {}) };
    this.fixtures = initialSave.storeLayout.fixtures.map((f) => ({ ...f }));
    this.storedFixtures = (initialSave.storeLayout.storedFixtures ?? []).map(f => ({ ...f }));
    this.unlockedPlotIds = [...(initialSave.storeLayout.unlockedPlotIds ?? [])];
    this.decorOwned = [...(initialSave.storeLayout.decorOwned ?? [])];
    this.inventory = initialSave.inventory.map((i) => ({ ...i }));
    this.holdingArea = (initialSave.holdingArea ?? []).map((h) => ({ ...h }));
    this.planogram = initialSave.planogram ? { ...initialSave.planogram } : {};
    this.pendingOrders = (initialSave.pendingOrders ?? []).map((order) => ({
      ...order,
      supplierId: order.supplierId ?? DEFAULT_SUPPLIER_ID,
      delivered: order.delivered ?? false,
    }));
    this.staff = (initialSave.staff ?? []).map((s) => ({
      ...structuredClone(s),
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
    this.regulars = initialSave.regulars ? structuredClone(initialSave.regulars) : {};
    this.customerCredits = (initialSave.customerCredits ?? []).filter(c => c && typeof c.id === 'string' && typeof c.regularId === 'string' && Number.isFinite(c.balance) && c.balance >= 0).map(c => ({ ...c }));
    this.customerCreditSequence = Math.max(initialSave.customerCreditSequence ?? 0, ...this.customerCredits.map(c => Number(c.id.match(/^credit-(\d+)$/)?.[1] ?? 0)));
    this.diningDirtyTableIds = new Set((initialSave.diningDirtyTableIds ?? []).filter(id => typeof id === 'string'));
    this.productionJobs = sanitizeProductionJobs(initialSave.productionJobs);
    this.priceHistory = sanitizePriceHistory(initialSave.priceHistory);
    this.heatmap = sanitizeHeatmap(initialSave.heatmap);
    this.productionJobSequence = Math.max(initialSave.productionJobSequence ?? 0, ...this.productionJobs.map(job => Number(job.id.match(/^job-(\d+)$/)?.[1] ?? 0)));
    this.reviews = sanitizeReviews(initialSave.reviews);
    this.security = sanitizeSecurity(initialSave.security);
    this.partyOrders = initialSave.partyOrders
      ? refreshAvailablePartyOrders(structuredClone(initialSave.partyOrders), initialSave.worldTime.day, this.playerData.level)
      : refreshAvailablePartyOrders(createInitialPartyOrderState(), initialSave.worldTime.day, this.playerData.level);
    this.goals = initialSave.goals ? structuredClone(initialSave.goals) : createInitialGoalState();
    this.skills = initialSave.skills ? structuredClone(initialSave.skills) : createInitialSkillState();
    this.stalls = normalizeStallState(initialSave.stalls);
    assertMarketData();
    this.market = normalizeMarketState(initialSave.market, initialSave.id ?? 'local_save', initialSave.worldTime.day);
    this.ensureSupplierMarket(initialSave.worldTime.day);
    this.tileMap = this.stalls.owned.length ? generateStarterTileMap(this.unlockedPlotIds, this.stalls.owned) : tileMap;
    this.inputManager = inputManager;
    this.callbacks = callbacks;
    this.customerManager = new CustomerManager(
      initialSave.customers ?? (initialSave.customer ? [initialSave.customer] : []),
      initialSave.customerSequence ?? 0,
      initialSave.customerSpawnCooldown ?? 4
    );
    this.customerManager.restoreDiningRoutes(this.tileMap, this.fixtures);
    this.dailyRecords = initialSave.dailyRecords ? structuredClone(initialSave.dailyRecords) : {};
    this.quests = normalizeQuestState(initialSave.quests);
    this.stalls = normalizeStallState(initialSave.stalls);
    this.closedDayIds = new Set(initialSave.closedDayIds ?? []);
    this.ledger = (initialSave.ledger ?? []).map((e) => ({ ...e }));
    this.hydrateIdSequences(initialSave);
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
      for (const customer of this.customerManager.getCustomers()) {
        if (customer.diningTableId && (customer.stage === 'to_table' || customer.stage === 'eating')) this.diningDirtyTableIds.add(customer.diningTableId);
      }
      this.customerManager.abandonAllBaskets(this.tileMap, this.fixtures, this.inventory, (cnt) => {
        this.statistics.totalSpoiled = (this.statistics.totalSpoiled ?? 0) + cnt;
      }, day - 1, 1 + getSkillModifier(this.skills, 'shelf_capacity_bonus'));
      for (const member of this.staff) { this.finishStaffJob(member, true); member.diningTask = undefined; }
      this.processPayroll(day - 1);
      this.processStalls(day - 1);
      this.runStaffMaintenance();
      const worn = wearOvernight(this.fixtures, day, this.playerData.level);
      if (worn.length) this.callbacks.onMaintenanceNotice?.(worn);
      this.decayStock(day - 1); // trước khi thị trường sang ngày mới: sự kiện của ngày vừa qua còn trong trạng thái
      this.market = advanceMarketState(this.market, day);
      this.updatePriceIndex(day);
      this.ensureSupplierMarket(day);
      this.demandTable = undefined;
      this.callbacks.onWeatherChanged?.(effectiveWeatherId(this.market, day));
      for (const notice of marketNoticesForDay(this.market, day)) {
        if (this.noticeThrottle.allow(notice.kind, day, this.clock.getTime().hour)) this.callbacks.onMarketNotice?.(notice);
      }
      // Close previous day's record (day - 1) idempotently and initialize new day record
      const yesterdayRevenue = this.currentDayRecord.revenue;
      this.closeDailyRecord(day - 1);
      this.initDailyRecord(day);
      this.resolvePoliceCases(day);
      this.updateCustomerCreditStatuses(day);
      this.runNightBurglary(day, yesterdayRevenue);
      const spoiled = this.expireStock(day);
      this.deliverOrders(day);
      this.processAutoBuy(day);
      this.partyOrders = refreshAvailablePartyOrders(this.partyOrders, day, this.playerData.level);
      this.statistics.totalDaysPassed = Math.max(this.statistics.totalDaysPassed, day - 1);
      if (spoiled > 0) this.callbacks.onStockExpired?.(spoiled);
      const expiring = this.getExpiringStock();
      if (expiring.length) this.callbacks.onExpiringSoon?.(expiring);
      if (this.callbacks.onStockWarning) {
        const tracked = this.getProductPlans().filter((plan) => plan.stock > 0 || plan.soldRecently > 0);
        const low = tracked.filter((plan) => plan.flags.lowStock);
        const slow = tracked.filter((plan) => plan.flags.slowMoving);
        if (low.length || slow.length) this.callbacks.onStockWarning({ lowStock: low.length, slowMoving: slow.length, examples: low.slice(0, 3).map((plan) => PRODUCT_MAP[plan.productId]?.name ?? plan.productId) });
      }
      if (this.callbacks.onDayChanged) {
        this.callbacks.onDayChanged(day);
      }
      this.notifyStateChanged();
    }, () => this.callbacks.onTimeChanged?.());
  }

  /** Đặt lại vị trí nhân vật (dùng khi chơi chung: vị trí không theo save dùng chung). */
  public setPlayerPosition(position: Vector2D, direction?: PlayerData['direction']): void {
    this.playerData.position = { ...position };
    if (direction) this.playerData.direction = direction;
  }

  public getPlayerData(): PlayerData {
    return { ...this.playerData };
  }

  public getAverageCustomerRating(): number {
    return averageRating(this.playerData.ratings);
  }

  private recordCustomerRating(customer: CustomerState, reason?: CustomerFeedbackReason, legacyProductId?: string): void {
    const items = customer.basket ?? [];
    const ratios = items.map(item => item.unitPrice / Math.max(1, PRODUCT_MAP[item.productId]?.baseSellingPrice ?? item.unitPrice));
    if (!ratios.length && legacyProductId) ratios.push(this.sellingPrice(legacyProductId) / Math.max(1, PRODUCT_MAP[legacyProductId]?.baseSellingPrice ?? 1));
    const averagePriceRatio = ratios.length ? ratios.reduce((sum, ratio) => sum + ratio, 0) / ratios.length : 1;
    let stars = ratingForVisit({
      waitSeconds: Math.max(0, 45 - customer.patience),
      gotAll: (items.length > 0 || !!legacyProductId) && !reason,
      averagePriceRatio,
      reason,
    });
    if (customer.arrivalMode === 'motorbike' && this.hasSecurityGuardOnShift()) {
      stars = Math.min(5, stars + 1);
    }
    this.playerData.ratings = appendRating(this.playerData.ratings, stars);
    this.playerData.reputation = Math.max(0, Math.min(100, this.playerData.reputation + reputationDeltaFromRating(stars)));
    const previousCount = this.currentDayRecord.ratingCount ?? 0;
    this.currentDayRecord.averageStars = ((this.currentDayRecord.averageStars ?? 0) * previousCount + stars) / (previousCount + 1);
    this.currentDayRecord.ratingCount = previousCount + 1;
    this.demandTable = undefined;

    // Lời đánh giá bằng chữ: món liên quan là món đắt nhất trong giỏ, hoặc món khách định mua nếu bỏ về.
    const time = this.clock.getTime();
    const priciest = [...items].sort((a, b) => b.unitPrice * b.quantity - a.unitPrice * a.quantity)[0]?.productId;
    const productId = reason ? (customer.reservedProductId ?? priciest ?? this.fixtures.find(f => f.id === customer.targetFixtureId)?.assignedProductId) : (priciest ?? legacyProductId);
    const review = composeReview({
      day: time.day,
      hour: time.hour,
      minute: time.minute,
      stars,
      sequence: previousCount + 1,
      reason,
      productId,
      productName: productId ? PRODUCT_MAP[productId]?.name : undefined,
      waitSeconds: Math.max(0, 45 - customer.patience),
      averagePriceRatio,
      rainIntensity: this.getRainIntensity(),
      isWeekend: weekdayOf(time.day) >= 5,
      guardHelped: customer.arrivalMode === 'motorbike' && this.hasSecurityGuardOnShift(),
      regularId: customer.regularId,
      regularName: customer.regularName,
    });
    this.reviews = appendReview(this.reviews, review);
    this.callbacks.onCustomerRated?.({ stars, average: averageRating(this.playerData.ratings), reason, review });
  }

  /** Lời đánh giá gần đây của khách, mới nhất ở cuối. */
  public getReviews(): CustomerReview[] {
    return this.reviews.map(review => ({ ...review }));
  }

  public getReviewSummary() {
    return summarizeReviews(this.reviews);
  }

  public getFixtures(): StoreFixture[] {
    return this.fixtures;
  }

  public setPaused(paused: boolean): void { this.isPaused = paused; }

  public getTileMap(): GameTileMap { return this.tileMap; }

  public getStoredFixtures(): StoreFixture[] { return structuredClone(this.storedFixtures); }
  public getUnlockedPlotIds(): string[] { return [...this.unlockedPlotIds]; }
  public getDecorOwned(): string[] { return [...this.decorOwned]; }
  /** Điểm thu hút từ trang trí và hệ số khách tương ứng. */
  public getDecorAttraction(): { points: number; trafficMultiplier: number } {
    const points = decorAttraction(this.decorOwned, this.fixtures);
    return { points, trafficMultiplier: decorTrafficMultiplier(points) };
  }

  public applyStoreLayout(save: SaveGameData): LayoutResult {
    if (this.clock.getTime().isStoreOpen || this.customerManager.getCustomers().some(customer => customer.stage !== 'leaving') || this.staff.some(member => !!member.workerTask || !!member.diningTask)) {
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

  public getAmbientWarehouseCount(): number {
    return this.inventory.reduce((count, item) => count + (PRODUCT_MAP[item.productId]?.storageType !== 'cold' ? item.quantity : 0), 0);
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

  public getRegulars(): Record<string, RegularCustomerProgress> {
    return structuredClone(this.regulars);
  }

  public getCustomerCredits(): CustomerCreditAccount[] { return this.customerCredits.map(account => ({ ...account })); }

  public getCustomerCreditTerms(regularId: string): { eligible: boolean; limit: number; used: number; available: number } {
    const progress = this.regulars[regularId];
    const limit = progress && progress.friendship >= 40 ? Math.min(100_000, 20_000 + Math.max(0, progress.friendship - 40) * 1_000) : 0;
    const used = this.customerCredits.filter(c => c.regularId === regularId && (c.status === 'open' || c.status === 'overdue')).reduce((sum, c) => sum + c.balance, 0);
    const hasDefault = this.customerCredits.some(c => c.regularId === regularId && c.status === 'defaulted');
    return { eligible: limit > 0 && !hasDefault, limit, used, available: Math.max(0, limit - used) };
  }

  private updateCustomerCreditStatuses(day: number): void {
    for (const account of this.customerCredits) {
      if (account.status === 'paid' || account.status === 'defaulted') continue;
      if (day > account.dueDay + 7) {
        account.status = 'defaulted';
        const loss = account.balance;
        account.balance = 0;
        if (loss > 0) {
          this.currentDayRecord.badDebtCost = (this.currentDayRecord.badDebtCost ?? 0) + loss;
          this.currentDayRecord.netProfit -= loss;
          this.recordLedger({ day, type: 'bad_debt', amount: loss, description: `Xóa nợ xấu ${account.id}` });
          this.callbacks.onToast?.(`Khoản nợ ${account.id} đã thành nợ xấu: ${loss.toLocaleString('vi-VN')} VND`, 'warn');
        }
      } else if (day > account.dueDay && account.status === 'open') {
        account.status = 'overdue';
        this.callbacks.onToast?.(`Khoản mua chịu ${account.id} đã đến hạn thanh toán.`, 'warn');
      }
    }
  }

  public repayCustomerCredit(creditId: string): boolean {
    const account = this.customerCredits.find(c => c.id === creditId && (c.status === 'open' || c.status === 'overdue') && c.balance > 0);
    if (!account) return false;
    const amount = account.balance;
    account.balance = 0;
    account.status = 'paid';
    this.playerData.money += amount;
    this.recordLedger({ day: this.clock.getTime().day, type: 'credit_repayment', amount, description: `Thu hồi khoản phải thu ${creditId}` });
    this.callbacks.onToast?.(`Đã thu ${amount.toLocaleString('vi-VN')} VND từ khách quen`, 'success');
    this.notifyStateChanged();
    return true;
  }

  public getPriceHistory(productId: string): Array<{ day: number; price: number }> { return (this.priceHistory[productId] ?? []).map(point => ({ ...point })); }
  public getHeatmap(days: number): Record<string, number> { return aggregateHeatmap(this.heatmap, this.clock.getTime().day, days); }

  private recordHeatmap(): void {
    const day = this.clock.getTime().day;
    const seen = new Set<string>();
    for (const customer of this.customerManager.getCustomers()) {
      if (!customer.id) continue;
      const tile = `${Math.floor(customer.position.x / TILE_SIZE)},${Math.floor(customer.position.y / TILE_SIZE)}`;
      seen.add(customer.id);
      if (this.heatmapLastTile.get(customer.id) === tile) continue;
      this.heatmapLastTile.set(customer.id, tile);
      const today = (this.heatmap[day] ??= {});
      today[tile] = (today[tile] ?? 0) + 1;
    }
    for (const id of this.heatmapLastTile.keys()) if (!seen.has(id)) this.heatmapLastTile.delete(id);
  }

  public getProductionJobs(): ProductionJob[] { return this.productionJobs.map(job => ({ ...job })); }

  /** Công thức đã mở khóa theo cấp hiện tại cho một trạm (theo `shopId`). */
  public getStationRecipes(stationId: string): Recipe[] {
    const station = this.fixtures.find(item => item.id === stationId && item.type === 'kitchen_station');
    return station ? RECIPES.filter(recipe => recipe.stationShopId === station.shopId && recipe.unlockLevel <= this.playerData.level) : [];
  }

  /** Nhân viên bổ sung hàng đang trong ca làm bếp nhanh hơn (provisional, chưa playtest). */
  private productionSpeed(): number {
    return this.staff.some(member => member.role === 'refill' && this.isStaffOnShift(member)) ? 1.5 : 1;
  }

  public startProduction(recipeId: string, stationId: string): { success: boolean; reason?: string } {
    const recipe = RECIPE_MAP[recipeId];
    const station = this.fixtures.find(item => item.id === stationId && item.type === 'kitchen_station');
    if (!recipe || !station) return { success: false, reason: 'Không tìm thấy công thức hoặc trạm.' };
    if (station.broken || station.shopId !== recipe.stationShopId) return { success: false, reason: 'Trạm này không nấu được công thức đó.' };
    if (this.playerData.level < recipe.unlockLevel) return { success: false, reason: `Cần đạt cấp ${recipe.unlockLevel}.` };
    if (this.productionJobs.some(job => job.stationId === stationId)) return { success: false, reason: 'Trạm đang bận một mẻ khác.' };
    const day = this.clock.getTime().day;
    const missing = missingIngredients(this.inventory, recipe, day);
    if (missing.length > 0) {
      return { success: false, reason: `Thiếu nguyên liệu: ${missing.map(m => `${PRODUCT_MAP[m.productId]?.name ?? m.productId} (${m.available}/${m.needed})`).join(', ')}.` };
    }
    const used = consumeIngredients(this.inventory, recipe, day);
    if (!used) return { success: false, reason: 'Không đủ nguyên liệu.' };
    this.inventory = this.inventory.filter(item => item.quantity > 0);
    this.productionJobSequence += 1;
    this.productionJobs.push({ id: `job-${this.productionJobSequence}`, recipeId, stationId, startedDay: day, remaining: recipe.durationSeconds, inputCost: used.inputCost, inputExpiresOnDay: used.inputExpiresOnDay });
    this.callbacks.onToast?.(`Bắt đầu nấu ${recipe.name}.`, 'info');
    this.notifyStateChanged();
    return { success: true };
  }

  private updateProduction(dt: number): void {
    if (this.productionJobs.length === 0) return;
    const speed = this.productionSpeed();
    const day = this.clock.getTime().day;
    const finished: ProductionJob[] = [];
    for (const job of this.productionJobs) {
      job.remaining -= dt * speed;
      if (job.remaining <= 0) finished.push(job);
    }
    if (finished.length === 0) return;
    this.productionJobs = this.productionJobs.filter(job => !finished.includes(job));
    for (const job of finished) {
      const recipe = RECIPE_MAP[job.recipeId];
      if (!recipe) continue;
      addProductionOutput(this.inventory, recipe, job, day, PRODUCT_MAP[recipe.outputProductId]?.expirationRules?.daysToSpoil);
      this.callbacks.onToast?.(`${recipe.name} đã xong: +${recipe.outputQuantity} vào kho.`, 'success');
    }
    this.notifyStateChanged();
  }

  public getDiningTableState(fixtureId: string): { seats: number; occupied: number; dirty: boolean; enabled: boolean } {
    const fixture = this.fixtures.find(item => item.id === fixtureId && item.type === 'dining_table');
    if (!fixture) return { seats: 0, occupied: 0, dirty: false, enabled: false };
    return {
      seats: fixture.shopId === 'food_table_4' ? 4 : 2,
      occupied: this.customerManager.diningOccupancy(fixtureId),
      dirty: this.diningDirtyTableIds.has(fixtureId),
      enabled: true,
    };
  }

  public cleanDiningTable(fixtureId: string): boolean {
    const state = this.getDiningTableState(fixtureId);
    if (!state.enabled || !state.dirty || state.occupied > 0) return false;
    this.diningDirtyTableIds.delete(fixtureId);
    this.callbacks.onToast?.('Đã dọn sạch bàn ăn.', 'success');
    this.notifyStateChanged();
    return true;
  }

  public assignDiningCleanup(staffId: string, fixtureId: string): boolean {
    const member = this.staff.find(item => item.id === staffId && item.role === 'refill');
    const state = this.getDiningTableState(fixtureId);
    if (!member || !this.isStaffOnShift(member) || member.workerTask || member.diningTask || !state.dirty || state.occupied > 0) return false;
    const position = member.position ?? { ...WAREHOUSE_ENTRANCE };
    const fixture = this.fixtures.find(item => item.id === fixtureId && item.type === 'dining_table');
    const route = fixture ? this.routeToFixture(position, fixture) : undefined;
    if (!route) return false;
    member.position = { ...position };
    member.diningTask = { fixtureId, route, workRemaining: 3 };
    this.notifyStateChanged();
    return true;
  }

  private availableDiningTableId(): string | undefined {
    return this.fixtures.find(fixture => fixture.type === 'dining_table' && !this.diningDirtyTableIds.has(fixture.id)
      && this.customerManager.diningOccupancy(fixture.id) < (fixture.shopId === 'food_table_4' ? 4 : 2))?.id;
  }

  public canDineIn(customer: CustomerState): boolean {
    return this.isDineInBasketEligible(customer) && !!this.availableDiningTableId();
  }

  private isDineInBasketEligible(customer: CustomerState): boolean {
    const productIds = customer.basket?.map(item => item.productId) ?? (customer.reservedProductId ? [customer.reservedProductId] : []);
    return productIds.some(id => ['bread', 'instant_noodles', 'snacks', 'eggs'].includes(PRODUCT_MAP[id]?.category ?? ''));
  }

  public getLogisticsState(): StoreLogisticsState {
    return this.logisticsManager.getState();
  }
  public getLogisticsManager(): StoreLogisticsManager {
    return this.logisticsManager;
  }

  public getStreetVehicles(): StreetVehicleState[] {
    return this.streetTraffic.getVehicles();
  }

  public getStreetPedestrians(): StreetPedestrianState[] {
    return this.streetTraffic.getPedestrians();
  }

  public getTrafficSignal(): TrafficSignalState {
    return this.streetTraffic.getSignal();
  }

  /** Bảng nhu cầu lưu đệm; chỉ tính lại khi bối cảnh đổi (ngày, khung giờ, thời tiết, mùa, sự kiện, bậc uy tín), không mỗi khung hình. */
  private refreshDemandTable(): DemandTable {
    const time = this.clock.getTime();
    const ctx = buildMarketContext(this.market, time.day, time.hour);
    const key = demandContextKey(ctx, this.playerData.reputation);
    if (!this.demandTable || this.demandTable.key !== key) {
      this.demandTable = buildDemandTable({
        ctx, products: SELLABLE_PRODUCTS, reputation: this.playerData.reputation,
        priceFactor: (productId) => demandPriceFactor(priceRatio(this.sellingPrice(productId), this.referencePrice(productId))),
      });
      this.demandBuildCount++;
    }
    return this.demandTable;
  }

  /** Thị trường nhà cung cấp của `day`: giá sỉ trôi từng bước từ hôm trước, tồn và ngừng cung tính lại mỗi ngày. */
  private ensureSupplierMarket(day: number): void {
    const suppliers: Record<string, SupplierDayState> = { ...(this.market.suppliers ?? {}) };
    let changed = false;
    for (const supplier of SUPPLIERS) {
      const current = suppliers[supplier.id];
      if (current && current.day === day) continue;
      const ctx = buildMarketContext(this.market, day, 12);
      suppliers[supplier.id] = computeSupplierDay(this.market.seed, supplier, ctx, current && current.day < day ? current : undefined);
      changed = true;
    }
    if (changed) this.market = { ...this.market, suppliers };
  }

  /** Báo giá hôm nay của một nhà cung cấp cho giao diện: đơn giá, đổi so với hôm qua, lý do, tồn, ngừng cung. */
  public getSupplierQuotes(supplierId: string) {
    const supplier = SUPPLIER_MAP[supplierId];
    const state = this.market.suppliers?.[supplierId];
    const day = this.clock.getTime().day;
    const hasStock = supplier?.stockPerProductPerDay !== undefined;
    const quotes: Record<string, { unitPrice: number; previousUnitPrice: number; changePct: number; reasons: string[]; stockLeft?: number; unavailable: boolean }> = {};
    if (!supplier) return { quotes, deliveryDay: day, deliveryWeekday: WEEKDAY_LABELS[weekdayOf(day)], bulkTiers: [] as SupplierBulkTier[] };
    for (const product of ALL_PRODUCTS) {
      const now = wholesaleQuote(supplier, product, state, 1).unit;
      const yesterday = wholesaleQuote(supplier, product, state ? { ...state, priceIndex: state.prevIndex } : undefined, 1).unit;
      quotes[product.id] = {
        unitPrice: now,
        previousUnitPrice: yesterday,
        changePct: yesterday > 0 ? Math.round((now / yesterday - 1) * 100) : 0,
        reasons: state?.reasons[product.category] ?? [],
        stockLeft: hasStock ? state?.stockLeft[product.id] : undefined,
        unavailable: !!state?.unavailable.includes(product.id),
      };
    }
    const deliveryDay = nextDeliveryDay(supplier, day + supplier.delayDays);
    return { quotes, deliveryDay, deliveryWeekday: WEEKDAY_LABELS[weekdayOf(deliveryDay)], bulkTiers: supplier.bulkTiers ?? [] };
  }

  /** Đơn giá thực của một món tại nhà cung cấp hôm nay (dùng cho gợi ý nhập và tự nhập). */
  public wholesaleUnitPrice(supplierId: string, productId: string, quantity = 1): number {
    const supplier = SUPPLIER_MAP[supplierId];
    const product = PRODUCT_MAP[productId];
    if (!supplier || !product) return 0;
    const baseUnit = wholesaleQuote(supplier, product, this.market.suppliers?.[supplierId], quantity).unit;
    const discount = getSkillModifier(this.skills, 'supplier_discount');
    return discount > 0 ? Math.round(baseUnit * (1 - discount)) : baseUnit;
  }

  /** Giá bán hiện tại; món chưa được chỉnh dùng giá gợi ý trong catalog. */
  public sellingPrice(productId: string): number {
    return this.sellingPrices[productId] ?? PRODUCT_MAP[productId]?.baseSellingPrice ?? 0;
  }

  public setSellingPrice(productId: string, requestedPrice: number | null): { success: boolean; price?: number; reason?: string } {
    const product = PRODUCT_MAP[productId];
    if (!product) return { success: false, reason: 'Mặt hàng không tồn tại.' };
    if (this.customerManager.getCustomers().some(customer => customer.stage === 'checkout' && customer.basket?.some(item => item.productId === productId))) {
      return { success: false, reason: 'Không đổi giá khi khách đang thanh toán món này.' };
    }
    if (requestedPrice === null) {
      delete this.sellingPrices[productId];
      this.demandTable = undefined;
      this.notifyStateChanged();
      return { success: true, price: product.baseSellingPrice };
    }
    if (!Number.isFinite(requestedPrice) || requestedPrice <= 0) return { success: false, reason: 'Nhập giá bán hợp lệ.' };
    const bounds = this.sellingPriceBounds(productId)!;
    const clampedRequest = Math.min(bounds.max, Math.max(bounds.min, requestedPrice));
    const price = clampSellingPrice(clampedRequest, product.baseSellingPrice);
    if (price === product.baseSellingPrice) delete this.sellingPrices[productId];
    else this.sellingPrices[productId] = price;
    this.demandTable = undefined;
    this.notifyStateChanged();
    return { success: true, price };
  }

  public sellingPriceBounds(productId: string): { min: number; max: number; step: number } | null {
    const suggested = PRODUCT_MAP[productId]?.baseSellingPrice;
    if (!suggested) return null;
    const step = PRICE_RULES.sellingPriceStep;
    return {
      min: Math.ceil((suggested * PRICE_RULES.sellingPriceBand.min) / step) * step,
      max: Math.floor((suggested * PRICE_RULES.sellingPriceBand.max) / step) * step,
      step,
    };
  }

  /** Giá tham chiếu thị trường của món = giá gợi ý × chỉ số giá của nhóm (trôi dần theo ngày). */
  public referencePrice(productId: string): number {
    const product = PRODUCT_MAP[productId];
    if (!product) return 0;
    return product.baseSellingPrice * (this.market.priceIndex?.[product.category] ?? 1);
  }

  private stockUnitsByCategory(): Record<string, number> {
    const units: Record<string, number> = {};
    const add = (productId: string | undefined, quantity: number) => {
      const category = productId ? PRODUCT_MAP[productId]?.category : undefined;
      if (category) units[category] = (units[category] ?? 0) + quantity;
    };
    for (const item of this.inventory) add(item.productId, item.quantity);
    for (const item of this.holdingArea) add(item.productId, item.quantity);
    for (const fixture of this.fixtures) if (isSalesFixture(fixture)) add(fixture.assignedProductId, fixture.currentStock);
    return units;
  }

  /** Nhóm hàng người chơi đang bán hoặc giữ: có tồn, có kệ/sơ đồ gán món của nhóm, hoặc có doanh số trong 7 ngày gần nhất. */
  private activePriceCategories(day: number): Set<string> {
    const active = new Set<string>();
    const add = (productId: string | undefined) => {
      const category = productId ? PRODUCT_MAP[productId]?.category : undefined;
      if (category) active.add(category);
    };
    for (const [category, units] of Object.entries(this.stockUnitsByCategory())) if (units > 0) active.add(category);
    for (const fixture of this.fixtures) if (isSalesFixture(fixture)) { add(fixture.assignedProductId); add(this.planogram[fixture.id]); }
    for (let d = Math.max(1, day - 7); d < day; d++) for (const productId of Object.keys(this.dailyRecords[d]?.productSales ?? {})) add(productId);
    for (const productId of Object.keys(this.currentDayRecord.productSales ?? {})) add(productId);
    return active;
  }

  /** Mỗi ngày đẩy chỉ số giá từng nhóm một bước về mục tiêu (áp lực nhu cầu × khan hiếm × chi phí). */
  private updatePriceIndex(day: number): void {
    const table = buildDemandTable({ ctx: buildMarketContext(this.market, day, 12), products: SELLABLE_PRODUCTS, reputation: this.playerData.reputation });
    const targets = computePriceTargets({ products: SELLABLE_PRODUCTS, table, stockUnits: this.stockUnitsByCategory(), activeCategories: this.activePriceCategories(day) });
    this.market = { ...this.market, priceIndex: advancePriceIndex(this.market.priceIndex, targets), priceTargets: targets };
  }

  private customerPricing() {
    const time = this.clock.getTime();
    const ctx = buildMarketContext(this.market, time.day, time.hour);
    return {
      priceOf: (productId: string) => this.sellingPrice(productId),
      keepChance: (productId: string) => {
        const product = PRODUCT_MAP[productId];
        return product ? keepChance(priceRatio(this.sellingPrice(productId), this.referencePrice(productId)), productSensitivity(product, ctx)) : 1;
      },
      onReject: () => { this.currentDayRecord.priceWalkouts = (this.currentDayRecord.priceWalkouts ?? 0) + 1; },
    };
  }

  /** Thị trường giá theo nhóm cho giao diện: chỉ số, mục tiêu và lý do (nhu cầu, khan hiếm, chi phí). */
  public getPriceMarket() {
    return PRICED_CATEGORIES.map(category => {
      const info = this.market.priceTargets?.[category];
      return {
        category,
        label: PRODUCT_CATEGORY_LABELS[category],
        index: this.market.priceIndex?.[category] ?? 1,
        target: info?.target ?? 1,
        demand: info?.demand ?? 1,
        scarcity: info?.scarcity ?? 1,
        cost: info?.cost ?? 1,
      };
    });
  }

  public getDemandTable(): DemandTable { return this.refreshDemandTable(); }
  public getDemandBuildCount(): number { return this.demandBuildCount; }
  public getMarketState(): MarketState { return structuredClone(this.market); }

  /** Lý do nhu cầu của một món: danh sách hệ số (nguồn, nhãn, hệ số) cùng tổng. */
  public explainDemand(productId: string): ProductDemand | undefined {
    return this.refreshDemandTable().perProduct[productId];
  }

  /** Tóm tắt cho giao diện: thời tiết hôm nay + dự báo, mùa, khung giờ, thứ, lưu lượng và lý do. */
  public getMarketSummary() {
    const time = this.clock.getTime();
    const table = this.refreshDemandTable();
    const todayId = effectiveWeatherId(this.market, time.day);
    const weather = WEATHER_MAP[todayId] ?? WEATHER_MAP[this.market.weather.today];
    return {
      weather: {
        id: weather.id, label: weather.label, icon: weather.icon,
        rainIntensity: rainIntensityAt(this.weatherSeed, time.day, time.hour, time.minute, weather.id),
        rain: rainForecastForDay(this.weatherSeed, time.day, weather.id),
      },
      forecast: [1, 2].map(offset => {
        const id = effectiveWeatherId(this.market, time.day + offset);
        return { id, label: WEATHER_MAP[id]?.label ?? id, icon: WEATHER_MAP[id]?.icon ?? '', rain: rainForecastForDay(this.weatherSeed, time.day + offset, id) };
      }),
      events: visibleMarketEvents(this.market, time.day),
      season: getSeasonForDay(time.day),
      climate: CLIMATE_SEASON_MAP[climateSeasonForDay(time.day).id],
      timeBand: TIME_BANDS.find(band => band.id === timeBandFor(time.hour))!,
      weekday: WEEKDAY_LABELS[weekdayOf(time.day)],
      traffic: {
        ...table.traffic,
        value: trafficAtLevel(table.traffic.value * reputationTrafficMultiplier(this.playerData.ratings) * this.getDecorAttraction().trafficMultiplier * prestigeTrafficMultiplier(this.playerData.prestigeStars ?? 0), this.playerData.level),
        factors: [
          ...table.traffic.factors,
          { ruleId: 'customer_ratings', label: 'Đánh giá khách', factor: reputationTrafficMultiplier(this.playerData.ratings) },
          ...(this.getDecorAttraction().points > 0 ? [{ ruleId: 'decor_attraction', label: 'Trang trí cửa hàng', factor: this.getDecorAttraction().trafficMultiplier }] : []),
          ...(getLevelTrafficMultiplier(this.playerData.level) > 1 ? [{ ruleId: 'level_progression_traffic', label: `Cấp ${this.playerData.level}: lưu lượng khách tăng`, factor: getLevelTrafficMultiplier(this.playerData.level) }] : []),
        ],
      },
    };
  }

  public getSeason(day = this.clock.getTime().day) {
    return getSeasonForDay(day);
  }

  public getRainIntensity(): number {
    const time = this.clock.getTime();
    const weatherId = effectiveWeatherId(this.market, time.day);
    return rainIntensityAt(this.weatherSeed, time.day, time.hour, time.minute, weatherId);
  }

  /** Độ ướt mặt đường 0..1 (mưa + khô dần sau mưa), dùng cho đường ướt và vũng nước. */
  public getRoadWetness(): number {
    const time = this.clock.getTime();
    return roadWetnessAt(this.weatherSeed, time.day, time.hour * 60 + time.minute, effectiveWeatherId(this.market, time.day));
  }

  /** Trạng thái an ninh (camera, báo công an, sự cố gần đây, hồ sơ công an đang mở). */
  public getSecurityState(): SecurityState {
    return { ...this.security, incidents: this.security.incidents.map(i => ({ ...i })), policeCases: this.security.policeCases.map(c => ({ ...c })) };
  }

  /** Lắp camera một lần (trừ tiền, ghi sổ cái như chi phí thiết bị). */
  public buyCamera(): { success: boolean; reason?: string; cost?: number } {
    if (!securityUnlocked(this.playerData.level)) return { success: false, reason: `Mở khóa an ninh ở cấp ${SECURITY_RULES.unlockLevel}.` };
    if (this.security.camera) return { success: false, reason: 'Tiệm đã có camera.' };
    const cost = SECURITY_RULES.cameraCost;
    if (this.playerData.money < cost) return { success: false, reason: 'Không đủ tiền.' };
    this.playerData.money -= cost;
    this.security.camera = true;
    this.currentDayRecord.maintenanceCost = (this.currentDayRecord.maintenanceCost ?? 0) + cost;
    this.currentDayRecord.netProfit = this.currentDayRecord.grossProfit - this.currentDayRecord.spoilageCost - this.currentDayRecord.wagesPaid - (this.currentDayRecord.maintenanceCost ?? 0) - (this.currentDayRecord.theftCost ?? 0) + (this.currentDayRecord.theftRecovered ?? 0) - (this.currentDayRecord.counterfeitLoss ?? 0) - (this.currentDayRecord.badDebtCost ?? 0);
    this.recordLedger({ day: this.clock.getTime().day, type: 'maintenance', amount: cost, description: 'Lắp camera an ninh' });
    this.notifyStateChanged();
    return { success: true, cost };
  }

  public setCallPolice(enabled: boolean): { success: boolean } {
    this.security.callPolice = enabled;
    this.notifyStateChanged();
    return { success: true };
  }

  private recordIncident(kind: SecurityIncident['kind'], text: string, extra: { loss?: number; recovered?: number } = {}, severity: 'info' | 'warn' = 'warn'): void {
    const day = this.clock.getTime().day;
    const id = `sec-${day}-${this.security.incidents.filter(i => i.day === day).length + 1}`;
    this.security.incidents = appendIncident(this.security.incidents, { id, day, kind, text, ...extra });
    this.callbacks.onSecurityNotice?.({ text, severity });
  }

  private refreshDayNet(): void {
    const r = this.currentDayRecord;
    r.netProfit = r.grossProfit - r.spoilageCost - r.wagesPaid - (r.maintenanceCost ?? 0) - (r.theftCost ?? 0) + (r.theftRecovered ?? 0) - (r.counterfeitLoss ?? 0) - (r.badDebtCost ?? 0);
  }

  /** A counterfeit note replaces part of cash received; sales remain gross revenue and face value is a separate loss. */
  private counterfeitCashLoss(customer: CustomerState, checkoutId: string, saleTotal: number): number {
    const cashier = customer.cashierStaffId ? this.staff.find((staff) => staff.id === customer.cashierStaffId) : undefined;
    const outcome = assessCounterfeit(this.clock.getTime().day, checkoutId, saleTotal,
      cashier ? { kind: 'staff', accuracy: cashier.accuracy } : { kind: 'player' });
    if (!outcome.counterfeit) return 0;
    if (outcome.detected) {
      this.callbacks.onToast?.(`${cashier?.name ?? 'Bạn'} phát hiện tờ tiền giả ${outcome.faceValue.toLocaleString('vi-VN')} đ; khách đổi sang tiền hợp lệ.`, 'success');
      return 0;
    }
    const loss = Math.min(saleTotal, outcome.faceValue);
    this.currentDayRecord.counterfeitLoss = (this.currentDayRecord.counterfeitLoss ?? 0) + loss;
    this.refreshDayNet();
    this.recordLedger({ day: this.clock.getTime().day, type: 'counterfeit', amount: loss, description: `Nhận nhầm tiền giả ở checkout ${checkoutId}` });
    this.callbacks.onToast?.(`Không phát hiện tiền giả ${loss.toLocaleString('vi-VN')} đ trong giao dịch.`, 'warn');
    return loss;
  }

  /** `cash`: tiền mặt trong két bị lấy (giảm tiền); ngược lại là hàng bị lấy (chỉ ghi sổ, không đổi tiền như hao hụt). */
  private addTheftLoss(value: number, quantity: number, description: string, cash = false): void {
    this.currentDayRecord.theftCost = (this.currentDayRecord.theftCost ?? 0) + value;
    this.refreshDayNet();
    this.recordLedger({ day: this.clock.getTime().day, type: cash ? 'theft_cash' : 'theft', amount: value, quantity, description });
  }

  private addRecovery(value: number, description: string): void {
    this.playerData.money += value;
    this.currentDayRecord.theftRecovered = (this.currentDayRecord.theftRecovered ?? 0) + value;
    this.refreshDayNet();
    this.recordLedger({ day: this.clock.getTime().day, type: 'recovery', amount: value, description });
  }

  /** Kẻ trộm lẻ tới quầy: bị phát hiện thì trả lại hàng và nộp phạt, không thì mang hàng đi mà không trả tiền. */
  private resolveShoplifter(customer: CustomerState, checkoutId: string): boolean {
    const day = this.clock.getTime().day;
    const chance = shopliftDetectChance({
      guardOnShift: this.hasSecurityGuardOnShift(),
      camera: this.security.camera,
      refillOnShift: this.staff.some((s) => s.role === 'refill' && this.isStaffOnShift(s)),
    });
    const caught = shopliftCaught(day, customer.id ?? checkoutId, chance);
    const totals = this.customerManager.finishShoplifter(checkoutId, caught, this.tileMap, this.fixtures, this.inventory, (spoiled) => {
      this.statistics.totalSpoiled = (this.statistics.totalSpoiled ?? 0) + spoiled;
    }, day, 1 + getSkillModifier(this.skills, 'shelf_capacity_bonus'));
    if (!totals) return false;
    this.completedCheckoutIds.add(checkoutId);
    if (caught) {
      const fine = Math.round((totals.retail * SECURITY_RULES.fineMul) / 1000) * 1000;
      this.addRecovery(fine, 'Phạt kẻ trộm bị bắt quả tang');
      this.recordIncident('shoplift_caught', `Bắt quả tang một khách lấy ${totals.count} món không trả tiền, thu hồi hàng và phạt ${fine.toLocaleString('vi-VN')} đ.`, { recovered: fine }, 'info');
    } else {
      this.addTheftLoss(totals.cost, totals.count, `Khách lấy ${totals.count} món không trả tiền`);
      this.recordIncident('shoplift_escaped', `Một khách lấy ${totals.count} món (giá vốn ${totals.cost.toLocaleString('vi-VN')} đ) rồi đi mà không trả tiền. Thuê bảo vệ hoặc lắp camera để phòng.`, { loss: totals.cost });
    }
    this.notifyStateChanged();
    return true;
  }

  /** Đêm sang `day`: có thể có trộm đột nhập (lấy tiền két hoặc hàng trên kệ); bảo vệ trong biên chế thì đuổi được. */
  private runNightBurglary(day: number, yesterdayRevenue: number): void {
    const guard = this.staff.find((s) => s.role === 'security');
    const plan = planBurglary(day, this.playerData.level, { camera: this.security.camera, hasGuard: !!guard });
    if (plan.kind === 'none') return;
    if (plan.kind === 'repelled') {
      this.recordIncident('burglary_repelled', `Đêm qua có kẻ lạ cạy cửa tiệm, bảo vệ ${guard?.name ?? ''} đã đuổi đi. Không mất gì!`, {}, 'info');
      return;
    }
    let value = 0;
    let lost: string;
    if (plan.kind === 'cash') {
      const drawer = Math.min(Math.max(0, this.playerData.money), yesterdayRevenue);
      if (drawer <= 0) {
        this.recordIncident('burglary', 'Đêm qua có trộm cạy cửa nhưng két trống, không lấy được gì.', {}, 'info');
        return;
      }
      value = Math.max(1000, Math.min(Math.round((drawer * plan.fraction) / 1000) * 1000, this.playerData.money));
      this.playerData.money -= value;
      lost = `mất ${value.toLocaleString('vi-VN')} đ tiền trong két`;
    } else {
      const shelves = this.fixtures.filter((f) => isSalesFixture(f) && f.currentStock > 0 && f.stockLots && f.stockLots.length > 0);
      const total = shelves.reduce((n, f) => n + f.currentStock, 0);
      if (!total) {
        this.recordIncident('burglary', 'Đêm qua có trộm cạy cửa nhưng kệ trống trơn, không lấy được gì.', {}, 'info');
        return;
      }
      const want = Math.min(plan.maxItems, Math.max(1, Math.round(total * plan.fraction)));
      const rng = new Mulberry32Rng(plan.seed);
      let taken = 0;
      for (let loop = 0; taken < want && loop < want * 6; loop++) {
        const shelf = shelves[Math.floor(rng.next() * shelves.length)];
        if (!shelf.stockLots || shelf.currentStock <= 0) continue;
        const moved = takeLots(shelf.stockLots, 1);
        shelf.currentStock = sumLots(shelf.stockLots);
        for (const lot of moved) value += lot.quantity * (lot.unitCost ?? PRODUCT_MAP[shelf.assignedProductId ?? '']?.purchasePrice ?? 0);
        taken++;
      }
      lost = `mất ${taken} món trên kệ (giá vốn ${value.toLocaleString('vi-VN')} đ)`;
      this.addTheftLoss(value, taken, `Trộm đột nhập lấy ${taken} món`);
      this.recordIncident('burglary', `Đêm qua tiệm bị trộm đột nhập, ${lost}. Thuê bảo vệ hoặc lắp camera để phòng.`, { loss: value });
      this.openCase(day, value);
      return;
    }
    this.addTheftLoss(value, 0, 'Trộm đột nhập lấy tiền két', true);
    this.recordIncident('burglary', `Đêm qua tiệm bị trộm đột nhập, ${lost}. Thuê bảo vệ hoặc lắp camera để phòng.`, { loss: value });
    this.openCase(day, value);
  }

  private openCase(day: number, value: number): void {
    if (!this.security.callPolice || value <= 0) return;
    this.security.policeCases.push(openPoliceCase(day, value, this.security.camera));
    this.callbacks.onSecurityNotice?.({ text: `Đã báo công an phường${this.security.camera ? ', nộp kèm hình camera' : ''}. Có kết quả điều tra trong vài ngày.`, severity: 'info' });
  }

  /** Hồ sơ công an tới hạn: bắt được kẻ trộm thì trả lại tiền. */
  private resolvePoliceCases(day: number): void {
    const due = this.security.policeCases.filter((c) => c.resolveDay <= day);
    if (!due.length) return;
    this.security.policeCases = this.security.policeCases.filter((c) => c.resolveDay > day);
    for (const c of due) {
      const ago = day - c.day;
      if (c.caught) {
        this.addRecovery(c.value, 'Công an trả lại tiền vụ trộm');
        this.recordIncident('police_recovered', `Công an đã bắt được kẻ trộm đột nhập ${ago} ngày trước, trả lại tiệm ${c.value.toLocaleString('vi-VN')} đ!`, { recovered: c.value }, 'info');
      } else {
        this.recordIncident('police_closed', `Công an chưa tìm ra kẻ trộm đột nhập ${ago} ngày trước, hồ sơ tạm đóng.`, {}, 'info');
      }
    }
  }

  /** Danh sách kệ/tủ mát kèm độ mòn, trạng thái và hành động bảo trì có thể làm. */
  public getMaintenanceList(): MaintenanceEntry[] {
    return listMaintenance(this.fixtures);
  }

  /** Bảo trì, sửa nhẹ hoặc mua mới một kệ/tủ mát; trừ tiền, ghi sổ cái và chi phí ngày. Mua mới giữ chỗ đặt và hàng đang bày. */
  public maintainFixture(fixtureId: string, action: MaintenanceAction): { success: boolean; reason?: string; cost?: number } {
    return this.applyMaintenanceAction(fixtureId, action, false);
  }

  /** Nhân viên châm hàng tự bảo trì đồ đã mòn trước khi đêm làm hỏng; trả phí như người chơi. */
  private runStaffMaintenance(): void {
    let count = 0, total = 0;
    for (const id of staffServiceTargets(this.fixtures, this.staff)) {
      const result = this.applyMaintenanceAction(id, 'service', true);
      if (result.success) { count += 1; total += result.cost ?? 0; }
    }
    if (count > 0) this.callbacks.onToast?.(`Nhân viên đã bảo trì ${count} món nội thất (${total.toLocaleString('vi-VN')} VND).`);
  }

  private applyMaintenanceAction(fixtureId: string, action: MaintenanceAction, byStaff: boolean): { success: boolean; reason?: string; cost?: number } {
    const fixture = this.fixtures.find((f) => f.id === fixtureId);
    const result = applyMaintenance(fixture, action, this.playerData.money, this.playerData.level);
    if (!result.success) return { success: false, reason: MAINTENANCE_FAILURE_TEXT[result.reason] };
    const day = this.clock.getTime().day;
    this.playerData.money -= result.cost;
    this.currentDayRecord.maintenanceCost = (this.currentDayRecord.maintenanceCost ?? 0) + result.cost;
    this.currentDayRecord.netProfit = this.currentDayRecord.grossProfit - this.currentDayRecord.spoilageCost - this.currentDayRecord.wagesPaid - (this.currentDayRecord.maintenanceCost ?? 0) - (this.currentDayRecord.theftCost ?? 0) + (this.currentDayRecord.theftRecovered ?? 0) - (this.currentDayRecord.counterfeitLoss ?? 0) - (this.currentDayRecord.badDebtCost ?? 0);
    const verb = action === 'replace' ? 'Mua mới' : action === 'repair' ? 'Sửa' : 'Bảo trì';
    this.recordLedger({ day, type: 'maintenance', amount: result.cost, description: `${verb} ${fixture!.label}${byStaff ? ' (nhân viên)' : ''}` });
    this.notifyStateChanged();
    return { success: true, cost: result.cost };
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
    this.customerManager.rerouteAll(this.tileMap, this.fixtures);
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
      record.stallServings = { ...record.stallServings, [stallId]: (record.stallServings?.[stallId] ?? 0) + plan.servings };
      this.recordLedger({ day, type: 'sale', amount: revenue, cogs, quantity: plan.servings, description: `${stall.name}: bán ${plan.servings}/${plan.demand} suất` });
    }
    record.grossProfit = record.revenue - record.cogs;
    record.netProfit = record.grossProfit - record.spoilageCost - record.wagesPaid - (record.maintenanceCost ?? 0) - (record.theftCost ?? 0) + (record.theftRecovered ?? 0) - (record.counterfeitLoss ?? 0) - (record.badDebtCost ?? 0);
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

  // ==========================================
  // Party Orders (Đơn tiệc có hạn)
  // ==========================================

  public getPartyOrderState(): PartyOrderState {
    return structuredClone(this.partyOrders);
  }

  public respondPartyOrder(orderId: string, accept: boolean): { success: boolean; reason?: string } {
    const res = respondPartyOrder(this.partyOrders, orderId, accept, this.clock.getTime().day);
    if (res.success) {
      this.partyOrders = res.state;
      const def = PARTY_ORDER_MAP[orderId];
      if (def) {
        this.logisticsManager.enqueueDelivery({
          type: 'outbound_party_order',
          products: def.items,
          orderLabel: def.title,
        });
      }
      this.notifyStateChanged();
    }
    return { success: res.success, reason: res.reason };
  }

  public fulfillPartyOrder(orderId: string): FulfillPartyOrderResult {
    const day = this.clock.getTime().day;
    const res = fulfillPartyOrder({
      state: this.partyOrders,
      orderId,
      day,
      inventory: this.inventory,
    });

    if (res.success && !res.alreadyCompleted && res.reward && res.inventory) {
      this.inventory = res.inventory;
      this.playerData.money += res.reward.money;
      this.playerData.reputation = Math.min(100, this.playerData.reputation + res.reward.reputation);
      if (res.reward.experience) {
        this.addExperience(res.reward.experience);
      }
      this.addSkillExperience('marketing', 15);

      const def = PARTY_ORDER_MAP[orderId];
      const desc = def ? `Giao đơn tiệc: ${def.title}` : `Giao đơn tiệc: ${orderId}`;
      const totalUnits = def ? def.items.reduce((sum, item) => sum + item.quantity, 0) : 0;

      this.currentDayRecord.revenue += res.reward.money;
      this.currentDayRecord.cogs += res.cogs;
      this.currentDayRecord.itemsSold += totalUnits;
      this.statistics.totalRevenue += res.reward.money;

      this.recordLedger({
        day,
        type: 'sale',
        amount: res.reward.money,
        cogs: res.cogs,
        quantity: totalUnits,
        description: desc,
      });

      this.notifyStateChanged();
    }

    return res;
  }

  // ==========================================
  // Goals & Weekly Quests (Mục tiêu & Nhiệm vụ tuần)
  // ==========================================

  public getGoalContext(): SimulationGoalContext {
    const currentDay = this.clock.getTime().day;
    const currentWeek = Math.floor((currentDay - 1) / 7) + 1;
    const startDayOfWeek = (currentWeek - 1) * 7 + 1;

    let weekRevenue = 0;
    let weekCustomersServed = 0;
    let weekItemsSold = 0;

    for (let d = startDayOfWeek; d <= currentDay; d++) {
      const rec = d === currentDay ? this.currentDayRecord : this.dailyRecords[d];
      if (rec) {
        weekRevenue += rec.revenue ?? 0;
        weekCustomersServed += rec.customersServed ?? 0;
        weekItemsSold += rec.itemsSold ?? 0;
      }
    }

    const salesFixturesCount = this.fixtures.filter(isSalesFixture).length;
    const stallsCount = this.stalls.owned.length;
    const completedPartyOrdersCount = this.partyOrders.completedOrderIds.length;
    const weekPartyOrdersCount = this.partyOrders.available.filter(order =>
      order.status === 'completed' && order.completedDay !== undefined &&
      order.completedDay >= startDayOfWeek && order.completedDay <= currentDay
    ).length;

    return {
      totalRevenue: this.statistics.totalRevenue,
      totalCustomersServed: this.statistics.totalCustomersServed,
      salesFixturesCount,
      stallsCount,
      reputation: this.playerData.reputation,
      completedPartyOrdersCount,
      weekRevenue,
      weekCustomersServed,
      weekItemsSold,
      weekPartyOrdersCount,
      currentWeek,
    };
  }

  public getGoalState(): GoalState {
    return structuredClone(this.goals);
  }

  public getGoalProgressList(): GoalProgressInfo[] {
    const ctx = this.getGoalContext();
    return LONG_TERM_GOALS.map((g) => getGoalProgress(g, ctx, this.goals));
  }

  public getWeeklyQuestProgressList(): WeeklyQuestProgressInfo[] {
    const ctx = this.getGoalContext();
    return WEEKLY_QUESTS.map((q) => getWeeklyQuestProgress(q, ctx, this.goals));
  }

  public claimGoal(goalId: string): { success: boolean; reason?: string } {
    const ctx = this.getGoalContext();
    const res = claimGoal(this.goals, goalId, ctx);
    if (res.success && res.reward) {
      this.goals = res.state;
      this.playerData.money += res.reward.money;
      this.playerData.reputation = Math.min(100, this.playerData.reputation + res.reward.reputation);
      if (res.reward.experience) {
        this.addExperience(res.reward.experience);
      }
      this.addSkillExperience('management', 10);
      this.notifyStateChanged();
      return { success: true };
    }
    return { success: false, reason: res.reason };
  }

  public claimWeeklyQuest(questId: string): { success: boolean; reason?: string } {
    const ctx = this.getGoalContext();
    const res = claimWeeklyQuest(this.goals, questId, ctx);
    if (res.success && res.reward) {
      this.goals = res.state;
      this.playerData.money += res.reward.money;
      this.playerData.reputation = Math.min(100, this.playerData.reputation + res.reward.reputation);
      this.addSkillExperience('management', 15);
      this.notifyStateChanged();
      return { success: true };
    }
    return { success: false, reason: res.reason };
  }

  private productSalesOn = (day: number) =>
    day === this.currentDayRecord.day ? this.currentDayRecord : this.dailyRecords[day];

  public getFestivalGoalProgressList(): FestivalGoalProgressInfo[] {
    return getFestivalGoalProgress(this.clock.getTime().day, this.goals, this.productSalesOn);
  }

  /** Thưởng ngày hội là tiền thưởng ngoài sổ GAAP, như thưởng mục tiêu/nhiệm vụ. */
  public claimFestivalGoal(goalId: string): { success: boolean; reason?: string } {
    const res = claimFestivalGoal(this.goals, goalId, this.clock.getTime().day, this.productSalesOn);
    if (res.success && res.reward) {
      this.goals = res.state;
      this.playerData.money += res.reward.money;
      this.playerData.reputation = Math.min(100, this.playerData.reputation + res.reward.reputation);
      this.addSkillExperience('management', 10);
      this.notifyStateChanged();
      return { success: true };
    }
    return { success: false, reason: res.reason };
  }

  // ==========================================
  // Skills & Perks (Kỹ năng & Đặc quyền)
  // ==========================================

  public getSkillState(): SkillState {
    return structuredClone(this.skills);
  }

  public addSkillExperience(skill: SkillType, amount: number): void {
    const res = addSkillXp(this.skills, skill, amount);
    this.skills = res.state;
    if (res.leveledUp) {
      this.callbacks.onLevelUp?.(res.newLevel);
    }
    this.notifyStateChanged();
  }

  public chooseSkillPerk(perkId: string): { success: boolean; reason?: string } {
    const res = choosePerk(this.skills, perkId);
    if (res.success) {
      this.skills = res.state;
      this.notifyStateChanged();
    }
    return { success: res.success, reason: res.reason };
  }

  /** Bonus sức chứa kệ từ perk (0 nếu chưa có), để UI/renderer hiển thị cùng giới hạn với simulation. */
  public getShelfCapacityBonus(): number {
    return getSkillModifier(this.skills, 'shelf_capacity_bonus');
  }

  public hasPerk(perkId: string): boolean {
    return hasPerk(this.skills, perkId);
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
      const unitPrice = Math.max(1, this.wholesaleUnitPrice(rule.supplierId, rule.productId, quantity));
      const affordable = Math.floor(Math.min(remainingBudget, rule.maxBudget) / unitPrice);
      quantity = Math.min(quantity, affordable);
      if (product.storageType === 'cold') {
        quantity = Math.min(quantity, Math.max(0, COLD_WAREHOUSE_CAPACITY - this.getColdWarehouseCount() - coldIncoming()));
      } else {
        const ambientFree = Math.max(0, totalWarehouseCells({ warehouseTier: this.warehouseTier, storageRackCount: this.storageRackCount }) - this.getAmbientWarehouseCount());
        quantity = Math.min(quantity, Math.max(0, ambientFree - coldIncoming()));
      }
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
      hireRecord.netProfit = hireRecord.revenue - hireRecord.cogs - hireRecord.spoilageCost - hireRecord.wagesPaid - (hireRecord.maintenanceCost ?? 0) - (hireRecord.theftCost ?? 0) + (hireRecord.theftRecovered ?? 0) - (hireRecord.counterfeitLoss ?? 0) - (hireRecord.badDebtCost ?? 0);
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
        : candidate.role === 'security'
        ? { x: 4 * 32, y: 13 * 32 }
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
    if (member.diningTask && !this.isStaffOnShift(member)) member.diningTask = undefined;
    if (member.role === 'cashier' && member.currentCheckoutId && !this.isStaffOnShift(member)) {
      this.completeCustomerCheckout(member.currentCheckoutId);
      this.customerManager.assignCashier(member.currentCheckoutId, undefined);
      member.checkoutServiceRemaining = 0;
      member.currentCheckoutId = undefined;
    }
    this.notifyStateChanged();
    return true;
  }

  public hasSecurityGuardOnShift(): boolean {
    return this.staff.some((s) => s.role === 'security' && this.isStaffOnShift(s));
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
    member.checkoutServiceRemaining = Math.max(0.6, 2.4 - member.accuracy * 0.15) * (1 - getSkillModifier(this.skills, 'cashier_speed')) * (1 - getSkillModifier(this.skills, 'staff_speed'));
    return true;
  }

  private updateStaffWorkers(dt: number): void {
    for (const member of this.staff) {
      const diningTask = member.diningTask;
      if (diningTask) {
        if (!this.isStaffOnShift(member) || !this.getDiningTableState(diningTask.fixtureId).dirty) {
          member.diningTask = undefined;
        } else {
          const position = member.position ?? { ...WAREHOUSE_ENTRANCE };
          const waypoint = diningTask.route[0];
          if (waypoint) {
            const dx = waypoint.x - position.x, dy = waypoint.y - position.y, distance = Math.hypot(dx, dy);
            const step = Math.max(35, member.speed * 16) * (1 + getSkillModifier(this.skills, 'staff_speed')) * dt;
            if (distance <= step) { member.position = { ...waypoint }; diningTask.route.shift(); }
            else if (distance > 0) member.position = { x: position.x + dx / distance * step, y: position.y + dy / distance * step };
          } else {
            diningTask.workRemaining -= dt;
            if (diningTask.workRemaining <= 0) {
              this.cleanDiningTable(diningTask.fixtureId);
              member.diningTask = undefined;
              member.lastWorkerError = undefined;
            }
          }
        }
      }
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
        const step = Math.max(35, member.speed * 16) * (1 + getSkillModifier(this.skills, 'staff_speed')) * Math.max(0, dt);
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
          (shelf.currentStock > 0 && shelf.assignedProductId !== task.productId) || slotCategoryConflict(this.fixtures, shelf, task.productId)) {
        member.lastWorkerError = 'Kệ không còn khớp với việc được giao.';
        this.finishStaffJob(member, true);
        continue;
      }
      const capacity = effectiveShelfCapacity(shelf.maxCapacity, product.shelfCapacity, getSkillModifier(this.skills, 'shelf_capacity_bonus'));
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
          member.checkoutServiceRemaining = Math.max(0, (member.checkoutServiceRemaining ?? 0) - dt * (1 + getSkillModifier(this.skills, 'staff_speed')));
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

    const wageDiscount = getSkillModifier(this.skills, 'wage_discount');
    const dueStaff = this.staff
      .filter((member) => member.hiredOnDay <= day)
      .map((member) => ({
        ...member,
        dailyWage: wageDiscount > 0 ? Math.round(member.dailyWage * (1 - wageDiscount)) : member.dailyWage,
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
    record.netProfit = record.grossProfit - record.spoilageCost - record.wagesPaid - (record.maintenanceCost ?? 0) - (record.theftCost ?? 0) + (record.theftRecovered ?? 0) - (record.counterfeitLoss ?? 0) - (record.badDebtCost ?? 0);
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
      maintenanceCost: 0,
      theftCost: 0,
      theftRecovered: 0,
      counterfeitLoss: 0,
      badDebtCost: 0,
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
    rec.netProfit = rec.grossProfit - rec.spoilageCost - rec.wagesPaid - (rec.maintenanceCost ?? 0) - (rec.theftCost ?? 0) + (rec.theftRecovered ?? 0) - (rec.counterfeitLoss ?? 0) - (rec.badDebtCost ?? 0);

    // Thuế 1% khoán hộ cá thể: chỉ tính khi đóng ngày hiện tại
    if (day === this.clock.getTime().day) {
      const annual = summarizeAnnualRevenue(this.dailyRecords, day, this.currentDayRecord);
      if (annual.taxActive) {
        const tax = calculateDailyTax(rec.revenue, true);
        rec.taxPaid = (rec.taxPaid ?? 0) + tax;
        rec.netProfit -= tax;
        this.playerData.money -= tax;
        this.recordLedger({ day, type: 'tax', amount: tax, description: `Thuế khoán 1% (doanh thu ${rec.revenue.toLocaleString('vi-VN')} VND)` });
        if (annual.progress < 1 && annual.progress + (tax / annual.revenue) >= 1) {
          this.callbacks.onToast?.('📊 Đã vượt ngưỡng 100 triệu VND/năm — áp dụng thuế khoán 1% (VAT+TNCN gộp).', 'warn');
        }
      }
    }

    rec.productSales = { ...(rec.productSales ?? this.currentDayRecord.productSales ?? {}) };
    this.dailyRecords[day] = rec;
    this.closedDayIds.add(day);
    const priced = new Set<string>(Object.keys(rec.productSales ?? {}));
    for (const fixture of this.fixtures) if (isSalesFixture(fixture) && fixture.assignedProductId) priced.add(fixture.assignedProductId);
    for (const productId of priced) if (PRODUCT_MAP[productId]) appendPricePoint(this.priceHistory, productId, day, this.sellingPrice(productId));
    pruneHeatmap(this.heatmap, day);
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
   * Thông tin lập kế hoạch từng món (tồn, nhu cầu dự kiến hôm nay/ngày mai, xu hướng, lý do, khuyến nghị, cờ).
   * Chỉ đọc: không đặt hàng, không đổi giá hay kho. Tính theo yêu cầu, không mỗi khung hình.
   */
  public getProductPlans(supplierId: string = DEFAULT_SUPPLIER_ID): ProductPlan[] {
    const time = this.clock.getTime();
    const day = time.day;
    const priceFactor = (productId: string) => demandPriceFactor(priceRatio(this.sellingPrice(productId), this.referencePrice(productId)));
    const tableFor = (target: number) => buildDemandTable({ ctx: buildMarketContext(this.market, target, 12), products: ALL_PRODUCTS, reputation: this.playerData.reputation, priceFactor });
    const quotes = this.getSupplierQuotes(supplierId);
    const expiring = new Map(this.getExpiringStock().map((item) => [item.productId, item]));
    const inputs: ProductPlanInput[] = ALL_PRODUCTS.filter((product) => product.unlockLevel <= this.playerData.level).map((product) => {
      const v7 = calculateSalesVelocity(product.id, this.dailyRecords, this.currentDayRecord, 7);
      const v3 = calculateSalesVelocity(product.id, this.dailyRecords, this.currentDayRecord, 3);
      const recent = calculateSalesVelocity(product.id, this.dailyRecords, this.currentDayRecord, FORECAST_RULES.slowSellDays);
      const soon = expiring.get(product.id);
      const quote = quotes.quotes[product.id];
      return {
        product,
        stock: getUsableStock(product.id, day, this.fixtures, this.inventory, this.holdingArea),
        incoming: getIncomingOrdersCount(product.id, this.pendingOrders),
        soldRecently: recent.totalSold,
        velocity: Math.max(v7.velocity, v3.velocity),
        hadSales: v7.totalSold > 0 || (this.currentDayRecord.productSales?.[product.id] ?? 0) > 0,
        expiring: soon ? { quantity: soon.quantity, earliestDay: day + soon.daysLeft } : undefined,
        supplierStock: quote?.stockLeft,
        supplierUnavailable: quote?.unavailable,
        unitPrice: quote?.unitPrice ?? product.purchasePrice,
      };
    });
    return buildProductPlans(inputs, {
      today: tableFor(day),
      tomorrow: tableFor(day + 1),
      leadDays: Math.max(1, quotes.deliveryDay - day),
      budget: this.playerData.money,
      coldFree: Math.max(0, COLD_WAREHOUSE_CAPACITY - this.reservedColdWarehouseCount()),
    });
  }

  /** Món đang được ưa chuộng: nhu cầu hiệu dụng hôm nay cao nhất, ưu tiên món có tồn hoặc nhập được. */
  public getTrendingProducts(): Array<{ productId: string; multiplier: number; reasons: string[]; available: boolean }> {
    const table = this.refreshDemandTable();
    const plans = new Map(this.getProductPlans().map((plan) => [plan.productId, plan]));
    return [...plans.keys()]
      .map((productId) => {
        const info = table.perProduct[productId];
        const plan = plans.get(productId)!;
        return { productId, multiplier: info.multiplier, demand: info.demand, reasons: plan.reasons, available: plan.stock > 0 || plan.recommended > 0 };
      })
      .filter((item) => item.multiplier > 1.05)
      .sort((a, b) => Number(b.available) - Number(a.available) || b.demand - a.demand)
      .slice(0, FORECAST_RULES.trendingShown)
      .map(({ productId, multiplier, reasons, available }) => ({ productId, multiplier, reasons, available }));
  }

  /**
   * Generate intelligent restock suggestions based on sales velocity and store state.
   */
  public suggestRestock(supplierId?: string, budget?: number): RestockSuggestionResult {
    const expected = new Map(this.getProductPlans(supplierId ?? DEFAULT_SUPPLIER_ID).map((plan) => [plan.productId, plan.expectedTomorrow]));
    return generateRestockSuggestions({
      supplierId,
      playerLevel: this.playerData.level,
      playerMoney: this.playerData.money,
      currentDay: this.clock.getTime().day,
      fixtures: this.fixtures,
      shelfCapacityBonus: getSkillModifier(this.skills, 'shelf_capacity_bonus'),
      inventory: this.inventory,
      holdingArea: this.holdingArea,
      pendingOrders: this.pendingOrders,
      dailyRecords: this.dailyRecords,
      currentDayRecord: this.currentDayRecord,
      coldWarehouseCount: this.getColdWarehouseCount(),
      budget,
      unitPriceOf: supplierId ? (productId: string) => this.wholesaleUnitPrice(supplierId, productId) : undefined,
      expectedDailyOf: (productId: string) => expected.get(productId),
      demandMultiplierOf: (productId: string) => this.refreshDemandTable().perProduct[productId]?.multiplier ?? 1.0,
    });
  }

  public getMorningBrief(): MorningBrief {
    const day = this.clock.getTime().day;
    const season = this.getSeason();
    const weather = this.getMarketSummary().weather;
    const tomorrow = this.getMarketSummary().forecast[0];
    const forecastTomorrow = tomorrow ? tomorrow.rain ? `${tomorrow.label} (${describeRainForecast(tomorrow.rain)})` : tomorrow.label : undefined;
    const arrivingOrders = this.pendingOrders.filter((o) => !o.delivered && o.arrivalDay <= day);
    const lowStockItems = this.fixtures
      .filter((f) => isSalesFixture(f) && f.assignedProductId && f.currentStock <= 2)
      .map((f) => f.assignedProductId!);
    return buildMorningBrief({
      day,
      season: { name: season?.name ?? 'Ngày thường' },
      seasonDaysLeft: seasonDaysLeft(day),
      weather,
      forecastTomorrow,
      arrivingOrders,
      lowStockItems,
    });
  }

  /** Đưa bộ đếm ID về mức không trùng với save: lấy giá trị đã lưu hoặc số lớn nhất trong ID dạng `ord-N`/`led-N` đang có (ID cũ dùng giờ thật không khớp mẫu nên bị bỏ qua). */
  private hydrateIdSequences(save: Pick<SaveGameData, 'orderSequence' | 'ledgerSequence'>): void {
    const maxSuffix = (ids: Iterable<string>, prefix: string) => {
      let max = 0;
      const pattern = new RegExp('^' + prefix + '-([0-9]+)$');
      for (const id of ids) {
        const match = pattern.exec(id);
        if (match) max = Math.max(max, Number(match[1]));
      }
      return max;
    };
    this.orderSequence = Math.max(save.orderSequence ?? 0, maxSuffix(this.pendingOrders.map((o) => o.id), 'ord'));
    this.ledgerSequence = Math.max(save.ledgerSequence ?? 0, maxSuffix(this.ledger.map((e) => e.id), 'led'));
  }

  private recordLedger(entry: Omit<LedgerEntry, 'id' | 'timestamp'>): LedgerEntry {
    const fullEntry: LedgerEntry = {
      ...entry,
      id: `led-${++this.ledgerSequence}`,
      timestamp: new Date().toISOString(),
    };
    this.ledger.push(fullEntry);
    return fullEntry;
  }

  private awardSkillTip(saleAmount: number): void {
    const tip = Math.round(saleAmount * getSkillModifier(this.skills, 'tip_bonus'));
    if (tip <= 0) return;
    const day = this.clock.getTime().day;
    this.playerData.money += tip;
    this.statistics.totalRevenue += tip;
    this.currentDayRecord.revenue += tip;
    this.currentDayRecord.grossProfit = this.currentDayRecord.revenue - this.currentDayRecord.cogs;
    this.currentDayRecord.netProfit = this.currentDayRecord.grossProfit - this.currentDayRecord.spoilageCost - this.currentDayRecord.wagesPaid - (this.currentDayRecord.maintenanceCost ?? 0) - (this.currentDayRecord.theftCost ?? 0) + (this.currentDayRecord.theftRecovered ?? 0) - (this.currentDayRecord.counterfeitLoss ?? 0) - (this.currentDayRecord.badDebtCost ?? 0);
    this.recordLedger({ day, type: 'sale', amount: tip, cogs: 0, quantity: 0, description: 'Tiền boa từ kỹ năng bán hàng' });
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

  /**
   * NPC chủ tiệm đứng sau quầy. Khi có khách đã tới quầy và có giỏ hàng (chưa có nhân viên thu ngân
   * nhận), chủ tiệm chuyển sang "serving" cho tới khi giao dịch hoàn tất.
   */
  public getShopkeeper(): { position: Vector2D; direction: 'down' | 'right'; serving: boolean; checkoutId?: string } {
    const waiting = this.customerManager.getCustomers().find(customer =>
      customer.stage === 'checkout' && (customer.basket?.length ?? 0) > 0 && !customer.cashierStaffId);
    return {
      position: { ...SHOPKEEPER_POSITION },
      direction: waiting ? 'right' : 'down',
      serving: !!waiting,
      checkoutId: waiting?.checkoutId,
    };
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
    this.fixtures = syncSlotChildren(this.fixtures);
    this.storedFixtures = syncSlotChildren(this.storedFixtures);
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

    if (spoiled > 0) this.recordSpoilageLoss(day, spoiled, spoilageCost, `Hàng hết hạn hủy bỏ (${spoiled} sản phẩm)`);

    return spoiled;
  }

  /** Ghi một khoản hỏng vào bản ghi ngày và sổ cái (dùng chung cho hết hạn, khách phát hiện, tiêu hủy thủ công). */
  private recordSpoilageLoss(day: number, quantity: number, cost: number, description: string): void {
    this.currentDayRecord.spoilageCount += quantity;
    this.currentDayRecord.spoilageCost += cost;
    this.currentDayRecord.netProfit = this.currentDayRecord.grossProfit - this.currentDayRecord.spoilageCost - this.currentDayRecord.wagesPaid - (this.currentDayRecord.maintenanceCost ?? 0) - (this.currentDayRecord.theftCost ?? 0) + (this.currentDayRecord.theftRecovered ?? 0) - (this.currentDayRecord.counterfeitLoss ?? 0) - (this.currentDayRecord.badDebtCost ?? 0);
    this.recordLedger({ day, type: 'spoilage', amount: cost, quantity, description });
  }

  /**
   * Hao hạn dùng của `day` (ngày vừa kết thúc) theo điều kiện bảo quản: tủ mát có điện 1 ngày/ngày,
   * mất điện/nóng nhanh hơn. Chỉ gọi khi qua ngày; không đổi hàng không có hạn.
   */
  private decayStock(day: number): void {
    if (day < 1) return;
    const ctx = buildMarketContext(this.market, day, 12);
    const rateOf = (productId: string | undefined) => {
      const product = productId ? PRODUCT_MAP[productId] : undefined;
      if (!product) return 1;
      const rate = spoilageRate(ctx, product);
      return 1 + (rate - 1) * (1 - getSkillModifier(this.skills, 'spoilage_reduction'));
    };
    for (const item of this.inventory) {
      const rate = rateOf(item.productId);
      for (const lot of item.lots ?? []) decayLot(lot, rate);
      item.lots?.sort((a, b) => a.expiresOnDay - b.expiresOnDay);
    }
    for (const fixture of this.fixtures) {
      const rate = rateOf(fixture.assignedProductId) + coldBreakExtraDecay(fixture);
      for (const lot of fixture.stockLots ?? []) decayLot(lot, rate);
      fixture.stockLots?.sort((a, b) => a.expiresOnDay - b.expiresOnDay);
    }
    for (const held of this.holdingArea) decayLot(held, rateOf(held.productId));
  }

  /** Hàng còn tối đa `withinDays` ngày là hết hạn (kho, kệ, khu chờ), gộp theo sản phẩm, gần hạn nhất trước. */
  public getExpiringStock(withinDays: number = SPOILAGE_RULES.expiringSoonDays): Array<{ productId: string; quantity: number; daysLeft: number }> {
    const day = this.clock.getTime().day;
    const soonest = new Map<string, { quantity: number; daysLeft: number }>();
    const add = (productId: string, quantity: number, expiresOnDay: number) => {
      const daysLeft = expiresOnDay - day;
      if (daysLeft > withinDays || daysLeft < 0) return;
      const entry = soonest.get(productId) ?? { quantity: 0, daysLeft };
      entry.quantity += quantity;
      entry.daysLeft = Math.min(entry.daysLeft, daysLeft);
      soonest.set(productId, entry);
    };
    for (const item of this.inventory) for (const lot of item.lots ?? []) add(item.productId, lot.quantity, lot.expiresOnDay);
    for (const fixture of this.fixtures) if (fixture.assignedProductId) for (const lot of fixture.stockLots ?? []) add(fixture.assignedProductId, lot.quantity, lot.expiresOnDay);
    for (const held of this.holdingArea) add(held.productId, held.quantity, held.expiresOnDay);
    return [...soonest.entries()].map(([productId, value]) => ({ productId, ...value })).sort((a, b) => a.daysLeft - b.daysLeft);
  }

  /**
   * Tiêu hủy thủ công tối đa `quantity` đơn vị của một sản phẩm, gần hạn nhất trước (kho, khu chờ, rồi kệ).
   * Mỗi đơn vị chỉ bị hủy và ghi sổ một lần; gọi lại khi đã hết hàng thì không ghi gì.
   */
  public disposeStock(productId: string, quantity: number): { success: boolean; disposed: number; cost: number } {
    const product = PRODUCT_MAP[productId];
    if (!product || !Number.isSafeInteger(quantity) || quantity <= 0) return { success: false, disposed: 0, cost: 0 };
    const day = this.clock.getTime().day;
    let remaining = quantity;
    let cost = 0;
    const takeFrom = (lots: StockLot[]) => {
      if (remaining <= 0 || !lots.length) return;
      const taken = takeLots(lots, remaining);
      remaining -= sumLots(taken);
      for (const lot of taken) cost += lot.quantity * (lot.unitCost ?? product.purchasePrice);
    };
    const slot = this.inventory.find((item) => item.productId === productId);
    if (slot?.lots) {
      takeFrom(slot.lots);
      slot.quantity = sumLots(slot.lots);
      if (slot.quantity === 0) this.inventory = this.inventory.filter((item) => item !== slot);
    }
    const holds = this.holdingArea.filter((item) => item.productId === productId).sort((a, b) => a.expiresOnDay - b.expiresOnDay);
    for (const held of holds) {
      if (remaining <= 0) break;
      const count = Math.min(remaining, held.quantity);
      held.quantity -= count;
      remaining -= count;
      cost += count * (held.unitCost ?? product.purchasePrice);
    }
    this.holdingArea = this.holdingArea.filter((item) => item.quantity > 0);
    for (const fixture of this.fixtures) {
      if (fixture.assignedProductId !== productId || !fixture.stockLots?.length) continue;
      takeFrom(fixture.stockLots);
      fixture.currentStock = sumLots(fixture.stockLots);
      if (fixture.currentStock === 0) fixture.assignedProductId = undefined;
    }
    const disposed = quantity - remaining;
    if (disposed <= 0) return { success: false, disposed: 0, cost: 0 };
    this.statistics.totalSpoiled = (this.statistics.totalSpoiled ?? 0) + disposed;
    this.recordSpoilageLoss(day, disposed, cost, `Tiêu hủy thủ công ${product.name} (${disposed})`);
    this.notifyStateChanged();
    return { success: true, disposed, cost };
  }

  /** Lô quá hạn mà khách lấy phải trên kệ đã bị hủy: ghi sổ hỏng, trừ uy tín theo cấu hình. */
  private handleExpiredOnShelf(productId: string, quantity: number, cost: number): void {
    const day = this.clock.getTime().day;
    this.statistics.totalSpoiled = (this.statistics.totalSpoiled ?? 0) + quantity;
    this.recordSpoilageLoss(day, quantity, cost, `Khách phát hiện hàng quá hạn trên kệ: ${PRODUCT_MAP[productId]?.name ?? productId} (${quantity})`);
    this.playerData.reputation = Math.max(0, this.playerData.reputation - SPOILAGE_RULES.expiredOnShelfReputationLoss);
    this.callbacks.onStockExpired?.(quantity);
    this.notifyStateChanged();
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
    // Khách và nhân viên chạy theo thời gian game: 2× đồng hồ thì họ cũng hoạt động nhanh gấp đôi (người chơi vẫn đi bộ bình thường).
    const worldDt = dt * Math.max(0.25, (this.clock.getTime().timeScale || 60) / 60);
      this.customerManager.update(
      worldDt,
      this.clock.getTime().isStoreOpen,
      this.clock.getTime().day,
      this.tileMap,
      this.fixtures,
      this.inventory,
      () => {}, // Customer satisfaction now records a reasoned 1–5 rating below.
      (spoiled) => {
        this.statistics.totalSpoiled = (this.statistics.totalSpoiled ?? 0) + spoiled;
        this.callbacks.onStockExpired?.(spoiled);
        this.notifyStateChanged();
      },
      () => {
        this.currentDayRecord.outOfStockWalkouts = (this.currentDayRecord.outOfStockWalkouts ?? 0) + 1;
      },
      this.customerPricing(),
      (productId, quantity, cost) => this.handleExpiredOnShelf(productId, quantity, cost),
      (customer, reason) => {
        if (reason === 'price') this.currentDayRecord.priceWalkouts = (this.currentDayRecord.priceWalkouts ?? 0) + 1;
        if (reason === 'out_of_stock') this.currentDayRecord.outOfStockWalkouts = (this.currentDayRecord.outOfStockWalkouts ?? 0) + 1;
        this.recordCustomerRating(customer, reason);
        if (customer.regularId) {
          const regDef = REGULAR_CUSTOMERS_MAP[customer.regularId];
          if (regDef) {
            this.regulars[customer.regularId] = processRegularWalkout(regDef, this.regulars[customer.regularId], this.clock.getTime().day);
          }
        }
        this.notifyStateChanged();
      },
      1 + getSkillModifier(this.skills, 'shelf_capacity_bonus'),
      (departingCustomer) => {
        if (departingCustomer.vehicleSpot && (departingCustomer.arrivalMode === 'motorbike' || departingCustomer.arrivalMode === 'car')) {
          this.streetTraffic.addDepartingVehicle(
            departingCustomer.vehicleSpot,
            departingCustomer.arrivalMode === 'car' ? 'car' : 'motorbike',
            departingCustomer.vehicleVariant ?? 0
          );
        }
      },
      (diningCustomer) => {
        if (diningCustomer.diningTableId) {
          this.diningDirtyTableIds.add(diningCustomer.diningTableId);
          this.callbacks.onToast?.('Khách đã dùng xong bàn. Cần dọn trước lượt tiếp theo.', 'info');
          this.notifyStateChanged();
        }
      }
    );
    const demandTable = this.refreshDemandTable();
    const availability = availabilityFactor(demandTable, this.fixtures.filter(isSalesFixture).map(shelf => ({
      productId: shelf.assignedProductId ?? this.planogram[shelf.id],
      inStock: shelf.currentStock > 0 && !shelf.broken,
    })));
    const inStoreRegularIds = this.customerManager.getCustomers().map(c => c.regularId).filter((id): id is string => Boolean(id));
    const regularCandidate = pickAvailableRegular(this.clock.getTime().day, this.market.seed, inStoreRegularIds, this.regulars);
    const spawned = this.customerManager.maybeSpawnCustomer(
      worldDt,
      this.clock.getTime().isStoreOpen,
      this.fixtures,
      this.tileMap,
      this.clock.getTime().day,
      this.statistics.totalCustomersServed,
      {
        traffic: trafficAtLevel(effectiveTraffic(demandTable, availability) * reputationTrafficMultiplier(this.playerData.ratings) * this.getDecorAttraction().trafficMultiplier * (1 + getSkillModifier(this.skills, 'traffic_boost')) * prestigeTrafficMultiplier(this.playerData.prestigeStars ?? 0), this.playerData.level),
        maxConcurrentCustomers: maxActiveCustomersForLevel(this.playerData.level),
        weightOf: (productId) => demandTable.perProduct[productId]?.demand ?? 0.01,
      },
      regularCandidate,
      this.getRainIntensity(),
      this.hasSecurityGuardOnShift(),
      { hour: this.clock.getTime().hour, weekday: weekdayOf(this.clock.getTime().day) }
    );
    if (spawned?.id && rollShoplifter(this.clock.getTime().day, spawned.id, this.playerData.level, !!spawned.regularId)) spawned.thief = true;

    this.streetTraffic.update(worldDt, this.clock.getTime().hour, this.getRainIntensity(), this.clock.getTime().day * 1337);
    this.logisticsManager.update(worldDt, this.clock.getTime().hour);

    this.recordHeatmap();
    this.updateStaffWorkers(worldDt);
    this.updateProduction(worldDt);
    this.updateCashierWorkers(worldDt);

    // Auto checkout for customer waiting at counter if checkoutWait timer reaches 0
    for (const waiting of this.customerManager.getCustomers()) {
      if (waiting.stage === 'checkout' && waiting.checkoutWait <= 0 && waiting.checkoutId) this.completeCustomerCheckout(waiting.checkoutId);
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
      if (fix.parentId || fix.type === 'decor') continue;
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
    if (fixture.broken) return { success: false, actualQuantity: 0, reason: 'fixture_broken' };
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
    if (slotCategoryConflict(this.fixtures, fixture, productId)) {
      return { success: false, actualQuantity: 0, reason: 'product_mismatch' };
    }

    const effectiveCapacity = effectiveShelfCapacity(fixture.maxCapacity, product.shelfCapacity, getSkillModifier(this.skills, 'shelf_capacity_bonus'));
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
    if (PRODUCT_MAP[fixture.assignedProductId]?.storageType === 'cold') {
      if (this.reservedColdWarehouseCount() + actualAmount > COLD_WAREHOUSE_CAPACITY) {
        return { success: false, actualQuantity: 0, reason: 'cold_storage_full' };
      }
    } else {
      const ambientFree = Math.max(0, totalWarehouseCells({ warehouseTier: this.warehouseTier, storageRackCount: this.storageRackCount }) - this.getAmbientWarehouseCount());
      if (this.getAmbientWarehouseCount() + actualAmount > totalWarehouseCells({ warehouseTier: this.warehouseTier, storageRackCount: this.storageRackCount })) {
        return { success: false, actualQuantity: 0, reason: 'ambient_storage_full' };
      }
    }
    const moved = takeLots(fixture.stockLots!, actualAmount);
    fixture.currentStock = sumLots(fixture.stockLots!);

    const slot = this.inventory.find((i) => i.productId === fixture.assignedProductId);
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
    if (fix.broken) return { fixtureId, productId, applied: false, actualQuantity: 0, reason: 'fixture_broken' };
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
    if (slotCategoryConflict(this.fixtures, fix, productId)) {
      return { fixtureId, productId, applied: false, actualQuantity: 0, reason: 'product_mismatch' };
    }

    // If shelf is empty, assign product
    if (fix.currentStock === 0) {
      fix.assignedProductId = productId;
    }

      const effectiveCap = effectiveShelfCapacity(fix.maxCapacity, prod.shelfCapacity, getSkillModifier(this.skills, 'shelf_capacity_bonus'));
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
   * Tự động gán sản phẩm phù hợp và châm đầy kệ (smart auto-fill).
   * - Kệ đã gán sản phẩm và còn hàng: chỉ châm thêm từ kho.
   * - Kệ trống hoặc hết hàng và chưa gán: tìm sản phẩm phù hợp từ kho (đúng loại nóng/lạnh),
   *   ưu tiên sản phẩm chưa có trên kệ nào, sau đó theo tồn kho nhiều nhất, rồi gán và châm đầy.
   * Logic tham khảo từ tap-hoa-dau-hem/autorestock.js (assignSlot + refillSlot).
   */
  public autoFillShelf(fixtureId: string): { assigned: boolean; productId: string | null; filled: number; reason: string } {
    const fix = this.fixtures.find((f) => f.id === fixtureId);
    if (!fix || !isSalesFixture(fix)) return { assigned: false, productId: null, filled: 0, reason: 'not_found' };
    if (fix.broken) return { assigned: false, productId: null, filled: 0, reason: 'broken' };

    const isColdFixture = fix.type === 'refrigerator';

    // Kệ đã có sản phẩm và còn hàng → chỉ châm thêm
    if (fix.assignedProductId && fix.currentStock > 0) {
      const res = this.transferToShelf(fixtureId, fix.assignedProductId, 999);
      return {
        assigned: false,
        productId: fix.assignedProductId,
        filled: res.actualQuantity,
        reason: res.success ? 'refilled' : (res.reason ?? 'no_inventory'),
      };
    }

    // Kệ trống / chưa gán → tìm sản phẩm tốt nhất từ kho
    // Các sản phẩm đang được bày ở kệ khác (ưu tiên thấp hơn để tránh trùng)
    const alreadyOnShelf = new Set(
      this.fixtures
        .filter((f) => isSalesFixture(f) && (f as typeof fix).assignedProductId && f.id !== fixtureId)
        .map((f) => (f as typeof fix).assignedProductId as string)
    );

    const candidates = this.inventory
      .filter((inv) => {
        if (inv.quantity <= 0) return false;
        const prod = PRODUCT_MAP[inv.productId];
        if (!prod) return false;
        // Đúng loại kệ (lạnh/thường)
        const needsCold = prod.storageType === 'cold';
        if (needsCold !== isColdFixture) return false;
        return true;
      })
      .sort((a, b) => {
        // Ưu tiên 1: sản phẩm chưa có trên kệ nào (mới)
        const aNew = alreadyOnShelf.has(a.productId) ? 0 : 1;
        const bNew = alreadyOnShelf.has(b.productId) ? 0 : 1;
        if (aNew !== bNew) return bNew - aNew;
        // Ưu tiên 2: tồn kho nhiều nhất
        return b.quantity - a.quantity;
      });

    if (candidates.length === 0) {
      return { assigned: false, productId: null, filled: 0, reason: 'no_compatible_inventory' };
    }

    // Thử từng ứng viên
    for (const candidate of candidates) {
      if (slotCategoryConflict(this.fixtures, fix, candidate.productId)) continue;
      const res = this.transferToShelf(fixtureId, candidate.productId, 999);
      if (res.success && res.actualQuantity > 0) {
        // Cập nhật planogram để lần sau nhớ
        this.planogram[fixtureId] = candidate.productId;
        this.notifyStateChanged();
        return {
          assigned: true,
          productId: candidate.productId,
          filled: res.actualQuantity,
          reason: 'auto_assigned',
        };
      }
    }

    return { assigned: false, productId: null, filled: 0, reason: 'no_compatible_inventory' };
  }

  /**
   * Châm đầy toàn bộ kệ: kệ đã gán → châm thêm; kệ trống → tự tìm sản phẩm gán + châm.
   * Trả về tổng số đơn vị đã bày, số ô được gán mới, số ô bị bỏ qua.
   */
  public autoFillAllShelves(): { totalFilled: number; newAssignments: number; skipped: number } {
    let totalFilled = 0;
    let newAssignments = 0;
    let skipped = 0;
    for (const fix of this.fixtures) {
      if (!isSalesFixture(fix) || fix.broken) continue;
      const res = this.autoFillShelf(fix.id);
      if (res.filled > 0) totalFilled += res.filled;
      if (res.assigned) newAssignments++;
      if (res.filled === 0 && !res.assigned) skipped++;
    }
    return { totalFilled, newAssignments, skipped };
  }

  /**
   * Query candidate refill job targets for future employee automation (Task 5.3).
   */
  public getRestockJobTargets(): RestockJobTarget[] {
    const targets: RestockJobTarget[] = [];
    for (const [fixtureId, productId] of Object.entries(this.planogram)) {
      const fix = this.fixtures.find((f) => f.id === fixtureId);
      if (!fix || !isSalesFixture(fix) || fix.broken) continue;
      const prod = PRODUCT_MAP[productId];
      if (!prod) continue;
      // Shelf must not be blocked by another product with remaining stock
      if (fix.currentStock > 0 && fix.assignedProductId && fix.assignedProductId !== productId) continue;
      if (slotCategoryConflict(this.fixtures, fix, productId)) continue;

      const effectiveCap = effectiveShelfCapacity(fix.maxCapacity, prod.shelfCapacity, getSkillModifier(this.skills, 'shelf_capacity_bonus'));
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
    if (!member || member.diningTask || member.hiredOnDay > this.clock.getTime().day) return false;
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

    let listTotal = 0;
    let itemCount = 0;
    let coldItemCount = 0;
    const state = this.market.suppliers?.[supplierId];
    const qtyByProduct: Record<string, number> = {};
    const cartLines: SupplierCartLine[] = [];

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
      qtyByProduct[line.productId] = (qtyByProduct[line.productId] ?? 0) + line.quantity;
      const quote = supplier ? wholesaleQuote(supplier, product, state, line.quantity) : undefined;
      listTotal += (quote?.listPrice ?? product.purchasePrice) * line.quantity;
      cartLines.push({
        productId: line.productId,
        quantity: line.quantity,
        unitPrice: quote?.unit ?? product.purchasePrice,
        lineTotal: (quote?.unit ?? product.purchasePrice) * line.quantity,
        bulkDiscount: quote?.bulk ?? 0,
      });
      itemCount += line.quantity;
      if (product.storageType === 'cold') {
        coldItemCount += line.quantity;
      }
    }

    const subtotal = Math.round(listTotal);
    if (supplier && state) {
      for (const [productId, quantity] of Object.entries(qtyByProduct)) {
        const name = PRODUCT_MAP[productId].name;
        if (state.unavailable.includes(productId)) {
          reasons.push(`${name}: ${supplier.name} tạm ngừng cung`);
        } else if (supplier.stockPerProductPerDay !== undefined && quantity > (state.stockLeft[productId] ?? 0)) {
          reasons.push(`${name}: ${supplier.name} chỉ còn ${state.stockLeft[productId] ?? 0} hôm nay (cần ${quantity})`);
        }
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

    const ambientItemCount = itemCount - coldItemCount;
    if (ambientItemCount > 0) {
      const totalCells = totalWarehouseCells({ warehouseTier: this.warehouseTier, storageRackCount: this.storageRackCount });
      const usedAmbient = this.getAmbientWarehouseCount();
      if (usedAmbient + ambientItemCount > totalCells) {
        reasons.push(`Kho lạnh/ambient không đủ chỗ (cần thêm ${ambientItemCount}, còn ${Math.max(0, totalCells - usedAmbient)} chỗ)`);
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
      lines: cartLines,
      deliveryDay: supplier ? nextDeliveryDay(supplier, this.clock.getTime().day + supplier.delayDays) : undefined,
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

    const arrivalDay = nextDeliveryDay(supplier, this.clock.getTime().day + supplier.delayDays);
    const orderIds: string[] = [];
    const supplierState = this.market.suppliers?.[supplierId];

    for (const line of items) {
      const product = PRODUCT_MAP[line.productId]!;
      const unitCost = wholesaleQuote(supplier, product, supplierState, line.quantity).unit;
      if (supplierState && supplier.stockPerProductPerDay !== undefined) supplierState.stockLeft[line.productId] = Math.max(0, (supplierState.stockLeft[line.productId] ?? 0) - line.quantity);
      const orderId = `ord-${++this.orderSequence}`;
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

    if (arrivalDay <= this.clock.getTime().day) {
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

    this.logisticsManager.enqueueDelivery({
      type: 'supplier_delivery',
      products: arrived.map(o => ({ productId: o.productId, quantity: o.quantity })),
      supplierName: 'Nhà phân phối',
    });
    let deliveredCount = 0;
    for (const order of arrived) {
      order.delivered = true;
      order.deliveryDay = day;
      const product = PRODUCT_MAP[order.productId];
      const expiry = expiryDay(order.productId, day) + getSkillModifier(this.skills, 'fresh_extra_day');

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
    } else {
      const totalCells = totalWarehouseCells({ warehouseTier: this.warehouseTier, storageRackCount: this.storageRackCount });
      const freeAmbient = Math.max(0, totalCells - this.getAmbientWarehouseCount());
      if (freeAmbient <= 0) {
        return { success: false, stowedQuantity: 0, reason: 'ambient_warehouse_full' };
      }
      stowQty = Math.min(item.quantity, freeAmbient);
    }

    const slot = this.inventory.find((i) => i.productId === item.productId);
    const lot: StockLot = {
      quantity: stowQty,
      expiresOnDay: item.expiresOnDay,
      unitCost: item.unitCost,
      provenance: item.provenance ?? (item.unitCost !== undefined ? 'known' : 'estimated'),
      ...(item.decayCarry ? { decayCarry: item.decayCarry } : {}),
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
  public checkoutShelf(fixtureId?: string, checkoutId?: string): boolean {
    if (!this.clock.getTime().isStoreOpen) return false;
    const activeCustomer = checkoutId
      ? this.customerManager.getCustomers().find((c) => c.stage === 'checkout' && c.checkoutId === checkoutId) ?? null
      : this.customerManager.getActiveCustomer();
    if (!activeCustomer || activeCustomer.stage !== 'checkout') {
      return false;
    }
    return this.completeCustomerCheckout(activeCustomer.checkoutId ?? '', fixtureId ?? activeCustomer.targetFixtureId);
  }

  /** Complete one waiting customer's sale; receipt IDs make retries safe across save/reload. */
  public completeCustomerCheckout(checkoutId: string, fixtureId?: string, onCredit = false, dineIn = false): boolean {
    if (!checkoutId) return false;
    if (this.completedCheckoutIds.has(checkoutId)) return true;

    const customers = this.customerManager.getCustomers();
    const customer = customers.find((c) => c.checkoutId === checkoutId && c.stage === 'checkout');
    if (!customer) return false;

    if (fixtureId && customer.targetFixtureId && customer.targetFixtureId !== fixtureId) {
      return false;
    }

    if (onCredit && !customer.regularId) return false;
    if (onCredit) {
      const terms = this.getCustomerCreditTerms(customer.regularId!);
      const basketTotal = customer.basket?.length ? customer.basket.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0) : (customer.reservedProductId ? this.sellingPrice(customer.reservedProductId) : 0);
      if (!terms.eligible || basketTotal <= 0 || basketTotal > terms.available) return false;
    }

    const diningTableId = dineIn && this.isDineInBasketEligible(customer) ? this.availableDiningTableId() : undefined;
    if (dineIn && !diningTableId) return false;

    if (customer.thief && customer.basket && customer.basket.length > 0) return this.resolveShoplifter(customer, checkoutId);

    // Modern flow: Customer with basket
    if (customer.basket && customer.basket.length > 0) {
      this.customerManager.assignCashier(checkoutId, undefined);
      const res = this.customerManager.completeCheckout(checkoutId, this.completedCheckoutIds, this.tileMap, this.fixtures, diningTableId);
      if (!res.success) return false;
      this.recordCustomerRating(customer);

      const counterfeitLoss = onCredit ? 0 : this.counterfeitCashLoss(customer, checkoutId, res.paidTotal);
      if (!onCredit) this.playerData.money += res.paidTotal - counterfeitLoss;
      this.statistics.totalRevenue += res.paidTotal;
      this.statistics.totalCustomersServed += 1;
      this.addExperience(Math.round(5 * res.itemCount * saleExperienceMultiplier(this.playerData.level)));

      if (customer.regularId) {
        const regDef = REGULAR_CUSTOMERS_MAP[customer.regularId];
        if (regDef) {
          const basketPids = customer.basket.map((b) => b.productId);
          const currentDay = this.clock.getTime().day;
          const regRes = processRegularCheckout(regDef, this.regulars[customer.regularId], basketPids, currentDay);
          this.regulars[customer.regularId] = regRes.updatedProgress;
          if (regRes.tipBonusRatio > 0) {
            const regularTip = Math.round(res.paidTotal * regRes.tipBonusRatio);
            this.playerData.money += regularTip;
            this.callbacks.onToast?.(`${regDef.name} boa thêm ${regularTip.toLocaleString('vi-VN')} VND!`);
          }
          if (regRes.newlyUnlockedPerks.length > 0) {
            this.callbacks.onToast?.(`Khách quen ${regDef.name} mở đặc quyền: ${regRes.newlyUnlockedPerks.join(', ')}!`);
          }
        }
      }

      const cogs = res.cogs ?? 0;
      this.currentDayRecord.customersServed += 1;
      this.currentDayRecord.transactionsCount += 1;
      this.currentDayRecord.itemsSold += res.itemCount;
      this.currentDayRecord.revenue += res.paidTotal;
      this.currentDayRecord.cogs += cogs;
      this.currentDayRecord.grossProfit = this.currentDayRecord.revenue - this.currentDayRecord.cogs;
      this.currentDayRecord.netProfit = this.currentDayRecord.grossProfit - this.currentDayRecord.spoilageCost - this.currentDayRecord.wagesPaid - (this.currentDayRecord.maintenanceCost ?? 0) - (this.currentDayRecord.theftCost ?? 0) + (this.currentDayRecord.theftRecovered ?? 0) - (this.currentDayRecord.counterfeitLoss ?? 0) - (this.currentDayRecord.badDebtCost ?? 0);

      if (res.items) {
        for (const it of res.items) {
          this.recordProductSale(it.productId, it.quantity);
        }
      }

      let creditId: string | undefined;
      if (onCredit && customer.regularId) {
        creditId = `credit-${++this.customerCreditSequence}`;
        this.customerCredits.push({ id: creditId, regularId: customer.regularId, checkoutId, issuedDay: this.clock.getTime().day, dueDay: this.clock.getTime().day + 3, amount: res.paidTotal, balance: res.paidTotal, status: 'open' });
      }
      this.recordLedger({
        day: this.clock.getTime().day,
        type: onCredit ? 'credit_sale' : 'sale',
        amount: res.paidTotal,
        cogs,
        quantity: res.itemCount,
        description: `${onCredit ? `Bán chịu ${creditId}` : 'Bán lẻ'} cho khách hàng #${checkoutId} (${res.itemCount} món)`,
      });
      this.awardSkillTip(res.paidTotal);

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
      if (diningTableId) {
        this.customerManager.routeDinerToTable(checkoutId, diningTableId, this.tileMap, this.fixtures);
        this.customerManager.leaveAfterLegacySale(checkoutId, this.tileMap, this.fixtures, true);
      } else {
        this.customerManager.leaveAfterLegacySale(checkoutId, this.tileMap, this.fixtures);
      }

      const salePrice = this.sellingPrice(product.id);
      this.recordCustomerRating(customer, undefined, product.id);
      const counterfeitLoss = onCredit ? 0 : this.counterfeitCashLoss(customer, checkoutId, salePrice);
      if (!onCredit) this.playerData.money += salePrice - counterfeitLoss;
      this.statistics.totalRevenue += salePrice;
      this.statistics.totalCustomersServed += 1;
      this.addExperience(Math.round(5 * saleExperienceMultiplier(this.playerData.level)));

      const cogs = (taken[0]?.unitCost ?? product.purchasePrice) * 1;
      this.currentDayRecord.customersServed += 1;
      this.currentDayRecord.transactionsCount += 1;
      this.currentDayRecord.itemsSold += 1;
      this.currentDayRecord.revenue += salePrice;
      this.currentDayRecord.cogs += cogs;
      this.currentDayRecord.grossProfit = this.currentDayRecord.revenue - this.currentDayRecord.cogs;
      this.currentDayRecord.netProfit = this.currentDayRecord.grossProfit - this.currentDayRecord.spoilageCost - this.currentDayRecord.wagesPaid - (this.currentDayRecord.maintenanceCost ?? 0) - (this.currentDayRecord.theftCost ?? 0) + (this.currentDayRecord.theftRecovered ?? 0) - (this.currentDayRecord.counterfeitLoss ?? 0) - (this.currentDayRecord.badDebtCost ?? 0);
      this.recordProductSale(product.id, 1);

      let creditId: string | undefined;
      if (onCredit && customer.regularId) {
        creditId = `credit-${++this.customerCreditSequence}`;
        this.customerCredits.push({ id: creditId, regularId: customer.regularId, checkoutId, issuedDay: this.clock.getTime().day, dueDay: this.clock.getTime().day + 3, amount: salePrice, balance: salePrice, status: 'open' });
      }
      this.recordLedger({
        day: this.clock.getTime().day,
        type: onCredit ? 'credit_sale' : 'sale',
        amount: salePrice,
        cogs,
        quantity: 1,
        productId: product.id,
        description: `${onCredit ? `Bán chịu ${creditId}` : 'Bán lẻ'} cho khách hàng #${checkoutId} (${product.name})`,
      });
      this.awardSkillTip(salePrice);

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
    if (!Number.isFinite(xp) || xp <= 0) return;
    if (this.playerData.level >= MAX_PLAYER_LEVEL) {
      this.addPrestigeExperience(xp);
      return;
    }
    this.playerData.experience += xp;
    while (this.playerData.level < MAX_PLAYER_LEVEL && this.playerData.experience >= this.playerData.experienceToNextLevel) {
      this.playerData.experience -= this.playerData.experienceToNextLevel;
      this.playerData.level += 1;
      this.playerData.experienceToNextLevel = this.playerData.level >= MAX_PLAYER_LEVEL
        ? 0
        : xpToNextLevel(this.playerData.level);
      this.callbacks.onLevelUp?.(this.playerData.level);
    }
    if (this.playerData.level >= MAX_PLAYER_LEVEL) {
      const overflow = this.playerData.experience;
      this.playerData.experience = 0;
      this.addPrestigeExperience(overflow);
      return;
    }
    this.notifyStateChanged();
  }

  /** XP dư ở cấp tối đa đổi thành sao prestige theo ngưỡng cố định, tối đa PRESTIGE_MAX_STARS; không đặt lại cấp. */
  private addPrestigeExperience(xp: number): void {
    const stars = this.playerData.prestigeStars ?? 0;
    if (xp > 0 && stars < PRESTIGE_MAX_STARS) {
      const total = (this.playerData.prestigeXp ?? 0) + xp;
      const gained = Math.min(PRESTIGE_MAX_STARS - stars, Math.floor(total / PRESTIGE_XP_PER_STAR));
      this.playerData.prestigeStars = stars + gained;
      this.playerData.prestigeXp = this.playerData.prestigeStars >= PRESTIGE_MAX_STARS ? 0 : total - gained * PRESTIGE_XP_PER_STAR;
      if (gained > 0) this.callbacks.onToast?.(`Đạt ${this.playerData.prestigeStars}/${PRESTIGE_MAX_STARS} sao uy tín (prestige).`, 'success');
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
      schemaVersion: 4,
      revision: currentRevision + 1,
      createdAt: this.createdAt,
      updatedAt: new Date().toISOString(),
      player: { ...this.playerData },
      warehouseTier: this.warehouseTier,
      storageRackCount: this.storageRackCount,
      sellingPrices: { ...this.sellingPrices },
      worldTime: this.clock.getTime(),
      storeLayout: {
        widthTiles: (this.tileMap.storeBounds?.right ?? STORE_BOUNDS.right) - STORE_BOUNDS.left + 1,
        heightTiles: (this.tileMap.storeBounds?.bottom ?? STORE_BOUNDS.bottom) - STORE_BOUNDS.top + 1,
        fixtures: this.fixtures.map((f) => ({ ...f, stockLots: f.stockLots?.map((lot) => ({ ...lot })) })),
        storedFixtures: this.storedFixtures.map(f => ({ ...f, stockLots: f.stockLots?.map(lot => ({ ...lot })) })),
        unlockedPlotIds: [...this.unlockedPlotIds],
        decorOwned: [...this.decorOwned],
      },
      inventory: this.getInventory(),
      holdingArea: this.getHoldingArea(),
      planogram: this.getPlanogram(),
      staff: this.staff.map((s) => structuredClone(s)),
      staffSchedule: { ...this.staffSchedule },
      wageDebt: this.wageDebt,
      processedPayrollDayIds: [...this.processedPayrollDayIds],
      autoBuyEnabled: this.autoBuyEnabled,
      autoBuyRules: structuredClone(this.autoBuyRules),
      processedAutoBuyDayIds: [...this.processedAutoBuyDayIds],
      autoBuyReports: structuredClone(this.autoBuyReports),
      quests: normalizeQuestState(this.quests),
      stalls: normalizeStallState(this.stalls),
      market: structuredClone(this.market),
      pendingOrders: this.getPendingOrders(),
      orderSequence: this.orderSequence,
      ledgerSequence: this.ledgerSequence,
      customer: this.getCustomer() ?? undefined,
      customers: this.customerManager.getCustomers(),
      customerSpawnCooldown: this.customerManager.getSpawnCooldown(),
      customerSequence: this.customerManager.getCustomerSequence(),
      completedCheckoutIds: [...this.completedCheckoutIds],
      dailyRecords: structuredClone(this.dailyRecords),
      currentDayRecord: { ...this.currentDayRecord },
      ledger: this.ledger.map((e) => ({ ...e })),
      closedDayIds: [...this.closedDayIds],
      regulars: structuredClone(this.regulars),
      customerCredits: this.getCustomerCredits(),
      customerCreditSequence: this.customerCreditSequence,
      diningDirtyTableIds: [...this.diningDirtyTableIds],
      productionJobs: this.productionJobs.map(job => ({ ...job })),
      productionJobSequence: this.productionJobSequence,
      priceHistory: structuredClone(this.priceHistory),
      heatmap: structuredClone(this.heatmap),
      reviews: this.reviews.map(review => ({ ...review })),
      security: { ...this.security, incidents: this.security.incidents.map(i => ({ ...i })), policeCases: this.security.policeCases.map(c => ({ ...c })) },
      partyOrders: structuredClone(this.partyOrders),
      goals: structuredClone(this.goals),
      skills: structuredClone(this.skills),
      statistics: { ...this.statistics },
    };
  }

  /**
   * Import saved game data
   */
  public importSaveData(saveData: SaveGameData): void {
    this.restockJobClaims.clear();
    this.playerData = normalizePlayerProgression(saveData.player);
    this.warehouseTier = saveData.warehouseTier ?? 0;
    this.storageRackCount = saveData.storageRackCount ?? 0;
    this.sellingPrices = { ...(saveData.sellingPrices ?? {}) };
    this.fixtures = saveData.storeLayout.fixtures.map((f) => ({ ...f }));
    this.storedFixtures = (saveData.storeLayout.storedFixtures ?? []).map(f => ({ ...f }));
    this.unlockedPlotIds = [...(saveData.storeLayout.unlockedPlotIds ?? [])];
    this.decorOwned = [...(saveData.storeLayout.decorOwned ?? [])];
    this.inventory = saveData.inventory.map((i) => ({ ...i }));
    this.holdingArea = (saveData.holdingArea ?? []).map((h) => ({ ...h }));
    this.planogram = saveData.planogram ? { ...saveData.planogram } : {};
    this.staff = (saveData.staff ?? []).map((s) => ({
      ...structuredClone(s),
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
    this.market = normalizeMarketState(saveData.market, this.market.seed, saveData.worldTime.day);
    this.ensureSupplierMarket(saveData.worldTime.day);
    this.demandTable = undefined;
    this.pendingOrders = (saveData.pendingOrders ?? []).map((order) => ({
      ...order,
      supplierId: order.supplierId ?? DEFAULT_SUPPLIER_ID,
      delivered: order.delivered ?? false,
    }));
    this.completedCheckoutIds = new Set(saveData.completedCheckoutIds ?? []);
    this.dailyRecords = saveData.dailyRecords ? structuredClone(saveData.dailyRecords) : {};
    this.closedDayIds = new Set(saveData.closedDayIds ?? []);
    this.regulars = saveData.regulars ? structuredClone(saveData.regulars) : {};
    this.customerCredits = (saveData.customerCredits ?? []).filter(c => c && typeof c.id === 'string' && typeof c.regularId === 'string' && Number.isFinite(c.balance) && c.balance >= 0).map(c => ({ ...c }));
    this.customerCreditSequence = Math.max(saveData.customerCreditSequence ?? 0, ...this.customerCredits.map(c => Number(c.id.match(/^credit-(\d+)$/)?.[1] ?? 0)));
    this.diningDirtyTableIds = new Set((saveData.diningDirtyTableIds ?? []).filter(id => typeof id === 'string'));
    this.productionJobs = sanitizeProductionJobs(saveData.productionJobs);
    this.priceHistory = sanitizePriceHistory(saveData.priceHistory);
    this.heatmap = sanitizeHeatmap(saveData.heatmap);
    this.heatmapLastTile.clear();
    this.productionJobSequence = Math.max(saveData.productionJobSequence ?? 0, ...this.productionJobs.map(job => Number(job.id.match(/^job-(\d+)$/)?.[1] ?? 0)));
    this.reviews = sanitizeReviews(saveData.reviews);
    this.security = sanitizeSecurity(saveData.security);
    this.partyOrders = saveData.partyOrders
      ? refreshAvailablePartyOrders(structuredClone(saveData.partyOrders), saveData.worldTime.day, this.playerData.level)
      : refreshAvailablePartyOrders(createInitialPartyOrderState(), saveData.worldTime.day, this.playerData.level);
    this.goals = saveData.goals ? structuredClone(saveData.goals) : createInitialGoalState();
    this.skills = saveData.skills ? structuredClone(saveData.skills) : createInitialSkillState();
    this.ledger = (saveData.ledger ?? []).map((e) => ({ ...e }));
    this.hydrateIdSequences(saveData);
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
    this.customerManager.restoreDiningRoutes(this.tileMap, this.fixtures);
    this.callbacks.onMapChanged?.(this.tileMap);
    this.ensureSafePlayerPosition();
    this.customerManager.rerouteAll(this.tileMap, this.fixtures);
    this.activeFixture = null;
    this.notifyStateChanged();
  }

  public getTitleContext(): TitleContext {
    return {
      level: this.playerData.level,
      totalRevenue: this.statistics.totalRevenue,
      totalCustomers: this.statistics.totalCustomersServed,
      daysPassed: this.statistics.totalDaysPassed,
      partyOrders: this.partyOrders.completedOrderIds.length,
      reputation: this.playerData.reputation,
    };
  }

  public getTitles(): Array<TitleDef & { unlocked: boolean; isActive: boolean }> {
    const ctx = this.getTitleContext();
    const unlocked = getUnlockedTitles(ctx, this.playerData.unlockedTitles);
    this.playerData.unlockedTitles = unlocked;
    return TITLES.map(title => ({
      ...title,
      unlocked: unlocked.includes(title.id),
      isActive: this.playerData.activeTitle === title.id,
    }));
  }

  public setActiveTitle(titleId?: string): { success: boolean; activeTitle?: string; reason?: string } {
    const ctx = this.getTitleContext();
    const unlocked = getUnlockedTitles(ctx, this.playerData.unlockedTitles);
    this.playerData.unlockedTitles = unlocked;
    const res = setActiveTitle(this.playerData, titleId, unlocked);
    if (res.success) {
      this.notifyStateChanged();
    }
    return res;
  }
}
