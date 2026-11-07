import { describe, expect, it } from 'vitest';
import { FESTIVALS } from '../data/calendar';

// GĐ1667 — xôi gấc (xôi đỏ ngày Tết) được ưa chuộng dịp Tết Nguyên Đán.
describe('GĐ1667 — Tết hút xôi gấc', () => {
  it('xoi_gac nằm trong danh sách hàng hot dịp Tết', () => {
    expect(FESTIVALS.find((e) => e.id === 'tet')!.hot).toContain('xoi_gac');
  });
});

// GĐ1668 — hội làng nấu cỗ cũng hút xôi gấc.
describe('GĐ1668 — lễ hội làng hút xôi gấc', () => {
  it('xoi_gac nằm trong hàng hot lễ hội làng', () => {
    expect(FESTIVALS.find((e) => e.id === 'le_hoi_lang')!.hot).toContain('xoi_gac');
  });
});

// GĐ1671 — mứt gừng bà Tám: hàng xóm bán, hút dịp Tết.
describe('GĐ1671 — mứt gừng bà Tám', () => {
  it('chỉ nhà bà Tám bán, lời, mở sau 30, nằm trong hàng hot Tết', async () => {
    const { NEIGHBOR2_IDS } = await import('../data/homemade');
    const { productById } = await import('../data/products');
    expect(NEIGHBOR2_IDS.has('hx_mut_gung')).toBe(true);
    const p = productById('hx_mut_gung');
    expect(p.sell).toBeGreaterThan(p.buy);
    expect(p.unlock).toBeGreaterThan(30);
    expect(FESTIVALS.find((e) => e.id === 'tet')!.hot).toContain('hx_mut_gung');
  });
});
