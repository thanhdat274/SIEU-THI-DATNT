import { describe, expect, it } from 'vitest';
import { PRODUCTS } from '../data/products';
import { guideActiveOn, guideInCart, guideIdsOf, guideProducts, guideReady } from '../data/onboarding';

/**
 * Bộ test GĐ38 — Mua đơn đầu tiên (Guided First Purchase): hàm thuần data/onboarding đỡ cho lớp
 * hướng dẫn ngày đầu trên OrderPanel — 3 món thiết yếu cấp thấp từ PRODUCTS, theo dõi giỏ,
 * và điều kiện bật (chỉ người mới thật: ngày 1, chưa ẩn hướng dẫn, chưa đặt đơn & chưa bán).
 */

const idSet = new Set(PRODUCTS.map((p) => p.id));

describe('guideProducts — 3 món thiết yếu cấp thấp', () => {
  it('cấp 1 trả đúng 3 món đầu tiên trong PRODUCTS (mi, nuoc, banh)', () => {
    const g = guideProducts(1);
    expect(g).toHaveLength(3);
    expect(g.map((p) => p.id)).toEqual(['mi', 'nuoc', 'banh']);
  });

  it('luôn trả đúng 3 món duy nhất (không trùng id) và đều mở khóa ở cấp hiện tại', () => {
    for (const level of [1, 2, 5, 20, 60, 100]) {
      const g = guideProducts(level);
      expect(g).toHaveLength(3);
      expect(new Set(g.map((p) => p.id)).size).toBe(3);
      for (const p of g) expect(p.unlock).toBeLessThanOrEqual(level);
    }
  });

  it('mọi món trả về đều là id thật tồn tại trong PRODUCTS', () => {
    for (const level of [1, 3, 10, 50]) {
      for (const p of guideProducts(level)) expect(idSet.has(p.id)).toBe(true);
    }
  });

  it('sắp xếp theo cấp mở khóa tăng dần (thiết yếu nhất lên đầu)', () => {
    for (const level of [1, 5, 30]) {
      const g = guideProducts(level);
      for (let i = 1; i < g.length; i++) expect(g[i - 1].unlock).toBeLessThanOrEqual(g[i].unlock);
    }
  });
});

describe('guideIdsOf', () => {
  it('trích danh sách id từ các món hướng dẫn', () => {
    expect(guideIdsOf(guideProducts(1))).toEqual(['mi', 'nuoc', 'banh']);
  });
});

describe('guideInCart / guideReady — theo dõi giỏ', () => {
  const ids = ['mi', 'nuoc', 'banh'];

  it('giỏ trống: không món nào được đánh dấu, chưa sẵn sàng đặt hàng', () => {
    expect(guideInCart(ids, {})).toEqual([]);
    expect(guideReady(ids, {})).toBe(false);
  });

  it('món có số thùng > 0 trong giỏ thì được đánh dấu ✓', () => {
    expect(guideInCart(ids, { mi: 1 })).toEqual(['mi']);
    expect(guideInCart(ids, { mi: 1, nuoc: 0, banh: 2 })).toEqual(['mi', 'banh']);
  });

  it('sẵn sàng khi có ít nhất 1 trong các món hướng dẫn nằm trong giỏ', () => {
    expect(guideReady(ids, { mi: 1 })).toBe(true);
    expect(guideReady(ids, { nuoc: 3 })).toBe(true);
  });

  it('món có qty = 0 không tính là có trong giỏ', () => {
    expect(guideInCart(ids, { mi: 0 })).toEqual([]);
    expect(guideReady(ids, { mi: 0 })).toBe(false);
  });
});

describe('guideActiveOn — chỉ bật với người mới thật', () => {
  it('người mới: ngày 1, chưa ẩn hướng dẫn, chưa đặt đơn & chưa bán → bật', () => {
    expect(guideActiveOn(1, false, [], 0)).toBe(true);
  });

  it('sang ngày 2 trở đi → tắt', () => {
    expect(guideActiveOn(2, false, [], 0)).toBe(false);
    expect(guideActiveOn(7, false, [], 0)).toBe(false);
  });

  it('đã ẩn hướng dẫn (tutorialOff) → tắt', () => {
    expect(guideActiveOn(1, true, [], 0)).toBe(false);
  });

  it('đã đặt đơn (deliveries có đơn chờ) → tắt', () => {
    expect(guideActiveOn(1, false, [{ items: { mi: 10 } }], 0)).toBe(false);
  });

  it('đã bán được hàng (itemsSold > 0) → tắt', () => {
    expect(guideActiveOn(1, false, [], 5)).toBe(false);
  });
});
