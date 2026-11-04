import { describe, expect, it } from 'vitest';
import { newGameData, useGame } from '../core/store';
import { SUPPLIERS } from '../data/suppliers';
import { assessText, displayable, onHand, incoming, suggestQty, supplierTone, supplierTomorrow, commitmentNote } from '../ui/orderHelpers';

/** GĐ946 — helper gợi ý nhập tách khỏi OrderPanel: hành vi giữ nguyên, nay test được. */
const line = (o: object) => ({ level: 'ok', caseUse: 2, shelfDays: 10, spoil: 0, sellDays: 3, overWhy: null, ...o }) as never;
describe('GĐ946 — orderHelpers', () => {
  it('assessText: ổn / bán chậm / nhập dư / kho đầy / chưa có dữ liệu', () => {
    expect(assessText(line({}), 10)).toContain('chừng 3 ngày hết hàng');
    expect(assessText(line({ level: 'near' }), 10)).toContain('bán chậm');
    expect(assessText(line({ level: 'over', sellDays: 20, shelfDays: 5, spoil: 4 }), 10)).toContain('nhập dư');
    expect(assessText(line({ level: 'over', overWhy: 'kho' }), 10)).toContain('kho không đủ chỗ');
    expect(assessText(line({ sellDays: null }), 10)).toContain('chưa có dữ liệu bán');
  });
  it('onHand/incoming/displayable đọc store; kho trống = 0, không giao = 0', () => {
    useGame.setState({ ...newGameData() });
    expect(onHand('nuoc')).toBeGreaterThanOrEqual(useGame.getState().storage.nuoc ?? 0);
    expect(incoming('nuoc')).toBe(0);
    useGame.setState({ storage: { nuoc: 7 } });
    expect(onHand('nuoc')).toBeGreaterThanOrEqual(7);
    expect(typeof displayable('nuoc')).toBe('boolean');
  });
  it('suggestQty: không có chỗ bày thì 0; luôn là số nguyên ≥ 0', () => {
    useGame.setState({ ...newGameData(), furniture: [] });
    expect(suggestQty('nuoc', SUPPLIERS[0], false, false)).toBe(0);
    useGame.setState({ ...newGameData() });
    const q = suggestQty('nuoc', SUPPLIERS[0], true, true);
    expect(Number.isInteger(q) && q >= 0).toBe(true);
  });
  it('supplierTone/Tomorrow: trả tone hợp lệ và hướng hợp lệ', () => {
    const t = supplierTone(SUPPLIERS[0], 10, 5);
    expect(t === null || ['cheap', 'normal', 'pricey'].includes(t.tone)).toBe(true);
    expect(['cheaper', 'pricier', 'flat']).toContain(supplierTomorrow(SUPPLIERS[0], 10, 5));
  });
});

import { commitNote } from '../ui/orderHelpers';
describe('GĐ949 — commitNote', () => {
  const sup = { id: 'cho_dau_moi', name: 'Chợ đầu mối' };
  it('chưa đủ bậc mối quen → null', () => {
    expect(commitNote({ life: 0, monthSpent: 0, total: 1000, supplier: sup, cheapest: null })).toBeNull();
  });
  it('mối quen lớn: có lời khuyên hoàn tháng; mối rival rẻ hơn thì thêm đuôi so sánh', () => {
    const n = commitNote({ life: 1e9, monthSpent: 0, total: 500000, supplier: sup, cheapest: null });
    expect(n).not.toBeNull(); expect(n!.text).toContain('Gom cam kết');
    const r = commitNote({ life: 1e9, monthSpent: 0, total: 500000, supplier: sup, cheapest: { best: { id: 'x', name: 'Mối X' }, total: 400000 } });
    expect(r!.text).toContain('Mối X'); expect(r!.text).toContain('rẻ hơn');
    expect(commitNote({ life: 1e9, monthSpent: 0, total: 500000, supplier: sup, cheapest: { best: sup, total: 500000 } })!.text).not.toContain('rẻ hơn');
  });
});

// nuoc: buy 4000, lẻ 6000. vo: buy 15000, lẻ 25000.
const priceOf = (id: string) => (id === 'nuoc' ? 6000 : 25000);
describe('GĐ1180 — commitmentNote: tổng vốn đang chốt trước khi đặt', () => {
  const d = (items: Record<string, number>) => ({ items });
  it('không đơn chờ, chưa chọn gì → "Chưa có đơn chờ giao"', () => {
    expect(commitmentNote([], 0, priceOf)).toBe('Chưa có đơn chờ giao');
  });
  it('không đơn chờ nhưng có giỏ → "Đơn này trừ X tiền mặt"', () => {
    expect(commitmentNote([], 120000, priceOf)).toBe('Đơn này trừ 120.000đ tiền mặt');
  });
  it('có đơn chờ: gộp vốn đơn chờ + đơn này → tổng chốt hôm nay', () => {
    // 2 đơn chờ: nuoc 10 (10×4000=40000) + vo 2 (2×15000=30000) = 70000; + đơn này 50000 = 120000
    const s = commitmentNote([d({ nuoc: 10 }), d({ vo: 2 })], 50000, priceOf);
    expect(s).toContain('2 đơn');
    expect(s).toContain('70.000đ vốn');
    expect(s).toContain('+50.000đ');
    expect(s).toContain('tổng chốt 120.000đ');
  });
});
