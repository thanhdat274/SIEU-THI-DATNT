import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { FestivalPrepCallout, GuideBanner, NetworkFillCallout, QuanDrinkTipCallout } from '../ui/OrderBanners';

const noop = () => {};
describe('GĐ947 — OrderBanners', () => {
  const items = [{ id: 'nuoc', name: 'Nước' }, { id: 'mi', name: 'Mì' }] as never;
  it('GuideBanner: giỏ rỗng nhắc 1 thùng/món; có món thì ✅ và sẵn sàng', () => {
    const e = renderToStaticMarkup(createElement(GuideBanner, { guideItems: items, guideIn: [] }));
    expect(e).toContain('⬜'); expect(e).toContain('Mỗi món một thùng');
    const r = renderToStaticMarkup(createElement(GuideBanner, { guideItems: items, guideIn: ['nuoc'] }));
    expect(r).toContain('✅'); expect(r).toContain('Sẵn sàng đặt hàng');
  });
  it('QuanDrinkTipCallout: thiếu thì có nút nạp, đủ thì không', () => {
    const tip = (shortfall: number) => ({ verdict: 'danger', missedRevenue: 12000, wanted: 20, have: 20 - shortfall, shortfall }) as never;
    const a = renderToStaticMarkup(createElement(QuanDrinkTipCallout, { tip: tip(5), onFill: noop }));
    expect(a).toContain('Nạp đồ uống quán nước vào giỏ'); expect(a).toContain('5 ly');
    const b = renderToStaticMarkup(createElement(QuanDrinkTipCallout, { tip: tip(0), onFill: noop }));
    expect(b).not.toContain('<button');
  });
  it('FestivalPrepCallout: ngày mai vs sau N ngày + nút trữ lễ', () => {
    const plan = (inDays: number) => ({ festival: { icon: '🎊', name: 'Tết' }, inDays, lines: [1, 2], bonus: 50000, skipped: [] }) as never;
    expect(renderToStaticMarkup(createElement(FestivalPrepCallout, { plan: plan(1), onFill: noop }))).toContain('ngày mai');
    const h = renderToStaticMarkup(createElement(FestivalPrepCallout, { plan: plan(3), onFill: noop }));
    expect(h).toContain('sau 3 ngày'); expect(h).toContain('Trữ lễ vào giỏ');
  });
  it('NetworkFillCallout: nút điền kệ chi nhánh chỉ khi có dòng chi nhánh', () => {
    const m = (lines: object[]) => ({ buyNeed: 0, line: 'Đủ hàng', lines }) as never;
    expect(renderToStaticMarkup(createElement(NetworkFillCallout, { manifest: m([]), onFillBranch: noop }))).not.toContain('<button');
    const h = renderToStaticMarkup(createElement(NetworkFillCallout, { manifest: m([{ outlet: 'branch', label: 'Mì', need: 4, source: 'buy' }]), onFillBranch: noop }));
    expect(h).toContain('Mì 4 (mua)'); expect(h).toContain('Điền kệ chi nhánh');
  });
});

import { SupplierRelLine, ForecastLine } from '../ui/OrderBanners';
describe('SupplierRelLine / ForecastLine (GĐ957)', () => {
  it('mối quen hiện bậc + chi tháng', () => {
    const html = renderToStaticMarkup(createElement(SupplierRelLine, { life: 0, monthSpent: 0 }));
    expect(html).toContain('Mối quen');
  });
  it('dự báo rỗng vẫn không lỗi, có 2 ngày thì nhãn Mai/Ngày kia', () => {
    expect(renderToStaticMarkup(createElement(ForecastLine, { forecast: [], weatherSeed: 1, day: 2 }))).toContain('Dự báo');
    const html = renderToStaticMarkup(createElement(ForecastLine, { forecast: ['sunny', 'rain'] as never, weatherSeed: 1, day: 2 }));
    expect(html).toContain('Mai');
    expect(html).toContain('Ngày kia');
  });
});
