import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { TiemXoiCard } from '../ui/panels/TiemXoiCard';

/** GĐ924 — TiemXoiCard tách khỏi MorningPanel: dựng được (SSR) khi mới mở. */
describe('GĐ924 — TiemXoiCard', () => {
  it('mới mở: báo kết quả có sau đêm đầu', () => {
    const html = renderToStaticMarkup(createElement(TiemXoiCard, { tiemXoi: { open: true, staff: 1 } as never, last: undefined as never }));
    expect(html).toContain('Tiệm xôi');
    expect(html).toContain('Mới mở');
  });

  it('GĐ1173 — có doanh thu ăn tại chỗ: hiện dòng khách ngồi + doanh thu bán tại chỗ', () => {
    const html = renderToStaticMarkup(createElement(TiemXoiCard, {
      tiemXoi: { open: true, staff: 1 } as never,
      last: { total: 80, saved: 640_000, wages: 180_000, dine: 12, dineRevenue: 186_000 } as never,
    }));
    expect(html).toContain('Khách ngồi ăn tại chỗ 12 suất');
    expect(html).toContain('+186.000đ');
  });

  it('GĐ1173 — không bán tại chỗ: không hiện dòng doanh thu ăn tại chỗ', () => {
    const html = renderToStaticMarkup(createElement(TiemXoiCard, {
      tiemXoi: { open: true, staff: 1 } as never,
      last: { total: 80, saved: 640_000, wages: 180_000 } as never,
    }));
    expect(html).not.toContain('Khách ngồi ăn tại chỗ');
  });
});
