import { describe, expect, it } from 'vitest';
import { TIME_BANDS } from '../data/rhythm';
import { productById } from '../data/products';

// GĐ1781 — chống phình "wants" theo khung giờ: ≤20 món/khung, không trùng, id hợp lệ.
describe.each(TIME_BANDS.map((b) => [b.id, b] as const))('khung %s (GĐ1781)', (_id, b) => {
  it('≤20 món, không trùng, id có thật', () => {
    expect(b.wants.length).toBeLessThanOrEqual(20);
    expect(new Set(b.wants).size).toBe(b.wants.length);
    for (const id of b.wants) expect(productById(id), id).toBeTruthy();
  });
});
