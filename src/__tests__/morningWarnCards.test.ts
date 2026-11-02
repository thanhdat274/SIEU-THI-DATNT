import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { SickShelvesCard, YesterCombosCard } from '../ui/panels/MorningWarnCards';

/** GĐ925 — hai thẻ cảnh báo tách khỏi MorningPanel dựng được (SSR). */
describe('GĐ925 — MorningWarnCards', () => {
  it('Kệ cần chú ý', () => {
    const html = renderToStaticMarkup(createElement(SickShelvesCard, { sickest: [{ icon: '🥫', text: 'Mì gói ế' }] }));
    expect(html).toContain('Kệ cần chú ý');
    expect(html).toContain('Mì gói ế');
  });
  it('Combo hôm qua kém hiệu quả', () => {
    const html = renderToStaticMarkup(createElement(YesterCombosCard, { yesterCombos: [{ def: { id: 'c1', icon: '🍜', name: 'Mì + trứng' }, t: { count: 3, discount: 1000 }, margin: -500 }] }));
    expect(html).toContain('Combo hôm qua');
    expect(html).toContain('(lỗ)');
  });
});
