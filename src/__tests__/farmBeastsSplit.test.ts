import { describe, expect, it } from 'vitest';
import { ANIMAL_ORDER } from '../data/garden';
import { createBeastMakers } from '../world/farmBeasts';

describe('GĐ986 — world/farmBeasts tách khỏi world/farm', () => {
  it('mỗi loài vật nuôi dựng được một Beast có thân và bước chân', () => {
    const makers = createBeastMakers();
    for (const kind of ANIMAL_ORDER) {
      const b = makers[kind]();
      expect(b.root.children.length).toBeGreaterThan(0);
      expect(Array.isArray(b.legs)).toBe(true);
      expect(b.wait).toBeGreaterThanOrEqual(0);
    }
  });
});
