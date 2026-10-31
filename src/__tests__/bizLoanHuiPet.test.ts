import { beforeEach, describe, expect, it } from 'vitest';
import { newGameData, useGame } from '../core/store';
import { buyPet, feedPet, joinHui, repayLoan, takeLoan } from '../core/biz';
import { HUI_OPTIONS, HUI_UNLOCK, LOAN_DAYS, LOAN_OPTIONS_MIN, LOAN_UNLOCK, loanOptions, PETS, petDef } from '../data/biz';
import { productById } from '../data/products';

/**
 * biz.ts — vay vốn / hụi / thú cưng: những chỗ tiền vào-ra két theo cấp và điều kiện.
 * Khoá: vay chỉ đúng gói theo cấp, vay gấp chỉ gói nhỏ nhất khi chưa mở vay, trả nợ không vượt tiền có/dư nợ,
 * hụi chỉ vào một vòng và chỉ từ cấp mở, thú nuôi trừ tiền một lần và cho ăn mỗi ngày một bữa.
 */

const g = () => useGame.getState();
const loan = () => g().biz.loan;

beforeEach(() => {
  useGame.setState({ ...newGameData(), money: 5_000_000, level: 30, day: 10 });
  useGame.setState({ biz: { ...g().biz, loan: null, hui: null, pets: {} } });
});

describe('vay vốn', () => {
  it('vay đúng gói theo cấp: tiền vào két, ghi gốc và hạn LOAN_DAYS ngày', () => {
    const amt = loanOptions(30)[0];
    const m0 = g().money;
    takeLoan(amt);
    expect(g().money).toBe(m0 + amt);
    expect(loan()).toMatchObject({ principal: amt, takenDay: 10, dueDay: 10 + LOAN_DAYS, interestPaid: 0 });
  });

  it('số vay không nằm trong các gói: bị từ chối, không đổi gì', () => {
    const m0 = g().money;
    takeLoan(loanOptions(30)[0] + 1);
    expect(loan()).toBeNull();
    expect(g().money).toBe(m0);
  });

  it('chưa tới cấp mở vay: vay thường bị chặn; vay gấp chỉ cho gói nhỏ nhất', () => {
    useGame.setState({ level: LOAN_UNLOCK - 1 });
    const m0 = g().money;
    takeLoan(LOAN_OPTIONS_MIN * 5);
    takeLoan(LOAN_OPTIONS_MIN * 5, true);
    expect(loan()).toBeNull();
    takeLoan(LOAN_OPTIONS_MIN);
    expect(loan()).toBeNull();
    takeLoan(LOAN_OPTIONS_MIN, true);
    expect(loan()?.principal).toBe(LOAN_OPTIONS_MIN);
    expect(g().money).toBe(m0 + LOAN_OPTIONS_MIN);
  });

  it('trả bớt: trừ tiền, giảm gốc; trả hết thì xoá khoản vay; không trả quá dư nợ', () => {
    const amt = loanOptions(30)[0];
    takeLoan(amt);
    const m0 = g().money;
    repayLoan(1000);
    expect(g().money).toBe(m0 - 1000);
    expect(loan()?.principal).toBe(amt - 1000);
    repayLoan(amt * 10);
    expect(loan()).toBeNull();
    expect(g().money).toBe(m0 - (amt));
  });

  it('trả nợ khi két không đủ: chỉ trả được số tiền đang có', () => {
    const amt = loanOptions(30)[0];
    takeLoan(amt);
    useGame.setState({ money: 400 });
    repayLoan();
    expect(g().money).toBe(0);
    expect(loan()?.principal).toBe(amt - 400);
  });

  it('không có nợ hoặc két 0: trả nợ không làm gì', () => {
    repayLoan(1000);
    expect(g().money).toBe(5_000_000);
    takeLoan(loanOptions(30)[0]);
    useGame.setState({ money: 0 });
    const p = loan()!.principal;
    repayLoan();
    expect(loan()?.principal).toBe(p);
  });
});

describe('hụi', () => {
  it('vào hụi: ghi vòng, hốt vào ngày trong khoảng (ngày+2 … hết vòng), chưa hốt', () => {
    joinHui(0);
    const h = g().biz.hui!;
    expect(h).toMatchObject({ daily: HUI_OPTIONS[0].daily, members: HUI_OPTIONS[0].members, startDay: 10, received: false, paidDays: 0 });
    expect(h.turnDay).toBeGreaterThanOrEqual(12);
    expect(h.turnDay).toBeLessThanOrEqual(10 + HUI_OPTIONS[0].members);
  });

  it('đang trong một vòng hụi thì không vào vòng thứ hai', () => {
    joinHui(0);
    const first = g().biz.hui;
    joinHui(1);
    expect(g().biz.hui).toBe(first);
  });

  it('chưa tới cấp mở hụi hoặc chọn gói không có: không vào', () => {
    useGame.setState({ level: HUI_UNLOCK - 1 });
    joinHui(0);
    expect(g().biz.hui).toBeNull();
    useGame.setState({ level: 30 });
    joinHui(99);
    expect(g().biz.hui).toBeNull();
  });
});

describe('thú cưng', () => {
  const kind = () => PETS[0].kind;
  const def = () => petDef(kind());

  it('mua thú: trừ giá một lần, ghi fedDay; mua lại cùng loại không trừ thêm', () => {
    const s0 = g().stats.spent;
    buyPet(kind());
    // sổ chi: đúng giá một lần (két có thể cộng thêm thưởng thành tựu "nuôi thú")
    expect(g().stats.spent).toBe(s0 + def().price);
    expect(g().biz.pets[kind()]).toEqual({ fedDay: 10 });
    const m1 = g().money;
    buyPet(kind());
    expect(g().money).toBe(m1);
    expect(g().stats.spent).toBe(s0 + def().price);
  });

  it('không đủ cấp hoặc tiền: không mua', () => {
    useGame.setState({ money: def().price - 1 });
    buyPet(kind());
    expect(g().biz.pets[kind()]).toBeUndefined();
    useGame.setState({ money: 5_000_000, level: def().unlock - 1 });
    buyPet(kind());
    expect(g().biz.pets[kind()]).toBeUndefined();
  });

  it('cho ăn: dùng 1 gói trong kho; đã ăn hôm nay thì không ăn nữa', () => {
    buyPet(kind());
    useGame.setState({ day: 11, storage: { [def().food]: 3 } });
    feedPet(kind());
    expect(g().storage[def().food]).toBe(2);
    expect(g().biz.pets[kind()]!.fedDay).toBe(11);
    feedPet(kind());
    expect(g().storage[def().food]).toBe(2);
  });

  it('kho hết thức ăn: mua lẻ giá gấp đôi', () => {
    buyPet(kind());
    useGame.setState({ day: 11, storage: {} });
    const m0 = g().money;
    feedPet(kind());
    expect(g().money).toBe(m0 - productById(def().food).buy * 2);
    expect(g().biz.pets[kind()]!.fedDay).toBe(11);
  });
});
