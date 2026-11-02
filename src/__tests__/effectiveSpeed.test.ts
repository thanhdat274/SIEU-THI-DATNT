import { describe, expect, it } from 'vitest';
import { effectiveSpeed } from '../core/routine';

const base = { panelType: undefined, chapterPending: false, speed: 3 };

describe('GĐ965 — effectiveSpeed', () => {
  it('chạy bình thường giữ nguyên tốc độ', () => {
    expect(effectiveSpeed(base, false, false)).toBe(3);
  });
  it('tổng kết / cốt truyện dừng giờ ngoài hẻm', () => {
    expect(effectiveSpeed({ ...base, panelType: 'summary' }, false, false)).toBe(0);
    expect(effectiveSpeed({ ...base, chapterPending: true }, false, false)).toBe(0);
  });
  it('ở hẻm tổng kết / cốt truyện không dừng giờ', () => {
    expect(effectiveSpeed({ ...base, panelType: 'summary' }, true, false)).toBe(3);
    expect(effectiveSpeed({ ...base, chapterPending: true }, true, false)).toBe(3);
  });
  it('câu hỏi ở quầy luôn dừng, kể cả ở hẻm', () => {
    expect(effectiveSpeed(base, true, true)).toBe(0);
    expect(effectiveSpeed(base, false, true)).toBe(0);
  });
  it('panel khác không dừng', () => {
    expect(effectiveSpeed({ ...base, panelType: 'order' }, false, false)).toBe(3);
  });
});
