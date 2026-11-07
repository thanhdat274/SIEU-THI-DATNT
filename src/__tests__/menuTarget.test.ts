import { describe, it, expect } from 'vitest';
import { menuTarget, menuTipMul, MENU_RULE_UNLOCK } from '../data/dineIn';

describe('GĐ1536 thực đơn tối thiểu theo cấp', () => {
  it('mục tiêu 3 → 12 món', () => {
    expect(menuTarget(31)).toBe(3);
    expect(menuTarget(37)).toBe(4);
    expect(menuTarget(100)).toBe(12);
  });
  it('tip ×1,2 khi đủ, ×0,8 khi dưới nửa, golden không đổi', () => {
    expect(MENU_RULE_UNLOCK).toBeGreaterThan(30);
    expect(menuTipMul(30, 0)).toBe(1);
    expect(menuTipMul(60, menuTarget(60))).toBe(1.2);
    expect(menuTipMul(60, 1)).toBe(0.8);
    expect(menuTipMul(60, Math.ceil(menuTarget(60) / 2))).toBe(1);
  });
});
