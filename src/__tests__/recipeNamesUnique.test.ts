import { describe, expect, it } from 'vitest';
import { QUAN_RECIPES as QR_1738 } from '../data/quanRecipes';
import { PRODUCTS as P_1738 } from '../data/products';
import { RECIPES } from '../data/recipes';
import { productById } from '../data/products';
import { QUAN_RECIPES } from '../data/quanRecipes';

// GĐ1699 — tên công thức bếp và tên món quán nước không trùng (cùng tinh thần GĐ1694–1698).
const dups = (names: string[]) => {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const n of names) { const k = n.trim().toLowerCase(); if (seen.has(k)) out.push(n); seen.add(k); }
  return out;
};

describe('GĐ1699 — tên công thức duy nhất', () => {
  it('công thức bếp: id và tên duy nhất', () => {
    expect(dups(RECIPES.map((r) => r.id))).toEqual([]);
    expect(dups(RECIPES.map((r) => r.name))).toEqual([]);
  });
  it('món quán nước: id và tên duy nhất', () => {
    expect(dups(QUAN_RECIPES.map((r) => r.id))).toEqual([]);
    expect(dups(QUAN_RECIPES.map((r) => r.name))).toEqual([]);
  });
  it('GĐ1700: tên công thức bếp trùng tên món nó nấu ra', () => {
    const bad = RECIPES.filter((r) => productById(r.outputId)?.name !== r.name).map((r) => r.id);
    expect(bad).toEqual([]);
  });
});

// GĐ1738: id đồ uống quán không trùng id hàng/món (gần trùng 'sinh_to_vai' ở GĐ1737).
describe('id quán ≠ id hàng (GĐ1738)', () => {
  const LEGACY = new Set(['nuoc_mia', 'bac_xiu']);
  it('chỉ còn các trùng cũ đã biết, không thêm mới; danh sách cũ không thừa', () => {
    const ids = new Set(P_1738.map((p) => p.id));
    const clash = QR_1738.filter((q) => ids.has(q.id)).map((q) => q.id);
    expect(clash.filter((id) => !LEGACY.has(id))).toEqual([]);
    expect([...LEGACY].filter((id) => !clash.includes(id))).toEqual([]);
  });
});
