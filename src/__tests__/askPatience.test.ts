import { describe, expect, it } from 'vitest';
import {
  askQueuedPatience,
  ASK_GRACE_REAL_S,
  ASK_IMPATIENT_REAL_S,
  ASK_FRANTIC_REAL_S,
  ASK_RESOLVE_REAL_S,
} from '../data/counterDeals';

/**
 * GĐ122 — Khách chờ mặc cả/ghi sổ quá lâu: thế giới dừng theo GĐ102 nhưng KHÁCH ĐANG BỊ TREO câu hỏi
 * vẫn mất kiên nhẫn theo GIÂY THỰC (wall-clock) để phá lạm dụng 'pause AFK vô hạn'. Thang bậc:
 * GRACE rộng → 😕 → 😤 → tự chốt theo mặc định (không 'bỏ về' — phạt nhẹ công bằng, dạy qua end-of-day
 * missed.wait GĐ120). Chỉ Date.now() thuần ứng — không thêm state/save (không đụng SAVE_VERSION).
 * Quyết định B của Game Designer + 3 chỉnh bắt buộc của UI/UX (GRACE ≥30-45s; bong bóng 3D nối cùng
 * ngân sách wall-clock; dòng <small> báo hậu quả trong CounterAskAlert).
 */
describe('askQueuedPatience — thang kiên nhẫn giây thực cho khách bị treo câu hỏi (GĐ122)', () => {
  it('còn bình tĩnh trong GRACE: chưa hiện dấu hiệu (0 → trước 😕)', () => {
    expect(askQueuedPatience(0)).toBe(null);
    expect(askQueuedPatience(ASK_IMPATIENT_REAL_S - 0.01)).toBe(null);
  });

  it('từ mốc 😕 (≥30s): cảnh báo, chưa phạt', () => {
    expect(askQueuedPatience(ASK_IMPATIENT_REAL_S)).toBe('😕');
    expect(askQueuedPatience(ASK_FRANTIC_REAL_S - 0.01)).toBe('😕');
  });

  it('từ mốc 😤 (≥38s): sắp tự chốt', () => {
    expect(askQueuedPatience(ASK_FRANTIC_REAL_S)).toBe('😤');
    expect(askQueuedPatience(ASK_RESOLVE_REAL_S - 0.01)).toBe('😤');
  });

  it('hết hạn (≥45s): tự chốt theo mặc định', () => {
    expect(askQueuedPatience(ASK_RESOLVE_REAL_S)).toBe('resolved');
    expect(askQueuedPatience(99)).toBe('resolved');
  });

  it('thang bậc hợp lý: 0 < GRACE ≤ 😕 < 😤 < resolved, GRACE rộng đủ đọc chậm', () => {
    expect(ASK_GRACE_REAL_S).toBeLessThanOrEqual(ASK_IMPATIENT_REAL_S);
    expect(ASK_IMPATIENT_REAL_S).toBeLessThan(ASK_FRANTIC_REAL_S);
    expect(ASK_FRANTIC_REAL_S).toBeLessThan(ASK_RESOLVE_REAL_S);
    // UI/UX bắt buộc: GRACE ≥ 30-45s thực để người mới ở 8× kịp đọc (không dùng 20s của bản thảo).
    expect(ASK_GRACE_REAL_S).toBeGreaterThanOrEqual(30);
    // Khoảng rộng giữa 😤 và tự chốt đủ để người quay lại kịp hành động (≥5s).
    expect(ASK_RESOLVE_REAL_S - ASK_FRANTIC_REAL_S).toBeGreaterThanOrEqual(5);
  });

  it('không thiếu mốc: một giá trị realS chỉ ra đúng 1 trạng thái', () => {
    for (let t = 0; t <= 60; t += 0.5) {
      const st = askQueuedPatience(t);
      expect([null, '😕', '😤', 'resolved']).toContain(st);
    }
  });
});
