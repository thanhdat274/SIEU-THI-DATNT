import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { FESTIVALS } from '../data/calendar';
import { FestivalNowCard, FestivalSoonCard } from '../ui/panels/FestivalCards';

/** GĐ937 — thẻ lễ hội đang diễn ra / sắp tới render đúng tiêu đề và trạng thái kho. */
const f = FESTIVALS[0];
describe('GĐ937 — FestivalCards', () => {
  it('đang diễn ra: tiêu đề + hệ số khách', () => {
    const h = renderToStaticMarkup(createElement(FestivalNowCard, { festival: f, level: 30, day: 1, haveStock: () => false, fv: undefined as never, fvDelta: null }));
    expect(h).toContain(`${f.name} đang diễn ra`); expect(h).toContain('khách');
  });
  it('sắp tới: ngày mai vs sau N ngày, hàng thiếu đánh dấu cảnh báo', () => {
    const r = (inDays: number) => renderToStaticMarkup(createElement(FestivalSoonCard, { soon: { festival: f, inDays }, level: 30, storage: {}, fv: undefined as never, fvDelta: null }));
    expect(r(1)).toContain('ngày mai'); expect(r(3)).toContain('sau 3 ngày'); expect(r(3)).toContain('thiếu');
  });
});
