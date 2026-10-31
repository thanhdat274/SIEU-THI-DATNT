/** Kiểu dữ liệu, hằng số và hàm nhỏ của trạng thái game (useGame ghép ở store.ts). */
import type { FurnitureType } from '../data/furniture';
import { warehouseTier } from '../data/warehouse';
import type { QuestLog, Totals } from '../data/quests';
import { casesFor } from '../data/products';
import { type ShopStyle } from '../data/shopTiers';
import type { CounterPolicy } from '../data/counterDeals';
import type { Review, ReviewReason } from '../data/reviews';
import type { Weather } from '../data/weather';
import type { Lot } from '../data/freshness';
import type { RegularProgress, Reservation } from '../data/regulars';
import type { ActiveOrder } from '../data/orders';
import type { HappyHour } from '../data/rhythm';
import type { Debt } from '../data/credit';
import type { VendorOffer } from '../data/wholesale';
import type { MissLog } from '../data/advice';
import type { BizState } from '../data/biz';
import type { QuanNuocPrice } from '../data/quanNuoc';
import { type PhoneOrder } from '../data/phoneOrders';
import { hasSkill, type SkillId } from '../data/titles';
import { dailyWage, type Shift, type Staff } from '../data/staff';
import type { RandomEvent } from '../data/events';
import type { RepSample } from '../data/reputation';
import type { CommunityProgress, Opening } from '../data/community';
import type { WheelPrize } from '../data/gifts';
import type { PaymentMethod } from '../data/payments';
import type { BranchState, PowerUpgradeId } from '../data/branches';
import type { VenueDay } from '../data/venueTrend';
import type { RiskDay, RiskToday } from '../data/risk';
import type { SocialState } from '../data/social';
import type { OnlineState } from '../data/online';
import type { InspectionRecord, LicenseId } from '../data/licenses';
import type { AnimalKind, FarmBuildingId, GardenState } from '../data/garden';
import type { AnalyticsState } from '../data/analytics';

/** Phút trong ngày khi bắt đầu ngày mới (06:00). */
export const DAY_START = 6 * 60;
/** Từ giờ này được đi ngủ (18:00). */
export const SLEEP_FROM = 18 * 60;
/** Quá giờ này mà chưa ngủ thì ngất (02:00 sáng hôm sau). */
export const FAINT_AT = 26 * 60;
/** Hẻm online gắn vào: có người đã nằm giường chờ phiếu ngủ thì thức khuya không bị phạt, cả hẻm sang ngày như ngủ bình thường. */
export const faintGuard = { spare: () => false };
/** Lịch tự động mỗi ngày (khi bật): ra tiệm, mở cửa, đóng cửa, kiểm kê rồi về nhà. */
export const ROUTINE = { goToShop: 7 * 60, open: 8 * 60, close: 22 * 60 + 30, goHome: 23 * 60 };

/** GĐ275 — giờ mở cửa của lịch tự động, người chơi chỉnh được (6h→8h): giờ vàng sáng 6h–8h30
 *  kéo dài 2h30 mà lịch cũ mở 8h thì lỡ nửa đầu — GĐ160 đã ghi tension này. Mặc định 8h = hành
 *  vi cũ; save cũ thiếu trường thì applySnapshot tự bù (không cần MIGRATIONS). */
export const AUTO_OPEN_PRESETS = [8 * 60, 7 * 60 + 30, 7 * 60, 6 * 60 + 30, 6 * 60];
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
  /** Kỳ giao đúng hẹn liên tiếp (trễ một kỳ thì về 0) — cho thưởng mốc mỗi N kỳ. */
  streak?: number;
  /** Kỳ này đã quá hạn (qua ngày mà chưa giao) — đang giao muộn thì không tính đúng hẹn. */
  overdue?: boolean;
  /** Cam kết kỳ: đã trữ sẵn đúng số hàng kỳ này khỏi quầy bán để nhận thưởng tin cậy. */
  committed?: boolean;
  /** Hàng đã trữ riêng cho kỳ đã cam kết (không bán dễ dàng ở quầy). */
  locked?: Record<string, number>;
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
  /** Tiền lời dịch vụ hôm nay theo từng dịch vụ (GĐ66 — để xem dịch vụ nào đáng). */
  byService?: Record<string, number>;
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
  /** Thất thoát không rõ nguyên nhân (nhân viên gian lận chưa bị bắt): tiền két và số món. */
  shrinkCash?: number;
  shrinkItems?: number;
  /** Bán online hôm nay: tiền về (sau hoa hồng) và phí Grab. */
  online?: number;
  grabFees?: number;
  /** Số đơn app giao tới tay khách hôm nay (đo nhiệm vụ ngày). */
  onlineDone?: number;
  /** Số nông sản thu hoạch được hôm nay (đo nhiệm vụ ngày). */
  farmHarvest?: number;
  /** Số bài chủ tiệm đăng lên mạng xã hội hôm nay (đo nhiệm vụ ngày). */
  socialPosts?: number;
  /** Số đơn nấu món nhà làm đã giao hôm nay (đo nhiệm vụ ngày). */
  cookOrders?: number;
  /** Số lời khen 5★ nhận hôm nay (đo thử thách tuần). */
  fiveStars?: number;
}

/** Lãi gộp trong ngày: (tiền thu − vốn) theo sổ bán từng món + lời dịch vụ quầy. */
export const daySalesProfit = (stats: DayStats) =>
  Object.values(stats.byItem ?? {}).reduce((n, l) => n + l.revenue - l.cost, 0) + (stats.services ?? 0);

export interface HourLine { customers: number; revenue: number }

export const addHour = (byHour: DayStats['byHour'], minutes: number, customers: number, revenue: number) => {
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
/** Việc sáng 🧍 đã tính sẵn (GĐ300) — hình dạng khớp `DayAction` nhưng khai báo ở đây để
 *  `gameTypes` không phải import `data/staffIdle` (staffIdle đã import DayStats từ file này). */
export interface MorningShiftNote {
  icon: string;
  text: string;
  panel: string;
  danger: boolean;
  priority: number;
}

export interface DayRecord {  day: number;
  revenue: number;
  profit: number;
  /** Lãi bán hàng: lãi gộp sổ bán + lời dịch vụ − lương − tiền nhà (không trừ tiền nhập kho/đầu tư).
   *  `profit` trừ cả tiền nhập hàng nên hầu như ngày nào cũng âm — không dùng làm thước đo sức bán. */
  salesProfit?: number;
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
  | { type: 'branch' }
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
  | { type: 'social' }
  | { type: 'online' }
  | { type: 'licenses' }
  | { type: 'garden' }
  | { type: 'analytics' }
  | { type: 'quannuoc' }
  | { type: 'discovery' }
  | { type: 'landmark' }
  | { type: 'records' }
  | { type: 'dossier' }
  | { type: 'roadmap' }
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
  /** Tổng kết ngày vừa qua (máy chạy hẻm gửi sang để máy khách cũng mở bảng tổng kết).
   *  `staffIdle` = việc sáng 🧍 tính SẴN ở máy chạy lúc chốt ngày (GĐ300): snapshot staffDay là
   *  transient ngoài useGame, chỉ máy chạy có → phải gửi kèm gói state để máy khách thấy y hệt. */
  lastSummary: { day: number; stats: DayStats; staffIdle?: MorningShiftNote } | null;  /** Đang ở chế độ xây dựng. */
  buildMode: boolean;
  placing: Placing | null;

  shopOpen: boolean;
  /** Hàng trong kho: id sản phẩm → số lượng. */
  storage: Record<string, number>;
  /** Các lô trong kho của từng món (khớp `storage`). */
  storageLots: Record<string, Lot[]>;
  furniture: Furniture[];
  /** Quầy chính đã dời tới đâu (toạ độ trong tiệm); null = chỗ mặc định. */
  mainCounter: { x: number; z: number; rot: number } | null;
  /** Số món đã bán ra của từng kệ/tủ (khóa là uid) — heatmap vị trí: kệ dễ thấy bán nhiều hơn. */
  shelfHeat: Record<number, number>;
  /** Lời tích luỹ của từng kệ/tủ (uid → lời và ngày bắt đầu tính) — báo cáo lời trên m². */
  shelfProfit: Record<number, { profit: number; since: number }>;
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
  /** GĐ140: nhận thưởng một mục tiêu vòng tái sinh (NG+) đã đạt — chỉ khi prestige.level≥1; reset mỗi vòng. */
  claimNgGoal: (id: string) => boolean;
  /** Chốt kèo hôm nay: mức `tier` (xem BET_TIERS) — cam kết làm trọn việc chính hôm nay (đông khách, bán hàng, doanh thu) ở mục tiêu cao hơn để nhận thêm thưởng. */
  placeBet: (tier: number) => boolean;
  /** Đổi các ô hết hàng (kho không còn, không có đơn chờ) sang món khác trong kho; trả về các dòng mô tả đã đổi. */
  /** `announce`: báo kết quả bằng notify (nút bấm của người chơi); gọi nội bộ lúc hàng về/cuối ngày thì im. */
  replaceEmptySlots: (announce?: boolean) => string[];
  /** Tự động theo lịch: 7h ra tiệm, 8h mở cửa, 22h30 đóng cửa, 23h kiểm kê rồi về nhà. */
  autoRoutine: boolean;
  /** Giờ mở cửa của lịch tự động (phút trong ngày, 6h–8h — GĐ275); thiếu ở save cũ = 8h. */
  autoOpenAt: number;
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
  /** Món đã bán được cả ván (Sổ tay Tiệm GĐ36): id → số món bán ra, để đếm 'đã khám phá X/Y món'. */
  soldEver: Record<string, number>;
  /** Số lần mỗi combo kích hoạt ở quầy cả ván (GĐ44) — để xoay combo hoạt động kém. */
  comboHitCount: Record<string, number>;
  /** Thân thiết với từng khách quen. */
  regulars: Record<string, RegularProgress>;
  /** Lời hẹn giữ món của khách quen (mỗi người một hẹn): món, số lượng, ngày ghé lấy. */
  reservations: Record<string, Reservation>;
  /** Nhận lời giữ món cho khách quen (nguyên liệu/hàng sẵn có thì ngày mai khách ghé lấy được). */
  addReservation: (regularId: string, productId: string, qty: number) => void;
  /** Từ chối/huỷ lời hẹn giữ món (không mất thân thiết). */
  cancelReservation: (regularId: string) => void;
  /** Khách quen trả tiền xong hoặc bỏ về; trả về tiền boa. */
  regularVisit: (id: string, basket: CartItem[], paid: boolean, miss?: { id: string; why: string }) => number;
  /** Cộng/trừ thân thiết ngoài lần ghé (đơn riêng), mở perk nếu tới mốc. */
  adjustFriendship: (id: string, delta: number) => void;
  /** Đối thủ, quảng cáo, tích điểm, vay, hụi, tuần, thú cưng, thành tựu, nhà, xe (xem data/biz.ts). */
  biz: BizState;
  /** Mua mặt bằng quán nước đầu ngõ (cấp 29, bán đồ uống rút từ kho); trả false nếu chưa đủ điều kiện. */
  buyQuanNuoc: () => boolean;
  /** Tuyển thêm nhân viên quán nước (tối đa 3 người). */
  hireQuanNuoc: () => boolean;
  /** Cho một nhân viên quán nước nghỉ việc (không hoàn phí tuyển). */
  fireQuanNuoc: () => boolean;
  /** Đổi mức giá quán nước (bình dân / vừa phải / đắt hơn). */
  setQuanNuocPrice: (p: QuanNuocPrice) => void;
  /** GĐ415: thêm/bỏ món pha chế trên thực đơn quán nước. */
  toggleQuanRecipe: (id: string) => void;
  brewQuanHand: () => boolean;
  upgradeQuanTier: () => boolean;
  /** Tiệm xôi (GĐ411): mua mặt bằng, tuyển/cho nghỉ thợ nấu. */
  buyTiemXoi: () => boolean;
  hireTiemXoi: () => boolean;
  fireTiemXoi: () => boolean;
  steamXoiHand: () => boolean;
  expandTiemXoi: () => boolean;
  /** GĐ498: mở một khu bản đồ mới (mở rộng bản đồ). */
  openZone: (id: string) => boolean;
  rentSapLot: () => boolean;
  /** Lấy bớt hàng khỏi kho (vd. thức ăn cho thú cưng). */
  consumeStock: (productId: string, qty: number) => void;
  /** Sổ nợ khách quen (theo id khách quen). */
  debts: Record<string, Debt>;
  /** Hệ số giá tham chiếu của từng món so với giá gợi ý gốc (thị trường nhích theo khan hiếm). */
  market: Record<string, number>;
  /** Cho khách quen ghi sổ hay không. */
  allowCredit: boolean;
  setAllowCredit: (on: boolean) => void;
  /** GĐ61 "Chính sách quầy": thái độ chủ tiệm mặc cả & tiền lẻ; 'ask' = hỏi như trước. */
  counterPolicy: CounterPolicy;
  setCounterPolicy: (patch: Partial<CounterPolicy>) => void;
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
  /** Ngày đã bán chợ phiên gần nhất (chặn bán lại cùng một ngày chợ). */
  marketClearedDay: number;
  /** Bản ghi lần bán chợ phiên gần nhất (để tổng kết cuối ngày). */
  marketLast: { day: number; units: number; revenue: number };
  /** Người bán rong vào tới quầy: đưa đề nghị lấy sỉ. */
  offerWholesale: () => VendorOffer | null;
  acceptWholesale: () => boolean;
  declineWholesale: () => void;
  /** Bán chợ phiên: xả hàng DƯ định kỳ, một lần mỗi ngày chợ. */
  sellMarketSurplus: () => { ok: boolean; reason?: 'already' | 'no-surplus'; units?: number; pay?: number };
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
  /** Cam kết: trữ sẵn đúng số hàng kỳ này khỏi kho bán chung để nhận thưởng tin cậy (cọc hoàn lại). */
  commitContract: (id: string) => void;
  /** Hủy cam kết: trả hàng về kho bán chung, hoàn lại tiền cọc. */
  releaseContract: (id: string) => void;
  /** Món vừa bán tính vào mục tiêu chung của dịp; đủ thì trao thưởng. */
  communitySale: (ids: string[]) => void;
  /** Giao kỳ hiện tại của hợp đồng từ kho; trả true nếu giao xong. */
  deliverContract: (id: string) => boolean;
  /** Sự kiện ngẫu nhiên hôm nay (ảnh hưởng lượt khách). */
  event: RandomEvent | null;
  /** Giữ chân: chuỗi điểm danh quà 7 ngày và lượt vòng quay may mắn mỗi ngày. */
  giftStreak: number;
  giftLastDay: number;
  /** Ngày gần nhất dùng vé tha thứ streak (bỏ quên 1 ngày mà vẫn giữ chuỗi); 0 = chưa từng dùng. */
  giftGraceDay: number;
  wheelLastDay: number;
  /** Giải vừa trúng ở lượt quay gần nhất (cùng ngày wheelLastDay) — để máy khách hẻm online biết kim dừng ô nào. Không lưu. */
  wheelLastPrize: { icon: string; label: string } | null;
  /** Nhân lượng khách ghé hôm nay khi trúng giải 🍀 trên vòng quay (1 = bình thường). */
  wheelBoost: number;
  /** Mốc thời gian THẬT (epoch ms) lần ghé/hoạt động gần nhất — đo vắng mặt cho thưởng "Chào mừng quay lại". */
  lastSeenAt: number;
  /** Soát thưởng "Chào mừng quay lại" khi nạp bản lưu: đủ 2 ngày thật vắng thì thưởng một lần; luôn làm mới lastSeenAt. */
  checkWelcomeBack: () => number;
  /** GĐ64 — đóng vĩnh viễn banner "Mới mở: …" (ghi id vào biz.unlockActs). Là thao tác để hẻm online chạy trên máy chạy — không ghi đè cả `biz`. */
  dismissUnlockAct: (id: string) => void;
  /** Điểm danh hôm nay; trả false nếu đã nhận rồi. */
  claimGift: () => boolean;
  /** Góp vật liệu một lượt cho sân chơi (mỗi ngày một lần); trả false nếu không góp được. */
  contributeLandmark: () => boolean;
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
  /** Nhập gấp phần thiếu ở đại lý rồi giao đơn ngay. */
  rushDeliverOrder: () => boolean;
  /** Kỹ năng đã học. */
  skills: SkillId[];
  learnSkill: (id: SkillId) => void;
  /** Danh hiệu đã đạt. */
  titles: string[];
  checkTitles: () => void;
  /** Tái sinh (NG+): bắt đầu lại bản chạy tiệm từ cấp 1, giữ bộ sưu tập tài khoản và cộng bonus doanh thu. */
  doPrestige: () => void;
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
  priceOf: (productId: string, minutes?: number) => number;
  setPrice: (productId: string, price: number) => void;
  setPrices: (changes: Record<string, { from: number | undefined; to: number | null }>) => number;
  /** Tính tiền cho khách; `discount` là tiền giảm combo, `combos` là số combo trong giỏ,
   *  `payment` là hình thức thanh toán (mặc định tiền mặt) — ảnh hưởng phí và sổ thống kê.
   *  `profId` (tuỳ chọn, GĐ62): nghề khách vãng lai — ghi doanh thu vào nhân khẩu học. */
  checkout: (items: CartItem[], discount?: number, combos?: number, payment?: PaymentMethod, profId?: string) => void;
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
  moveMainCounter: (x: number, z: number, rot: number) => void;
  sellFurniture: (uid: number) => void;
  /** Bán hết nội thất (đập đi làm lại). */
  demolishAll: () => void;
  buyUpgrade: () => void;
  paint: (part: keyof ShopStyle, color: number) => void;
  hire: (id: number) => void;
  fire: (id: number) => void;
  setShift: (id: number, shift: Shift) => void;
  /** Cửa hàng tiện lợi 24/7 (null = chưa thuê mặt bằng). */
  branch: BranchState | null;
  /** Nhật ký từng ngày của chi nhánh 24/7 + quán nước (cửa sổ lăn) — nuôi mục "Xu hướng cơ sở". */
  venueTrend: VenueDay[];
  /** Rủi ro tích lũy trong ngày hôm nay ở tiệm chính (lọt thật / chặn / số lần) — sổ rủi ro GĐ58. Optional, save-safe. */
  riskToday: RiskToday;
  /** Nhật ký rủi ro từng ngày (cửa sổ lăn) — nuôi mục "Xu hướng rủi ro (14 ngày)". Optional, save-safe. */
  riskTrend: RiskDay[];
  openBranch: () => boolean;
  toggleBranch: () => void;
  toggleVending: () => void;
  /** Nhận/ngưng đơn app ban đêm ở chi nhánh. */
  toggleNightDelivery: () => void;
  /** GĐ206: bật/tắt auto chuyển kho — tự chở hàng khi kệ vơi, trả phí xăng mỗi chuyến. */
  toggleBranchAutoHaul: () => void;
  /** GĐ207: chỉnh ngưỡng kệ vơi (%) và khoảng cách (phút) để auto chuyển kho nổ chuyến — clamp an toàn. */
  setBranchAutoHaul: (below?: number, every?: number) => void;
  /** Mua nâng cấp điện cho chi nhánh (máy phát, tủ tiết kiệm điện). */
  buyBranchPower: (id: PowerUpgradeId) => void;
  hireForBranch: (id: number, shift: Shift) => void;
  fireFromBranch: (id: number) => void;
  setBranchShift: (id: number, shift: Shift) => void;
  /** Chủ đang đứng trong cửa hàng tiện lợi (tự bán được khi thiếu thu ngân). Không lưu. */
  atBranch: boolean;
  /** Gọi người làm thay cho nhân viên ca đêm xin nghỉ đột xuất. */
  coverCalloff: () => void;
  /** Thưởng nóng một ngày lương để nhân viên đỡ mệt. */
  bonusBranchStaff: (id: number) => void;
  /** Cho nhân viên nghỉ ngày mai (nghỉ không lương, hồi hết mệt). */
  restBranchStaff: (id: number) => void;
  /** Đào tạo nhân viên: tốn tiền, cộng kinh nghiệm, mỗi người một buổi mỗi ngày. */
  trainStaff: (id: number) => void;
  /** Thăng chức nhân viên tiệm chính (thu ngân → trưởng quầy → quản lý). */
  promoteStaff: (id: number) => void;
  /** Thăng chức nhân viên chi nhánh. */
  promoteBranchStaff: (id: number) => void;
  /** Điều nhân viên giữa tiệm chính và cửa hàng tiện lợi (mỗi người một lần mỗi ngày). */
  transferStaff: (id: number, to: 'main' | 'branch') => boolean;
  /** Chi nhánh đóng cửa: dồn cả đội sang tiệm chính, người nào không vừa/không hợp thì ở lại. */
  evacuateBranch: () => void;
  /** Trang mạng xã hội của tiệm. */
  social: SocialState;
  apologize: () => void;
  promoteShop: () => void;
  /** Gian hàng trên app bán online. */
  online: OnlineState;
  openOnline: () => boolean;
  toggleOnline: () => void;
  acceptOnline: (id: number, via: 'own' | 'grab') => boolean;
  declineOnline: (id: number) => void;
  /** Giấy phép: ngày hết hạn của từng tờ; và sổ thanh tra (trượt liên tiếp, đình chỉ). */
  licenses: Partial<Record<LicenseId, number>>;
  inspection: InspectionRecord;
  buyLicense: (id: LicenseId) => void;

  /** Trang trại (trồng, bón phân, nuôi gà/vịt/ngỗng/bò/heo/dê/gà Đông Tảo, đơn quán xóm). */
  garden: GardenState;
  plantCrop: (plotIndex: number, cropId: string) => void;
  waterGarden: () => void;
  /** Tưới một luống (bấm theo từng luống thay vì cả vườn). */
  waterPlot: (plotIndex: number) => void;
  /** Bón phân cho một luống: rút ngắn 30% thời gian vụ, 1 lần/vụ. */
  fertilizePlot: (plotIndex: number) => void;
  harvestPlot: (plotIndex: number) => void;
  /** Mua một con vật nuôi theo loài (gà/vịt/ngỗng/bò/heo/dê/gà Đông Tảo). */
  buyAnimal: (kind: AnimalKind) => void;
  /** Cho cả chuồng một loài ăn: ăn cám máng trước, thiếu đổ từ kho, hết thì mua lẻ. */
  feedPen: (kind: AnimalKind) => void;
  /** Gom sản phẩm chuồng về kho: trứng gói vỉ, sữa thành lốc. */
  collectPen: (kind: AnimalKind) => void;
  /** Loài vỗ béo (heo, gà Đông Tảo) đủ ngày thì xuất chuồng: thịt về kho. */
  sellFattened: (kind: AnimalKind) => void;
  /** Mua đất mở rộng trang trại theo LAND_TIERS. */
  expandFarm: () => void;
  /** Giao đơn quán xóm đặt nông sản (giá hời ×1.25). */
  deliverFarmOrder: () => void;
  /** Mua công trình trại (ra sao 1) — hệ tưới, nhà lưới, bãi thả, bù nhìn. */
  buyFarmBuilding: (id: FarmBuildingId) => void;
  /** Nâng sao công trình trại: tốn tiền + gỗ + đá từ dọn trại. */
  upgradeFarmBuilding: (id: FarmBuildingId) => void;
  /** Dọn cỏ dại cành rụng trong trại: nhặt gỗ và đá để nâng sao công trình. */
  cleanupFarm: () => void;
  /** Sổ phân tích 30 ngày theo món (sức khoẻ món, ABC, gợi ý). */
  analytics: AnalyticsState;
  /** Ghi món vừa bán vào 'Sổ tay Tiệm' và tự thưởng mốc thu thập khi vượt ngưỡng (GĐ36). */
  recordDiscovery: (ids: string[]) => void;
  /** Cộng dồn số lần mỗi combo kích hoạt ở quầy (GĐ44) — hiển thị ở ComboPanel. */
  noteComboHits: (byCombo: Record<string, number>) => void;
  /** Ghi sổ nhân khẩu học khách vãng lai theo nghề (GĐ62) — hiển thị ở "Khách của tôi". */
  tallyDemographics: (id: string, patch: { visits?: number; revenue?: number; walkouts?: number }) => void;
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

/** Hàm set/get của zustand mà mọi slice nhận vào. */
export type SetState = (partial: Partial<GameState> | ((s: GameState) => Partial<GameState>)) => void;
export type GetState = () => GameState;
