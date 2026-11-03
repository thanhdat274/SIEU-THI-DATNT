import { describe, expect, it } from 'vitest';
import * as tex from '../world/buildingTextures';

describe('GĐ976 — world/buildingTextures tách khỏi world/buildings', () => {
  it('xuất đủ 5 hàm tạo texture', () => {
    for (const n of ['roofTexture', 'tileTexture', 'signTexture', 'qrTexture', 'screenTexture'] as const) {
      expect(typeof tex[n]).toBe('function');
    }
  });
});
