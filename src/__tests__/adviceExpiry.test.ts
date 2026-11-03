import { describe, expect, it } from 'vitest';
import { expiryNoteFor } from '../data/advice';

describe('GĐ1117 — expiryNoteFor: đuôi dòng tư vấn cho nông sản sắp hết hạn', () => {
  it('có hạn → nhắc dùng ngay với số ngày đúng; 0 ngày (hỏng hôm nay) vẫn nhắc', () => {
    expect(expiryNoteFor(2)).toBe(' · ⏳ hết hạn ~2 ngày — dùng ngay');
    expect(expiryNoteFor(0)).toBe(' · ⏳ hết hạn ~0 ngày — dùng ngay');
  });

  it('không trong danh sách sắp hỏng (undefined) → chuỗi rỗng, không nhiễu', () => {
    expect(expiryNoteFor(undefined)).toBe('');
  });
});
