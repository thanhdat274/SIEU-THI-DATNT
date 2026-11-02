import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { SupplyChainCard } from '../ui/panels/SupplyChainCard';
import { newQuanNuoc } from '../data/quanNuoc';

/**
 * GĐ919 — SupplyChainCard tách khỏi MorningPanel: dựng được (SSR) với props tối thiểu và có tiêu đề thẻ,
 * để lần tách panel sau không làm vỡ im lặng khối này.
 */
describe('GĐ919 — SupplyChainCard', () => {
  it('dựng thẻ "Rốn kho chung" với kho trống, không chi nhánh', () => {
    const html = renderToStaticMarkup(
      createElement(SupplyChainCard, { storage: {}, branch: undefined, quanNuoc: newQuanNuoc(), quanNuocLast: null, level: 5, weather: undefined, day: 3 }),
    );
    expect(html).toContain('Rốn kho chung');
  });
});
