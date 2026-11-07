import { describe, expect, it } from 'vitest';
import { CROPS } from '../data/garden';
import { productById } from '../data/products';
import { cropHasLook } from '../world/farmCrops';

// GĐ1704 — sả trồng được ở nông trại.
describe('GĐ1704 — cây sả', () => {
  const c = CROPS.find((x) => x.id === 'sa')!;
  it('ra x_sa, mở sau golden 30 và không trước hàng sả', () => {
    expect(c.productId).toBe('x_sa');
    expect(c.unlock).toBeGreaterThan(30);
    expect(c.unlock).toBeGreaterThanOrEqual(productById('x_sa').unlock);
    expect(cropHasLook('sa')).toBe(true);
  });
  it('trồng rẻ hơn mua sẵn cùng số lượng, và lời so với bán thẳng', () => {
    const p = productById('x_sa');
    expect(c.seedCost).toBeLessThan(c.yieldQty * p.buy);
    expect(c.yieldQty * p.sell).toBeGreaterThan(c.seedCost);
  });
});
