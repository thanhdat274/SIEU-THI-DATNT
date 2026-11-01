import { describe, expect, it } from 'vitest';
import { teahouseHaulRead, teahouseFillPlan, TEAHOUSE_HAUL_DAYS_WARN, TEAHOUSE_HAUL_DAYS_DANGER } from '../data/teahouseHaul';
import { QUAN_NUOC_MAX_STAFF, quanNuocDrinkIds, type QuanNuocState } from '../data/quanNuoc';
import { PRODUCTS } from '../data/products';

/**
 * GĐ208 — "Quán nước soi độ đủ đồ uống theo đêm": quán nước rút đồ uống từ kho CHUNG nên "kệ vơi"
 * là kho chung bị ăn khô. Helper THUẦN dự phóng còn mấy đêm đồ uống + có nên chở thêm — bản quán nước
 * của autoHaulDue (GĐ206). Không đổi state ở đây.
 */
describe('GĐ208 — quán nước soi độ đủ đồ uống theo đêm', () => {
  const open = (): QuanNuocState => ({ open: true, staff: 1, price: 'vua' });
  const closed = (): QuanNuocState => ({ open: false, staff: 0, price: 'vua' });

  it('quán đóng → cần 0 ly/đêm, còn dư vô hạn, không mách chở', () => {
    const r = teahouseHaulRead(0, closed(), 29);
    expect(r.needPerNight).toBe(0);
    expect(r.daysLeft).toBe(Infinity);
    expect(r.verdict).toBe('ok');
    expect(r.haulNow).toBe(false);
  });

  it('quán mở + kho dư (≥ 3 đêm) → ổn, không cần chở', () => {
    const r = teahouseHaulRead(10_000, open(), 29);
    expect(r.verdict).toBe('ok');
    expect(r.haulNow).toBe(false);
  });

  it('quán mở + kho cạn (≤ 1 đêm) → danger + mách chở gấp', () => {
    const r = teahouseHaulRead(2, open(), 29);
    expect(r.needPerNight).toBeGreaterThan(2);
    expect(r.daysLeft).toBeLessThanOrEqual(TEAHOUSE_HAUL_DAYS_DANGER);
    expect(r.verdict).toBe('danger');
    expect(r.haulNow).toBe(true);
  });

  it('quán mở + vừa đủ (2 đêm) → warn + mách chở sớm', () => {
    const tick = teahouseHaulRead(10_000, open(), 29);
    const need = tick.needPerNight;
    const r = teahouseHaulRead(need * TEAHOUSE_HAUL_DAYS_WARN, open(), 29);
    expect(r.daysLeft).toBeCloseTo(TEAHOUSE_HAUL_DAYS_WARN);
    expect(r.verdict).toBe('warn');
    expect(r.haulNow).toBe(true);
  });

  it('nhu cầu mỗi đêm theo nhân viên: thuê thêm → tiêu kho nhanh hơn', () => {
    const r1 = teahouseHaulRead(1000, { open: true, staff: 0, price: 'vua' }, 29);
    const r2 = teahouseHaulRead(1000, { open: true, staff: QUAN_NUOC_MAX_STAFF, price: 'vua' }, 29);
    expect(r2.needPerNight).toBeGreaterThan(r1.needPerNight);
  });
});

/** Nhà cung cấp bán mọi món đồ uống quán bán (caseSize 1). */
const csAll = (id: string) => (PRODUCTS.some((p) => p.id === id && p.category === 'drink') ? 1 : 0);

/**
 * GĐ209 — "Nạp đồ uống quán nước": CƠ CHẾ CHỞ thật cho quán nước — quán rút ĐỒ UỐNG từ kho CHUNG nên
 * "chở" = đặt đồ uống về kho đủ tối nay. Helper THUẦN phân bổ phần thiếu vào món đồ uống nhà cung cấp bán.
 */
describe('GĐ209 — nạp đồ uống quán nước', () => {
  const open = (): QuanNuocState => ({ open: true, staff: 1, price: 'vua' });

  it('quán đóng → không có gì để nạp', () => {
    expect(teahouseFillPlan({ open: false, staff: 0, price: 'vua' }, 29, 0, csAll)).toEqual({ lines: [], topup: 0 });
  });

  it('kho đã đủ (đơn vị ≥ nhu cầu tối nay) → không nạp', () => {
    const plan = teahouseFillPlan(open(), 29, 10_000, csAll);
    expect(plan.topup).toBe(0);
    expect(plan.lines).toEqual([]);
  });

  it('kho thiếu → phân bổ vào món đồ uống quán bán mà supplier có, quy đủ thùng', () => {
    const plan = teahouseFillPlan(open(), 29, 2, csAll);
    expect(plan.topup).toBeGreaterThan(0);
    expect(plan.lines.length).toBeGreaterThan(0);
    // mọi món đề xuất đều là đồ uống quán bán, nhà cung cấp bán được (csAll=1)
    expect(plan.lines.every((l) => quanNuocDrinkIds(29).includes(l.id))).toBe(true);
    expect(plan.lines.every((l) => l.cases >= 1 && l.units === l.cases)).toBe(true);
    expect(plan.lines.reduce((n, l) => n + l.units, 0)).toBeGreaterThanOrEqual(plan.topup);
  });

  it('supplier không bán món đó (cs=0) → bỏ qua món đó', () => {
    const noSell = () => 0;
    const plan = teahouseFillPlan(open(), 29, 2, noSell);
    expect(plan.topup).toBeGreaterThan(0); // vẫn thiếu
    expect(plan.lines).toEqual([]);        // nhưng không đề xuất món nào vì supplier không bán
  });
});
