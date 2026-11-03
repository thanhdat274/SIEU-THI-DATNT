import { describe, expect, it } from 'vitest';
import { expiryNoteFor, expiryInputsNote, newUnlockMark } from '../data/advice';

describe('GĐ1117 — expiryNoteFor: đuôi dòng tư vấn cho nông sản sắp hết hạn', () => {
  it('có hạn → nhắc dùng ngay với số ngày đúng; 0 ngày (hỏng hôm nay) vẫn nhắc', () => {
    expect(expiryNoteFor(2)).toBe(' · ⏳ hết hạn ~2 ngày — dùng ngay');
    expect(expiryNoteFor(0)).toBe(' · ⏳ hết hạn ~0 ngày — dùng ngay');
  });

  it('không trong danh sách sắp hỏng (undefined) → chuỗi rỗng, không nhiễu', () => {
    expect(expiryNoteFor(undefined)).toBe('');
  });
});

describe('GĐ1118 — expiryInputsNote: nhắc nấu ngay khi nguyên liệu công thức sắp hỏng', () => {
  it('chọn nguyên liệu hạn ngắn nhất trong các đầu vào', () => {
    const m = new Map([['x_vai', 1], ['x_duong', 2]]);
    const note = expiryInputsNote([{ productId: 'x_vai' }, { productId: 'x_duong' }], m);
    expect(note).toBe(' · ⏳ Vải hết hạn ~1 ngày — nấu ngay');
  });

  it('không nguyên liệu nào sắp hỏng → rỗng; hỗn hợp có/không → chỉ nhắc cái sắp hỏng', () => {
    expect(expiryInputsNote([{ productId: 'tra' }], new Map([['x_vai', 1]]))).toBe('');
    expect(expiryInputsNote([{ productId: 'tra' }, { productId: 'x_vai' }], new Map([['x_vai', 2]])))
      .toBe(' · ⏳ Vải hết hạn ~2 ngày — nấu ngay');
  });
});

describe('GĐ1125 — newUnlockMark: dấu 🆕 cho món vừa mở đúng cấp này', () => {
  it('mở đúng cấp hiện tại → 🆕; cấp khác (kể cả chưa mở/đã mở lâu) → rỗng', () => {
    expect(newUnlockMark(45, 45)).toBe(' 🆕');
    expect(newUnlockMark(46, 45)).toBe('');
    expect(newUnlockMark(44, 45)).toBe('');
    expect(newUnlockMark(1, 45)).toBe('');
  });
});
