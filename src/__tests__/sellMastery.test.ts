import { describe, it, expect } from 'vitest';
import { sellMasteryTier, masteryUps } from '../data/sellMastery';

describe('GĐ1553 — thông thạo món bán', () => {
  it('bậc theo 200/1000/4000', () => {
    expect(sellMasteryTier(199)).toBe(0);
    expect(sellMasteryTier(200)).toBe(1);
    expect(sellMasteryTier(1000)).toBe(2);
    expect(sellMasteryTier(4000)).toBe(3);
  });
  it('chỉ báo món vừa vượt ngưỡng', () => {
    expect(masteryUps({ mi: 199, nuoc: 50 }, { mi: 201, nuoc: 51 })).toEqual([['mi', 1]]);
    expect(masteryUps({ mi: 201 }, { mi: 202 })).toEqual([]);
  });
});

describe('GĐ1554 — huy hiệu thông thạo ở kệ', () => {
  it('chỉ hiện từ cấp 36 khi đã có bậc', async () => {
    const { masteryBadge } = await import('../data/sellMastery');
    expect(masteryBadge(36, 1000)).toBe(' · 🥈');
    expect(masteryBadge(35, 1000)).toBe('');
    expect(masteryBadge(40, 10)).toBe('');
  });
});
