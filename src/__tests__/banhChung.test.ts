import { describe, expect, it } from 'vitest';
import {
  BANH_CHUNG_STEPS, BANH_INGREDIENTS, banhIngredientById, banhTray, isSquareBanh, pickBanhDecors,
  scoreBanhChung,
} from '../data/banhChung';
import { miniSeed } from '../ui/minigames/seeded';
import { FESTIVAL_MINIS } from '../data/festivalMini';

/** Hệ 7-L3 — trò Gói bánh chưng (SPEC §7.5): trình tự gói + khay nguyên liệu + tính điểm thuần. */

describe('BANH_CHUNG_STEPS', () => {
  it('có đúng trình tự gói truyền thống 8 bước', () => {
    expect(BANH_CHUNG_STEPS).toEqual([
      'la_dong', 'nep', 'dau_xanh', 'thit_ba_chi', 'dau_xanh', 'nep', 'gan_la', 'buoc_lat',
    ]);
  });

  it('mọi bước đều tra được tên nguyên liệu trong bể', () => {
    for (const step of BANH_CHUNG_STEPS) {
      expect(banhIngredientById(step)).toBeDefined();
    }
  });
});

describe('isSquareBanh', () => {
  it('chuỗi đúng trình tự → vuông vức', () => {
    expect(isSquareBanh(BANH_CHUNG_STEPS)).toBe(true);
  });

  it('xáo thứ tự (đủ bước) → không vuông', () => {
    expect(isSquareBanh(BANH_CHUNG_STEPS.slice().reverse())).toBe(false);
    expect(isSquareBanh([...BANH_CHUNG_STEPS.slice(1), 'la_dong'])).toBe(false);
  });

  it('thiếu bước → không vuông', () => {
    expect(isSquareBanh(BANH_CHUNG_STEPS.slice(0, 4))).toBe(false);
  });
});

describe('pickBanhDecors / banhTray', () => {
  it('rút đúng số mồi, không trùng, tất định theo seed', () => {
    const seed = miniSeed(7, 32, 'banh_chung');
    const a = pickBanhDecors(seed, 0);
    const b = pickBanhDecors(seed, 0);
    expect(a.length).toBe(2);
    expect(new Set(a.map((x) => x.id)).size).toBe(2);
    expect(a.map((x) => x.id)).toEqual(b.map((x) => x.id));
    expect(pickBanhDecors(miniSeed(8, 32, 'banh_chung'), 0).map((x) => x.id)).not.toEqual(
      a.map((x) => x.id),
    );
  });

  it('khay gồm 6 loại chuẩn + mồi, và mồi không trùng loại chuẩn', () => {
    const tray = banhTray(miniSeed(7, 32, 'banh_chung'), 0);
    expect(tray.length).toBe(BANH_INGREDIENTS.length + 2);
    const baseIds = new Set(BANH_INGREDIENTS.map((x) => x.id));
    const decor = tray.filter((x) => !baseIds.has(x.id));
    expect(decor.length).toBe(2);
  });
});

describe('scoreBanhChung', () => {
  it('nằm trong 0–100 và nhiều bánh vuông hơn được điểm cao hơn', () => {
    expect(scoreBanhChung(0, 4)).toBe(0);
    expect(scoreBanhChung(4, 4)).toBe(100);
    expect(scoreBanhChung(2, 4)).toBe(50);
    expect(scoreBanhChung(3, 4)).toBeGreaterThan(scoreBanhChung(2, 4));
    expect(scoreBanhChung(2, 0)).toBe(0); // an toàn khi total = 0
  });
});

describe('nối với festivalMini', () => {
  it('Gói bánh chưng là trò thật gắn dịp Tết với thưởng 0–3 cái', () => {
    const def = FESTIVAL_MINIS.find((m) => m.id === 'banh_chung')!;
    expect(def.festivals).toContain('tet');
    const r = def.reward(100, 'fast');
    expect(r.bonusQty).toBe(3); // mẻ thường ra 10 → thêm tối đa 3
    const calm = def.reward(100, 'calm');
    expect(calm.bonusQty).toBe(2); // mức Thong thả lấy 2/3
    expect(def.target.kind === 'recipe' && def.target.recipeId === 'recipe_banh_chung_tu').toBe(true);
  });
});
