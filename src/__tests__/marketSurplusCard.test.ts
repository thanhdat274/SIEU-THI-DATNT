import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { MarketSurplusCard } from '../ui/panels/MarketSurplusCard';
import type { MarketClearValue } from '../data/chophien';

/** GĐ921 — MarketSurplusCard tách khỏi MorningPanel: dựng được (SSR), có tiêu đề và nút gánh bán kèm tổng tiền. */
describe('GĐ921 — MarketSurplusCard', () => {
  it('dựng thẻ chợ phiên với tổng ước nhận', () => {
    const chophien = { day: 7, rows: [], total: 120_000, units: 12 } as unknown as MarketClearValue;
    const html = renderToStaticMarkup(createElement(MarketSurplusCard, { chophien }));
    expect(html).toContain('chợ phiên');
    expect(html).toContain('Gánh bán ngay');
    expect(html).toContain('12 món');
  });
});
