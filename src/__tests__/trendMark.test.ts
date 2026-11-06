import { describe, it, expect } from 'vitest';
import { trendMark } from '../ui/trendMark';

describe('Playtest P1 A1 — dấu ▲▼ cạnh lãi/lỗ', () => {
  it('lãi ▲, lỗ ▼, hòa không dấu', () => {
    expect(trendMark(1000)).toBe('▲ ');
    expect(trendMark(-1)).toBe('▼ ');
    expect(trendMark(0)).toBe('');
  });
});
