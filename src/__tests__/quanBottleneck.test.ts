import { describe, expect, it } from 'vitest';
import { recipeBottleneck, recipeCapacity } from '../data/quanRecipes';
import { quanNuocRestockTip, type QuanNuocHealth } from '../data/quanNuocInsights';
import { quanRecipeById } from '../data/quanRecipes';

describe('GĐ1112 — nút thắt nguyên liệu trong tip nạp kho quán nước', () => {
  const r = quanRecipeById('tra_vai')!; // vải 4 ly/1, trà 40, đường 30, đá 10

  it('recipeBottleneck chỉ đúng nguyên liệu khan nhất (kho × cups nhỏ nhất)', () => {
    // vải 1 (4 ly), trà 1 (40), đường 1 (30), đá 0 (0 ly) → đá là nút thắt 0 ly
    const bn = recipeBottleneck(r, { x_vai: 1, tra: 1, x_duong: 1, x_nuoc_da: 0 });
    expect(bn.id).toBe('x_nuoc_da');
    expect(bn.glasses).toBe(0);
    expect(bn.name).toBe('Nước đá');
    // đủ trà/đường/đá nhưng vải chỉ 1 (4 ly) → vải là nút thắt
    const bn2 = recipeBottleneck(r, { x_vai: 1, tra: 9, x_duong: 9, x_nuoc_da: 9 });
    expect(bn2.id).toBe('x_vai');
    expect(recipeCapacity(r, { x_vai: 1, tra: 9, x_duong: 9, x_nuoc_da: 9 })).toBe(4);
  });

  it('quanNuocRestockTip gắn bottleneck vào tip danger (món nghẽn nhất trên menu)', () => {
    const h = { tonight: { wanted: 60 }, drinkUnitsNow: 10, missedRevenue: 50000, driesMain: false } as QuanNuocHealth;
    const q = { open: true, staff: 0, price: 'vua' as const, menu: ['tra_vai'] };
    const tip = quanNuocRestockTip(q, 45, { x_vai: 1, tra: 9, x_duong: 9, x_nuoc_da: 9 }, { served: 10, wanted: 60 });
    expect(tip).not.toBeNull();
    expect(tip!.verdict).toBe('danger');
    expect(tip!.bottleneck).toContain('Vải');
    expect(tip!.bottleneck).toContain('Trà vải');
    expect(tip!.bottleneck!.length).toBeLessThanOrEqual(90);
  });

  it('ngày sạch (không shortfall) → tip null, không có bottleneck lơ lửng', () => {
    const q = { open: true, staff: 0, price: 'vua' as const, menu: ['tra_vai'] };
    const tip = quanNuocRestockTip(q, 45, { x_vai: 50, tra: 9, x_duong: 9, x_nuoc_da: 9 }, null);
    expect(tip).toBeNull();
  });
});
