import { describe, expect, it } from 'vitest';
import { FRANTIC_AT, IMPATIENT_AT, impatienceEmoji } from '../agents/customers';

/**
 * GĐ119 — Dấu hiệu "khách sốt ruột" (đọc từ patience có sẵn): khách đang xếp hàng hiện emoji
 * dẫn dắt khi tỉ lệ waited/patience vượt mốc — để người chơi thấy AI sắp bỏ đi và ưu tiên phục vụ.
 * Chỉ THÊM hiển thị (badge overhead), không đổi patience/kinh tế/save. Đề xuất Game Designer,
 * duyệt UI/UX (⏳ bỏ vì đã trùng nghĩa "hàng cận hạn" — dùng 😕 → 😤).
 */
describe('impatienceEmoji — mốc sốt ruột theo tỉ lệ chờ (GĐ119)', () => {
  it('còn bình tĩnh (ratio < 0.6): chưa hiện dấu hiệu', () => {
    expect(impatienceEmoji(0)).toBe(null);
    expect(impatienceEmoji(0.3)).toBe(null);
    expect(impatienceEmoji(IMPATIENT_AT - 0.01)).toBe(null);
  });

  it('bắt đầu sốt ruột từ mốc 0.6: hiện 😕', () => {
    expect(impatienceEmoji(IMPATIENT_AT)).toBe('😕');
    expect(impatienceEmoji(0.7)).toBe('😕');
    expect(impatienceEmoji(FRANTIC_AT - 0.01)).toBe('😕');
  });

  it('sắp bỏ đi từ mốc 0.85: hiện 😤', () => {
    expect(impatienceEmoji(FRANTIC_AT)).toBe('😤');
    expect(impatienceEmoji(0.9)).toBe('😤');
    expect(impatienceEmoji(0.99)).toBe('😤'); // sát 1.0 vẫn 😤, rồi >1.0 mới 😠 khi bỏ
  });

  it('mốc không chồng: một ratio chỉ ra đúng 1 emoji, 0.6 < 0.85', () => {
    expect(IMPATIENT_AT).toBeLessThan(FRANTIC_AT);
    expect(FRANTIC_AT).toBeLessThanOrEqual(1);
    for (let r = 0; r <= 1.01; r += 0.05) {
      const e = impatienceEmoji(r);
      if (e !== null) expect(['😕', '😤']).toContain(e);
    }
  });
});
