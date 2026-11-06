import { describe, it, expect } from 'vitest';
import { bedHint } from '../data/bedHint';
import { SLEEP_FROM } from '../core/gameTypes';

describe('Playtest P0 T3 — gợi ý giường', () => {
  it('trước 18h không hiện "Đi ngủ"', () => {
    expect(bedHint(false, false, 8 * 60)).toBe('');
    expect(bedHint(false, false, SLEEP_FROM - 1)).toBe('');
  });
  it('từ 18h hiện "[N] Đi ngủ"', () => {
    expect(bedHint(false, false, SLEEP_FROM)).toBe('[N] Đi ngủ');
  });
  it('đang ngủ giữ thông báo cũ', () => {
    expect(bedHint(true, false, 23 * 60)).toBe('💤 Đang ngủ...');
    expect(bedHint(true, true, 23 * 60)).toContain('[N] Dậy');
  });
});
