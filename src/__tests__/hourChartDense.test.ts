import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { HourChart } from '../ui/panels/HistoryPanel';

/** GĐ547: biểu đồ khách theo giờ nhiều cột (>12) không tràn khung điện thoại. */
const hours = (n: number) => Array.from({ length: n }, (_, i) => ({ hour: 6 + i, customers: 100 + i, revenue: 0 }));

describe('HourChart dày', () => {
  it('17 giờ: chỉ ghi số khách giờ đông nhất, nhãn giờ chẵn, cột co được', () => {
    const html = renderToStaticMarkup(createElement(HourChart, { hours: hours(17), peak: 12 }));
    expect(html).toContain('>106<');
    expect(html).not.toContain('>107<');
    expect(html).toContain('>8h<');
    expect(html).not.toContain('>7h<');
    expect(html).toContain('min-width:0');
  });
  it('≤12 giờ: ghi đủ mọi số và mọi giờ như cũ', () => {
    const html = renderToStaticMarkup(createElement(HourChart, { hours: hours(10), peak: 12 }));
    expect(html).toContain('>101<');
    expect(html).toContain('>7h<');
  });
});
