import { describe, it, expect } from 'vitest';
import { debtLedger } from '../data/debtLedger';
import { DEBT_LATE_DAYS, DEBT_WRITE_OFF_DAYS } from '../data/credit';

describe('debtLedger — Sổ nợ định giá rủi ro (GĐ150)', () => {
  it('trống khi không ai nợ', () => {
    const l = debtLedger({}, 10);
    expect(l.count).toBe(0);
    expect(l.lockedTotal).toBe(0);
    expect(l.lateCount).toBe(0);
    expect(l.lateAmount).toBe(0);
    expect(l.writeOffTonightAmount).toBe(0);
    expect(l.rows).toEqual([]);
  });

  it('undefined/không nợ → trống, không crash', () => {
    expect(debtLedger(undefined, 10).count).toBe(0);
    expect(debtLedger({ a: { amount: 0, since: 1 } }, 10).count).toBe(0);
  });

  it('món nợ mới (age 0) → tổng khóa đúng, chưa muộn, chưa mất', () => {
    const l = debtLedger({ a: { amount: 50000, since: 10 } }, 10);
    expect(l.count).toBe(1);
    expect(l.lockedTotal).toBe(50000);
    expect(l.rows[0].age).toBe(0);
    expect(l.rows[0].daysLeft).toBe(DEBT_WRITE_OFF_DAYS);
    expect(l.rows[0].late).toBe(false);
    expect(l.rows[0].writeOffTonight).toBe(false);
    expect(l.lateCount).toBe(0);
    expect(l.writeOffTonightAmount).toBe(0);
  });

  it('tổng khóa = Σ mọi món nợ dương', () => {
    const l = debtLedger(
      { a: { amount: 50000, since: 10 }, b: { amount: 30000, since: 8 }, c: { amount: 0, since: 1 } },
      10,
    );
    expect(l.count).toBe(2);
    expect(l.lockedTotal).toBe(80000);
  });

  it('quá DEBT_LATE_DAYS (7) → late=true, vào lateAmount', () => {
    const l = debtLedger({ a: { amount: 60000, since: 3 } }, 10);
    expect(10 - 3).toBe(7); // age = 7
    expect(l.rows[0].late).toBe(true);
    expect(l.lateCount).toBe(1);
    expect(l.lateAmount).toBe(60000);
  });

  it('mới dưới ngưỡng muộn → không late', () => {
    const l = debtLedger({ a: { amount: 60000, since: 5 } }, 10); // age = 5
    expect(l.rows[0].late).toBe(false);
    expect(l.lateAmount).toBe(0);
  });

  it('writeOffTonight đúng tại mốc age = DEBT_WRITE_OFF_DAYS (14)', () => {
    const l = debtLedger({ a: { amount: 90000, since: 11 } }, 25); // age = 14
    expect(l.rows[0].age).toBe(14);
    expect(l.rows[0].daysLeft).toBe(0);
    expect(l.rows[0].writeOffTonight).toBe(true);
    expect(l.writeOffTonightAmount).toBe(90000);
    // bị xoá cuối ngày 25 → age 14 → < hoặc = ngưỡng xoá
  });

  it('còn 1 ngày trước mốc xoá (daysLeft=1) → CHƯA writeOffTonight', () => {
    const l = debtLedger({ a: { amount: 70000, since: 12 } }, 25); // age = 13, daysLeft = 1
    expect(l.rows[0].daysLeft).toBe(1);
    expect(l.rows[0].writeOffTonight).toBe(false);
  });

  it('quá ngưỡng xoá (age > 14) → vẫn writeOffTonight (bị xoá tối nay)', () => {
    const l = debtLedger({ a: { amount: 50000, since: 10 } }, 25); // age = 15
    expect(l.rows[0].daysLeft).toBe(-1);
    expect(l.rows[0].writeOffTonight).toBe(true);
    expect(l.writeOffTonightAmount).toBe(50000);
  });

  it('writeOffTonightAmount chỉ cộng món sắp mất, không cộng món đang trả bình thường', () => {
    const l = debtLedger(
      { a: { amount: 50000, since: 1 }, b: { amount: 40000, since: 10 } },
      25, // a: age 24 → mất; b: age 15 → mất
    );
    expect(l.writeOffTonightAmount).toBe(90000);
    expect(l.lateAmount).toBe(90000); // cả hai đều late
  });

  it('reminded được giữ trong row', () => {
    const l = debtLedger({ a: { amount: 30000, since: 3, reminded: true } }, 10);
    expect(l.rows[0].reminded).toBe(true);
    const l2 = debtLedger({ a: { amount: 30000, since: 3 } }, 10);
    expect(l2.rows[0].reminded).toBeUndefined();
  });

  it('rows giữ đúng regularId and sắp theo thứ tự ghi (ổn định)', () => {
    const l = debtLedger({ x: { amount: 10000, since: 10 }, y: { amount: 20000, since: 5 } }, 10);
    expect(l.rows.map((r) => r.regularId)).toEqual(['x', 'y']);
    expect(l.rows.map((r) => r.amount)).toEqual([10000, 20000]);
  });

  it('kết hợp nhiều mức tuổi → các tổng riêng biệt đúng', () => {
    const l = debtLedger(
      {
        moi: { amount: 20000, since: 10 }, // age 5
        muon: { amount: 30000, since: 2 }, // age 13 → late, daysLeft 1 (chưa mất)
        sapmat: { amount: 40000, since: 1 }, // age 14 → writeOffTonight
      },
      15,
    );
    expect(l.rows.map((r) => r.regularId)).toEqual(['moi', 'muon', 'sapmat']);
    expect(l.lockedTotal).toBe(90000);
    // chỉ 'muon' + 'sapmat' là late
    expect(l.lateCount).toBe(2);
    expect(l.lateAmount).toBe(70000);
    // chỉ 'sapmat' mất tối nay
    expect(l.writeOffTonightAmount).toBe(40000);
    expect(l.rows.find((r) => r.regularId === 'moi')?.late).toBe(false);
    expect(l.rows.find((r) => r.regularId === 'moi')?.writeOffTonight).toBe(false);
  });
});
