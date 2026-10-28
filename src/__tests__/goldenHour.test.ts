import { describe, expect, it } from 'vitest';
import {
  describeHours, GOLDEN_TRAFFIC, goldenHourBands, inGoldenHour, TIME_BANDS, timeBandAt,
} from '../data/rhythm';

/** Giờ vàng hôm nay: dự báo khung giờ đông khách rút ra từ nhịp traffic cố định — chắc định, không random. */

describe('goldenHourBands — dự báo giờ vàng từ nhịp traffic', () => {
  it('không phụ thuộc dữ liệu ngoài nhịp cố định (deterministic)', () => {
    expect(goldenHourBands()).toEqual(goldenHourBands());
  });

  it('chỉ chọn khung có traffic ≥ ngưỡng giờ vàng', () => {
    const bands = goldenHourBands();
    expect(bands.length).toBeGreaterThan(0);
    for (const b of bands) expect(b.traffic).toBeGreaterThanOrEqual(GOLDEN_TRAFFIC);
    // Các khung còn lại đều dưới ngưỡng
    for (const b of TIME_BANDS.filter((x) => !bands.includes(x))) expect(b.traffic).toBeLessThan(GOLDEN_TRAFFIC);
  });

  it('đúng 3 khung đông: sáng (1.6), trưa (1.35), tối (1.7)', () => {
    const ids = goldenHourBands().map((b) => b.id).sort();
    expect(ids).toEqual(['sang', 'toi', 'trua'].sort());
  });

  it('describeHours gộp thành chuỗi "6h–8h30 · 11h–13h · 17h–20h"', () => {
    expect(describeHours(goldenHourBands())).toBe('6h–8h30 · 11h–13h · 17h–20h');
  });

  it('timeBandAt và inGoldenHour khớp ranh giới', () => {
    expect(timeBandAt(6 * 60 + 1)?.id).toBe('sang');
    expect(timeBandAt(8 * 60 + 30)?.id).toBe('giua_sang'); // hết khung sáng đúng 8h30
    expect(inGoldenHour(6 * 60)).toBe(true);
    expect(inGoldenHour(8 * 60 + 29)).toBe(true);
    expect(inGoldenHour(8 * 60 + 30)).toBe(false); // sang khung giữa buổi (không vàng)
    expect(inGoldenHour(17 * 60)).toBe(true);
    expect(inGoldenHour(12 * 60)).toBe(true); // cao điểm trưa
    expect(inGoldenHour(15 * 60)).toBe(false); // buổi chiều vắng
  });
});
