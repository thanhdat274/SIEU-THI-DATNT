import { describe, expect, it } from 'vitest';
import { getVolume, setVolume, VOL_DEFAULT } from '../core/audio';

describe('âm lượng theo kênh', () => {
  it('mặc định 100% và kẹp trong 0..1', () => {
    expect(getVolume('music')).toBe(VOL_DEFAULT.music);
    setVolume('music', 5);
    expect(getVolume('music')).toBe(1);
    setVolume('music', -1);
    expect(getVolume('music')).toBe(0);
    setVolume('music', 0.4);
    expect(getVolume('music')).toBe(0.4);
  });
});
