/**
 * Shared constants and domain types for "Tiệm Tạp Hóa Đầu Hẻm"
 */

export const TILE_SIZE = 32;
export const REFERENCE_WIDTH = 960;
export const REFERENCE_HEIGHT = 540;
export const COLD_WAREHOUSE_CAPACITY = 40;
/** Số đơn vị hàng chứa được trong 1 ô kho thường (như game gốc tap-hoa-dau-hem). */
export const UNITS_PER_WAREHOUSE_CELL = 10;

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
  | 'household'
  | 'personal_care'
  | 'frozen'
  | 'fresh_produce'
  | 'health'
  | 'toys_stationery'
  | 'alcohol';

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
  /** Bán thành phẩm (vd. nếp ngâm, nếp chín): chỉ làm nguyên liệu, không bày bán và không có nhu cầu của khách. */
  intermediate?: boolean;
  /** Số ô kho chiếm cho mỗi UNITS_PER_WAREHOUSE_CELL đơn vị. Thiếu = suy từ shelfCapacity (hàng cồng kềnh = 2). */
  warehouseSize?: number;
  /** Nếu true: sản phẩm cold chỉ được bày vào tủ lạnh (không được vào kệ nhiệt độ thường). Default: false. */
  coldOnly?: boolean;
  /** Số lượng đơn vị trong 1 thùng/nhập nguyên kiện. Undefined = không bán theo thùng. */
  caseSize?: number;
}

export interface InventoryItem {
  productId: string;
  quantity: number;
  lots?: StockLot[];
}

/** Mẻ sản xuất đang chạy tại một trạm bếp. Nguyên liệu đã trừ khi bắt đầu; `inputCost` là tổng giá vốn các lô đã lấy. */
export interface ProductionJob {
  id: string;
  recipeId: string;
  stationId: string;
  startedDay: number;
  /** Giây game còn lại cho tới khi mẻ xong. */
  remaining: number;
  inputCost: number;
  /** Hạn dùng sớm nhất trong các lô nguyên liệu đã dùng (đầu ra không sống lâu hơn nguyên liệu). */
  inputExpiresOnDay: number;
}

export interface StockLot {
  quantity: number;
  expiresOnDay: number;
  unitCost?: number;
  provenance?: 'estimated' | 'known';
  /** Phần hao hạn chưa tròn ngày (0..1) tích lũy theo điều kiện bảo quản; thiếu = 0. */
  decayCarry?: number;
  /** Số thùng/case đang giữ (0 = không có case). Khi mở case: case giảm, quantity += caseSize. */
  caseCount?: number;
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
  // Thị trường nhà cung cấp (tùy chọn; thiếu = giá cố định, tồn vô hạn, giao mỗi ngày như cũ)
  stockPerProductPerDay?: number; // tồn mỗi món mỗi ngày ở điều kiện bình thường
  priceVolatility?: number; // biên độ dao động ngẫu nhiên xác định của giá mục tiêu (0.05 = ±5%)
  deliveryWeekdays?: number[]; // chỉ giao vào các thứ này (0 = Thứ Hai); thiếu = mọi ngày
  bulkTiers?: SupplierBulkTier[]; // ưu đãi số lượng lớn theo từng dòng hàng
  outageFactor?: number; // nhân xác suất ngừng cung khi có sự kiện khan hàng (0 = không bao giờ ngừng)
}

export interface SupplierBulkTier {
  minQty: number;
  discount: number; // 0.05 = giảm 5% đơn giá
}

/** Trạng thái thị trường của một nhà cung cấp trong một ngày. */
export interface SupplierDayState {
  day: number;
  priceIndex: Record<string, number>; // hệ số giá sỉ theo nhóm hàng hôm nay
  prevIndex: Record<string, number>; // hôm qua, để hiển thị chênh lệch
  reasons: Record<string, string[]>; // lý do chính của mức giá theo nhóm
  stockCap: Record<string, number>; // tồn đầu ngày theo sản phẩm
  stockLeft: Record<string, number>; // tồn còn lại hôm nay theo sản phẩm
  unavailable: string[]; // sản phẩm tạm ngừng cung hôm nay
}

export interface SupplierCartItem {
  productId: string;
  quantity: number;
}

export interface SupplierCartLine {
  productId: string;
  quantity: number;
  unitPrice: number; // đơn giá thực sau giá sỉ động, ưu đãi số lượng và chiết khấu mối
  lineTotal: number;
  bulkDiscount: number; // tỉ lệ ưu đãi số lượng lớn đã áp dụng
  /** Số case/thùng trong line này (0 = mua lẻ). */
  caseCount?: number;
}

export interface SupplierCartValidationResult {
  valid: boolean;
  supplierId: string;
  lines?: SupplierCartLine[];
  deliveryDay?: number;
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
  | 'slow_seller' // đã bán nhưng chậm: chỉ nhập lượng nhỏ theo tốc độ bán thật
  | 'fallback_trial';

export interface SuggestedCartItem {
  productId: string;
  quantity: number;
  unitPrice: number; // Unit purchase price with supplier discount applied
  estimatedCost: number;
  reason: SuggestionReason;
  salesVelocity?: number; // Average units sold per day
  isFallback: boolean; // true = hàng mới nhập thử (nhóm 60%)
  daysOfStockLeft?: number;
}

/** Tuỳ chỉnh của người chơi cho gợi ý nhập hàng; thiếu trường nào dùng mặc định (40% / 6 món / giữ lại 10%). */
export interface RestockSuggestionOptions {
  /** % ngân sách dành cho hàng đang bán (0–100); phần còn lại cho hàng mới nhập thử. */
  provenSharePct?: number;
  /** Số mặt hàng mới nhập thử tối đa mỗi lần gợi ý (0–20). */
  maxTrialProducts?: number;
  /** % tiền mặt giữ lại làm quỹ dự phòng lương/thuế, không đưa vào gợi ý (0–90). */
  cashReservePct?: number;
  /** Giữ thêm đủ tiền cho nợ lương, lương kỳ tới và thuế sắp nộp (lấy mức lớn hơn giữa nghĩa vụ và % ở trên). Mặc định bật. */
  protectObligations?: boolean;
}

/** Khoản tiền mặt phải chừa lại: tính từ tiệm thực tế, không phải % ước chừng. */
export interface CashObligations {
  wageDebt: number;
  nextWages: number;
  taxDue: number;
  taxDebt: number;
  total: number;
}

/** Phân bổ ngân sách gợi ý: hàng đang bán (mặc định 40%) và hàng mới nhập thử (60%); phần nhóm này không dùng hết được chuyển sang nhóm kia. */
export interface RestockBudgetSplit {
  /** Tiền còn dùng được cho gợi ý = min(ngân sách, tiền mặt) − giá trị giỏ đang có. */
  spendable: number;
  provenShare: number;
  /** Tiền mặt giữ lại không dùng cho gợi ý (quỹ dự phòng). */
  reserved: number;
  /** Phần nghĩa vụ lương/thuế trong khoản giữ lại (0 nếu tắt hoặc không có). */
  obligations?: number;
  provenTarget: number;
  trialTarget: number;
  provenSpent: number;
  trialSpent: number;
}

export interface RestockSuggestionResult {
  supplierId: string;
  items: SuggestedCartItem[];
  totalCost: number;
  totalQuantity: number;
  coldItemCount: number;
  appliedConstraints: string[];
  explanation: string;
  budget?: RestockBudgetSplit;
}

export interface HoldingItem {
  id: string;
  productId: string;
  quantity: number;
  expiresOnDay: number;
  originalArrivalDay: number;
  unitCost: number;
  provenance?: 'estimated' | 'known';
  decayCarry?: number;
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
  /** Số case/thùng trong đơn hàng này. */
  caseCount?: number;
}

export interface BasketItem {
  productId: string;
  quantity: number;
  unitPrice: number; // Unit price locked at time of picking up from shelf
  lots: StockLot[];
}

export type CustomerArrivalMode = 'walk' | 'motorbike' | 'car';

export interface StreetVehicleState {
  id: string;
  type: 'motorbike' | 'car' | 'bicycle' | 'minibus' | 'truck';
  variant: number;
  /** Chiều chạy: 'right' = tăng tọa độ trục chạy (sang đông / xuôi nam), 'left' = giảm (sang tây / ngược bắc). */
  direction: 'left' | 'right';
  position: Vector2D;
  speed: number;
  /** Đường (id trong `VEHICLE_ROADS`) xe đang chạy; thiếu = đường chính. */
  roadId?: string;
  /** Trục chạy: thiếu = 'x' (đường ngang); 'y' = đường dọc (xe nhìn trước/sau, `direction` 'right' = xuôi nam). */
  axis?: 'x' | 'y';
  hornTimer?: number;
  /** Tốc độ hiện tại (px/s) khi đang giảm tốc/dừng/tăng tốc; thiếu thì bằng `speed` (tốc độ chạy thông thường). */
  currentSpeed?: number;
  isDeparting?: boolean;
}

/** Người đi bộ nền trên vỉa hè (chỉ hình ảnh, không phải khách). */
export interface StreetPedestrianState {
  id: string;
  variant: number;
  direction: 'left' | 'right';
  state: 'waiting' | 'walking';
  activity?: 'stroll' | 'grocery' | 'jog' | 'student' | 'dog';
  position: Vector2D;
}

export type TrafficLightColor = 'green' | 'yellow' | 'red';
export type PedestrianSignal = 'dont_walk' | 'walk' | 'clearing';



export type LogisticsTruckType =
  | 'truck_refrigerated'
  | 'truck_dry_goods'
  | 'truck_beverage_sweets'
  | 'truck_fresh_produce'
  | 'truck_heavy_container';

export type LogisticsPhase =
  | 'approaching'
  | 'docked'
  | 'unloading'
  | 'loading'
  | 'completed'
  | 'departing';

export interface LogisticsWorkerState {
  id: string;
  x: number;
  y: number;
  direction: 'left' | 'right' | 'up' | 'down';
  carryingBox: boolean;
  boxType: 'carton' | 'foam_cold' | 'trolley' | 'produce_crate';
  target: 'truck' | 'dock' | 'warehouse';
}

export interface StoreLogisticsEventState {
  id: string;
  type: 'supplier_delivery' | 'outbound_party_order' | 'ambient_restock';
  truckType: LogisticsTruckType;
  truckPosition: Vector2D;
  direction: 'left' | 'right';
  doorsOpen: boolean;
  phase: LogisticsPhase;
  totalBoxes: number;
  boxesRemaining: number;
  statusText: string;
  productNames: string[];
  worker?: LogisticsWorkerState;
}

export interface StoreLogisticsState {
  activeEvent: StoreLogisticsEventState | null;
  loadingDockLocation: {
    dockX: number;
    dockY: number;
    truckBayX: number;
    truckBayY: number;
  };
}
export interface TrafficSignalState {
  vehicle: TrafficLightColor;
  pedestrian: PedestrianSignal;
  /** Giây còn lại của pha xe hiện tại. */
  secondsLeft: number;
}

export interface CustomerState {
  id?: string;
  position: Vector2D;
  stage: 'to_shelf' | 'to_checkout' | 'checkout' | 'to_table' | 'eating' | 'leaving';
  targetFixtureId: string;
  checkoutId?: string;
  cashierStaffId?: string;
  /** Quầy thu ngân (fixture) mà khách xếp hàng; thiếu = làn mặc định cũ. */
  cashierFixtureId?: string;
  reservedProductId?: string;
  patience: number;
  checkoutWait: number;
  basket?: BasketItem[];
  regularId?: string;
  regularName?: string;
  arrivalMode?: CustomerArrivalMode;
  vehicleSpot?: Vector2D;
  vehicleVariant?: number;
  /** Kẻ trộm lẻ: lấy hàng mà không trả tiền nếu không bị phát hiện ở quầy. Khách quen không bao giờ là kẻ trộm. */
  thief?: boolean;
  diningTableId?: string;
  diningTimeLeft?: number;
  /** Món đã mua ngay trước khi ngồi bàn; dùng để quyết định gọi thêm đồ uống kèm (giỏ hàng đã được xóa sau thanh toán). */
  diningProductIds?: string[];
  /** Tòa nhà khách đang mua sắm ('main' | 'xoi' | 'drink' | 'snack'); thiếu = tiệm chính (save cũ). */
  buildingId?: string;
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

/** Lời đánh giá bằng chữ của một lượt khách (mua xong hoặc bỏ về), sinh từ mẫu theo ngữ cảnh. */
export interface CustomerReview {
  id: string;
  day: number;
  hour: number;
  minute: number;
  stars: number;
  author: string;
  text: string;
  reason?: 'out_of_stock' | 'price' | 'wait' | 'store_closed' | 'unreachable';
  productId?: string;
  regularId?: string;
}

/** Sự cố an ninh (trộm lẻ, trộm đột nhập, kết quả công an) để hiển thị cho người chơi. */
export interface SecurityIncident {
  id: string;
  day: number;
  kind: 'burglary' | 'burglary_repelled' | 'shoplift_caught' | 'shoplift_escaped' | 'police_recovered' | 'police_closed';
  text: string;
  /** Giá trị mất (VND, theo giá vốn hoặc tiền mặt). */
  loss?: number;
  /** Giá trị thu hồi (tiền phạt hoặc công an trả lại). */
  recovered?: number;
}

export interface PoliceCase {
  day: number;
  value: number;
  resolveDay: number;
  caught: boolean;
}

export interface SecurityState {
  camera: boolean;
  /** Có báo công an khi bị trộm đột nhập không (mặc định có). */
  callPolice: boolean;
  incidents: SecurityIncident[];
  policeCases: PoliceCase[];
}

export type LedgerEntryType = 'purchase' | 'sale' | 'credit_sale' | 'credit_repayment' | 'bad_debt' | 'spoilage' | 'wage' | 'maintenance' | 'theft' | 'theft_cash' | 'recovery' | 'counterfeit' | 'tax';

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
  /** Chi nhánh phát sinh dòng này; thiếu = hub (`branch-chain`). */
  branchId?: string;
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
  priceIndex?: Record<string, number>; // chỉ số giá tham chiếu theo nhóm hàng (thiếu = 1)
  priceTargets?: Record<string, { target: number; demand: number; scarcity: number; cost: number }>; // lý do cho lần đổi giá gần nhất
  suppliers?: Record<string, SupplierDayState>; // thị trường từng nhà cung cấp (thiếu = giá cố định, tồn vô hạn)
}

export interface StallState {
  owned: string[]; // id quầy đã mở
  processedDayIds: number[]; // ngày đã tính doanh thu quầy (idempotent)
  lastReport?: StallDayReport; // kết quả ngày gần nhất để hiển thị
  progress?: StallDayProgress; // ngày đang bán dở: doanh thu cộng dần theo giờ
}

/** Tiến độ bán của quầy trong ngày chưa chốt (lưu để nạp lại giữa ngày không bán trùng). */
export interface StallDayProgress {
  day: number;
  slots: number; // số khung giờ bán đã tính (0–14, từ 08:00)
  entries: Record<string, { demand: number; servings: number; revenue: number; cogs: number; units: Record<string, number> }>;
}

export interface StallDayReport {
  day: number;
  entries: Array<{ stallId: string; demand: number; servings: number; revenue: number; cogs: number; limitedBy?: string }>;
}

export interface QuestState {
  claimedDaily: Record<number, string[]>; // day -> daily quest ids đã nhận thưởng
  claimedStory: string[]; // story step ids đã nhận thưởng
}

// ==========================================
// Party Orders (Đơn tiệc có hạn)
// ==========================================

export type PartyOrderStatus = 'pending' | 'accepted' | 'completed' | 'declined' | 'expired';

export interface PartyOrderItem {
  productId: string;
  quantity: number;
}

export interface PartyOrderReward {
  money: number;
  reputation: number;
  experience?: number;
}

export interface PartyOrderDef {
  id: string;
  title: string;
  customerName: string;
  description: string;
  items: PartyOrderItem[];
  reward: PartyOrderReward;
  durationDays: number;
  minPlayerLevel: number;
}

export interface ActivePartyOrder {
  orderId: string;
  status: PartyOrderStatus;
  availableDay: number;
  acceptedDay?: number;
  completedDay?: number;
  deadlineDay: number;
}

export interface PartyOrderState {
  available: ActivePartyOrder[];
  completedOrderIds: string[];
  lastGeneratedDay?: number;
}

// ==========================================
// Goals & Weekly Quests (Mục tiêu dài hạn & Tuần)
// ==========================================

export type GoalCategory = 'sales' | 'customers' | 'expansion' | 'reputation';

export interface LongTermGoalDef {
  id: string;
  category: GoalCategory;
  title: string;
  description: string;
  targetValue: number;
  rewardMoney: number;
  rewardReputation: number;
  rewardExperience?: number;
}

export interface WeeklyQuestDef {
  id: string;
  title: string;
  description: string;
  targetType: 'revenue' | 'customers' | 'items_sold' | 'party_orders';
  targetValue: number;
  rewardMoney: number;
  rewardReputation: number;
}

export interface GoalState {
  claimedGoalIds: string[];
  claimedWeeklyQuestIds: Record<number, string[]>; // weekNumber -> questIds
  /** Khóa `${goalId}@${năm mùa}`: mục tiêu ngày hội đã nhận trong năm đó. */
  claimedFestivalGoalKeys?: string[];
  /** Tiến độ các chương cốt truyện có lời thoại (khác chuỗi "chuyện xóm" ở QuestState). */
  story?: StoryState;
}

export interface StoryState {
  /** id chương -> ngày bắt đầu chương. */
  startedChapters: Record<string, number>;
  claimedChapters: string[];
}

// ==========================================
// Skills & Perks (Kỹ năng & Đặc quyền)
// ==========================================

export type SkillType = 'management' | 'marketing' | 'storage';

export interface PerkDef {
  id: string;
  skill: SkillType;
  tier: 1 | 2 | 3;
  name: string;
  description: string;
}

export interface SkillState {
  xp: Record<SkillType, number>;
  levels: Record<SkillType, number>;
  chosenPerks: string[];
}

export interface DailyRecord {
  day: number;
  closedAt?: string;
  revenue: number; // Total sales revenue
  cogs: number; // Cost of goods sold (actual lot cost)
  purchaseTotal: number; // Cash spent purchasing goods on this day
  spoilageCost: number; // Value of goods spoiled on this day
  wagesPaid: number; // Wages paid to staff on this day
  maintenanceCost?: number; // Chi phí bảo trì/sửa/mua mới nội thất trong ngày (thiếu = 0)
  theftCost?: number; // Giá vốn hàng và tiền bị trộm trong ngày (thiếu = 0)
  theftRecovered?: number; // Tiền thu hồi từ phạt kẻ trộm và công an trong ngày (thiếu = 0)
  counterfeitLoss?: number; // Mệnh giá tiền giả nhận nhầm trong ngày (thiếu = 0)
  badDebtCost?: number; // Khoản phải thu đã xóa nợ xấu trong ngày (thiếu = 0)
  taxPaid?: number; // Thuế đã trừ trong ngày (GTGT + TNCN thực nộp theo kê khai)
  taxHidden?: number; // Phần thuế bị khai bớt trong ngày (chưa nộp, có thể bị truy thu khi kiểm tra)
  taxBackPaid?: number; // Thuế truy thu khi kiểm tra, ghi vào ngày bị kiểm tra
  taxPenalty?: number; // Tiền phạt khi kiểm tra thuế trong ngày
  grossProfit: number; // revenue - cogs
  netProfit: number; // revenue - cogs - spoilageCost - wagesPaid
  customersServed: number; // Distinct customers served
  transactionsCount: number; // Distinct sales transactions
  itemsSold: number; // Total units of items sold
  spoilageCount: number; // Total units spoiled
  productSales?: Record<string, number>; // Units sold per productId on this day
  stallServings?: Record<string, number>; // Suất bán ra theo id quầy ăn uống trong ngày (tính vào mục tiêu ngày hội)
  stallRevenue?: Record<string, number>; // Doanh thu theo id quầy trong ngày (đã nằm trong `revenue`; thiếu ở ngày cũ)
  stallCogs?: Record<string, number>; // Giá vốn theo id quầy trong ngày (đã nằm trong `cogs`; thiếu ở ngày cũ)
  outOfStockWalkouts?: number; // Khách bỏ về vì kệ món đã chọn hết hàng
  priceWalkouts?: number; // Khách bỏ hàng vì giá cao hơn giá thị trường
  averageStars?: number;
  ratingCount?: number;
}

export type PlanogramMap = Record<string, string>; // fixtureId -> productId

export type PlanogramApplyReason =
  | 'success'
  | 'fixture_not_found'
  | 'not_sales_fixture'
  | 'fixture_broken'
  | 'invalid_product'
  | 'storage_type_mismatch'
  | 'product_mismatch'
  | 'no_inventory'
  /** Kho chỉ còn hàng nguyên thùng, cần mở thùng trước. */
  | 'in_cases'
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

export type FixtureType = 'decor' | 'shelf_wooden' | 'shelf_glass' | 'cashier_counter' | 'refrigerator' | 'dining_table' | 'kitchen_station' | 'warehouse_dry' | 'warehouse_cold' | 'warehouse_receiving';
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
  /** Độ hao mòn 0..100 của kệ/tủ mát (thiếu = 0). Chỉ tăng qua đêm, giảm khi bảo trì/sửa. */
  wear?: number;
  /** Đang hỏng: nhẹ (sửa được) hoặc nặng (phải mua mới). Kệ hỏng không bán và không châm hàng được. */
  broken?: 'minor' | 'major';
  /** Ô phụ của một kệ/tủ: dùng chung vị trí với kệ cha, mỗi ô giữ một sản phẩm (các ô cùng kệ được bày khác nhóm hàng). */
  parentId?: string;
  /** Mã món trong danh mục mua thêm (để chọn ảnh/nhãn). */
  shopId?: string;
  /** Tổng số ô hàng của kệ/tủ (ô chính + phụ); thiếu = theo loại. */
  slotCount?: number;
}

export const isSlotChild = (fixture: Pick<StoreFixture, 'parentId'>): boolean => !!fixture.parentId;
/** Số ô phụ thêm cho kệ/tủ (ô chính chính là kệ cha). */
export function extraSlotCount(fixture: Pick<StoreFixture, 'type' | 'widthTiles' | 'heightTiles' | 'slotCount'>): number {
  if (fixture.slotCount !== undefined) return Math.max(0, fixture.slotCount - 1);
  if (fixture.type === 'shelf_wooden' || fixture.type === 'shelf_glass') return 11;
  if (fixture.type === 'refrigerator') return fixture.widthTiles * fixture.heightTiles >= 2 ? 23 : 7;
  return 0;
}
export const slotGroup = <T extends Pick<StoreFixture, 'id' | 'parentId'>>(fixtures: readonly T[], fixture: Pick<StoreFixture, 'id' | 'parentId'>): T[] => {
  const root = fixture.parentId ?? fixture.id;
  return fixtures.filter(item => item.id === root || item.parentId === root);
};
/** Đảm bảo mỗi kệ có đủ ô phụ, ô phụ khớp vị trí/độ hỏng của kệ cha, bỏ ô mồ côi. */
export function syncSlotChildren(fixtures: StoreFixture[]): StoreFixture[] {
  const out: StoreFixture[] = [];
  for (const parent of fixtures.filter(item => !item.parentId)) {
    out.push(parent);
    const need = extraSlotCount(parent);
    for (let n = 2; n <= need + 1; n++) {
      const id = `${parent.id}#s${n}`;
      const existing = fixtures.find(item => item.id === id);
      out.push({
        id, type: parent.type, widthTiles: parent.widthTiles, heightTiles: parent.heightTiles,
        currentStock: 0, stockLots: [], ...existing,
        tileX: parent.tileX, tileY: parent.tileY, rotation: parent.rotation, parentId: parent.id, label: `${parent.label} · ô ${n}`,
        wear: parent.wear, broken: parent.broken,
        maxCapacity: Math.min(20, parent.maxCapacity),
      });
    }
  }
  return out;
}

/** Kệ/tủ mát đang dùng được cho bán hàng và châm hàng (không hỏng). */
export const isUsableSalesFixture = (fixture: Pick<StoreFixture, 'type' | 'broken'>): boolean => isSalesFixture(fixture) && !fixture.broken;

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
  /** Recent per-visit customer ratings; reputation remains a bounded cumulative score. */
  ratings?: number[];
  position: Vector2D;
  direction: Direction;
  activeTitle?: string;
  unlockedTitles?: string[];
  /** XP dư tích lũy hướng tới sao prestige tiếp theo (chỉ tăng khi đã ở cấp tối đa); thiếu = 0. */
  prestigeXp?: number;
  /** Số sao prestige đã đạt (0..PRESTIGE_MAX_STARS); thiếu = 0. */
  prestigeStars?: number;
}

export interface TitleDef {
  id: string;
  name: string;
  description: string;
  category: 'level' | 'wealth' | 'reputation' | 'service' | 'orders';
  icon: string;
  requirement: {
    type: 'level' | 'totalRevenue' | 'totalCustomers' | 'daysPassed' | 'partyOrders' | 'reputation';
    threshold: number;
  };
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

export type StaffRole = 'cashier' | 'refill' | 'security' | 'drink_staff' | 'drink_security';

/** Tòa nhà mà nhân viên phụ trách (undefined = tất cả tòa). */
export type StaffBuilding = 'main' | 'xoi' | 'drink' | 'snack' | undefined;

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
  assignedBuilding?: StaffBuilding; /** Tòa nhà nhân viên phụ trách (undefined = tất cả). */
  position?: Vector2D;
  workerTask?: StaffWorkerTask;
  diningTask?: StaffDiningTask;
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
  fixtureId: string; /** ID của kệ đang châm (hoặc 'auto' cho chế độ tự động). */
  productId: string; /** productId của kệ hiện tại (dùng khi fixtureId='auto'). */
  stage: 'to_warehouse' | 'to_shelf';
  route: Vector2D[];
  carriedLots: StockLot[];
  assignedBuilding?: StaffBuilding; /** Tòa nhà của task (giúp nhân viên biết nơi làm việc). */
  autoRestock?: boolean; /** Nếu true, nhân viên tự động châm tất cả kệ thiếu hàng. */
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
  assignedBuilding?: StaffBuilding; /** Tòa nhà đề xuất nhân viên này phụ trách. */
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
  /** Đồ trang trí tường/biển/quầy đã mua (đồ sàn là fixture type 'decor'). */
  decorOwned?: string[];
  /**
   * Vị trí đặt các tòa (OpenSpec `open-world-land-grid`). Thiếu = vị trí đặt mặc định (save cũ). Ý nghĩa (tòa trùng, lô sai,
   * ô sàn mở rộng hợp lệ) do `validatePlacements`/`validateFootprint` của game-data kiểm.
   */
  buildingPlacements?: BuildingPlacementRecord[];
  /**
   * Các lô đã MUA (OpenSpec `open-world-land-reclamation` D4). Lô W0 coi như đã sở hữu nên migration 6→7
   * đưa cả 4 lô W0 vào đây; lô đợt mới chỉ thêm sau khi `buy_parcel`. Thiếu = chưa ghi (save cũ).
   */
  ownedParcelIds?: string[];
}

export interface BuildingPlacementRecord {
  buildingId: string;
  parcelId: string;
  originX: number;
  originY: number;
  /** Lô đã sở hữu (ban đầu = 1 lô; D7b mở rộng sang lô kề thì thêm vào danh sách). */
  parcelIds?: string[];
  /**
   * Ô sàn đã xây thêm ngoài sàn gốc của mẫu tòa (tọa độ thế giới; OpenSpec `open-world-main-expansion`, schema 5).
   * Thiếu = chưa mở rộng. Chỉ tiệm chính dùng ở Bước 2.
   */
  floorTiles?: Array<{ x: number; y: number }>;
  /** Tòa đang thi công sau khi dời (OpenSpec `open-world-building-relocation`): cửa bị chặn, không sinh khách; mở lại khi ngày ≥ giá trị này. */
  constructionUntilDay?: number;
  /**
   * Tài khoản đã XÂY tòa này (OpenSpec `open-world-coop-land` D4). Save chơi một mình ghi `'local'`; save hợp tác ghi accountId chủ hẻm.
   * OPTIONAL (save cũ / land-reclamation chưa có) — migration 7→8 điền `'local'` cho mọi bản ghi chưa có.
   */
  builtBy?: string;
  /**
   * Kiểu instance tòa (OpenSpec `open-world-building-types`, Schema 9) — chuỗi id kiểu mà refactor BuildingId→string sẽ dùng,
   * ví dụ 'grocery_main' | 'xoi_shop' | 'drink_shop' | 'snack_shop'. OPTIONAL: bản chưa di cư (schema ≤ 8) vẫn hợp lệ.
   * Migration 8→9 điền cho 4 instance cũ khi CHƯA có (KHÔNG ghi đè); buildingId khác giữ nguyên không suy diễn. Refactor
   * dùng typeId làm nguồn là việc SAU (chờ máy thật), KHÔNG ở task thuần schema này.
   */
  typeId?: string;
}

/** Vị trí chọn khi mua tòa (lô + gốc x), tùy chọn. */
export const isPlotPlacement = (value: unknown): boolean =>
  value === undefined || (isRecord(value) && nonEmptyString(value.parcelId) && Number.isSafeInteger(value.originX));

/** Số ô sàn mở rộng tối đa chấp nhận trong một save (chặn save sửa tay phình to; ngân sách thật nhỏ hơn nhiều). */
export const MAX_FOOTPRINT_TILES = 400;

/** Vị trí đặt tòa đúng hình dạng (chuỗi id không rỗng, gốc là số nguyên, ô sàn mở rộng là cặp số nguyên). */
export function isBuildingPlacementRecord(value: unknown): value is BuildingPlacementRecord {
  if (!isRecord(value) || !nonEmptyString(value.buildingId) || !nonEmptyString(value.parcelId)
    || !Number.isSafeInteger(value.originX) || !Number.isSafeInteger(value.originY)) return false;
  if (value.constructionUntilDay !== undefined && !(Number.isSafeInteger(value.constructionUntilDay) && Number(value.constructionUntilDay) >= 1)) return false;
  // parcelIds là danh sách id lô (tùy chọn)
  if (value.parcelIds !== undefined && (!Array.isArray(value.parcelIds) || value.parcelIds.some(id => !nonEmptyString(id)))) return false;
  // builtBy là accountId/'local' của người xây (tùy chọn — nếu có phải là chuỗi không rỗng)
  if (value.builtBy !== undefined && !nonEmptyString(value.builtBy)) return false;
  // typeId là kiểu instance tòa (tùy chọn — nếu có phải là chuỗi không rỗng)
  if (value.typeId !== undefined && !nonEmptyString(value.typeId)) return false;
  const tiles = value.floorTiles;
  return tiles === undefined || (Array.isArray(tiles) && tiles.length <= MAX_FOOTPRINT_TILES
    && tiles.every(tile => isRecord(tile) && Number.isSafeInteger(tile.x) && Number.isSafeInteger(tile.y)));
}

/** Một lần cơ quan thuế kiểm tra bất ngờ. */
export interface TaxAuditRecord {
  day: number;
  /** Tổng truy thu + phạt (0 nếu sổ sách sạch). */
  total: number;
  findings: string[];
  clean: boolean;
}

export interface TaxState {
  /** Đang chọn khai bớt: mỗi lần đóng ngày chỉ nộp một phần thuế, phần còn lại bị giấu và có thể bị truy thu. */
  underDeclare: boolean;
  /** Tổng thuế đã giấu mà chưa qua kiểm tra. */
  hiddenTax: number;
  /** Tiền truy thu/phạt chưa trả hết do thiếu tiền mặt, thu dần ở các lần đóng ngày sau. */
  debt: number;
  audits: TaxAuditRecord[];
  cleanAudits: number;
}

/** Báo cáo một ngày của chi nhánh (giữ tối đa `BRANCH_REPORT_LIMIT` ngày gần nhất). */
export interface BranchDayReport {
  day: number;
  revenue: number;
  cogs: number;
  wages: number;
  spoilageLoss: number;
  unitsSold: number;
  /** Món hết hàng khiến cầu không được đáp ứng ("bán hụt"). */
  stockouts: string[];
}

/** Mức giá chi nhánh: hệ số giá bán và cầu nằm ở `game-data/store-types.ts` (`BRANCH_PRICE_MODES`). */
export type BranchPriceMode = 'low' | 'normal' | 'high';

/** Cách điều hành chi nhánh từ xa (bảng điều hành nhẹ, OpenSpec `branch-chain` 6.1/6.4); thiếu = mặc định. */
export interface BranchPolicy {
  priceMode: BranchPriceMode;
  /** Có thuê quản lý: tốn thêm lương mỗi ngày, đổi lại chạy nền gần bằng điều hành trực tiếp. */
  manager: boolean;
}

export const DEFAULT_BRANCH_POLICY: Readonly<BranchPolicy> = Object.freeze({ priceMode: 'normal', manager: false });

/** Một chi nhánh (kho, danh tiếng, báo cáo). Chưa chứa save mô phỏng đầy đủ; xem OpenSpec `branch-chain` D1/D2. */
export interface BranchSave {
  id: string;
  storeType: string;
  name: string;
  openedDay: number;
  stock: InventoryItem[];
  reputation: number;
  /** Ngày cuối đã chạy nền; chống tính trùng khi nạp lại/replay. */
  lastBackgroundDay: number;
  reports: BranchDayReport[];
  totalRevenue: number;
  /** Cách điều hành; thiếu = `DEFAULT_BRANCH_POLICY`. */
  policy?: BranchPolicy;
}

/** Chuỗi chi nhánh; `SaveGameData.chain` thiếu = chuỗi một cơ sở (hub). Ví chung = `player.money`, kho tổng = kho hub. */
export interface ChainState {
  branches: BranchSave[];
  /** 'hub' hoặc id chi nhánh. */
  activeBranchId: string;
  nextBranchSeq: number;
}

export const BRANCH_REPORT_LIMIT = 30;

export interface SaveGameData {
  /** Chuỗi chi nhánh (tùy chọn, không nâng schema). */
  chain?: ChainState;
  /** Trạng thái thuế (khai bớt, nợ, lịch sử kiểm tra); thiếu ở save cũ = mặc định. */
  tax?: TaxState;
  id: string;
  schemaVersion: number;
  revision: number;
  createdAt: string;
  updatedAt: string;
  player: PlayerData;
  /** Giá bán do chủ tiệm đặt; món không có khóa dùng giá gợi ý catalog. */
  sellingPrices?: Record<string, number>;
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
  /** Mỗi sáng tự nhập nguyên liệu cho quầy ăn uống đã mở (độc lập với quy tắc theo mặt hàng). */
  autoBuyStalls?: boolean;
  /** Quầy đã nhập một phần (thiếu tiền/hàng) và đang chờ mua nốt giữa ngày. */
  stallShortfall?: string[];
  autoBuyRules?: AutoBuyRule[];
  /** Cài đặt gợi ý nhập hàng của người chơi (tỷ lệ chia, số món thử, quỹ dự phòng); thiếu = mặc định. */
  restockOptions?: RestockSuggestionOptions;
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
  /** Bộ đếm tuần tự để sinh ID đơn nhập/sổ cái xác định (không dùng giờ thật hay ngẫu nhiên). */
  orderSequence?: number;
  ledgerSequence?: number;
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
  regulars?: Record<string, RegularCustomerProgress>;
  /** Khoản phải thu khách quen; thiếu ở save cũ tương đương danh sách trống. */
  customerCredits?: CustomerCreditAccount[];
  customerCreditSequence?: number;
  diningDirtyTableIds?: string[];
  productionJobs?: ProductionJob[];
  productionJobSequence?: number;
  /** Giá bán thực đã chốt cuối mỗi ngày theo sản phẩm (tối đa 60 điểm gần nhất); ngày không có điểm = thiếu dữ liệu. */
  priceHistory?: Record<string, Array<{ day: number; price: number }>>;
  /** Số lượt khách bước vào từng ô (khóa "x,y") theo ngày, giữ tối đa 7 ngày gần nhất; chỉ tổng hợp, không lưu đường đi cá nhân. */
  heatmap?: Record<number, Record<string, number>>;
  partyOrders?: PartyOrderState;
  goals?: GoalState;
  skills?: SkillState;
  /** Lời đánh giá gần đây của khách (tối đa 60), mới nhất ở cuối. */
  reviews?: CustomerReview[];
  /** An ninh: camera, báo công an, sự cố gần đây và hồ sơ công an đang mở. */
  security?: SecurityState;
  /** Chỉ số tier kho hàng (0–3). Thiếu = 0. */
  warehouseTier?: number;
  /** Số kệ kho storage_rack đã mua. Thiếu = 0. */
  storageRackCount?: number;
  /**
   * Trạng thái thế giới mở (OpenSpec `open-world-land-reclamation`, schema 7). Thiếu ở save cũ = chưa khai hoang
   * (chỉ W0 mở, không công trình) — migration 6→7 gieo mặc định.
   */
  world?: WorldOpenState;
}

export interface RegularCustomerProgress {
  id: string;
  friendship: number; // Điểm thân thiết 0–100+
  unlockedPerks: string[]; // Danh sách perk đã mở
  discoveredProductIds: string[]; // Món ưa thích đã từng bán thành công
  totalVisits: number;
  lastVisitDay?: number;
  lastFriendshipDay?: number; // Giới hạn trần +2 điểm thân thiết mỗi ngày
}

export interface StaffDiningTask {
  fixtureId: string;
  route: Vector2D[];
  workRemaining: number;
}

export interface CustomerCreditAccount {
  id: string;
  regularId: string;
  checkoutId: string;
  issuedDay: number;
  dueDay: number;
  amount: number;
  balance: number;
  status: 'open' | 'overdue' | 'defaulted' | 'paid';
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
  /** World tile column represented by local array column 0; omitted means 0 (thế giới mở: vùng chơi có thể bắt đầu ở cột âm). */
  originTileX?: number;
  /** World tile row represented by local array row 0; omitted means 0. */
  originTileY?: number;
  width: number;
  height: number;
  tileWidth: number;
  tileHeight: number;
  layers: TileMapLayer[];
  collisionLayer: boolean[]; // true if solid
  storeBounds?: { left: number; right: number; top: number; bottom: number };
  /** Các tòa nhà trên bản đồ và trạng thái mở (hình học nằm ở BUILDINGS của game-data). */
  /** `top` = hàng tường sau hiện tại của tòa (đã tính mảnh mở rộng phía bắc); thiếu = biên gốc. */
  buildings?: MapBuilding[];
  /** Quầy ăn uống đã mở, để renderer vẽ; va chạm đã nằm sẵn trong collisionLayer. */
  stalls?: Array<{ id: string; tileX: number; tileY: number; widthTiles: number }>;
}

/** Một tòa đã đặt trên bản đồ (OpenSpec `open-world-building-relocation`): hình học suy từ vị trí đặt; tòa chưa mua không có mục. */
export interface MapBuilding {
  id: string;
  open: boolean;
  top?: number;
  /** Biên gốc, biên tối đa (gồm mở rộng bắc), ô cửa, ô vỉa hè trước cửa. */
  bounds?: { left: number; right: number; top: number; bottom: number };
  maxBounds?: { left: number; right: number; top: number; bottom: number };
  doorTiles?: Array<{ x: number; y: number }>;
  entranceTile?: { x: number; y: number };
  /** Mái hiên mặt tiền (px) và mép dưới mái nơi nước mưa chảy (px). */
  awning?: { x0: number; x1: number };
  eaveY?: number;
  /** Tòa phụ có sàn mở rộng: ô sàn thêm (kể cả ngoài `maxBounds`), để tra tòa theo ô. */
  floorTiles?: Array<{ x: number; y: number }>;
}

type TileMapFrame = Pick<GameTileMap, 'width' | 'height' | 'originTileX' | 'originTileY'>;

/** Ô thế giới (x, y) nằm trong mảng ô của bản đồ. */
export function tileInMap(map: TileMapFrame, x: number, y: number): boolean {
  const lx = x - (map.originTileX ?? 0);
  const ly = y - (map.originTileY ?? 0);
  return lx >= 0 && lx < map.width && ly >= 0 && ly < map.height;
}

/** Chỉ số mảng của ô thế giới (x, y); không kiểm biên (gọi `tileInMap` trước nếu ô có thể nằm ngoài). */
export function tileIndex(map: TileMapFrame, x: number, y: number): number {
  return (y - (map.originTileY ?? 0)) * map.width + (x - (map.originTileX ?? 0));
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
  /** Tên hiển thị trên đầu nhân vật khi chơi chung (hẻm cũ có thể thiếu). */
  displayName?: string;
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
  | { type: 'checkout'; checkoutId: string; fixtureId: string; onCredit?: boolean; dineIn?: boolean }
  | { type: 'repay_customer_credit'; creditId: string }
  | { type: 'start_production'; recipeId: string; stationId: string }
  | { type: 'clean_dining_table'; fixtureId: string }
  | { type: 'assign_dining_cleanup'; staffId: string; fixtureId: string }
  | { type: 'set_price'; productId: string; price: number | null }
  | { type: 'reset_prices' }
  | { type: 'layout_batch'; actions: Array<
      | { type: 'move'; fixtureId: string; tileX: number; tileY: number; rotation: 0 | 90 | 180 | 270 }
      | { type: 'store'; fixtureId: string }
      | { type: 'retrieve'; fixtureId: string; tileX: number; tileY: number }
      | { type: 'buy_plot'; plotId: string; placement?: { parcelId: string; originX: number } }
      | { type: 'expand_footprint'; buildingId: string; tiles: Array<{ x: number; y: number }> }
      | { type: 'relocate_building'; buildingId: string; placement: { parcelId: string; originX: number } }
      | { type: 'buy_decor'; decorId: string }
      | { type: 'buy_fixture'; shopId: string; tileX: number; tileY: number; rotation: 0 | 90 | 180 | 270 }
      | { type: 'buy_warehouse_tier'; tier: number }
      | { type: 'buy_storage_rack' }
    > }
  | { type: 'buy_plot'; plotId: string; placement?: { parcelId: string; originX: number } }
  | { type: 'claim_quest'; questId: string }
  | { type: 'buy_stall'; stallId: string }
  | { type: 'hire_staff'; candidateId: string }
  | { type: 'pay_wage_debt' }
  | { type: 'set_staff_shift'; staffId: string; shift: StaffShift }
  | { type: 'assign_refill_job'; staffId: string; fixtureId: string }
  | { type: 'dispose_stock'; productId: string; quantity: number }
  /** Mở thùng trong kho: chỉ đổi thùng thành hàng lẻ, tổng hàng không đổi. */
  | { type: 'open_case'; productId: string; count: number }
  | { type: 'store_status'; isOpen: boolean }
  | { type: 'set_tax_declaration'; underDeclare: boolean }
  | { type: 'open_branch'; storeType: string; name?: string; branchId?: string }
  | { type: 'switch_branch'; branchId: string }
  | { type: 'transfer_stock'; branchId: string; items: Array<{ productId: string; quantity: number }> }
  | { type: 'return_stock'; branchId: string; items: Array<{ productId: string; quantity: number }> }
  | { type: 'set_branch_policy'; branchId: string; policy: BranchPolicy }
  | { type: 'advance_day' }
  | { type: 'stow'; holdingId: string }
  | { type: 'stow_all' }
  | { type: 'planogram_assignment'; fixtureId: string; productId: string | null }
  | { type: 'planogram_restock'; fixtureId: string }
  | { type: 'auto_restock' }
  | { type: 'auto_fill_shelf'; fixtureId: string }
  | { type: 'order_supplier'; supplierId: string; items: Array<{ productId: string; quantity: number }> }
  | { type: 'set_restock_options'; options: RestockSuggestionOptions }
  | { type: 'set_auto_buy_stalls'; enabled: boolean }
  | { type: 'set_auto_buy_config'; enabled: boolean; rules: AutoBuyRule[] }
  | { type: 'auto_buy_sync' }
  | { type: 'respond_party_order'; orderId: string; accept: boolean }
  | { type: 'fulfill_party_order'; orderId: string }
  | { type: 'rush_fulfill_party_order'; orderId: string }
  | { type: 'claim_goal'; goalId: string }
  | { type: 'claim_weekly_quest'; questId: string }
  | { type: 'claim_festival_goal'; goalId: string }
  | { type: 'begin_story_chapter'; chapterId: string }
  | { type: 'claim_story_chapter'; chapterId: string }
  | { type: 'choose_perk'; perkId: string }
  | { type: 'set_title'; titleId?: string }
  | { type: 'maintain_fixture'; fixtureId: string; action: 'service' | 'repair' | 'replace' }
  | { type: 'maintain_all_service' }
  | { type: 'security_action'; action: 'buy_camera' | 'police_on' | 'police_off' }
  | { type: 'buy_warehouse_tier'; tier: number }
  | { type: 'buy_storage_rack' }
  // Khai hoang đất (OpenSpec `open-world-land-reclamation` D3/D4)
  | { type: 'reclaim_wave'; waveId: string }
  | { type: 'buy_parcel'; parcelId: string };

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
  /** Hiện diện thật của từng người trong lịch ngày chung (server tính); hẻm cũ/bản cũ có thể thiếu. */
  coop?: { players: Array<{ accountId: string; online: boolean; sleeping: boolean }> };
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
    isDirection(value.direction) && nonEmptyString(value.updatedAt) && !Number.isNaN(Date.parse(value.updatedAt)) &&
    (value.displayName === undefined || (typeof value.displayName === 'string' && value.displayName.length <= 64));
}

export const CURRENT_SAVE_SCHEMA_VERSION = 9;

/** Trạng thái thế giới mở (OpenSpec `open-world-land-reclamation`): đợt đã mở & đang thi công. */
export interface WorldOpenState {
  /** Các đợt khai hoang ĐÃ MỞ (vùng chơi). Bản đồ ban đầu luôn có 'w0'. */
  openedWaves: string[];
  /** Đợt ĐANG thi công: waveId → ngày dự kiến HOÀN THÀNH/mở (đầu ngày). Rỗng khi không có công trường. */
  wavesUnderConstruction: Record<string, number>;
}

/** 4 lô đợt 0 (bản đồ ban đầu) coi như đã sở hữu (design D4) — dùng cho migration 6→7. */
const W0_OWNED_PARCEL_IDS = ['lot-west', 'lot-center', 'lot-east-1', 'lot-east-2'] as const;

export function isWorldOpenState(value: unknown): value is WorldOpenState {
  if (!isRecord(value) || !Array.isArray(value.openedWaves) || !isRecord(value.wavesUnderConstruction)) return false;
  if (!value.openedWaves.every(w => typeof w === 'string') || !value.openedWaves.includes('w0')) return false;
  for (const [waveId, day] of Object.entries(value.wavesUnderConstruction)) {
    if (typeof waveId !== 'string' || !Number.isSafeInteger(day)) return false;
  }
  return true;
}

/** Gieo trạng thái thế giới mở mặc định cho save ở schema 7 (đợt 0 đã mở, không công trình). */
export function defaultWorldOpenState(): WorldOpenState {
  return { openedWaves: ['w0'], wavesUnderConstruction: {} };
}

/** Gieo `storeLayout.ownedParcelIds` cho save v6→7 (4 lô đợt 0). */
export function ownedParcelIdsDefault(): string[] { return [...W0_OWNED_PARCEL_IDS]; }

export interface SaveValidationResult {
  valid: boolean;
  versionStatus: 'supported' | 'unsupported_future' | 'legacy_migrate';
  error?: string;
  data?: SaveGameData;
}

const OPTIONAL_SAVE_ARRAYS = ['staff', 'processedPayrollDayIds', 'pendingOrders', 'holdingArea', 'closedDayIds', 'completedCheckoutIds', 'processedAutoBuyDayIds', 'autoBuyRules', 'customerCredits', 'ledger'] as const;
const OPTIONAL_LAYOUT_ARRAYS = ['storedFixtures', 'unlockedPlotIds', 'decorOwned', 'buildingPlacements', 'ownedParcelIds'] as const;

/** Quy tắc tự nhập đúng hình dạng; nội dung (sản phẩm, nhà cung cấp, giới hạn) do `setAutoBuyConfig` kiểm tiếp. */
export function isAutoBuyRule(value: unknown): value is AutoBuyRule {
  if (!isRecord(value)) return false;
  return nonEmptyString(value.id) && nonEmptyString(value.productId) && nonEmptyString(value.supplierId)
    && (['threshold', 'quantity', 'priority', 'maxBudget'] as const).every(key => typeof value[key] === 'number' && Number.isFinite(value[key]));
}

/** Cài đặt gợi ý nhập hàng hợp lệ: mọi trường tùy chọn, số hữu hạn / công tắc đúng kiểu (giá trị ngoài khoảng được kẹp khi áp dụng). */
export function isRestockSuggestionOptions(value: unknown): value is RestockSuggestionOptions {
  if (!isRecord(value)) return false;
  for (const key of ['provenSharePct', 'maxTrialProducts', 'cashReservePct'] as const) {
    if (value[key] !== undefined && !(typeof value[key] === 'number' && Number.isFinite(value[key]))) return false;
  }
  return value.protectObligations === undefined || typeof value.protectObligations === 'boolean';
}

/** Chuỗi chi nhánh hợp lệ về hình dạng (nội dung chi tiết được `normalizeChain` làm sạch khi nạp). */
export function isChainState(value: unknown): value is ChainState {
  if (!isRecord(value) || !Array.isArray(value.branches) || value.branches.length > 10) return false;
  if (typeof value.activeBranchId !== 'string') return false;
  return value.branches.every((b) => isRecord(b) && typeof b.id === 'string' && typeof b.storeType === 'string');
}

export function isSaveGameData(value: unknown): value is SaveGameData {
  if (!isRecord(value) || (value.schemaVersion !== 1 && value.schemaVersion !== 2 && value.schemaVersion !== 3 && value.schemaVersion !== 4 && value.schemaVersion !== 5 && value.schemaVersion !== 6 && value.schemaVersion !== 7 && value.schemaVersion !== 8 && value.schemaVersion !== CURRENT_SAVE_SCHEMA_VERSION) || !nonEmptyString(value.id) ||
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
  // Trường mảng tùy chọn: nếu có thì phải là mảng, để nạp save không sập ở `.map`/`for…of` (save hỏng hoặc sửa tay).
  for (const key of OPTIONAL_SAVE_ARRAYS) if (value[key] !== undefined && !Array.isArray(value[key])) return false;
  for (const key of OPTIONAL_LAYOUT_ARRAYS) if (sl[key] !== undefined && !Array.isArray(sl[key])) return false;
  if (Array.isArray(sl.buildingPlacements) && !sl.buildingPlacements.every(isBuildingPlacementRecord)) return false;
  if (value.restockOptions !== undefined && !isRestockSuggestionOptions(value.restockOptions)) return false;
  if (value.chain !== undefined && !isChainState(value.chain)) return false;
  if (value.sellingPrices !== undefined && (!isRecord(value.sellingPrices) || !Object.values(value.sellingPrices).every(price => Number.isSafeInteger(price) && Number(price) > 0))) return false;
  const stats = value.statistics;
  if (!isRecord(stats) || !nonNegativeInteger(stats.totalRevenue) || !nonNegativeInteger(stats.totalCustomersServed)) {
    return false;
  }
  if (value.world !== undefined && !isWorldOpenState(value.world)) return false;
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
  // v1–v5 chỉ thiếu các trường tùy chọn (v6: vị trí đặt tòa phụ, tòa chưa mua không có vỏ nhà); simulation tự chuẩn hóa khi nạp (lô hàng, kệ, kho, ô sàn mở rộng...). Cánh đông `east-wing-a/b`
  // của save cũ vẫn nằm trong `unlockedPlotIds` và được bản đồ đọc như ô sàn mở rộng đã dùng (xem `mainFloorTiles` ở game-data).
  // Nâng lên schema hiện tại + gieo trường world-open (đợt 0 đã mở, 4 lô W0 đã sở hữu) cho v6–v7 và v1–v5.
  const migrateToW7 = (m: SaveGameData): void => {
    m.schemaVersion = CURRENT_SAVE_SCHEMA_VERSION;
    m.storeLayout.storedFixtures = m.storeLayout.storedFixtures ?? [];
    m.storeLayout.unlockedPlotIds = m.storeLayout.unlockedPlotIds ?? [];
    m.storeLayout.ownedParcelIds = m.storeLayout.ownedParcelIds ?? ownedParcelIdsDefault();
    m.world = m.world ?? defaultWorldOpenState();
  };
  // 7 → 8 (open-world-coop-land D4): ghi nhận ai xây mỗi tòa. Save chơi một mình lưu `builtBy='local'`; migration điền
  // `'local'` cho mọi bản ghi chưa có (tương đương save solo). KHÔNG ghi đè bản ghi đã có builtBy (save hợp tác giữ accountId).
  // `ownedParcelIds` GIỮ string[] như trước (KHÔNG đổi thành bản ghi {id,boughtBy,day}) để tương thích land-reclamation đã
  // implement (`simulation.buyParcel` push string, `store-layout` đọc string[]); bản ghi lô đầy đủ theo D4 đạt qua field bổ sung/ghi chú, không breaking.
  const migrateToW8 = (m: SaveGameData): void => {
    m.schemaVersion = CURRENT_SAVE_SCHEMA_VERSION;
    for (const p of m.storeLayout.buildingPlacements ?? []) {
      if (p.builtBy === undefined) p.builtBy = 'local';
    }
  };
  // 8 → 9 (open-world-building-types D8): gắn `typeId` cho 4 instance tòa đã có (Bước 1.2 refactor BuildingId→string là SAU,
  // chờ máy thật — task này CHỈ chuẩn bị schema). Chỉ điền khi CHƯA có (KHÔNG ghi đè typeId do custom/dữ liệu đặt).
  // Các buildingId khác giữ nguyên, không suy diễn.
  const migrateToW9 = (m: SaveGameData): void => {
    m.schemaVersion = CURRENT_SAVE_SCHEMA_VERSION;
    const TYPEID_BY_LEGACY_BUILDING: Record<string, string> = {
      main: 'grocery_main',
      xoi: 'xoi_shop',
      drink: 'drink_shop',
      snack: 'snack_shop',
    };
    for (const p of m.storeLayout.buildingPlacements ?? []) {
      if (p.typeId === undefined && TYPEID_BY_LEGACY_BUILDING[p.buildingId] !== undefined) {
        p.typeId = TYPEID_BY_LEGACY_BUILDING[p.buildingId];
      }
    }
  };
  if ((value.schemaVersion === 1 || value.schemaVersion === 2 || value.schemaVersion === 3 || value.schemaVersion === 4 || value.schemaVersion === 5) && isSaveGameData(value)) {
    const migrated = structuredClone(value) as SaveGameData;
    migrateToW7(migrated);
    migrateToW8(migrated);
    migrateToW9(migrated);
    return { valid: true, versionStatus: 'legacy_migrate', data: migrated };
  }
  // v6 → v7 (open-world-land-reclamation): save cũ không có `world`/`ownedParcelIds` → chỉ mở đợt 0 và W0 đã sở hữu.
  if (value.schemaVersion === 6 && isSaveGameData(value)) {
    const migrated = structuredClone(value) as SaveGameData;
    migrateToW7(migrated);
    migrateToW8(migrated);
    migrateToW9(migrated);
    return { valid: true, versionStatus: 'legacy_migrate', data: migrated };
  }
  // v7 → hiện tại (open-world-coop-land D4): save v7 ĐÃ có `world`/`ownedParcelIds` (v6 đã gieo), chỉ cần điền
  // `builtBy` (W8) + `typeId` (W9). Trả `data` như v6 để caller nạp được save đã migrate.
  if (value.schemaVersion === 7 && isSaveGameData(value)) {
    const migrated = structuredClone(value) as SaveGameData;
    migrateToW8(migrated);
    migrateToW9(migrated);
    return { valid: true, versionStatus: 'legacy_migrate', data: migrated };
  }
  // v8 → hiện tại (open-world-building-types D8): save v8 đã có `builtBy`, chỉ cần gắn `typeId` (W9).
  if (value.schemaVersion === 8 && isSaveGameData(value)) {
    const migrated = structuredClone(value) as SaveGameData;
    migrateToW9(migrated);
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
  reason?: 'fixture_not_found' | 'not_sales_fixture' | 'fixture_broken' | 'invalid_amount' | 'product_locked' | 'storage_mismatch' | 'no_inventory' | 'product_mismatch' | 'no_space' | 'success'
    /** Kho còn hàng nhưng toàn nguyên thùng: phải mở thùng trong kho rồi mới châm kệ được. */
    | 'in_cases'
    /** Phần còn lại trong kho đã giữ cho nguyên liệu quầy ăn uống: bày tự động không lấy. */
    | 'reserved_for_stall';
}

export interface UnstockShelfResult {
  success: boolean;
  actualQuantity: number;
  reason?: 'fixture_not_found' | 'not_sales_fixture' | 'empty_shelf' | 'invalid_amount' | 'cold_storage_full' | 'ambient_storage_full' | 'success';
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
    case 'checkout': return nonEmptyString(p.checkoutId) && nonEmptyString(p.fixtureId) && (p.onCredit === undefined || typeof p.onCredit === 'boolean') && (p.dineIn === undefined || typeof p.dineIn === 'boolean');
    case 'repay_customer_credit': return nonEmptyString(p.creditId);
    case 'start_production': return nonEmptyString(p.recipeId) && nonEmptyString(p.stationId);
    case 'clean_dining_table': return nonEmptyString(p.fixtureId);
    case 'assign_dining_cleanup': return nonEmptyString(p.staffId) && nonEmptyString(p.fixtureId);
    case 'set_restock_options': return isRestockSuggestionOptions(p.options);
    case 'set_auto_buy_stalls': return typeof p.enabled === 'boolean';
    case 'set_auto_buy_config': return typeof p.enabled === 'boolean' && Array.isArray(p.rules) && p.rules.length <= 100 && p.rules.every(isAutoBuyRule);
    case 'auto_buy_sync': return true;
    case 'reset_prices': return true;
    case 'set_price': return nonEmptyString(p.productId) && (p.price === null || (Number.isSafeInteger(p.price) && Number(p.price) > 0));
    case 'layout_batch': return Array.isArray(p.actions) && p.actions.length > 0 && p.actions.length <= 64 && p.actions.every(action => {
      if (!isRecord(action) || !nonEmptyString(action.type)) return false;
      if (action.type === 'move') return nonEmptyString(action.fixtureId) && Number.isSafeInteger(action.tileX) && Number.isSafeInteger(action.tileY) && [0,90,180,270].includes(action.rotation as number);
      if (action.type === 'store') return nonEmptyString(action.fixtureId);
      if (action.type === 'retrieve') return nonEmptyString(action.fixtureId) && Number.isSafeInteger(action.tileX) && Number.isSafeInteger(action.tileY);
      if (action.type === 'buy_plot') return nonEmptyString(action.plotId) && isPlotPlacement(action.placement);
      if (action.type === 'relocate_building') return nonEmptyString(action.buildingId) && isRecord(action.placement) && isPlotPlacement(action.placement);
      if (action.type === 'expand_footprint') return nonEmptyString(action.buildingId) && Array.isArray(action.tiles) && action.tiles.length > 0 && action.tiles.length <= MAX_FOOTPRINT_TILES
        && action.tiles.every(tile => isRecord(tile) && Number.isSafeInteger(tile.x) && Number.isSafeInteger(tile.y));
      if (action.type === 'buy_decor') return nonEmptyString(action.decorId);
      if (action.type === 'buy_fixture') return nonEmptyString(action.shopId) && Number.isSafeInteger(action.tileX) && Number.isSafeInteger(action.tileY) && [0,90,180,270].includes(action.rotation as number);
      // Khớp StoreLayoutAction + applyStoreLayoutActions: nâng cấp kho / mua kệ kho cũng là action hợp lệ của layout_batch.
      if (action.type === 'buy_warehouse_tier') return Number.isSafeInteger(action.tier) && (action.tier as number) >= 0;
      if (action.type === 'buy_storage_rack') return true;
      return false;
    });
    case 'buy_plot': return nonEmptyString(p.plotId) && isPlotPlacement(p.placement);
    case 'claim_quest': return nonEmptyString(p.questId);
    case 'buy_stall': return nonEmptyString(p.stallId);
    case 'hire_staff': return nonEmptyString(p.candidateId);
    case 'pay_wage_debt': return true;
    case 'set_staff_shift': return nonEmptyString(p.staffId) && (p.shift === 'morning' || p.shift === 'afternoon' || p.shift === 'full_day');
    case 'assign_refill_job': return nonEmptyString(p.staffId) && nonEmptyString(p.fixtureId);
    case 'store_status': return typeof p.isOpen === 'boolean';
    case 'set_tax_declaration': return typeof p.underDeclare === 'boolean';
    case 'open_branch': return nonEmptyString(p.storeType) && (p.name === undefined || (typeof p.name === 'string' && p.name.length <= 48)) && (p.branchId === undefined || (nonEmptyString(p.branchId) && /^branch-\d{1,6}$/.test(p.branchId as string)));
    case 'switch_branch': return nonEmptyString(p.branchId);
    case 'set_branch_policy': return nonEmptyString(p.branchId) && isRecord(p.policy) && (p.policy.priceMode === 'low' || p.policy.priceMode === 'normal' || p.policy.priceMode === 'high') && typeof p.policy.manager === 'boolean';
    case 'transfer_stock':
    case 'return_stock': return nonEmptyString(p.branchId) && Array.isArray(p.items) && p.items.length > 0 && p.items.length <= 50
      && p.items.every((item) => isRecord(item) && nonEmptyString(item.productId) && Number.isSafeInteger(item.quantity) && Number(item.quantity) > 0);
    case 'advance_day': case 'stow_all': case 'auto_restock': return true;
    case 'stow': return nonEmptyString(p.holdingId);
    case 'planogram_assignment': return nonEmptyString(p.fixtureId) && (p.productId === null || nonEmptyString(p.productId));
    case 'planogram_restock': case 'auto_fill_shelf': return nonEmptyString(p.fixtureId);
    case 'dispose_stock': return nonEmptyString(p.productId) && Number.isSafeInteger(p.quantity) && Number(p.quantity) > 0;
    case 'open_case': return nonEmptyString(p.productId) && Number.isSafeInteger(p.count) && Number(p.count) > 0;
    case 'order_supplier': return nonEmptyString(p.supplierId) && Array.isArray(p.items) && p.items.length > 0 && p.items.length <= 64 && p.items.every(item => isRecord(item) && nonEmptyString(item.productId) && Number.isSafeInteger(item.quantity) && Number(item.quantity) > 0);
    case 'respond_party_order': return nonEmptyString(p.orderId) && typeof p.accept === 'boolean';
    case 'fulfill_party_order': return nonEmptyString(p.orderId);
    case 'rush_fulfill_party_order': return nonEmptyString(p.orderId);
    case 'claim_goal': return nonEmptyString(p.goalId);
    case 'claim_weekly_quest': return nonEmptyString(p.questId);
    case 'claim_festival_goal': return nonEmptyString(p.goalId);
    case 'begin_story_chapter':
    case 'claim_story_chapter': return nonEmptyString(p.chapterId);
    case 'choose_perk': return nonEmptyString(p.perkId);
    case 'set_title': return p.titleId === undefined || nonEmptyString(p.titleId);
    case 'security_action': return p.action === 'buy_camera' || p.action === 'police_on' || p.action === 'police_off';
    case 'maintain_fixture': return nonEmptyString(p.fixtureId) && (p.action === 'service' || p.action === 'repair' || p.action === 'replace');
    case 'maintain_all_service': return true;
    case 'buy_warehouse_tier': return Number.isSafeInteger(p.tier) && Number(p.tier) >= 1 && Number(p.tier) <= 3;
    case 'buy_storage_rack': return true;
    case 'reclaim_wave': return nonEmptyString(p.waveId);
    case 'buy_parcel': return nonEmptyString(p.parcelId);
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
