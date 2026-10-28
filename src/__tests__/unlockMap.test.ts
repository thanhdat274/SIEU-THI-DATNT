import { describe, it, expect } from 'vitest';
import { SYSTEM_UNLOCKS, roadmapAhead, xpAwayTo, nextRoadmap, type SystemUnlock } from '../data/unlockMap';
import { xpToNext } from '../data/levels';
import { FEATURES } from '../data/levels';
import { COMBO_UNLOCK } from '../data/combos';
import { GARDEN_UNLOCK, LAND_TIERS } from '../data/garden';
import { SOCIAL_UNLOCK } from '../data/social';
import { ONLINE_UNLOCK } from '../data/online';
import { CONVENIENCE } from '../data/branches';
import { INSPECTION_UNLOCK } from '../data/biz';
import { COOK_UNLOCK } from '../data/recipes';
import { QUAN_NUOC_UNLOCK } from '../data/quanNuoc';
import { SHOP_TIERS } from '../data/shopTiers';
import { CHAPTERS, chapterById, type ChapterContext } from '../data/chapters';
import { PRESTIGE_MIN_LEVEL, PRESTIGE_MIN_REVENUE } from '../core/prestige';

const at = (id: string) => SYSTEM_UNLOCKS.find((s) => s.id === id)!;
const shopTierByName = (name: string) => SHOP_TIERS.find((t) => t.name === name)!;
const landByName = (name: string) => LAND_TIERS.find((t) => t.name === name)!;

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

  it('panel factory trả về object có type (mốc có bảng); mốc chương truyện tự vận hành không có bảng', () => {
    for (const s of SYSTEM_UNLOCKS) {
      if (s.panel) expect(typeof s.panel().type).toBe('string');
    }
    for (const id of ['ch10_mat_tien', 'ch11_dem_den_sang', 'ch12_ngo_nho_thanh_danh']) {
      expect(at(id).panel).toBeUndefined();
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

  it('level 1 → còn đủ toàn bộ mục trong bản đồ', () => {
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

// ───── GĐ168 — MỐC LỚN nạp lại bản đồ cho cấp 30+ (audit tiến trình 29/10, backlog mục 5) ─────
// Trước đây bản đồ dừng ở cấp 29 → từ cấp 30 badge 🗺️ = 0, panel rỗng, đúng lúc vào đoạn khô 31–44.

describe('GĐ168 — mốc lớn nạp lại bản đồ cấp 30+', () => {
  /** Ngữ cảnh chương truyện giả lập: mọi điều kiện phụ đã thỏa, chỉ thay level/shopTier. */
  const ctx = (level: number, shopTier = 0): ChapterContext => ({
    day: 999, level, customers: 9999, staffCount: 99, shopTier, hasRival: true, rivalsBeaten: 99,
  });

  it('snapshot: 20 mục, mảng xếp tăng dần theo cấp, mốc cuối = 75', () => {
    expect(SYSTEM_UNLOCKS.length).toBe(20);
    for (let i = 1; i < SYSTEM_UNLOCKS.length; i++) {
      expect(SYSTEM_UNLOCKS[i].atLevel).toBeGreaterThanOrEqual(SYSTEM_UNLOCKS[i - 1].atLevel);
    }
    expect(Math.max(...SYSTEM_UNLOCKS.map((s) => s.atLevel))).toBe(75);
    // mốc cuối là bộ đôi cấp 75: chương cuối + Đại siêu thị
    expect(at('ch12_ngo_nho_thanh_danh').atLevel).toBe(75);
    expect(at('tier_dai_sieu_thi').atLevel).toBe(shopTierByName('Đại siêu thị').unlock);
  });

  it('bậc tiệm (SHOP_TIERS): đúng cấp + đúng giá trong mô tả + bảng Xây dựng', () => {
    for (const [id, name] of [
      ['tier_mini_mart', 'Mini mart'],
      ['tier_sieu_thi', 'Siêu thị tạp hóa'],
      ['tier_khang_trang', 'Siêu thị khang trang'],
      ['tier_dai_sieu_thi', 'Đại siêu thị'],
    ] as const) {
      const t = shopTierByName(name);
      expect(at(id).name).toBe(name);
      expect(at(id).atLevel).toBe(t.unlock);
      expect(at(id).desc).toContain(`${t.price.toLocaleString('vi-VN')}đ`);
      expect(at(id).panel!()).toEqual({ type: 'build' }); // Mở rộng tiệm ở tab Xây dựng
    }
    expect(at('tier_mini_mart').atLevel).toBe(30);
    expect(at('tier_sieu_thi').atLevel).toBe(45);
    expect(at('tier_khang_trang').atLevel).toBe(58);
    expect(at('tier_dai_sieu_thi').atLevel).toBe(75);
  });

  it('đất trại (LAND_TIERS): đúng cấp + đúng giá + bảng Trang trại', () => {
    expect(at('land_mua_dat').atLevel).toBe(landByName('Mua thêm đất phía sau').unlock);
    expect(at('land_mua_dat').atLevel).toBe(16);
    expect(at('land_mua_dat').desc).toContain('15.000.000đ');
    expect(at('land_trai_dau_ngo').atLevel).toBe(landByName('Trang trại đầu ngõ').unlock);
    expect(at('land_trai_dau_ngo').atLevel).toBe(24);
    expect(at('land_trai_dau_ngo').desc).toContain('40.000.000đ');
    expect(at('land_mua_dat').panel!()).toEqual({ type: 'garden' });
    expect(at('land_trai_dau_ngo').panel!()).toEqual({ type: 'garden' });
  });

  it('chương truyện 10/11/12: id có thật + atLevel khớp hành vi when() thật của CHAPTERS', () => {
    for (const id of ['ch10_mat_tien', 'ch11_dem_den_sang', 'ch12_ngo_nho_thanh_danh']) {
      expect(chapterById(id)).toBeDefined();
      expect(at(id).icon).toBe('📖');
    }
    // Chương 10 cần CẢ bậc tiệm Siêu thị tạp hóa (shopTier ≥ 4) và cấp 40
    expect(chapterById('ch10_mat_tien')!.when(ctx(40, 4))).toBe(true);
    expect(chapterById('ch10_mat_tien')!.when(ctx(39, 4))).toBe(false);
    expect(chapterById('ch10_mat_tien')!.when(ctx(40, 3))).toBe(false);
    expect(chapterById('ch11_dem_den_sang')!.when(ctx(55))).toBe(true);
    expect(chapterById('ch11_dem_den_sang')!.when(ctx(54))).toBe(false);
    expect(chapterById('ch12_ngo_nho_thanh_danh')!.when(ctx(75))).toBe(true);
    expect(chapterById('ch12_ngo_nho_thanh_danh')!.when(ctx(74))).toBe(false);
    expect(at('ch10_mat_tien').atLevel).toBe(40);
    expect(at('ch11_dem_den_sang').atLevel).toBe(55);
    expect(at('ch12_ngo_nho_thanh_danh').atLevel).toBe(75);
  });

  it('tái sinh (NG+): khớp PRESTIGE_MIN_LEVEL thật, mô tả nhắc đủ doanh thu cả đời, bảng Kinh doanh', () => {
    expect(at('prestige_tai_sinh').atLevel).toBe(PRESTIGE_MIN_LEVEL);
    expect(at('prestige_tai_sinh').atLevel).toBe(60);
    expect(at('prestige_tai_sinh').desc).toContain('100.000.000đ'); // PRESTIGE_MIN_REVENUE
    expect(PRESTIGE_MIN_REVENUE).toBe(100_000_000);
    expect(at('prestige_tai_sinh').panel!()).toEqual({ type: 'business' });
  });

  it('đoạn khô 31–44 không còn rỗng: mọi cấp 30–44 đều còn ≥1 mục phía trước (badge sống lại)', () => {
    for (let level = 30; level <= 44; level++) {
      expect(roadmapAhead({ level, xp: 0 }).length).toBeGreaterThan(0);
    }
  });

  it('level 35 → ≥4 mục, đúng các mốc phía trước xếp trước→sau', () => {
    const road = roadmapAhead({ level: 35, xp: 0 });
    expect(road.length).toBeGreaterThanOrEqual(4);
    expect(road.map((r) => r.id)).toEqual([
      'ch10_mat_tien', 'tier_sieu_thi', 'ch11_dem_den_sang', 'tier_khang_trang',
      'prestige_tai_sinh', 'ch12_ngo_nho_thanh_danh', 'tier_dai_sieu_thi',
    ]);
    for (const r of road) expect(r.xpAway).toBeGreaterThan(0);
  });

  it('level 74 → còn bộ đôi 75; level 75+ → rỗng, không crash', () => {
    expect(roadmapAhead({ level: 74, xp: 0 }).map((r) => r.id)).toEqual(['ch12_ngo_nho_thanh_danh', 'tier_dai_sieu_thi']);
    expect(roadmapAhead({ level: 75, xp: 0 })).toEqual([]);
    expect(roadmapAhead({ level: 80, xp: 0 })).toEqual([]);
    expect(roadmapAhead({ level: 100, xp: 0 })).toEqual([]);
  });

  it('không trùng id sau khi thêm mốc (quét lại toàn catalog)', () => {
    const ids = SYSTEM_UNLOCKS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
