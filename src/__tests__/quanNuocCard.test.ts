import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { QuanNuocCard } from '../ui/panels/QuanNuocCard';

/** GĐ923 — QuanNuocCard tách khỏi MorningPanel: dựng được (SSR) cả khi mới mở lẫn khi đã có kết quả hôm qua. */
describe('GĐ923 — QuanNuocCard', () => {
  const quan = { open: true, staff: 1, price: 'vua' } as never;
  it('mới mở: báo kết quả có sau đêm đầu', () => {
    const html = renderToStaticMarkup(createElement(QuanNuocCard, { quanNuoc: quan, quanNuocLast: null, quanHealth: null }));
    expect(html).toContain('Quán nước');
    expect(html).toContain('Mới mở');
  });
  it('có kết quả hôm qua: hiện số ly', () => {
    const last = { day: 1, revenue: 50000, served: 8, wanted: 10, wages: 0, profit: 0 };
    const html = renderToStaticMarkup(createElement(QuanNuocCard, { quanNuoc: quan, quanNuocLast: last, quanHealth: null }));
    expect(html).toContain('8/10 ly');
  });
});
