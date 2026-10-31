import { describe, it, expect } from 'vitest';
import {
  recipeNetMargin,
  recipePerMinute,
  cookedRevenue,
  rawSaleValue,
  cookOrSellRaw,
  kitchenValue,
  stationRank,
  bestPerMinute,
  hasSellRawAdvice,
} from '../data/kitchenValue';
import { RECIPES } from '../data/recipes';

const byId = (id: string) => RECIPES.find((r) => r.id === id)!;

// ──────────────────────────────────────────────
// Giá trị số ĐÃ XÁC MINH từ dữ liệu thật (products.ts + catalog.ts + recipes.ts)
//   recipe_ca_phe_den (drink_counter, dur 5, unlock 34): caphe×1 + x_duong×1 → ca_phe_den_da×6
//     cookRev 89400 · rawVal 63000 · netM 42400 · perMin 8480 · verdict cook (Δ26400)
//   recipe_xoi_dua (rice_station, dur 12, unlock ?): nep ×1 + x_dua_cot_hop×1 + x_duong×1 + x_dua_nao×1 → xoi_dua×40
//     cookRev 56000 · rawVal 81000 · netM −3500 · perMin −291.67 · verdict sell_raw (Δ25000)
//   combo_nuoc_doi (drink_counter, dur 3): tra_sua×1 + ca_phe_sua_da×1 → combo_nuoc_doi×1
//     cookRev 37200 · rawVal 37300 · netM 17600 · perMin 5866.67 · verdict sell_raw (Δ100)
// ──────────────────────────────────────────────

describe('kitchenValue — lãi mỗi mẻ (khớp dòng "Lãi gộp" ở CookPanel)', () => {
  it('recipe_ca_phe_den lãi gộp đúng out×sell − Σ input×buy = 42.400', () => {
    const r = byId('recipe_ca_phe_den');
    expect(recipeNetMargin(r)).toBe(42400);
  });

  it('món lãi âm vẫn phản ánh đúng (xoi_dua lỗ −3.500)', () => {
    const r = byId('recipe_xoi_dua');
    expect(recipeNetMargin(r)).toBe(-3500);
  });
});

describe('kitchenValue — LÃI / PHÚT TRẠM (băng thông khi trạm hiếm)', () => {
  it('cà phê đen đá 5 phút → 8.480đ/phút', () => {
    const r = byId('recipe_ca_phe_den');
    expect(recipePerMinute(r)).toBeCloseTo(8480, 2);
  });

  it('mẻ nhanh lãi vừa THẮNG mẻ chậm lãi to trên CÙNG trạm — cốt lõi của trạm hiếm', () => {
    const den = byId('recipe_ca_phe_den'); // 5 phút, lãi 42.400
    const sua = byId('recipe_tra_sua');    // 8 phút, lãi 44.000 (lãi TO hơn!)
    // Lãi mỗi mẻ trà sữa > cà phê đen, NHƯNG lãi/phút ngược lại
    expect(recipeNetMargin(sua)).toBeGreaterThan(recipeNetMargin(den));
    expect(recipePerMinute(den)).toBeGreaterThan(recipePerMinute(sua));
  });
});

describe('kitchenValue — GIÁ TRỊ THẬT của nguyên liệu (nấu vs bán nguyên liệu rời)', () => {
  it('cookedRevenue = giá bán thành phẩm × số lượng (cà phê đen 89.400)', () => {
    const r = byId('recipe_ca_phe_den');
    expect(cookedRevenue(r)).toBe(89400);
  });

  it('rawSaleValue = Σ giá bán nguyên liệu rời (cà phê đen 63.000)', () => {
    const r = byId('recipe_ca_phe_den');
    expect(rawSaleValue(r)).toBe(63000);
  });

  it('nấu hời hơn bán nguyên liệu → verdict cook (cà phê đen, Δ26.400)', () => {
    const r = byId('recipe_ca_phe_den');
    expect(cookOrSellRaw(r)).toEqual({ verdict: 'cook', delta: 26400 });
  });

  it('bán nguyên liệu rời hời hơn nấu → verdict sell_raw (xôi dừa, Δ25.000)', () => {
    const r = byId('recipe_xoi_dua');
    expect(cookOrSellRaw(r)).toEqual({ verdict: 'sell_raw', delta: 25000 });
  });

  it('ca edge: combo 2 ly lãi mẻ dương nhưng bán nguyên liệu còn hơn 100đ → sell_raw', () => {
    const r = byId('combo_nuoc_doi');
    // Lãi mẻ VẪN dương — nhưng so với bán 2 ly nguyên liệu ra quầy thì kém 100đ
    expect(recipeNetMargin(r)).toBe(17600);
    expect(cookOrSellRaw(r)).toEqual({ verdict: 'sell_raw', delta: 100 });
  });
});

describe('kitchenValue — bó thông tin (kitchenValue)', () => {
  it('đóng gói đủ netMargin/perMinute/cooked/raw/verdict/delta cho 1 món', () => {
    const k = kitchenValue(byId('recipe_ca_phe_den'));
    expect(k.recipe.id).toBe('recipe_ca_phe_den');
    expect(k.netMargin).toBe(42400);
    expect(k.perMinute).toBeCloseTo(8480, 2);
    expect(k.cookedRevenue).toBe(89400);
    expect(k.rawSaleValue).toBe(63000);
    expect(k.verdict).toBe('cook');
    expect(k.delta).toBe(26400);
  });
});

describe('kitchenValue — xếp hạng trạm (stationRank)', () => {
  it('drink_counter sắp LÃI/PHÚT giảm dần: cà phê đen đá đứng đầu (unlock 34)', () => {
    const ranked = stationRank('drink_counter', { owned: 1, level: 99 });
    expect(ranked[0].recipe.id).toBe('recipe_ca_phe_den');
    // giảm dần
    for (let i = 1; i < ranked.length; i++) {
      expect(ranked[i - 1].perMinute).toBeGreaterThanOrEqual(ranked[i].perMinute);
    }
  });

  it('lọc theo cấp: level 33 chưa có cà phê đen đá (unlock 34) → đứng đầu khác', () => {
    const ranked = stationRank('drink_counter', { owned: 1, level: 33 });
    expect(ranked.some((k) => k.recipe.id === 'recipe_ca_phe_den')).toBe(false);
  });

  it('bestPerMinute trả món lãi/phút cao nhất, null khi chưa món hợp lệ', () => {
    expect(bestPerMinute('drink_counter', { owned: 1, level: 99 })!.recipe.id).toBe('recipe_ca_phe_den');
    expect(bestPerMinute('drink_counter', { owned: 1, level: 1 })).toBeNull();
  });

  it('sugarcane_press chỉ có 1 món (nước mía) → lãi/phút chính xác ~7.166,67', () => {
    const ranked = stationRank('sugarcane_press', { owned: 1, level: 99 });
    expect(ranked).toHaveLength(1);
    expect(ranked[0].recipe.id).toBe('recipe_nuoc_mia');
    expect(ranked[0].perMinute).toBeCloseTo(7166.67, 2);
  });
});

describe('kitchenValue — cảnh báo "bán nguyên liệu hời hơn nấu"', () => {
  it('drink_counter có món nên bán nguyên liệu rời (combo 2 ly)', () => {
    expect(hasSellRawAdvice('drink_counter', { owned: 1, level: 99 })).toBe(true);
  });

  it('sugarcane_press KHÔNG có (nước mía luôn nấu hời)', () => {
    expect(hasSellRawAdvice('sugarcane_press', { owned: 1, level: 99 })).toBe(false);
  });
});
