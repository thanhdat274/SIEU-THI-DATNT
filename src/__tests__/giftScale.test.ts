import { beforeEach, describe, expect, it, vi } from 'vitest';
import { newGameData, useGame } from '../core/store';
import {
  DAILY_GIFTS, WHEEL_PRIZES, giftMoneyScale, giftOfStreak, giftText, giftXpScale, scaledGift, scaledPrize,
} from '../data/gifts';

/** Quà điểm danh & vòng quay scale theo cấp & vé tha thứ chuỗi điểm danh. */

describe('hệ số scale theo cấp', () => {
  it('đơn điệu không giảm theo cấp', () => {
    for (let lv = 2; lv <= 100; lv++) {
      expect(giftMoneyScale(lv)).toBeGreaterThanOrEqual(giftMoneyScale(lv - 1));
      expect(giftXpScale(lv)).toBeGreaterThanOrEqual(giftXpScale(lv - 1));
    }
  });

  it('5 cấp đầu giữ nguyên hệ số 1, cấp 100 chạm trần ×5 tiền / ×12 XP', () => {
    for (let lv = 1; lv <= 5; lv++) {
      expect(giftMoneyScale(lv)).toBe(1);
      expect(giftXpScale(lv)).toBe(1);
    }
    expect(giftMoneyScale(100)).toBe(5);
    expect(giftXpScale(100)).toBe(12);
  });
});

describe('scaledGift / scaledPrize', () => {
  it('quà ngày 7 (100k) ở cấp 50 nhận đúng 370.000đ, XP làm tròn số nguyên', () => {
    const d7 = scaledGift(DAILY_GIFTS[6], 50);
    expect(d7.money).toBe(370000); // 100000 × (1 + 0.06×45) = 370000
    expect(d7.label).toBe('Rương vàng'); // label quà daily là tên gọi, giữ nguyên
    const d2 = scaledGift(DAILY_GIFTS[1], 50);
    expect(d2.xp).toBe(155); // 20 × (1 + 0.15×45) = 155
    expect(d2.money).toBeUndefined();
    expect(scaledGift(DAILY_GIFTS[0], 50).xp).toBeUndefined();
    expect(scaledGift(DAILY_GIFTS[0], 1).money).toBe(5000); // cấp thấp nguyên giá
  });

  it('giải vòng quay ghi đè label/short theo giá trị mới; ô 🍀 giữ nguyên', () => {
    const cup = scaledPrize(WHEEL_PRIZES[7], 50);
    expect(cup.money).toBe(444000); // 120000 × 3.7
    expect(cup.label).toBe('444.000đ');
    expect(cup.short).toBe('444k');
    const star = scaledPrize(WHEEL_PRIZES[1], 50);
    expect(star.xp).toBe(233); // 30 × 7.75 → làm tròn 233
    expect(star.label).toBe('233 XP');
    expect(star.short).toBe('233XP');
    // Bản sao: data gốc không bị đụng tới
    expect(WHEEL_PRIZES[7].label).toBe('120.000đ');
    expect(WHEEL_PRIZES[7].money).toBe(120000);
    const clover = scaledPrize(WHEEL_PRIZES[3], 50);
    expect(clover.label).toBe('Khách +20% hôm nay');
    expect(clover.short).toBe('Đông khách');
    expect(clover.money).toBeUndefined();
    expect(clover.boost).toBe(0.2);
  });

  it('giftText in đúng số tiền đã scale', () => {
    expect(giftText(scaledGift(DAILY_GIFTS[6], 50))).toBe('370.000đ');
  });
});

describe('claimGift', () => {
  beforeEach(() => {
    useGame.setState({ ...newGameData(), day: 5, level: 10, money: 100000 });
  });

  it('luồng thường: chuỗi nối tiếp ngày tăng, tiền đúng mức đã scale; nhận 2 lần cùng ngày trả false', () => {
    expect(useGame.getState().claimGift()).toBe(true);
    let s = useGame.getState();
    expect(s.giftStreak).toBe(1);
    expect(s.giftLastDay).toBe(5);
    expect(s.money).toBe(100000 + scaledGift(giftOfStreak(1), 10).money!); // 5000 × 1.3 → tròn nghìn
    expect(useGame.getState().claimGift()).toBe(false);
    expect(useGame.getState().giftStreak).toBe(1);
    // Sang ngày hôm sau thì nối tiếp chuỗi
    useGame.setState({ day: 6 });
    expect(useGame.getState().claimGift()).toBe(true);
    s = useGame.getState();
    expect(s.giftStreak).toBe(2);
    expect(s.giftLastDay).toBe(6);
  });

  it('tha thứ: bỏ quên đúng 1 ngày với chuỗi ≥3 thì giữ chuỗi, đánh dấu ngày dùng vé', () => {
    useGame.setState({ day: 10, giftStreak: 4, giftLastDay: 8, giftGraceDay: 0 });
    const before = useGame.getState().money;
    expect(useGame.getState().claimGift()).toBe(true);
    const s = useGame.getState();
    expect(s.giftStreak).toBe(5);
    expect(s.giftGraceDay).toBe(10);
    expect(s.money).toBe(before + scaledGift(giftOfStreak(5), 10).money!); // quà ngày 5 đã scale
  });

  it('tha thứ có hồi: vừa dùng vé thì lần bỏ quên kế tiếp (dưới 7 ngày) đứt chuỗi về 1', () => {
    useGame.setState({ day: 10, giftStreak: 4, giftLastDay: 8, giftGraceDay: 10 });
    useGame.getState().claimGift();
    expect(useGame.getState().giftStreak).toBe(1);
  });

  it('chuỗi dưới 3 ngày thì không có tha thứ', () => {
    useGame.setState({ day: 10, giftStreak: 2, giftLastDay: 8, giftGraceDay: 0 });
    useGame.getState().claimGift();
    expect(useGame.getState().giftStreak).toBe(1);
  });
});

describe('spinWheel', () => {
  it('mỗi ngày một lượt; giải tiền scale theo cấp và label tự ghi đè', () => {
    // Cố tình rơi vào ô cuối 🏆 120.000đ (tổng trọng số 100, roll 0.99 × 100 trôi qua 7 ô đầu)
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0.99);
    useGame.setState({ ...newGameData(), day: 3, level: 60, money: 100000 });
    const prize = useGame.getState().spinWheel();
    spy.mockRestore();
    expect(prize?.icon).toBe('🏆');
    expect(prize?.money).toBe(516000); // 120000 × (1 + 0.06×55) = 516000
    expect(prize?.label).toBe('516.000đ');
    expect(prize?.short).toBe('516k');
    const s = useGame.getState();
    expect(s.wheelLastDay).toBe(3);
    expect(s.money).toBe(100000 + 516000);
    expect(s.spinWheel()).toBeNull(); // hết lượt hôm nay
  });
});
