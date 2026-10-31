import { describe, it, expect } from 'vitest';
import { ACHIEVEMENTS } from '../data/biz';
import { TITLES } from '../data/titles';

describe('Mốc dài hơi (thành tựu + danh hiệu) nhất quán', () => {
  it('thành tựu: id không trùng, có tên/mô tả, thưởng dương', () => {
    const ids = ACHIEVEMENTS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const a of ACHIEVEMENTS) {
      expect(a.name).toBeTruthy();
      expect(a.desc).toBeTruthy();
      expect(a.reward).toBeGreaterThan(0);
    }
  });

  it('mốc càng xa càng trả thưởng cao (trong cùng họ mốc)', () => {
    for (const family of ['items_', 'rev_', 'cust_', 'level_']) {
      const f = ACHIEVEMENTS.filter((a) => a.id.startsWith(family)).sort((a, b) => a.reward - b.reward);
      for (let i = 1; i < f.length; i++) {
        expect(f[i].reward).toBeGreaterThan(f[i - 1].reward);
      }
    }
  });

  it('danh hiệu: id không trùng và có tên + mô tả', () => {
    const ids = TITLES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const t of TITLES) {
      expect(t.name).toBeTruthy();
      expect(t.description).toBeTruthy();
    }
  });

  it('id thành tựu và danh hiệu không đụng nhau', () => {
    const ach = new Set(ACHIEVEMENTS.map((a) => a.id));
    for (const t of TITLES) expect(ach.has(t.id)).toBe(false);
  });
});
