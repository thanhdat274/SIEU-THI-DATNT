import { describe, it, expect } from 'vitest';
import { cookableInTime, phoneCallFor, FEASIBLE_COOK_LEVEL, COOK_ORDER_MINUTES } from '../data/phoneOrders';
import { RECIPES } from '../data/recipes';

describe('GĐ1527 đơn nấu làm kịp', () => {
  it('công thức số phần làm kịp', () => {
    expect(cookableInTime(15, 2, 60)).toBe(8);
    expect(cookableInTime(90, 1, 60)).toBe(1);
  });
  it('mọi đơn nấu sau cấp 30 không vượt sản lượng làm kịp', () => {
    const stations = [...new Set(RECIPES.map((r) => r.station))];
    let seen = 0;
    for (let day = 1; day < 120; day++) for (let slot = 0; slot < 4; slot++) {
      const o = phoneCallFor(7, day, slot, 70, {}, 1, 'sunny', {}, stations as never, 0, true);
      if (!o || o.premium == null || o.vip) continue;
      for (const [id, q] of Object.entries(o.items)) {
        const r = RECIPES.find((x) => x.outputId === id);
        if (!r) continue;
        seen++;
        expect(q).toBeLessThanOrEqual(cookableInTime(r.durationMin, r.outputQty, COOK_ORDER_MINUTES));
      }
    }
    expect(seen).toBeGreaterThan(0);
    expect(FEASIBLE_COOK_LEVEL).toBeGreaterThanOrEqual(30);
  });
});
