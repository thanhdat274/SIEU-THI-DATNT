import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ButcherCard, HuiCard } from '../ui/panels/MorningMeatHuiCards';
import { butcherValueToday, missedMeatRevenue } from '../data/butcherValue';

/** GĐ927 — thẻ thịt cá + thẻ hụi tách khỏi MorningPanel dựng được (SSR). */
describe('GĐ927 — MorningMeatHuiCards', () => {
  it('thịt cá: không có người bán trực', () => {
    const butcherV = butcherValueToday([] as never);
    const recentMeat = { revenue: 300_000, days: 3 } as never;
    const html = renderToStaticMarkup(createElement(ButcherCard, { butcherV, recentMeat, meatMissed: missedMeatRevenue(300_000, butcherV) }));
    expect(html).toContain('Không có người bán thịt cá trực');
    expect(html).toContain('Xếp người bán thịt cá');
  });
  it('hụi', () => {
    const html = renderToStaticMarkup(createElement(HuiCard, { hui: { daily: 50_000, paidDays: 2, members: 10, received: false, turnDay: 7 } as never }));
    expect(html).toContain('Đang góp hụi');
    expect(html).toContain('2/10');
  });
});
