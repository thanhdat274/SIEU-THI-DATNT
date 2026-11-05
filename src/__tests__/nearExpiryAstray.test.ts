/**
 * GĐ1303 — test THUẦN cho `nearExpiryAstray` (soi phạt kép: bán hàng cận hạn kéo sao
 * 'Chất lượng món' của danh tiếng). Không đổi state/kinh tế/save; co-op an toàn.
 */
import { describe, expect, it } from 'vitest';
import {
  FRESH_GRADE,
  NEAR_EXPIRY_FLOOR,
  NEAR_EXPIRY_GRADE,
  nearExpiryAstray,
} from '../data/nearExpiryAstray';
import { type RepSample } from '../data/reputation';

/** Một lượt có chấm chất lượng là quality, lượt không mua gì là {} (không có quality). */
const q = (quality?: number): RepSample => (quality === undefined ? {} : { quality });
/** Lặp mẫu n lần. */
const repeat = (s: RepSample, n: number): RepSample[] => Array.from({ length: n }, () => ({ ...s }));
/** Lập log: cặn (số lượt cận hạn) rồi tươi (số lượt 0.8). */
const logOf = (near: number, freshCount: number): RepSample[] => [
  ...repeat(q(NEAR_EXPIRY_GRADE), near),
  ...repeat(q(0.8), freshCount),
];

describe('nearExpiryAstray (GĐ1303) — phạt kép bán cận hạn kéo sao chất lượng', () => {
  it('log rỗng/không có lượt mua → dragged 0, total 0, sao null (không bịa)', () => {
    expect(nearExpiryAstray(undefined)).toEqual({ dragged: 0, total: 0, qualityStar: null, freshStar: null });
    expect(nearExpiryAstray([])).toEqual({ dragged: 0, total: 0, qualityStar: null, freshStar: null });
    expect(nearExpiryAstray([{}, {}, {}])).toEqual({ dragged: 0, total: 0, qualityStar: null, freshStar: null });
  });

  it('chưa đủ 10 lượt có chấm chất lượng → sao null, không in điểm giả', () => {
    const r = nearExpiryAstray(repeat(q(0.8), 9));
    expect(r.dragged).toBe(0);
    expect(r.total).toBe(9);
    expect(r.qualityStar).toBeNull();
    expect(r.freshStar).toBeNull();
  });

  it('toàn hàng tươi → không lạc, qualityStar == freshStar (không có gì chênh)', () => {
    const r = nearExpiryAstray(logOf(0, 10));
    expect(r.dragged).toBe(0);
    expect(r.total).toBe(10);
    expect(r.qualityStar).toBeCloseTo(1 + 4 * 0.8, 5); // 4.2★
    expect(r.freshStar).toBeCloseTo(r.qualityStar!, 5);
  });

  it('cận hạn kéo sao: 2/10 lượt 0.4 → dragged 2, chất lượng 3.88★, nếu tươi đã 4.2★', () => {
    const r = nearExpiryAstray(logOf(2, 8));
    expect(r.dragged).toBe(2);
    expect(r.total).toBe(10);
    expect(r.qualityStar).toBeCloseTo(1 + 4 * (2 * 0.4 + 8 * 0.8) / 10, 5); // 3.88★
    expect(r.freshStar).toBeCloseTo(1 + 4 * 0.8, 5); // thay 0.4 bằng 0.8 → 4.2★
    expect(r.freshStar!).toBeGreaterThan(r.qualityStar!);
  });

  it('ngưỡng trung thực: lần ghé chỉ mua MỘT cận hạn (0.4) là HẾT cửa bị kéo; chưa cần đếm trộn', () => {
    // log 11 lượt: 1 lượt cận hạn thuần 0.4 + 10 lượt tươi → đủ mẫu
    const r = nearExpiryAstray(logOf(1, 10));
    expect(r.total).toBe(11);
    expect(r.dragged).toBe(1);
    expect(r.qualityStar).toBeCloseTo(1 + 4 * (0.4 + 10 * 0.8) / 11, 5);
  });

  it('bỏ qua lượt không mua gì ({}): total chỉ đếm lượt có quality, sao không lệch', () => {
    const mixed: RepSample[] = [
      q(0.4), q(0.4), q(0.8), q(0.8), q(0.8), q(0.8), q(0.8), q(0.8), q(0.8), q(0.8),
      {}, // không mua gì → không tính
    ];
    const r = nearExpiryAstray(mixed);
    expect(r.total).toBe(10);
    expect(r.dragged).toBe(2);
  });

  it('cận thay bằng FRESH_GRADE (0.8) — counterfactual đúng từng sample bị kéo', () => {
    const log: RepSample[] = [
      q(0.4), q(0.4), q(0.4), q(0.6), q(0.6), q(0.8), q(0.8), q(0.8), q(0.8), q(0.8),
    ];
    const r = nearExpiryAstray(log);
    expect(r.dragged).toBe(3);
    const realMean = (3 * 0.4 + 2 * 0.6 + 5 * 0.8) / 10;
    const freshMean = (3 * FRESH_GRADE + 2 * 0.6 + 5 * 0.8) / 10;
    expect(r.qualityStar).toBeCloseTo(1 + 4 * realMean, 5);
    expect(r.freshStar).toBeCloseTo(1 + 4 * freshMean, 5);
  });

  it('THUẦN deterministic — cùng log cho cùng kết quả, không đổi state', () => {
    const log = logOf(3, 10);
    const a = nearExpiryAstray(log);
    const b = nearExpiryAstray(log);
    expect(a).toEqual(b);
  });
});
