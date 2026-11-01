import { describe, expect, it } from 'vitest';
import { COMPOUND_WARM_PLACES, compoundWarmProblems, createCompoundWarm, warmGlow } from '../world/compoundWarm';

/**
 * GĐ185 — "Cơ ngơi lên đèn": đèn ấm chập tối lan tới của riêng người chơi (hiên nhà + cổng trại),
 * nối tiếp GĐ177 (mặt tiền). Chỉ nguồn sáng (không có khối chặn lưới) — rủi ro duy nhất là đặt sai
 * chỗ (ngoài thế giới/giữa lòng đường) và độ sáng sai giờ, soi bằng test thuần/struct.
 */
describe('GĐ185 — đèn ấm cơ ngơi (compoundWarm)', () => {
  it('bảng vị trí đèn không vi phạm chỗ cấm (ngoài thế giới / giữa lòng đường / đè mặt tiền)', () => {
    expect(compoundWarmProblems()).toEqual([]);
  });

  it('có cả đèn hiên nhà lẫn cổng trại', () => {
    const labels = COMPOUND_WARM_PLACES.map((p) => p.label);
    expect(labels).toContain('home');
    expect(labels).toContain('farm');
  });

  it('đèn sáng đúng nhịp 17h–5h30 (warmGlow): trưa tắt, đêm sáng kín', () => {
    expect(warmGlow(12 * 60)).toBe(0);          // 12:00 — trưa tắt hẳn
    expect(warmGlow(8 * 60)).toBe(0);           // 08:00 — sáng, tắt
    expect(warmGlow(17 * 60)).toBe(0);          // 17:00 — mới chuyển
    expect(warmGlow(20 * 60)).toBe(1);          // 20:00 — chập tối, sáng kín
    expect(warmGlow(23 * 60)).toBe(1);          // 23:00 — đêm sáng kín
    expect(warmGlow(4 * 60)).toBe(1);           // 04:00 — trước rạng đông vẫn sáng
    expect(warmGlow(17.5 * 60)).toBeCloseTo(0.5, 5); // 17:30 — nhá nhem, sáng nửa
  });

  it('tạo ra nguồn sáng ấm ở đúng số điểm, tắt mặc định, bật theo update(lamp)', () => {
    const api = createCompoundWarm();
    // registerLight tắt đèn ngay khi đăng ký → intensities mặc định bằng 0
    expect(api.intensities()).toEqual([0, 0]);
    api.update(1);
    expect(api.intensities()).toEqual([16, 16]); // chập tối: sáng kín
    api.update(0);
    expect(api.intensities()).toEqual([0, 0]);   // trưa: tắt hẳn
  });
});
