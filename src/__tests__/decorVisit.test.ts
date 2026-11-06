import { describe, expect, it } from 'vitest';
import { DECOR_VISIT_DIVISOR, decorScoreOf, decorVisitBoost } from '../data/layout';
import { furnitureDef } from '../data/furniture';
import type { Furniture } from '../core/store';

const mk = (type: string, extra: Record<string, unknown> = {}): Furniture =>
  ({ uid: 1, type, x: 0, z: 0, rot: 0, tiers: [], ...extra } as unknown as Furniture);

describe('decorVisit — điểm trang trí × sao (GĐ1495, bỏ trần 25%)', () => {
  it('decorScoreOf cộng dồn điểm decor của mọi đồ, bỏ đồ hỏng và đang dùng thử', () => {
    expect(decorScoreOf([mk('plant'), mk('plant'), mk('wall')])).toBe(6 * 2 + 2);
    expect(decorScoreOf([mk('plant', { broken: true }), mk('plant', { trial: true }), mk('wall')])).toBe(2);
    expect(decorScoreOf([mk('shelf'), mk('fridge')])).toBe(0);
  });

  it('chậu cây +6 điểm, vách +2 điểm đọc từ FurnitureDef', () => {
    expect(furnitureDef('plant').decor).toBe(6);
    expect(furnitureDef('wall').decor).toBe(2);
  });

  it('decorVisitBoost: 5★ thì đủ sức, 3★ còn 60%, 1★ còn 20% — không trần', () => {
    expect(decorVisitBoost(0, 5)).toBe(0);
    expect(decorVisitBoost(DECOR_VISIT_DIVISOR, 5)).toBe(1);
    expect(decorVisitBoost(DECOR_VISIT_DIVISOR, 3)).toBeCloseTo(0.6);
    expect(decorVisitBoost(DECOR_VISIT_DIVISOR, 1)).toBeCloseTo(0.2);
    // Không còn trần cứng +25%: tiệm trang trí nhiều vẫn tăng tiếp
    expect(decorVisitBoost(80, 5)).toBe(0.8);
    expect(decorVisitBoost(80, 5)).toBeGreaterThan(0.25);
  });

  it('quán xấu sao thì trang trí gần như vô dụng (đúng cơ chế "đẹp chỉ phát huy khi phục vụ tốt")', () => {
    expect(decorVisitBoost(40, 1)).toBeCloseTo(0.08);
    expect(decorVisitBoost(40, 5)).toBeCloseTo(0.4);
  });
});
