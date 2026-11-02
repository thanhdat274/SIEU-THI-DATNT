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
