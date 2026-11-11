import { describe, expect, it } from 'vitest';
import {
  MAM_ALL, MAM_BAC, MAM_DECOY_COUNT, MAM_NAM, mamFruitById, pickMamDeck, scoreMamArrange,
  scoreMamChoice, scoreMamNguQua,
} from '../data/mamNguQua';
import { festivalFlairBonus } from '../data/festivalMini';
import { miniSeed } from '../ui/minigames/seeded';

/** Hệ 7-L4 — trò Bày mâm ngũ quả (SPEC-CHIEU-RONG §7.5): đề vùng Bắc/Nam + chọn đúng + xếp cân. */

describe('bộ quả của hai miền', () => {
  it('mỗi miền có đúng 5 loại và id phân biệt', () => {
    expect(MAM_BAC).toHaveLength(5);
    expect(MAM_NAM).toHaveLength(5);
    const ids = new Set(MAM_ALL.map((f) => f.id));
    expect(ids.size).toBe(MAM_ALL.length);
  });

  it('mọi id đều tra được', () => {
    for (const f of MAM_ALL) expect(mamFruitById(f.id)?.name).toBe(f.name);
  });
});

describe('pickMamDeck', () => {
  it('bày 8 loại (5 đúng + 3 mồi), không trùng, ổn định theo seed', () => {
    const seed = miniSeed(7, 40, 'mam_ngu_qua');
    const d1 = pickMamDeck(seed);
    const d2 = pickMamDeck(seed);
    expect(d1.shown).toHaveLength(8);
    expect(d1.shown.map((f) => f.id)).toEqual(d2.shown.map((f) => f.id));
    expect(new Set(d1.shown.map((f) => f.id)).size).toBe(8);
    expect(d1.correct).toHaveLength(5);
    // mồi = loại của vùng kia
    const other = d1.region === 'bac' ? MAM_NAM : MAM_BAC;
    const decoys = d1.shown.filter((f) => !d1.correct.includes(f.id));
    expect(decoys).toHaveLength(MAM_DECOY_COUNT);
    for (const dec of decoys) expect(other.some((o) => o.id === dec.id)).toBe(true);
  });

  it('đề khác nhau khi seed khác nhau', () => {
    const a = pickMamDeck(miniSeed(7, 40, 'mam_ngu_qua')).shown.map((f) => f.id);
    const b = pickMamDeck(miniSeed(9, 40, 'mam_ngu_qua')).shown.map((f) => f.id);
    expect(a.join()).not.toBe(b.join());
  });
});

describe('scoreMamChoice', () => {
  const correct = MAM_BAC.map((f) => f.id);
  it('chọn đúng cả 5 → 70/70 phần chọn', () => {
    expect(scoreMamChoice(MAM_BAC.map((f) => f.id), correct)).toBe(70);
  });
  it('thiếu một loại đúng → thấp hơn', () => {
    expect(scoreMamChoice(correct.slice(0, 4), correct)).toBeLessThan(70);
  });
  it('chọn nhầm quả vùng kia → bị trừ', () => {
    expect(scoreMamChoice([...correct.slice(0, 4), MAM_NAM[0].id], correct)).toBeLessThan(
      scoreMamChoice(correct, correct),
    );
  });
  it('kẹp không xuống âm', () => {
    expect(scoreMamChoice([], correct)).toBe(0);
  });
});

describe('scoreMamArrange', () => {
  it('quả to nằm hết ở hàng đế → 30/30 phần xếp', () => {
    const placements = [
      { fruitId: 'chuoi', base: true },
      { fruitId: 'buoi', base: true },
      { fruitId: 'dao', base: false },
    ];
    expect(scoreMamArrange(placements)).toBe(30);
  });
  it('quả to để lên hàng trên → mất phần xếp', () => {
    const placements = [
      { fruitId: 'chuoi', base: false },
      { fruitId: 'buoi', base: false },
    ];
    expect(scoreMamArrange(placements)).toBe(0);
  });
  it('chưa đặt quả to nào → 0', () => {
    expect(scoreMamArrange([{ fruitId: 'quyt', base: false }])).toBe(0);
  });
});

describe('scoreMamNguQua (tổng)', () => {
  it('chọn đúng + xếp cân tối đa → 100', () => {
    const correct = MAM_BAC.map((f) => f.id);
    const placements = [
      { fruitId: 'chuoi', base: true },
      { fruitId: 'buoi', base: true },
      { fruitId: 'dao', base: false },
      { fruitId: 'hong', base: false },
      { fruitId: 'quyt', base: false },
    ];
    expect(scoreMamNguQua(correct, correct, placements)).toBe(100);
  });
  it('kẹp 0–100', () => {
    expect(scoreMamNguQua([], MAM_NAM.map((f) => f.id), [])).toBe(0);
    expect(scoreMamNguQua(MAM_NAM.map((f) => f.id), MAM_NAM.map((f) => f.id), [
      { fruitId: 'mang_cau', base: true }, { fruitId: 'dua', base: true }, { fruitId: 'du_du', base: true },
      { fruitId: 'xoai', base: false }, { fruitId: 'sung', base: false },
    ])).toBe(100);
  });
});

describe('festivalFlairBonus (L4 — nối vào điểm trang trí)', () => {
  it('trống → 0 (không đụng nền kinh tế)', () => {
    expect(festivalFlairBonus({}, 30)).toBe(0);
    expect(festivalFlairBonus({ festivalFlair: undefined }, 30)).toBe(0);
  });
  it('cộng các dòng còn hiệu lực (day ≤ until)', () => {
    const biz = { festivalFlair: [
      { furniture: 'mam_ngu_qua', bonus: 6, until: 120 },
      { furniture: 'den_ong_sao', bonus: 4, until: 60 },
    ] };
    expect(festivalFlairBonus(biz, 50)).toBe(10);
    expect(festivalFlairBonus(biz, 120)).toBe(6); // ngày cuối mâm vẫn tính; đèn hết từ 60
    expect(festivalFlairBonus(biz, 121)).toBe(0); // hết cả hai
    expect(festivalFlairBonus(biz, 200)).toBe(0);
  });
});
