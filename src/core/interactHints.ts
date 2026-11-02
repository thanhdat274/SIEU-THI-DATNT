import { formatMoney } from '../data/products';
import { SAP_LOT_COST } from '../data/sapRong';
import { openZones } from '../data/zones';
import { formatClock } from './store';
import type { GameState } from './gameTypes';

/** Gợi ý ở lô sạp hàng rong thứ `i` (ngõ 2): chưa mở ngõ / chưa thuê lô trước đó thì không gợi ý. */
export function sapLotHint(g: Pick<GameState, 'biz' | 'day'>, i: number): string {
  const n = g.biz.sapRong ?? 0;
  if (!openZones(g.biz.zones).includes('ngo2') || n < i) return '';
  // GĐ521: lô đã có sạp → tự đứng sạp (mỗi ngày một lần)
  if (i < n) return g.biz.sapHandDay === g.day ? '' : '[L] Đứng sạp hôm nay (+25%)';
  return `[L] Thuê lô sạp hàng rong ${formatMoney(SAP_LOT_COST)}`;
}

/** Gợi ý giao đơn gọi điện trước cửa nhà khách. */
export function deliveryHint(o: { caller: string; dueAt: number }, minutes: number): string {
  const late = minutes > o.dueAt;
  return `[G] Giao hàng cho ${o.caller}${late ? ' (đã trễ hẹn)' : ` · hẹn ${formatClock(o.dueAt)}`}`;
}

export const DIRT_PER_MOP = 5;

/**
 * Kết quả một lần lau nhà: `notify` là lời báo (nếu có), `mop` = true khi thực sự bớt bẩn.
 * `canAct` là false khi đang mở bảng / chế độ xây / chưa vào game / đang ngủ → không làm gì.
 */
export function mopPlan(dirt: number, inShop: boolean, canAct: boolean): { mop: boolean; notify?: string } {
  if (!canAct) return { mop: false };
  if (!inShop) return { mop: false, notify: '🧹 Vào trong tiệm mới lau nhà được' };
  if (dirt < 1) return { mop: false, notify: '✨ Sàn tiệm đã sạch bong' };
  return { mop: true };
}

/** Lời báo sau khi lau, khi sàn đã sạch hẳn (còn < 1 bẩn). */
export const MOP_DONE_NOTE = '✨ Lau xong rồi, sàn tiệm sạch bong';

/** Tên chỗ người chơi đang đứng: trong tòa nhà → tên tòa; gần cổng trại → trại; còn lại ngoài đường. */
export function locationLabel(insideName: string | null | undefined, nearFarm: boolean): string {
  return insideName ? insideName : nearFarm ? 'Trang trại đầu ngõ' : 'Ngoài đường';
}
