import { describe, expect, it } from 'vitest';
import { RECIPES } from '../data/recipes';
import { PRODUCTS, productById } from '../data/products';
import { tiemXoiIds } from '../data/tiemXoi';

describe('GĐ1087 — Xôi mít (liên hệ nông trại → tiệm xôi)', () => {
  it('Xôi mít là món xôi có trong PRODUCTS, giá bán > giá nhập, mở cấp 36', () => {
    expect(PRODUCTS.filter((p) => p.id === 'xoi_mit')).toHaveLength(1);
    expect(productById('xoi_mit').sell).toBeGreaterThan(productById('xoi_mit').buy);
    expect(productById('xoi_mit').unlock).toBe(36);
    expect(productById('xoi_mit').category).toBe('fresh');
    expect(new Set(PRODUCTS.map((p) => p.id)).size).toBe(PRODUCTS.length);
  });

  it('có công thức Xôi mít ở quây xôi, dùng mít nông trại (x_mit) làm nguyên liệu', () => {
    const r = RECIPES.find((x) => x.id === 'recipe_xoi_mit')!;
    expect(r).toBeDefined();
    expect(r.station).toBe('rice_station');
    expect(r.outputId).toBe('xoi_mit');
    expect(r.outputQty).toBeGreaterThan(0);
    expect(r.inputs.some((i) => i.productId === 'x_mit')).toBe(true);
    expect(r.inputs.some((i) => i.productId === 'nep')).toBe(true);
  });

  it('Xôi mít vào thực đơn quây xôi từ cấp 36 (tiemXoiIds)', () => {
    expect(tiemXoiIds(35).includes('xoi_mit')).toBe(false);
    expect(tiemXoiIds(36).includes('xoi_mit')).toBe(true);
  });
});
