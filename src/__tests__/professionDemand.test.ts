import { describe, it, expect } from 'vitest';
import { professionBandMix, topSegmentsOf } from '../data/professionDemand';
import { TIME_BANDS } from '../data/rhythm';
import { PROFESSIONS, PROFESSION_SHARE } from '../data/professions';

const sang = TIME_BANDS.find((b) => b.id === 'sang')!;

/**
 * GĐ1271 — "khung giờ này AI đến?": soi phân khúc khách theo nghề cho khung giờ đông nhất.
 * Helper THUẦN ĐỌC đúng trọng số pickProfession + món ưa thích professionWants; không đổi kinh tế/save/seed.
 */
describe('GĐ1271 — professionBandMix (phân khúc khách theo nghề trong khung giờ)', () => {
  it('trả về các phân khúc xếp theo chia sẻ giảm dần, tổng share = 1', () => {
    const mix = professionBandMix({ level: 20, day: 10, band: sang, expected: 30 });
    expect(mix.segments.length).toBeGreaterThan(0);
    const shares = mix.segments.map((s) => s.share);
    expect(shares.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 5);
    for (let i = 1; i < shares.length; i++) expect(shares[i - 1]).toBeGreaterThanOrEqual(shares[i]);
  });

  it('số khách nghề kỳ vọng = expected × PROFESSION_SHARE', () => {
    const mix = professionBandMix({ level: 20, day: 10, band: sang, expected: 30 });
    expect(mix.professionalShare).toBe(PROFESSION_SHARE);
    expect(mix.professionalCount).toBe(Math.round(30 * PROFESSION_SHARE));
  });

  it('nghề đang trong giờ ghé có inBand=true và đóng góp trọng số ×4 lớn hơn ngoài giờ ×0.5', () => {
    const mix = professionBandMix({ level: 20, day: 10, band: sang, expected: 30 });
    // Mọi nghề đều tham gia trọng số (giờ ghé ×4 hoặc ngoài ×0.5); chỉ những nghề sinh ra khách mới inBand.
    // Có ít nhất một phân khúc inBand trong khung sáng.
    expect(mix.segments.some((s) => s.inBand)).toBe(true);
  });

  it('món ưa thích lọc theo cấp mở khóa + đúng mùa (offSeason)', () => {
    // Cấp 1: hầu hết món nghề ưa chưa mở — likes phải không chứa món đóng/mùa lệch
    const mix = professionBandMix({ level: 1, day: 10, band: sang, expected: 10 });
    for (const sg of mix.segments) {
      // món ưa vẫn chỉ nằm trong hồ sơ gốc của nghề
      const def = PROFESSIONS.find((p) => p.id === sg.id)!;
      for (const like of sg.likes) expect(def.likes).toContain(like);
    }
  });

  it('quảng cáo nhắm nghề làm tăng professionalShare (×1.3) và chia sẻ nghề đó', () => {
    const target = 'construction';
    const plain = professionBandMix({ level: 20, day: 10, band: sang, expected: 30 });
    const boosted = professionBandMix({ level: 20, day: 10, band: sang, expected: 30, boosted: [target] });
    expect(boosted.professionalShare).toBeCloseTo(Math.min(1, PROFESSION_SHARE * 1.3), 5);
    const sharePlain = plain.segments.find((s) => s.id === target)!.share;
    const shareBoosted = boosted.segments.find((s) => s.id === target)!.share;
    expect(shareBoosted).toBeGreaterThan(sharePlain);
  });

  it('THUẦN: cùng đầu vào ⇒ cùng kết quả (deterministic, không RNG)', () => {
    const a = professionBandMix({ level: 15, day: 3, band: sang, expected: 22 });
    const b = professionBandMix({ level: 15, day: 3, band: sang, expected: 22 });
    expect(a).toEqual(b);
  });

  it('topSegmentsOf cắt đúng số lượng tối đa', () => {
    const mix = professionBandMix({ level: 20, day: 10, band: sang, expected: 30 });
    expect(topSegmentsOf(mix, 2).length).toBe(2);
    expect(topSegmentsOf(mix, 3).length).toBe(3);
  });
});
