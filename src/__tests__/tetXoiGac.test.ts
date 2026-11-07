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
