import { describe, expect, it } from 'vitest';
import { GUARDED } from '../net/coopGuard';

// Re-export qua net/coop được coopGuard.test.ts phủ (import GUARDED từ coop).
describe('GĐ1000 — net/coopGuard tách khỏi net/coop', () => {
  it('khoá theo chỗ sửa', () => {
    expect(GUARDED.setPrice(['x'])).toBe('price:x');
    expect(GUARDED.buyQuanNuoc([])).toBe('quan');
  });
});
