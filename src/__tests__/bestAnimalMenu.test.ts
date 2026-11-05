import { describe, expect, it } from 'vitest';
import { bestAnimal, animalPerDay } from '../data/farmValue';
import { bestAnimalForMenu, brewGrossPerUnit } from '../data/farmQuanValue';
import { newGarden } from '../data/garden';

describe('GĐ1105 — "Hôm nay đáng" cho vật nuôi: sữa cho món pha được định giá đúng', () => {
  const g = {
    ...newGarden(),
    pens: {
      ...newGarden().pens,
      cow: { count: 2, fedDay: 1, feedKg: 0, pending: 0 },
      goat: { count: 1, fedDay: 1, feedKg: 0, pending: 0 },
    },
  };

  it('brewGrossPerUnit: sữa tươi cho Bạc xỉu (6 ly/1 lốc) lời hơn bán lẻ khi món trên menu', () => {
    const brew = brewGrossPerUnit('sua_tuoi', 45, ['bac_xiu', 'ca_cao_sua']);
    expect(brew).not.toBeNull();
    // Bạc xỉu 6 ly × 25k − cà phê/sữa đặc/đá theo tỷ lệ ≈ 130k > bán lẻ ~45.6k
    expect(brew!.perUnit).toBeGreaterThan(45_600);
    expect(brewGrossPerUnit('sua_tuoi', 45, undefined)).toBeNull();
    expect(brewGrossPerUnit('sua_tuoi', 32, ['bac_xiu'])).toBeNull(); // Bạc xỉu mở 33
  });

  it('bestAnimalForMenu có menu sữa → bò định giá theo pha (lời hơn), kèm drinkName; không menu → y hệt bestAnimal', () => {
    const withMenu = bestAnimalForMenu(g, 45, ['bac_xiu']);
    expect(withMenu!.kind).toBe('cow');
    expect(withMenu!.drinkName).toBe('Bạc xỉu');
    const plain = bestAnimal(g);
    const noMenu = bestAnimalForMenu(g, 45, undefined);
    expect(noMenu!.kind).toBe(plain!.kind);
    expect(noMenu!.perDay).toBeCloseTo(plain!.perDay, 6);
    expect(noMenu!.drinkName).toBeUndefined();
    // giá trị pha đúng: animalPerDay bò với override = perDay có menu
    const brew = brewGrossPerUnit('sua_tuoi', 45, ['bac_xiu'])!;
    const forced = animalPerDay('cow', g, { valuePerUnit: brew.perUnit });
    expect(withMenu!.perDay).toBeCloseTo(forced.perDay, 6);
  });

  it('menu chỉ có món không dùng sữa (tra_vai) → bò/dê giá trị bán lẻ, không drinkName', () => {
    const r = bestAnimalForMenu(g, 45, ['tra_vai']);
    const plain = bestAnimal(g)!;
    expect(r!.drinkName).toBeUndefined();
    expect(r!.kind).toBe(plain.kind);
  });
});
