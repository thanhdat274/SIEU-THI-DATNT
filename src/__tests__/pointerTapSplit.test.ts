import { describe, expect, it } from 'vitest';
import { installPointerTap } from '../shop/pointerTap';

describe('GĐ1003 — shop/pointerTap tách khỏi main.tsx', () => {
  it('xuất installPointerTap nhận 6 tham số', () => {
    expect(installPointerTap.length).toBe(6);
  });
});
