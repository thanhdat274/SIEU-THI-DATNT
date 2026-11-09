import { describe, expect, it } from 'vitest';
import { chooseSubstitute, SUBSTITUTE_CHANCE, SUBSTITUTE_PRICE_TOLERANCE } from '../data/substitute';
import { productById } from '../data/products';

/** GĐ1829 — OpenSpec khach-thay-mon-het-hang: helper thay món trên cùng kệ (thuần, tất định). */

const priceOf = (id: string) => productById(id).sell;

const shelf = (rows: Array<[string, number]> | undefined) =>
  rows === undefined ? undefined : { tiers: rows.map(([id, count]) => ({ productId: id, count })) };

// Lớp giả rng: dãy giá trị biết trước để chặn cổng xác suất một cách tất định
const seqRng = (values: number[]) => {
  let i = 0;
  return () => values[i++ % values.length];
};

describe('chooseSubstitute — thay món trên cùng kệ (GĐ1829)', () => {
  it('dung sai giá: mì 5k nhận nước 6k (≤ 1,5×), nhưng từ chối bánh 8k và đậu xanh 22k', () => {
    const limit = priceOf('mi') * SUBSTITUTE_PRICE_TOLERANCE;
    expect(priceOf('nuoc')).toBeLessThanOrEqual(limit);
    expect(priceOf('banh')).toBeGreaterThan(limit);
    expect(chooseSubstitute('mi', shelf([['banh', 3], ['nuoc', 2]]), priceOf, new Set(), seqRng([0.1]))).toBe('nuoc');
    expect(chooseSubstitute('mi', shelf([['dau_xanh', 2]]), priceOf, new Set(), seqRng([0.1]))).toBeNull();
  });

  it('ưu tiên cùng phân loại: muốn banh (dry 8k) → snack (dry 12k, trong dung sai) thắng nước (drink)', () => {
    expect(productById('snack').category).toBe('dry');
    expect(priceOf('snack')).toBeLessThanOrEqual(priceOf('banh') * SUBSTITUTE_PRICE_TOLERANCE);
    expect(chooseSubstitute('banh', shelf([['nuoc', 2], ['snack', 2]]), priceOf, new Set(['nuoc']), seqRng([0.1]))).toBe('snack');
  });

  it('kệ trống, không kệ, hoặc kệ chỉ có chính món muốn → null', () => {
    expect(chooseSubstitute('mi', shelf([]), priceOf, new Set(), seqRng([0.1]))).toBeNull();
    expect(chooseSubstitute('mi', undefined, priceOf, new Set(), seqRng([0.1]))).toBeNull();
    expect(chooseSubstitute('mi', shelf([['mi', 0]]), priceOf, new Set(), seqRng([0.1]))).toBeNull();
  });

  it('cổng xác suất: rng() >= SUBSTITUTE_CHANCE thì không thay', () => {
    expect(chooseSubstitute('mi', shelf([['nuoc', 2]]), priceOf, new Set(), seqRng([SUBSTITUTE_CHANCE]))).toBeNull();
    expect(chooseSubstitute('mi', shelf([['nuoc', 2]]), priceOf, new Set(), seqRng([SUBSTITUTE_CHANCE - 0.01]))).toBe('nuoc');
  });

  it('tất định: cùng seed cho cùng kết quả', () => {
    const run = () => chooseSubstitute('mi', shelf([['nuoc', 2], ['banh', 1]]), priceOf, new Set(['banh']), seqRng([0.2, 0.5]));
    expect(run()).toBe(run());
  });
});
