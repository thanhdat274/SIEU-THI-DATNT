import { describe, expect, it } from 'vitest';
import { RECIPES } from '../data/recipes';
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
});
