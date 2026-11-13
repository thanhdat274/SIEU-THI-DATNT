import { describe, expect, it } from 'vitest';
import { RECIPE_MAP } from '../data/recipes';
import { FESTIVALS } from '../data/calendar';
import { miniDefById, miniForFestival, miniTargetRecipe } from '../data/festivalMini';
import {
  FLAN_MOLDS, FLAN_ZONE_HALF, FLAN_TICKS_PER_SWEEP, flanGaugePos, flanMoldScore, flanZoneCenter, scoreFlanKhuon,
} from '../data/flanKhuon';
import { miniSeed } from '../ui/minigames/seeded';

describe('Hệ 7 ⑤ — Rót khuôn bánh flan', () => {
  it('vạch rót chạy tam giác 0→1→0 và lặp lại', () => {
    expect(flanGaugePos(0)).toBe(0);
    expect(flanGaugePos(FLAN_TICKS_PER_SWEEP)).toBe(1);
    expect(flanGaugePos(FLAN_TICKS_PER_SWEEP * 2)).toBe(0);
    expect(flanGaugePos(FLAN_TICKS_PER_SWEEP / 2)).toBeCloseTo(0.5);
    for (let t = 0; t < 200; t++) {
      const p = flanGaugePos(t);
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThanOrEqual(1);
    }
  });

  it('vùng xanh tất định theo seed và luôn trong [0.2, 0.8]', () => {
    const seed = miniSeed(12345, 340, 'banh_flan');
    for (let i = 0; i < FLAN_MOLDS; i++) {
      const c = flanZoneCenter(seed, i);
      expect(c).toBe(flanZoneCenter(seed, i));
      expect(c).toBeGreaterThanOrEqual(0.2);
      expect(c).toBeLessThanOrEqual(0.8);
    }
  });

  it('điểm khuôn: trong vùng = 1, lệch dần giảm, lệch xa = 0', () => {
    expect(flanMoldScore(0.5, 0.5)).toBe(1);
    expect(flanMoldScore(0.5 + FLAN_ZONE_HALF, 0.5)).toBe(1);
    expect(flanMoldScore(0.5 + FLAN_ZONE_HALF * 1.5, 0.5)).toBeCloseTo(0.5);
    expect(flanMoldScore(0.5 + FLAN_ZONE_HALF * 2, 0.5)).toBe(0);
    expect(flanMoldScore(0, 0.8)).toBe(0);
  });

  it('tổng điểm 0–100: đủ khuôn đúng = 100, thiếu khuôn tính 0, kẹp an toàn', () => {
    expect(scoreFlanKhuon(Array(FLAN_MOLDS).fill(1))).toBe(100);
    expect(scoreFlanKhuon(Array(FLAN_MOLDS / 2).fill(1))).toBe(50);
    expect(scoreFlanKhuon([])).toBe(0);
    expect(scoreFlanKhuon(Array(FLAN_MOLDS).fill(9))).toBe(100);
    expect(scoreFlanKhuon(Array(FLAN_MOLDS).fill(-3))).toBe(0);
  });

  it('nối đúng Hội thi làm bánh và công thức bánh flan (thưởng 0–3 cái)', () => {
    const def = miniDefById('banh_flan')!;
    expect(FESTIVALS.some((f) => f.id === 'hoi_banh')).toBe(true);
    expect(miniForFestival('hoi_banh')?.id).toBe('banh_flan');
    const rid = miniTargetRecipe(def, 'hoi_banh')!;
    expect(RECIPE_MAP[rid].name).toBe('Bánh flan');
    expect(RECIPE_MAP[rid].unlock).toBeLessThanOrEqual(def.unlock);
    expect(def.reward(100, 'fast').bonusQty).toBe(3);
    expect(def.reward(0, 'fast').bonusQty).toBe(0);
  });
});
