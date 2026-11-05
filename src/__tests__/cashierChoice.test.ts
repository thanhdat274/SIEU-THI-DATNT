import { describe, expect, it } from 'vitest';
import {
  cashierChangeChoice, cashierHaggleChoice,
  CASHIER_CHANGE_CANDY_BASE, CASHIER_CHANGE_CANDY_PER_STAR,
  CASHIER_HAGGLE_ACCEPT_BASE, CASHIER_HAGGLE_ACCEPT_PER_STAR,
  CASHIER_HAGGLE_COUNTER_BASE, CASHIER_HAGGLE_COUNTER_PER_STAR,
  haggleSettle,
} from '../data/counterDeals';

describe('cashierHaggleChoice', () => {
  it('thu ngân kém (1★) hay bớt luôn — roll đầu rơi vào nhánh accept', () => {
    const acceptP = CASHIER_HAGGLE_ACCEPT_BASE - CASHIER_HAGGLE_ACCEPT_PER_STAR;
    expect(cashierHaggleChoice(1, acceptP - 0.01)).toBe(0); // bớt luôn (mất tiền — thu ngân non tay)
    expect(cashierHaggleChoice(1, acceptP + 0.01)).toBe(1); // trả nửa
  });

  it('thu ngân giỏi (5★) gần như không bớt luôn, chủ yếu trả nửa', () => {
    const accept5 = Math.max(0.05, CASHIER_HAGGLE_ACCEPT_BASE - CASHIER_HAGGLE_ACCEPT_PER_STAR * 5);
    expect(cashierHaggleChoice(5, 0.04)).toBe(0); // chỉ dưới sàn 0.05 mới bớt luôn
    expect(cashierHaggleChoice(5, accept5 + 0.01)).toBe(1);
    const counter5 = CASHIER_HAGGLE_COUNTER_BASE + CASHIER_HAGGLE_COUNTER_PER_STAR * 5; // 0.8
    expect(cashierHaggleChoice(5, accept5 + counter5 + 0.01)).toBe(2); // giữ giá
  });

  it('cùng roll, tay nghề cao hơn thì không bao giờ "bớt luôn" nhiều hơn kém hơn — đúng hướng tay nghề', () => {
    const roll = 0.2;
    const choices = [1, 2, 3, 4, 5].map((s) => cashierHaggleChoice(s, roll));
    // roll 0.2: 1★ accept (0.35) → 0; 2★ accept 0.25 → 0; 3★ accept 0.15 → 1; 4★ 0.05 → 1; 5★ → 1
    expect(choices).toEqual([0, 0, 1, 1, 1]);
  });

  it('mọi kết quả hợp lệ trong tập {0,1,2} cho 1000 roll đều tay', () => {
    for (let i = 0; i < 1000; i++) {
      const roll = (i * 7919) % 1000 / 1000;
      const c = cashierHaggleChoice(3, roll);
      expect([0, 1, 2]).toContain(c);
    }
  });

  it('kết quả khớp settle: trả nửa vẫn đi qua haggleSettle (70% gật giá giữa)', () => {
    const settle = haggleSettle(cashierHaggleChoice(5, 0.5), 10000, 100000, 0.3);
    expect(settle.icon).toBe('💬'); // 0.3 < 0.7 → khách gật giá giữa
    expect(settle.discount).toBe(haggleSettle(1, 10000, 100000, 0.3).discount);
  });
});

describe('cashierChangeChoice', () => {
  it('1★ hay bớt luôn cho tròn (0.4 kẹo), 5★ luôn thối kẹo', () => {
    const candy1 = CASHIER_CHANGE_CANDY_BASE + CASHIER_CHANGE_CANDY_PER_STAR;
    expect(cashierChangeChoice(1, candy1 + 0.01)).toBe(0); // bớt luôn
    expect(cashierChangeChoice(5, 0.99)).toBe(1); // kẹo
    expect(cashierChangeChoice(1, 0.39)).toBe(1);
  });

  it('giữ tiền lẻ: cùng roll 0.5 — kém bớt luôn, giỏi thối kẹo', () => {
    expect(cashierChangeChoice(1, 0.5)).toBe(0);
    expect(cashierChangeChoice(5, 0.5)).toBe(1);
  });
});
