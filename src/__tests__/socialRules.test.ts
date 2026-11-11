import { describe, expect, it } from 'vitest';
import {
  allBands, bandForLevel, FLOWER_DECOR_BONUS, FLOWER_DECOR_DAYS, FLOWER_MAX_ACTIVE,
  GIFT_MAX_DAY, GIFT_PER_FRIEND_DAY, LEVEL_MAX, MARKET_MAX_LOTS_WEEK, MARKET_MAX_QTY,
  MARKET_MAX_RATIO, MARKET_MIN_RATIO, MAX_FRIENDS, newFriendCode, normalizeCard,
  progressionSuspicious, MAX_LEVEL_GAIN_PER_DAY, sanitizeOwnerName, sanitizeShopName,
  scorePoints, seasonKey, WEEK_CAPS, weekKey,
} from '../../server/socialRules';

// SPEC-CHIEU-RONG §6 — logic thuần của Hệ 6 online không đồng bộ.

describe('mã kết bạn', () => {
  it('6 ký tự, chỉ dùng bộ chữ không dễ nhầm', () => {
    const R = () => 0.1;
    const c = newFriendCode(R);
    expect(c).toMatch(/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/);
    expect(newFriendCode()).toHaveLength(6);
  });
  it('trần bạn bè là 30', () => {
    expect(MAX_FRIENDS).toBe(30);
  });
});

describe('lọc tên tiệm / tên chủ', () => {
  it('cắt khoảng trắng dư + giới hạn độ dài', () => {
    expect(sanitizeShopName('  Tiệm   Bà   Tám  ')).toBe('Tiệm Bà Tám');
    expect(sanitizeShopName('x'.repeat(100)).length).toBeLessThanOrEqual(40);
  });
  it('gạch từ bẩn → tên an toàn', () => {
    expect(sanitizeShopName('Tiệm dit nhau')).toBe('Tiệm tạp hóa');
    expect(sanitizeShopName('')).toBe('');
    expect(sanitizeOwnerName('loz')).toBe('Chủ tiệm');
    expect(sanitizeOwnerName('Minh')).toBe('Minh');
  });
});

describe('chuẩn hoá danh thiếp', () => {
  it('kẹp mọi trường về trần, không từ chối', () => {
    const card = normalizeCard({
      shopName: '  ' , ownerName: 'X', level: 999999, shopTier: 99, day: -5,
      titles: ['a', 'b', 'c', 'd'], topDishes: [{ id: 'x', stars: 9 }, { id: 'y', stars: 0 }],
      layout: [{ type: 'shelf', x: 1, z: 2, rot: 3 }],
    });
    expect(card).not.toBeNull();
    expect(card!.level).toBe(LEVEL_MAX);
    expect(card!.shopName).toBe('Tiệm tạp hóa');
    expect(card!.titles).toHaveLength(3);
    expect(card!.topDishes[0]!.stars).toBe(5);
  });
  it('null nếu không có tên tiệm lẫn chủ', () => {
    expect(normalizeCard({})).toBeNull();
  });
  it('chặn layout khổng lồ', () => {
    const layout = Array.from({ length: 1000 }, (_, i) => ({ type: 'x', x: i, z: 0, rot: 0 }));
    const card = normalizeCard({ shopName: 'A', ownerName: 'B', layout });
    expect(card!.layout.length).toBeLessThanOrEqual(240);
  });
});

describe('khoá tuần thật / dải cấp', () => {
  it('tuần tính từ thứ Hai', () => {
    expect(weekKey(new Date('2026-11-11T10:00:00Z'))).toBe('2026-11-09'); // T4 11/11 → T2 09/11
    expect(weekKey(new Date('2026-11-09T00:01:00Z'))).toBe('2026-11-09');
  });
  it('mùa gộp 13 tuần', () => {
    expect(seasonKey(new Date('2026-11-11T10:00:00Z'))).toBe('2026-Q3'); // tuần 44 → quý thứ 4 (Q3)
  });
  it('dải cấp 5 bậc', () => {
    expect(bandForLevel(1)).toBe('1-29');
    expect(bandForLevel(29)).toBe('1-29');
    expect(bandForLevel(30)).toBe('30-59');
    expect(bandForLevel(59)).toBe('30-59');
    expect(bandForLevel(60)).toBe('60-99');
    expect(bandForLevel(100)).toBe('100-149');
    expect(bandForLevel(150)).toBe('150-200');
    expect(allBands).toHaveLength(5);
  });
});

describe('điểm tuần — chỉ số có trần tự nhiên', () => {
  it('tổng tối đa 100, kẹp mỗi phần', () => {
    const r = scorePoints({ challenge: 999, clean: 5, satisfaction: 20, life: 10, fair: 10 });
    expect(r.total).toBe(WEEK_CAPS.challenge + 5 + 20 + 10 + 10);
    expect(r.total).toBeLessThanOrEqual(100);
    expect(scorePoints({}).total).toBe(0);
    expect(Object.values(WEEK_CAPS).reduce((a, b) => a + b, 0)).toBe(100);
  });
});

describe('kiểm tốc độ tiến (chống gian lận nhẹ)', () => {
  it('day đi lùi → nghi', () => {
    expect(progressionSuspicious({ day: 50, level: 10, at: 100 }, { day: 40, level: 11, at: 200 }))
      .toMatchObject({ suspicious: true, key: 'day-back' });
  });
  it('cấp tăng quá nhanh → nghi', () => {
    expect(progressionSuspicious({ day: 1, level: 1, at: 0 }, { day: 10, level: 999, at: 1000 }))
      .toMatchObject({ suspicious: true, key: 'too-fast' });
  });
  it('không nghi khi tăng bình thường', () => {
    expect(progressionSuspicious(null, { day: 10, level: 5, at: 100 })).toMatchObject({ suspicious: false });
    expect(progressionSuspicious({ day: 1, level: 1, at: 0 }, { day: 5, level: 4, at: 2 * 86400_000 })).toMatchObject({ suspicious: false });
  });
  it('trần cấp/ngày hợp lệ', () => {
    expect(MAX_LEVEL_GAIN_PER_DAY).toBeGreaterThanOrEqual(1);
  });
});

describe('hằng số trần §6.3/6.4', () => {
  it('lẵng hoa + chợ liên hẻm', () => {
    expect(GIFT_PER_FRIEND_DAY).toBe(1);
    expect(GIFT_MAX_DAY).toBe(3);
    expect(FLOWER_DECOR_BONUS).toBe(5);
    expect(FLOWER_DECOR_DAYS).toBe(3);
    expect(FLOWER_MAX_ACTIVE).toBe(5);
    expect(MARKET_MAX_LOTS_WEEK).toBe(3);
    expect(MARKET_MAX_QTY).toBe(24);
    expect(MARKET_MIN_RATIO).toBeGreaterThan(0);
    expect(MARKET_MAX_RATIO).toBeLessThan(1);
  });
});
