import { describe, expect, it } from 'vitest';
import { useGame, type Furniture } from '../core/store';
import { runBranch } from '../core/slices/branch';
import { furnitureDef } from '../data/furniture';
import { shelfLife, spoilRate } from '../data/freshness';
import { requiredLicenses } from '../data/licenses';
import {
  EYE_LEVEL_BONUS, FLOOR_LEVEL_PENALTY, eyeRow, rowFactor, shelfEfficiency, stockedAttention, type ShopGeom,
} from '../data/layout';
import { BUTCHER_DEMAND_PER_STAR, NO_BUTCHER_DEMAND, isMeat, meatDemandFactor } from '../data/meat';
import { CATEGORIES, PRODUCTS, caseSize, productById } from '../data/products';
import { ROLES, bestSkillOnDuty, type Staff } from '../data/staff';
import { newBranch } from '../data/branches';

/** Gói B: chấm điểm bố trí kệ (tầng ngang tầm mắt, lời trên m²) và quầy thịt cá tươi. */

const geom: ShopGeom = { width: 8, depth: 5, paySpots: [{ x: 0, z: 0 }] };
const shelf = (uid: number, tiers: Furniture['tiers'], type: Furniture['type'] = 'shelf'): Furniture =>
  ({ uid, type, x: 0, z: 1.8, rot: 0, tiers });

describe('tầng ngang tầm mắt', () => {
  it('kệ 3–4 tầng: có một tầng ngang tầm mắt ở giữa; kệ 2 tầng thì không phân biệt', () => {
    expect(eyeRow(3)).toBe(1);
    expect(eyeRow(4)).toBe(2);
    expect(eyeRow(2)).toBe(-1);
    expect(rowFactor(1, 3)).toBe(EYE_LEVEL_BONUS);
    expect(rowFactor(0, 3)).toBe(FLOOR_LEVEL_PENALTY);
    expect(rowFactor(2, 3)).toBe(1);
    expect(rowFactor(0, 2)).toBe(1);
    expect(rowFactor(1, 2)).toBe(1);
  });

  it('cùng một kệ: món ở tầng ngang tầm mắt được để ý nhiều hơn món sát sàn', () => {
    const slots = furnitureDef('shelf').slots;
    const tiers: Furniture['tiers'] = Array.from({ length: furnitureDef('shelf').tiers * slots }, () => ({ productId: null, count: 0 }));
    tiers[0] = { productId: 'mi', count: 3 };          // tầng sát sàn
    tiers[slots] = { productId: 'nuoc', count: 3 };    // tầng giữa = ngang tầm mắt
    const att = stockedAttention([shelf(1, tiers)], geom);
    expect(att.nuoc).toBeGreaterThan(att.mi);
    expect(att.nuoc / att.mi).toBeCloseTo(EYE_LEVEL_BONUS / FLOOR_LEVEL_PENALTY, 5);
  });
});

describe('lời trên mỗi m²', () => {
  it('xếp kệ theo lời/m²/ngày: kệ nhỏ lời đều hơn kệ lớn lời bằng nhau', () => {
    const list = [shelf(1, []), shelf(2, [], 'bigShelf'), shelf(3, [])];
    const perf = { 1: { profit: 100_000, since: 1 }, 2: { profit: 100_000, since: 1 } };
    const out = shelfEfficiency(list, perf, 5);
    expect(out.map((e) => e.uid)).toEqual([1, 2]); // kệ 3 chưa bán gì nên không có dòng
    expect(out[0].perM2Day).toBeGreaterThan(out[1].perM2Day); // kệ gỗ 1.8×0.5 nhỏ hơn kệ siêu thị 2.4×0.6
    expect(out[0].days).toBe(5);
  });

  it('bán qua takeFromShelf thì kệ ghi lời = giá khách trả − giá vốn', () => {
    const base = useGame.getState();
    const f: Furniture = { uid: 77, type: 'shelf', x: 0, z: 1.8, rot: 0, tiers: [{ productId: 'mi', count: 5 }] };
    useGame.setState({ furniture: [f], shelfHeat: {}, shelfProfit: {}, day: 4 });
    const price = useGame.getState().takeFromShelf('mi', 77);
    const perf = useGame.getState().shelfProfit[77];
    expect(price).toBeGreaterThan(0);
    expect(perf.profit).toBe(price! - productById('mi').buy);
    expect(perf.since).toBe(4);
    useGame.getState().takeFromShelf('mi', 77);
    expect(useGame.getState().shelfProfit[77].since).toBe(4);
    useGame.setState({ furniture: base.furniture, shelfHeat: base.shelfHeat, shelfProfit: base.shelfProfit, day: base.day });
  });
});

describe('quầy thịt cá tươi', () => {
  const meats = PRODUCTS.filter((p) => p.category === 'meat');

  it('có nhiều món thịt cá tươi, hạn ngắn, thùng nhỏ, mỗi món lời dương', () => {
    expect(meats.length).toBeGreaterThanOrEqual(6);
    for (const p of meats) {
      expect(isMeat(p.id)).toBe(true);
      expect(p.sell).toBeGreaterThan(p.buy);
      expect(shelfLife(p.id)).toBeLessThanOrEqual(2);
      expect(caseSize(p.id)).toBeLessThanOrEqual(6);
      expect(p.unlock).toBeGreaterThanOrEqual(furnitureDef('meat_counter').unlock);
    }
    expect(CATEGORIES.meat).toBeTruthy();
  });

  it('chỉ quầy thịt cá bày được thịt cá tươi; quầy rau quả và kệ thường thì không', () => {
    expect(furnitureDef('meat_counter').categories).toEqual(['meat']);
    for (const t of ['shelf', 'bigShelf', 'fridge', 'freezer', 'produce'] as const) expect(furnitureDef(t).categories).not.toContain('meat');
  });

  it('để trong quầy mát giữ hàng, để ở kho thường thì hỏng nhanh hơn', () => {
    expect(spoilRate('thit_heo_tuoi', 'meat_counter', 'cloudy')).toBe(1);
    expect(spoilRate('thit_heo_tuoi', 'storage', 'cloudy')).toBeGreaterThan(2);
    expect(spoilRate('thit_heo_tuoi', 'storage', 'sunny')).toBeGreaterThan(spoilRate('thit_heo_tuoi', 'storage', 'cloudy'));
  });

  it('bày thịt cá tươi thì tiệm phải có chứng nhận an toàn thực phẩm', () => {
    expect(requiredLicenses({ level: 40, hasCookStation: false, shelved: ['thit_heo_tuoi'] })).toContain('food');
    expect(requiredLicenses({ level: 40, hasCookStation: false, shelved: ['mi'] })).not.toContain('food');
  });

  it('người bán thịt cá: có vai trò riêng, khách ít mua thịt cá khi vắng và mua nhiều hơn theo tay nghề', () => {
    expect(ROLES.butcher.unlock).toBe(furnitureDef('meat_counter').unlock);
    expect(meatDemandFactor('mi', 0)).toBe(1);
    expect(meatDemandFactor('thit_heo_tuoi', 0)).toBe(NO_BUTCHER_DEMAND);
    expect(meatDemandFactor('thit_heo_tuoi', 3)).toBeCloseTo(1 + 3 * BUTCHER_DEMAND_PER_STAR, 5);
    expect(meatDemandFactor('thit_heo_tuoi', 5)).toBeGreaterThan(meatDemandFactor('thit_heo_tuoi', 2));
    const st = (role: Staff['role'], skill: number, shift: Staff['shift'] = 'morning') => ({ role, skill, shift });
    expect(bestSkillOnDuty([st('butcher', 4)], 'butcher', 9 * 60)).toBe(4);
    expect(bestSkillOnDuty([st('butcher', 4)], 'butcher', 20 * 60)).toBe(0);
  });

  it('chi nhánh tiện lợi không chở thịt cá tươi sang (không có quầy thịt cá)', () => {
    const base = useGame.getState();
    const b = newBranch();
    b.open = true;
    b.simAt = 8 * 60;
    b.staff = [
      { id: 1, name: 'A', role: 'cashier', skill: 3, wage: 100_000, shift: 'morning' },
      { id: 2, name: 'B', role: 'courier', skill: 3, wage: 100_000, shift: 'morning' },
    ] as Staff[];
    const s: any = {
      ...base, branch: b, money: 1_000_000, atBranch: false, day: 3, level: 40, storage: { thit_heo_tuoi: 20, mi: 200 }, storageLots: {},
      stats: { ...base.stats }, garden: { ...base.garden, homegrown: {} }, notify: () => {},
    };
    const out = runBranch(() => s, 9 * 60);
    expect(out.branch!.shelf.thit_heo_tuoi).toBeUndefined();
    expect(out.branch!.shelf.mi ?? 0).toBeGreaterThan(0);
  });
});
