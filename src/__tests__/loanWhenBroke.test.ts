import { beforeEach, describe, expect, it } from 'vitest';
import { newGameData, useGame } from '../core/store';
import { takeLoan } from '../core/biz';
import { loanTopUps, LOAN_OPTIONS_MIN } from '../data/biz';

/** GĐ846 — lối thoát khi quỹ âm: vẫn vay được (xoáy nợ GĐ845 là của bot, người thật không kẹt cứng). */
const g = () => useGame.getState();

beforeEach(() => useGame.setState({ ...newGameData(), level: 20, money: -5_000_000, day: 30, notify: () => {} }));

describe('vay khi hết tiền (GĐ846)', () => {
  it('quỹ âm, chưa nợ: vay được mức tối thiểu và quỹ tăng đúng bằng số vay', () => {
    takeLoan(LOAN_OPTIONS_MIN);
    expect(g().biz.loan?.principal).toBe(LOAN_OPTIONS_MIN);
    expect(g().money).toBe(-5_000_000 + LOAN_OPTIONS_MIN);
  });

  it('đang nợ: vay thêm theo mức cho phép vẫn cộng vào quỹ âm', () => {
    takeLoan(LOAN_OPTIONS_MIN);
    const top = loanTopUps(g().level, g().biz.loan!.principal)[0];
    if (top === undefined) return; // đã chạm trần vay ở cấp này — không còn lối vay thêm
    const m = g().money;
    takeLoan(top);
    expect(g().money).toBe(m + top);
  });
});

describe('vay gấp thêm khi quỹ vẫn âm, cấp thấp (GĐ852)', () => {
  beforeEach(() => useGame.setState({ level: 2, money: -3_000_000 }));

  it('vay gấp lần 2 gộp vào gốc khi quỹ còn âm, dừng ở trần 3 gói', () => {
    for (let i = 0; i < 6; i++) takeLoan(LOAN_OPTIONS_MIN, true);
    expect(g().biz.loan?.principal).toBe(3 * LOAN_OPTIONS_MIN);
    expect(g().money).toBe(-3_000_000 + 3 * LOAN_OPTIONS_MIN);
  });

  it('quỹ đã dương thì không vay gấp thêm', () => {
    takeLoan(LOAN_OPTIONS_MIN, true);
    useGame.setState({ money: 500_000 });
    takeLoan(LOAN_OPTIONS_MIN, true);
    expect(g().biz.loan?.principal).toBe(LOAN_OPTIONS_MIN);
  });
});
