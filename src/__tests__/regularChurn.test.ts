import { describe, it, expect } from 'vitest';
import { regularChurn, regularChurnLine } from '../data/regularChurn';
import { REGULARS } from '../data/regulars';
import type { Review } from '../data/reviews';

/** Bà Năm (ba_nam) ưa ['sua','nuoc','caphe','trung']; Bé Na (be_na) ưa ['banh','snack','kem','suachua']. */
const baNamId = REGULARS.find((r) => r.id === 'ba_nam')!.id;
const beNaId = REGULARS.find((r) => r.id === 'be_na')!.id;

/**
 * GĐ1285 — "khách quen nào sắp bị phụ / bỏ mình?": quy missLog + reviews về đúng favorites của
 * từng NGƯỜI khách quen → khách vàng bị phụ. Helper THUẦN ĐỌC — không import store (co-op an toàn),
 * không đổi kinh tế/save/seed.
 */
describe('GĐ1285 — regularChurn (khách quen nào đang bị phụ)', () => {
  it('missLog trên món ưa của khách quen → đánh dấu đúng người đó', () => {
    const hurt = regularChurn({ missLog: { 'stock:nuoc': 3 } });
    const ba = hurt.find((h) => h.regular.id === baNamId);
    expect(ba).toBeDefined();
    expect(ba!.hitFavorites).toContainEqual({ productId: 'nuoc', count: 3 });
    expect(ba!.hurts).toBe(3);
  });

  it('lời chê nhắc món ưa của khách quen → được tính (cộng vào hurts)', () => {
    const reviews: Review[] = [
      { id: 1, day: 10, minute: 600, stars: 1, author: 'A', text: 't', reason: 'price', productId: 'trung' },
    ];
    const hurt = regularChurn({ reviews });
    const ba = hurt.find((h) => h.regular.id === baNamId);
    expect(ba).toBeDefined();
    expect(ba!.hitFavorites).toContainEqual({ productId: 'trung', count: 1 });
    expect(ba!.hurts).toBe(1);
  });

  it('khách quen không bị phụ món ưa nào → không xuất hiện (không ồn)', () => {
    // Bé Na không ưa 'nuoc' → đánh dấu Bà Năm nhưng không phải Bé Na
    const hurt = regularChurn({ missLog: { 'stock:nuoc': 2 } });
    expect(hurt.some((h) => h.regular.id === beNaId)).toBe(false);
    expect(hurt.some((h) => h.regular.id === baNamId)).toBe(true);
  });

  it('tín hiệu trên món LẠ (không ai ưa trong favorites) → danh sách rỗng', () => {
    expect(regularChurn({ missLog: { 'stock:gia_mong_co': 5 } })).toEqual([]);
    expect(regularChurn({})).toEqual([]);
  });

  it('xếp giảm dần theo tổng mức hụt', () => {
    const hurt = regularChurn({
      missLog: { 'stock:nuoc': 2, 'stock:banh': 5 }, // nuoc (Bà Năm) 2; banh (Bé Na) 5
    });
    expect(hurt.length).toBeGreaterThanOrEqual(2);
    const ba = hurt.find((h) => h.regular.id === baNamId)!;
    const na = hurt.find((h) => h.regular.id === beNaId)!;
    // naïve: Bé Na hụt 5 > Bà Năm hụt 2 → đứng trước trong danh sách xếp giảm
    const iBa = hurt.indexOf(ba), iNa = hurt.indexOf(na);
    expect(iNa).toBeLessThan(iBa);
  });

  it('THUẦN: cùng đầu vào ⇒ cùng kết quả', () => {
    const a = regularChurn({ missLog: { 'stock:nuoc': 3 } });
    const b = regularChurn({ missLog: { 'stock:nuoc': 3 } });
    expect(a).toEqual(b);
  });

  it('regularChurnLine ghép dòng ngắn có tên khách + món + số lần', () => {
    const hurt = regularChurn({ missLog: { 'stock:nuoc': 3 } }).find((h) => h.regular.id === baNamId)!;
    const line = regularChurnLine(hurt);
    expect(line).toContain(hurt.regular.name);
    expect(line).toContain('nuoc');
    expect(line).toContain('(3 lần)');
  });
});
