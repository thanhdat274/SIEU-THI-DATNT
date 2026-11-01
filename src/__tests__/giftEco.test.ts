import { beforeEach, describe, expect, it } from 'vitest';
import { newGameData, useGame } from '../core/store';
import {
  DAILY_GIFTS, GIFT_ECO_CAP, GIFT_ECO_FLOOR, GIFT_ECO_STEP, giftEcoScale, giftOfStreak,
  giftMoneyScale, giftXpScale, recentAvgProfit, scaledGiftEco,
} from '../data/gifts';

/**
 * Bộ test GĐ-GIFT-ECO — "quà theo nền kinh tế": kỳ cựu có tiệm lớn thì quà điểm danh/vòng quay
 * vẫn đáng (không thành "tiền lẻ"), trong khi ván mới / tiệm bé giữ nguyên hành vi cũ.
 *
 * Hợp đồng:
 * - giftEcoScale(avgDailyProfit): 1 khi ≤ FLOOR hoặc không dương; cộng dần theo STEP, trần CAP.
 * - recentAvgProfit(history): lợi nhuận bình quân 7 ngày gần (chỉ tính ngày lãi).
 * - scaledGiftEco(g, level, avg): tiền = base × giftMoneyScale × giftEcoScale; XP chỉ theo cấp.
 * - claimGift (store): dùng scaledGiftEco với recentAvgProfit(s.history).
 */

describe('giftEcoScale — ranh giới và trần', () => {
  it('không dương / ≤ FLOOR trả 1 (giữ hành vi cũ)', () => {
    expect(giftEcoScale(0)).toBe(1);
    expect(giftEcoScale(-5000)).toBe(1);
    expect(giftEcoScale(GIFT_ECO_FLOOR)).toBe(1);
    expect(giftEcoScale(1_000_000)).toBe(1);
  });

  it('mỗi GIFT_ECO_STEP lãi thêm +1, không nhảy khí; đúng tại biên', () => {
    expect(giftEcoScale(GIFT_ECO_FLOOR + 1)).toBe(2);
    expect(giftEcoScale(GIFT_ECO_FLOOR + GIFT_ECO_STEP)).toBe(2);
    expect(giftEcoScale(GIFT_ECO_FLOOR + GIFT_ECO_STEP + 1)).toBe(3);
  });

  it('trần GIFT_ECO_CAP không vượt dù lãi cực lớn', () => {
    expect(giftEcoScale(1e12)).toBe(GIFT_ECO_CAP);
    expect(giftEcoScale(GIFT_ECO_FLOOR + GIFT_ECO_STEP * 100)).toBe(GIFT_ECO_CAP);
  });

  it('đơn điệu không giảm khi lãi tăng (quét dải)', () => {
    let prev = 1;
    for (let p = 0; p <= 50_000_000; p += 250_000) {
      const s = giftEcoScale(p);
      expect(s).toBeGreaterThanOrEqual(1);
      if (p > 0 && p <= GIFT_ECO_FLOOR) expect(s).toBe(1);
      expect(s).toBeGreaterThanOrEqual(prev);
      expect(s).toBeLessThanOrEqual(GIFT_ECO_CAP);
      prev = s;
    }
  });
});

describe('recentAvgProfit — bình quân 7 ngày gần', () => {
  it('rỗng → 0', () => expect(recentAvgProfit([])).toBe(0));

  it('chỉ lấy tối đa 7 ngày gần nhất', () => {
    const hist = Array.from({ length: 20 }, (_, i) => ({ profit: 1000 }));
    expect(recentAvgProfit(hist)).toBe(1000);
  });

  it('lọc bỏ ngày lỗ (profit ≤ 0)', () => {
    const hist = [{ profit: 5000 }, { profit: 5000 }, { profit: -9999 }, { profit: 0 }, { profit: 5000 }]; // 3 ngày lãi
    expect(recentAvgProfit(hist)).toBe(5000);
  });

  it('toàn âm → 0 (không lấy chia bình quân âm)', () => {
    expect(recentAvgProfit([{ profit: -5 }, { profit: -3 }])).toBe(0);
  });
});

describe('scaledGiftEco — tiền theo cấp + kinh tế, XP theo cấp', () => {
  it('không có nền kinh tế (avg 0) → giống scaledGift cũ', () => {
    const base = DAILY_GIFTS[6]; // rương vàng 100k
    const g = scaledGiftEco(base, 50, 0);
    expect(g.money).toBe(100000 * giftMoneyScale(50)); // ×5 = 500k, tròn nghìn
  });

  it('có nền kinh tế lớn → tiền cộng thêm hệ số eco, XP vẫn theo cấp', () => {
    const base = DAILY_GIFTS[6];
    const eco = giftEcoScale(30_000_000); // > FLOOR → >1
    expect(eco).toBeGreaterThan(1);
    const g = scaledGiftEco(base, 50, 30_000_000);
    expect(g.money).toBe(Math.round(100000 * giftMoneyScale(50) * eco / 1000) * 1000);
    // XP không đổi theo eco → như scaledGift
    const xpGift = scaledGiftEco(DAILY_GIFTS[1], 50, 50_000_000); // ngày 2 chỉ có xp
    expect(xpGift.money).toBeUndefined();
    expect(xpGift.xp).toBe(Math.round(20 * giftXpScale(50)));
  });

  it('số lẻ được làm tròn tới nghìn', () => {
    const g = scaledGiftEco(DAILY_GIFTS[0], 7, 5_000_000); // 5000 × scale(7) × eco
    expect(g.money! % 1000).toBe(0);
  });
});

describe('claimGift qua store áp nền kinh tế', () => {
  beforeEach(() => useGame.setState({ ...newGameData(), day: 5, level: 50, money: 100000 }));

  it('không có lịch sử → trần 5× thường (hành vi cũ)', () => {
    useGame.getState().claimGift();
    const s = useGame.getState();
    const expected = Math.round(5000 * giftMoneyScale(50) / 1000) * 1000; // 5000×3.7=18500 → 19000
    expect(s.money).toBe(100000 + expected);
  });

  it('hist có lãi lớn → quà cộng hệ số eco (ngày 7 rương lớn hơn)', () => {
    // Giả lập 7 ngày vừa rồi tiệm kiếm ~5 triệu/ngày
    const history = Array.from({ length: 7 }, () => ({ day: 0, revenue: 10_000_000, profit: 5_000_000, customers: 50, unhappy: 0 }));
    useGame.setState({ history: history as never, day: 5, money: 100000 });
    const eco = giftEcoScale(recentAvgProfit(history));
    expect(eco).toBeGreaterThan(1);
    useGame.getState().claimGift();
    const s = useGame.getState();
    expect(s.money).toBe(100000 + Math.round(5000 * giftMoneyScale(50) * eco / 1000) * 1000);
    expect(s.money).toBeGreaterThan(100000 + Math.round(5000 * giftMoneyScale(50)));
  });
});
