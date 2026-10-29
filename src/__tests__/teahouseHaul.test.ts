import { describe, expect, it } from 'vitest';
import { teahouseHaulRead, TEAHOUSE_HAUL_DAYS_WARN, TEAHOUSE_HAUL_DAYS_DANGER } from '../data/teahouseHaul';
import { QUAN_NUOC_MAX_STAFF, type QuanNuocState } from '../data/quanNuoc';

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
