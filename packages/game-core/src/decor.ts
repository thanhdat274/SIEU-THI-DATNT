import { DECOR_ATTRACTION_DIVISOR, DECOR_ATTRACTION_MAX, DECOR_MAP } from '@game/data';
import type { StoreFixture } from '@game/shared';

/** Điểm thu hút = đồ tường/biển/quầy đã mua + đồ sàn đang đặt (fixture type decor), tối đa DECOR_ATTRACTION_MAX. */
export function decorAttraction(decorOwned: readonly string[] | undefined, fixtures: readonly StoreFixture[]): number {
  let total = 0;
  for (const id of decorOwned ?? []) total += DECOR_MAP[id]?.attraction ?? 0;
  for (const fixture of fixtures) if (fixture.type === 'decor' && fixture.shopId) total += DECOR_MAP[fixture.shopId]?.attraction ?? 0;
  return Math.min(DECOR_ATTRACTION_MAX, total);
}

/** Hệ số lượng khách theo thu hút: 1 + điểm / DECOR_ATTRACTION_DIVISOR (tối đa +25%). */
export const decorTrafficMultiplier = (attraction: number): number => 1 + attraction / DECOR_ATTRACTION_DIVISOR;
