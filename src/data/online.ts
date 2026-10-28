/**
 * Bán hàng online qua app: đăng ký gian hàng một lần, đơn từ khắp quận đổ về theo điểm đánh giá trên app.
 * Mỗi đơn có quãng đường; chủ chọn cho nhân viên giao hàng của tiệm chở (miễn phí nhưng chậm, mỗi người
 * một đơn một lúc) hoặc gọi Grab (nhanh, mất phí theo km). App ăn hoa hồng mỗi đơn. Giao đúng hẹn được
 * 5★, trễ thì sao thấp; điểm app thấp thì ít đơn hẳn.
 * Chỉ có dữ liệu và hàm thuần; áp vào trạng thái ở `core/slices/online`.
 */
import type { Lot } from './freshness';
import { productById, unlockedProducts } from './products';
import { skillSpeed } from './staff';

export const ONLINE_UNLOCK = 10;
/** Phí mở gian hàng trên app (trả một lần). */
export const ONLINE_OPEN_COST = 500000;
/** App lấy hoa hồng chừng này phần mỗi đơn. */
export const APP_COMMISSION = 0.12;
/** App chỉ nhận đơn trong khung giờ này (phút trong ngày). */
export const ONLINE_HOURS: [number, number] = [7 * 60, 21 * 60 + 30];
/** Đơn mới chờ tiệm nhận tối đa chừng này phút rồi app tự huỷ. */
export const ACCEPT_WINDOW = 20;
/** Giao trễ quá hạn chừng này phút thì khách chấm thấp nhất. */
export const VERY_LATE = 30;

export interface OnlineOrder {
  id: number;
  customer: string;
  items: Record<string, number>;
  km: number;
  placedAt: number;
  /** Hẹn giao trước giờ này. */
  dueAt: number;
  status: 'new' | 'shipping';
  via?: 'own' | 'grab';
  /** Giờ hàng tới tay khách. */
  arriveAt?: number;
  lots?: Record<string, Lot[]>;
}

export interface OnlineState {
  open: boolean;
  orders: OnlineOrder[];
  /** Phút trong ngày đơn kế tiếp đổ về. */
  nextAt: number;
  ratingSum: number;
  ratingCount: number;
  done: number;
  late: number;
  nextId: number;
  /** Doanh thu online hôm nay (sau hoa hồng, trước phí Grab) và phí Grab. */
  revenueToday: number;
  grabFeesToday: number;
}

export const newOnline = (): OnlineState => ({
  open: false, orders: [], nextAt: 0, ratingSum: 0, ratingCount: 0, done: 0, late: 0, nextId: 1, revenueToday: 0, grabFeesToday: 0,
});

/** Điểm trên app (chưa ai chấm thì 5★ như gian hàng mới). */
export const appRating = (o: OnlineState) => (o.ratingCount ? o.ratingSum / o.ratingCount : 5);

/** Khoảng cách trung bình giữa hai đơn (phút): cấp cao, điểm tốt thì đơn dày hơn. */
export function orderGap(rating: number, level: number) {
  const base = Math.max(35, 95 - level);
  return base * (rating >= 4.5 ? 1 : rating >= 4 ? 1.4 : rating >= 3 ? 2.2 : 4);
}

/** Mô tả mức độ "dày đơn" theo điểm app — mồi minh bạch cho người chơi hiểu hộp đen đơn app. */
export function orderRateTone(rating: number): string {
  if (rating >= 4.5) return 'đơn dày (rất đông khách app)';
  if (rating >= 4) return 'đơn khá đều';
  if (rating >= 3) return 'đơn thưa hơn';
  return 'đơn rất thưa — điểm thấp!';
}

/**
 * Số lượng đơn tối đa gần đúng app có thể trút về một ngày (độ rộng khung giờ / khoảng cách 2 đơn).
 * Dùng để hiển thị mức "dày đơn" minh bạch; đồng thời đúng là trần thực mà updateOnline chạm tới.
 */
export function onlineOrderCap(rating: number, level: number): number {
  const span = ONLINE_HOURS[1] - ONLINE_HOURS[0];
  return Math.round(span / orderGap(rating, level));
}

/** Nhân viên tiệm chở bằng xe máy: phút tới nơi theo km và tay nghề. */
export const ownTravel = (km: number, skill: number) => Math.round(5 + (km * 6) / skillSpeed(skill));
/** Grab: tới nhanh, có sẵn ngay. */
export const grabTravel = (km: number) => Math.round(8 + km * 4);
export const grabFee = (km: number) => Math.round((8000 + km * 4000) / 1000) * 1000;

const NAMES = ['Chị Mai Q.7', 'Anh Tuấn Q.3', 'Bạn Hân', 'Cô Lệ', 'Anh Khoa', 'Chị Thu', 'Em Bảo', 'Chú Sáu', 'Chị Hồng', 'Anh Phát'];

/** Tạo một đơn app: 1–3 món đang mở khoá (không phải món nhà làm nếu cấp đã mở), 1–8 km. */
export function makeOnlineOrder(id: number, level: number, minutes: number, rng: () => number = Math.random): OnlineOrder {
  const pool = unlockedProducts(level);
  const items: Record<string, number> = {};
  for (let n = 1 + Math.floor(rng() * 3); n > 0 && pool.length; n--) {
    const p = pool[Math.floor(rng() * pool.length)];
    items[p.id] = (items[p.id] ?? 0) + 1 + Math.floor(rng() * 4);
  }
  const km = Math.round((1 + rng() * 7) * 10) / 10;
  return {
    id, customer: NAMES[Math.floor(rng() * NAMES.length)], items, km, placedAt: Math.round(minutes),
    dueAt: Math.round(minutes + ACCEPT_WINDOW + 20 + km * 8), status: 'new',
  };
}

/** Tiền hàng của đơn theo giá bán của tiệm. */
export const onlineValue = (o: OnlineOrder, priceOf: (id: string) => number) =>
  Object.entries(o.items).reduce((n, [id, q]) => n + priceOf(id) * q, 0);

/** Số sao khách chấm theo giờ hàng tới. */
export const deliveryStars = (o: OnlineOrder, arriveAt: number) =>
  arriveAt <= o.dueAt ? 5 : arriveAt <= o.dueAt + VERY_LATE ? 3 : 1;

export const describeOnline = (o: OnlineOrder) =>
  Object.entries(o.items).map(([id, q]) => `${q} ${productById(id).name}`).join(', ');

/** Giá vốn hàng của đơn (Σ q × giá nhập) — khớp căn bản checkout sales.ts (productById(id).buy). */
export const orderCost = (o: OnlineOrder): number =>
  Object.entries(o.items).reduce((n, [id, q]) => n + q * productById(id).buy, 0);

/**
 * Lãi ròng của đơn (chưa trừ phí giao): doanh thu sau hoa hồng − giá vốn hàng.
 * Gross dùng Math.round(onlineValue×(1−commission)) — đúng số tiệm THỰC nhận khi giao (slices/online).
 */
export const orderNet = (o: OnlineOrder, priceOf: (id: string) => number): number =>
  Math.round(onlineValue(o, priceOf) * (1 - APP_COMMISSION)) - orderCost(o);

export interface OrderAssessment {
  /** Tiền thật nhận được sau hoa hồng (đúng số khi giao). */
  gross: number;
  /** Giá vốn hàng. */
  cost: number;
  /** Lãi ròng chưa phí giao. */
  net: number;
  /** net/gross — âm khi lỗ. */
  margin: number;
  /** net − phí Grab (lãi nếu gọi Grab). */
  grabNet: number;
  /** Phút tự giao (0 khi không có người giao rảnh). */
  ownTravelT: number;
  /** Phút gọi Grab. */
  grabTravelT: number;
  /** Sao nếu tự giao (5/3/1). */
  ownStars: number;
  /** Grab luôn 5★ (không thể trễ). */
  grabStars: number;
  /** Tự giao có trễ hẹn không (now + ownTravelT > dueAt). */
  urgent: boolean;
}

/** Đánh giá kinh tế + thời điểm của một đơn: giúp quyết lấy / lấy qua Grab / từ chối. Thuần đọc, không đổi state. */
export function orderAssessment(o: OnlineOrder, priceOf: (id: string) => number, courierSkill: number | null, minutes: number): OrderAssessment {
  const gross = Math.round(onlineValue(o, priceOf) * (1 - APP_COMMISSION));
  const cost = orderCost(o);
  const net = gross - cost;
  const ownTravelT = courierSkill == null ? 0 : ownTravel(o.km, courierSkill);
  const grabTravelT = grabTravel(o.km);
  return {
    gross, cost, net,
    margin: gross > 0 ? net / gross : 0,
    grabNet: net - grabFee(o.km),
    ownTravelT, grabTravelT,
    ownStars: deliveryStars(o, minutes + ownTravelT),
    grabStars: 5,
    urgent: minutes + ownTravelT > o.dueAt,
  };
}

/** Điểm app sau khi giao đúng/stars (5/3/1) — mồi minh bạch payoff 1 đơn. Rỗng ratingCount → như gian hàng mới. */
export function ratingImpact(stars: number, online: OnlineState): { nextRating: number; tone: string } {
  const next = (online.ratingSum + stars) / (online.ratingCount + 1);
  return { nextRating: next, tone: orderRateTone(next) };
}

/** Điểm app nếu TỪ CHỐI đơn này (nhánh 4.5 như declineOnline) — từ chối vẫn mất chút điểm. */
export function declineRating(online: OnlineState): { nextRating: number; tone: string } {
  const next = (online.ratingSum + 4.5) / (online.ratingCount + 1);
  return { nextRating: next, tone: orderRateTone(next) };
}
