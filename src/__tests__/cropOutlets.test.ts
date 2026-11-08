import { describe, expect, it } from 'vitest';
import { ANIMALS, CROPS } from '../data/garden';
import { RECIPES } from '../data/recipes';
import { QUAN_RECIPES } from '../data/quanRecipes';

// GĐ1742: mỗi cây trồng có ≥2 lối ra chế biến (bếp + quán nước) — trồng ra là có chỗ dùng.
describe('lối ra cây trồng (GĐ1742)', () => {
  it.each(CROPS.map((c) => [c.id, c.productId]))('%s có ≥2 lối ra', (_id, pid) => {
    const kitchen = RECIPES.filter((r) => r.inputs.some((i) => i.productId === pid)).length;
    const quan = QUAN_RECIPES.filter((q) => q.uses.some((u) => u.id === pid)).length;
    expect(kitchen + quan).toBeGreaterThanOrEqual(2);
  });
});

// GĐ1743: vật nuôi cũng vậy — trứng/sữa/thịt chăn nuôi đều có ≥2 lối ra.
describe('lối ra vật nuôi (GĐ1743)', () => {
  const pids = [...new Set(Object.values(ANIMALS).map((a) => a.productId))];
  it.each(pids)('%s có ≥2 lối ra', (pid) => {
    const kitchen = RECIPES.filter((r) => r.inputs.some((i) => i.productId === pid)).length;
    const quan = QUAN_RECIPES.filter((q) => q.uses.some((u) => u.id === pid)).length;
    expect(kitchen + quan).toBeGreaterThanOrEqual(2);
  });
});
