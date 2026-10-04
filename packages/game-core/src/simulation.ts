import { rainSpeedMultiplier } from './rain-protection';
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
  TaxState,
  BranchPolicy,
  ChainState,
  LedgerEntry,
  CashObligations,
  RestockSuggestionOptions,
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
  MAX_PLAYER_LEVEL,
  PRESTIGE_XP_PER_STAR,
  PRESTIGE_MAX_STARS,
  prestigeTrafficMultiplier,
  maxActiveCustomersForLevel,
  xpToNextLevel,
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
import { buildMarketSummary } from './market-summary';
import { pickAvailableRegular, processRegularCheckout, processRegularWalkout } from './regulars';
import { StreetTrafficManager } from './street-traffic';
import type { IntersectionSignals } from './traffic-signal';
import { StoreLogisticsManager } from './store-logistics';
import { CollisionSystem } from './collision';
import { appendRating, averageRating, ratingForVisit, reputationDeltaFromRating, reputationTrafficMultiplier, type CustomerFeedbackReason } from './reputation';
import { rainIntensityAt, describeRainForecast, roadWetnessAt, hashSeed } from './weather';
import { appendIncident, emptySecurityState, openPoliceCase, planBurglary, rollShoplifter, sanitizeSecurity, securityUnlocked, shopliftCaught, shopliftDetectChance } from './security';
import { assessCounterfeit } from './counterfeit';
import { ACTIVE_TAX_POLICY, summarizeAnnualRevenue, taxDueOnClose } from './tax/annual-revenue';
import { createChain, normalizeChain, openBranch as openBranchPure, returnStock as returnStockPure, setBranchPolicy as setBranchPolicyPure, switchBranch as switchBranchPure, transferStock as transferStockPure, type ChainContext, type TransferItem } from './chain';
import { runBranchDay } from './branch-ops';
import { applyAuditToState, emptyTaxState, normalizeTaxState, resolveAudit, shouldAudit, splitDeclared } from './tax/audit';
import { composeReview, sanitizeReviews, summarizeReviews, ReviewsManager } from './reviews';
import { listMaintenance, maintainFixture as applyMaintenance, wearOvernight, coldBreakExtraDecay, staffServiceTargets, MAINTENANCE_FAILURE_TEXT, type MaintenanceAction, type MaintenanceEntry, type MaintenanceNotice } from './maintenance';
import { decorAttraction, decorTrafficMultiplier } from './decor';
import { buyLandPlot, relocateMisplacedFixtures, upgradeFixtureSlots, validateStoreLayout, totalWarehouseCells, coldWarehouseCapacity, warehouseCellsFor, unitsFittingInCells, type LayoutResult } from './store-layout';
import { GameInputSource, vectorToDirection } from './input';
import { GameClock } from './clock';
import { expiryDay, looseUnits, mergeLots, normalizeLots, sumLots, takeLots } from './stock';
import { decayLot, spoilageRate, withBackupPower } from './spoilage';
import { findPathToAny, GridPoint, tileCenter } from './pathfinding';
import { normalizePlayerProgression, saleExperienceMultiplier, trafficAtLevel } from './progression';
import { CustomerManager } from './customers';
import { calculateSalesVelocity, generateRestockSuggestions, normalizeRestockOptions, getIncomingOrdersCount, getUsableStock } from './suggestions';
import { buildProductPlans, type ProductPlan, type ProductPlanInput } from './forecast';
import { advanceMarketState, assertMarketData, buildMarketContext, effectiveWeatherId, marketNoticesForDay, normalizeMarketState, NoticeThrottle, weekdayOf, type MarketNotice } from './market';
import { computeSupplierDay, nextDeliveryDay, wholesaleQuote } from './supplier-market';
import { validateSupplierCart as validateSupplierCartPure } from './supplier-cart';
import { receiveDeliveredOrders } from './delivery';
import { advancePriceIndex, clampSellingPrice, computePriceTargets, demandPriceFactor, keepChance, priceRatio, productSensitivity } from './price';
import { availabilityFactor, buildDemandTable, demandContextKey, effectiveTraffic, type DemandTable, type ProductDemand } from './demand';
import { emptyStallState, normalizeStallState, planStallDay, stallDemand } from './stalls';
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
import { setAwningOpen } from '@game/data';
import { BUILDINGS, DINING, DINING_ADD_ON_RULES, DRINK_SHOP_PRODUCT_IDS, RIVAL_EVENT_ID, fixtureBuilding, XOI_DISH_IDS } from '@game/data';
import { rollDiningAddOns, takeInventoryUnits } from './dining';
import { RECIPES, RECIPE_MAP, Recipe, SELLABLE_PRODUCTS } from '@game/data';
import { RestockClaimManager } from './restock-claims';
import { StorageManager } from './storage';
import { LedgerManager } from './ledger';
import { StaffManager } from './staff-manager';
import { DiningManager } from './dining-manager';
import { ProductionManager } from './production-manager';
import { SecurityManager } from './security-manager';
import { StallsMarketsManager } from './stalls-markets-manager';
import { QuestManager } from './quest-manager';
import { BUILDING_MAP, chilledDisplayAppeal, fridgeShelfLifeBonus, isChilledDisplayItem, refrigerationAccepts } from '@game/data';
import { DailyRoutineSystem, HOME_DOOR_TILE, type DailyRoutineState, type InventorySummary, type RoutineTickOutput } from './daily-routine';
import { CoopRoutineSystem, type CoopPlayerRoutineConfig, type CoopRoutineTickInput, type CoopRoutineTickOutput } from './coop-routine';

/** Thành phẩm của quầy xôi — import từ `@game/data` để tránh trùng lặp. */
import { beginChapter, claimChapter, createInitialStoryState, getStoryProgressList, normalizeStoryState, type StoryChapterProgress, type StoryContext } from './story';
import { aggregateHeatmap, appendPricePoint, pruneHeatmap, sanitizeHeatmap, sanitizePriceHistory } from './analytics';
import { addProductionOutput, consumeIngredients, missingIngredients, sanitizeProductionJobs } from './production';
import { LONG_TERM_GOALS, WEEKLY_QUESTS, PARTY_ORDER_MAP, TITLES, effectiveShelfCapacity, SECURITY_RULES } from '@game/data';
import { getUnlockedTitles, setActiveTitle, type TitleContext } from './titles';
import { getFixtureDimensions, syncSlotChildren, type TitleDef } from '@game/shared';

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
  /** Tự nhập hàng (sáng hoặc giữa ngày) vừa đặt đơn: để UI lưu/commit ngay (tiệm online gửi save lên máy chủ). */
  onAutoPurchase?: () => void;
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
  onInventorySummary?: (summary: InventorySummary) => void;
  onRoutineStateChanged?: (state: DailyRoutineState, previous: DailyRoutineState) => void;
  onToast?: (message: string, type?: 'info' | 'success' | 'warn') => void;
}
/** Giây game để một quầy tự thanh toán xử lý một khách. */
const SELF_CHECKOUT_SECONDS = 3;
/** Bảng khóa-theo-id không có prototype: khóa như 'constructor' không bao giờ trả về thuộc tính của Object. */
const dict = <T>(source?: Record<string, T>): Record<string, T> => Object.assign(Object.create(null), source) as Record<string, T>;

/**
 * Hệ số lưu lượng khách theo giờ mở cửa của cửa hàng:
 * 08:00–10:00: Khách trung bình (1.0)
 * 10:00–12:00: Khách tăng (1.25)
 * 12:00–14:00: Trung bình (1.0)
 * 14:00–17:00: Ổn định (1.05)
 * 17:00–20:00: CAO ĐIỂM (1.45)
 * 20:00–22:00: Giảm dần (0.75)
 */
export function hourlyStoreTrafficMultiplier(hour: number): number {
  if (hour >= 8 && hour < 10) return 1.0;
  if (hour >= 10 && hour < 12) return 1.25;
  if (hour >= 12 && hour < 14) return 1.0;
  if (hour >= 14 && hour < 17) return 1.05;
  if (hour >= 17 && hour < 20) return 1.45;
  if (hour >= 20 && hour < 22) return 0.75;
  return 1.0;
}

export interface StallRestockPlan {
  orders: { supplierId: string; items: { productId: string; quantity: number }[]; totalCost: number }[];
  totalCost: number;
  /** Tiền chi thêm so với nhu cầu 3 ngày do phải nâng cho đủ đơn tối thiểu (xấp xỉ). */
  paddedCost: number;
  /** Đã phải dùng sang quỹ lương/thuế chưa đến hạn. */
  usedReserve: boolean;
  /** Nguyên liệu chưa nhập đủ 3 ngày (thiếu tiền hoặc đại lý hết hàng); rỗng/thiếu = đã đủ. */
  missing?: string[];
}

export class GameSimulation {
  private playerData: PlayerData;
  private sellingPrices: Record<string, number> = dict();
  private fixtures: StoreFixture[];
  private storedFixtures: StoreFixture[];
  private unlockedPlotIds: string[];
  private decorOwned: string[];
  private inventory: InventoryItem[];
  private holdingArea: HoldingItem[];
  private planogram: Record<string, string> = dict();
  private staffManager: StaffManager;
  private restockJobClaims: RestockClaimManager;
  private autoBuyEnabled = false;
  private autoBuyStalls = false;
  /** Quầy mới nhập được một phần (thiếu tiền/hàng): thử mua nốt mỗi giờ trong ngày khi có đủ tiền. Không lưu save; sáng hôm sau auto-buy tính lại. */
  private stallShortfall = new Set<string>();
  private lastStallTopUpKey = '';
  private autoBuyRules: AutoBuyRule[] = [];
  /** Cài đặt gợi ý nhập hàng; undefined = chưa từng chỉnh (dùng mặc định / giá trị cũ ở trình duyệt). */
  private restockOptions?: RestockSuggestionOptions;
  private processedAutoBuyDayIds = new Set<number>();
  private autoBuyReports: Record<number, AutoBuyReport> = {};
  private pendingOrders: SupplierOrder[];
  private orderSequence = 0;
  private ledgerManager: LedgerManager;
  private questsManager: QuestManager;
  private stallsMarketsManager: StallsMarketsManager;
  private createdAt: string;
  private tileMap: GameTileMap;
  private collisionSystem: CollisionSystem;
  private clock: GameClock;
  private inputManager: GameInputSource;
  private customerManager: CustomerManager;
  private completedCheckoutIds: Set<string>;
  private selfCheckoutTimer = 0;
  private regulars: Record<string, RegularCustomerProgress> = dict();
  private customerCredits: CustomerCreditAccount[] = [];
  private customerCreditSequence = 0;
  private diningManager: DiningManager;
  private productionManager: ProductionManager;
  private productionJobSequence = 0;
  private taxState: TaxState = emptyTaxState();
  /** Chuỗi chi nhánh (`branch-chain`); rỗng = chuỗi một cơ sở. Ví chung = `playerData.money`, kho tổng = `inventory`. */
  private chainState: ChainState = createChain();
  private priceHistory: NonNullable<SaveGameData['priceHistory']> = {};
  private heatmap: NonNullable<SaveGameData['heatmap']> = {};
  /** Ô cuối cùng của từng khách, chỉ trong bộ nhớ, để đếm lượt vào ô thay vì mỗi khung hình. */
  private heatmapLastTile = new Map<string, string>();
  private reviewsManager: ReviewsManager;
  private securityManager: SecurityManager;
  private skills: SkillState;
  private streetTraffic = new StreetTrafficManager();
  private dailyRoutine: DailyRoutineSystem;
  private coopRoutine: CoopRoutineSystem | null = null;
  private coopMode = false;
  private routineEnabled = false;
  private trafficWarmed = false;
  private logisticsManager = new StoreLogisticsManager();
  private storageManager: StorageManager;

  /** Proxy đến staffManager cho staff list (đọc). */
  private get staff(): StaffMember[] { return this.staffManager.getStaffRef(); }

  /** Proxy đến staffManager cho staffSchedule (đọc). */
  private get staffSchedule(): Record<string, StaffShift> { return this.staffManager.getStaffScheduleRef(); }

  /** Proxy đến staffManager cho wageDebt (đọc/ghi). */
  private get wageDebt(): number { return this.staffManager.getWageDebtRef(); }
  private set wageDebt(val: number) { this.staffManager.setWageDebt(val); }

  /** Proxy đến staffManager cho processedPayrollDayIds (đọc/ghi). */
  private get processedPayrollDayIds(): Set<number> { return this.staffManager.getProcessedPayrollDayIdsRef(); }

  /** Proxy đến diningManager cho diningDirtyTableIds (đọc). */
  private get diningDirtyTableIds(): Set<string> { return this.diningManager.getRef(); }

  /** Proxy đến productionManager cho productionJobs (đọc). */
  private get productionJobs(): ProductionJob[] { return this.productionManager.getRef(); }
  private set productionJobs(val: ProductionJob[]) { this.productionManager.setJobs(val); }

  private warehouseTier: number;
  private storageRackCount: number;

  /** Proxy đến stallsMarketsManager cho stalls (đọc/ghi). */
  private get stalls(): StallState { return this.stallsMarketsManager.getStallsRef(); }
  private set stalls(val: StallState) { this.stallsMarketsManager.setStalls(val); }

  /** Proxy đến stallsMarketsManager cho market (đọc/ghi). */
  private get market(): MarketState { return this.stallsMarketsManager.getMarketRef(); }
  private set market(val: MarketState) { this.stallsMarketsManager.setMarket(val); }

  /** Proxy đến stallsMarketsManager cho demandTable (đọc). */
  private get demandTable(): DemandTable | undefined { return this.stallsMarketsManager.getDemandTable(); }
  private set demandTable(val: DemandTable | undefined) { this.stallsMarketsManager.setDemandTable(val); }

  /** Proxy đến stallsMarketsManager cho demandBuildCount (đọc/ghi). */
  private get demandBuildCount(): number { return this.stallsMarketsManager.getDemandBuildCount(); }
  private set demandBuildCount(val: number) { void val; }

  /** Proxy đến stallsMarketsManager cho noticeThrottle (đọc). */
  private get noticeThrottle() { return this.stallsMarketsManager.getNoticeThrottle(); }

  /** Proxy đến securityManager cho security state (đọc/ghi). */
  private get security(): SecurityState { return this.securityManager.getRef(); }

  /** Proxy đến questsManager cho quests (đọc/ghi). */
  private get quests(): QuestState { return this.questsManager.getState(); }
  private set quests(val: QuestState) { this.questsManager.setState(val); }

  /** Proxy đến questsManager cho partyOrders (đọc/ghi). */
  private get partyOrders(): PartyOrderState { return this.questsManager.getPartyOrdersRef(); }
  private set partyOrders(val: PartyOrderState) { this.questsManager.setPartyOrders(val); }

  /** Proxy đến questsManager cho goals (đọc/ghi). */
  private get goals(): GoalState { return this.questsManager.getGoalsRef(); }
  private set goals(val: GoalState) { this.questsManager.setGoals(val); }

  /** Tham chiếu đến currentDayRecord từ ledgerManager. */
  private get currentDayRecord(): DailyRecord { return this.ledgerManager.getCurrentDayRecordRef(); }
  private set currentDayRecord(val: DailyRecord) { this.ledgerManager.setCurrentDayRecord(val); }

  /** Proxy đến ledgerManager cho statistics (đọc/ghi). */
  private get statistics(): SaveGameData['statistics'] { return this.ledgerManager.getStatisticsRef(); }
  private set statistics(val: SaveGameData['statistics']) { this.ledgerManager.setStatistics(val); }

  /** Proxy đến ledgerManager cho ledgerSequence (đọc/ghi). */
  private get ledgerSequence(): number { return this.ledgerManager.getLedgerSequence(); }
  private set ledgerSequence(val: number) { this.ledgerManager.setLedgerSequence(val); }

  /** Proxy đến ledgerManager cho dailyRecords (đọc/ghi). */
  private get dailyRecords(): Record<number, DailyRecord> { return this.ledgerManager.getDailyRecordsRef(); }
  private set dailyRecords(val: Record<number, DailyRecord>) { this.ledgerManager.setDailyRecords(val); }

  /** Proxy đến ledgerManager cho closedDayIds (đọc/ghi). */
  private get closedDayIds(): Set<number> { return this.ledgerManager.getClosedDayIdsRef(); }
  private set closedDayIds(val: Set<number>) { this.ledgerManager.setClosedDayIds(val); }

  /** Proxy đến ledgerManager cho ledger entries (đọc/ghi). */
  private get ledger(): LedgerEntry[] { return this.ledgerManager.getLedger(); }
  private set ledger(val: LedgerEntry[]) { this.ledgerManager.setLedger(val); }

  private activeFixture: StoreFixture | null = null;
  private playerSpeed: number = 130; // Pixels per second
  private isMoving: boolean = false;
  /** Vị trí người chơi ở bước mô phỏng trước, chỉ để vẽ nội suy; không phải trạng thái game, không lưu. */
  private prevPlayerPosition: Vector2D | null = null;
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
    this.storageManager = new StorageManager(initialSave);
    this.ledgerManager = new LedgerManager(initialSave);
    this.warehouseTier = initialSave.warehouseTier ?? 0;
    this.storageRackCount = initialSave.storageRackCount ?? 0;
    this.sellingPrices = dict(initialSave.sellingPrices);
    this.fixtures = initialSave.storeLayout.fixtures.map((f) => ({ ...f }));
    this.storedFixtures = (initialSave.storeLayout.storedFixtures ?? []).map(f => ({ ...f }));
    this.unlockedPlotIds = [...(initialSave.storeLayout.unlockedPlotIds ?? [])];
    this.decorOwned = [...(initialSave.storeLayout.decorOwned ?? [])];
    this.inventory = initialSave.inventory.map((i) => ({ ...i }));
    this.holdingArea = (initialSave.holdingArea ?? []).map((h) => ({ ...h }));
    this.planogram = dict(initialSave.planogram);
    this.pendingOrders = (initialSave.pendingOrders ?? []).map((order) => ({
      ...order,
      supplierId: order.supplierId ?? DEFAULT_SUPPLIER_ID,
      delivered: order.delivered ?? false,
    }));
    this.staffManager = new StaffManager(initialSave);
    this.restockJobClaims = new RestockClaimManager();
    for (const member of this.staff) {
      if (member.workerTask) this.restockJobClaims.addFromWorkerTask(member.workerTask.fixtureId, member.id);
    }
    this.autoBuyEnabled = initialSave.autoBuyEnabled ?? false;
    this.autoBuyStalls = initialSave.autoBuyStalls ?? false;
    this.stallShortfall = new Set((initialSave.stallShortfall ?? []).filter((id) => !!STALL_MAP[id]));
    this.autoBuyRules = this.validateAutoBuyRules(initialSave.autoBuyRules ?? []);
    this.restockOptions = initialSave.restockOptions ? normalizeRestockOptions(initialSave.restockOptions) : undefined;
    this.processedAutoBuyDayIds = new Set(initialSave.processedAutoBuyDayIds ?? []);
    this.autoBuyReports = structuredClone(initialSave.autoBuyReports ?? {});
    this.statistics = { ...initialSave.statistics };
    this.createdAt = initialSave.createdAt;
    this.regulars = dict(initialSave.regulars ? structuredClone(initialSave.regulars) : undefined);
    this.customerCredits = (initialSave.customerCredits ?? []).filter(c => c && typeof c.id === 'string' && typeof c.regularId === 'string' && Number.isFinite(c.balance) && c.balance >= 0).map(c => ({ ...c }));
    this.customerCreditSequence = Math.max(initialSave.customerCreditSequence ?? 0, ...this.customerCredits.map(c => Number(c.id.match(/^credit-(\d+)$/)?.[1] ?? 0)));
    this.diningManager = new DiningManager();
    this.diningManager.load(initialSave);
    this.productionManager = new ProductionManager(initialSave);
    this.priceHistory = sanitizePriceHistory(initialSave.priceHistory);
    this.heatmap = sanitizeHeatmap(initialSave.heatmap);
    this.taxState = normalizeTaxState(initialSave.tax);
    this.chainState = normalizeChain(initialSave.chain);
    this.productionJobSequence = Math.max(initialSave.productionJobSequence ?? 0, ...this.productionManager.getRef().map(job => Number(job.id.match(/^job-(\d+)$/)?.[1] ?? 0)));
    this.reviewsManager = new ReviewsManager(initialSave.reviews);
    this.securityManager = new SecurityManager(initialSave.security);
    this.questsManager = new QuestManager(initialSave);
    this.skills = initialSave.skills ? structuredClone(initialSave.skills) : createInitialSkillState();
    this.stallsMarketsManager = new StallsMarketsManager(initialSave);
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
    this.stalls = normalizeStallState(initialSave.stalls);
    this.hydrateIdSequences(initialSave);
    if (initialSave.currentDayRecord) {
      this.currentDayRecord = { ...initialSave.currentDayRecord };
    } else {
      this.currentDayRecord = this.createEmptyDailyRecord(initialSave.worldTime.day);
    }
    this.completedCheckoutIds = new Set(initialSave.completedCheckoutIds ?? []);
    this.hydrateStock(initialSave.worldTime.day);

    this.collisionSystem = new CollisionSystem(this.tileMap, this.fixtures);
    this.dailyRoutine = new DailyRoutineSystem({
      onToast: (message, type) => this.callbacks.onToast?.(message, type),
      setStoreOpen: (open) => { if (this.clock.getTime().isStoreOpen !== open) this.clock.toggleStoreStatus(); },
      getActiveCustomerCount: () => this.customerManager.peekCustomers().filter((customer) => customer.stage !== 'leaving').length,
      getInventorySummary: () => this.buildInventorySummary(),
      onInventoryComplete: (summary) => this.callbacks.onInventorySummary?.(summary),
      onStateChanged: (state, previous) => {
        this.callbacks.onRoutineStateChanged?.(state, previous);
        this.notifyStateChanged();
      },
      onSleep: () => this.sleepUntilMorning(),
    });

    // Co-op routine system (optional, enabled via setCoopMode)
    this.coopRoutine = new CoopRoutineSystem({
      onToast: (message, type) => this.callbacks.onToast?.(message, type),
      setStoreOpen: (open) => { if (this.clock.getTime().isStoreOpen !== open) this.clock.toggleStoreStatus(); },
      getActiveCustomerCount: () => this.customerManager.peekCustomers().filter((customer) => customer.stage !== 'leaving').length,
      getInventorySummary: () => this.buildInventorySummary(),
      onInventoryComplete: (summary) => this.callbacks.onInventorySummary?.(summary),
      onStateChanged: (state, previous) => {
        this.callbacks.onRoutineStateChanged?.(state, previous);
        this.notifyStateChanged();
      },
      onSleep: () => {
        // Co-op: chỉ advance day khi cả hai player sleeping
        if (this.coopRoutine?.isAllPlayersSleeping()) {
          this.clock.advanceToNextDay();
        }
      },
      getActivePlayerCount: () => this.getActiveCoopPlayers(),
      getActivePlayerIds: () => this.getCoopPlayerIds(),
      isPlayerSleepReady: (pid) => this.isPlayerSleepReady(pid),
      isPlayerSleeping: (pid) => this.coopRoutine?.isPlayerSleeping(pid) ?? false,
      setPlayerSleeping: (pid, sleeping) => {
        this.coopRoutine?.setPlayerSleeping(pid, sleeping);
        if (sleeping) this.updateCoopClockState();
      },
      onPlayerOffline: (pid) => this.handlePlayerOffline(pid),
    });
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
      this.processBranches(day - 1);
      this.runStaffMaintenance();
      const worn = wearOvernight(this.fixtures, day, this.playerData.level);
      if (worn.length) this.callbacks.onMaintenanceNotice?.(worn);
      this.decayStock(day - 1); // trước khi thị trường sang ngày mới: sự kiện của ngày vừa qua còn trong trạng thái
      this.stallsMarketsManager.advanceMarket(day);
      this.updatePriceIndex(day);
      this.ensureSupplierMarket(day);
      this.demandTable = undefined;
      this.callbacks.onWeatherChanged?.(effectiveWeatherId(this.market, day));
      this.stallsMarketsManager.getMarketNotices(day, this.clock.getTime().hour, (notice) => {
        this.callbacks.onMarketNotice?.(notice);
      });
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
      this.questsManager.advanceToDay(day, this.playerData.level);
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
    }, () => { this.callbacks.onTimeChanged?.(); this.topUpStallShortfalls(); });
  }

  /** Đặt lại vị trí nhân vật (dùng khi chơi chung: vị trí không theo save dùng chung). */
  public setPlayerPosition(position: Vector2D, direction?: PlayerData['direction']): void {
    this.playerData.position = { ...position };
    this.prevPlayerPosition = null;
    if (direction) this.playerData.direction = direction;
  }

  /**
   * Vị trí để VẼ người chơi: nội suy giữa bước trước và bước hiện tại theo `alpha` (0..1) để chuyển động mượt khi số khung hình
   * không chia hết nhịp 60 Hz. Dịch chuyển tức thời (teleport, bị đẩy ra) thì không nội suy. Không dùng cho logic game.
   */
  public getPlayerRenderPosition(alpha: number): Vector2D {
    const cur = this.playerData.position;
    const prev = this.prevPlayerPosition;
    if (!prev || !this.isMoving || !Number.isFinite(alpha)) return { x: cur.x, y: cur.y };
    const dx = cur.x - prev.x;
    const dy = cur.y - prev.y;
    if (dx * dx + dy * dy > 12 * 12) return { x: cur.x, y: cur.y };
    const a = Math.max(0, Math.min(1, alpha));
    return { x: prev.x + dx * a, y: prev.y + dy * a };
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
    this.reviewsManager.addReview(review);
    this.callbacks.onCustomerRated?.({ stars, average: averageRating(this.playerData.ratings), reason, review });
  }

  /** Lời đánh giá gần đây của khách, mới nhất ở cuối. */
  public getReviews(): CustomerReview[] {
    return this.reviewsManager.getReviews();
  }

  public getReviewSummary(): ReturnType<typeof summarizeReviews> {
    return this.reviewsManager.getReviewSummary();
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

  /** Sức chứa kho mát (đơn vị hàng), tăng theo bậc kho. */
  public getColdCapacity(): number {
    return coldWarehouseCapacity({ warehouseTier: this.warehouseTier });
  }

  /** Sức chứa kho thường, tính bằng ô kho (mỗi ô chứa 10 đơn vị, hàng cồng kềnh chiếm 2 ô). */
  public getAmbientCapacity(): number {
    return totalWarehouseCells({ warehouseTier: this.warehouseTier, storageRackCount: this.storageRackCount });
  }

  /** Số ô kho thường đã dùng; làm tròn lên theo ô cho từng món. */
  public getAmbientCellsUsed(): number {
    return this.inventory.reduce((cells, item) => {
      const product = PRODUCT_MAP[item.productId];
      return cells + (product?.storageType !== 'cold' ? warehouseCellsFor(product, item.quantity) : 0);
    }, 0);
  }

  private ambientFreeCells(): number {
    return Math.max(0, this.getAmbientCapacity() - this.getAmbientCellsUsed());
  }

  private ambientUnitsOf(productId: string): number {
    return this.inventory.find((item) => item.productId === productId)?.quantity ?? 0;
  }

  /** Số đơn vị tối đa (≤ want) của món thường còn nhét vừa kho thường. */
  private ambientFitQuantity(productId: string, want: number): number {
    return unitsFittingInCells(PRODUCT_MAP[productId], this.ambientUnitsOf(productId), this.ambientFreeCells(), want);
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

  public getPriceHistory(productId: string): Array<{ day: number; price: number }> { return (Object.prototype.hasOwnProperty.call(this.priceHistory, productId) ? this.priceHistory[productId] : []).map(point => ({ ...point })); }
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

  /** Bàn trống (sạch, còn chỗ) trong đúng tòa nhà của khách; không dùng bàn của tòa kia. */
  private availableDiningTableId(buildingId = 'main'): string | undefined {
    return this.fixtures.find(fixture => fixture.type === 'dining_table' && (fixtureBuilding(fixture) ?? 'main') === buildingId && !this.diningDirtyTableIds.has(fixture.id)
      && this.customerManager.diningOccupancy(fixture.id) < (fixture.shopId === 'food_table_4' ? 4 : 2))?.id;
  }

  /**
   * Khách vừa ngồi bàn có thể gọi thêm đồ uống kèm theo món đã mua (DINING_ADD_ON_RULES). Món lấy từ kho còn hạn theo FEFO,
   * tính doanh thu/giá vốn như một giao dịch bán lẻ và kéo dài thời gian ngồi. Hết hàng thì khách không gọi.
   */
  private serveDiningAddOns(customer: CustomerState): void {
    const bought = customer.diningProductIds ?? (customer.reservedProductId ? [customer.reservedProductId] : []);
    if (bought.length === 0) return;
    const day = this.clock.getTime().day;
    const key = customer.id ?? customer.checkoutId ?? `${Math.round(customer.position.x)},${Math.round(customer.position.y)}`;
    let totalRevenue = 0;
    let totalCogs = 0;
    let totalItems = 0;
    for (const productId of rollDiningAddOns(DINING_ADD_ON_RULES, bought, key, day)) {
      const product = PRODUCT_MAP[productId];
      if (!product) continue;
      const taken = takeInventoryUnits(this.inventory, productId, 1, day);
      if (!taken) continue;
      const price = this.sellingPrice(productId);
      totalRevenue += price;
      totalCogs += taken.cost;
      totalItems += 1;
      this.recordProductSale(productId, 1);
      customer.diningTimeLeft = (customer.diningTimeLeft ?? 60) + DINING.extraOrderSeconds;
      // Ghi ledger chi tiết cho từng món gọi thêm
      this.recordLedger({
        day, type: 'sale', amount: price, cogs: taken.cost, quantity: 1,
        description: `Khách ngồi bàn gọi thêm ${product.name}`,
      });
    }
    if (totalItems === 0) return;
    this.inventory = this.inventory.filter(item => item.quantity > 0);
    this.playerData.money += totalRevenue;
    this.statistics.totalRevenue += totalRevenue;
    this.addExperience(Math.round(5 * totalItems * saleExperienceMultiplier(this.playerData.level)));
    const record = this.currentDayRecord;
    record.revenue += totalRevenue;
    record.cogs += totalCogs;
    record.itemsSold += totalItems;
    record.grossProfit = record.revenue - record.cogs;
    record.netProfit = record.grossProfit - record.spoilageCost - record.wagesPaid - (record.maintenanceCost ?? 0) - (record.theftCost ?? 0) + (record.theftRecovered ?? 0) - (record.counterfeitLoss ?? 0) - (record.badDebtCost ?? 0);
    this.notifyStateChanged();
  }

  public canDineIn(customer: CustomerState): boolean {
    return this.isDineInBasketEligible(customer) && !!this.availableDiningTableId(customer.buildingId);
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

  /** Ngân sách xe nền theo chất lượng đồ họa (0..1); renderer gọi khi chất lượng đổi. */
  public setTrafficBudgetScale(scale: number): void {
    this.streetTraffic.setBudgetScale(scale);
  }

  /** Vạch qua đường của NPC nền khu phố (renderer đẩy vào mỗi khung) để xe chưa vào vạch dừng nhường. Chỉ hình ảnh. */
  public setStreetCrossings(crossings: ReadonlyArray<{ roadId: string; x0: number; x1: number }>): void {
    this.streetTraffic.setExternalCrossings(crossings);
  }

  public getStreetVehicles(): StreetVehicleState[] {
    return this.streetTraffic.getVehicles();
  }

  public getStreetPedestrians(): StreetPedestrianState[] {
    return this.streetTraffic.getPedestrians();
  }

  public getIntersectionSignals(): Array<{ id: string; signals: IntersectionSignals }> {
    return this.streetTraffic.getIntersectionSignals();
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
      this.stallsMarketsManager.bumpDemandTable(key);
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

  /** Sản phẩm thường (đồ uống, trái cây...) đang có hàng trong tủ mát: khách thấy "lạnh sẵn" nên mua nhiều và chịu giá hơn. */
  private chilledOnDisplayIds(): Set<string> {
    const ids = new Set<string>();
    for (const fixture of this.fixtures) {
      if (fixture.type !== 'refrigerator' || fixture.currentStock <= 0 || !fixture.assignedProductId || fixture.broken) continue;
      const product = PRODUCT_MAP[fixture.assignedProductId];
      if (product && isChilledDisplayItem(product)) ids.add(product.id);
    }
    return ids;
  }

  private customerPricing() {
    const time = this.clock.getTime();
    const ctx = buildMarketContext(this.market, time.day, time.hour);
    return {
      priceOf: (productId: string) => this.sellingPrice(productId),
      keepChance: (productId: string) => {
        const product = PRODUCT_MAP[productId];
        if (!product) return 1;
        // Đồ uống/hàng thường đang bày lạnh: khách chịu trả cao hơn một chút (nóng càng chịu).
        const tolerance = this.chilledOnDisplayIds().has(productId) ? 1 + (chilledDisplayAppeal(ctx.weatherId) - 1) * 0.4 : 1;
        return keepChance(priceRatio(this.sellingPrice(productId), this.referencePrice(productId)) / tolerance, productSensitivity(product, ctx));
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
    return buildMarketSummary({
      market: this.market,
      weatherSeed: this.weatherSeed,
      time: this.clock.getTime(),
      table: this.refreshDemandTable(),
      ratings: this.playerData.ratings,
      level: this.playerData.level,
      prestigeStars: this.playerData.prestigeStars ?? 0,
      decor: this.getDecorAttraction(),
    });
  }

  public getSeason(day = this.clock.getTime().day) {
    return getSeasonForDay(day);
  }

  public getRainIntensity(): number {
    const time = this.clock.getTime();
    const weatherId = effectiveWeatherId(this.market, time.day);
    return rainIntensityAt(this.weatherSeed, time.day, time.hour, time.minute, weatherId);
  }

  /** Cường độ mưa sau `minutes` phút game (trong cùng ngày), để hiệu ứng mây/gió lên trước khi mưa đến. */
  public getRainIntensityAhead(minutes: number): number {
    const time = this.clock.getTime();
    const total = Math.min(24 * 60 - 1, time.hour * 60 + time.minute + Math.max(0, minutes));
    return rainIntensityAt(this.weatherSeed, time.day, Math.floor(total / 60), total % 60, effectiveWeatherId(this.market, time.day));
  }

  /** Loại thời tiết hiệu lực của hôm nay (id trong WEATHER_TYPES), dùng cho lớp hiệu ứng thời tiết. */
  public getEffectiveWeatherId(): string {
    return effectiveWeatherId(this.market, this.clock.getTime().day);
  }

  /** Hạt giống thời tiết (tái hiện sấm chớp khi debug). */
  public getWeatherSeed(): string { return this.weatherSeed; }

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
        for (const lot of takeLots(slot.lots, units, { caseSize: PRODUCT_MAP[productId]?.caseSize })) cogs += lot.quantity * (lot.unitCost ?? PRODUCT_MAP[productId]?.purchasePrice ?? 0);
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

  /** Phụ phí giao hỏa tốc so với giá sỉ thường (hàng về ngay trong ngày, không chờ lịch nhà cung cấp). */
  public static readonly RUSH_SURCHARGE = 0.3;

  /**
   * Báo giá nhập hỏa tốc phần hàng còn thiếu của một đơn tiệc: mỗi món thiếu lấy nhà cung cấp rẻ nhất đã mở khóa,
   * cộng phụ phí hỏa tốc. Chỉ tính lô còn hạn, khớp điều kiện của `fulfillPartyOrder`. `totalCost < 0` nghĩa là không có nguồn cung.
   */
  public getPartyOrderRushQuote(orderId: string): {
    lines: Array<{ productId: string; missing: number; supplierId: string; unitPrice: number; lineTotal: number }>;
    totalCost: number;
  } {
    const def = PARTY_ORDER_MAP[orderId];
    const day = this.clock.getTime().day;
    const level = this.playerData.level;
    const lines: Array<{ productId: string; missing: number; supplierId: string; unitPrice: number; lineTotal: number }> = [];
    let totalCost = 0;
    for (const item of def?.items ?? []) {
      const inv = this.inventory.find((i) => i.productId === item.productId);
      const usable = inv?.lots?.length ? inv.lots.reduce((sum, lot) => sum + (lot.expiresOnDay > day ? lot.quantity : 0), 0) : (inv?.quantity ?? 0);
      const missing = item.quantity - usable;
      if (missing <= 0) continue;
      let best: { supplierId: string; unit: number } | null = null;
      for (const supplier of SUPPLIERS) {
        if (supplier.unlockLevel > level || this.market.suppliers?.[supplier.id]?.unavailable.includes(item.productId)) continue;
        const unit = this.wholesaleUnitPrice(supplier.id, item.productId, missing);
        if (unit > 0 && (!best || unit < best.unit)) best = { supplierId: supplier.id, unit };
      }
      if (!best) return { lines: [], totalCost: -1 };
      const unitPrice = Math.ceil(best.unit * (1 + GameSimulation.RUSH_SURCHARGE));
      lines.push({ productId: item.productId, missing, supplierId: best.supplierId, unitPrice, lineTotal: unitPrice * missing });
      totalCost += unitPrice * missing;
    }
    return { lines, totalCost };
  }

  /**
   * Nhận (nếu còn chờ duyệt) + nhập hỏa tốc phần thiếu + giao đơn tiệc trong một lệnh.
   * Atomic: kiểm tiền và chỗ kho trước khi đổi gì; thiếu chỗ thì khôi phục kho và không nhận đơn.
   */
  public rushFulfillPartyOrder(orderId: string): FulfillPartyOrderResult {
    const fail = (reason: string): FulfillPartyOrderResult => ({ success: false, cogs: 0, reason });
    const order = this.partyOrders.available.find((o) => o.orderId === orderId);
    const def = PARTY_ORDER_MAP[orderId];
    if (!order || !def) return fail('Không tìm thấy đơn tiệc.');
    if (order.status !== 'pending' && order.status !== 'accepted') return fail('Đơn tiệc không còn ở trạng thái có thể giao.');
    const day = this.clock.getTime().day;
    if (order.status === 'accepted' && day > order.deadlineDay) return fail('Đơn tiệc đã quá hạn chót.');

    const quote = this.getPartyOrderRushQuote(orderId);
    if (quote.totalCost < 0) return fail('Chưa có nhà cung cấp nào bán được món còn thiếu.');
    if (quote.totalCost > this.playerData.money) return fail(`Không đủ tiền nhập hỏa tốc (cần ${quote.totalCost.toLocaleString('vi-VN')} ₫).`);

    const snapshot = structuredClone(this.inventory);
    const freshExtraDays = getSkillModifier(this.skills, 'fresh_extra_day');
    for (const line of quote.lines) {
      const product = PRODUCT_MAP[line.productId];
      const fits = product?.storageType === 'cold'
        ? this.reservedColdWarehouseCount() + line.missing <= this.getColdCapacity()
        : this.ambientFitQuantity(line.productId, line.missing) >= line.missing;
      if (!fits) {
        this.inventory = snapshot;
        return fail(`Kho không đủ chỗ chứa ${product?.name ?? line.productId} nhập hỏa tốc.`);
      }
      const lot: StockLot = { quantity: line.missing, expiresOnDay: expiryDay(line.productId, day) + freshExtraDays, unitCost: line.unitPrice, provenance: 'known', caseCount: 0 };
      const slot = this.inventory.find((i) => i.productId === line.productId);
      if (slot) {
        slot.lots = slot.lots ?? [];
        mergeLots(slot.lots, [lot]);
        slot.quantity = sumLots(slot.lots);
      } else {
        this.inventory.push({ productId: line.productId, quantity: line.missing, lots: [lot] });
      }
    }

    if (order.status === 'pending') {
      const accepted = this.respondPartyOrder(orderId, true);
      if (!accepted.success) {
        this.inventory = snapshot;
        return fail(accepted.reason ?? 'Không nhận được đơn tiệc.');
      }
    }
    const res = this.fulfillPartyOrder(orderId);
    if (!res.success) {
      this.inventory = snapshot;
      return res;
    }

    if (quote.totalCost > 0) {
      this.playerData.money -= quote.totalCost;
      this.currentDayRecord.purchaseTotal += quote.totalCost;
      this.recordLedger({
        day,
        type: 'purchase',
        amount: quote.totalCost,
        quantity: quote.lines.reduce((sum, line) => sum + line.missing, 0),
        description: `Nhập hỏa tốc cho đơn tiệc: ${def.title}`,
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

  /** Bảo đảm `goals.story` luôn có và hợp lệ (save cũ chưa có tiến độ cốt truyện). */
  private withStory(goals: GoalState): GoalState {
    return { ...goals, story: normalizeStoryState(goals.story) };
  }

  private getStoryContext(): StoryContext {
    const day = this.clock.getTime().day;
    let stallServings = 0;
    for (const record of Object.values(this.dailyRecords)) {
      if (record.day !== day) stallServings += Object.values(record.stallServings ?? {}).reduce((sum, n) => sum + n, 0);
    }
    stallServings += Object.values(this.currentDayRecord.stallServings ?? {}).reduce((sum, n) => sum + n, 0);
    return {
      day,
      level: this.playerData.level,
      totalCustomersServed: this.statistics.totalCustomersServed,
      totalRevenue: this.statistics.totalRevenue,
      staffCount: this.staff.length,
      reputation: this.playerData.reputation,
      regularsCount: Object.keys(this.regulars).length,
      stallServings,
      buildingsOpened: 1 + BUILDINGS.filter(building => building.plotId && this.unlockedPlotIds.includes(building.plotId)).length,
    };
  }

  public getStoryProgressList(): StoryChapterProgress[] {
    return getStoryProgressList(this.goals.story ?? createInitialStoryState(), this.getStoryContext());
  }

  public beginStoryChapter(chapterId: string): { success: boolean; reason?: string } {
    const story = structuredClone(this.goals.story ?? createInitialStoryState());
    const ctx = this.getStoryContext();
    const res = beginChapter(story, chapterId, ctx);
    if (!res.success) return { success: false, reason: res.reason };
    this.goals = { ...this.goals, story };
    if (res.rivalDays) {
      // Chương siêu thị đối diện kích hoạt sự kiện thị trường tương ứng (thay đợt cũ nếu còn).
      const events = this.market.events.filter(event => event.id !== RIVAL_EVENT_ID);
      events.push({ id: RIVAL_EVENT_ID, startDay: ctx.day, endDay: ctx.day + res.rivalDays - 1 });
      this.market = { ...this.market, events };
    }
    this.notifyStateChanged();
    return { success: true };
  }

  /** Thưởng chương cốt truyện là tiền thưởng ngoài sổ GAAP, như thưởng mục tiêu/nhiệm vụ. */
  public claimStoryChapter(chapterId: string): { success: boolean; reason?: string } {
    const story = structuredClone(this.goals.story ?? createInitialStoryState());
    const res = claimChapter(story, chapterId, this.getStoryContext());
    if (!res.success) return { success: false, reason: res.reason };
    this.goals = { ...this.goals, story };
    this.playerData.money += res.reward.money;
    if (res.reward.experience) this.addExperience(res.reward.experience);
    this.notifyStateChanged();
    return { success: true };
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

  /** Nhân viên thật không sao chép, chỉ đọc trong lượt gọi (renderer mỗi khung); cần sửa/giữ lâu thì dùng `getStaff()`. */
  public peekStaff(): readonly Readonly<StaffMember>[] {
    return this.staff;
  }

  public getAutoBuyConfig(): { enabled: boolean; stalls: boolean; rules: AutoBuyRule[]; reports: Record<number, AutoBuyReport> } {
    return { enabled: this.autoBuyEnabled, stalls: this.autoBuyStalls, rules: structuredClone(this.autoBuyRules), reports: structuredClone(this.autoBuyReports) };
  }

  /** Cài đặt gợi ý nhập hàng đã lưu; undefined nếu người chơi chưa chỉnh lần nào. */
  public getRestockOptions(): Required<RestockSuggestionOptions> | undefined {
    return this.restockOptions ? normalizeRestockOptions(this.restockOptions) : undefined;
  }

  public setRestockOptions(options: RestockSuggestionOptions): Required<RestockSuggestionOptions> {
    this.restockOptions = normalizeRestockOptions(options);
    this.notifyStateChanged();
    return { ...this.restockOptions } as Required<RestockSuggestionOptions>;
  }

  /** Mỗi giờ game: quầy còn thiếu nguyên liệu từ sáng được mua nốt nếu giờ đã đủ tiền cho phần thiếu. */
  private topUpStallShortfalls(): void {
    if (!this.autoBuyStalls || this.stallShortfall.size === 0) return;
    const time = this.clock.getTime();
    const key = `${time.day}:${time.hour}`;
    if (key === this.lastStallTopUpKey) return;
    this.lastStallTopUpKey = key;
    let changed = false;
    for (const stallId of [...this.stallShortfall]) {
      if (!this.stalls.owned.includes(stallId) || this.getStallRestockItems(stallId).length === 0) { this.stallShortfall.delete(stallId); continue; }
      const plan = this.planStallRestock(stallId);
      if ('reason' in plan || plan.missing?.length) continue; // vẫn chưa đủ tiền cho cả phần thiếu
      let ok = true;
      for (const order of plan.orders) {
        const result = this.orderSupplierCart(order.supplierId, order.items);
        if (!result.success) { ok = false; continue; }
        const report = this.autoBuyReports[time.day];
        if (report) order.items.forEach((item, index) => report.placed.push({ ruleId: `stall:${stallId}`, productId: item.productId, quantity: item.quantity, supplierId: order.supplierId, paidTotal: index === 0 ? result.paidTotal ?? order.totalCost : 0 }));
        changed = true;
      }
      if (ok) this.stallShortfall.delete(stallId);
    }
    if (changed) { this.notifyStateChanged(); this.callbacks.onAutoPurchase?.(); }
  }

  public setAutoBuyStalls(enabled: boolean): void {
    this.autoBuyStalls = !!enabled;
    if (!this.autoBuyStalls) this.stallShortfall.clear();
    this.notifyStateChanged();
  }

  /** Mỗi sáng: quầy đã mở nào kho thiếu nguyên liệu thì nhập (cả phần mua được một phần), tiền vẫn chừa lương/thuế như nút nhập nhanh. */
  private autoBuyStallIngredients(report: AutoBuyReport): void {
    for (const stallId of this.stalls.owned) {
      const plan = this.planStallRestock(stallId);
      if ('reason' in plan) {
        if (this.getStallRestockItems(stallId).length > 0) report.skipped.push({ ruleId: `stall:${stallId}`, productId: STALL_MAP[stallId]?.ingredients[0]?.productId ?? '', reason: `${STALL_MAP[stallId]?.name ?? stallId}: ${plan.reason}` });
        continue;
      }
      for (const order of plan.orders) {
        const result = this.orderSupplierCart(order.supplierId, order.items);
        if (!result.success) {
          report.skipped.push({ ruleId: `stall:${stallId}`, productId: order.items[0]?.productId ?? '', reason: `${STALL_MAP[stallId]?.name ?? stallId}: ${result.reasons?.join(' · ') ?? 'Không thể đặt đơn.'}` });
          continue;
        }
        const paid = result.paidTotal ?? order.totalCost;
        for (const [index, item] of order.items.entries()) {
          report.placed.push({ ruleId: `stall:${stallId}`, productId: item.productId, quantity: item.quantity, supplierId: order.supplierId, paidTotal: index === 0 ? paid : 0 });
        }
      }
      if (plan.missing?.length) this.stallShortfall.add(stallId); else this.stallShortfall.delete(stallId);
      if (plan.missing?.length) report.skipped.push({ ruleId: `stall:${stallId}`, productId: plan.missing[0]!, reason: `${STALL_MAP[stallId]?.name ?? stallId}: mới nhập được một phần, còn thiếu ${plan.missing.map((id) => PRODUCT_MAP[id]?.name ?? id).join(', ')}` });
    }
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
    if (this.autoBuyStalls) this.autoBuyStallIngredients(report);
    if (!this.autoBuyEnabled) { if (this.autoBuyStalls) { this.notifyStateChanged(); if (report.placed.length > 0) this.callbacks.onAutoPurchase?.(); } return; }
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
        quantity = Math.min(quantity, Math.max(0, this.getColdCapacity() - this.getColdWarehouseCount() - coldIncoming()));
      } else {
        quantity = this.ambientFitQuantity(rule.productId, quantity);
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
    if (report.placed.length > 0) this.callbacks.onAutoPurchase?.();
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

    if (candidate.role === 'cashier') {
      const counters = this.getStaffedCounters().length;
      const people = this.staff.filter((member) => member.role === 'cashier').length + 1; // +1: chủ tiệm mặc định
      if (people + 1 > counters * GameSimulation.PEOPLE_PER_COUNTER) {
        return { success: false, reason: `Mỗi quầy thu ngân chỉ có ${GameSimulation.PEOPLE_PER_COUNTER} người đứng (tính cả chủ tiệm). Cần mua thêm quầy thu ngân để tuyển thêm.` };
      }
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
        ? (this.getCashierPost(candidate.id) ?? { ...WAREHOUSE_ENTRANCE })
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
    // Kệ xoay 90/270 độ đổi chiều ngang/dọc: dùng kích thước sau xoay như khách hàng và va chạm.
    const { widthTiles, heightTiles } = getFixtureDimensions(fixture);
    for (let x = fixture.tileX; x < fixture.tileX + widthTiles; x++) {
      goals.push({ x, y: fixture.tileY - 1 }, { x, y: fixture.tileY + heightTiles });
    }
    for (let y = fixture.tileY; y < fixture.tileY + heightTiles; y++) {
      goals.push({ x: fixture.tileX - 1, y }, { x: fixture.tileX + widthTiles, y });
    }
    const path = findPathToAny(this.tileMap, this.collisionSystem, start, goals);
    return path.length ? path.slice(1).map(tileCenter) : undefined;
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

  /**
   * Giao việc châm kệ tự động cho nhân viên: nhân viên sẽ tự động đi châm tất cả kệ thiếu hàng.
   */
  public assignAutoRestockJob(staffId: string): { success: boolean; reason?: string } {
    const member = this.staff.find((item) => item.id === staffId && item.role === 'refill');
    if (!member || !this.isActorAvailableForRestock(staffId)) return { success: false, reason: 'actor_unavailable' };
    if (member.workerTask) return { success: false, reason: 'staff_busy' };

    const targets = this.getRestockJobTargets();
    if (targets.length === 0) return { success: false, reason: 'no_targets' };

    // Lấy kệ đầu tiên cần châm
    const firstTarget = targets[0];
    const product = PRODUCT_MAP[firstTarget.productId];
    const warehouse = this.fixtures.find((fixture) => fixture.id === (product.storageType === 'cold' ? 'warehouse_cold_storage' : 'warehouse_dry_rack'));
    if (!warehouse) return { success: false, reason: 'warehouse_missing' };

    const position = member.position ?? { ...WAREHOUSE_ENTRANCE };
    const route = this.routeToFixture(position, warehouse);
    if (!route) return { success: false, reason: 'no_path_to_warehouse' };

    member.position = { ...position };
    member.lastWorkerError = undefined;
    member.workerTask = {
      fixtureId: 'auto',
      productId: firstTarget.productId,
      stage: 'to_warehouse',
      route,
      carriedLots: [],
      autoRestock: true,
    };
    return { success: true };
  }

  /** Lấy kệ tiếp theo cần châm khi ở chế độ auto-restock. Trả undefined nếu không còn kệ nào. */
  private getNextAutoRestockTarget(currentFixtureId: string, currentProductId: string): RestockJobTarget | undefined {
    const targets = this.getRestockJobTargets();
    const currentIdx = targets.findIndex((t) => t.fixtureId === currentFixtureId && t.productId === currentProductId);
    // Tìm kệ tiếp theo trong danh sách
    for (let i = currentIdx + 1; i < targets.length; i++) {
      if (targets[i].availableInInventory > 0) return targets[i];
    }
    // Nếu không còn, quay lại từ đầu (vòng lặp)
    for (let i = 0; i < targets.length; i++) {
      if (targets[i].availableInInventory > 0) return targets[i];
    }
    return undefined;
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

      // Revalidate: nếu auto-restock thì tìm kệ tiếp theo, nếu không thì validate kệ cụ thể
      if (task.autoRestock) {
        const nextTarget = this.getNextAutoRestockTarget(task.fixtureId, task.productId);
        if (!nextTarget) {
          member.lastWorkerError = 'Đã châm hết kệ cần thiết.';
          this.finishStaffJob(member, true);
          continue;
        }
        // Cập nhật target hiện tại
        task.productId = nextTarget.productId;
        task.fixtureId = nextTarget.fixtureId;
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
        // Chỉ mang hàng lẻ ra kệ; hàng còn nguyên thùng phải được mở trong kho trước.
        const caseSize = PRODUCT_MAP[task.productId]?.caseSize;
        let loose = looseUnits(source.lots, caseSize);
        const wanted = Math.min(4, valid.target.needed);
        if (caseSize && loose < wanted) {
          this.unpackMultipleCases(task.productId, Math.ceil((wanted - loose) / caseSize));
          loose = looseUnits(source.lots, caseSize);
        }
        if (loose <= 0) {
          member.lastWorkerError = 'Hàng còn nguyên thùng — mở thùng trong kho để châm kệ.';
          this.finishStaffJob(member, true);
          continue;
        }
        const quantity = Math.min(4, valid.target.needed, loose);
        task.carriedLots = takeLots(source.lots, quantity, { caseSize, looseOnly: true });
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
      const capacity = effectiveShelfCapacity(shelf.maxCapacity, product.shelfCapacity, getSkillModifier(this.skills, 'shelf_capacity_bonus'));
      const moved = Math.min(Math.max(0, capacity - shelf.currentStock), sumLots(task.carriedLots));
      if (moved > 0) {
        const movedLots = takeLots(task.carriedLots, moved);
        shelf.assignedProductId = task.productId;
        shelf.stockLots ??= [];
        mergeLots(shelf.stockLots, movedLots);
        shelf.currentStock = sumLots(shelf.stockLots);
      }
      // Nếu auto-restock, tìm kệ tiếp theo; nếu không còn thì mới finish
      if (task.autoRestock) {
        const nextTarget = this.getNextAutoRestockTarget(task.fixtureId, task.productId);
        if (nextTarget) {
          // Tiếp tục với kệ tiếp theo
          const nextProduct = PRODUCT_MAP[nextTarget.productId];
          const warehouse = this.fixtures.find((fixture) => fixture.id === (nextProduct.storageType === 'cold' ? 'warehouse_cold_storage' : 'warehouse_dry_rack'));
          if (warehouse) {
            const route = this.routeToFixture(member.position, warehouse);
            if (route) {
              task.fixtureId = nextTarget.fixtureId;
              task.productId = nextTarget.productId;
              task.stage = 'to_warehouse';
              task.route = route;
              task.carriedLots = [];
              this.notifyStateChanged();
              continue;
            }
          }
        }
        // Hết kệ, finish job
        this.finishStaffJob(member, true);
        member.lastWorkerError = undefined;
      } else {
        this.finishStaffJob(member, true);
        member.lastWorkerError = undefined;
      }
      this.notifyStateChanged();
    }
  }

  private autoRefillTimer = 0;

  /** Nhân viên bổ sung kệ rảnh trong ca tự để ý kệ hết hàng mà kho còn: đi vào kho lấy rồi bày lên kệ. */
  private updateAutoRefillWorkers(dt: number): void {
    this.autoRefillTimer -= dt;
    if (this.autoRefillTimer > 0) return;
    this.autoRefillTimer = 3;
    for (const member of this.staff) {
      if (member.role !== 'refill' || member.workerTask || member.diningTask) continue;
      if (!this.isActorAvailableForRestock(member.id)) continue;
      if (!this.getRestockJobTargets().some((target) => target.availableInInventory > 0)) return;
      this.assignAutoRestockJob(member.id);
    }
  }

  private refillIdleRoutes = new Map<string, Vector2D[]>();
  private refillIdleWait = new Map<string, number>();

  /** Nhân viên bổ sung kệ hết việc thì đi ra đứng cạnh quầy thu ngân thay vì kẹt trong kho. */
  private updateRefillIdleWorkers(dt: number): void {
    for (const member of this.staff) {
      if (member.role !== 'refill') continue;
      if (member.workerTask || member.diningTask || !this.isStaffOnShift(member)) { this.refillIdleRoutes.delete(member.id); this.refillIdleWait.set(member.id, 0); continue; }
      const idleFor = (this.refillIdleWait.get(member.id) ?? 0) + dt;
      this.refillIdleWait.set(member.id, idleFor);
      if (idleFor < 2) continue;
      const post = this.getCashierPost();
      if (!post) continue;
      const position = member.position ?? { ...WAREHOUSE_ENTRANCE };
      member.position = position;
      let route = this.refillIdleRoutes.get(member.id);
      if (!route) {
        if (Math.hypot(post.x - position.x, post.y - position.y) < 0.5 * TILE_SIZE) continue;
        const path = findPathToAny(this.tileMap, this.collisionSystem,
          { x: Math.floor(position.x / TILE_SIZE), y: Math.floor(position.y / TILE_SIZE) },
          [{ x: Math.floor(post.x / TILE_SIZE), y: Math.floor(post.y / TILE_SIZE) }]);
        if (path.length < 2) continue;
        route = path.slice(1).map(tileCenter);
        this.refillIdleRoutes.set(member.id, route);
      }
      const waypoint = route[0];
      if (!waypoint) { this.refillIdleRoutes.delete(member.id); continue; }
      const dx = waypoint.x - position.x, dy = waypoint.y - position.y, distance = Math.hypot(dx, dy);
      const step = Math.max(35, member.speed * 16) * (1 + getSkillModifier(this.skills, 'staff_speed')) * Math.max(0, dt);
      if (distance <= step) { member.position = { ...waypoint }; route.shift(); }
      else member.position = { x: position.x + dx / distance * step, y: position.y + dy / distance * step };
    }
  }

  private securityPatrol = new Map<string, { step: number; route: Vector2D[]; wait: number }>();

  /** Bảo vệ trong ca đi tuần: ra đường trước tiệm, vào cửa, đi sâu vào trong tiệm rồi quay ra. */
  private updateSecurityPatrol(dt: number): void {
    const door = BUILDING_MAP.main.entranceTile;
    const stops: GridPoint[] = [{ x: 4, y: 13 }, { x: door.x, y: door.y }, { x: door.x - 2, y: door.y - 3 }, { x: door.x, y: door.y }];
    for (const member of this.staff) {
      if (member.role !== 'security' || member.workerTask || member.diningTask || !this.isStaffOnShift(member)) continue;
      let patrol = this.securityPatrol.get(member.id);
      if (!patrol) { patrol = { step: 0, route: [], wait: 0 }; this.securityPatrol.set(member.id, patrol); }
      if (patrol.wait > 0) { patrol.wait -= dt; continue; }
      const position = member.position ?? { x: 4 * TILE_SIZE, y: 13 * TILE_SIZE };
      member.position = position;
      if (!patrol.route.length) {
        patrol.step = (patrol.step + 1) % stops.length;
        const goal = stops[patrol.step];
        const path = findPathToAny(this.tileMap, this.collisionSystem, { x: Math.floor(position.x / TILE_SIZE), y: Math.floor(position.y / TILE_SIZE) }, [goal]);
        if (path.length > 1) patrol.route = path.slice(1).map(tileCenter);
        else patrol.wait = 3;
        continue;
      }
      const waypoint = patrol.route[0];
      const dx = waypoint.x - position.x, dy = waypoint.y - position.y, distance = Math.hypot(dx, dy);
      const step = Math.max(35, member.speed * 12) * dt;
      if (distance <= step) {
        member.position = { ...waypoint };
        patrol.route.shift();
        if (!patrol.route.length) patrol.wait = 4;
      } else member.position = { x: position.x + dx / distance * step, y: position.y + dy / distance * step };
    }
  }

  private isStaffOnShift(member: StaffMember): boolean {
    if (member.hiredOnDay > this.clock.getTime().day) return false;
    const shift = this.staffSchedule[member.id] ?? member.shift;
    const config = STAFF_SHIFTS[shift];
    const { hour } = this.clock.getTime();
    return !!config && hour >= config.startHour && hour < config.endHour;
  }

  /** Quầy tự thanh toán: mỗi máy tự tính tiền một khách (có giỏ, chưa có thu ngân phụ trách, không phải kẻ trộm) sau mỗi chu kỳ. */
  private updateSelfCheckout(dt: number): void {
    const machines = this.fixtures.filter(fixture => fixture.type === 'cashier_counter' && fixture.shopId === 'self_checkout' && !fixture.parentId && !fixture.broken).length;
    if (machines === 0) { this.selfCheckoutTimer = 0; return; }
    this.selfCheckoutTimer += dt;
    if (this.selfCheckoutTimer < SELF_CHECKOUT_SECONDS) return;
    this.selfCheckoutTimer = 0;
    let served = 0;
    for (const customer of this.customerManager.getCustomers()) {
      if (served >= machines) break;
      if (customer.stage !== 'checkout' || !customer.checkoutId || customer.cashierStaffId || customer.thief || !customer.basket?.length) continue;
      if (this.completeCustomerCheckout(customer.checkoutId)) served++;
    }
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
      if (this.isStaffOnShift(member)) this.moveCashierToPost(member, dt);
      if (member.currentCheckoutId || !this.isStaffOnShift(member)) continue;
      this.assignNextCashierCustomer(member.id);
    }
  }

  /** Quầy có người đứng: không tính quầy tự thanh toán; quầy gốc đứng trước. */
  private getStaffedCounters(): StoreFixture[] {
    return this.fixtures.filter((fixture) => fixture.type === 'cashier_counter' && !fixture.parentId && fixture.shopId !== 'self_checkout');
  }

  /** Số người đứng tối đa ở mỗi quầy thu ngân. */
  private static readonly PEOPLE_PER_COUNTER = 2;

  /**
   * Ô sau quầy (xoay 0° = phía bắc, mỗi 90° quay theo chiều kim đồng hồ). Quầy có 2 chỗ đứng: chỗ 0 và chỗ 1,
   * lệch ±0,5 ô dọc theo chiều dài quầy.
   */
  private getCounterBackPosition(counter: StoreFixture, slot = 0): Vector2D {
    const { widthTiles, heightTiles } = getFixtureDimensions(counter);
    const lateral = (slot - 0.5) * TILE_SIZE;
    const midX = (counter.tileX + widthTiles / 2) * TILE_SIZE;
    const midY = (counter.tileY + heightTiles / 2) * TILE_SIZE;
    const rotation = ((counter.rotation % 360) + 360) % 360;
    if (rotation === 90) return { x: (counter.tileX + widthTiles + 0.5) * TILE_SIZE, y: midY + lateral + TILE_SIZE / 2 - 2 };
    if (rotation === 270) return { x: (counter.tileX - 0.5) * TILE_SIZE, y: midY + lateral + TILE_SIZE / 2 - 2 };
    if (rotation === 180) return { x: midX + lateral, y: (counter.tileY + heightTiles + 1) * TILE_SIZE - 2 };
    return { x: midX + lateral, y: counter.tileY * TILE_SIZE - 2 };
  }

  /** Chủ tiệm (người mặc định) chiếm chỗ 0 của quầy đầu; thu ngân thuê lần lượt lấp các chỗ tiếp theo. */
  private getCashierPost(staffId?: string): Vector2D | undefined {
    const counters = this.getStaffedCounters();
    if (!counters.length) return undefined;
    const cashiers = this.staff.filter((member) => member.role === 'cashier');
    const found = cashiers.findIndex((member) => member.id === staffId);
    const person = (found < 0 ? cashiers.length : found) + 1;
    const per = GameSimulation.PEOPLE_PER_COUNTER;
    return this.getCounterBackPosition(counters[Math.floor(person / per) % counters.length], person % per);
  }

  /** Thu ngân đang rảnh/phục vụ thì đi về và đứng ở quầy; quầy bị dời thì đi theo quầy. */
  private moveCashierToPost(member: StaffMember, dt: number): void {
    if (member.workerTask || member.diningTask) return;
    const post = this.getCashierPost(member.id);
    if (!post) return;
    const position = member.position ?? { ...WAREHOUSE_ENTRANCE };
    const dx = post.x - position.x, dy = post.y - position.y, distance = Math.hypot(dx, dy);
    if (distance < 0.5) return;
    const step = Math.max(35, member.speed * 16) * (1 + getSkillModifier(this.skills, 'staff_speed')) * Math.max(0, dt);
    member.position = distance <= step || distance > 12 * TILE_SIZE
      ? { ...post }
      : { x: position.x + dx / distance * step, y: position.y + dy / distance * step };
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

  public getTaxState(): TaxState { return structuredClone(this.taxState); }
  public getChain(): ChainState { return structuredClone(this.chainState); }

  private chainContext(): ChainContext {
    return { money: this.playerData.money, warehouse: this.inventory, chain: this.chainState, day: this.clock.getTime().day, level: this.playerData.level };
  }

  /** Mở chi nhánh: trừ ví chung một lần (không ghi sổ cái, giống mua đất). `requestedId` giúp lệnh lặp là no-op. */
  public openBranch(storeTypeId: string, name?: string, requestedId?: string): { success: boolean; reason?: string; branchId?: string } {
    const result = openBranchPure(this.chainContext(), storeTypeId, name, requestedId);
    if (!result.ok) return { success: false, reason: result.reason };
    this.playerData.money = result.money;
    this.chainState = result.chain;
    this.notifyStateChanged();
    const created = requestedId && result.duplicate ? requestedId : result.chain.branches[result.chain.branches.length - 1]?.id;
    return { success: true, branchId: created };
  }

  public switchBranch(branchId: string): { success: boolean; reason?: string } {
    const result = switchBranchPure(this.chainContext(), branchId);
    if (!result.ok) return { success: false, reason: result.reason };
    this.chainState = result.chain;
    this.notifyStateChanged();
    return { success: true };
  }

  /** Đổi mức giá/quản lý của chi nhánh (bảng điều hành nhẹ). Không đổi ví; có hiệu lực từ lần chạy nền kế tiếp. */
  public setBranchPolicy(branchId: string, policy: BranchPolicy): { success: boolean; reason?: string } {
    const result = setBranchPolicyPure(this.chainContext(), branchId, policy);
    if (!result.ok) return { success: false, reason: result.reason };
    this.chainState = result.chain;
    this.notifyStateChanged();
    return { success: true };
  }

  /** Kho tổng → chi nhánh (FEFO, giữ lô/hạn/giá vốn, tất cả hoặc không). */
  public transferToBranch(branchId: string, items: TransferItem[]): { success: boolean; reason?: string } {
    const result = transferStockPure(this.chainContext(), branchId, items);
    if (!result.ok) return { success: false, reason: result.reason };
    this.inventory = result.warehouse;
    this.chainState = result.chain;
    this.notifyStateChanged();
    return { success: true };
  }

  /** Chi nhánh → kho tổng; từ chối nếu vượt sức chứa kho thường/kho mát của hub. */
  public returnFromBranch(branchId: string, items: TransferItem[]): { success: boolean; reason?: string } {
    const result = returnStockPure(this.chainContext(), branchId, items);
    if (!result.ok) return { success: false, reason: result.reason };
    const previous = this.inventory;
    this.inventory = result.warehouse;
    if (this.getAmbientCellsUsed() > this.getAmbientCapacity() || this.reservedColdWarehouseCount() > this.getColdCapacity()) {
      this.inventory = previous;
      return { success: false, reason: 'Kho tổng không đủ chỗ.' };
    }
    this.chainState = result.chain;
    this.notifyStateChanged();
    return { success: true };
  }

  /**
   * Chạy nền các chi nhánh cho `day` (ngày vừa kết thúc), giống `processStalls`: doanh thu/giá vốn/lương vào ví chung,
   * bản ghi ngày của hub và sổ cái (có `branchId`). Nhờ vậy thuế tính trên tổng chuỗi. Idempotent theo `lastBackgroundDay`.
   * Giới hạn: chưa có chế độ điều hành chi nhánh nên mọi chi nhánh (kể cả đang chọn) chạy nền.
   */
  private processBranches(day: number): void {
    if (day < 1 || !this.chainState.branches.length) return;
    const record = day === this.currentDayRecord.day ? this.currentDayRecord : (this.dailyRecords[day] ?? this.createEmptyDailyRecord(day));
    let touched = false;
    const seed = hashSeed(this.weatherSeed);
    this.chainState = { ...this.chainState, branches: this.chainState.branches.map((branch) => {
      const result = runBranchDay({ branch, day, money: this.playerData.money, seed });
      if (result.skipped || !result.report) return branch;
      touched = true;
      const { revenue, cogs, wages, spoilageLoss, unitsSold } = result.report;
      this.playerData.money += result.moneyDelta;
      this.statistics.totalRevenue += revenue;
      record.revenue += revenue;
      record.cogs += cogs;
      record.itemsSold += unitsSold;
      record.wagesPaid += wages;
      record.spoilageCost += spoilageLoss;
      if (unitsSold > 0) this.recordLedger({ day, type: 'sale', amount: revenue, cogs, quantity: unitsSold, description: `${result.branch.name}: bán ${unitsSold} món (chạy nền)`, branchId: branch.id });
      if (wages > 0) this.recordLedger({ day, type: 'wage', amount: wages, description: `${result.branch.name}: lương nhân viên`, branchId: branch.id });
      if (spoilageLoss > 0) this.recordLedger({ day, type: 'spoilage', amount: spoilageLoss, description: `${result.branch.name}: hàng hết hạn`, branchId: branch.id });
      return result.branch;
    }) };
    if (!touched) return;
    record.grossProfit = record.revenue - record.cogs;
    record.netProfit = record.grossProfit - record.spoilageCost - record.wagesPaid - (record.maintenanceCost ?? 0) - (record.theftCost ?? 0) + (record.theftRecovered ?? 0) - (record.counterfeitLoss ?? 0) - (record.badDebtCost ?? 0);
    if (record !== this.currentDayRecord) this.dailyRecords[day] = record;
  }

  /** Bật/tắt khai bớt thuế (rủi ro: bị truy thu và phạt nếu bị kiểm tra). Luôn tắt được. */
  public setTaxUnderDeclare(on: boolean): { success: boolean; reason?: string } {
    this.taxState.underDeclare = on;
    return { success: true };
  }

  /** Thu dần khoản truy thu/phạt còn nợ do thiếu tiền mặt lúc bị kiểm tra. */
  private collectTaxDebt(day: number, rec: DailyRecord): void {
    if (this.taxState.debt <= 0 || this.playerData.money <= 0) return;
    const paid = Math.min(this.taxState.debt, this.playerData.money);
    this.taxState.debt -= paid;
    this.playerData.money -= paid;
    rec.netProfit -= paid;
    rec.taxPenalty = (rec.taxPenalty ?? 0) + paid;
    this.recordLedger({ day, type: 'tax', amount: paid, description: `Trả dần khoản truy thu/phạt thuế (còn nợ ${this.taxState.debt.toLocaleString('vi-VN')} VND)` });
  }

  /** Chị cán bộ thuế ghé kiểm tra: truy thu và phạt phần khai bớt, hoặc khen khi sổ sách sạch. */
  private runTaxAudit(day: number, rec: DailyRecord, policy: typeof ACTIVE_TAX_POLICY): void {
    const outcome = resolveAudit(day, this.taxState, policy, n => `${n.toLocaleString('vi-VN')} ₫`);
    applyAuditToState(this.taxState, outcome);
    this.playerData.reputation = Math.max(0, Math.min(100, this.playerData.reputation + outcome.reputationDelta));
    if (outcome.record.total > 0) {
      const paid = Math.min(outcome.record.total, Math.max(0, this.playerData.money));
      this.taxState.debt += outcome.record.total - paid;
      this.playerData.money -= paid;
      rec.taxBackPaid = (rec.taxBackPaid ?? 0) + outcome.backTax;
      rec.taxPenalty = (rec.taxPenalty ?? 0) + outcome.fine;
      rec.netProfit -= outcome.record.total;
      if (paid > 0) this.recordLedger({ day, type: 'tax', amount: paid, description: `Truy thu và phạt sau kiểm tra thuế (${outcome.record.findings.join('; ')})` });
      this.callbacks.onToast?.(`🕵️ Chị Hạnh bên thuế ghé kiểm tra: ${outcome.record.findings.join('; ')}.${outcome.record.total > paid ? ` Thiếu tiền, còn nợ ${(outcome.record.total - paid).toLocaleString('vi-VN')} ₫ sẽ trừ dần.` : ''} Danh tiếng giảm.`, 'warn');
    } else {
      if (outcome.commend && !this.decorOwned.includes('bang_khen_thue')) this.decorOwned.push('bang_khen_thue');
      this.callbacks.onToast?.('🕵️ Chị Hạnh bên thuế ghé kiểm tra: sổ sách minh bạch, không vi phạm gì. Xóm khen tiệm làm ăn đàng hoàng! Danh tiếng tăng.', 'success');
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
      const policy = ACTIVE_TAX_POLICY;
      const annual = summarizeAnnualRevenue(this.dailyRecords, day, this.currentDayRecord, policy);
      const due = taxDueOnClose(this.dailyRecords, day, this.currentDayRecord, policy);
      const { pay, hidden } = splitDeclared(due, this.taxState.underDeclare, policy);
      if (due > 0) {
        if (pay > 0) {
          rec.taxPaid = (rec.taxPaid ?? 0) + pay;
          rec.netProfit -= pay;
          this.playerData.money -= pay;
          this.recordLedger({ day, type: 'tax', amount: pay, description: `Thuế hộ kinh doanh: GTGT + TNCN (doanh thu năm ${annual.revenue.toLocaleString('vi-VN')} VND)` });
        }
        if (hidden > 0) {
          rec.taxHidden = (rec.taxHidden ?? 0) + hidden;
          this.taxState.hiddenTax += hidden;
        }
        if (annual.taxPaidYear === 0 && annual.taxHiddenYear === 0) {
          this.callbacks.onToast?.(`📊 Doanh thu năm vượt ${annual.threshold.toLocaleString('vi-VN')} ₫ — bắt đầu nộp thuế GTGT ${annual.policy.vatRate * 100}% + TNCN ${annual.policy.pitRate * 100}%, nộp bù cho cả năm.`, 'warn');
        }
      }
      this.collectTaxDebt(day, rec);
      if (shouldAudit(day, annual.revenue, this.taxState, policy)) this.runTaxAudit(day, rec, policy);
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
      coldFree: Math.max(0, this.getColdCapacity() - this.reservedColdWarehouseCount()),
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
  /** Khoản truy thu/phạt thuế còn nợ (thu dần khi đóng ngày). */
  private outstandingTaxDebt(): number {
    return Math.max(0, this.taxState.debt);
  }

  /** Thuế sẽ bị trừ khi đóng ngày `day` (ước tính, tính đủ cả phần có thể khai bớt). */
  private estimateTaxDueOnClose(day: number): number {
    return taxDueOnClose(this.dailyRecords, day, this.currentDayRecord, ACTIVE_TAX_POLICY);
  }

  /** Tiền mặt phải chừa cho kỳ tới: nợ lương, lương một ngày (đã trừ perk, nhân theo ca), thuế sẽ nộp khi đóng ngày, nợ thuế. */
  public getCashObligations(): CashObligations {
    const day = this.clock.getTime().day;
    const wageDiscount = getSkillModifier(this.skills, 'wage_discount');
    const nextWages = this.staff
      .filter((member) => member.hiredOnDay <= day)
      .reduce((sum, member) => {
        const wage = wageDiscount > 0 ? Math.round(member.dailyWage * (1 - wageDiscount)) : member.dailyWage;
        const shift = this.staffSchedule[member.id] ?? member.shift;
        return sum + Math.round(wage * (STAFF_SHIFTS[shift]?.wageMultiplier ?? 1));
      }, 0);
    const taxDue = this.estimateTaxDueOnClose(day);
    const wageDebt = Math.max(0, this.wageDebt);
    const taxDebt = this.outstandingTaxDebt();
    return { wageDebt, nextWages, taxDue, taxDebt, total: wageDebt + nextWages + taxDue + taxDebt };
  }

  /** Đơn vị nguyên liệu/ngày mà các quầy ăn uống đã mở dùng (theo nhu cầu hôm nay), để gợi ý nhập hàng ưu tiên. */
  private stallIngredientNeedPerDay(productId: string): number {
    const day = this.clock.getTime().day;
    let need = 0;
    for (const stallId of this.stalls.owned) {
      const stall = STALL_MAP[stallId];
      const perServing = stall?.ingredients.find((ing) => ing.productId === productId)?.perServing;
      if (stall && perServing) need += stallDemand(stallId, day, this.playerData.reputation) * perServing;
    }
    return need;
  }

  /** Giỏ nhập nhanh nguyên liệu cho một quầy: bù đủ ~3 ngày nhu cầu (tính theo tồn kho), làm tròn theo kiện. */
  public getStallRestockItems(stallId: string, days = 3): { productId: string; quantity: number }[] {
    const stall = STALL_MAP[stallId];
    if (!stall || !this.stalls.owned.includes(stallId)) return [];
    const demand = stallDemand(stallId, this.clock.getTime().day, this.playerData.reputation);
    const items: { productId: string; quantity: number }[] = [];
    for (const ing of stall.ingredients) {
      const incoming = this.pendingOrders.filter(o => !o.delivered && o.productId === ing.productId).reduce((sum, o) => sum + o.quantity, 0);
      let want = Math.ceil(demand * ing.perServing * days) - this.warehouseUnits(ing.productId) - incoming;
      if (want <= 0) continue;
      const pack = PRODUCT_MAP[ing.productId]?.caseSize ?? 1;
      want = Math.ceil(want / pack) * pack;
      items.push({ productId: ing.productId, quantity: want });
    }
    return items;
  }

  /**
   * Lập kế hoạch nhập nhanh nguyên liệu cho quầy: có thể tách sang nhiều đại lý (mỗi món lấy chỗ rẻ nhất còn hàng,
   * thiếu thì lấy nốt ở đại lý kế tiếp), tự tăng số lượng cho đủ đơn tối thiểu, rồi chọn phương án rẻ nhất
   * (so với việc dồn hết vào một đại lý). Tiền phụ trội do làm tròn lên đủ đơn tối thiểu không được chạm vào
   * quỹ lương/thuế; nếu không thể thì thử lại chỉ chừa nợ đã đến hạn. Không đặt được thì trả lý do.
   */
  public planStallRestock(stallId: string): StallRestockPlan | { reason: string } {
    const need = this.getStallRestockItems(stallId);
    if (need.length === 0) return { reason: 'Kho đã đủ nguyên liệu cho quầy này.' };
    const full = this.planStallRestockFor(need);
    if ('orders' in full) return full;
    // Thiếu tiền/hàng cho đủ 3 ngày: mua trước phần làm được, món cạn nhất xét trước, mỗi món giảm dần về một kiện.
    const urgency = (line: { productId: string; quantity: number }) => this.warehouseUnits(line.productId) / Math.max(1, line.quantity);
    const included: { productId: string; quantity: number }[] = [];
    let partial: StallRestockPlan | undefined;
    for (const line of [...need].sort((x, y) => urgency(x) - urgency(y))) {
      const pack = PRODUCT_MAP[line.productId]?.caseSize ?? 1;
      const tries = new Set([line.quantity, Math.max(pack, Math.ceil(line.quantity / 2 / pack) * pack), pack]);
      for (const quantity of [...tries].sort((x, y) => y - x)) {
        const attempt = this.planStallRestockFor([...included, { productId: line.productId, quantity }]);
        if ('orders' in attempt) { included.push({ productId: line.productId, quantity }); partial = attempt; break; }
      }
    }
    if (!partial) return full;
    const missing = need.filter(line => (included.find(it => it.productId === line.productId)?.quantity ?? 0) < line.quantity).map(line => line.productId);
    return { ...partial, missing };
  }

  private planStallRestockFor(need: { productId: string; quantity: number }[]): StallRestockPlan | { reason: string } {
    type Line = { productId: string; quantity: number };
    const suppliers = SUPPLIERS.filter(sup => sup.unlockLevel <= this.playerData.level);
    const quotes = new Map(suppliers.map(sup => [sup.id, this.getSupplierQuotes(sup.id).quotes]));
    const packOf = (productId: string) => PRODUCT_MAP[productId]?.caseSize ?? 1;
    const roomOf = (supId: string, productId: string): number => {
      const quote = quotes.get(supId)?.[productId];
      if (!quote || quote.unavailable) return 0;
      return quote.stockLeft === undefined ? Infinity : Math.floor(quote.stockLeft / packOf(productId)) * packOf(productId);
    };
    const priceOf = (supId: string, productId: string) => quotes.get(supId)?.[productId]?.unitPrice ?? Infinity;
    const obligations = this.getCashObligations();
    const baseCost = (orders: { supplierId: string; items: Line[] }[]) =>
      orders.reduce((sum, order) => sum + order.items.reduce((inner, it) => inner + it.quantity * priceOf(order.supplierId, it.productId), 0), 0);

    /** Kiểm tra một giỏ; thiếu đơn tối thiểu thì tăng dần số lượng (trong tồn đại lý và trần chi tiền `cap`). */
    const settle = (supplierId: string, lines: Line[], cap: number) => {
      const items = lines.map(it => ({ ...it }));
      let check = this.validateSupplierCart(supplierId, items);
      for (let i = 0; i < 40 && !check.valid && check.totalCost < cap; i++) {
        const target = items.find(it => it.quantity + packOf(it.productId) <= roomOf(supplierId, it.productId));
        if (!target) break;
        target.quantity += packOf(target.productId);
        check = this.validateSupplierCart(supplierId, items);
      }
      return check.valid && check.totalCost <= cap ? { supplierId, items, totalCost: check.totalCost } : undefined;
    };

    /** Gom các giỏ theo phương án phân bổ; giỏ nào không hợp lệ thì dồn món sang giỏ khác còn chỗ. */
    const build = (assign: Map<string, Line[]>, cap: number) => {
      const orders: { supplierId: string; items: Line[]; totalCost: number }[] = [];
      const failed: Line[] = [];
      for (const [supplierId, lines] of assign) {
        const order = settle(supplierId, lines, cap - orders.reduce((sum, o) => sum + o.totalCost, 0));
        if (order) orders.push(order); else failed.push(...lines);
      }
      for (const line of failed) {
        const home = orders.find(o => roomOf(o.supplierId, line.productId) >= line.quantity + (o.items.find(it => it.productId === line.productId)?.quantity ?? 0));
        if (!home) return undefined;
        const existing = home.items.find(it => it.productId === line.productId);
        if (existing) existing.quantity += line.quantity; else home.items.push({ ...line });
        const recheck = this.validateSupplierCart(home.supplierId, home.items);
        if (!recheck.valid) return undefined;
        home.totalCost = recheck.totalCost;
      }
      const total = orders.reduce((sum, o) => sum + o.totalCost, 0);
      return orders.length > 0 && total <= cap ? orders : undefined;
    };

    // Phương án chia: mỗi món lấy ở đại lý rẻ nhất còn hàng, thiếu thì lấy nốt ở đại lý đắt hơn kế tiếp.
    const split = new Map<string, Line[]>();
    let splitOk = true;
    for (const line of need) {
      let left = line.quantity;
      for (const sup of [...suppliers].sort((a, b) => priceOf(a.id, line.productId) - priceOf(b.id, line.productId))) {
        const take = Math.min(left, roomOf(sup.id, line.productId));
        if (take <= 0) continue;
        split.set(sup.id, [...(split.get(sup.id) ?? []), { productId: line.productId, quantity: take }]);
        left -= take;
        if (left <= 0) break;
      }
      if (left > 0) splitOk = false;
    }
    const candidates: Map<string, Line[]>[] = [];
    if (splitOk) candidates.push(split);
    for (const sup of suppliers) {
      const lines = need.map(line => ({ productId: line.productId, quantity: Math.min(line.quantity, roomOf(sup.id, line.productId)) })).filter(line => line.quantity > 0);
      if (lines.length === need.length) candidates.push(new Map([[sup.id, lines]]));
    }
    if (candidates.length === 0) return { reason: 'Không đại lý nào còn đủ nguyên liệu quầy cần hôm nay.' };

    const money = this.playerData.money;
    const due = Math.max(0, obligations.wageDebt) + Math.max(0, obligations.taxDebt);
    for (const cap of [money - obligations.total, money - due]) {
      if (cap <= 0) continue;
      let best: { supplierId: string; items: Line[]; totalCost: number }[] | undefined;
      for (const candidate of candidates) {
        const orders = build(candidate, cap);
        if (!orders) continue;
        const cost = orders.reduce((sum, o) => sum + o.totalCost, 0);
        if (!best || cost < best.reduce((sum, o) => sum + o.totalCost, 0)) best = orders;
      }
      if (best) {
        const totalCost = best.reduce((sum, o) => sum + o.totalCost, 0);
        return { orders: best, totalCost, paddedCost: Math.max(0, totalCost - baseCost(best.map(o => ({ supplierId: o.supplierId, items: need.filter(n => o.items.some(it => it.productId === n.productId)) })))) , usedReserve: cap !== money - obligations.total };
      }
    }
    return { reason: 'Không đủ tiền (sau khi chừa lương/thuế) hoặc đại lý không đủ hàng để nhập nguyên liệu quầy.' };
  }

  public suggestRestock(supplierId?: string, budget?: number, existingCart?: Record<string, number>, options: RestockSuggestionOptions | undefined = this.restockOptions): RestockSuggestionResult {
    const effectiveSupplierId = supplierId ?? DEFAULT_SUPPLIER_ID;
    const expected = new Map(this.getProductPlans(effectiveSupplierId).map((plan) => [plan.productId, plan.expectedTomorrow]));
    const supplierState = this.market.suppliers?.[effectiveSupplierId];
    const limitedStock = SUPPLIER_MAP[effectiveSupplierId]?.stockPerProductPerDay !== undefined;
    return generateRestockSuggestions({
      existingCart,
      options,
      obligations: this.getCashObligations(),
      // Giá thật lúc đặt giỏ (cùng công thức với validateSupplierCart) để tổng gợi ý + giỏ không vượt tiền.
      cartCostOf: (items) => this.validateSupplierCart(effectiveSupplierId, items).totalCost,
      supplierStockOf: (productId) =>
        supplierState?.unavailable.includes(productId) ? 0 : limitedStock && supplierState ? supplierState.stockLeft[productId] ?? 0 : undefined,
      ambient: { freeCells: this.ambientFreeCells(), heldOf: (productId) => this.ambientUnitsOf(productId) },
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
      maxColdCapacity: this.getColdCapacity(),
      budget,
      unitPriceOf: supplierId ? (productId: string) => this.wholesaleUnitPrice(supplierId, productId) : undefined,
      expectedDailyOf: (productId: string) => expected.get(productId),
      stallNeedOf: (productId: string) => this.stallIngredientNeedPerDay(productId),
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
    return this.ledgerManager.recordLedger(entry);
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

  /** Khách thật không sao chép, chỉ đọc trong lượt gọi (renderer mỗi khung); xem `CustomerManager.peekCustomers`. */
  public peekCustomers(): readonly Readonly<CustomerState>[] {
    return this.customerManager.peekCustomers();
  }

  /**
   * NPC chủ tiệm đứng sau quầy. Khi có khách đã tới quầy và có giỏ hàng (chưa có nhân viên thu ngân
   * nhận), chủ tiệm chuyển sang "serving" cho tới khi giao dịch hoàn tất.
   * Vị trí được tính động theo quầy thu ngân hiện tại để hỗ trợ xoay quầy.
   */
  public getShopkeeper(): { position: Vector2D; direction: 'down' | 'right'; serving: boolean; visible: boolean; checkoutId?: string } {
    const waiting = this.customerManager.peekCustomers().find(customer =>
      customer.stage === 'checkout' && (customer.basket?.length ?? 0) > 0 && !customer.cashierStaffId);
    // Chủ tiệm đứng sau quầy gốc theo hướng xoay, ở chỗ 0 (thu ngân thuê đứng chỗ kế bên).
    const counter = this.getStaffedCounters()[0] ?? this.fixtures.find((fixture) => fixture.type === 'cashier_counter');
    const keeperPosition: Vector2D = counter ? this.getCounterBackPosition(counter, 0) : { ...SHOPKEEPER_POSITION };
    const visible = true;
    return {
      position: keeperPosition,
      direction: waiting ? 'right' : 'down',
      serving: !!waiting,
      visible,
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
    const relocated = relocateMisplacedFixtures(this.fixtures, this.storedFixtures);
    this.fixtures = relocated.fixtures;
    this.storedFixtures = relocated.stored;
    if (relocated.movedIds.length) this.callbacks.onToast?.(`${relocated.movedIds.length} nội thất đặt sai tòa nhà đã được cất vào kho nội thất.`, 'warn');
    this.fixtures = syncSlotChildren(upgradeFixtureSlots(this.fixtures));
    this.storedFixtures = syncSlotChildren(upgradeFixtureSlots(this.storedFixtures));
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
    const marketCtx = buildMarketContext(this.market, day, 12);
    const ctx = this.fixtures.some(fixture => fixture.shopId === 'generator' && !fixture.broken) ? withBackupPower(marketCtx) : marketCtx; // máy phát điện: tủ mát không hỏng nhanh khi cúp điện
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
      let rate = rateOf(fixture.assignedProductId) + coldBreakExtraDecay(fixture);
      const shelfProduct = fixture.assignedProductId ? PRODUCT_MAP[fixture.assignedProductId] : undefined;
      if (shelfProduct && fixture.type === 'refrigerator' && isChilledDisplayItem(shelfProduct)) {
        // Hàng thường để tủ mát: không chịu hao do trời nóng và tươi lâu hơn; mất điện thì hao như hàng lạnh.
        const coldRate = spoilageRate(ctx, { ...shelfProduct, storageType: 'cold' });
        rate = Math.max(0.6, 1 + (coldRate - 1) * (1 - getSkillModifier(this.skills, 'spoilage_reduction')) + coldBreakExtraDecay(fixture) - fridgeShelfLifeBonus(shelfProduct));
      }
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
      const taken = takeLots(lots, remaining, { caseSize: product.caseSize });
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

  /** Daily Routine (07:00 dậy → 08:00 mở → 22:00 đóng/kiểm kê → 23:30 về nhà → ngủ). Mặc định TẮT để giữ hành vi cũ. */
  private staffInventoryRoutes = new Map<string, { route: Vector2D[]; waitTimer: number }>();

  private updateInventoryPatrolWorkers(dt: number): void {
    const salesShelves = this.fixtures.filter(f => isSalesFixture(f) && !f.parentId && !f.broken);
    if (!salesShelves.length) return;

    for (const member of this.staff) {
      if (member.workerTask || member.diningTask) continue;
      let patrol = this.staffInventoryRoutes.get(member.id);
      if (!patrol) {
        patrol = { route: [], waitTimer: 0 };
        this.staffInventoryRoutes.set(member.id, patrol);
      }

      if (patrol.waitTimer > 0) {
        patrol.waitTimer -= dt;
        continue;
      }

      const position = member.position ?? { ...WAREHOUSE_ENTRANCE };
      member.position = position;

      if (!patrol.route.length) {
        const hashIdx = Math.abs(Math.floor(this.clock.getTime().minute + member.name.length * 7)) % salesShelves.length;
        const targetShelf = salesShelves[hashIdx];
        const route = this.routeToFixture(position, targetShelf);
        if (route && route.length) {
          patrol.route = route;
        } else {
          patrol.waitTimer = 2;
        }
        continue;
      }

      const waypoint = patrol.route[0];
      const dx = waypoint.x - position.x;
      const dy = waypoint.y - position.y;
      const distance = Math.hypot(dx, dy);
      const step = Math.max(35, member.speed * 16) * (1 + getSkillModifier(this.skills, 'staff_speed')) * dt;

      if (distance <= step) {
        member.position = { ...waypoint };
        patrol.route.shift();
        if (!patrol.route.length) {
          patrol.waitTimer = 2.5;
        }
      } else if (distance > 0) {
        member.position = { x: position.x + (dx / distance) * step, y: position.y + (dy / distance) * step };
      }
    }
  }

  public setDailyRoutineEnabled(enabled: boolean): void {
    this.routineEnabled = enabled;
    this.clock.setRoutineMode(enabled);
    if (enabled) this.dailyRoutine.resetForNewDay();
  }

  public isDailyRoutineEnabled(): boolean { return this.routineEnabled; }

  public getDailyRoutineState(): DailyRoutineState { return this.dailyRoutine.getState(); }

  private tickDailyRoutine(dt: number, manual: Vector2D): RoutineTickOutput {
    if (!this.routineEnabled) return { move: null, controlLocked: false, speedMultiplier: 1, gear: 'none' };
    this.dailyRoutine.setWorld({ tileMap: this.tileMap, collision: this.collisionSystem, storeDoorTile: BUILDING_MAP.main.entranceTile, homeDoorTile: HOME_DOOR_TILE });
    const time = this.clock.getTime();
    return this.dailyRoutine.update(dt, {
      minute: time.hour * 60 + time.minute,
      day: time.day,
      player: this.playerData.position,
      manualInput: Math.abs(manual.x) > 0.05 || Math.abs(manual.y) > 0.05,
      rainIntensity: this.getRainIntensity(),
    });
  }

  private tickCoopRoutine(dt: number): CoopRoutineTickOutput | null {
    if (!this.coopMode || !this.coopRoutine) return null;
    const time = this.clock.getTime();
    const players: Record<string, { position: Vector2D; manualInput: boolean; isOnline: boolean }> = {};
    for (const playerId of this.coopPlayerPositions.keys()) {
      players[playerId] = {
        position: this.coopPlayerPositions.get(playerId) ?? { x: 0, y: 0 },
        manualInput: this.coopPlayerManualInput.get(playerId) ?? false,
        isOnline: this.coopPlayerOnline.get(playerId) ?? false,
      };
    }
    if (Object.keys(players).length === 0) return null;
    this.coopRoutine.setWorld({
      tileMap: this.tileMap,
      collision: this.collisionSystem,
      storeDoorTile: BUILDING_MAP.main.entranceTile,
      playerConfigs: {}, // Configs registered via registerCoopPlayer
    });
    const output = this.coopRoutine.update(dt, {
      minute: time.hour * 60 + time.minute,
      day: time.day,
      players,
      rainIntensity: this.getRainIntensity(),
    });
    this.updateCoopClockState();
    return output;
  }

  /** Kiểm kê cuối ngày từ dữ liệu thật (kế hoạch hàng hóa + sổ ngày hiện tại). "Tồn nhiều" = hàng còn kho nhưng bán chậm. */
  private buildInventorySummary(): InventorySummary {
    const tracked = this.getProductPlans().filter((plan) => plan.stock > 0 || plan.soldRecently > 0);
    return {
      lowStock: tracked.filter((plan) => plan.stock > 0 && plan.flags.lowStock).length,
      outOfStock: tracked.filter((plan) => plan.stock <= 0).length,
      overstock: tracked.filter((plan) => plan.stock > 0 && plan.flags.slowMoving).length,
      revenue: this.currentDayRecord.revenue,
      orders: this.currentDayRecord.transactionsCount,
    };
  }

  /** Về tới nhà: sang ngày mới bằng đúng handler chốt ngày của clock (lương, hao hụt, sổ, thời tiết ngày mới), rồi thức dậy ở cửa nhà. */
  private sleepUntilMorning(): void {
    this.clock.advanceToNextDay();
    this.playerData.position = { ...this.dailyRoutine.getHomeDoorPosition() };
    this.prevPlayerPosition = null;
    this.dailyRoutine.resetForNewDay();
    this.callbacks.onPlayerRelocated?.();
    this.notifyStateChanged();
  }

  // ========================
  // CO-OP ROUTINE HELPERS
  // ========================
  private coopPlayerPositions = new Map<string, Vector2D>();
  private coopPlayerOnline = new Map<string, boolean>();
  private coopPlayerManualInput = new Map<string, boolean>();

  public setCoopMode(enabled: boolean): void {
    this.coopMode = enabled;
    if (enabled) {
      this.coopRoutine?.setRoutineMode(true);
      this.clock.setRoutineMode(true);
      this.clock.setCoopMode(true);
    } else {
      this.coopRoutine?.setRoutineMode(false);
      this.clock.setRoutineMode(this.routineEnabled);
      this.clock.setCoopMode(false);
    }
  }

  public isCoopMode(): boolean { return this.coopMode; }

  public registerCoopPlayer(config: CoopPlayerRoutineConfig): void {
    if (!this.coopRoutine) return;
    this.coopRoutine.registerPlayer(config);
    this.coopPlayerPositions.set(config.playerId, { x: 0, y: 0 });
    this.coopPlayerOnline.set(config.playerId, true);
    this.coopPlayerManualInput.set(config.playerId, false);
  }

  public unregisterCoopPlayer(playerId: string): void {
    this.coopPlayerPositions.delete(playerId);
    this.coopPlayerOnline.delete(playerId);
    this.coopPlayerManualInput.delete(playerId);
    this.coopRoutine?.unregisterPlayer(playerId);
  }

  public setCoopPlayerPosition(playerId: string, pos: Vector2D): void {
    this.coopPlayerPositions.set(playerId, pos);
  }

  public setCoopPlayerOnline(playerId: string, online: boolean): void {
    this.coopPlayerOnline.set(playerId, online);
  }

  public setCoopPlayerManualInput(playerId: string, manual: boolean): void {
    this.coopPlayerManualInput.set(playerId, manual);
  }

  public getCoopPlayerIds(): string[] {
    return this.coopRoutine ? Array.from(this.coopRoutine.getState !== null ? this.coopRoutine['playerStates']?.keys() ?? [] : []) : [];
  }

  private getActiveCoopPlayers(): number {
    let count = 0;
    for (const online of this.coopPlayerOnline.values()) {
      if (online) count++;
    }
    return count;
  }

  private isPlayerSleepReady(playerId: string): boolean {
    return this.coopRoutine?.getState(playerId) === 'GOING_TO_SLEEP' || this.coopRoutine?.getState(playerId) === 'SLEEPING';
  }

  private handlePlayerOffline(playerId: string): void {
    // AI fallback: auto-return home and sleep
    this.coopPlayerOnline.set(playerId, false);
  }

  private updateCoopClockState(): void {
    if (!this.coopRoutine) return;
    const allSleeping = this.coopRoutine['isAllPlayersSleeping']();
    this.clock.setCoopAllSleeping(allSleeping);
  }

  /** Reset tất cả player co-op về AT_HOME khi ngày mới. */
  private resetCoopForNewDay(): void {
    if (this.coopRoutine) {
      this.coopRoutine.resetForNewDay();
      this.coopRoutine.setWorld({
        tileMap: this.tileMap,
        collision: this.collisionSystem,
        storeDoorTile: BUILDING_MAP.main.entranceTile,
        playerConfigs: {}, // Will be populated via registerCoopPlayer
      });
    }
  }

  /** Get coop routine states for all registered players. */
  public getCoopRoutineStates(): Array<{
    playerId: string;
    state: DailyRoutineState;
    isOnline: boolean;
    isSleeping: boolean;
    homeDoorTile: { x: number; y: number };
  }> {
    if (!this.coopRoutine) return [];
    const states = this.coopRoutine.getCoopRoutineStates();
    return states.map(s => ({
      ...s,
      isOnline: this.coopPlayerOnline.get(s.playerId) ?? false,
    }));
  }

  /** Check if all coop players are sleeping. */
  public areAllCoopPlayersSleeping(): boolean {
    if (!this.coopRoutine) return false;
    return this.coopRoutine.isAllPlayersSleeping();
  }

  /**
   * Fixed update step
   */
  public update(dt: number): void {
    if (!Number.isFinite(dt) || dt <= 0) return;
    dt = Math.min(dt, GameClock.MAX_UPDATE_SECONDS); // dt bất thường (tab treo, dữ liệu xấu) không được làm vòng lặp con chạy vô hạn
    if (this.isPaused) { this.prevPlayerPosition = null; return; }
    // 1. Advance game clock
    this.clock.update(dt);
    
    // 1.5. Daily Routine (chỉ khi bật): một máy trạng thái theo phút game; autopilot trả vector di chuyển, không teleport.
    const manualMove = this.inputManager.getMovementVector();
    const routineTick = this.tickDailyRoutine(dt, manualMove);
    
    // 1.6. Co-op Routine (nếu bật): xử lý nhiều player, tự động chuyển ngày khi cả hai ngủ
    const coopTick = this.tickCoopRoutine(dt);
    if (coopTick?.allPlayersSleeping && !this.clock.getTime().isStoreOpen) {
      // Cả hai player đã ngủ → chuyển ngày
      this.clock.advanceToNextDay();
      this.resetCoopForNewDay();
      this.callbacks.onDayChanged?.(this.clock.getTime().day);
    }
    
    // Khách và nhân viên chạy theo thời gian game: 2× đồng hồ thì họ cũng hoạt động nhanh gấp đôi (người chơi vẫn đi bộ bình thường).
    const worldDt = dt * Math.max(0.25, (this.clock.getTime().timeScale || 60) / 60);
      this.customerManager.outdoorSpeedMultiplier = rainSpeedMultiplier(this.getRainIntensity());
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
      },
      (diner) => this.serveDiningAddOns(diner)
    );
    const demandTable = this.refreshDemandTable();
    const chilledIds = this.chilledOnDisplayIds();
    const chilledAppeal = chilledIds.size ? chilledDisplayAppeal(buildMarketContext(this.market, this.clock.getTime().day, this.clock.getTime().hour).weatherId) : 1;
    const availability = availabilityFactor(demandTable, this.fixtures.filter(isSalesFixture).map(shelf => ({
      productId: shelf.assignedProductId ?? this.planogram[shelf.id],
      inStock: shelf.currentStock > 0 && !shelf.broken,
    })));
    const inStoreRegularIds = this.customerManager.peekCustomers().map(c => c.regularId).filter((id): id is string => Boolean(id));
    const regularCandidate = pickAvailableRegular(this.clock.getTime().day, this.market.seed, inStoreRegularIds, this.regulars);
    const spawned = this.customerManager.maybeSpawnCustomer(
      worldDt,
      this.clock.getTime().isStoreOpen,
      this.fixtures,
      this.tileMap,
      this.clock.getTime().day,
      this.statistics.totalCustomersServed,
      {
        traffic: trafficAtLevel(effectiveTraffic(demandTable, availability) * reputationTrafficMultiplier(this.playerData.ratings) * this.getDecorAttraction().trafficMultiplier * (1 + getSkillModifier(this.skills, 'traffic_boost')) * prestigeTrafficMultiplier(this.playerData.prestigeStars ?? 0) * hourlyStoreTrafficMultiplier(this.clock.getTime().hour), this.playerData.level),
        maxConcurrentCustomers: maxActiveCustomersForLevel(this.playerData.level),
        weightOf: (productId) => (demandTable.perProduct[productId]?.demand ?? 0.01) * (chilledIds.has(productId) ? chilledAppeal : 1),
      },
      regularCandidate,
      this.getRainIntensity(),
      this.hasSecurityGuardOnShift(),
      { hour: this.clock.getTime().hour, weekday: weekdayOf(this.clock.getTime().day) }
    );
    if (spawned?.id && rollShoplifter(this.clock.getTime().day, spawned.id, this.playerData.level, !!spawned.regularId)) spawned.thief = true;

    this.streetTraffic.setStallStops(this.stalls.owned.flatMap(id => STALL_MAP[id] ? [(STALL_MAP[id].tileX + STALL_MAP[id].widthTiles / 2) * TILE_SIZE] : []));
    for (const id of ['xoi', 'drink'] as const) setAwningOpen(id, this.tileMap.buildings?.find((b) => b.id === id)?.open ?? false);
    const trafficTime = this.clock.getTime();
    const trafficCtx = { minute: trafficTime.minute, weekday: weekdayOf(trafficTime.day) };
    if (!this.trafficWarmed) {
      // Đường rộng, xe sinh ở rìa khu phố: chạy trước một đoạn để lúc mở game đã có xe đúng mật độ giờ hiện tại.
      this.trafficWarmed = true;
      this.streetTraffic.warmUp(trafficTime.hour, this.getRainIntensity(), trafficTime.day * 1337, trafficCtx);
    }
    this.streetTraffic.setPlayerPosition(this.playerData.position);
    this.streetTraffic.update(worldDt, trafficTime.hour, this.getRainIntensity(), trafficTime.day * 1337, trafficCtx);
    this.logisticsManager.update(worldDt, this.clock.getTime().hour);

    this.recordHeatmap();
    this.updateAutoRefillWorkers(worldDt);
    this.updateStaffWorkers(worldDt);
    this.updateRefillIdleWorkers(worldDt);
    this.updateSecurityPatrol(worldDt);
    if (this.routineEnabled && this.dailyRoutine.getState() === 'INVENTORY') {
      this.updateInventoryPatrolWorkers(worldDt);
    }
    this.updateProduction(worldDt);
    this.updateCashierWorkers(worldDt);
    this.updateSelfCheckout(worldDt);

    // Auto checkout for customer waiting at counter if checkoutWait timer reaches 0
    // Chốt danh sách trước (thanh toán làm đổi danh sách khách); không sao chép sâu cả danh sách mỗi bước.
    const autoCheckoutIds = this.customerManager.peekCustomers()
      .filter((waiting) => waiting.stage === 'checkout' && waiting.checkoutWait <= 0 && waiting.checkoutId)
      .map((waiting) => waiting.checkoutId!);
    for (const checkoutId of autoCheckoutIds) this.completeCustomerCheckout(checkoutId);

    // 2. Process player movement
    const moveVec = routineTick.controlLocked ? (routineTick.move ?? { x: 0, y: 0 }) : (routineTick.move ?? manualMove);
    const moveSpeedScale = routineTick.move ? routineTick.speedMultiplier : 1;
    this.isMoving = Math.abs(moveVec.x) > 0.05 || Math.abs(moveVec.y) > 0.05;

    this.prevPlayerPosition = this.isMoving ? { x: this.playerData.position.x, y: this.playerData.position.y } : null;
    if (this.isMoving) {
      this.playerData.direction = vectorToDirection(
        moveVec,
        this.playerData.direction
      );

      const velocity: Vector2D = {
        x: moveVec.x * this.playerSpeed * moveSpeedScale,
        y: moveVec.y * this.playerSpeed * moveSpeedScale,
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
      if (this.activeFixture && this.callbacks.onOpenFixtureModal && !routineTick.controlLocked) {
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
  public transferToShelf(fixtureId: string, productId: string, amount: number = 1, autoOpenCases = false): TransferShelfResult {
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
    // Chỉ chặn nếu: sản phẩm cold-only mà không vào tủ lạnh
    // Sản phẩm cold bình thường (như sữa tiệt trùng) có thể vào cả tủ lạnh HOẶC kệ nhiệt độ thường
    if (product.storageType === 'cold' && product.coldOnly && fixture.type !== 'refrigerator') {
      return { success: false, actualQuantity: 0, reason: 'storage_mismatch' };
    }
    // Hàng đông lạnh chỉ vào tủ đông; tủ mát nhận hàng lạnh + hàng thường nên bày lạnh.
    if (product.category === 'frozen' && !(fixture.type === 'refrigerator' && (fixture.shopId ?? this.fixtures.find((item) => item.id === fixture.parentId)?.shopId) === 'freezer')) {
      return { success: false, actualQuantity: 0, reason: 'storage_mismatch' };
    }
    if (fixture.type === 'refrigerator' && !refrigerationAccepts(fixture, product, this.fixtures)) {
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

    const effectiveCapacity = effectiveShelfCapacity(fixture.maxCapacity, product.shelfCapacity, getSkillModifier(this.skills, 'shelf_capacity_bonus'));
    const availableSpace = effectiveCapacity - fixture.currentStock;
    if (availableSpace <= 0) {
      return { success: false, actualQuantity: 0, reason: 'no_space' };
    }

    // Chỉ hàng lẻ lên kệ: hàng còn nguyên thùng ở lại kho cho tới khi mở thùng (WarehouseModal / lệnh open_case).
    inventorySlot.lots ??= normalizeLots(inventorySlot.quantity, undefined, productId, this.clock.getTime().day);
    let loose = looseUnits(inventorySlot.lots, product.caseSize);
    // Bày tự động: thiếu hàng lẻ thì tự mở đúng số thùng cần dùng.
    if (autoOpenCases && product.caseSize && loose < Math.min(amount, availableSpace)) {
      const wanted = Math.min(amount, availableSpace);
      this.unpackMultipleCases(productId, Math.ceil((wanted - loose) / product.caseSize));
      loose = looseUnits(inventorySlot.lots, product.caseSize);
    }
    if (loose <= 0) {
      return { success: false, actualQuantity: 0, reason: 'in_cases' };
    }

    const actualTransfer = Math.min(amount, loose, availableSpace);
    if (actualTransfer <= 0) {
      return { success: false, actualQuantity: 0, reason: 'no_space' };
    }

    const moved = takeLots(inventorySlot.lots, actualTransfer, { caseSize: product.caseSize, looseOnly: true });
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
   * Mở thùng sản phẩm: chuyển 1 case thành caseSize đơn vị lẻ.
   * Số lượng lô (`quantity`) đã tính đủ hàng trong thùng từ lúc giao (caseSize gói = 1 thùng thì quantity caseSize, caseCount 1),
   * nên mở thùng chỉ giảm `caseCount`; tổng hàng không đổi.
   * Trả về kết quả chi tiết.
   */
  public unpackCase(productId: string): { success: boolean; reason?: string; caseSize?: number; openedCases?: number; unitsAdded?: number } {
    const product = PRODUCT_MAP[productId];
    if (!product?.caseSize) {
      return { success: false, reason: 'Sản phẩm không có thùng' };
    }

    const inventorySlot = this.inventory.find((i) => i.productId === productId);
    if (!inventorySlot || !inventorySlot.lots?.length) {
      return { success: false, reason: 'Không có hàng trong kho' };
    }

    // Tìm lot có caseCount > 0
    const lotWithCase = inventorySlot.lots.find((lot) => (lot.caseCount ?? 0) > 0);
    if (!lotWithCase) {
      return { success: false, reason: 'Không có thùng nào để mở' };
    }

    const caseCount = lotWithCase.caseCount ?? 0;
    if (caseCount <= 0) {
      return { success: false, reason: 'Không có thùng để mở' };
    }

    // Mở 1 thùng
    // Trước đây còn cộng thêm caseSize vào quantity → mỗi lần mở thùng sinh thêm cả thùng hàng miễn phí.
    lotWithCase.caseCount = caseCount - 1;
    inventorySlot.quantity = sumLots(inventorySlot.lots!);

    return {
      success: true,
      caseSize: product.caseSize,
      openedCases: 1,
      unitsAdded: product.caseSize,
    };
  }

  /**
   * Mở nhiều thùng sản phẩm cùng lúc
   */
  public unpackMultipleCases(productId: string, count: number = 1): { success: boolean; reason?: string; caseSize?: number; openedCases?: number; unitsAdded?: number } {
    const product = PRODUCT_MAP[productId];
    if (!product?.caseSize) {
      return { success: false, reason: 'Sản phẩm không có thùng' };
    }

    const inventorySlot = this.inventory.find((i) => i.productId === productId);
    if (!inventorySlot || !inventorySlot.lots?.length) {
      return { success: false, reason: 'Không có hàng trong kho' };
    }

    // Tính tổng số thùng có sẵn
    let totalCases = 0;
    for (const lot of inventorySlot.lots) {
      totalCases += lot.caseCount ?? 0;
    }

    if (totalCases <= 0) {
      return { success: false, reason: 'Không có thùng nào để mở' };
    }

    if (!Number.isSafeInteger(count) || count < 1) {
      return { success: false, reason: 'Số thùng cần mở không hợp lệ' };
    }
    const actualCount = Math.min(count, totalCases);

    // Mở thùng từ các lot khác nhau
    let remaining = actualCount;
    for (const lot of inventorySlot.lots) {
      if (remaining <= 0) break;
      const lotCases = lot.caseCount ?? 0;
      if (lotCases <= 0) continue;

      const openFromThisLot = Math.min(remaining, lotCases);
      lot.caseCount = lotCases - openFromThisLot; // quantity đã gồm hàng trong thùng: không cộng thêm
      remaining -= openFromThisLot;
    }

    inventorySlot.quantity = sumLots(inventorySlot.lots!);

    return {
      success: true,
      caseSize: product.caseSize,
      openedCases: actualCount,
      unitsAdded: actualCount * product.caseSize,
    };
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
      if (this.reservedColdWarehouseCount() + actualAmount > this.getColdCapacity()) {
        return { success: false, actualQuantity: 0, reason: 'cold_storage_full' };
      }
    } else {
      if (this.ambientFitQuantity(fixture.assignedProductId, actualAmount) < actualAmount) {
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
    if (isColdFixture ? !refrigerationAccepts(fix, prod, this.fixtures) : isColdProduct) {
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
      if (isColdFixture ? !refrigerationAccepts(fix, prod, this.fixtures) : isColdProduct) {
        errors.push({ fixtureId, reason: 'storage_type_mismatch' });
        continue;
      }
      newMap[fixtureId] = productId;
      successCount++;
    }
    this.planogram = dict(newMap);
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
    if (isColdFixture ? !refrigerationAccepts(fix, prod, this.fixtures) : isColdProduct) {
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

      const effectiveCap = effectiveShelfCapacity(fix.maxCapacity, prod.shelfCapacity, getSkillModifier(this.skills, 'shelf_capacity_bonus'));
    const needed = effectiveCap - fix.currentStock;
    if (needed <= 0) {
      return { fixtureId, productId, applied: true, actualQuantity: 0, reason: 'fixture_full' };
    }

    const invSlot = this.inventory.find((i) => i.productId === productId);
    if (!invSlot || invSlot.quantity <= 0) {
      return { fixtureId, productId, applied: false, actualQuantity: 0, reason: 'no_inventory' };
    }

    const res = this.transferToShelf(fixtureId, productId, needed, true);
    if (res.success && res.actualQuantity > 0) {
      return { fixtureId, productId, applied: true, actualQuantity: res.actualQuantity, reason: 'success' };
    }

    return {
      fixtureId,
      productId,
      applied: false,
      actualQuantity: 0,
      reason: res.reason === 'no_space' ? 'fixture_full' : res.reason === 'in_cases' ? 'in_cases' : 'no_inventory',
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
    const shelfBuilding = fixtureBuilding(fix);
    const isXoiShelf = shelfBuilding === 'xoi';
    const isDrinkShelf = shelfBuilding === 'drink';

    // Kệ đã có sản phẩm và còn hàng → chỉ châm thêm
    if (fix.assignedProductId && fix.currentStock > 0) {
      const res = this.transferToShelf(fixtureId, fix.assignedProductId, 999, true);
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
        if (isColdFixture ? !refrigerationAccepts(fix, prod, this.fixtures) : prod.storageType === 'cold') return false;
        // Món xôi nấu ở quầy xôi chỉ tự châm vào kệ của tiệm xôi; kệ tiệm xôi chỉ tự nhận món xôi (giữ kệ tiệm xôi chỉ có món xôi).
        if (isXoiShelf !== XOI_DISH_IDS.has(inv.productId)) return false;
        // Kệ quán nước chỉ tự nhận đồ uống của quán; kệ tòa khác không tự nhận thành phẩm riêng của quán nước (vẫn bày tay được).
        if (isDrinkShelf && !DRINK_SHOP_PRODUCT_IDS.has(inv.productId)) return false;
        return true;
      })
      .sort((a, b) => {
        // Tủ mát: hàng bắt buộc giữ lạnh được xếp trước hàng thường chỉ bày lạnh cho tiện.
        if (isColdFixture) {
          const aCold = PRODUCT_MAP[a.productId]?.storageType === 'cold' ? 1 : 0;
          const bCold = PRODUCT_MAP[b.productId]?.storageType === 'cold' ? 1 : 0;
          if (aCold !== bCold) return bCold - aCold;
        }
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
      const res = this.transferToShelf(fixtureId, candidate.productId, 999, true);
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

      const effectiveCap = effectiveShelfCapacity(fix.maxCapacity, prod.shelfCapacity, getSkillModifier(this.skills, 'shelf_capacity_bonus'));
      const needed = Math.max(0, effectiveCap - fix.currentStock);
      if (needed <= 0) continue;

      const invSlot = this.inventory.find((i) => i.productId === productId);
      // Hàng nguyên thùng vẫn tính là có sẵn: bày tự động sẽ mở thùng khi cần.
      const available = invSlot?.quantity ?? 0;

      targets.push({
        fixtureId,
        productId,
        currentStock: fix.currentStock,
        maxCapacity: effectiveCap,
        needed,
        availableInInventory: available,
      });
    }
    // Kệ đã có món (không nằm trong sơ đồ) mà vơi hàng: nhân viên cũng tự châm lại từ kho.
    for (const fix of this.fixtures) {
      if (!isSalesFixture(fix) || fix.broken || !fix.assignedProductId || this.planogram[fix.id]) continue;
      const prod = PRODUCT_MAP[fix.assignedProductId];
      if (!prod) continue;
      const effectiveCap = effectiveShelfCapacity(fix.maxCapacity, prod.shelfCapacity, getSkillModifier(this.skills, 'shelf_capacity_bonus'));
      const needed = Math.max(0, effectiveCap - fix.currentStock);
      if (needed <= 0) continue;
      const invSlot = this.inventory.find((i) => i.productId === fix.assignedProductId);
      const available = invSlot?.quantity ?? 0;
      targets.push({ fixtureId: fix.id, productId: fix.assignedProductId, currentStock: fix.currentStock, maxCapacity: effectiveCap, needed, availableInInventory: available });
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
    this.restockJobClaims.set(fixtureId, actorId);
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
    return validateSupplierCartPure(supplierId, items, {
      level: this.playerData.level,
      money: this.playerData.money,
      day: this.clock.getTime().day,
      supplierState: this.market.suppliers?.[supplierId],
      coldCapacity: this.getColdCapacity(),
      reservedColdCount: this.reservedColdWarehouseCount(),
      ambientUnitsOf: (productId) => this.ambientUnitsOf(productId),
      ambientFreeCells: this.ambientFreeCells(),
      skillDiscount: getSkillModifier(this.skills, 'supplier_discount'),
    });
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

    for (const [index, line] of items.entries()) {
      // Dòng có thùng: giá vốn lô = tiền thật của dòng (đã giảm 5% theo thùng, cộng dồn ưu đãi số lượng lớn) chia số món;
      // trước đây lấy đơn giá sỉ lẻ nên giá vốn cao hơn tiền đã trả ~5%. Hàng lẻ giữ đơn giá sỉ như cũ.
      const cartLine = validation.lines?.[index];
      const unitCost = cartLine && cartLine.productId === line.productId && (cartLine.caseCount ?? 0) > 0 && line.quantity > 0
        ? Math.round(cartLine.lineTotal / line.quantity)
        : this.wholesaleUnitPrice(supplierId, line.productId, line.quantity);
      if (supplierState && supplier.stockPerProductPerDay !== undefined) supplierState.stockLeft[line.productId] = Math.max(0, (supplierState.stockLeft[line.productId] ?? 0) - line.quantity);
      const orderId = `ord-${++this.orderSequence}`;
      orderIds.push(orderId);
      const product = PRODUCT_MAP[line.productId];
      const caseCount = product?.caseSize ? Math.floor(line.quantity / product.caseSize) : 0;
      this.pendingOrders.push({
        id: orderId,
        productId: line.productId,
        quantity: line.quantity,
        unitCost,
        arrivalDay,
        supplierId,
        delivered: false,
        caseCount,
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
    const deliveredCount = receiveDeliveredOrders(arrived, day, {
      inventory: this.inventory,
      holdingArea: this.holdingArea,
      freeColdSlots: () => this.getColdCapacity() - this.getColdWarehouseCount(),
      freshExtraDays: getSkillModifier(this.skills, 'fresh_extra_day'),
    });

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
      const freeCold = Math.max(0, this.getColdCapacity() - this.getColdWarehouseCount());
      if (freeCold <= 0) {
        return { success: false, stowedQuantity: 0, reason: 'cold_warehouse_full' };
      }
      stowQty = Math.min(item.quantity, freeCold);
    } else {
      stowQty = this.ambientFitQuantity(item.productId, item.quantity);
      if (stowQty <= 0) {
        return { success: false, stowedQuantity: 0, reason: 'ambient_warehouse_full' };
      }
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

  /** Đặt trạng thái mở/đóng cửa; trả true nếu trạng thái hiện tại khớp `open` sau khi gọi. */
  public setStoreOpen(open: boolean): boolean {
    if (this.routineEnabled && open && (this.dailyRoutine.isControlLocked() || this.clock.getTime().hour >= 22)) {
      return false;
    }
    if (this.clock.getTime().isStoreOpen !== open) this.clock.toggleStoreStatus();
    return this.clock.getTime().isStoreOpen === open;
  }

  /** Châm kệ từ kho: áp sơ đồ bày hàng, rồi kệ có gán sản phẩm nhưng chưa nằm trong sơ đồ. Trả tổng số món đã châm. */
  public autoRestockShelves(): number {
    let restocked = this.applyPlanogram().totalRefilled;
    const plan = this.getPlanogram();
    for (const fix of this.getFixtures()) {
      if (!isSalesFixture(fix) || !fix.assignedProductId || plan[fix.id]) continue;
      const prod = PRODUCT_MAP[fix.assignedProductId];
      const cap = prod ? effectiveShelfCapacity(fix.maxCapacity, prod.shelfCapacity, this.getShelfCapacityBonus()) : fix.maxCapacity;
      const needed = cap - fix.currentStock;
      const have = this.getInventory().find((i) => i.productId === fix.assignedProductId);
      if (needed > 0 && have && have.quantity > 0) {
        const res = this.transferToShelf(fix.id, fix.assignedProductId, Math.min(needed, have.quantity), true);
        if (res.success && res.actualQuantity > 0) restocked += res.actualQuantity;
      }
    }
    return restocked;
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

    const diningTableId = dineIn && this.isDineInBasketEligible(customer) ? this.availableDiningTableId(customer.buildingId) : undefined;
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
    if(!Number.isFinite(p.x)||!Number.isFinite(p.y)||this.collisionSystem.isCollidingPlayer({x:p.x-10,y:p.y-4,width:20,height:14})) {
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
      autoBuyStalls: this.autoBuyStalls,
      stallShortfall: [...this.stallShortfall],
      autoBuyRules: structuredClone(this.autoBuyRules),
      ...(this.restockOptions ? { restockOptions: { ...this.restockOptions } } : {}),
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
      tax: structuredClone(this.taxState),
      ...(this.chainState.branches.length ? { chain: structuredClone(this.chainState) } : {}),
      priceHistory: structuredClone(this.priceHistory),
      heatmap: structuredClone(this.heatmap),
      reviews: this.reviewsManager.exportReviews(),
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
    this.sellingPrices = dict(saveData.sellingPrices);
    this.fixtures = saveData.storeLayout.fixtures.map((f) => ({ ...f }));
    this.storedFixtures = (saveData.storeLayout.storedFixtures ?? []).map(f => ({ ...f }));
    this.unlockedPlotIds = [...(saveData.storeLayout.unlockedPlotIds ?? [])];
    this.decorOwned = [...(saveData.storeLayout.decorOwned ?? [])];
    this.inventory = saveData.inventory.map((i) => ({ ...i }));
    this.holdingArea = (saveData.holdingArea ?? []).map((h) => ({ ...h }));
    this.planogram = dict(saveData.planogram);
    this.staffManager = new StaffManager(saveData);
    this.restockJobClaims = new RestockClaimManager();
    for (const member of this.staff) {
      if (member.workerTask) this.restockJobClaims.addFromWorkerTask(member.workerTask.fixtureId, member.id);
    }
    this.autoBuyEnabled = saveData.autoBuyEnabled ?? false;
    this.autoBuyStalls = saveData.autoBuyStalls ?? false;
    this.stallShortfall = new Set((saveData.stallShortfall ?? []).filter((id) => !!STALL_MAP[id]));
    this.autoBuyRules = this.validateAutoBuyRules(saveData.autoBuyRules ?? []);
    this.restockOptions = saveData.restockOptions ? normalizeRestockOptions(saveData.restockOptions) : undefined;
    this.processedAutoBuyDayIds = new Set(saveData.processedAutoBuyDayIds ?? []);
    this.autoBuyReports = structuredClone(saveData.autoBuyReports ?? {});
    this.questsManager.load(saveData);
    this.stallsMarketsManager.load(saveData);
    this.ensureSupplierMarket(saveData.worldTime.day);
    this.pendingOrders = (saveData.pendingOrders ?? []).map((order) => ({
      ...order,
      supplierId: order.supplierId ?? DEFAULT_SUPPLIER_ID,
      delivered: order.delivered ?? false,
    }));
    this.completedCheckoutIds = new Set(saveData.completedCheckoutIds ?? []);
    this.dailyRecords = saveData.dailyRecords ? structuredClone(saveData.dailyRecords) : {};
    this.closedDayIds = new Set(saveData.closedDayIds ?? []);
    this.regulars = dict(saveData.regulars ? structuredClone(saveData.regulars) : undefined);
    this.customerCredits = (saveData.customerCredits ?? []).filter(c => c && typeof c.id === 'string' && typeof c.regularId === 'string' && Number.isFinite(c.balance) && c.balance >= 0).map(c => ({ ...c }));
    this.customerCreditSequence = Math.max(saveData.customerCreditSequence ?? 0, ...this.customerCredits.map(c => Number(c.id.match(/^credit-(\d+)$/)?.[1] ?? 0)));
    this.diningManager = new DiningManager();
    this.diningManager.load(saveData);
    this.productionManager = new ProductionManager(saveData);
    this.priceHistory = sanitizePriceHistory(saveData.priceHistory);
    this.heatmap = sanitizeHeatmap(saveData.heatmap);
    this.heatmapLastTile.clear();
    this.taxState = normalizeTaxState(saveData.tax);
    this.chainState = normalizeChain(saveData.chain);
    this.productionJobSequence = Math.max(saveData.productionJobSequence ?? 0, ...this.productionManager.getRef().map(job => Number(job.id.match(/^job-(\d+)$/)?.[1] ?? 0)));
    this.reviewsManager.importReviews(saveData.reviews);
    this.securityManager.load({ security: saveData.security });
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
    // Cập nhật vị trí nhân viên thu ngân nếu quầy thu ngân đã di chuyển/xoay
    for (const member of this.staff) {
      if (member.role === 'cashier') {
        const post = this.getCashierPost(member.id);
        if (post) member.position = post;
      }
    }
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
