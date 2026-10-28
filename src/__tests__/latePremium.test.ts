import { describe, it, expect } from 'vitest';
import { PRODUCTS, unlockedProducts } from '../data/products';
import { TITLES } from '../data/titles';
import { ACHIEVEMENTS } from '../data/biz';
import { unlocksAt } from '../data/levels';

describe('nội dung cuối run (cấp 79–100): hàng cao cấp + mốc danh hiệu/thành tựu', () => {
  const PREMIUM = [82, 86, 91, 96, 100];

  it('có lớp sản phẩm cuối run ở đúng các cấp mở khóa dự kiến', () => {
    expect(unlockedProducts(81).find((p) => p.unlock >= 82)).toBeUndefined();
    for (const lv of PREMIUM) {
      expect(PRODUCTS.filter((p) => p.unlock === lv).length).toBeGreaterThan(0);
    }
    // Cấp cao nhất chạm đúng đỉnh run
    expect(Math.max(...PRODUCTS.map((p) => p.unlock))).toBe(100);
  });

  it('lấp khoảng trống mở khóa giữa 79 và 100 (không còn hố trắng dài)', () => {
    const unlocks = PRODUCTS.map((p) => p.unlock)
      .filter((u) => u >= 80 && u <= 100)
      .sort((a, b) => a - b);
    // Mỗi mốc premium cách nhau ≤ 5 cấp → luôn có hàng mới để chờ
    for (let i = 1; i < unlocks.length; i++) {
      expect(unlocks[i] - unlocks[i - 1]).toBeLessThanOrEqual(5);
    }
  });

  it('biên lợi nhuận hàng cao cấp hợp lý (bán/nhập ~1.35–1.42)', () => {
    for (const p of PRODUCTS.filter((p) => PREMIUM.includes(p.unlock))) {
      const margin = p.sell / p.buy;
      expect(margin).toBeGreaterThanOrEqual(1.35);
      expect(margin).toBeLessThanOrEqual(1.42);
    }
  });

  it('unlocksAt báo đúng hàng mở khóa ở từng cấp (LevelsPanel tự hiện)', () => {
    expect(unlocksAt(82).some((u) => u.includes('Mật ong rừng'))).toBe(true);
    expect(unlocksAt(100).some((u) => u.includes('Rượu đế 100 năm'))).toBe(true);
  });

  it('các id sản phẩm mới không trùng lặp', () => {
    const ids = PRODUCTS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('có danh hiệu mốc cấp 90, mở đúng lúc và tên không trùng', () => {
    const cap90 = TITLES.find((t) => t.id === 'cap_90')!;
    expect(cap90).toBeTruthy();
    expect(cap90.done({ level: 89 } as never)).toBe(false);
    expect(cap90.done({ level: 90 } as never)).toBe(true);
    expect(TITLES.map((t) => t.id)).toHaveLength(new Set(TITLES.map((t) => t.id)).size);
  });

  it('có thành tựu cấp 90 và 100, thưởng dương và theo thứ tự tăng dần', () => {
    const a90 = ACHIEVEMENTS.find((a) => a.id === 'level_90')!;
    const a100 = ACHIEVEMENTS.find((a) => a.id === 'level_100')!;
    expect(a90).toBeTruthy();
    expect(a100).toBeTruthy();
    expect(a90.reward).toBeGreaterThan(0);
    expect(a100.reward).toBeGreaterThan(a90.reward);
    expect(a90.done({ level: 89 } as never)).toBe(false);
    expect(a100.done({ level: 99 } as never)).toBe(false);
    expect(a90.done({ level: 90 } as never)).toBe(true);
    expect(a100.done({ level: 100 } as never)).toBe(true);
  });
});
