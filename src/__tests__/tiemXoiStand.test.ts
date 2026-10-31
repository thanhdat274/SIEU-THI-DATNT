import { describe, expect, it } from 'vitest';
import { tiemXoiStandState, TIEM_XOI_UNLOCK } from '../data/tiemXoi';

/** GĐ430 — tiệm xôi 3D. */
describe('tiemXoiStandState', () => {
  it('ẩn → đất → sạp', () => {
    expect(tiemXoiStandState(TIEM_XOI_UNLOCK - 1, false)).toBe('hidden');
    expect(tiemXoiStandState(TIEM_XOI_UNLOCK, false)).toBe('lot');
    expect(tiemXoiStandState(1, true)).toBe('open');
  });
});
