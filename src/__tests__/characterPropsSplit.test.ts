import { describe, expect, it } from 'vitest';
import { genderHairStyle, defaultHairStyle } from '../render/characterProps';

describe('GĐ999 — render/characterProps tách khỏi render/characterModel', () => {
  it('kiểu tóc theo giới trả về chuỗi hợp lệ cho mọi nguyên mẫu', () => {
    for (const a of ['shopkeeper', 'student', 'elder'] as const) {
      expect(typeof defaultHairStyle(a as never)).toBe('string');
      expect(typeof genderHairStyle(a as never, undefined)).toBe('string');
    }
  });
});
