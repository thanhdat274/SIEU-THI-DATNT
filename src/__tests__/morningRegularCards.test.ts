import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { DueDebtsCard, ReservationsCard } from '../ui/panels/MorningRegularCards';
import { REGULARS } from '../data/regulars';
import { DEBT_LATE_DAYS } from '../data/credit';

/** GĐ934 — hai thẻ tách khỏi MorningPanel dựng được (SSR). */
describe('GĐ934 — MorningRegularCards', () => {
  const r = REGULARS[0];
  it('thẻ nợ: tên + số nợ; nợ quá hạn có cảnh báo, chưa nhắc có nút Nhắc nợ', () => {
    const debt = { amount: 50_000, since: 1 } as never;
    const fresh = renderToStaticMarkup(createElement(DueDebtsCard, { dueDebts: [{ r, debt }], day: 2 }));
    expect(fresh).toContain(r.name);
    expect(fresh).toContain('Nhắc nợ');
    expect(fresh).not.toContain('mất hẳn');
    const late = renderToStaticMarkup(createElement(DueDebtsCard, { dueDebts: [{ r, debt }], day: 1 + DEBT_LATE_DAYS }));
    expect(late).toContain('mất hẳn');
  });
  it('thẻ lời hẹn: báo thiếu hàng hay đủ', () => {
    const res = [[r.id, { productId: 'nuoc', qty: 2, day: 3 }]] as never;
    expect(renderToStaticMarkup(createElement(ReservationsCard, { resList: res, haveStock: () => true }))).toContain('kho/kệ đủ');
    expect(renderToStaticMarkup(createElement(ReservationsCard, { resList: res, haveStock: () => false }))).toContain('chưa có hàng');
  });
});
