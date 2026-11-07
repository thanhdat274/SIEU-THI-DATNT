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

// GĐ1673 — mùa hè hút chè Thái (món mát).
describe('GĐ1673 — mùa hè hút chè Thái', () => {
  it('che_thai nằm trong hàng hot mùa hè', () => {
    expect(FESTIVALS.find((e) => e.id === 'he')!.hot).toContain('che_thai');
  });
});

// GĐ1674 — mùa mưa hút chè trôi nước gừng (món ấm).
describe('GĐ1674 — mùa mưa hút chè trôi nước', () => {
  it('che_troi_nuoc nằm trong hàng hot mùa mưa', () => {
    expect(FESTIVALS.find((e) => e.id === 'mua_mua')!.hot).toContain('che_troi_nuoc');
  });
});

// GĐ1675 — Trung thu hút bưởi (mâm cỗ trông trăng) và chè bưởi.
describe('GĐ1675 — Trung thu hút bưởi', () => {
  it('x_buoi và che_buoi nằm trong hàng hot Trung thu', () => {
    const hot = FESTIVALS.find((e) => e.id === 'trung_thu')!.hot;
    expect(hot).toContain('x_buoi');
    expect(hot).toContain('che_buoi');
  });
});

// GĐ1677 — hội thi làm bánh hút trứng ngỗng (nguyên liệu bánh flan).
describe('GĐ1677 — hội thi làm bánh hút trứng ngỗng', () => {
  it('trung_goos nằm trong hàng hot hội thi làm bánh', () => {
    expect(FESTIVALS.find((e) => e.id === 'hoi_banh')!.hot).toContain('trung_goos');
  });
});

describe('GĐ1708 — lễ hội làng nấu cỗ hút gà xào sả', () => {
  it('ga_xao_sa nằm trong hàng hot lễ hội làng', () => {
    expect(FESTIVALS.find((e) => e.id === 'le_hoi_lang')!.hot).toContain('ga_xao_sa');
  });
});
