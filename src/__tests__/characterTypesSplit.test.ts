import { describe, expect, it } from 'vitest';
import { SKIN_TONES as fromTypes } from '../render/characterTypes';
import { SKIN_TONES as fromModel } from '../render/characterModel';

describe('GĐ984 — render/characterTypes tách khỏi render/characterModel', () => {
  it('SKIN_TONES vẫn re-export cùng tham chiếu và đủ 4 tông da', () => {
    expect(fromModel).toBe(fromTypes);
    expect(Object.keys(fromTypes).sort()).toEqual(['elder', 'fair', 'natural', 'tanned']);
  });
});
