import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { monthOf } from '../data/calendar';
import { BranchChoresCard, HiepLucCard } from '../ui/panels/MorningBranchCards';

/** GĐ928 — thẻ việc chi nhánh + thẻ hiệp lực tách khỏi MorningPanel dựng được (SSR). */
describe('GĐ928 — MorningBranchCards', () => {
  it('việc chi nhánh', () => {
    const html = renderToStaticMarkup(createElement(BranchChoresCard, { branchChores: [{ icon: '📦', text: 'Nhập hàng chi nhánh', danger: true }] }));
    expect(html).toContain('Tiện lợi 24/7');
    expect(html).toContain('Nhập hàng chi nhánh');
  });
  it('hiệp lực: chưa lập', () => {
    const html = renderToStaticMarkup(createElement(HiepLucCard, { biz: {}, day: 3 }));
    expect(html).toContain('Lập đối tác');
  });
  it('hiệp lực: đang chạy tháng này', () => {
    const html = renderToStaticMarkup(createElement(HiepLucCard, { biz: { hiepLuc: { active: true, m: monthOf(3) }, hiepLucMonth: 1000, hiepLucStreak: 2 } as never, day: 3 }));
    expect(html).toContain('Đang hiệp lực');
    expect(html).toContain('chuỗi 2 tháng');
  });
});
