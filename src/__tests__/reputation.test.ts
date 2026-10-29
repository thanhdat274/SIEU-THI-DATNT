import { describe, expect, it } from 'vitest';
import { itemQuality, sampleVisit, reputationOf, repScore, meetsRep, describeRep, repVisitBonus, REP_MIN_SAMPLES } from '../data/reputation';

/**
 * GĐ210 — QA toàn diện: bổ sung test cho module danh tiếng (reputation.ts, trước đây ít test).
 * Danh tiếng có nguyên nhân: mỗi lượt khách chấm 5 mặt, giữ 80 lượt gần nhất rồi lấy trung bình ra sao 1–5.
 */
describe('reputation — danh tiếng có nguyên nhân', () => {
  it('itemQuality: cận hạn 0.4, hàng thường 0.8, món nhà làm theo độ ngon công thức (0.6–1)', () => {
    expect(itemQuality('mi', true)).toBe(0.4);        // cận hạn
    expect(itemQuality('mi', false)).toBe(0.8);       // hàng thường
    expect(itemQuality('banh_mi_trung_nuong', false)).toBeGreaterThanOrEqual(0.6);
    expect(itemQuality('banh_mi_trung_nuong', false)).toBeLessThanOrEqual(1);
    expect(itemQuality('com_suon_nuong', false)).toBeGreaterThan(0.9); // công thức ngon cao → gần 1
  });

  it('sampleVisit: bỏ về vì chờ → speed 0; bẩn → clean thấp', () => {
    const s = sampleVisit({ bought: [], priceMisses: 0, stockMisses: 0, walkedOut: true, waitedMinutes: 10, patience: 3, dirt: 0.5 });
    expect(s.speed).toBe(0);
    expect(s.clean).toBeCloseTo(0.5);
  });

  it('sampleVisit: mua món ngon → chất lượng cao; thiếu 1 mặt kéo điểm mặt đó', () => {
    const s = sampleVisit({ bought: [{ id: 'mi', nearExpiry: false }], priceMisses: 1, stockMisses: 0, walkedOut: false, waitedMinutes: 0, patience: 5, dirt: 0 });
    expect(s.quality).toBeCloseTo(0.8);
    expect(s.price).toBeCloseTo(0.5); // 1 − 1/2
    expect(s.stock).toBeCloseTo(1);
  });

  it('reputationOf: chưa đủ số lượt → mọi mặt 3 sao, không có mặt yếu nhất', () => {
    const r = reputationOf(undefined);
    expect(r.samples).toBe(0);
    expect(r.weakest).toBeNull();
    expect(r.overall).toBe(3);
    expect(Object.values(r.factors).every((v) => v === 3)).toBe(true);
    const few = reputationOf([{ price: 0.9 }]);
    expect(few.weakest).toBeNull();
  });

  it('reputationOf: đủ lượt → mặt kéo thấp nhất là mặt yếu', () => {
    const log = Array.from({ length: REP_MIN_SAMPLES }, () => ({ price: 0.9, stock: 0, clean: 0.9, speed: 0.9, quality: 0.9 }));
    const r = reputationOf(log);
    expect(r.samples).toBe(REP_MIN_SAMPLES);
    expect(r.factors.stock).toBe(1);       // toStars(0) = 1 sao
    expect(r.weakest).toBe('stock');
    expect(r.overall).toBeGreaterThan(3);
  });

  it('repScore/meetsRep/describeRep/repVisitBonus', () => {
    const r = reputationOf(Array.from({ length: REP_MIN_SAMPLES }, () => ({ price: 0.9, stock: 0, clean: 0.9, speed: 0.9, quality: 0.9 })));
    expect(meetsRep(r, { factor: 'stock', min: 2 })).toBe(false);  // stock = 1 sao
    expect(meetsRep(r, { factor: 'stock', min: 1 })).toBe(true);
    expect(meetsRep(r, undefined)).toBe(true);
    expect(repScore(r, { min: 3 })).toBe(r.overall);              // không ghi mặt → dùng điểm chung
    expect(describeRep({ factor: 'stock', min: 3 })).toContain('3.0');
    expect(repVisitBonus(reputationOf(undefined))).toBe(0);       // chưa đủ lượt
    expect(repVisitBonus(reputationOf(Array.from({ length: REP_MIN_SAMPLES }, () => ({ price: 1, stock: 1, clean: 1, speed: 1, quality: 1 }))))).toBeCloseTo(0.1); // 5 sao → +10%
  });
});
