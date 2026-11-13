import { describe, expect, it } from 'vitest';
import { RECIPE_MAP } from '../data/recipes';
import { miniDefById, miniForFestival, miniTargetRecipe } from '../data/festivalMini';
import { KET_COUNT, KET_KINDS, ketSequence, scoreXepKet } from '../data/xepKetBia';
import { miniSeed } from '../ui/minigames/seeded';

describe('Hệ 7 ⑦ — Xếp két lên xe đẩy', () => {
  const seed = miniSeed(5, 100, 'xep_ket');
  it('dãy két tất định, đủ KET_COUNT, loại hợp lệ', () => {
    const s = ketSequence(seed);
    expect(s).toHaveLength(KET_COUNT);
    expect(s).toEqual(ketSequence(seed));
    const ids = KET_KINDS.map((k) => k.id);
    for (const k of s) expect(ids).toContain(k);
    expect(new Set(s).size).toBeGreaterThan(1);
  });
  it('điểm 0–100, kẹp', () => {
    expect(scoreXepKet(KET_COUNT)).toBe(100);
    expect(scoreXepKet(0)).toBe(0);
    expect(scoreXepKet(KET_COUNT / 2)).toBe(50);
    expect(scoreXepKet(99)).toBe(100);
    expect(scoreXepKet(-3)).toBe(0);
  });
  it('nối giải bóng đá phường và cá viên chiên nước mắm', () => {
    const def = miniDefById('xep_ket')!;
    expect(miniForFestival('bong_da_phuong')?.id).toBe('xep_ket');
    const rid = miniTargetRecipe(def, 'bong_da_phuong')!;
    expect(RECIPE_MAP[rid].name).toBe('Cá viên chiên nước mắm');
    expect(RECIPE_MAP[rid].unlock).toBeLessThanOrEqual(def.unlock);
    expect(def.reward(100, 'fast').bonusQty).toBe(2);
  });
});
