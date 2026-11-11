import { describe, it, expect } from 'vitest';
import { splitLockedRecipes } from '../data/cookList';
import { RECIPES } from '../data/recipes';

describe('GĐ1433 — Sổ nấu gộp món khóa xa', () => {
  const rs = [{ id: 'a', unlock: 40 }, { id: 'b', unlock: 5 }, { id: 'c', unlock: 60 }, { id: 'd', unlock: 50 }];
  it('giữ món đã mở (theo cấp) + đúng 1 món khóa gần nhất', () => {
    const s = splitLockedRecipes(rs, 10);
    expect(s.visible.map((r) => r.id)).toEqual(['b', 'a']);
    expect(s.hiddenCount).toBe(2);
    expect(s.nextHiddenUnlock).toBe(50);
  });
  it('mở hết → không ẩn gì', () => {
    const s = splitLockedRecipes(rs, 100);
    expect(s.visible.length).toBe(4);
    expect(s.hiddenCount).toBe(0);
  });
  it('dữ liệu thật: cấp 1 trạm chảo chiên chỉ hiện ≤ số món đã mở + 1', () => {
    const fry = RECIPES.filter((r) => r.station === 'fryer');
    const s = splitLockedRecipes(fry, 1);
    expect(s.visible.length).toBe(fry.filter((r) => r.unlock <= 1).length + 1);
    expect(s.visible.length + s.hiddenCount).toBe(fry.length);
  });
});

describe('GĐ1434 — nhịp mở món: không dồn quá nhiều công thức vào một cấp', () => {
  it('mỗi cấp mở tối đa 13 công thức (trừ các đợt bếp chuyên đề đã ghi nhận: cấp 36 bếp cũ, 198–199 mở rộng quán nhậu/miền biển)', () => {
    const per = new Map<number, number>();
    for (const r of RECIPES) per.set(r.unlock, (per.get(r.unlock) ?? 0) + 1);
    per.delete(36); // bếp cũ
    per.delete(40); // cụm Quầy xôi + Tiệm xôi (GĐ2320: 9 món xôi + combo dồn về cấp 40)
    per.delete(198);
    per.delete(199);
    expect(Math.max(...per.values())).toBeLessThanOrEqual(13);
  });
});
