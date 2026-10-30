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

// ── GĐ285 — khoá cấu trúc TIME_BANDS: phủ liền 6h–22h, wants toàn món thật, phân loại khớp ngưỡng ──
import { slowBands } from '../data/rhythm';
import { productById } from '../data/products';

describe('TIME_BANDS — bất biến cấu trúc (GĐ285)', () => {
  it('6 khung phủ LIÊN TỤC 6h–22h (giờ bán hàng), không hở không chồng', () => {
    expect(TIME_BANDS[0].from).toBe(6 * 60);
    expect(TIME_BANDS[TIME_BANDS.length - 1].to).toBe(22 * 60);
    for (let i = 1; i < TIME_BANDS.length; i++) {
      expect(TIME_BANDS[i].from).toBe(TIME_BANDS[i - 1].to);
    }
  });

  it('món trong wants đều THẬT trong bảng hàng — chặn loại id chết GĐ259', () => {
    for (const b of TIME_BANDS) {
      expect(b.wants.length).toBeGreaterThan(0);
      for (const id of b.wants) expect(productById(id), `${b.id}: ${id}`).toBeTruthy();
    }
  });

  it('phân loại vàng/vắng khớp ngưỡng và rời nhau: vàng = traffic ≥ 1.3, vắng = < 0.8', () => {
    const golden = goldenHourBands();
    const slow = slowBands();
    expect(golden.map((b) => b.id).sort()).toEqual(['sang', 'toi', 'trua']);
    expect(slow.map((b) => b.id).sort()).toEqual(['chieu', 'giua_sang']); // khuya traffic đúng 0.8: không vàng không vắng (trung tính)
    for (const b of TIME_BANDS) {
      if (b.traffic >= GOLDEN_TRAFFIC) expect(golden).toContain(b);
      if (b.traffic < 0.8) expect(slow).toContain(b);
    }
    // trung bình trọng số ~1.08 (lệch nhẹ so với comment ≈1 — số liệu CÂN BẰNG THỰC NGHIỆM qua
    // golden sim, KHÔNG "sửa" về 1: chỉnh là đổi kinh tế toàn cục)
    const w = TIME_BANDS.reduce((n, b) => n + (b.to - b.from) * b.traffic, 0) / TIME_BANDS.reduce((n, b) => n + (b.to - b.from), 0);
    expect(w).toBeGreaterThan(1);
    expect(w).toBeLessThan(1.2);
  });
});
