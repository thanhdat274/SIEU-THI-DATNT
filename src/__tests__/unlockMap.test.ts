import { describe, it, expect } from 'vitest';
import { SYSTEM_UNLOCKS, roadmapAhead, xpAwayTo, nextRoadmap, type SystemUnlock } from '../data/unlockMap';
import { xpToNext } from '../data/levels';
import { FEATURES } from '../data/levels';
import { COMBO_UNLOCK } from '../data/combos';
import { GARDEN_UNLOCK } from '../data/garden';
import { SOCIAL_UNLOCK } from '../data/social';
import { ONLINE_UNLOCK } from '../data/online';
import { CONVENIENCE } from '../data/branches';
import { INSPECTION_UNLOCK } from '../data/biz';
import { COOK_UNLOCK } from '../data/recipes';
import { QUAN_NUOC_UNLOCK } from '../data/quanNuoc';

const at = (id: string) => SYSTEM_UNLOCKS.find((s) => s.id === id)!;

describe('SYSTEM_UNLOCKS — catalog hợp lệ', () => {
  it('mọi hệ đều có id unique + atLevel > 0 + tên/mô tả/icon', () => {
    const ids = new Set<string>();
    for (const s of SYSTEM_UNLOCKS) {
      expect(ids.has(s.id)).toBe(false);
      ids.add(s.id);
      expect(s.atLevel).toBeGreaterThan(0);
      expect(s.name.length).toBeGreaterThan(0);
      expect(s.desc.length).toBeGreaterThan(0);
      expect(s.icon.length).toBeGreaterThan(0);
    }
  });

  it('panel factory trả về object có type', () => {
    for (const s of SYSTEM_UNLOCKS) {
      const p = s.panel();
      expect(typeof p.type).toBe('string');
    }
  });

  it('atLevel khớp đúng hằng số thật từ data', () => {
    expect(at('prices').atLevel).toBe(FEATURES.prices);
    expect(at('staff').atLevel).toBe(FEATURES.staff);
    expect(at('combos').atLevel).toBe(COMBO_UNLOCK);
    expect(at('garden').atLevel).toBe(GARDEN_UNLOCK);
    expect(at('social').atLevel).toBe(SOCIAL_UNLOCK);
    expect(at('online').atLevel).toBe(ONLINE_UNLOCK);
    expect(at('branch').atLevel).toBe(CONVENIENCE.unlock);
    expect(at('licenses').atLevel).toBe(INSPECTION_UNLOCK);
    expect(at('cook').atLevel).toBe(COOK_UNLOCK);
    expect(at('quannuoc').atLevel).toBe(QUAN_NUOC_UNLOCK);
  });

  it('catalog bao gồm các HỆ LỚN mà unlocksAt(levels) bỏ sót (combo/social/online/branch/licenses/cook)', () => {
    const ids = SYSTEM_UNLOCKS.map((s) => s.id);
    for (const id of ['combos', 'social', 'online', 'branch', 'licenses', 'cook']) {
      expect(ids).toContain(id);
    }
  });
});

describe('roadmapAhead — chưa mở khóa, xếp trước→sau', () => {
  it('chỉ trả hệ atLevel > level, sort tăng dần', () => {
    const level = 7;
    const road = roadmapAhead({ level, xp: 0 });
    expect(road.length).toBeGreaterThan(0);
    for (const r of road) expect(r.atLevel).toBeGreaterThan(level);
    for (let i = 1; i < road.length; i++) expect(road[i - 1].atLevel).toBeLessThanOrEqual(road[i].atLevel);
  });

  it('deterministic với cùng level/xp', () => {
    const a = roadmapAhead({ level: 10, xp: 123 });
    const b = roadmapAhead({ level: 10, xp: 123 });
    expect(a.map((r) => r.id)).toEqual(b.map((r) => r.id));
    expect(a.map((r) => r.xpAway)).toEqual(b.map((r) => r.xpAway));
  });

  it('level 1 → còn đủ 10 hệ', () => {
    expect(roadmapAhead({ level: 1, xp: 0 }).length).toBe(SYSTEM_UNLOCKS.length);
  });

  it('level 80 → roadmap rỗng (đã mở hết)', () => {
    expect(roadmapAhead({ level: 80, xp: 0 })).toEqual([]);
  });

  it('level 10, xp=0 → các hệ 12/21/29 với xpAway khớp tổng xpToNext', () => {
    const road = roadmapAhead({ level: 10, xp: 0 });
    const got = Object.fromEntries(road.map((r) => [r.id, r.xpAway]));
    expect(got['licenses']).toBe(xpToNext(10) + xpToNext(11)); // cấp 12
    expect(got['cook']).toBe(xpToNext(10) + xpToNext(11) + xpToNext(12) + xpToNext(13) + xpToNext(14) + xpToNext(15) + xpToNext(16) + xpToNext(17) + xpToNext(18) + xpToNext(19) + xpToNext(20)); // cấp 21
  });

  it('xpAwayTo phản ánh xp hiện có (trừ bớt phần xp đã làm ở cấp hiện tại)', () => {
    const lv = 10, xp = 50;
    expect(xpAwayTo(lv, xp, 12)).toBe(xpToNext(10) - 50 + xpToNext(11));
  });
});

describe('nextRoadmap', () => {
  it('trả hệ gần nhất phía trước', () => {
    const road = roadmapAhead({ level: 5, xp: 0 });
    expect(nextRoadmap(road)!.id).toBe('combos'); // cấp 6 gần nhất
  });
  it('null khi hết hệ phía trước', () => {
    expect(nextRoadmap([])).toBeNull();
  });
});
