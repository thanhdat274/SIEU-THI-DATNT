import { describe, expect, it } from 'vitest';
import { installQuanNuocSync } from '../world/quanNuocSync';

describe('GĐ1005 — world/quanNuocSync tách khỏi main.tsx', () => {
  it('xuất installQuanNuocSync nhận world, lưới và tiệm', () => {
    expect(installQuanNuocSync.length).toBe(3);
  });
});
