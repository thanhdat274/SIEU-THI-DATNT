import { describe, expect, it } from 'vitest';
import { BREAKFAST, faintMinutes } from '../data/biz';
import { FAINT_AT } from '../core/gameTypes';

describe('faintMinutes — giờ ngất (GĐ354)', () => {
  it('không ăn sáng: đúng FAINT_AT (02:00 hôm sau); ăn sáng: dời thêm lateMinutes', () => {
    expect(faintMinutes(false)).toBe(FAINT_AT);
    expect(faintMinutes(true)).toBe(FAINT_AT + BREAKFAST.lateMinutes);
  });

  it('biển báo khuya đọc đúng giờ: 2:00 / 3:00', () => {
    expect(faintMinutes(false) / 60 - 24).toBe(2);
    expect(faintMinutes(true) / 60 - 24).toBe(3);
  });
});
