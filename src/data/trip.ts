/**
 * Hệ 5 — Chuyến đi tỉnh lấy hàng (SPEC-CHIEU-RONG §5). L2: `startTrip` + vắng mặt + xe về nhập kho.
 *
 * THUẦN, test được. Mọi tuyến/xe mở > 30 (routes.ts) nên simGolden (kỷ nguyên 0, cấp 30) không chạm:
 * `startTrip` chỉ chạy khi người chơi tự bấm, và mọi nhánh về (tick / endDay) đều canh `biz.trip` trống.
 *
 * L2 chưa có nhịp nào (chọn hàng / mặc cả / chuyện dọc đường — L3–L5). Người chơi lập sẵn giỏ hàng
 * (`tripSetCart`) trước hoặc trong lúc đi; tới giờ về, hàng được chuyển vào kho.
 */
import type { HaulerDef, HaulerId, RouteDef } from './routes';
import { routeById, roundTripMinutes, routeBuyPrice, routeDiscountFor } from './routes';
import { productById, type Product } from './products';
import type { Stock } from '../core/stock';
import { copyStock, putStock } from '../core/stock';
import { shelfLife } from './freshness';

/** Trạng thái một chuyến đi tỉnh (SPEC §5.10). */
export interface TripState {
  routeId: string;
  /** Ngày game xuất phát. */
  day: number;
  /** Phút game xuất phát. */
  departAt: number;
  /** Phút game xe về tới. */
  returnAt: number;
  /** 'self' (chủ tự đi) hoặc id nhân viên giao (L8). */
  by: 'self' | number;
  /** Hẻm online: id người chơi đang đi (chưa dùng ở L2). */
  traveler?: number;
  /** Tiền người chơi mang theo để mua hàng (VNĐ, chốt lúc xuất phát). */
  cash: number;
  /** Xe chở hàng dùng cho chuyến (từ `biz.hauler`). */
  hauler: HaulerId;
  /** Hàng sẽ chở về: productId → số lượng. Chưa có nhịp nào nên người chơi tự lập (tripSetCart). */
  cart: Record<string, number>;
  /** Nhịp đường (0 = đang khởi hành; 1–4 dùng ở L3–L5). */
  beat: 0 | 1 | 2 | 3 | 4;
  /** Mặc cả (nhịp 3, L4). */
  haggle?: { round: number; best: number; anger: number };
  /** Tổng phút bị chậm do chuyện dọc đường (L5) cộng thêm khi về. */
  delayMin: number;
  /** Cờ trạng thái (vd. 'mưa_chạy_tiếp'...) dùng ở L5. */
  flags: string[];
}

/** Bắt đầu một chuyến: returnAt = departAt + khứ hồi theo xe (chưa kể chậm trễ). */
export function beginTrip(
  route: RouteDef, hauler: HaulerDef, day: number, departAt: number,
  by: 'self' | number, cash: number, cart: Record<string, number>,
): TripState {
  return {
    routeId: route.id, day, departAt,
    returnAt: departAt + roundTripMinutes(route, hauler),
    by, cash, hauler: hauler.id,
    cart: { ...cart }, beat: 0, delayMin: 0, flags: [],
  };
}

/** Xe đã về tới (với phút game hiện tại) chưa. */
export const tripArrived = (t: TripState, minutes: number): boolean => minutes >= t.returnAt;

/** Còn bao nhiêu phút game nữa xe về (0 = đã tới). */
export const tripRemaining = (t: TripState, minutes: number): number => Math.max(0, t.returnAt - minutes);

/** Tiến độ chuyến (0..1): 1 = đã về. */
export const tripProgress = (t: TripState, minutes: number): number => {
  const span = Math.max(1, t.returnAt - t.departAt);
  return Math.max(0, Math.min(1, (minutes - t.departAt) / span));
};

/** Số giờ game trên đường (làm tròn lên, tối thiểu 1) — dùng để bớt hạn hàng tươi. */
export const tripRoadHours = (t: TripState): number =>
  Math.max(1, Math.ceil((t.returnAt - t.departAt) / 60));

/** Chi phí mua cả xe hàng theo giá NIÊM YẾT của tuyến (đã rẻ hơn) — VNĐ. */
export function cartBuyCost(t: TripState, route: RouteDef): number {
  let sum = 0;
  for (const [pid, qty] of Object.entries(t.cart)) {
    const q = Math.floor(qty); if (q <= 0) continue;
    const p = productById(pid); if (!p) continue;
    sum += routeBuyPrice(p.buy, routeDiscountFor(route, pid, p.category)) * q;
  }
  return sum;
}

/** Hạn (ngày) còn lại khi nhập kho — không thùng đá thì tươi/thịt mất hạn theo số giờ trên đường (§5.4). */
export function tripLotLife(p: Product, t: TripState, coolBox: boolean): number {
  const life = shelfLife(p.id);
  if (coolBox || (p.category !== 'fresh' && p.category !== 'meat')) return life;
  return Math.max(1, life - tripRoadHours(t));
}

/** Xe về: chuyển `cart` vào kho `stock`, mỗi món một lô (hạn đã bớt theo đường). THUẦN — trả Stock mới. */
export function tripLoadStock(t: TripState, stock: Stock, coolBox: boolean): Stock {
  const route = routeById(t.routeId);
  const k = copyStock(stock);
  if (!route) return k;
  for (const [pid, qty] of Object.entries(t.cart)) {
    const q = Math.floor(qty); if (q <= 0) continue;
    const p = productById(pid); if (!p) continue;
    putStock(k, pid, q, [{ qty: q, life: tripLotLife(p, t, coolBox) }]);
  }
  return k;
}
