import { describe, it, expect } from 'vitest';
import { PRODUCTS } from '../data/products';
import { SHOP_TIERS } from '../data/shopTiers';
import { WAREHOUSE_TIERS } from '../data/warehouse';
import { STORY_STEPS } from '../data/quests';
import { maxStaff, unlockedRoles } from '../data/staff';

describe('nội dung cuối game (cấp 51–100)', () => {
  it('sản phẩm mở khóa vượt quá cấp 60 và lấp các khoảng trống 53, 56–59', () => {
    const maxUnlock = Math.max(...PRODUCTS.map((p) => p.unlock));
    expect(maxUnlock).toBeGreaterThanOrEqual(78);
    for (const lv of [53, 56, 57, 58, 59, 61, 70, 75, 78]) {
      expect(productsUnlockAt(lv).length).toBeGreaterThan(0);
    }
  });

  it('bậc tiệm mở rộng hai lần nữa sau 45 (không đụng nhà: width ≤ 24)', () => {
    const tiers = SHOP_TIERS.slice(5); // bậc 6, 7
    expect(tiers.length).toBeGreaterThanOrEqual(2);
    expect(tiers[tiers.length - 1].unlock).toBeGreaterThanOrEqual(75);
    expect(tiers[tiers.length - 1].width).toBeLessThanOrEqual(24);
    // Các bậc phải tăng dần về diện tích + giá
    expect(tiers[0].width).toBeLessThan(tiers[tiers.length - 1].width);
    expect(tiers[0].price).toBeLessThan(tiers[tiers.length - 1].price);
  });

  it('nhà kho có bậc 7 mở khóa ở cấp 90', () => {
    expect(WAREHOUSE_TIERS[WAREHOUSE_TIERS.length - 1].unlock).toBe(90);
  });

  it('cốt truyện kéo dài tới cấp 100', () => {
    expect(STORY_STEPS.some((s) => s.id === 'story_level_100')).toBe(true);
    expect(STORY_STEPS.some((s) => s.id === 'story_shop_tier_7')).toBe(true);
  });

  it('trần nhân viên cuối game đủ cho đại siêu thị', () => {
    expect(maxStaff(90)).toBeGreaterThan(20);
    // Vai trò không bị mở khóa thêm (tránh placeholder) — vẫn dừng ở 35
    expect(unlockedRoles(100).length).toBe(unlockedRoles(35).length);
  });
});

function productsUnlockAt(lv: number) {
  return PRODUCTS.filter((p) => p.unlock === lv);
}
