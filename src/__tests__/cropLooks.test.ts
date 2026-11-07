import { describe, expect, it } from 'vitest';
import { CROPS } from '../data/garden';
import { cropHasLook } from '../world/farmCrops';

describe('GĐ1656 — mọi giống có dáng riêng', () => {
  it('không giống nào rơi về dáng cây ăn trái mặc định', () => {
    for (const c of CROPS) expect(cropHasLook(c.id), c.id).toBe(true);
  });
});
