import { describe, expect, it } from 'vitest';
import { isSandboxUrl, SANDBOX } from '../core/save';

/** GĐ418 — chế độ chơi thử `?thu=1`: kho lưu riêng, không đụng save thật / cloud. */
describe('chế độ chơi thử', () => {
  it('chỉ bật đúng với ?thu=1', () => {
    expect(isSandboxUrl('?thu=1')).toBe(true);
    expect(isSandboxUrl('?a=2&thu=1')).toBe(true);
    expect(isSandboxUrl('')).toBe(false);
    expect(isSandboxUrl('?thu=0')).toBe(false);
  });
  it('test chạy ở chế độ thường', () => {
    expect(SANDBOX).toBe(false);
  });
});
