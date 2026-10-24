import { create } from 'zustand';
import { furnitureDef, isCookStation, slotCount, type FurnitureType } from '../data/furniture';
import { warehouseTier, WAREHOUSE_TIERS } from '../data/warehouse';
import { dailyQuests, emptyQuestLog, emptyTotals, storyQuest, type QuestContext, type QuestLog, type Totals } from '../data/quests';
import { customersPerDay, MAX_LEVEL, unlocksAt, xpToNext } from '../data/levels';
import { casesFor, formatMoney, productById, unlockedProducts } from '../data/products';
import { PAINT_PRICE, SHOP_TIERS, rentOf, type ShopStyle } from '../data/shopTiers';
import { composeReview, REVIEW_CAP, type Review, type ReviewReason } from '../data/reviews';
import { describeDay, forecastFrom, newWeatherSeed, WEATHER, type Weather } from '../data/weather';
import { orderTotal, supplierById } from '../data/suppliers';
import { ageLots, fitLots, mergeLots, nearestLife, needsCold, tierMarkdown, shelfLife, spoilRate, takeOldest, type Lot } from '../data/freshness';
import { regularById, regularCheckout, regularFriendship, regularWalkout, RESERVE_BONUS, RESERVE_MISS_LOSS, type RegularProgress, type Reservation } from '../data/regulars';
import { missingForOrder, offerForDay, orderValue, partyOrderById, STORY_ORDER_FRIEND_GAIN, STORY_ORDER_FRIEND_LOSS, type ActiveOrder } from '../data/orders';
import { dayEffects, FESTIVALS, morningNews, festivalOn, festivalStock } from '../data/calendar';
import { happyHourActive, type HappyHour } from '../data/rhythm';
import { DEBT_LATE_DAYS, DEBT_WRITE_OFF_DAYS, FORGIVE_FRIEND_GAIN, REMIND_FRIEND_LOSS, WRITE_OFF_FRIEND_LOSS, type Debt } from '../data/credit';
import { makeVendorOffer, vendorById, wholesaleTotal, type VendorOffer } from '../data/wholesale';
import { missKey, type MissLog } from '../data/advice';
import { BREAKFAST, counterActive, INSPECTION_EVERY, INSPECTION_FINE, INSPECTION_REWARD, INSPECTION_UNLOCK, inspectionResult, newBiz, PRICE_WAR_CUT, type BizState } from '../data/biz';
import { bizEndOfDay, checkAchievements, maybeSurprise, spoilFactor } from './biz';
import { CANCEL_AFTER_LATE, describeItems, FAST_TIP, fastWindow, houseById, ON_TIME_TIP, PHONE_FRIEND_GAIN, PHONE_SLOTS, phoneCallFor, phoneOrderValue, type PhoneOrder } from '../data/phoneOrders';
import type { CookingStation } from '../data/recipes';
import { setCostModifier } from '../data/suppliers';
import { nextMarketIndex } from '../data/market';
import { referenceSell, setMarketIndex } from '../data/pricing';
import { hasSkill, SKILLS, skillPoints, TITLES, type SkillId, type TitleContext } from '../data/titles';
import { repairCost, RISK_RULES, wears } from '../data/risks';
import { hasUpgrade } from '../data/upgrades';
import { isNight, LATE_WAKE_AT, NIGHT_PRICE_MUL } from '../data/night';
import { summarizeReviews } from '../data/reviews';
import { comboById, MAX_ACTIVE_COMBOS } from '../data/combos';
import { dailyWage, DIRT_MAX, generateCandidates, maxStaff, ROLES, SHIFTS, skillSpeed, type Shift, type Staff } from '../data/staff';
import { eventOn, type RandomEvent } from '../data/events';
import { activeContractsFor, contractValue, missingForContract, supplyContractById, type SupplyContract } from '../data/contracts';
import { costumeById, type Costume } from '../data/costumes';
import { describeRep, meetsRep, REP_CAP, reputationOf, type RepSample } from '../data/reputation';
import { activeGoals, addSales, goalLocked, goalMet, type CommunityProgress, type Opening } from '../data/community';
import { giftOfStreak, giftText, spinWheelPrize, type WheelPrize } from '../data/gifts';
import { paymentById, type PaymentMethod } from '../data/payments';
import { COOKED_PRODUCT_IDS, RECIPE_MAP } from '../data/recipes';
import { playSfx } from './audio';

/** Phút trong ngày khi bắt đầu ngày mới (06:00). */
export const DAY_START = 6 * 60;
/** Từ giờ này được đi ngủ (18:00). */
export const SLEEP_FROM = 18 * 60;
/** Quá giờ này mà chưa ngủ thì ngất (02:00 sáng hôm sau). */
export const FAINT_AT = 26 * 60;
/** Lịch tự động mỗi ngày (khi bật): ra tiệm, mở cửa, đóng cửa, kiểm kê rồi về nhà. */
export const ROUTINE = { goToShop: 7 * 60, open: 8 * 60, close: 22 * 60 + 30, goHome: 23 * 60 };
/** Mỗi giây thật = bao nhiêu phút trong game ở tốc độ x1. */
export const MINUTES_PER_SECOND = 2;
/** Bán lại đồ nội thất được bao nhiêu phần giá mua. */
export const SELL_BACK = 0.5;

/** Một hợp đồng cung cấp đang giữ: lần giao kế tiếp vào ngày nào, đã giao bao nhiêu kỳ. */
export interface ContractState {
  defId: string;
  /** Ngày trong ván phải giao kỳ này (nếu chưa giao). */
  dueDay: number;
  /** Số kỳ đã giao thành công. */
  delivered: number;
  /** Chờ giao kỳ đầu tiên sau khi chấp nhận. */
  pending: boolean;
}

export interface Tier {
  productId: string | null;
  count: number;
  /** Các lô đang bày (khớp `count`; bản lưu cũ chưa có thì coi như hàng mới). */
  lots?: Lot[];
}

/** Một món nội thất đặt trong tiệm; toạ độ tính trong tiệm (tâm tiệm là 0,0). */
export interface Furniture {
  uid: number;
  type: FurnitureType;
  x: number;
  z: number;
  /** Số lần xoay 90°. */
  rot: number;
  /** Độ mòn 0–100 (kệ, tủ). */
  wear?: number;
  /** Hỏng: khách không lấy được hàng cho tới khi sửa. */
  broken?: boolean;
  tiers: Tier[];
}

export interface CartItem {
  id: string;
  price: number;
}

/** Một mẻ nấu đang chạy ở trạm nấu: còn `remaining` phút game là xong, nguyên liệu đã trừ kho. */
export interface CookJob {
  id: number;
  recipeId: string;
  /** Phút game còn lại. */
  remaining: number;
  /** Tổng thời gian nấu (để vẽ thanh tiến độ). */
  total: number;
}

export interface DayStats {
  revenue: number;
  spent: number;
  wages: number;
  /** Hàng hết hạn phải bỏ đi đêm qua: số món và tiền vốn (đã tính trong chi tiêu lúc nhập). */
  spoiledItems?: number;
  spoiledCost?: number;
  itemsSold: number;
  customers: number;
  unhappy: number;
  xp: number;
  /** Sổ bán theo món: số lượng, tiền thu, vốn (theo giá nhập chuẩn). */
  byItem?: Record<string, ItemLine>;
  /** Số lần khách không mua được một món, theo lý do; `wait` là bỏ về vì chờ quầy lâu. */
  missed?: Partial<Record<ReviewReason, number>>;
  /** Lỡ bán theo từng món ("lý do:mã món"), để gợi ý việc cần làm. */
  missLog?: MissLog;
  /** Tiền khách quen ghi sổ hôm nay (đã tính vào doanh thu, chưa vào két) và tiền nợ thu về. */
  credited?: number;
  repaid?: number;
  /** Tiền lời dịch vụ ở quầy (nạp tiền, thu hộ) hôm nay. */
  services?: number;
  /** Số combo bán ra và tiền đã giảm cho combo. */
  combos?: number;
  comboDiscount?: number;
  /** Tiền nhà/chi phí cố định trả cuối ngày theo bậc tiệm. */
  rent?: number;
  /** Số lời hẹn giữ món được giữ đúng hôm nay (để đo nhiệm vụ ngày). */
  reservationsFilled?: number;
  /** Sổ theo giờ (khoá là giờ trong ngày, 6–22): số khách ghé và tiền thu. */
  byHour?: Record<number, HourLine>;
  /** Tiền vào theo từng hình thức thanh toán: doanh thu và số lượt (kể cả ghi sổ). */
  byMethod?: Partial<Record<PaymentMethod, { revenue: number; count: number }>>;
  /** Phí giao dịch ví điện tử / máy POS trừ đi hôm nay. */
  fees?: number;
}

export interface HourLine { customers: number; revenue: number }

const addHour = (byHour: DayStats['byHour'], minutes: number, customers: number, revenue: number) => {
  const h = Math.floor(minutes / 60);
  const line = byHour?.[h] ?? { customers: 0, revenue: 0 };
  return { ...byHour, [h]: { customers: line.customers + customers, revenue: line.revenue + revenue } };
};

export interface ItemLine {
  qty: number;
  revenue: number;
  cost: number;
}

/** Một dòng lịch sử để vẽ biểu đồ mấy ngày gần đây. */
export interface DayRecord {
  day: number;
  revenue: number;
  profit: number;
  customers: number;
  unhappy: number;
  /** Sao trung bình của các đánh giá trong ngày; không ai chấm thì bỏ trống. */
  rating?: number;
}

/** Số ngày giữ trong lịch sử. */
export const HISTORY_DAYS = 30;

export type Panel =
  | { type: 'order' }
  | { type: 'shelf'; uid: number }
  | { type: 'build' }
  | { type: 'arrange' }
  | { type: 'prices' }
  | { type: 'staff' }
  | { type: 'levels' }
  | { type: 'reviews' }
  | { type: 'storage' }
  | { type: 'planogram' }
  | { type: 'quests' }
  | { type: 'regulars' }
  | { type: 'skills' }
  | { type: 'combos' }
  | { type: 'contracts' }
  | { type: 'costume' }
  | { type: 'business' }
  | { type: 'calendar' }
  | { type: 'gifts' }
  | { type: 'cook' }
  | { type: 'morning' }
  | { type: 'history' }
  | { type: 'summary'; day: number; stats: DayStats };

/** Đang cầm một món đồ để đặt (mua mới hoặc di chuyển món có sẵn). */
export interface Placing {
  type: FurnitureType;
  rot: number;
  movingUid?: number;
}

export interface GameState {
  day: number;
  minutes: number; // tính từ 0h của ngày hiện tại, có thể vượt 1440 sau nửa đêm
  speed: number; // 0 = tạm dừng
  money: number;
  level: number;
  xp: number;
  location: string;
  /** Gợi ý tương tác hiện ra khi đứng gần đồ vật. */
  hint: string | null;
  /** Thông báo ngắn ở giữa màn hình. */
  message: string | null;
  panel: Panel | null;
  /** Đang ở chế độ xây dựng. */
  buildMode: boolean;
  placing: Placing | null;

  shopOpen: boolean;
  /** Hàng trong kho: id sản phẩm → số lượng. */
  storage: Record<string, number>;
  /** Các lô trong kho của từng món (khớp `storage`). */
  storageLots: Record<string, Lot[]>;
  furniture: Furniture[];
  /** Số món đã bán ra của từng kệ/tủ (khóa là uid) — heatmap vị trí: kệ dễ thấy bán nhiều hơn. */
  shelfHeat: Record<number, number>;
  /** Đã nhắc người chơi về hàng chớp nhoáng cạnh quầy (chỉ nhắc một lần). */
  impulseHinted: boolean;
  /** Giá bán người chơi tự đặt; không có thì dùng giá gợi ý. */
  prices: Record<string, number>;
  /** Giờ vàng tự đặt: khung 2 tiếng giảm giá kéo khách về (null = tắt). */
  happyHour: HappyHour | null;
  /** Đặt / tắt giờ vàng. */
  setHappyHour: (hh: HappyHour | null) => void;
  /** Số khách đang chờ ở quầy. */
  waiting: number;
  /** Số khách còn trong tiệm (đang chọn hàng + đang chờ thanh toán) — nhân viên ở lại dọn nốt mới về. */
  customersInside: number;
  /** Độ bẩn sàn tiệm 0–100: tăng theo lượt khách, lao công lau, mỗi đêm dọn sạch. */
  dirt: number;
  addDirt: (amount: number) => void;
  stats: DayStats;
  /** Chỉ số trong SHOP_TIERS. */
  shopTier: number;
  /** Đã trả tiền mở rộng, thợ làm xong vào sáng mai. */
  pendingUpgrade: boolean;
  style: ShopStyle;
  /** Màu đang xem thử ở bảng Sơn sửa (chưa trả tiền, không lưu); null = không xem thử. */
  stylePreview: Partial<ShopStyle> | null;
  staff: Staff[];
  candidates: Staff[];
  /** Thu ngân tự mở cửa khi vào ca và đóng cửa khi hết ca. */
  autoOpen: boolean;
  /** Cấp nhà kho (chỉ số trong WAREHOUSE_TIERS). */
  warehouseTier: number;
  upgradeWarehouse: () => boolean;
  /** Hàng mới về: ô kệ hết hàng mà kho cũng hết món đó thì tự gỡ, bày món khác đang có trong kho. */
  autoSwap: boolean;
  /** Cộng dồn cả ván (khách, món, doanh thu) để đo nhiệm vụ cốt truyện. */
  totals: Totals;
  /** Nhiệm vụ đã nhận thưởng. */
  questLog: QuestLog;
  /** Nhận thưởng một nhiệm vụ đã xong. */
  claimQuest: (id: string) => boolean;
  /** Đổi các ô hết hàng (kho không còn, không có đơn chờ) sang món khác trong kho; trả về các dòng mô tả đã đổi. */
  replaceEmptySlots: () => string[];
  /** Tự động theo lịch: 7h ra tiệm, 8h mở cửa, 22h30 đóng cửa, 23h kiểm kê rồi về nhà. */
  autoRoutine: boolean;
  /** Lời khách nhận xét gần nhất (cũ trước, mới sau). */
  reviews: Review[];
  /** Điểm danh tiếng 5 mặt của các lượt khách gần nhất. */
  repLog: RepSample[];
  /** Tiến độ mục tiêu chung của hẻm theo từng dịp. */
  community: Record<string, CommunityProgress>;
  /** Ngày khai trương của lần nâng cấp tiệm gần nhất. */
  opening?: Opening;
  /** Đơn hàng đang chờ giao (giao lúc sang ngày mới). */
  deliveries: Delivery[];
  /** Nhu cầu trung bình mỗi ngày của từng món (khách muốn mua, kể cả không mua được). */
  demand: Record<string, number>;
  /** Số lượt khách muốn mua từng món hôm nay. */
  demandToday: Record<string, number>;
  /** Số món bán được trung bình mỗi ngày của từng món (để gợi ý giá). */
  sales: Record<string, number>;
  salesToday: Record<string, number>;
  /** Thân thiết với từng khách quen. */
  regulars: Record<string, RegularProgress>;
  /** Lời hẹn giữ món của khách quen (mỗi người một hẹn): món, số lượng, ngày ghé lấy. */
  reservations: Record<string, Reservation>;
  /** Nhận lời giữ món cho khách quen (nguyên liệu/hàng sẵn có thì ngày mai khách ghé lấy được). */
  addReservation: (regularId: string, productId: string, qty: number) => void;
  /** Từ chối/huỷ lời hẹn giữ món (không mất thân thiết). */
  cancelReservation: (regularId: string) => void;
  /** Khách quen trả tiền xong hoặc bỏ về; trả về tiền boa. */
  regularVisit: (id: string, basket: CartItem[], paid: boolean) => number;
  /** Cộng/trừ thân thiết ngoài lần ghé (đơn riêng), mở perk nếu tới mốc. */
  adjustFriendship: (id: string, delta: number) => void;
  /** Đối thủ, quảng cáo, tích điểm, vay, hụi, tuần, thú cưng, thành tựu, nhà, xe (xem data/biz.ts). */
  biz: BizState;
  /** Lấy bớt hàng khỏi kho (vd. thức ăn cho thú cưng). */
  consumeStock: (productId: string, qty: number) => void;
  /** Sổ nợ khách quen (theo id khách quen). */
  debts: Record<string, Debt>;
  /** Hệ số giá tham chiếu của từng món so với giá gợi ý gốc (thị trường nhích theo khan hiếm). */
  market: Record<string, number>;
  /** Cho khách quen ghi sổ hay không. */
  allowCredit: boolean;
  setAllowCredit: (on: boolean) => void;
  /** Tính tiền nhưng ghi vào sổ nợ của khách quen thay vì thu tiền mặt. */
  checkoutOnCredit: (regularId: string, items: CartItem[], discount?: number, combos?: number) => void;
  /** Khách quen trả hết nợ cũ; trả về số tiền thu được. */
  collectDebt: (regularId: string) => number;
  remindDebt: (regularId: string) => void;
  forgiveDebt: (regularId: string) => void;
  /** Người bán rong đang chờ ở tiệm xin lấy sỉ (null = không có). */
  vendorOffer: VendorOffer | null;
  /** Ngày người bán rong đã ghé gần nhất (mỗi ngày tối đa một lần). */
  vendorDay: number;
  /** Người bán rong vào tới quầy: đưa đề nghị lấy sỉ. */
  offerWholesale: () => VendorOffer | null;
  acceptWholesale: () => boolean;
  declineWholesale: () => void;
  /** Đơn khách gọi điện hôm nay (đang đổ chuông hoặc đang mang đi giao). */
  phoneOrders: PhoneOrder[];
  /** Số khung giờ gọi điện hôm nay đã xét (chỉ số tiếp theo trong PHONE_SLOTS). */
  phoneSlot: number;
  /** Ngày gần nhất đã nhắc "mưa mà chưa có người giao hàng" (mỗi ngày chỉ nhắc một lần). */
  phoneHintDay: number;
  phoneOrdersDone: number;
  /** Nghe máy: soạn hàng từ kho rồi mang đi; trả false nếu kho thiếu. */
  answerPhone: (id: number) => boolean;
  /** Nhập ngay phần kho còn thiếu (theo giá nhập) rồi nghe máy soạn hàng. */
  restockAndAnswerPhone: (id: number) => boolean;
  declinePhone: (id: number) => void;
  /** Giao đơn gọi điện tại cửa nhà khách. */
  deliverPhone: (id: number) => boolean;
  /** Đơn tiệc đang mời hoặc đang nhận. */
  order: ActiveOrder | null;
  ordersDone: number;
  /** Các mẻ nấu đang chạy ở trạm nấu. */
  cookJobs: CookJob[];
  /** Bắt đầu một mẻ: trừ nguyên liệu khỏi kho (lô cận hạn trước), trả false nếu chưa đủ điều kiện. */
  startCook: (recipeId: string) => boolean;
  /** Hợp đồng cung cấp đang giữ (khách sỉ / đơn buôn dài hạn). */
  contracts: Record<string, ContractState>;
  acceptContract: (id: string) => void;
  /** Món vừa bán tính vào mục tiêu chung của dịp; đủ thì trao thưởng. */
  communitySale: (ids: string[]) => void;
  /** Giao kỳ hiện tại của hợp đồng từ kho; trả true nếu giao xong. */
  deliverContract: (id: string) => boolean;
  /** Sự kiện ngẫu nhiên hôm nay (ảnh hưởng lượt khách). */
  event: RandomEvent | null;
  /** Giữ chân: chuỗi điểm danh quà 7 ngày và lượt vòng quay may mắn mỗi ngày. */
  giftStreak: number;
  giftLastDay: number;
  wheelLastDay: number;
  /** Nhân lượng khách ghé hôm nay khi trúng giải 🍀 trên vòng quay (1 = bình thường). */
  wheelBoost: number;
  /** Điểm danh hôm nay; trả false nếu đã nhận rồi. */
  claimGift: () => boolean;
  /** Quay vòng quay hôm nay; trả về giải trúng, hoặc null nếu hết lượt. */
  spinWheel: () => WheelPrize | null;
  /** Cấp ngoại hình/nhân vật chính đang dùng (id trong COSTUMES). */
  costume: string;
  setCostume: (id: string) => void;
  /** Tên tiệm do người chơi đặt (hiện ở HUD, màn sắp xếp, tổng kết). */
  shopName: string;
  /** Đổi tên tiệm (tối đa 24 ký tự, rỗng thì về tên mặc định). */
  setShopName: (name: string) => void;
  acceptOrder: () => void;
  declineOrder: () => void;
  /** Giao đơn từ kho. */
  deliverOrder: () => boolean;
  /** Kỹ năng đã học. */
  skills: SkillId[];
  learnSkill: (id: SkillId) => void;
  /** Danh hiệu đã đạt. */
  titles: string[];
  checkTitles: () => void;
  /** Sửa hoặc bảo trì một kệ. */
  repairFurniture: (uid: number) => void;
  /** Tiền giả lọt vào két hôm nay (phát hiện khi kiểm két cuối ngày). */
  fakeCash: number;
  /** Kẻ trộm: bị bắt thì nộp phạt, thoát thì mất hàng. */
  recordTheft: (value: number, caught: boolean) => void;
  /** Tiền giả ở quầy: phát hiện thì khách đổi tiền thật, không thì két mất mệnh giá đó. */
  recordCounterfeit: (note: number, detected: boolean) => void;
  /** Hạt giống thời tiết: cố định cả ván nên dự báo luôn đúng. */
  weatherSeed: number;
  weather: Weather;
  /** Dự báo thời tiết ngày mai và ngày kia. */
  forecast: Weather[];

  setSpeed: (speed: number) => void;
  tick: (dtSeconds: number) => void;
  /** Đi ngủ. Trả về false nếu chưa tới giờ ngủ. */
  sleep: () => boolean;
  notify: (message: string) => void;
  openPanel: (panel: Panel) => void;
  closePanel: () => void;

  toggleShop: () => void;
  /** Nhập hàng vào kho (đại lý đầu ngõ, có ngay). */
  buy: (productId: string, qty: number) => boolean;
  /** Đặt một đơn ở một mối; giao ngay hoặc sáng mai tuỳ mối. */
  placeOrder: (supplierId: string, items: Record<string, number>) => boolean;
  /** Khách muốn mua món này (để tính nhu cầu). */
  noteDemand: (productId: string) => void;
  /** Đặt loại hàng cho một tầng kệ và bày đầy từ kho. */
  stockTier: (uid: number, tier: number, productId: string | null) => void;
  /** Dỡ hết hàng một ô về kho, ô vẫn giữ món đã gán. */
  unstockTier: (uid: number, tier: number) => void;
  /** Khách lấy 1 món khỏi kệ; trả về giá phải trả, hoặc null nếu hết. */
  takeFromShelf: (productId: string, preferUid?: number) => number | null;
  priceOf: (productId: string) => number;
  setPrice: (productId: string, price: number) => void;
  /** Tính tiền cho khách; `discount` là tiền giảm combo, `combos` là số combo trong giỏ,
   *  `payment` là hình thức thanh toán (mặc định tiền mặt) — ảnh hưởng phí và sổ thống kê. */
  checkout: (items: CartItem[], discount?: number, combos?: number, payment?: PaymentMethod) => void;
  /** Khách không mua được một món (hoặc bỏ về vì chờ lâu). */
  noteMiss: (reason: ReviewReason, productId?: string) => void;
  /** Lời/lỗ các ngày gần đây (cũ trước). */
  history: DayRecord[];
  /** Combo khuyến mãi đang chạy. */
  activeCombos: string[];
  toggleCombo: (id: string) => void;
  recordVisit: (happy: boolean, sample?: RepSample) => void;
  addXp: (amount: number) => void;
  addReview: (stars: number, reason?: ReviewReason, productId?: string) => void;

  setBuildMode: (on: boolean) => void;
  setPlacing: (placing: Placing | null) => void;
  placeFurniture: (type: FurnitureType, x: number, z: number, rot: number) => boolean;
  moveFurniture: (uid: number, x: number, z: number, rot: number) => void;
  sellFurniture: (uid: number) => void;
  /** Bán hết nội thất (đập đi làm lại). */
  demolishAll: () => void;
  buyUpgrade: () => void;
  paint: (part: keyof ShopStyle, color: number) => void;
  hire: (id: number) => void;
  fire: (id: number) => void;
  setShift: (id: number, shift: Shift) => void;
}

export interface Delivery {
  supplierId: string;
  items: Record<string, number>;
}

/** Sức chứa nhà kho (thùng) theo cấp nhà kho. */
export const storageCapacity = (tier: number) => warehouseTier(tier).cases;

/** Số thùng kho đang chiếm, cộng thêm hàng `extra` (món) sắp về. */
export function storageUsed(storage: Record<string, number>, ...extra: Record<string, number>[]) {
  const units = { ...storage };
  for (const e of extra) for (const [id, q] of Object.entries(e)) units[id] = (units[id] ?? 0) + q;
  return Object.entries(units).reduce((n, [id, q]) => n + (q > 0 ? casesFor(id, q) : 0), 0);
}

/** Tổng lương nhân viên phải trả lúc hết ngày. */
export const wagesDue = (s: Pick<GameState, 'staff' | 'skills'>) =>
  Math.round(s.staff.reduce((sum, st) => sum + dailyWage(st), 0) * (hasSkill(s.skills, 'good_boss') ? 0.9 : 1));

export const emptyStats = (): DayStats => ({ revenue: 0, spent: 0, wages: 0, itemsSold: 0, customers: 0, unhappy: 0, xp: 0 });

/** Kho đang sửa: số lượng và lô đổi cùng nhau. */
interface Stock { storage: Record<string, number>; storageLots: Record<string, Lot[]> }

const copyStock = (s: Stock): Stock => ({ storage: { ...s.storage }, storageLots: { ...s.storageLots } });

/** Cất lô vào kho (mặc định là hàng mới nhập, hạn đầy). */
function putStock(k: Stock, id: string, qty: number, lots: Lot[] = [{ qty, life: shelfLife(id) }]) {
  if (qty <= 0) return;
  k.storageLots[id] = mergeLots(fitLots(k.storageLots[id], k.storage[id] ?? 0, id), lots);
  k.storage[id] = (k.storage[id] ?? 0) + qty;
}

/** Lấy tối đa `qty` món khỏi kho, lô sắp hết hạn trước. */
function takeStock(k: Stock, id: string, qty: number): Lot[] {
  const [rest, taken] = takeOldest(fitLots(k.storageLots[id], k.storage[id] ?? 0, id), qty);
  k.storageLots[id] = rest;
  k.storage[id] = rest.reduce((n, l) => n + l.qty, 0);
  return taken;
}

/** Trả hàng trên một tầng kệ về kho. */
function returnTier(k: Stock, t: Tier) {
  if (t.productId && t.count > 0) putStock(k, t.productId, t.count, fitLots(t.lots, t.count, t.productId));
}

/**
 * Qua đêm: trừ hạn mọi lô theo chỗ cất và thời tiết hôm nay, bỏ hàng hết hạn.
 * Trả về kho, nội thất mới và số món/tiền vốn bỏ đi.
 */
function spoilOvernight(s: Pick<GameState, 'storage' | 'storageLots' | 'furniture' | 'weather' | 'warehouseTier' | 'skills' | 'biz' | 'day'>) {
  let items = 0;
  let cost = 0;
  // fresh_keeper: hàng hỏng chậm 25%
  const keeper = hasSkill(s.skills, 'fresh_keeper') ? 0.75 : 1;
  // cool_pack: mở khóa ở cấp 12 – cộng thêm 0.8 cho hệ số giữ tươi
  const cooler = hasSkill(s.skills, 'cool_pack') ? 0.85 : 1;
  // zero_waste: mở khóa ở cấp 35 – giảm 50% tốc độ hư hỏng thực phẩm tươi
  const zeroWasteMul = hasSkill(s.skills, 'zero_waste') ? 0.5 : 1;
  const effectiveKeeper = keeper * cooler * (zeroWasteMul === 0.5 ? (zeroWasteMul + (1 - zeroWasteMul) * keeper) : 1);
  const spoil = (id: string, lots: Lot[], place: Parameters<typeof spoilRate>[1]) => {
    // Áp dụng zero_waste cho hàng tươi sống (fresh category)
    const product = productById(id);
    const isFresh = product.category === 'fresh';
    // Mèo giữ tiệm bắt chuột: hàng hỏng chậm hơn
    const rate = spoilRate(id, place, s.weather) * (isFresh ? effectiveKeeper : keeper) * spoilFactor(s.biz, s.day);
    const [kept, gone] = ageLots(lots, rate);
    items += gone;
    cost += gone * product.buy;
    return kept;
  };
  const k: Stock = { storage: {}, storageLots: {} };
  // Tủ lạnh kho giữ lạnh được một số món: ưu tiên hàng hạn ngắn nhất
  let cold = warehouseTier(s.warehouseTier).cold;
  const ids = Object.keys(s.storage).sort((a, b) => shelfLife(a) - shelfLife(b));
  for (const id of ids) {
    const qty = s.storage[id];
    if (qty <= 0) continue;
    let lots = fitLots(s.storageLots[id], qty, id);
    let chilled: Lot[] = [];
    if (cold > 0 && needsCold(id)) {
      [lots, chilled] = takeOldest(lots, cold);
      cold -= chilled.reduce((n, l) => n + l.qty, 0);
    }
    const kept = mergeLots(spoil(id, lots, 'storage'), spoil(id, chilled, 'coldStorage'));
    k.storageLots[id] = kept;
    k.storage[id] = kept.reduce((n, l) => n + l.qty, 0);
  }
  const furniture = s.furniture.map((f) => ({
    ...f,
    tiers: f.tiers.map((t) => {
      if (!t.productId || t.count <= 0) return t;
      // Tủ mát/tủ đông hỏng: mất lạnh, hàng trong tủ hỏng nhanh như để ngoài kho
      const place = f.broken && (f.type === 'fridge' || f.type === 'freezer') ? 'storage' as const : f.type;
      const lots = spoil(t.productId, fitLots(t.lots, t.count, t.productId), place);
      return { ...t, lots, count: lots.reduce((n, l) => n + l.qty, 0) };
    }),
  }));
  return { ...k, furniture, items, cost };
}

const emptyTiers = (type: FurnitureType): Tier[] =>
  Array.from({ length: slotCount(type) }, () => ({ productId: null, count: 0 }));

/**
 * Bản lưu cũ mỗi tầng là một món (tối đa slots × capacity): chia hàng của tầng đó vào các ô của tầng,
 * lô cũ vào ô đầu. Đồ đã đúng số ô thì giữ nguyên. Kệ tăng/giảm số ô (đợt kệ rộng hơn) thì
 * bù ô trống hoặc cắt bớt để khớp tầng × ô hiện tại.
 */
export function migrateTiers(f: Furniture): Furniture {
  const def = furnitureDef(f.type);
  const target = slotCount(f.type);
  if (f.tiers.length === target) return f;
  if (f.tiers.length !== def.tiers) {
    // Đúng dạng tầng × ô nhưng số ô đã đổi: giữ nguyên hàng, bù ô trống / cắt ô thừa
    const tiers = f.tiers.slice(0, target).map((t) => ({ ...t }));
    while (tiers.length < target) tiers.push({ productId: null, count: 0 });
    return { ...f, tiers };
  }
  const tiers: Tier[] = [];
  for (const old of f.tiers) {
    let lots = old.productId ? fitLots(old.lots, old.count, old.productId) : [];
    for (let i = 0; i < def.slots; i++) {
      const [rest, taken] = takeOldest(lots, def.capacity);
      lots = rest;
      const count = taken.reduce((n, l) => n + l.qty, 0);
      tiers.push({ productId: count || i === 0 ? old.productId : null, count, lots: taken });
    }
  }
  return { ...f, tiers };
}

/** Số liệu nhiệm vụ đọc từ trạng thái game. */
export const questContext = (s: GameState): QuestContext => ({
  day: s.day, level: s.level, stats: s.stats, totals: s.totals, staffCount: s.staff.length,
  shopTier: s.shopTier, warehouseTier: s.warehouseTier, ordersDone: s.ordersDone, log: s.questLog,
  festivalGoods: festivalOn(s.day) ? festivalStock(festivalOn(s.day)!, s.level) : [],
  reservationsToday: Object.values(s.reservations).filter((r) => r.day === s.day).length,
  rent: rentOf(s.shopTier),
});

/** Trạng thái lúc bắt đầu game mới. */
export const newGameData = () => ({
  day: 1,
  minutes: DAY_START,
  money: 300000,
  level: 1,
  xp: 0,
  storage: { mi: 10, nuoc: 10, banh: 5 } as Record<string, number>,
  storageLots: {} as Record<string, Lot[]>,
  furniture: [
    {
      uid: 1, type: 'shelf', x: -1.8, z: -2.0, rot: 0,
      tiers: [
        { productId: 'mi', count: 4 }, { productId: 'mi', count: 2 }, { productId: 'nuoc', count: 4 },
        { productId: 'nuoc', count: 2 }, { productId: 'banh', count: 4 }, { productId: null, count: 0 },
      ],
    },
    { uid: 2, type: 'shelf', x: 0.4, z: -2.0, rot: 0, tiers: emptyTiers('shelf') },
  ] as Furniture[],
  shelfHeat: {} as Record<number, number>,
  impulseHinted: false,
  prices: {} as Record<string, number>,
  happyHour: null as HappyHour | null,
  stats: emptyStats(),
  shopTier: 0,
  pendingUpgrade: false,
  style: { wall: 0xfff3b0, floor: 0xd8cfc0, roof: 0x1e8449 } as ShopStyle,
  staff: [] as Staff[],
  candidates: generateCandidates(1, 1),
  autoOpen: true,
  // Ván mới để người chơi tự điều hành core loop (ra tiệm, mở cửa); bản lưu cũ giữ nguyên thói quen
  autoRoutine: false,
  autoSwap: true,
  totals: emptyTotals(),
  questLog: emptyQuestLog(),
  warehouseTier: 0,
  reviews: [] as Review[],
  repLog: [] as RepSample[],
  community: {} as Record<string, CommunityProgress>,
  opening: undefined as Opening | undefined,
  deliveries: [] as Delivery[],
  demand: {} as Record<string, number>,
  demandToday: {} as Record<string, number>,
  sales: {} as Record<string, number>,
  salesToday: {} as Record<string, number>,
  regulars: {} as Record<string, RegularProgress>,
  reservations: {} as Record<string, Reservation>,
  history: [] as DayRecord[],
  activeCombos: [] as string[],
  order: null as ActiveOrder | null,
  ordersDone: 0,
  cookJobs: [] as CookJob[],
  vendorOffer: null as VendorOffer | null,
  phoneOrders: [] as PhoneOrder[],
  phoneSlot: 0,
  phoneHintDay: 0,
  phoneOrdersDone: 0,
  debts: {} as Record<string, Debt>,
  market: {} as Record<string, number>,
  allowCredit: true,
  biz: newBiz(),
  vendorDay: 0,
  contracts: {} as Record<string, ContractState>,
  event: null as RandomEvent | null,
  costume: 'default',
  shopName: 'Tạp Hóa Đầu Ngõ',
  giftStreak: 0,
  giftLastDay: 0,
  wheelLastDay: 0,
  wheelBoost: 1,
  skills: [] as SkillId[],
  titles: [] as string[],
  fakeCash: 0,
  ...initialWeather(),
});

/** Thời tiết ván mới: ngày đầu luôn nắng, dự báo nối tiếp từ đó. */
export function initialWeather(seed = newWeatherSeed()) {
  return { weatherSeed: seed, weather: 'sunny' as Weather, forecast: forecastFrom(seed, 1, 'sunny') };
}

  /** Trung bình trượt theo ngày, ngày gần nặng hơn. */
  function movingAverage(avg: Record<string, number>, today: Record<string, number>) {
    const out: Record<string, number> = {};
    for (const id of new Set([...Object.keys(avg), ...Object.keys(today)])) {
      const v = (avg[id] ?? 0) * 0.6 + (today[id] ?? 0) * 0.4;
      if (v >= 0.05) out[id] = Math.round(v * 100) / 100;
    }
    return out;
  }

let messageTimer: ReturnType<typeof setTimeout> | undefined;

export const useGame = create<GameState>((set, get) => {
  /** Đầu bếp trực ca tay nghề cao nhất: mẻ nấu nhanh hơn bấy nhiêu (1★ = như chủ tự nấu). */
  const cookSpeed = () => {
    const s = get();
    let best = 1;
    for (const st of s.staff) {
      if (st.role !== 'cook') continue;
      const shift = SHIFTS[st.shift];
      if (s.minutes >= shift.from && s.minutes < shift.to) best = Math.max(best, skillSpeed(st.skill));
    }
    return best;
  };

  /** Điện thoại: đổ chuông theo khung giờ khi tiệm mở; cúp máy khi không nghe; huỷ khi trễ quá lâu. */
  const updatePhones = () => {
    const s = get();
    let { phoneOrders, phoneSlot } = s;
    let changed = false;
    const hasCourier = s.staff.some((w) => w.role === 'courier');
    while (phoneSlot < PHONE_SLOTS.length && s.minutes >= PHONE_SLOTS[phoneSlot]) {
      // Lỡ khung giờ (tua nhanh qua), tiệm đóng cửa hoặc chưa thuê nhân viên giao hàng thì bỏ qua khung đó
      // Có trạm nấu trong tiệm thì đôi khi cuộc gọi là đơn nấu món nhà làm (giá hời)
      const stations = [...new Set(s.furniture.filter((f) => isCookStation(f.type)).map((f) => f.type as CookingStation))];
      const call = s.shopOpen && s.minutes < PHONE_SLOTS[phoneSlot] + 30 && hasCourier
        ? phoneCallFor(s.weatherSeed, s.day, phoneSlot, s.level, s.regulars, s.day * 100 + phoneSlot, s.weather, s.storage, stations, reputationOf(s.repLog).overall)
        : null;
      if (call) {
        phoneOrders = [...phoneOrders, call];
        playSfx('ring');
        s.notify(call.vip
          ? `👑 ${call.caller} (người nhà của ${regularById(call.regular!)?.name ?? 'khách quen'}) đặt GÓI LỚN: ${describeItems(call.items)} — giá hời ×${call.premium}!`
          : call.premium
            ? `🍳 ${call.caller} (${houseById(call.houseId)!.name}) đặt nấu: ${describeItems(call.items)} — trả giá hời ×${call.premium}, nấu xong nghe máy rồi mang đi!`
            : `📞 ${call.caller} (${houseById(call.houseId)!.name}) gọi đặt hàng: ${describeItems(call.items)}`);
      } else if (s.shopOpen && !hasCourier && (s.weather === 'rain' || s.weather === 'storm') && s.phoneHintDay !== s.day) {
        // Mưa mà không ai giao hàng thì lỡ hết đơn — nhắc một lần mỗi ngày cho khỏi làm phiền
        set({ phoneHintDay: s.day });
        s.notify('🌧️ Trời mưa, nhiều người muốn gọi đặt hàng — thuê nhân viên giao hàng để nhận đơn!');
      }
      phoneSlot++;
      changed = true;
    }
    const kept: PhoneOrder[] = [];
    let k: Stock | null = null;
    for (const o of phoneOrders) {
      if (o.status === 'ringing' && s.minutes > o.answerBy) {
        s.notify(`📵 ${o.caller} đã cúp máy vì không ai nghe`);
        changed = true;
      } else if (o.status === 'carrying' && s.minutes > o.dueAt + CANCEL_AFTER_LATE) {
        k ??= copyStock(get());
        for (const [id, qty] of Object.entries(o.items)) putStock(k, id, qty, o.lots?.[id]);
        s.addReview(2, 'wait');
        if (o.regular) s.adjustFriendship(o.regular, -PHONE_FRIEND_GAIN);
        s.notify(`😠 ${o.caller} huỷ đơn vì chờ quá lâu, hàng đã mang về kho`);
        changed = true;
      } else kept.push(o);
    }
    if (changed) set({ phoneOrders: kept, phoneSlot, ...(k ?? {}) });
    // Người bán rong chờ lâu không ai trả lời (hoặc tiệm đóng cửa) thì đi chỗ khác
    const offer = get().vendorOffer;
    if (offer && (s.minutes > offer.expiresAt || !s.shopOpen)) {
      const v = vendorById(offer.vendorId);
      set({ vendorOffer: null });
      s.notify(`${v?.icon} ${v?.name} chờ lâu quá, đi lấy hàng chỗ khác`);
    }
  };

  /** Kết thúc ngày: hiện bảng tổng kết, sang ngày mới. */
  const endDay = (extra: Partial<GameState> = {}) => {
    const s = get();
    if (s.pendingUpgrade) {
      // Mặt tiền giữ nguyên, tiệm nới ra phía sau: giữ đồ đạc ở đúng chỗ cũ
      const shift = (SHOP_TIERS[s.shopTier + 1].depth - SHOP_TIERS[s.shopTier].depth) / 2;
      set({
        shopTier: s.shopTier + 1,
        pendingUpgrade: false,
        furniture: s.furniture.map((f) => ({ ...f, z: f.z + shift })),
        opening: { day: s.day + 1, tier: s.shopTier + 1 },
      });
      s.notify(`🏗️ Thợ đã xây xong: ${SHOP_TIERS[s.shopTier + 1].name}! Mai khai trương, cả hẻm sẽ tới mừng, xem mục tiêu ở Nhiệm vụ`);
    }
    // Qua đêm hàng cũ đi một ngày hạn, rồi hàng đặt hôm nay về kho lúc sáng mai (hạn đầy)
    const aged = spoilOvernight(get());
    const k: Stock = { storage: aged.storage, storageLots: aged.storageLots };
    for (const d of s.deliveries) for (const [id, qty] of Object.entries(d.items)) putStock(k, id, qty);
    // Sổ nợ: nợ lâu thì nhắc chủ tiệm, quá hạn chót coi như mất
    const debts: Record<string, Debt> = {};
    for (const [rid, d] of Object.entries(s.debts)) {
      const age = s.day + 1 - d.since;
      if (age > DEBT_WRITE_OFF_DAYS) {
        s.adjustFriendship(rid, -WRITE_OFF_FRIEND_LOSS);
        s.notify(`📕 ${regularById(rid)?.name} quỵt nợ ${formatMoney(d.amount)} sau ${DEBT_WRITE_OFF_DAYS} ngày`);
        continue;
      }
      if (age === DEBT_LATE_DAYS + 1) s.notify(`📒 ${regularById(rid)?.name} nợ ${formatMoney(d.amount)} đã ${DEBT_LATE_DAYS} ngày, nên nhắc nợ`);
      debts[rid] = d;
    }
    // Đơn gọi điện chưa giao: hàng đã soạn mang về kho, khách phật ý
    for (const o of s.phoneOrders.filter((p) => p.status === 'carrying')) {
      for (const [id, qty] of Object.entries(o.items)) putStock(k, id, qty, o.lots?.[id]);
      s.addReview(2, 'wait');
      if (o.regular) s.adjustFriendship(o.regular, -PHONE_FRIEND_GAIN);
    }
    // Lời hẹn giữ món: chỉ giữ lại hẹn mới lập hôm nay (cho ngày mai); hẹn cũ khách đã ghé hay không thì xoá
    const reservations = Object.fromEntries(
      Object.entries(s.reservations).filter(([, r]) => r.day === s.day + 1),
    );
    if (s.deliveries.length) s.notify(`🚚 Hàng đã về kho: ${s.deliveries.length} đơn`);
    if (aged.items) s.notify(`🗑️ ${aged.items} món hết hạn phải bỏ đi (vốn ${formatMoney(aged.cost)})`);
    // Nhu cầu: trung bình trượt, ngày gần nặng hơn
    const demand = movingAverage(s.demand, s.demandToday);
    const sales = movingAverage(s.sales, s.salesToday);
    const today = s.forecast[0];
    // Đơn tiệc: quá hạn chưa giao thì người đặt phật ý; lời mời không nhận thì hết hạn
    let order = s.order;
    if (order && order.dueDay <= s.day) {
      const def = partyOrderById(order.id);
      if (order.accepted && def) {
        s.addReview(1, 'stock');
        if (def.regular) s.adjustFriendship(def.regular, -STORY_ORDER_FRIEND_LOSS);
        s.notify(`😠 Lỡ hẹn đơn "${def.title}" của ${def.from}${def.regular ? ` · -${STORY_ORDER_FRIEND_LOSS} thân thiết` : ''}`);
      }
      order = null;
    }
    order ??= offerForDay(s.weatherSeed, s.day + 1, s.level, s.regulars);
    // Kệ hao mòn qua đêm, mòn nhiều có thể hỏng
    const w = RISK_RULES.wear;
    let brokeNow = 0;
    let furniture = aged.furniture.map((f) => {
      if (s.level < w.unlock || !wears(f.type) || f.broken) return f;
      const wear = Math.min(100, (f.wear ?? 0) + w.perNight[0] + Math.floor(Math.random() * (w.perNight[1] - w.perNight[0] + 1)));
      const broken = Math.random() < (wear - w.breakFrom) * w.perPoint;
      if (broken) brokeNow++;
      return { ...f, wear, broken };
    });
    // Hợp đồng bảo trì: thợ ghé sáng nay — kệ mòn được bảo trì miễn phí, kệ hỏng sửa ngay nửa giá
    let maintCost = 0;
    let maintFixed = 0;
    if (hasUpgrade(s.biz, 'maintenance')) {
      furniture = furniture.map((f) => {
        if (!wears(f.type)) return f;
        if (f.broken) {
          maintCost += Math.round(repairCost(f.type) / 2000) * 1000;
          maintFixed++;
          return { ...f, wear: 10, broken: false };
        }
        return (f.wear ?? 0) >= w.serviceFrom ? { ...f, wear: 10 } : f;
      });
      brokeNow = 0;
    }
    // Sự kiện ngẫu nhiên hôm nay (ngày mới) + hợp đồng cung cấp tới kỳ giao
    const nextEvent = eventOn(s.weatherSeed, s.day + 1, s.level);
    let contractNews: string[] = [];
    const contracts: Record<string, ContractState> = { ...s.contracts };
    for (const [cid, cs2] of Object.entries(contracts)) {
      const cdef = supplyContractById(cid);
      if (!cdef) continue;
      if (cs2.dueDay <= s.day + 1) {
        contractNews.push((cs2.delivered === 0 && cs2.pending)
          ? `\u{1F4CB} "${cdef.title}" chờ giao kỳ đầu (mỗi ${cdef.periodDays} ngày)`
          : `\u{1F69A} "${cdef.title}" tới kỳ giao hàng, xem ở Hợp đồng`);
      }
    }
    const news = morningNews(s.weatherSeed, s.day + 1, s.level);
    if (nextEvent) news.push(`${nextEvent.icon} Sự kiện hôm nay: ${nextEvent.blurb}`);
    if (contractNews.length) news.push(...contractNews);
    if (order && !order.accepted) news.push(`📋 ${partyOrderById(order.id)!.from} muốn đặt đơn, xem ở Nhiệm vụ`);
    if (brokeNow) news.push(`🔧 ${brokeNow} kệ bị hỏng qua đêm, bấm vào kệ để sửa`);
    if (maintFixed) news.push(`🔧 Thợ bảo trì đã sửa ${maintFixed} kệ hỏng sáng nay (nửa giá: ${formatMoney(maintCost)})`);
    else if (hasUpgrade(s.biz, 'maintenance')) news.push('🔧 Thợ bảo trì đã ghé: kệ mòn được chăm sóc như mới');
    // Tủ mát/tủ đông hỏng mà còn hàng: mất lạnh qua đêm, hàng trong tủ hỏng nhanh hơn
    const coldBroken = s.furniture.filter((f) => f.broken && (f.type === 'fridge' || f.type === 'freezer')
      && f.tiers.some((t) => t.count > 0));
    if (coldBroken.length) news.push(`🧊 ${coldBroken.length} tủ lạnh đang hỏng: hàng mát trong tủ không được giữ lạnh, hỏng nhanh như để ngoài kho — sửa sớm!`);
    // Thanh tra thị trường định kỳ: chấm theo chỉ số của ngày vừa đóng cửa
    let inspectPay = 0;
    if (s.level >= INSPECTION_UNLOCK && s.day % INSPECTION_EVERY === 0) {
      const near = s.furniture.reduce((n, f) => n + f.tiers.reduce((m, t) => {
        if (!t.productId || t.count <= 0) return m;
        const life = nearestLife(fitLots(t.lots, t.count, t.productId));
        return life !== null && life <= 1 ? m + t.count : m;
      }, 0), 0);
      const priced = Object.keys(s.prices);
      const priceIndex = priced.length ? priced.reduce((n, id) => n + s.prices[id] / productById(id).sell, 0) / priced.length : 1;
      const insp = inspectionResult({ dirt: s.dirt, nearExpiryOnShelves: near, priceIndex, rating: summarizeReviews(s.reviews.slice(-30)).average });
      inspectPay = insp.pass ? INSPECTION_REWARD : -INSPECTION_FINE;
      news.push(`📋 Thanh tra thị trường ${insp.score}/4: ${insp.notes.join(' · ')} — ${insp.pass ? `ĐẠT, thưởng ${formatMoney(INSPECTION_REWARD)}` : `KHÔNG ĐẠT, phạt ${formatMoney(INSPECTION_FINE)}`}`);
    }
    if (s.fakeCash) news.push(`💸 Kiểm két thấy ${formatMoney(s.fakeCash)} tiền giả`);
    s.notify([`Hôm nay: ${describeDay(s.weatherSeed, s.day + 1, today)}. ${WEATHER[today].tip}`, ...news].join(' · '));
    // Giá tham chiếu thị trường nhích theo khan hiếm (kho + kệ) và cầu trung bình của từng món
    const market: Record<string, number> = { ...s.market };
    for (const p of unlockedProducts(s.level)) {
      const onShelf = furniture.reduce((n, f) => n + f.tiers.reduce((m, t) => m + (t.productId === p.id ? t.count : 0), 0), 0);
      market[p.id] = nextMarketIndex(market[p.id] ?? 1, (k.storage[p.id] ?? 0) + onShelf, 0, demand[p.id] ?? 0);
    }
    // Trả lương và tiền nhà cuối ngày (kèm phí thợ bảo trì sáng nay nếu có)
    const wages = wagesDue(s);
    const rent = rentOf(s.shopTier);
    const stats = { ...s.stats, wages, rent, spent: s.stats.spent + maintCost, spoiledItems: aged.items, spoiledCost: aged.cost };
    const biz = bizEndOfDay(s, stats);
    if (biz.news.length) s.notify(biz.news.join(' · '));
    const todayReviews = s.reviews.filter((r) => r.day === s.day);
    const record: DayRecord = {
      day: s.day, revenue: stats.revenue, profit: stats.revenue - stats.spent - wages - rent,
      customers: stats.customers, unhappy: stats.unhappy,
      ...(todayReviews.length ? { rating: todayReviews.reduce((n, r) => n + r.stars, 0) / todayReviews.length } : {}),
    };
    const nextId = Math.max(0, ...s.staff.map((st) => st.id), ...s.candidates.map((c) => c.id)) + 1;
    // Thức qua nửa đêm (ca đêm) thì hôm sau dậy trễ, bỏ lỡ buổi sáng đông khách
    const wokeLate = s.minutes >= 24 * 60;
    if (wokeLate) s.notify('😴 Ngủ muộn vì ca đêm: hôm nay dậy trễ, bỏ lỡ buổi sáng đông khách!');
    set({
      candidates: generateCandidates(s.level, nextId),
      day: s.day + 1,
      minutes: wokeLate ? LATE_WAKE_AT : DAY_START,
      shopOpen: false,
      dirt: 0,
      buildMode: false,
      placing: null,
      panel: { type: 'summary', day: s.day, stats },
      stats: emptyStats(),
      ...k, furniture, order, phoneOrders: [], phoneSlot: 0, debts, vendorOffer: null, event: nextEvent, contracts, fakeCash: 0, wheelBoost: 1, history: [...s.history, record].slice(-HISTORY_DAYS), deliveries: [], demand, demandToday: {}, sales, salesToday: {}, reservations, market,
      weather: s.forecast[0], forecast: forecastFrom(s.weatherSeed, s.day + 1, s.forecast[0]),
      ...extra,
      money: (extra.money ?? s.money) - wages - rent - maintCost + inspectPay + biz.money,
      biz: biz.biz,
    });
    checkAchievements();
    // Hàng mới về sáng nay: ô kệ hết hàng mà kho không còn món đó thì đổi sang món khác
    get().checkTitles();
    if (s.autoSwap) {
      const swapped = get().replaceEmptySlots();
      if (swapped.length) s.notify(`🔄 Thay ô hết hàng: ${swapped.join(', ')}`);
    }
  };

  // Giá nhập theo lễ, sự kiện thị trường và kỹ năng thương lượng
  setCostModifier((id, day) => {
    const s = get();
    return dayEffects(s.weatherSeed, day, s.level).cost(id) * (hasSkill(s.skills, 'negotiator') ? 0.95 : 1);
  });
  // Giá gợi ý hiện hành theo hệ số thị trường (khan hàng trượt lên, tồn nhiều trượt xuống)
  setMarketIndex((id) => get().market[id] ?? 1);

  const updateFurniture = (uid: number, fn: (f: Furniture) => Furniture) =>
    set({ furniture: get().furniture.map((f) => (f.uid === uid ? fn(f) : f)) });

  return {
    ...newGameData(),
    stylePreview: null,
    speed: 1,
    location: 'Nhà của bạn',
    hint: null,
    message: null,
    panel: null,
    buildMode: false,
    placing: null,
    shopOpen: false,
    waiting: 0,
    customersInside: 0,
    vendorOffer: null,
    dirt: 0,
    addDirt: (amount) => {
      const before = get().dirt;
      const dirt = Math.max(0, Math.min(DIRT_MAX, before + amount));
      set({ dirt });
      if (before < 60 && dirt >= 60) get().notify('🧹 Sàn tiệm bẩn quá, khách bắt đầu ngại vào. Thuê lao công nhé!');
    },

    setSpeed: (speed) => set({ speed }),
    tick: (dt) => {
      const s = get();
      const minutes = s.minutes + dt * MINUTES_PER_SECOND * s.speed;
      // Ăn sáng no bụng thì thức khuya được thêm một chút mới ngất
      if (minutes >= FAINT_AT + (s.biz.breakfastDay === s.day ? BREAKFAST.lateMinutes : 0)) {
        const lost = Math.floor(s.money * 0.1);
        endDay({ money: s.money - lost });
        s.notify(`😵 Bạn thức quá khuya và ngất đi... Mất ${formatMoney(lost)} tiền thuốc.`);
        return;
      }
      set({ minutes });
      updatePhones();
      maybeSurprise(minutes - s.minutes);
      // Các mẻ nấu đang chạy: hết giờ thì thành phẩm vào kho (bày bán như hàng thường)
      const jobs = get().cookJobs;
      if (jobs.length && s.speed > 0) {
        const step = dt * MINUTES_PER_SECOND * s.speed * cookSpeed();
        const next = jobs.map((j) => ({ ...j, remaining: j.remaining - step }));
        const done = next.filter((j) => j.remaining <= 0);
        if (done.length) {
          const k = copyStock(get());
          for (const j of done) {
            const r = RECIPE_MAP[j.recipeId];
            if (r) putStock(k, r.outputId, r.outputQty);
          }
          set({ ...k, cookJobs: next.filter((j) => j.remaining > 0) });
          playSfx('ding');
          for (const j of done) {
            const r = RECIPE_MAP[j.recipeId];
            if (!r) continue;
            get().notify(`🍲 Nấu xong: ${r.outputQty} ${productById(r.outputId).name} đã vào kho, bày lên kệ được ngay`);
            get().addXp(4);
          }
        } else {
          set({ cookJobs: next });
        }
      }
    },
    sleep: () => {
      const s = get();
      if (s.minutes < SLEEP_FROM) {
        s.notify('Chưa buồn ngủ. Từ 18:00 mới đi ngủ được.');
        return false;
      }
      endDay();
      return true;
    },
    notify: (message) => {
      set({ message });
      clearTimeout(messageTimer);
      messageTimer = setTimeout(() => set({ message: null }), 3000);
    },
    openPanel: (panel) => set({ panel }),
    closePanel: () => set({ panel: null }),

    toggleShop: () => {
      const s = get();
      set({ shopOpen: !s.shopOpen });
      s.notify(s.shopOpen ? '🔒 Đã đóng cửa tiệm' : `🏪 Mở cửa! Hôm nay dự kiến khoảng ${customersPerDay(s.level)} khách`);
    },
    buy: (productId, qty) => {
      const s = get();
      // Món nhà làm không nhập được ở đâu: phải tự nấu ở trạm (vì vậy đơn nấu mới có ý nghĩa)
      if (COOKED_PRODUCT_IDS.has(productId)) {
        s.notify(`🍳 ${productById(productId).name} là món nhà làm — vào trạm nấu để chế biến nhé`);
        return false;
      }
      const cost = productById(productId).buy * qty;
      if (s.money < cost) {
        s.notify('Không đủ tiền!');
        return false;
      }
      const k = copyStock(s);
      putStock(k, productId, qty);
      set({
        money: s.money - cost,
        ...k,
        stats: { ...s.stats, spent: s.stats.spent + cost },
        totals: { ...s.totals, spent: s.totals.spent + cost },
      });
      return true;
    },
    placeOrder: (supplierId, items) => {
      const s = get();
      const sup = supplierById(supplierId);
      const lines = Object.fromEntries(Object.entries(items).filter(([, q]) => q > 0));
      const cost = orderTotal(sup, lines, s.day);
      if (!Object.keys(lines).length) return false;
      if (cost < sup.minOrder) {
        s.notify(`${sup.name} nhận đơn từ ${formatMoney(sup.minOrder)}`);
        return false;
      }
      if (s.money < cost) {
        s.notify('Không đủ tiền!');
        return false;
      }
      // Hàng đang chờ giao cũng phải có chỗ trong kho
      const pending = s.deliveries.map((d) => d.items);
      const cap = storageCapacity(s.warehouseTier);
      const need = storageUsed(s.storage, ...pending, lines);
      if (need > cap) {
        s.notify(`📦 Nhà kho không đủ chỗ: đơn cần ${need - storageUsed(s.storage, ...pending)} thùng, kho còn trống ${Math.max(0, cap - storageUsed(s.storage, ...pending))} thùng. Nâng cấp nhà kho nhé!`);
        return false;
      }
      const stats = { ...s.stats, spent: s.stats.spent + cost };
      const totals = { ...s.totals, spent: s.totals.spent + cost };
      if (sup.delayDays === 0) {
        const k = copyStock(s);
        for (const [id, qty] of Object.entries(lines)) putStock(k, id, qty);
        set({ money: s.money - cost, ...k, stats, totals });
        const swapped = s.autoSwap ? get().replaceEmptySlots() : [];
        s.notify(`📦 Đã nhập hàng từ ${sup.name}: ${formatMoney(cost)}${swapped.length ? ` · 🔄 Thay ô hết hàng: ${swapped.join(', ')}` : ''}`);
      } else {
        set({ money: s.money - cost, stats, totals, deliveries: [...s.deliveries, { supplierId, items: lines }] });
        s.notify(`🚚 Đã đặt ${sup.name} (${formatMoney(cost)}), hàng về lúc 6h sáng mai`);
      }
      return true;
    },
    noteDemand: (productId) => {
      const d = get().demandToday;
      set({ demandToday: { ...d, [productId]: (d[productId] ?? 0) + 1 } });
    },
    upgradeWarehouse: () => {
      const s = get();
      const next = WAREHOUSE_TIERS[s.warehouseTier + 1];
      if (!next) return false;
      if (s.level < next.unlock) {
        s.notify(`Cần cấp ${next.unlock} để nâng lên ${next.name}`);
        return false;
      }
      if (s.money < next.price) {
        s.notify('Không đủ tiền!');
        return false;
      }
      set({ money: s.money - next.price, warehouseTier: s.warehouseTier + 1, stats: { ...s.stats, spent: s.stats.spent + next.price }, totals: { ...s.totals, spent: s.totals.spent + next.price } });
      s.notify(`🏭 Đã nâng cấp ${next.name}: chứa ${next.cases} thùng, giữ lạnh ${next.cold} món`);
      return true;
    },
    replaceEmptySlots: () => {
      const done: string[] = [];
      const incoming = new Set(get().deliveries.flatMap((d) => Object.keys(d.items)));
      for (const f0 of get().furniture) {
        const def = furnitureDef(f0.type);
        f0.tiers.forEach((t0, i) => {
          const s = get();
          const f = s.furniture.find((it) => it.uid === f0.uid)!;
          const t = f.tiers[i];
          const old = t.productId;
          if (!old || t.count > 0 || (s.storage[old] ?? 0) > 0 || incoming.has(old)) return;
          // Món thay: kho đang có, ưu tiên món chưa bày ở đâu trong tiệm, rồi món kho còn nhiều nhất
          const shown = new Set(s.furniture.flatMap((it) => it.tiers.filter((x) => x.count > 0).map((x) => x.productId)));
          const pick = unlockedProducts(s.level)
            .filter((p) => def.categories.includes(p.category) && (s.storage[p.id] ?? 0) > 0)
            .sort((a, b) => Number(shown.has(a.id)) - Number(shown.has(b.id)) || (s.storage[b.id] ?? 0) - (s.storage[a.id] ?? 0))[0];
          if (!pick) return;
          s.stockTier(f.uid, i, pick.id);
          done.push(`${productById(old).name} → ${pick.name}`);
        });
      }
      return done;
    },
    unstockTier: (uid, tierIndex) => {
      const k = copyStock(get());
      updateFurniture(uid, (f) => ({
        ...f,
        tiers: f.tiers.map((t, i) => {
          if (i !== tierIndex) return t;
          returnTier(k, t);
          return { ...t, count: 0, lots: [] };
        }),
      }));
      set(k);
    },
    stockTier: (uid, tierIndex, productId) => {
      const s = get();
      const k = copyStock(s);
      updateFurniture(uid, (f) => {
        const tiers = f.tiers.map((t) => ({ ...t }));
        const tier = tiers[tierIndex];
        // Đổi loại hàng thì trả hàng cũ về kho
        if (tier.productId && tier.productId !== productId) {
          returnTier(k, tier);
          tier.count = 0;
          tier.lots = [];
        }
        tier.productId = productId;
        if (productId) {
          const moved = takeStock(k, productId, furnitureDef(f.type).capacity - tier.count);
          tier.lots = mergeLots(fitLots(tier.lots, tier.count, productId), moved);
          tier.count = tier.lots.reduce((n, l) => n + l.qty, 0);
        }
        return { ...f, tiers };
      });
      set(k);
    },
    takeFromShelf: (productId, preferUid) => {
      const s = get();
      // Ưu tiên kệ khách đang đứng trước, sau đó tới tủ mát (đắt hơn)
      const score = (f: Furniture) => (f.uid === preferUid ? 10 : 0) + (furnitureDef(f.type).priceBonus ?? 0);
      const sorted = [...s.furniture].sort((a, b) => score(b) - score(a));
      for (const f of sorted) {
        if (f.broken) continue;
        const j = f.tiers.findIndex((t) => t.productId === productId && t.count > 0);
        if (j < 0) continue;
        updateFurniture(f.uid, (old) => ({
          ...old,
          tiers: old.tiers.map((t, i) => (i === j ? { ...t, count: t.count - 1, lots: takeOldest(fitLots(t.lots, t.count, productId), 1)[0] } : t)),
        }));
        // Heatmap vị trí: đếm số món bán ra của kệ vừa được lấy hàng
        const heat = get().shelfHeat;
        set({ shelfHeat: { ...heat, [f.uid]: (heat[f.uid] ?? 0) + 1 } });
        // Lô cận hạn tự giảm giá
        const sale = tierMarkdown(productId, f.tiers[j].lots, f.tiers[j].count);
        return Math.round(s.priceOf(productId) * (1 + (furnitureDef(f.type).priceBonus ?? 0)) * (1 - sale));
      }
      return null;
    },
    priceOf: (productId) => {
      const s = get();
      let p = s.prices[productId] ?? productById(productId).sell;
      // Đợt đối đầu giá với đối thủ: mọi món bán rẻ hơn trong ngày
      if (counterActive(s.biz.counter, s.day, 'price')) p = Math.round(p * (1 - PRICE_WAR_CUT));
      // Giờ vàng tự đặt: giảm giá đúng khung 2 tiếng đã chọn
      if (happyHourActive(s.happyHour, s.minutes)) p = Math.round(p * (1 - s.happyHour!.off / 100));
      // Ca đêm: khách khuya lười trả giá, được phép bán đắt hơn buổi ngày
      if (hasUpgrade(s.biz, 'night') && isNight(s.minutes)) p = Math.round(p * NIGHT_PRICE_MUL);
      return p;
    },
    setPrice: (productId, price) => set({ prices: { ...get().prices, [productId]: price } }),
    setHappyHour: (hh) => set({ happyHour: hh }),
    checkout: (items, discount = 0, combos = 0, payment = 'cash') => {
      const s = get();
      const total = items.reduce((sum, it) => sum + it.price, 0) - discount;
      // Ví điện tử / máy POS lấy ít % phí, tiền mặt và chuyển khoản không mất gì
      const pay = paymentById(payment);
      const fee = Math.round(total * pay.fee);
      const salesToday = { ...s.salesToday };
      const byItem = { ...s.stats.byItem };
      for (const it of items) {
        salesToday[it.id] = (salesToday[it.id] ?? 0) + 1;
        const line = byItem[it.id] ?? { qty: 0, revenue: 0, cost: 0 };
        byItem[it.id] = { qty: line.qty + 1, revenue: line.revenue + it.price, cost: line.cost + productById(it.id).buy };
      }
      const byMethod = { ...s.stats.byMethod };
      const m = byMethod[payment] ?? { revenue: 0, count: 0 };
      byMethod[payment] = { revenue: m.revenue + total, count: m.count + 1 };
      set({
        salesToday,
        money: s.money + total - fee,
        stats: {
          ...s.stats, revenue: s.stats.revenue + total, itemsSold: s.stats.itemsSold + items.length, byItem,
          byHour: addHour(s.stats.byHour, s.minutes, 0, total), byMethod,
          fees: (s.stats.fees ?? 0) + fee,
          combos: (s.stats.combos ?? 0) + combos, comboDiscount: (s.stats.comboDiscount ?? 0) + discount,
        },
        totals: {
          ...s.totals, revenue: s.totals.revenue + total, itemsSold: s.totals.itemsSold + items.length,
          cookedSold: s.totals.cookedSold + items.filter((it) => COOKED_PRODUCT_IDS.has(it.id)).length,
        },
      });
      // Mỗi món 1 XP, hàng đắt cho thêm (cứ 20.000đ thêm 1 XP)
      s.addXp(items.reduce((sum, it) => sum + 1 + Math.floor(it.price / 20000), 0));
      get().communitySale(items.map((it) => it.id));
    },
    noteMiss: (reason, productId) => {
      const s = get();
      const key = missKey(reason, productId);
      set({ stats: {
        ...s.stats,
        missed: { ...s.stats.missed, [reason]: (s.stats.missed?.[reason] ?? 0) + 1 },
        missLog: { ...s.stats.missLog, [key]: (s.stats.missLog?.[key] ?? 0) + 1 },
      } });
      // Lần đầu trong ngày khách tìm một món mà kệ hết: báo để người chơi kịp bày/nhập thêm
      if (reason === 'stock' && productId && !s.stats.missLog?.[key]) {
        const name = productById(productId).name;
        s.notify((s.storage[productId] ?? 0) > 0
          ? `⚠️ Kệ hết ${name}, trong kho còn — bày lên kệ ngay!`
          : `⚠️ Khách tìm ${name} mà hết hàng — nhớ nhập thêm`);
      }
    },
    setAllowCredit: (on) => set({ allowCredit: on }),
    consumeStock: (productId, qty) => {
      const k = copyStock(get());
      takeStock(k, productId, qty);
      set(k);
    },
    checkoutOnCredit: (regularId, items, discount = 0, combos = 0) => {
      // Ghi nhận bán hàng như thường (sổ thanh toán ghi vào "Ghi sổ"), rồi lấy lại tiền khỏi két và ghi vào sổ nợ
      get().checkout(items, discount, combos, 'credit');
      const s = get();
      const total = items.reduce((sum, it) => sum + it.price, 0) - discount;
      const old = s.debts[regularId];
      const amount = (old?.amount ?? 0) + total;
      set({
        money: s.money - total,
        debts: { ...s.debts, [regularId]: { amount, since: old?.since ?? s.day } },
        stats: { ...s.stats, credited: (s.stats.credited ?? 0) + total },
      });
      s.notify(`📒 ${regularById(regularId)?.name} quên ví, ghi sổ ${formatMoney(total)} (tổng nợ ${formatMoney(amount)})`);
    },
    collectDebt: (regularId) => {
      const s = get();
      const debt = s.debts[regularId];
      if (!debt?.amount) return 0;
      const debts = { ...s.debts };
      delete debts[regularId];
      set({ debts, money: s.money + debt.amount, stats: { ...s.stats, repaid: (s.stats.repaid ?? 0) + debt.amount } });
      s.notify(`💵 ${regularById(regularId)?.name} trả nợ ${formatMoney(debt.amount)}${debt.reminded ? '' : ', cảm ơn tiệm cho ghi sổ'}`);
      return debt.amount;
    },
    remindDebt: (regularId) => {
      const s = get();
      const debt = s.debts[regularId];
      if (!debt || debt.reminded) return;
      set({ debts: { ...s.debts, [regularId]: { ...debt, reminded: true } } });
      s.adjustFriendship(regularId, -REMIND_FRIEND_LOSS);
      s.notify(`📞 Đã nhắc ${regularById(regularId)?.name}, lần tới ghé sẽ trả (khách hơi ngại, -${REMIND_FRIEND_LOSS} thân thiết)`);
    },
    forgiveDebt: (regularId) => {
      const s = get();
      const debt = s.debts[regularId];
      if (!debt) return;
      const debts = { ...s.debts };
      delete debts[regularId];
      set({ debts });
      s.adjustFriendship(regularId, FORGIVE_FRIEND_GAIN);
      s.notify(`🤝 Xoá nợ ${formatMoney(debt.amount)} cho ${regularById(regularId)?.name} · +${FORGIVE_FRIEND_GAIN} thân thiết`);
    },
    offerWholesale: () => {
      const s = get();
      if (s.vendorOffer) return s.vendorOffer;
      const offer = makeVendorOffer(s.level, s.minutes);
      if (!offer) return null;
      set({ vendorOffer: offer, vendorDay: s.day });
      const v = vendorById(offer.vendorId)!;
      s.notify(`${v.icon} ${v.name} ghé lấy sỉ ${v.goods}`);
      return offer;
    },
    acceptWholesale: () => {
      const s = get();
      const offer = s.vendorOffer;
      if (!offer) return false;
      const missing = Object.entries(offer.items).filter(([id, q]) => (s.storage[id] ?? 0) < q);
      if (missing.length) {
        s.notify(`Kho còn thiếu: ${missing.map(([id, q]) => `${q - (s.storage[id] ?? 0)} ${productById(id).name}`).join(', ')}`);
        return false;
      }
      const k = copyStock(s);
      for (const [id, q] of Object.entries(offer.items)) takeStock(k, id, q);
      const pay = wholesaleTotal(offer.items, s.priceOf);
      const units = Object.values(offer.items).reduce((n, q) => n + q, 0);
      const byItem = { ...s.stats.byItem };
      for (const [id, q] of Object.entries(offer.items)) {
        const line = byItem[id] ?? { qty: 0, revenue: 0, cost: 0 };
        const revenue = wholesaleTotal({ [id]: q }, s.priceOf);
        byItem[id] = { qty: line.qty + q, revenue: line.revenue + revenue, cost: line.cost + productById(id).buy * q };
      }
      set({
        ...k, vendorOffer: null, money: s.money + pay,
        stats: { ...s.stats, revenue: s.stats.revenue + pay, itemsSold: s.stats.itemsSold + units, byItem },
        totals: { ...s.totals, revenue: s.totals.revenue + pay, itemsSold: s.totals.itemsSold + units },
      });
      get().addXp(10 + Math.floor(units / 3));
      s.notify(`🤝 Bán sỉ cho ${vendorById(offer.vendorId)?.name}: ${units} món, +${formatMoney(pay)}`);
      return true;
    },
    declineWholesale: () => set({ vendorOffer: null }),
    toggleCombo: (id) => {
      const s = get();
      if (s.activeCombos.includes(id)) return set({ activeCombos: s.activeCombos.filter((c) => c !== id) });
      if (s.activeCombos.length >= MAX_ACTIVE_COMBOS) return s.notify(`Chỉ chạy được ${MAX_ACTIVE_COMBOS} combo cùng lúc, tắt bớt một cái nhé`);
      set({ activeCombos: [...s.activeCombos, id] });
      s.notify(`🎁 Bắt đầu chạy combo ${comboById(id)?.name}`);
    },
    recordVisit: (happy, sample) => {
      const s = get();
      set({
        ...(sample ? { repLog: [...s.repLog, sample].slice(-REP_CAP) } : {}),
        stats: {
          ...s.stats, customers: s.stats.customers + 1, unhappy: s.stats.unhappy + (happy ? 0 : 1),
          byHour: addHour(s.stats.byHour, s.minutes, 1, 0),
        },
        totals: { ...s.totals, customers: s.totals.customers + 1 },
      });
      if (happy) s.addXp(2);
    },
    regularVisit: (id, basket, paid) => {
      const s = get();
      const def = regularById(id);
      if (!def) return 0;
      if (!paid) {
        set({ regulars: { ...s.regulars, [id]: regularWalkout(s.regulars[id], s.day) } });
        s.notify(`😞 ${def.name}: "${def.lines.walkout}"`);
        return 0;
      }
      const r = regularCheckout(def, s.regulars[id], basket, s.day);
      set({
        regulars: { ...s.regulars, [id]: r.progress },
        money: s.money + r.tip,
        stats: { ...s.stats, revenue: s.stats.revenue + r.tip },
      });
      // Đợt tri ân khách quen (phản công đối thủ): mỗi khách ghé hôm nay được tặng quà
      let giftNote = '';
      if (counterActive(s.biz.counter, s.day, 'gift')) {
        get().adjustFriendship(id, 2);
        giftNote = ' · 🎁 quà tri ân +2 thân thiết';
      }
      // Lời hẹn giữ món hôm nay: giữ đúng thì khách mừng, hẹn mà không mua được thì phật ý
      const res = s.reservations[id];
      let resNote = '';
      if (res && res.day === s.day) {
        const got = basket.filter((it) => it.id === res.productId).reduce((n, it) => n + 1, 0);
        if (got >= res.qty) {
          get().adjustFriendship(id, RESERVE_BONUS);
          resNote = ` · 🤝 Giữ đúng hẹn ${res.qty} ${productById(res.productId).name}, +${RESERVE_BONUS} thân thiết`;
          set({ stats: { ...get().stats, reservationsFilled: (get().stats.reservationsFilled ?? 0) + 1 } });
        } else {
          get().adjustFriendship(id, -RESERVE_MISS_LOSS);
          resNote = ` · 😔 Đã hẹn giữ ${res.qty} ${productById(res.productId).name} mà không mua được, -${RESERVE_MISS_LOSS} thân thiết`;
        }
        const { [id]: _drop, ...restRes } = get().reservations;
        set({ reservations: restRes });
      }
      const tip = r.tip ? ` · boa ${formatMoney(r.tip)}` : '';
      if (r.newPerks.length) s.notify(`💛 ${def.name} thân thiết hơn: ${r.newPerks.map((p) => p.description).join(' ')}${tip}${resNote}${giftNote}`);
      else s.notify(`😊 ${def.name}: "${def.lines.satisfied}"${tip}${resNote}${giftNote}`);
      return r.tip;
    },
    addReservation: (regularId, productId, qty) => {
      const s = get();
      if (!regularById(regularId)) return;
      set({ reservations: { ...s.reservations, [regularId]: { productId, qty, day: s.day + 1 } } });
      s.notify(`🤝 Đã hẹn giữ ${qty} ${productById(productId).name} cho ${regularById(regularId)?.name} — mai khách ghé lấy, nhớ bày đầy kệ!`);
    },
    cancelReservation: (regularId) => {
      const s = get();
      if (!s.reservations[regularId]) return;
      const { [regularId]: _drop, ...rest } = s.reservations;
      set({ reservations: rest });
      s.notify(`👎 Đã từ chối lời hẹn giữ món (không mất thân thiết)`);
    },
    adjustFriendship: (id, delta) => {
      const s = get();
      const def = regularById(id);
      if (!def) return;
      const r = regularFriendship(def, s.regulars[id], delta);
      set({ regulars: { ...s.regulars, [id]: r.progress } });
      if (r.newPerks.length) s.notify(`💛 ${def.name} thân thiết hơn: ${r.newPerks.map((p) => p.description).join(' ')}`);
    },
    acceptOrder: () => {
      const s = get();
      if (!s.order) return;
      set({ order: { ...s.order, accepted: true } });
      s.notify(`📋 Đã nhận đơn, giao trước hết ngày ${s.order.dueDay}`);
    },
    startCook: (recipeId) => {
      const s = get();
      const r = RECIPE_MAP[recipeId];
      if (!r) return false;
      if (s.level < r.unlock) {
        s.notify(`Món "${r.name}" mở ở cấp ${r.unlock}`);
        return false;
      }
      // Giỏ quà ngày lễ: chỉ gói được trong đúng dịp (giỏ Tết gói mùa Tết...)
      if (r.festival) {
        const now = festivalOn(s.day);
        if (now?.id !== r.festival) {
          s.notify(`🎁 ${r.name} chỉ gói trong dịp ${FESTIVALS.find((f) => f.id === r.festival)?.name ?? r.festival}${now ? ' (đang là dịp khác)' : ' — chưa tới dịp'}`);
          return false;
        }
      }
      const stations = s.furniture.filter((f) => f.type === r.station);
      if (!stations.length) {
        s.notify(`Cần đặt trạm "${furnitureDef(r.station).name}" trong tiệm trước (mua ở 🛠️ Xây dựng)`);
        return false;
      }
      const busy = s.cookJobs.filter((j) => RECIPE_MAP[j.recipeId]?.station === r.station).length;
      if (busy >= stations.length) {
        s.notify(`${furnitureDef(r.station).name} đang bận mẻ trước, chờ chút nhé`);
        return false;
      }
      const missing = r.inputs.filter((i) => (s.storage[i.productId] ?? 0) < i.quantity);
      if (missing.length) {
        s.notify(`Thiếu nguyên liệu: ${missing.map((i) => `${i.quantity - (s.storage[i.productId] ?? 0)} ${productById(i.productId).name}`).join(', ')}. Nhập thêm rồi nấu nhé.`);
        return false;
      }
      const k = copyStock(s);
      for (const i of r.inputs) takeStock(k, i.productId, i.quantity);
      const id = Math.max(0, ...s.cookJobs.map((j) => j.id)) + 1;
      set({ ...k, cookJobs: [...s.cookJobs, { id, recipeId, remaining: r.durationMin, total: r.durationMin }] });
      s.notify(`🍳 Đang nấu ${r.name} (${r.durationMin} phút) — nguyên liệu đã trừ kho, nấu xong tự vào kho`);
      return true;
    },
    declineOrder: () => set({ order: null }),
    answerPhone: (id) => {
      const s = get();
      const o = s.phoneOrders.find((p) => p.id === id && p.status === 'ringing');
      if (!o) return false;
      const missing = Object.entries(o.items).filter(([pid, q]) => (s.storage[pid] ?? 0) < q);
      if (missing.length) {
        s.notify(`Kho còn thiếu: ${missing.map(([pid, q]) => `${q - (s.storage[pid] ?? 0)} ${productById(pid).name}`).join(', ')}. Nhập thêm rồi nghe máy, hoặc từ chối.`);
        return false;
      }
      const k = copyStock(s);
      const lots: Record<string, Lot[]> = {};
      for (const [pid, q] of Object.entries(o.items)) lots[pid] = takeStock(k, pid, q);
      set({ ...k, phoneOrders: s.phoneOrders.map((p) => (p === o ? { ...o, status: 'carrying' as const, lots } : p)) });
      s.notify(`📦 Đã soạn hàng. Mang tới ${houseById(o.houseId)!.name} trước ${formatClock(o.dueAt)} để được boa`);
      return true;
    },
    restockAndAnswerPhone: (id) => {
      const s = get();
      const o = s.phoneOrders.find((p) => p.id === id && p.status === 'ringing');
      if (!o) return false;
      const missing = Object.entries(o.items)
        .map(([pid, q]) => [pid, q - (s.storage[pid] ?? 0)] as const)
        .filter(([, q]) => q > 0);
      const cost = missing.reduce((sum, [pid, q]) => sum + productById(pid).buy * q, 0);
      if (s.money < cost) {
        s.notify(`Không đủ tiền nhập bù (cần ${formatMoney(cost)})`);
        return false;
      }
      for (const [pid, q] of missing) get().buy(pid, q);
      if (missing.length) s.notify(`🛒 Đã nhập bù ${missing.map(([pid, q]) => `${q} ${productById(pid).name}`).join(', ')} (${formatMoney(cost)})`);
      return get().answerPhone(id);
    },
    declinePhone: (id) => {
      const s = get();
      const o = s.phoneOrders.find((p) => p.id === id && p.status === 'ringing');
      if (!o) return;
      set({ phoneOrders: s.phoneOrders.filter((p) => p !== o) });
    },
    deliverPhone: (id) => {
      const s = get();
      const o = s.phoneOrders.find((p) => p.id === id && p.status === 'carrying');
      if (!o) return false;
      const value = phoneOrderValue(o, s.priceOf);
      const fast = s.minutes <= fastWindow(o);
      const onTime = s.minutes <= o.dueAt;
      // Giao ngay trong nửa đầu khung hẹn: boa gấp đôi; giao kịp hẹn: boa thường
      const tip = onTime ? Math.round((value * (fast ? FAST_TIP : ON_TIME_TIP)) / 1000) * 1000 : 0;
      const pay = value + tip;
      const items = Object.values(o.items).reduce((n, q) => n + q, 0);
      const cooked = Object.entries(o.items).reduce((n, [id, q]) => n + (COOKED_PRODUCT_IDS.has(id) ? q : 0), 0);
      set({
        phoneOrders: s.phoneOrders.filter((p) => p !== o), phoneOrdersDone: s.phoneOrdersDone + 1, money: s.money + pay,
        stats: { ...s.stats, revenue: s.stats.revenue + pay, itemsSold: s.stats.itemsSold + items },
        totals: {
          ...s.totals, revenue: s.totals.revenue + pay, itemsSold: s.totals.itemsSold + items,
          cookedSold: s.totals.cookedSold + cooked,
          cookOrdersDone: s.totals.cookOrdersDone + (o.premium ? 1 : 0),
        },
      });
      get().addXp(onTime ? 15 + items * 2 : 5);
      get().addReview(onTime ? 5 : 3, onTime ? undefined : 'wait', Object.keys(o.items)[0]);
      if (o.regular && onTime) get().adjustFriendship(o.regular, PHONE_FRIEND_GAIN);
      s.notify(onTime
        ? `🛵 Giao ${fast ? '⚡ lẹ như chớp' : 'kịp'} cho ${o.caller}: +${formatMoney(pay)} (boa ${formatMoney(tip)})${o.regular ? ` · 💛 +${PHONE_FRIEND_GAIN}` : ''}`
        : `🛵 Giao trễ cho ${o.caller}: +${formatMoney(pay)}, khách không boa`);
      return true;
    },
    deliverOrder: () => {
      const s = get();
      const def = s.order && partyOrderById(s.order.id);
      if (!def || !s.order?.accepted) return false;
      const missing = missingForOrder(def, s.storage);
      if (missing.length) {
        s.notify(`Kho còn thiếu: ${missing.map((m) => `${m.need} ${productById(m.id).name}`).join(', ')}`);
        return false;
      }
      const k = copyStock(s);
      for (const [id, q] of Object.entries(def.items)) takeStock(k, id, q);
      const pay = orderValue(def) + def.bonus;
      const items = Object.values(def.items).reduce((n, q) => n + q, 0);
      set({
        ...k, order: null, ordersDone: s.ordersDone + 1, money: s.money + pay,
        stats: { ...s.stats, revenue: s.stats.revenue + pay, itemsSold: s.stats.itemsSold + items },
        totals: { ...s.totals, revenue: s.totals.revenue + pay, itemsSold: s.totals.itemsSold + items },
      });
      get().addXp(def.xp);
      get().addReview(5, undefined, Object.keys(def.items)[0]);
      if (def.regular) get().adjustFriendship(def.regular, STORY_ORDER_FRIEND_GAIN);
      s.notify(`🎉 Giao xong "${def.title}": +${formatMoney(pay)} · +${def.xp} XP${def.regular ? ` · 💛 +${STORY_ORDER_FRIEND_GAIN} thân thiết với ${def.from}` : ''}`);
      get().checkTitles();
      return true;
    },
    communitySale: (ids) => {
      const s = get();
      const rep = reputationOf(s.repLog);
      const decor = s.furniture.filter((f) => f.type === 'plant').length;
      for (const goal of activeGoals(s.day, s.level, s.opening)) {
        const now = get();
        if (now.community[goal.key]?.done || goalLocked(goal, rep)) continue;
        const progress = addSales(goal, now.community[goal.key], ids);
        if (!goalMet(goal, progress, decor)) {
          set({ community: { ...now.community, [goal.key]: progress } });
          continue;
        }
        const host = goal.festival.host ? regularById(goal.festival.host) : undefined;
        const friend = host ? regularFriendship(host, now.regulars[host.id], goal.reward.friendship) : undefined;
        set({
          community: { ...now.community, [goal.key]: { ...progress, done: true } },
          money: now.money + goal.reward.money,
          ...(host && friend ? { regulars: { ...now.regulars, [host.id]: friend.progress } } : {}),
        });
        now.addXp(goal.reward.xp);
        now.notify(`🎉 Cả hẻm hoàn thành mục tiêu ${goal.festival.name}! +${formatMoney(goal.reward.money)}, +${goal.reward.xp} XP${host ? `, ${host.name} thân hơn` : ''}`);
      }
    },
    acceptContract: (id) => {
      const s = get();
      const def = supplyContractById(id);
      if (!def) return;
      if (s.contracts[id]) { s.notify('Hợp đồng này đang hoạt động rồi'); return; }
      if (s.level < def.unlock) { s.notify(`Cần cấp ${def.unlock} để nhận hợp đồng này`); return; }
      if (!meetsRep(reputationOf(s.repLog), def.rep)) { s.notify(`${def.from} chưa đủ tin tiệm, cần ${describeRep(def.rep!)}`); return; }
      set({ contracts: { ...s.contracts, [id]: { defId: id, dueDay: s.day + def.periodDays, delivered: 0, pending: true } } });
      s.notify(`📋 Nhận hợp đồng "${def.title}": ${formatMoney(contractValue(def))}/kỳ, giao mỗi ${def.periodDays} ngày`);
    },
    deliverContract: (id) => {
      const s = get();
      const cs = s.contracts[id];
      const def = cs && supplyContractById(cs.defId);
      if (!def || !cs) { s.notify('Hợp đồng không hợp lệ'); return false; }
      const missing = missingForContract(def, s.storage);
      if (missing.length) {
        s.notify(`Kho còn thiếu: ${missing.map((m) => `${m.need} ${productById(m.id).name}`).join(', ')}`);
        return false;
      }
      const k = copyStock(s);
      for (const [pid, q] of Object.entries(def.items)) takeStock(k, pid, q);
      const pay = contractValue(def);
      const items = Object.values(def.items).reduce((n, q) => n + q, 0);
      const nextDue = s.day + def.periodDays;
      set({
        ...k,
        contracts: { ...s.contracts, [id]: { ...cs, delivered: cs.delivered + 1, dueDay: nextDue, pending: false } },
        money: s.money + pay,
        stats: { ...s.stats, revenue: s.stats.revenue + pay, itemsSold: s.stats.itemsSold + items },
        totals: { ...s.totals, revenue: s.totals.revenue + pay, itemsSold: s.totals.itemsSold + items, contractsDone: s.totals.contractsDone + 1 },
      });
      get().addXp(def.xp);
      s.notify(`🚚 Giao xong kỳ hạn "${def.title}": +${formatMoney(pay)} · +${def.xp} XP`);
      get().checkTitles();
      return true;
    },
    setCostume: (id) => {
      const s = get();
      const def = costumeById(id);
      if (!def) return;
      if (s.level < def.unlock) { s.notify(`Cần cấp ${def.unlock} để mở trang phục này`); return; }
      set({ costume: id });
      s.notify(`👕 Đổi sang "${def.name}"`);
    },
    setShopName: (name) => {
      const clean = name.trim().slice(0, 24) || 'Tạp Hóa Đầu Ngõ';
      set({ shopName: clean });
      get().notify(`🏪 Tiệm giờ mang tên "${clean}"`);
    },
    claimGift: () => {
      const s = get();
      if (s.giftLastDay === s.day) {
        s.notify('🎁 Hôm nay đã điểm danh rồi, mai quay lại nhé!');
        return false;
      }
      const streak = s.giftLastDay === s.day - 1 ? s.giftStreak + 1 : 1;
      const gift = giftOfStreak(streak);
      set({
        giftStreak: streak,
        giftLastDay: s.day,
        ...(gift.money ? { money: s.money + gift.money } : {}),
      });
      if (gift.xp) get().addXp(gift.xp);
      s.notify(`🎁 Điểm danh ngày ${((streak - 1) % 7) + 1}: ${gift.icon} ${gift.label} — ${giftText(gift)}`);
      return true;
    },
    spinWheel: () => {
      const s = get();
      if (s.wheelLastDay === s.day) return null;
      const prize = spinWheelPrize();
      set({
        wheelLastDay: s.day,
        ...(prize.boost ? { wheelBoost: 1 + prize.boost } : {}),
        ...(prize.money ? { money: s.money + prize.money } : {}),
      });
      if (prize.xp) get().addXp(prize.xp);
      s.notify(`🎡 Vòng quay may mắn: ${prize.icon} ${prize.label}!`);
      return prize;
    },
    learnSkill: (id) => {
      const s = get();
      const def = SKILLS.find((k) => k.id === id);
      if (!def || s.skills.includes(id) || s.level < def.unlock || s.skills.length >= skillPoints(s.level)) return;
      set({ skills: [...s.skills, id] });
      s.notify(`${def.icon} Đã học: ${def.name}`);
    },
    checkTitles: () => {
      const s = get();
      const rating = summarizeReviews(s.reviews);
      const ctx: TitleContext = {
        level: s.level, day: s.day, customers: s.totals.customers, itemsSold: s.totals.itemsSold, revenue: s.totals.revenue,
        rating: rating.average, reviewCount: rating.count, ordersDone: s.ordersDone, staffCount: s.staff.length,
        closeRegulars: Object.values(s.regulars).filter((r) => r.perks.length).length,
      };
      const fresh = TITLES.filter((t) => !s.titles.includes(t.id) && t.done(ctx));
      if (!fresh.length) return;
      set({ titles: [...s.titles, ...fresh.map((t) => t.id)] });
      s.notify(`🏅 Danh hiệu mới: ${fresh.map((t) => `${t.icon} ${t.name}`).join(', ')}`);
    },
    repairFurniture: (uid) => {
      const s = get();
      const f = s.furniture.find((it) => it.uid === uid);
      if (!f) return;
      const cost = repairCost(f.type);
      if (s.money < cost) return s.notify('Không đủ tiền!');
      updateFurniture(uid, (old) => ({ ...old, wear: 10, broken: false }));
      set({ money: get().money - cost, stats: { ...s.stats, spent: s.stats.spent + cost }, totals: { ...s.totals, spent: s.totals.spent + cost } });
      s.notify(`🔧 Đã ${f.broken ? 'sửa' : 'bảo trì'} ${furnitureDef(f.type).name}: ${formatMoney(cost)}`);
    },
    recordTheft: (value, caught) => {
      const s = get();
      if (!caught) return s.notify(`🦹 Có kẻ lấy ${formatMoney(value)} hàng rồi chuồn mất!`);
      const fine = value * RISK_RULES.theft.fineMul;
      set({ money: s.money + fine, stats: { ...s.stats, revenue: s.stats.revenue + fine } });
      s.notify(`🚨 Bắt quả tang kẻ trộm! Trả hàng và nộp phạt ${formatMoney(fine)}`);
    },
    recordCounterfeit: (note, detected) => {
      const s = get();
      if (detected) return s.notify(`🔍 Phát hiện tờ ${formatMoney(note)} giả, khách đành đổi tiền thật`);
      set({ money: s.money - note, fakeCash: s.fakeCash + note });
    },
    claimQuest: (id) => {
      const s = get();
      const ctx = questContext(s);
      const q = [...dailyQuests(ctx), storyQuest(ctx)].find((it) => it?.id === id);
      if (!q || !q.done || q.claimed) return false;
      const log = s.questLog.day === s.day ? s.questLog : { ...s.questLog, day: s.day, claimedDaily: [] };
      set({
        money: s.money + q.money,
        questLog: id.startsWith('story_')
          ? { ...log, claimedStory: [...log.claimedStory, id] }
          : { ...log, claimedDaily: [...log.claimedDaily, id] },
      });
      if (q.xp) get().addXp(q.xp);
      s.notify(`📜 Xong "${q.title}": +${formatMoney(q.money)}${q.xp ? ` · +${q.xp} XP` : ''}`);
      return true;
    },
    addXp: (amount) => {
      let { level, xp } = get();
      const s = get();
      xp += amount;
      const gained: string[] = [];
      while (level < MAX_LEVEL && xp >= xpToNext(level)) {
        xp -= xpToNext(level);
        level++;
        gained.push(...unlocksAt(level));
      }
      set({ xp, level, stats: { ...s.stats, xp: s.stats.xp + amount } });
      if (level !== s.level) {
        playSfx('levelup');
        s.notify(`⭐ Lên cấp ${level}!${gained.length ? ' Mở khóa: ' + gained.join(', ') : ''}`);
      }
    },

    addReview: (stars, reason, productId) => {
      const s = get();
      const review = composeReview({
        id: (s.reviews.at(-1)?.id ?? 0) + 1, day: s.day, minute: Math.floor(s.minutes), stars, reason,
        productId, productName: productId ? productById(productId).name : undefined,
      });
      set({
        reviews: [...s.reviews, review].slice(-REVIEW_CAP),
        ...(stars === 5 ? { totals: { ...s.totals, fiveStars: s.totals.fiveStars + 1 } } : {}),
      });
    },

    setBuildMode: (on) => set({ buildMode: on, placing: null, panel: on ? { type: 'build' } : null }),
    setPlacing: (placing) => set({ placing, panel: null }),
    placeFurniture: (type, x, z, rot) => {
      const s = get();
      const def = furnitureDef(type);
      if (s.money < def.price) {
        s.notify('Không đủ tiền!');
        return false;
      }
      const uid = Math.max(0, ...s.furniture.map((f) => f.uid)) + 1;
      set({
        money: s.money - def.price,
        furniture: [...s.furniture, { uid, type, x, z, rot, tiers: emptyTiers(type) }],
        stats: { ...s.stats, spent: s.stats.spent + def.price },
        totals: { ...s.totals, spent: s.totals.spent + def.price },
      });
      return true;
    },
    moveFurniture: (uid, x, z, rot) => updateFurniture(uid, (f) => ({ ...f, x, z, rot })),
    sellFurniture: (uid) => {
      const s = get();
      const f = s.furniture.find((it) => it.uid === uid);
      if (!f) return;
      const k = copyStock(s);
      for (const t of f.tiers) returnTier(k, t);
      const refund = Math.round(furnitureDef(f.type).price * SELL_BACK);
      // Kệ đã bán đi thì bỏ luôn số heat của nó
      const heat = { ...s.shelfHeat };
      delete heat[uid];
      set({ money: s.money + refund, ...k, furniture: s.furniture.filter((it) => it.uid !== uid), placing: null, shelfHeat: heat });
      s.notify(`Đã bán ${furnitureDef(f.type).name}, nhận lại ${formatMoney(refund)}. Hàng trên kệ về kho.`);
    },
    demolishAll: () => {
      const s = get();
      const k = copyStock(s);
      let refund = 0;
      for (const f of s.furniture) {
        for (const t of f.tiers) returnTier(k, t);
        refund += Math.round(furnitureDef(f.type).price * SELL_BACK);
      }
      set({ money: s.money + refund, ...k, furniture: [], placing: null, shelfHeat: {} });
      s.notify(`🔨 Đã dọn sạch tiệm, nhận lại ${formatMoney(refund)}. Hàng về kho.`);
    },
    buyUpgrade: () => {
      const s = get();
      const next = SHOP_TIERS[s.shopTier + 1];
      if (!next || s.pendingUpgrade) return;
      if (s.level < next.unlock) return s.notify(`Cần đạt cấp ${next.unlock}`);
      if (s.money < next.price) return s.notify('Không đủ tiền!');
      set({ money: s.money - next.price, pendingUpgrade: true, stats: { ...s.stats, spent: s.stats.spent + next.price }, totals: { ...s.totals, spent: s.totals.spent + next.price } });
      s.notify(`🏗️ Đã thuê thợ! Sáng mai tiệm thành "${next.name}".`);
    },
    hire: (id) => {
      const s = get();
      const c = s.candidates.find((it) => it.id === id);
      if (!c) return;
      if (s.staff.length >= maxStaff(s.level)) return s.notify('Đã đủ số nhân viên tối đa ở cấp này');
      if (ROLES[c.role].unlock > s.level) return s.notify(`Vai trò ${ROLES[c.role].name} mở ở cấp ${ROLES[c.role].unlock}`);
      set({ staff: [...s.staff, c], candidates: s.candidates.filter((it) => it.id !== id) });
      s.notify(`🤝 Đã thuê ${c.name}. Lương trả cuối mỗi ngày.`);
      if (c.role === 'courier' && !s.staff.some((w) => w.role === 'courier')) {
        s.notify('🛵 Đã mở chế độ giao tận nhà: hàng xóm sẽ gọi điện đặt hàng!');
      }
    },
    fire: (id) => set({ staff: get().staff.filter((it) => it.id !== id) }),
    setShift: (id, shift) => set({ staff: get().staff.map((it) => (it.id === id ? { ...it, shift } : it)) }),
    paint: (part, color) => {
      const s = get();
      if (s.style[part] === color) return;
      if (s.money < PAINT_PRICE) return s.notify('Không đủ tiền!');
      set({
        money: s.money - PAINT_PRICE,
        style: { ...s.style, [part]: color },
        stats: { ...s.stats, spent: s.stats.spent + PAINT_PRICE },
        totals: { ...s.totals, spent: s.totals.spent + PAINT_PRICE },
      });
    },
  };
});

export function formatClock(minutes: number): string {
  const m = Math.floor(minutes) % 1440;
  const hh = String(Math.floor(m / 60)).padStart(2, '0');
  const mm = String(m % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}
