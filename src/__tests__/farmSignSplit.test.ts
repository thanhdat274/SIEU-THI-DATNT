import { describe, expect, it } from 'vitest';
import * as sign from '../world/farmSign';

describe('GĐ997 — world/farmSign tách khỏi world/farm', () => {
  it('xuất signTexture', () => {
    expect(typeof sign.signTexture).toBe('function');
  });
});
