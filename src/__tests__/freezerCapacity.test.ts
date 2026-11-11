import { describe, expect, it } from 'vitest';
import { furnitureDef, slotCount } from '../data/furniture';
import { migrateTiers } from '../core/stock';

/**
 * GĐ2350 — QA người chơi: tủ đông thật chứa RẤT nhiều (hầm sâu), trước đây 2 ngăn × 3 ô × 8
 * (48 món) còn ít hơn tủ mát 400k (72) — buff 3 × 4 × 10 = 120. Khoá luật số ô + chuyển đổi
 * save cũ (6 ô → 12 ô, hàng đã bày giữ nguyên qua migrateTiers).
 */

describe('GĐ2350 — tủ đông chứa được nhiều', () => {
  it('def: 3 ngăn × 4 ô × 10 món = 120, tổng chứa hơn tủ mát', () => {
    const def = furnitureDef('freezer');
    expect([def.tiers, def.slots, def.capacity]).toEqual([3, 4, 10]);
    expect(slotCount('freezer')).toBe(12);
    const total = (t: 'freezer' | 'fridge') => {
      const d = furnitureDef(t);
      return d.tiers * d.slots * d.capacity;
    };
    expect(total('freezer')).toBeGreaterThan(total('fridge'));
  });

  it('save cũ 6 ô → migrateTiers bù đủ 12 ô, hàng đã bày giữ nguyên', () => {
    const old = {
      uid: 1, type: 'freezer', x: 0, z: 0, rot: 0, broken: false, trial: false,
      tiers: [
        { productId: 'kem', count: 8, lots: [{ qty: 8, life: 10 }] },
        { productId: null, count: 0, lots: [] },
        { productId: null, count: 0, lots: [] },
        { productId: null, count: 0, lots: [] },
        { productId: null, count: 0, lots: [] },
        { productId: null, count: 0, lots: [] },
      ],
    } as never;
    const m = migrateTiers(old);
    expect(m.tiers).toHaveLength(12);
    expect(m.tiers[0].productId).toBe('kem');
    expect(m.tiers[0].count).toBe(8);
    expect(m.tiers.slice(1).every((t) => t.productId === null && t.count === 0)).toBe(true);
  });
});
