import { describe, it, expect } from 'vitest';
import { segmentPriceFallout, segmentPriceLine } from '../data/segmentPricing';
import { productById } from '../data/products';
import { PROFESSIONS } from '../data/professions';

/** Giá gợi ý thị trường mặc định (marketIndex=1) = sell. */
const ref = (id: string) => productById(id).sell;

/**
 * GĐ1284 — "giá này đang đuổi đi phân khúc nào?": tái dựng keepChance × sensitivity của từng nghề
 * ưa món (đúng customerEntity.ts:164 + customers.ts:442), chỉ nói phần trăm lượt bị đuổi (không bịa khách).
 * Helper THUẦN ĐỌC — không import store (co-op an toàn), không đổi kinh tế/save/seed.
 */
describe('GĐ1284 — segmentPriceFallout (giá đang đuổi đi phân khúc nào)', () => {
  it('giá ≤ gợi ý thị trường → null (ai cũng mua, không ồn)', () => {
    expect(segmentPriceFallout({ productId: 'mi', price: ref('mi'), level: 10, day: 10 })).toBeNull();
    expect(segmentPriceFallout({ productId: 'mi', price: ref('mi') - 500, level: 10, day: 10 })).toBeNull();
  });

  it('giá cao hơn gợi ý → chỉ liệt kê phân khúc ƯA món đó, xếp theo % bị đuổi giảm dần', () => {
    // 'mi' là món ưa của 👷 Công nhân (sensitivity 1.2); bán 1.6× giá gợi ý
    const f = segmentPriceFallout({ productId: 'mi', price: Math.round(ref('mi') * 1.6), level: 10, day: 10 });
    expect(f).not.toBeNull();
    expect(f!.ratio).toBeCloseTo(1.6, 1);
    // mọi dòng đều là phân khúc ưa 'mi'
    for (const row of f!.rows) {
      expect(PROFESSIONS.find((p) => p.id === row.profession.id)!.likes).toContain('mi');
    }
    // xếp giảm dần theo % bị đuổi
    for (let i = 1; i < f!.rows.length; i++) expect(f!.rows[i - 1].losePct).toBeGreaterThanOrEqual(f!.rows[i].losePct);
    // có ít nhất một phân khúc bị đuổi (losePct > 0)
    expect(f!.rows.length).toBeGreaterThan(0);
    expect(f!.rows[0].losePct).toBeGreaterThan(0);
  });

  it('phân khúc KHÔNG ưa món không xuất hiện (chỉ tính nghề hay hỏi món này)', () => {
    // chọn một món ít nghề ưa để chắc chắn có nghề bị loại — mi do công nhân ưa
    const f = segmentPriceFallout({ productId: 'mi', price: Math.round(ref('mi') * 1.6), level: 10, day: 10 })!;
    const all = PROFESSIONS.filter((p) => p.likes.includes('mi')).map((p) => p.id);
    for (const row of f.rows) expect(all).toContain(row.profession.id);
    for (const p of all) {
      expect(f.rows.map((r) => r.profession.id)).toContain(p); // mọi nghề ưa mi đều được đo
    }
  });

  it('giá cao nhưng mọi phân khúc ưa vẫn mua → các row đều keep=1... (lọc keep<1)', () => {
    // món có productSensitivity thấp nhất + giá chỉ nhích nhẹ → vài nghề bền vẫn mua trọn
    const f = segmentPriceFallout({ productId: 'diem', price: Math.round(ref('diem') * 1.1), level: 30, day: 10 });
    // 'diem' sensitivity 0.8 (vd quà) — chỉ những nghề ưa + nhạy mới bị đuổi
    if (f) for (const row of f!.rows) expect(row.keep).toBeLessThan(1);
  });

  it('THUẦN: cùng đầu vào ⇒ cùng kết quả', () => {
    const a = segmentPriceFallout({ productId: 'mi', price: Math.round(ref('mi') * 1.5), level: 10, day: 10 });
    const b = segmentPriceFallout({ productId: 'mi', price: Math.round(ref('mi') * 1.5), level: 10, day: 10 });
    expect(a).toEqual(b);
  });

  it('segmentPriceLine ghép dòng ngắn có tên nghề + phần trăm + giá gợi ý', () => {
    const f = segmentPriceFallout({ productId: 'mi', price: Math.round(ref('mi') * 1.6), level: 10, day: 10 })!;
    const line = segmentPriceLine(f);
    expect(line).toContain(f.rows[0].profession.icon);
    expect(line).toContain('bỏ ~');
    expect(line).toContain('hạ về ~');
  });
});
