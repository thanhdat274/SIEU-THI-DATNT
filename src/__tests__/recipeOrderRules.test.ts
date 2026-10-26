import { describe, expect, it } from 'vitest';
import { COOKED_PRODUCTS, RECIPES } from '../data/recipes';
import { productById } from '../data/products';
import { phoneCallFor } from '../data/phoneOrders';

describe('công thức và đơn điện thoại', () => {
  it('nguyên liệu của công thức đã mở bán từ khi công thức mở', () => {
    for (const r of RECIPES) for (const i of r.inputs) {
      expect(productById(i.productId).unlock, `${r.id} <- ${i.productId}`).toBeLessThanOrEqual(r.unlock);
    }
  });

  it('món nấu mở cùng cấp với công thức tạo ra nó', () => {
    for (const r of RECIPES) {
      const out = COOKED_PRODUCTS.find((c) => c.id === r.outputId);
      if (out) expect(out.unlock, r.id).toBe(r.unlock);
    }
  });

  it('không ai gọi đặt thịt cá tươi khi tiệm chưa có quầy thịt cá', () => {
    const meatOrdered = (hasCounter: boolean) => {
      for (let seed = 1; seed < 400; seed++) for (let slot = 0; slot < 4; slot++) {
        const o = phoneCallFor(seed, 30, slot, 60, {}, seed, 'sunny', {}, [], 0, hasCounter);
        if (o && Object.keys(o.items).some((id) => productById(id).category === 'meat')) return true;
      }
      return false;
    };
    expect(meatOrdered(false)).toBe(false);
    expect(meatOrdered(true)).toBe(true);
  });
});
