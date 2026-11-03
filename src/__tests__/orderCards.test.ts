import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { PRODUCTS } from '../data/products';
import { HotWeekBanner, ProdSuggCard, UrgentCard } from '../ui/OrderCards';
import { urgentReasonOf } from '../ui/orderHelpers';

const noop = () => {};
const [a, b] = PRODUCTS;
describe('GĐ948 — OrderCards', () => {
  it('ProdSuggCard: liệt kê gợi ý', () => {
    const h = renderToStaticMarkup(createElement(ProdSuggCard, { items: [{ icon: '🌾', label: 'Xay bột', detail: 'đủ lúa', panel: 'production' }] as never, onOpen: noop }));
    expect(h).toContain('Xay bột'); expect(h).toContain('đủ lúa');
  });
  it('HotWeekBanner: tuần mai và mối mới chỉ hiện khi có', () => {
    const base = renderToStaticMarkup(createElement(HotWeekBanner, { hot: [a.id], hotNextWeek: [] }));
    expect(base).toContain(a.name); expect(base).not.toContain('Tuần mai'); expect(base).not.toContain('Mối mới');
    const full = renderToStaticMarkup(createElement(HotWeekBanner, { hot: [a.id], hotNextWeek: [b.id], nextSupplierUnlock: 7 }));
    expect(full).toContain('Tuần mai'); expect(full).toContain('cấp 7');
  });
  it('UrgentCard: tên, lý do, số thùng', () => {
    const h = renderToStaticMarkup(createElement(UrgentCard, { rows: [{ id: a.id, reason: 'đã hết hàng', suggest: 3 }] }));
    expect(h).toContain(a.name); expect(h).toContain('đã hết hàng'); expect(h).toContain('nên nhập 3 thùng');
  });
  it('urgentReasonOf: các nhánh theo thứ tự ưu tiên', () => {
    expect(urgentReasonOf({ asked: 2, have: 0, demand: 1, isHot: false })).toContain('2 khách hỏi mà hết hàng');
    expect(urgentReasonOf({ asked: 0, have: 0, demand: 1, isHot: false })).toBe('đã hết hàng');
    expect(urgentReasonOf({ asked: 0, have: 2, demand: 5, isHot: false })).toContain('ít hơn một ngày bán');
    expect(urgentReasonOf({ asked: 1, have: 9, demand: 1, isHot: false })).toContain('1 khách hỏi mua');
    expect(urgentReasonOf({ asked: 0, have: 9, demand: 1, isHot: true })).toBe('hàng hot tuần này');
    expect(urgentReasonOf({ asked: 0, have: 9, demand: 1, isHot: false })).toContain('bán 1.0/ngày');
  });
});
