import { describe, expect, it } from 'vitest';
import { CONVENIENCE, branchStandState } from '../data/branches';

/**
 * Bộ test GĐ26 — Trạng thái hình ảnh "cái xác" cửa hàng tiện lợi theo quyền sở hữu.
 *
 * Hợp đồng: `branchStandState(level, bought, open)` thuần trả một trong
 * 'hidden' | 'lot' | 'closed' | 'open' (xem data/branches.ts). Khởi động world/main.tsx sẽ
 * bật/ẩn mảnh đất RAO BÁN, toà nhà và biển MỞ/ĐÓNG CỬA theo kết quả này. Nav của toà nhà giữ
 * nguyên trong mọi trạng thái nên không đụng lưới đi lại.
 */

describe('branchStandState — trạng thái hình ảnh cửa hàng tiện lợi', () => {
  it('dưới cấp mở + chưa mua = hidden (chưa thấy gì)', () => {
    expect(branchStandState(CONVENIENCE.unlock - 1, false, false)).toBe('hidden');
    expect(branchStandState(1, false, false)).toBe('hidden');
  });

  it('đủ cấp mở + chưa mua = lot (mảnh đất rao bán)', () => {
    expect(branchStandState(CONVENIENCE.unlock, false, false)).toBe('lot');
    expect(branchStandState(50, false, false)).toBe('lot');
  });

  it('đã mua + đang đóng = closed (toà nhà + biển đóng cửa)', () => {
    expect(branchStandState(50, true, false)).toBe('closed');
    // Kể cả dưới cấp mở nhưng đã lỡ mua (nâng cấp sau khi mua mặt bằng chẳng hạn)
    expect(branchStandState(CONVENIENCE.unlock - 1, true, false)).toBe('closed');
  });

  it('đã mua + đang mở = open (toà nhà + biển mở cửa phát sáng)', () => {
    expect(branchStandState(50, true, true)).toBe('open');
  });

  it('open ưu tiên tuyệt đối (kể cả khi bought còn false — phòng thủ)', () => {
    expect(branchStandState(1, false, true)).toBe('open');
    expect(branchStandState(5, true, true)).toBe('open');
  });

  it('quét cấp 1..100: chỉ có lot khi đủ cấp và chưa mua, không trạng thái lạ', () => {
    for (let lv = 1; lv <= 100; lv++) {
      const unbought = branchStandState(lv, false, false);
      expect(['hidden', 'lot']).toContain(unbought);
      expect(unbought).toBe(lv >= CONVENIENCE.unlock ? 'lot' : 'hidden');
    }
  });
});
