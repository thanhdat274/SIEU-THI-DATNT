import { haulerById, routeById, roundTripMinutes, routeUnlocked, haulerUnlocked, tripTravelCost, routeBuyPrice, routeDiscountFor } from '../../data/routes';
import { beginTrip, tripLoadStock, type TripState } from '../../data/trip';
import { productById, formatMoney } from '../../data/products';
import type { GameState, GetState, SetState } from '../gameTypes';

/** Nhãn vị trí khi chủ đang đi tỉnh (SPEC §5.3 — vắng mặt thật; chỉ UI, không đổi kinh tế/golden). */
export const TRIP_AWAY = 'Đang đi tỉnh';
export const TRIP_HOME = 'Nhà của bạn';

/** Người chơi tối đa mang theo số tiền này (chỉ là giới hạn mạnh; thực tế két cũng giới hạn). */
const MAX_CARRY_K = 500_000_000;

const mm = (m: number): string => {
  const x = Math.floor(m) % 1440;
  return `${String(Math.floor(x / 60)).padStart(2, '0')}:${String(x % 60).padStart(2, '0')}`;
};

/**
 * Hệ 5 — Chuyến đi tỉnh (SPEC-CHIEU-RONG §5). L2: `startTrip` + vắng mặt + xe về nhập kho.
 *
 * - `startTrip(routeId, by, cash)`: kiểm tra mở tuyến/xe, chưa có chuyến nào, đủ tiền vé/xăng; trừ phí
 *   đi lại, đặt `location = 'Đang đi tỉnh'` (chủ tự đi) và ghi `biz.trip`. Mọi tuyến/xe mở > 30 nên
 *   simGolden không bao giờ tới đây (người chơi phải tự bấm).
 * - `tripSetCart(items)`: lập giỏ hàng chở về (giới hạn bởi tiền mang theo); là món duy nhất L2 điều
 *   chỉnh trước khi về (các nhịp chọn hàng/mặc cả làm ở L3–L5).
 * - `tripArrive()`: xe về — hàng vào kho (hạn bớt theo đường, trừ khi có thùng đá), xoá chuyến, chủ về
 *   nhà. Gọi từ tick khi `minutes ≥ returnAt` hoặc endDay nếu ngủ trước khi về (§5.10).
 */
export const createTripSlice = (set: SetState, get: GetState): Pick<GameState, 'startTrip' | 'tripSetCart' | 'tripArrive'> => ({
  startTrip: (routeId: string, by: 'self' | number, cash: number) => {
    const s = get();
    const route = routeById(routeId);
    if (!route) return s.notify('🚚 Không tìm thấy tuyến này.');
    if (!routeUnlocked(route, s.level)) return s.notify(`🚚 Tuyến "${route.name}" mở từ cấp ${route.unlock}.`);
    const hauler = haulerById(s.biz.hauler ?? 'moto');
    if (!hauler) return;
    if (!haulerUnlocked(hauler, s.level)) return s.notify(`🚚 Xe này mở từ cấp ${hauler.unlock}.`);
    if (s.biz.trip) return s.notify('🚚 Đang có một chuyến đi tỉnh — xong chuyến này mới đi tiếp được.');
    if (by !== 'self') return s.notify('🚚 Lát sau mới thuê người giao hàng đi thay được (L8).');
    const carry = Math.floor(cash);
    if (carry <= 0) return s.notify('🚚 Mang theo ít nhất một khoản tiền để mua hàng.');
    if (carry > MAX_CARRY_K) return s.notify('🚚 Số tiền mang theo quả là quá khổ.');
    const minutes = roundTripMinutes(route, hauler);
    const travelCost = tripTravelCost(hauler, minutes);
    if (s.money < travelCost) return s.notify(`🚚 Không đủ tiền vé/xăng (${formatMoney(travelCost)}).`);
    if (carry > s.money - travelCost) return s.notify('🚚 Số tiền mang theo vượt quá két sau khi trừ vé/xăng.');

    const trip: TripState = beginTrip(route, hauler, s.day, Math.floor(s.minutes), 'self', carry, {});
    set({
      money: s.money - travelCost,
      location: TRIP_AWAY,
      biz: { ...s.biz, trip },
    });
    s.notify(`🚚 Lên đường ${route.name} bằng ${hauler.name} — xe về lúc ${mm(trip.returnAt)}. Vắng tiệm mấy tiếng nhé.`);
  },

  tripSetCart: (items: Record<string, number>) => {
    const s = get();
    const t = s.biz.trip;
    if (!t) return s.notify('🚚 Không có chuyến đi nào đang diễn ra.');
    const route = routeById(t.routeId);
    if (!route) return;
    // L2 chưa có nhịp về; chỉ sửa giỏ trong lúc đi (beat 0).
    const clean: Record<string, number> = {};
    let total = 0;
    for (const [pid, qty] of Object.entries(items)) {
      const q = Math.floor(qty); if (q <= 0) continue;
      const p = productById(pid); if (!p) continue;
      clean[pid] = (clean[pid] ?? 0) + q;
      total += routeBuyPrice(p.buy, routeDiscountFor(route, pid, p.category)) * q;
    }
    if (total > t.cash) return s.notify(`🚚 Giỏ hàng cần ${formatMoney(total)} — hơn số tiền mang theo (${formatMoney(t.cash)}).`);
    set({ biz: { ...s.biz, trip: { ...t, cart: clean } } });
    s.notify(`🚚 Đã chốt giỏ hàng (${formatMoney(total)}). Xe về la hàng vào kho.`);
  },

  tripArrive: () => {
    const s = get();
    const t = s.biz.trip;
    if (!t) return;
    const route = routeById(t.routeId);
    if (!route) return;
    const coolBox = !!s.biz.coolBox;
    const k = tripLoadStock(t, { storage: s.storage, storageLots: s.storageLots }, coolBox);
    const items = Object.entries(t.cart).reduce((n, [, q]) => n + Math.floor(q), 0);
    set({
      ...k,
      location: t.by === 'self' ? TRIP_HOME : s.location,
      biz: { ...s.biz, trip: undefined },
    });
    const hauler = haulerById(t.hauler);
    s.notify(items > 0
      ? `🚚 ${hauler?.name ?? 'Xe'} về tới — ${items} món đã vào kho (${route.name}).`
      : `🚚 ${hauler?.name ?? 'Xe'} về tới (${route.name}) — không mang hàng về.`);
  },
});
