import { describe, expect, it } from 'vitest';
import { debtDayAction, debtUnremindedAction } from '../data/debtLedger';
import { DEBT_LATE_DAYS } from '../data/credit';

/** GĐ749 — nợ quá hạn mà chưa nhắc lên Sổ đầu ngày (việc nhẹ, nhường việc đỏ "sắp mất"). */
const day = 30;
const lateSince = day - DEBT_LATE_DAYS; // age = DEBT_LATE_DAYS → late

describe('debtUnremindedAction', () => {
  it('không nợ / chưa quá hạn / đã nhắc → null', () => {
    expect(debtUnremindedAction(undefined, day)).toBeNull();
    expect(debtUnremindedAction({ a: { amount: 50_000, since: lateSince + 1 } }, day)).toBeNull();
    expect(debtUnremindedAction({ a: { amount: 50_000, since: lateSince, reminded: true } }, day)).toBeNull();
  });
  it('quá hạn chưa nhắc → việc cam priority 2, cộng tiền, đếm người, routes regulars', () => {
    const a = debtUnremindedAction({ a: { amount: 50_000, since: lateSince }, b: { amount: 70_000, since: lateSince - 1 } }, day);
    expect(a).toMatchObject({ panel: 'regulars', danger: false, priority: 2 });
    expect(a!.text).toContain('2 người');
  });
  it('debtDayAction: sắp mất (đỏ) thắng; không sắp mất thì rơi về việc nhẹ', () => {
    const soon = { a: { amount: 50_000, since: day - 12 } }; // còn 2 ngày
    expect(debtDayAction(soon, day)).toMatchObject({ danger: true, priority: 1 });
    expect(debtDayAction({ a: { amount: 50_000, since: lateSince } }, day)).toMatchObject({ danger: false, priority: 2 });
  });
});
