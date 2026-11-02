import { describe, expect, it } from 'vitest';
import { debtDayAction, debtRowsByUrgency, debtWriteOffSoon } from '../data/debtLedger';
import { DEBT_WRITE_OFF_DAYS } from '../data/credit';

/**
 * GĐ747 — nợ sắp bị xoá lên Sổ đầu ngày. Mốc xoá nợ: endDay xoá khi age > DEBT_WRITE_OFF_DAYS
 * (daysLeft = 14 − age ≤ 0). Cửa sổ nhắc: daysLeft 1..3 (còn nhắc kịp); nợ đã mất hẳn hoặc còn xa → không hiện.
 */

const sinceFor = (day: number, daysLeft: number) => day - (DEBT_WRITE_OFF_DAYS - daysLeft);

describe('debtWriteOffSoon — cửa sổ 3 ngày cuối', () => {
  it('không nợ / nợ 0 → null', () => {
    expect(debtWriteOffSoon(undefined, 20)).toBeNull();
    expect(debtWriteOffSoon({}, 20)).toBeNull();
    expect(debtWriteOffSoon({ ba_nam: { amount: 0, since: 1 } }, 20)).toBeNull();
  });
  it('biên: daysLeft 4 → null, 3 → trúng, 1 → trúng, 0 (mất tối nay) → null', () => {
    const day = 20;
    expect(debtWriteOffSoon({ a: { amount: 50_000, since: sinceFor(day, 4) } }, day)).toBeNull();
    expect(debtWriteOffSoon({ a: { amount: 50_000, since: sinceFor(day, 3) } }, day)).toEqual({ count: 1, amount: 50_000, minDaysLeft: 3 });
    expect(debtWriteOffSoon({ a: { amount: 50_000, since: sinceFor(day, 1) } }, day)).toEqual({ count: 1, amount: 50_000, minDaysLeft: 1 });
    expect(debtWriteOffSoon({ a: { amount: 50_000, since: sinceFor(day, 0) } }, day)).toBeNull();
  });
  it('nhiều món: cộng tiền, đếm người, minDaysLeft = món gần mất nhất', () => {
    const day = 20;
    const got = debtWriteOffSoon({
      a: { amount: 100_000, since: sinceFor(day, 2) },
      b: { amount: 40_000, since: sinceFor(day, 1) },
      c: { amount: 999_000, since: sinceFor(day, 9) }, // còn xa → không tính
    }, day);
    expect(got).toEqual({ count: 2, amount: 140_000, minDaysLeft: 1 });
  });
});

describe('debtRowsByUrgency — Sổ nợ xếp món gần mất lên trước', () => {
  const day = 40;
  it('daysLeft tăng dần; hoà thì món tiền lớn trước; bỏ món nợ 0', () => {
    const rows = debtRowsByUrgency({
      xa: { amount: 300_000, since: sinceFor(day, 9) },
      gan: { amount: 20_000, since: sinceFor(day, 1) },
      giua: { amount: 50_000, since: sinceFor(day, 4) },
      giua2: { amount: 80_000, since: sinceFor(day, 4) },
      khong: { amount: 0, since: sinceFor(day, 1) },
    }, day);
    expect(rows.map((r) => r.regularId)).toEqual(['gan', 'giua2', 'giua', 'xa']);
    expect(rows.some((r) => r.regularId === 'khong')).toBe(false);
  });
});

describe('debtDayAction — việc sáng', () => {
  it('không có nợ sắp mất → null; có → danger ưu tiên 1, mở panel Khách quen, nêu tiền + số ngày', () => {
    expect(debtDayAction({}, 20)).toBeNull();
    const day = 20;
    const act = debtDayAction({ a: { amount: 120_000, since: sinceFor(day, 2) } }, day)!;
    expect(act).toMatchObject({ icon: '📕', panel: 'regulars', danger: true, priority: 1 });
    expect(act.text).toContain('120.000đ');
    expect(act.text).toContain('còn 2 ngày');
    expect(act.text).not.toContain('người');
  });
  it('nhiều người: nêu số người', () => {
    const day = 30;
    const act = debtDayAction({
      a: { amount: 60_000, since: sinceFor(day, 3) },
      b: { amount: 40_000, since: sinceFor(day, 1) },
    }, day)!;
    expect(act.text).toContain('100.000đ');
    expect(act.text).toContain('(2 người)');
  });
});
