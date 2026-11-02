import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { REGULARS } from '../data/regulars';
import { ExpectedRegularsList } from '../ui/panels/ExpectedRegularsList';

/** GĐ941 — danh sách khách quen dự kiến: rỗng, ẩn món chưa khám phá (???), đánh dấu kho. */
const r0 = REGULARS[0];
const render = (expected: typeof REGULARS, discovered: string[], have: boolean, res = {}) => renderToStaticMarkup(createElement(ExpectedRegularsList, {
  expected, regulars: { [r0.id]: { friendship: 0, visits: 0, perks: [], discovered } }, reservations: res,
  favsOf: () => [r0.favorites[0]], haveStock: () => have,
}));
describe('GĐ941 — ExpectedRegularsList', () => {
  it('rỗng: báo không ai có lịch', () => {
    const h = render([], [], true); expect(h).toContain('(0)'); expect(h).toContain('Không ai');
  });
  it('món chưa khám phá hiện ???, đã khám phá hiện tên; kho đánh dấu ✓/⚠️', () => {
    expect(render([r0], [], false)).toContain('???');
    const h = render([r0], [r0.favorites[0]], true);
    expect(h).not.toContain('???'); expect(h).toContain('✓'); expect(h).toContain(r0.name);
  });
  it('đang giữ món hẹn thì có nhãn', () => {
    expect(render([r0], [], true, { [r0.id]: { productId: r0.favorites[0], day: 1 } })).toContain('đang giữ món hẹn');
  });
});
