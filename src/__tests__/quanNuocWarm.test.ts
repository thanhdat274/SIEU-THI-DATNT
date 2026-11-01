import { describe, expect, it } from 'vitest';
import {
  QUAN_NUOC_WARM_PLACES,
  createQuanNuocWarm,
  quanNuocWarmProblems,
} from '../world/quanNuocWarm';
import { warmGlow } from '../world/compoundWarm';

/**
 * GĐ187 — "Quán nước lên đèn": hoàn tất chuỗi "cảnh ấm" (GĐ177 mặt tiền → GĐ185 cơ ngơi) cho điểm
 * khách quen tụ họp — quán nước đầu ngõ. Chỉ nguồn sáng (không có khối chặn lưới), gating bởi quán
 * MỞ: mảnh đất trống/gộp thì tối tẻ, có quán thật rồi mới ấm chập tối. Rủi ro duy nhất là đặt sai
 * chỗ (ngoài thế giới/giữa lòng đường) và độ sáng sai giờ/cờ mở — soi bằng test thuần/struct.
 */
describe('GĐ187 — đèn ấm quán nước (quanNuocWarm)', () => {
  it('bảng vị trí đèn không vi phạm chỗ cấm (ngoài thế giới / giữa lòng đường / đè mặt tiền)', () => {
    expect(quanNuocWarmProblems()).toEqual([]);
  });

  it('có 2 nguồn sáng ở vị trí quán nước (gần LANE_X+4.4)', () => {
    const x = QUAN_NUOC_WARM_PLACES.map((p) => p.x);
    expect(x.length).toBe(2);
    for (const pos of QUAN_NUOC_WARM_PLACES) {
      // Quán đặt tại (LANE_X+4.4, 0, 1); đèn phủ quanh quán (xung quanh hoặc mép)
      expect(Math.abs(pos.x - 54.4)).toBeLessThan(2);
      expect(Math.abs(pos.y)).toBeGreaterThan(1.5); // treo cao, không chìm vào đất
    }
  });

  it('đèn tắt mặc định, sáng theo giờ lẫn cờ mở quán (gate open)', () => {
    const api = createQuanNuocWarm();
    // registerLight tắt đèn ngay khi đăng ký → intensities mặc định bằng 0
    expect(api.intensities()).toEqual([0, 0]);
    // Chập tối (lamp 1) nhưng quán CHƯA mở → vẫn tắt
    api.update(1, false);
    expect(api.intensities()).toEqual([0, 0]);
    // Quán mở + chập tối → ấm kín
    api.update(1, true);
    expect(api.intensities()).toEqual([14, 14]);
    // Quán mở nhưng trưa (lamp 0) → tắt
    api.update(0, true);
    expect(api.intensities()).toEqual([0, 0]);
  });

  it('giờ sáng khớp công thức warmGlow dùng chung (17h–5h30)', () => {
    // Đồng bộ với các nguồn sáng ấm khác: mốc 20h sáng kín, 12h trưa tắt hẳn
    expect(warmGlow(20 * 60)).toBe(1);
    expect(warmGlow(12 * 60)).toBe(0);
  });
});
