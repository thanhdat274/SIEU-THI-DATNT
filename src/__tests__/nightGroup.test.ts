import { describe, expect, it } from 'vitest';
import { pickNightGroup, NIGHT_GROUPS } from '../data/branches';

/**
 * Bộ test GĐ1034 — `data/branches.pickNightGroup` (nhánh RƠI CUỐI dòng 387–388 TRƯỚC ĐÂY 0%:
 * `return NIGHT_GROUPS[length-1]` khi roll không tiêu hết trọng số) + biên chọn nhóm đêm.
 *
 * Hợp đồng (đối chiếu NIGHT_GROUPS/weightIn):
 * - rng() > min(0.85, tổng trọng số giờ) → undefined (khách thường).
 * - Giờ ban ngày không nhóm nào hoạt động (tổng trọng 0) → undefined.
 * - rng() vừa → chọn nhóm theo trọng số.
 * - roll không hết tổng trọng số → rơi về nhóm CUỐI (fallback).
 */

// Giờ 22h (22*60): driver 0.25 + worker 0.3 + driver... + drinker 0.25 = 0.8
const H22 = 22 * 60;
const lastId = NIGHT_GROUPS[NIGHT_GROUPS.length - 1].id; // 'drinker'

/** rng tuần tự theo chuỗi (gọi hết thì giữ giá trị cuối). */
const seqRng = (seq: number[]) => {
  let i = 0;
  return () => seq[Math.min(i++, seq.length - 1)];
};

describe('pickNightGroup — khách nhóm đêm', () => {
  it('rng cao (r > ngưỡng khả năng) → undefined (khách thường)', () => {
    expect(pickNightGroup(H22, seqRng([1.5]))).toBeUndefined();
  });

  it('ban ngày không nhóm hoạt động (tổng trọng 0) → undefined', () => {
    expect(pickNightGroup(12 * 60, seqRng([0, 0.5]))).toBeUndefined();
  });

  it('rng thấp vừa → chọn nhóm đầu theo trọng số', () => {
    expect(pickNightGroup(H22, seqRng([0, 0.1]))?.id).toBe('driver');
  });

  it('roll KHÔNG hết tổng trọng số → rơi về nhóm CUỐI (fallback 387)', () => {
    // call1=0: qua ngưỡng; call2=1.5: r = 1.5×0.8 = 1.2, trừ hết vẫn dư → trả nhóm cuối
    expect(pickNightGroup(H22, seqRng([0, 1.5]))?.id).toBe(lastId);
  });

  it('kết quả thuộc danh sách nhóm đêm hợp lệ', () => {
    const g = pickNightGroup(H22, seqRng([0, 0.3]));
    expect(g && NIGHT_GROUPS.some((x) => x.id === g.id)).toBe(true);
  });
});
