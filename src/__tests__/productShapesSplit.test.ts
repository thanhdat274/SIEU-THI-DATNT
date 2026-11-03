import { describe, expect, it } from 'vitest';
import { shapeOf } from '../render/productShapes';
import { PRODUCTS } from '../data/products';

describe('GĐ996 — render/productShapes tách khỏi render/productModels', () => {
  it('mọi món đều có kiểu dáng', () => {
    for (const p of PRODUCTS) expect(typeof shapeOf(p)).toBe('string');
  });
});
