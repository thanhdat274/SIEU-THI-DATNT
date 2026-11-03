import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { HotGoodsCards } from '../ui/panels/HotGoodsCards';

/** GĐ936 — hai thẻ hàng hot: ẩn khi rỗng, đánh dấu ✓ / ⚠️ theo kho. */
const r = (eventHot: string[], weekHot: string[], have: boolean) =>
  renderToStaticMarkup(createElement(HotGoodsCards, { eventHot, weekHot, haveStock: () => have }));
describe('GĐ936 — HotGoodsCards', () => {
  it('rỗng thì không dựng gì', () => expect(r([], [], true)).toBe(''));
  it('có hàng: ✓, thiếu hàng: ⚠️ chưa có, đúng tiêu đề từng thẻ', () => {
    const a = r(['nuoc'], [], true);
    expect(a).toContain('Hàng của dịp hôm nay'); expect(a).toContain('✓'); expect(a).not.toContain('Hàng hot tuần');
    const b = r([], ['nuoc'], false);
    expect(b).toContain('Hàng hot tuần này'); expect(b).toContain('chưa có');
  });
});
