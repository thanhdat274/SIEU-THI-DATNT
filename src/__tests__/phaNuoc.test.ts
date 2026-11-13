import { describe, expect, it } from 'vitest';
import { FESTIVALS } from '../data/calendar';
import { RECIPE_MAP } from '../data/recipes';
import { miniDefById, miniForFestival, miniTargetRecipe } from '../data/festivalMini';
import {
  PHA_INGREDIENTS, PHA_ROUNDS, phaLength, phaOrder, phaRoundScore, scorePhaNuoc,
} from '../data/phaNuoc';
import { miniSeed } from '../ui/minigames/seeded';

describe('Hệ 7 ⑥ — Pha nước theo đơn', () => {
  const seed = miniSeed(777, 200, 'pha_nuoc');

  it('đơn dài dần 3→4→5, tất định theo seed, chỉ gồm nguyên liệu hợp lệ, không lặp liên tiếp', () => {
    const ids = new Set(PHA_INGREDIENTS.map((i) => i.id));
    for (let r = 0; r < PHA_ROUNDS; r++) {
      const o = phaOrder(seed, r);
      expect(o).toHaveLength(phaLength(r));
      expect(o).toEqual(phaOrder(seed, r));
      for (let i = 0; i < o.length; i++) {
        expect(ids.has(o[i])).toBe(true);
        if (i > 0) expect(o[i]).not.toBe(o[i - 1]);
      }
    }
    expect(phaLength(0)).toBe(3);
    expect(phaLength(2)).toBe(5);
  });

  it('seed khác ngày cho đề khác (ít nhất một vòng khác)', () => {
    const other = miniSeed(777, 201, 'pha_nuoc');
    const diff = [0, 1, 2].some((r) => phaOrder(seed, r).join() !== phaOrder(other, r).join());
    expect(diff).toBe(true);
  });

  it('điểm vòng: tỉ lệ vị trí đúng; thiếu hoặc sai thứ tự không được điểm', () => {
    const o = ['da', 'vai', 'sua'];
    expect(phaRoundScore(o, ['da', 'vai', 'sua'])).toBe(1);
    expect(phaRoundScore(o, ['da', 'sua', 'vai'])).toBeCloseTo(1 / 3);
    expect(phaRoundScore(o, [])).toBe(0);
    expect(phaRoundScore([], ['da'])).toBe(0);
  });

  it('tổng điểm 0–100 và kẹp an toàn', () => {
    expect(scorePhaNuoc([1, 1, 1])).toBe(100);
    expect(scorePhaNuoc([1])).toBe(33);
    expect(scorePhaNuoc([])).toBe(0);
    expect(scorePhaNuoc([5, 5, 5])).toBe(100);
    expect(scorePhaNuoc([-1, -1, -1])).toBe(0);
  });

  it('nối đúng Mùa hè và công thức vải đá xay (thưởng 0–2 ly)', () => {
    const def = miniDefById('pha_nuoc')!;
    expect(FESTIVALS.some((f) => f.id === 'he')).toBe(true);
    expect(miniForFestival('he')?.id).toBe('pha_nuoc');
    const rid = miniTargetRecipe(def, 'he')!;
    expect(RECIPE_MAP[rid].name).toBe('Vải đá xay');
    expect(RECIPE_MAP[rid].unlock).toBeLessThanOrEqual(def.unlock);
    expect(def.reward(100, 'fast').bonusQty).toBe(2);
    expect(def.reward(0, 'fast').bonusQty).toBe(0);
  });
});
