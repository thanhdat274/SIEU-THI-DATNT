import { describe, expect, it } from 'vitest';
import { FESTIVALS } from '../data/calendar';
import { RECIPE_MAP } from '../data/recipes';
import {
  FESTIVAL_MINIS, GIO_QUA_RECIPES, flairMiniReward, miniDefById, miniInFestival,
  miniTargetRecipe, miniUnlocked, noBonusReward, recipeMiniReward,
} from '../data/festivalMini';
import { miniRand, miniSeed } from '../ui/minigames/seeded';

/** Hệ 7 — Trò khéo tay dịp lễ (SPEC-CHIEU-RONG §7): bảng thưởng + khung dữ liệu thuần. */

const FESTIVAL_IDS = new Set(FESTIVALS.map((f) => f.id));

describe('bảng thưởng (pure)', () => {
  it('trò giỏ quà: điểm càng cao càng nhiều bonusQty, trần = 1, không quá 100', () => {
    const r = recipeMiniReward(1, 8);
    expect(r(0, 'fast').bonusQty).toBe(0);
    expect(r(50, 'fast').bonusQty).toBe(1);
    expect(r(100, 'fast').bonusQty).toBe(1);
    expect(r(999, 'fast').bonusQty).toBe(1); // kẹp
    expect(r(-5, 'fast').bonusQty).toBe(0);  // kẹp
    expect(r(100, 'fast').xp).toBe(8);
    expect(r(0, 'fast').xp).toBe(4);         // nửa xp
  });

  it('mức Thong thả lấy 2/3 thưởng (§7.3)', () => {
    const r = recipeMiniReward(3, 10);
    expect(r(100, 'calm').bonusQty).toBe(2); // round(3 * 2/3)
    expect(r(100, 'fast').bonusQty).toBe(3);
  });

  it('trò trang trí: +2 → +6 flair theo điểm, không phụ thuộc mode về số lượng', () => {
    const r = flairMiniReward(8);
    expect(r(0, 'fast').flair).toBe(2);
    expect(r(50, 'fast').flair).toBe(4);
    expect(r(100, 'fast').flair).toBe(6);
    expect(r(100, 'calm').flair).toBeGreaterThanOrEqual(2);
    expect(r(100, 'calm').flair).toBeLessThanOrEqual(6);
  });

  it('để thợ làm (noBonusReward) không có thưởng', () => {
    expect(noBonusReward(0, 'fast')).toEqual({ xp: 0 });
  });
});

describe('khung dữ liệu FESTIVAL_MINIS', () => {
  for (const def of FESTIVAL_MINIS) {
    it(`định nghĩa hợp lệ: ${def.id}`, () => {
      expect(def.reward(100, 'fast').xp).toBeGreaterThan(0);
      expect(def.seconds).toBeGreaterThanOrEqual(30);
      expect(def.seconds).toBeLessThanOrEqual(60);
      // Cấp mở ≥ 32 trừ trò giả (tap_test dành thử khung) — không đụng golden cấp 30 (R1).
      if (def.id !== 'tap_test') expect(def.unlock).toBeGreaterThanOrEqual(32);
      for (const f of def.festivals) expect(FESTIVAL_IDS).toContain(f);
      if (def.target.kind === 'recipe') {
        // recipeId của giỏ quà là nhóm 'gio_qua' (chọn công thức theo dịp ở GIO_QUA_RECIPES).
        expect(def.target.recipeId === 'gio_qua' || RECIPE_MAP[def.target.recipeId]).toBeTruthy();
      }
    });
  }

  it('7 trò thật đều có mặt, còn trò giả tách riêng cho lúc thử khung', () => {
    const ids = FESTIVAL_MINIS.filter((d) => d.id !== 'tap_test').map((d) => d.id).sort();
    expect(ids).toEqual(['banh_chung', 'banh_flan', 'den_ong_sao', 'gio_qua', 'mam_ngu_qua', 'pha_nuoc', 'xep_ket']);
  });
});

describe('nối với dịp lễ thật', () => {
  it('Xếp giỏ quà trỏ tới đúng công thức giỏ quà của từng dịp (L2)', () => {
    for (const [festival, recipeId] of Object.entries(GIO_QUA_RECIPES)) {
      expect(RECIPE_MAP[recipeId], `${festival} → ${recipeId}`).toBeTruthy();
      expect(recipeId).toMatch(/^recipe_gio_/);
    }
    // Gắn với 6 dịp đã có giỏ quà.
    expect(Object.keys(GIO_QUA_RECIPES).sort()).toEqual(['giang_sinh', 'nha_giao', 'quoc_te_phu_nu', 'tet', 'trung_thu', 'valentine']);
  });

  it('miniInFestival: trò Tết chỉ chơi được trong dịp Tết, không có dịp thì không', () => {
    const tet = miniDefById('banh_chung')!;
    expect(miniInFestival(tet, 'tet')).toBe(true);
    expect(miniInFestival(tet, 'trung_thu')).toBe(false);
    expect(miniInFestival(tet, undefined)).toBe(false);
  });

  it('trò giả không gắn dịp nên không mở qua miniInFestival (chỉ mở qua hash thử)', () => {
    expect(miniInFestival(miniDefById('tap_test')!, 'tet')).toBe(false);
  });

  it('miniTargetRecipe: giỏ quà chọn công thức theo dịp, còn bánh chưng cố định', () => {
    const gq = miniDefById('gio_qua')!;
    const bc = miniDefById('banh_chung')!;
    expect(miniTargetRecipe(gq, 'tet')).toBe('recipe_gio_tet');
    expect(miniTargetRecipe(bc, 'tet')).toBe('recipe_banh_chung_tu');
    expect(miniTargetRecipe(gq, undefined)).toBeUndefined();
  });

  it('miniUnlocked: mở từ cấp unlock, golden cấp 30 chưa thấy', () => {
    const tet = miniDefById('banh_chung')!;
    expect(miniUnlocked(tet, 30)).toBe(false);
    expect(miniUnlocked(tet, 32)).toBe(true);
  });
});

describe('seeded — tất định (R4)', () => {
  it('cùng (weatherSeed, day, miniId) → cùng seed, khác miniId → khác', () => {
    const a = miniSeed(123, 45, 'gio_qua');
    expect(a).toBe(miniSeed(123, 45, 'gio_qua'));
    expect(a).not.toBe(miniSeed(123, 45, 'banh_chung'));
    expect(a).not.toBe(miniSeed(124, 45, 'gio_qua'));
  });

  it('miniRand chuẩn hoá trong [0,1) và tất định', () => {
    const s = miniSeed(1, 2, 'tap_test');
    expect(miniRand(s, 3, 5)).toBe(miniRand(s, 3, 5));
    expect(miniRand(s, 3, 5)).toBeGreaterThanOrEqual(0);
    expect(miniRand(s, 3, 5)).toBeLessThan(1);
  });
});
