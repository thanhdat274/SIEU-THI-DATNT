import { describe, it, expect } from 'vitest';
import { applyChest, chestTier, CHEST_TIERS, CHEST_UNLOCK } from '../data/giftChest';

describe('GĐ1533 rương trọng số', () => {
  it('tỉ lệ cộng 100%, kỳ vọng > 1, mở trên golden', () => {
    expect(CHEST_TIERS.reduce((n, t) => n + t.pct, 0)).toBe(100);
    expect(CHEST_TIERS.reduce((n, t) => n + (t.pct * t.mul) / 100, 0)).toBeGreaterThan(1);
    expect(CHEST_UNLOCK).toBeGreaterThan(30);
  });
  it('phân bố theo ngày gần đúng tỉ lệ', () => {
    const cnt = new Map<string, number>();
    for (let d = 1; d <= 10000; d++) { const t = chestTier(d).name; cnt.set(t, (cnt.get(t) ?? 0) + 1); }
    for (const t of CHEST_TIERS) expect(Math.abs((cnt.get(t.name) ?? 0) / 100 - t.pct)).toBeLessThan(3);
  });
  it('chỉ áp ngày 7 và từ cấp 34; tất định', () => {
    const g = { icon: '🎁', label: 'Rương vàng', money: 100000 };
    expect(applyChest(g, 7, CHEST_UNLOCK - 1, 5)).toBe(g);
    expect(applyChest(g, 6, CHEST_UNLOCK, 5)).toBe(g);
    const a = applyChest(g, 14, CHEST_UNLOCK, 5);
    expect(a).toEqual(applyChest(g, 14, CHEST_UNLOCK, 5));
    expect(a.money).toBe(Math.round((100000 * chestTier(5).mul) / 1000) * 1000);
  });
});
