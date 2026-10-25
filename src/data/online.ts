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
