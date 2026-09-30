/**
 * Shared constants and domain types for "Tiệm Tạp Hóa Đầu Hẻm"
 */

export const TILE_SIZE = 32;
export const REFERENCE_WIDTH = 960;
export const REFERENCE_HEIGHT = 540;
export const COLD_WAREHOUSE_CAPACITY = 40;

export type Direction = 'up' | 'down' | 'left' | 'right';

export interface Vector2D {
  x: number;
  y: number;
}

export type StorageType = 'ambient' | 'cold';

export type ProductCategory =
  | 'instant_noodles'
  | 'snacks'
  | 'candy'
  | 'bottled_water'
  | 'soft_drinks'
  | 'milk'
  | 'bread'
  | 'eggs'
  | 'cooking_ingredients'
  | 'household';

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  spriteId: string;
  purchasePrice: number; // Integer VND
  baseSellingPrice: number; // Integer VND
  shelfCapacity: number;
  storageType: StorageType;
  expirationRules?: {
    daysToSpoil: number;
  };
  unlockLevel: number;
  demandProfile: {
    basePopularity: number; // 0 to 1
  };
  description: string;
}

export interface InventoryItem {
  productId: string;
  quantity: number;
  lots?: StockLot[];
}

export interface StockLot {
  quantity: number;
  expiresOnDay: number;
  unitCost?: number;
  provenance?: 'estimated' | 'known';
}

export interface SupplierConfig {
  id: string;
  name: string;
  description: string;
  unlockLevel: number;
  discountRate: number; // e.g. 0 for regular price, 0.1 for 10% discount, -0.05 for express surcharge
  minOrderValue: number; // minimum total purchase price in VND
  delayDays: number; // 0 for same-day delivery, 1 for next-day morning delivery
  note?: string;
}

export interface SupplierCartItem {
  productId: string;
  quantity: number;
}

export interface SupplierCartValidationResult {
  valid: boolean;
  supplierId: string;
  subtotal: number;
  discountAmount: number;
  totalCost: number;
  itemCount: number;
  coldItemCount: number;
  reasons: string[];
}

export type SuggestionReason =
  | 'out_of_stock'
  | 'low_stock'
  | 'best_seller'
  | 'fallback_trial';

export interface SuggestedCartItem {
  productId: string;
  quantity: number;
  unitPrice: number; // Unit purchase price with supplier discount applied
  estimatedCost: number;
  reason: SuggestionReason;
  salesVelocity?: number; // Average units sold per day
  isFallback: boolean;
  daysOfStockLeft?: number;
}

export interface RestockSuggestionResult {
  supplierId: string;
  items: SuggestedCartItem[];
  totalCost: number;
  totalQuantity: number;
  coldItemCount: number;
  appliedConstraints: string[];
  explanation: string;
}

export interface HoldingItem {
  id: string;
  productId: string;
  quantity: number;
  expiresOnDay: number;
  originalArrivalDay: number;
  unitCost: number;
  provenance?: 'estimated' | 'known';
}

export interface SupplierOrder {
  id: string;
  productId: string;
  quantity: number;
  unitCost: number;
  arrivalDay: number;
  supplierId?: string;
  delivered?: boolean;
  deliveryDay?: number;
}

export interface BasketItem {
  productId: string;
  quantity: number;
  unitPrice: number; // Unit price locked at time of picking up from shelf
  lots: StockLot[];
}

export interface CustomerState {
  id?: string;
  position: Vector2D;
  stage: 'to_shelf' | 'to_checkout' | 'checkout' | 'leaving';
  targetFixtureId: string;
  checkoutId?: string;
  cashierStaffId?: string;
  reservedProductId?: string;
  patience: number;
  checkoutWait: number;
  basket?: BasketItem[];
}

export interface CheckoutResult {
  success: boolean;
  checkoutId: string;
  paidTotal: number;
  itemCount: number;
  cogs?: number;
  items?: { productId: string; quantity: number }[];
  reason?: 'no_waiting_customer' | 'already_processed' | 'empty_basket' | 'store_closed' | 'success';
}

export type LedgerEntryType = 'purchase' | 'sale' | 'spoilage' | 'wage';

export interface LedgerEntry {
  id: string;
  day: number;
  type: LedgerEntryType;
  amount: number; // positive value in VND
  cogs?: number; // Cost of goods sold (for sales)
  quantity?: number; // Item count
  productId?: string;
  description: string;
  timestamp: string;
}

/** Thị trường động: mọi khóa là chuỗi để thêm thời tiết/sự kiện/thẻ bằng dữ liệu, không sửa lõi. */
export type ModifierChannel = 'demand' | 'traffic' | 'wholesalePrice' | 'supplierStock' | 'spoilage' | 'priceSensitivity';
export type ModifierSource = 'season' | 'climate' | 'weather' | 'time' | 'weekday' | 'event';

export interface ModifierTarget {
  categories?: ProductCategory[];
  tags?: string[];
  productIds?: string[];
}

/** Điều kiện kích hoạt: mọi trường có mặt phải khớp; mảng là "một trong". */
export interface ModifierWhen {
  season?: string[];
  climate?: string[];
  weather?: string[];
  timeBand?: string[];
  weekdays?: number[]; // 0 = Thứ Hai … 6 = Chủ Nhật
  event?: string[];
}

export interface ModifierRule {
  id: string;
  label: string; // nhãn đọc được, hiện trong phần giải thích
  source: ModifierSource;
  when: ModifierWhen;
  target?: ModifierTarget; // không có = áp dụng cho mọi sản phẩm
  effects: Partial<Record<ModifierChannel, number>>;
}

export interface WeatherState {
  day: number; // ngày của `today`
  today: string; // id thời tiết
  forecast: string[]; // [ngày mai, ngày kia]
}

export interface ActiveMarketEvent {
  id: string;
  startDay: number;
  endDay: number;
}

export interface MarketState {
  seed: string; // hạt giống cố định của thế giới/save
  weather: WeatherState; // chuỗi thời tiết gốc; sự kiện có thể ép thời tiết hiệu dụng khi đọc
  events: ActiveMarketEvent[]; // đang chạy hoặc đã lên lịch (báo trước)
  decidedThrough?: number; // đã quyết định lịch sự kiện tới hết ngày này
  lastEventStart?: Record<string, number>; // ngày bắt đầu gần nhất của từng sự kiện (khoảng cách tối thiểu)
}

export interface StallState {
  owned: string[]; // id quầy đã mở
  processedDayIds: number[]; // ngày đã tính doanh thu quầy (idempotent)
  lastReport?: StallDayReport; // kết quả ngày gần nhất để hiển thị
}

export interface StallDayReport {
  day: number;
  entries: Array<{ stallId: string; demand: number; servings: number; revenue: number; cogs: number; limitedBy?: string }>;
}

export interface QuestState {
  claimedDaily: Record<number, string[]>; // day -> daily quest ids đã nhận thưởng
  claimedStory: string[]; // story step ids đã nhận thưởng
}

export interface DailyRecord {
  day: number;
  closedAt?: string;
  revenue: number; // Total sales revenue
  cogs: number; // Cost of goods sold (actual lot cost)
  purchaseTotal: number; // Cash spent purchasing goods on this day
  spoilageCost: number; // Value of goods spoiled on this day
  wagesPaid: number; // Wages paid to staff on this day
  grossProfit: number; // revenue - cogs
  netProfit: number; // revenue - cogs - spoilageCost - wagesPaid
  customersServed: number; // Distinct customers served
  transactionsCount: number; // Distinct sales transactions
  itemsSold: number; // Total units of items sold
  spoilageCount: number; // Total units spoiled
  productSales?: Record<string, number>; // Units sold per productId on this day
  outOfStockWalkouts?: number; // Khách bỏ về vì kệ món đã chọn hết hàng
}

export type PlanogramMap = Record<string, string>; // fixtureId -> productId

export type PlanogramApplyReason =
  | 'success'
  | 'fixture_not_found'
  | 'not_sales_fixture'
  | 'invalid_product'
  | 'storage_type_mismatch'
  | 'product_mismatch'
  | 'no_inventory'
  | 'fixture_full';

export interface PlanogramApplyResult {
  fixtureId: string;
  productId: string;
  applied: boolean;
  actualQuantity: number;
  reason: PlanogramApplyReason;
}

export interface PlanogramBatchResult {
  totalRefilled: number;
  results: PlanogramApplyResult[];
}

export interface RestockJobTarget {
  fixtureId: string;
  productId: string;
  currentStock: number;
  maxCapacity: number;
  needed: number;
  availableInInventory: number;
}

export type FixtureType = 'shelf_wooden' | 'shelf_glass' | 'cashier_counter' | 'refrigerator' | 'warehouse_dry' | 'warehouse_cold' | 'warehouse_receiving';
export const isWarehouseFixture = (fixture: Pick<StoreFixture, 'type'>): boolean => fixture.type.startsWith('warehouse_');
export const isSalesFixture = (fixture: Pick<StoreFixture, 'type'>): boolean => fixture.type === 'shelf_wooden' || fixture.type === 'shelf_glass' || fixture.type === 'refrigerator';

export interface StoreFixture {
  id: string;
  type: FixtureType;
  tileX: number;
  tileY: number;
  widthTiles: number;
  heightTiles: number;
  rotation: 0 | 90 | 180 | 270;
  assignedProductId?: string;
  currentStock: number;
  stockLots?: StockLot[];
  maxCapacity: number;
  label: string;
}

export function getFixtureDimensions(fixture: Pick<StoreFixture, 'widthTiles' | 'heightTiles' | 'rotation'>): { widthTiles: number; heightTiles: number } {
  const rotated = fixture.rotation === 90 || fixture.rotation === 270;
  return rotated
    ? { widthTiles: fixture.heightTiles, heightTiles: fixture.widthTiles }
    : { widthTiles: fixture.widthTiles, heightTiles: fixture.heightTiles };
}

export interface PlayerData {
  name: string;
  level: number;
  experience: number;
  experienceToNextLevel: number;
  money: number; // VND
  reputation: number;
  position: Vector2D;
  direction: Direction;
}

export interface WorldTime {
  day: number;
  hour: number; // 6 to 22
  minute: number; // 0 to 59
  isStoreOpen: boolean;
  timeScale: number; // 1 real sec = N game seconds
}

// ==========================================
// Staff, Shifts, and Payroll
// ==========================================

export type StaffRole = 'cashier' | 'refill';

export type StaffShift = 'morning' | 'afternoon' | 'full_day';

export interface ShiftConfig {
  id: StaffShift;
  name: string;
  startHour: number; // 6 to 22
  endHour: number;   // 6 to 22
  wageMultiplier: number; // 0.5 for half day, 1.0 for full day
}

export const STAFF_SHIFTS: Record<StaffShift, ShiftConfig> = {
  morning: { id: 'morning', name: 'Ca sáng (06:00 - 14:00)', startHour: 6, endHour: 14, wageMultiplier: 0.5 },
  afternoon: { id: 'afternoon', name: 'Ca chiều (14:00 - 22:00)', startHour: 14, endHour: 22, wageMultiplier: 0.5 },
  full_day: { id: 'full_day', name: 'Cả ngày (06:00 - 22:00)', startHour: 6, endHour: 22, wageMultiplier: 1.0 },
};

export interface StaffMember {
  id: string;
  name: string;
  role: StaffRole;
  speed: number;
  accuracy: number;
  stamina: number;
  dailyWage: number;
  hiredOnDay: number;
  shift: StaffShift;
  assignedFixtureId?: string;
  position?: Vector2D;
  workerTask?: StaffWorkerTask;
  currentCheckoutId?: string;
  checkoutServiceRemaining?: number;
  lastWorkerError?: string;
}

export interface AutoBuyRule {
  id: string;
  productId: string;
  threshold: number;
  quantity: number;
  supplierId: string;
  priority: number;
  maxBudget: number;
}

export interface AutoBuySkip {
  ruleId: string;
  productId: string;
  reason: string;
}

export interface AutoBuyReport {
  day: number;
  placed: { ruleId: string; productId: string; quantity: number; supplierId: string; paidTotal: number }[];
  skipped: AutoBuySkip[];
}

export interface StaffWorkerTask {
  fixtureId: string;
  productId: string;
  stage: 'to_warehouse' | 'to_shelf';
  route: Vector2D[];
  carriedLots: StockLot[];
}

export interface StaffCandidate {
  id: string;
  name: string;
  role: StaffRole;
  speed: number;
  accuracy: number;
  stamina: number;
  dailyWage: number;
  hiringFee: number;
}

export type StaffSchedule = Record<string, StaffShift>; // staffId -> shift

export interface PayrollResult {
  day: number;
  totalGrossWage: number;
  previousDebt: number;
  totalDue: number;
  paidAmount: number;
  remainingDebt: number;
  unpaidStaffIds: string[];
}

export interface StoreLayout {
  widthTiles: number;
  heightTiles: number;
  fixtures: StoreFixture[];
  storedFixtures: StoreFixture[];
  unlockedPlotIds: string[];
}

export interface SaveGameData {
  id: string;
  schemaVersion: number;
  revision: number;
  createdAt: string;
  updatedAt: string;
  player: PlayerData;
  worldTime: WorldTime;
  storeLayout: StoreLayout;
  inventory: InventoryItem[];
  holdingArea?: HoldingItem[];
  planogram?: Record<string, string>;
  staff?: StaffMember[];
  staffSchedule?: Record<string, StaffShift>;
  wageDebt?: number;
  processedPayrollDayIds?: number[];
  autoBuyEnabled?: boolean;
  autoBuyRules?: AutoBuyRule[];
  processedAutoBuyDayIds?: number[];
  autoBuyReports?: Record<number, AutoBuyReport>;
  quests?: QuestState;
  stalls?: StallState;
  market?: MarketState;
  dailyRecords?: Record<number, DailyRecord>;
  currentDayRecord?: DailyRecord;
  ledger?: LedgerEntry[];
  closedDayIds?: number[];
  pendingOrders?: SupplierOrder[];
  customer?: CustomerState;
  customers?: CustomerState[];
  customerSpawnCooldown?: number;
  customerSequence?: number;
  completedCheckoutIds?: string[];
  statistics: {
    totalRevenue: number;
    totalCustomersServed: number;
    totalDaysPassed: number;
    totalSpoiled?: number;
  };
}

export interface TileMapLayer {
  name: string;
  data: number[];
  width: number;
  height: number;
  visible: boolean;
  opacity: number;
}

export interface GameTileMap {
  /** World tile row represented by local array row 0; omitted means 0. */
  originTileY?: number;
  width: number;
  height: number;
  tileWidth: number;
  tileHeight: number;
  layers: TileMapLayer[];
  collisionLayer: boolean[]; // true if solid
  storeBounds?: { left: number; right: number; top: number; bottom: number };
  /** Quầy ăn uống đã mở, để renderer vẽ; va chạm đã nằm sẵn trong collisionLayer. */
  stalls?: Array<{ id: string; tileX: number; tileY: number; widthTiles: number }>;
}

// Online domain records are intentionally versioned separately from the legacy local save.
export const MULTIPLAYER_PROTOCOL_VERSION = 1 as const;
export type WorldRole = 'owner' | 'member';

export interface GameAccount {
  id: string;
  displayName: string;
  photoUrl: string | null;
  createdAt: string;
}

export interface WorldMembership {
  accountId: string;
  role: WorldRole;
  joinedAt: string;
  lastSeenRevision: number;
}

export interface GameAvatar {
  accountId: string;
  position: Vector2D;
  direction: Direction;
  updatedAt: string;
}

export interface BusinessState {
  id: string;
  ownerAccountIds: string[];
  save: SaveGameData;
}

export interface GameWorld {
  id: string;
  name?: string;
  schemaVersion: number;
  protocolVersion: typeof MULTIPLAYER_PROTOCOL_VERSION;
  revision: number;
  createdAt: string;
  updatedAt: string;
  worldTime: WorldTime;
  memberships: WorldMembership[];
  businessIds: string[];
  avatars: GameAvatar[];
}

export type GameCommandPayload =
  | { type: 'move'; sequence: number; direction: Vector2D }
  | { type: 'restock'; fixtureId: string; productId: string; quantity: number }
  | { type: 'unstock'; fixtureId: string; quantity: number }
  | { type: 'checkout'; checkoutId: string; fixtureId: string }
  | { type: 'layout_move'; fixtureId: string; tileX: number; tileY: number; rotation: 0 | 90 | 180 | 270 }
  | { type: 'layout_store'; fixtureId: string }
  | { type: 'layout_retrieve'; fixtureId: string; tileX: number; tileY: number }
  | { type: 'layout_batch'; actions: Array<
      | { type: 'move'; fixtureId: string; tileX: number; tileY: number; rotation: 0 | 90 | 180 | 270 }
      | { type: 'store'; fixtureId: string }
      | { type: 'retrieve'; fixtureId: string; tileX: number; tileY: number }
      | { type: 'buy_plot'; plotId: string }
    > }
  | { type: 'buy_plot'; plotId: string }
  | { type: 'claim_quest'; questId: string }
  | { type: 'buy_stall'; stallId: string };

export interface GameCommand {
  protocolVersion: typeof MULTIPLAYER_PROTOCOL_VERSION;
  worldId: string;
  businessId: string;
  commandId: string;
  expectedRevision: number;
  payload: GameCommandPayload;
}

export interface GameInputIntent {
  accountId: string;
  sequence: number;
  direction: Vector2D;
}

export interface GameSnapshot {
  protocolVersion: typeof MULTIPLAYER_PROTOCOL_VERSION;
  world: GameWorld;
  businesses: BusinessState[];
  serverTime: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const nonEmptyString = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
const nonNegativeInteger = (value: unknown): value is number => Number.isSafeInteger(value) && (value as number) >= 0;
const finiteVector = (value: unknown): value is Vector2D => isRecord(value) &&
  typeof value.x === 'number' && Number.isFinite(value.x) && typeof value.y === 'number' && Number.isFinite(value.y);
const isDirection = (value: unknown): value is Direction => value === 'up' || value === 'down' || value === 'left' || value === 'right';

export function isGameAccount(value: unknown): value is GameAccount {
  return isRecord(value) && nonEmptyString(value.id) && nonEmptyString(value.displayName) &&
    (value.photoUrl === null || typeof value.photoUrl === 'string') && nonEmptyString(value.createdAt) &&
    !Number.isNaN(Date.parse(value.createdAt));
}

export function isWorldMembership(value: unknown): value is WorldMembership {
  return isRecord(value) && nonEmptyString(value.accountId) && (value.role === 'owner' || value.role === 'member') &&
    nonEmptyString(value.joinedAt) && !Number.isNaN(Date.parse(value.joinedAt)) && nonNegativeInteger(value.lastSeenRevision);
}

export function isGameAvatar(value: unknown): value is GameAvatar {
  return isRecord(value) && nonEmptyString(value.accountId) && finiteVector(value.position) &&
    isDirection(value.direction) && nonEmptyString(value.updatedAt) && !Number.isNaN(Date.parse(value.updatedAt));
}

export const CURRENT_SAVE_SCHEMA_VERSION = 3;

export interface SaveValidationResult {
  valid: boolean;
  versionStatus: 'supported' | 'unsupported_future' | 'legacy_migrate';
  error?: string;
  data?: SaveGameData;
}

export function isSaveGameData(value: unknown): value is SaveGameData {
  if (!isRecord(value) || (value.schemaVersion !== 2 && value.schemaVersion !== CURRENT_SAVE_SCHEMA_VERSION) || !nonEmptyString(value.id) ||
      !nonNegativeInteger(value.revision) || !nonEmptyString(value.createdAt) || !nonEmptyString(value.updatedAt)) {
    return false;
  }
  const player = value.player;
  if (!isRecord(player) || !nonNegativeInteger(player.money) || !nonNegativeInteger(player.experience) ||
      !nonNegativeInteger(player.level) || !finiteVector(player.position) || !isDirection(player.direction)) {
    return false;
  }
  const wt = value.worldTime;
  if (!isRecord(wt) || !Number.isSafeInteger(wt.day) || (wt.day as number) < 1 ||
      !Number.isSafeInteger(wt.hour) || (wt.hour as number) < 0 || (wt.hour as number) > 23 ||
      !Number.isSafeInteger(wt.minute) || (wt.minute as number) < 0 || (wt.minute as number) > 59) {
    return false;
  }
  const sl = value.storeLayout;
  if (!isRecord(sl) || !Array.isArray(sl.fixtures)) return false;
  if (!Array.isArray(value.inventory)) return false;
  const stats = value.statistics;
  if (!isRecord(stats) || !nonNegativeInteger(stats.totalRevenue) || !nonNegativeInteger(stats.totalCustomersServed)) {
    return false;
  }
  return true;
}

export function validateSaveGameData(value: unknown): SaveValidationResult {
  if (!isRecord(value)) {
    return { valid: false, versionStatus: 'supported', error: 'Dữ liệu bản lưu không phải là đối tượng hợp lệ' };
  }
  if (typeof value.schemaVersion !== 'number' || !Number.isSafeInteger(value.schemaVersion)) {
    return { valid: false, versionStatus: 'supported', error: 'Thiếu hoặc sai schemaVersion' };
  }
  if (value.schemaVersion > CURRENT_SAVE_SCHEMA_VERSION) {
    return {
      valid: false,
      versionStatus: 'unsupported_future',
      error: `Bản lưu thuộc phiên bản tương lai (${value.schemaVersion}) chưa được hỗ trợ`,
    };
  }
  if (value.schemaVersion === 2 && isSaveGameData(value)) {
    const migrated = structuredClone(value) as SaveGameData;
    migrated.schemaVersion = CURRENT_SAVE_SCHEMA_VERSION;
    migrated.storeLayout.storedFixtures = migrated.storeLayout.storedFixtures ?? [];
    migrated.storeLayout.unlockedPlotIds = migrated.storeLayout.unlockedPlotIds ?? [];
    return { valid: true, versionStatus: 'legacy_migrate', data: migrated };
  }
  if (value.schemaVersion < CURRENT_SAVE_SCHEMA_VERSION) {
    return {
      valid: true,
      versionStatus: 'legacy_migrate',
      error: `Cần chuyển đổi từ schema version ${value.schemaVersion}`,
    };
  }
  if (!isSaveGameData(value)) {
    return { valid: false, versionStatus: 'supported', error: 'Dữ liệu bản lưu bị hỏng hoặc thiếu trường hợp lệ' };
  }
  return { valid: true, versionStatus: 'supported', data: value };
}

export function createSaveBackupSnapshot(save: SaveGameData, backupId = 'local_save_backup'): SaveGameData {
  return {
    ...structuredClone(save),
    id: backupId,
    updatedAt: new Date().toISOString(),
  };
}

export function restoreSaveBackupSnapshot(backup: SaveGameData, targetId = 'local_save_default'): SaveGameData {
  return {
    ...structuredClone(backup),
    id: targetId,
    updatedAt: new Date().toISOString(),
  };
}

export interface TransferShelfResult {
  success: boolean;
  actualQuantity: number;
  reason?: 'fixture_not_found' | 'not_sales_fixture' | 'invalid_amount' | 'product_locked' | 'storage_mismatch' | 'no_inventory' | 'product_mismatch' | 'no_space' | 'success';
}

export interface UnstockShelfResult {
  success: boolean;
  actualQuantity: number;
  reason?: 'fixture_not_found' | 'not_sales_fixture' | 'empty_shelf' | 'invalid_amount' | 'cold_storage_full' | 'success';
}

export interface GameCommandResult {
  commandId: string;
  actorId: string;
  status: 'accepted' | 'rejected' | 'stale' | 'invalid' | 'forbidden' | 'duplicate_conflict';
  revision: number;
  actualQuantity?: number;
  reason?: string;
}

export function isBusinessState(value: unknown): value is BusinessState {
  if (!isRecord(value) || !nonEmptyString(value.id) || !Array.isArray(value.ownerAccountIds) ||
      !value.ownerAccountIds.every(nonEmptyString) || !isRecord(value.save)) return false;
  return isSaveGameData(value.save);
}

export function isGameWorld(value: unknown): value is GameWorld {
  if (!isRecord(value) || !nonEmptyString(value.id) || value.schemaVersion !== 1 ||
      value.protocolVersion !== MULTIPLAYER_PROTOCOL_VERSION || !nonNegativeInteger(value.revision) ||
      !nonEmptyString(value.createdAt) || !nonEmptyString(value.updatedAt) ||
      !Array.isArray(value.memberships) || !value.memberships.every(isWorldMembership) ||
      !Array.isArray(value.businessIds) || !value.businessIds.every(nonEmptyString) ||
      !Array.isArray(value.avatars) || !value.avatars.every(isGameAvatar) || !isRecord(value.worldTime)) return false;
  const memberIds = value.memberships.map(member => (member as WorldMembership).accountId);
  const avatarIds = value.avatars.map(avatar => (avatar as GameAvatar).accountId);
  return new Set(memberIds).size === memberIds.length && new Set(avatarIds).size === avatarIds.length &&
    (value.avatars as GameAvatar[]).every(avatar => memberIds.includes(avatar.accountId));
}

export function isGameCommand(value: unknown): value is GameCommand {
  if (!isRecord(value) || value.protocolVersion !== MULTIPLAYER_PROTOCOL_VERSION || !nonEmptyString(value.worldId) ||
      !nonEmptyString(value.businessId) || !nonEmptyString(value.commandId) || !nonNegativeInteger(value.expectedRevision) ||
      !isRecord(value.payload) || !nonEmptyString(value.payload.type)) return false;
  const p = value.payload;
  switch (p.type) {
    case 'move': return nonNegativeInteger(p.sequence) && finiteVector(p.direction);
    case 'restock': return nonEmptyString(p.fixtureId) && nonEmptyString(p.productId) && Number.isSafeInteger(p.quantity) && Number(p.quantity) > 0;
    case 'unstock': return nonEmptyString(p.fixtureId) && Number.isSafeInteger(p.quantity) && Number(p.quantity) > 0;
    case 'checkout': return nonEmptyString(p.checkoutId) && nonEmptyString(p.fixtureId);
    case 'layout_move': return nonEmptyString(p.fixtureId) && Number.isSafeInteger(p.tileX) && Number.isSafeInteger(p.tileY) && [0, 90, 180, 270].includes(p.rotation as number);
    case 'layout_store': return nonEmptyString(p.fixtureId);
    case 'layout_retrieve': return nonEmptyString(p.fixtureId) && Number.isSafeInteger(p.tileX) && Number.isSafeInteger(p.tileY);
    case 'layout_batch': return Array.isArray(p.actions) && p.actions.length > 0 && p.actions.length <= 64 && p.actions.every(action => {
      if (!isRecord(action) || !nonEmptyString(action.type)) return false;
      if (action.type === 'move') return nonEmptyString(action.fixtureId) && Number.isSafeInteger(action.tileX) && Number.isSafeInteger(action.tileY) && [0,90,180,270].includes(action.rotation as number);
      if (action.type === 'store') return nonEmptyString(action.fixtureId);
      if (action.type === 'retrieve') return nonEmptyString(action.fixtureId) && Number.isSafeInteger(action.tileX) && Number.isSafeInteger(action.tileY);
      if (action.type === 'buy_plot') return nonEmptyString(action.plotId);
      return false;
    });
    case 'buy_plot': return nonEmptyString(p.plotId);
    case 'claim_quest': return nonEmptyString(p.questId);
    case 'buy_stall': return nonEmptyString(p.stallId);
    default: return false;
  }
}

export function isGameSnapshot(value: unknown): value is GameSnapshot {
  if (!isRecord(value) || value.protocolVersion !== MULTIPLAYER_PROTOCOL_VERSION || !isGameWorld(value.world) ||
      !Array.isArray(value.businesses) || !value.businesses.every(isBusinessState) ||
      !nonEmptyString(value.serverTime) || Number.isNaN(Date.parse(value.serverTime))) return false;
  const world = value.world;
  const businesses = value.businesses as BusinessState[];
  return new Set(world.businessIds).size === world.businessIds.length &&
    new Set(businesses.map(business => business.id)).size === businesses.length &&
    world.businessIds.length === businesses.length &&
    businesses.every(business => world.businessIds.includes(business.id));
}
