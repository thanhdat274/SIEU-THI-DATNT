import { describe, expect, it } from 'vitest';
import {
  EQUIPMENT, EQUIP_TIERS, POWER_TIERS, basePowerCapacity, electricActive, equipBlock, equipSpeed, powerBlock, powerCapacity, powerSurcharge, powerUsed,
} from '../data/equipment';
import { useGame } from '../core/store';
import { upgradeEquip, upgradePower } from '../core/biz';

describe('thiết bị 5 bậc — dữ liệu', () => {
  it('bậc 1 không đổi gì; bậc cao nhanh hơn, tốn điện hơn, đắt hơn', () => {
    expect(equipSpeed(undefined, 'fryer')).toBe(1);
    expect(equipSpeed({}, 'drink_counter')).toBe(1);
    for (let t = 2; t <= 5; t++) {
      const a = EQUIP_TIERS[(t - 1) as 1], b = EQUIP_TIERS[t as 2];
      expect(b.speed).toBeGreaterThan(a.speed);
      expect(b.kw).toBeGreaterThan(a.kw);
      expect(b.price).toBeGreaterThan(a.price);
    }
  });
  it('chưa nâng gì thì không phụ phí ở mọi cấp', () => {
    for (const lv of [1, 30, 100]) expect(powerSurcharge(undefined, lv)).toBe(0);
    expect(powerUsed(undefined)).toBe(EQUIPMENT.length);
  });
  it('tất cả bậc 5 ở cấp 60 vượt hạn mức → có phụ phí', () => {
    const all = { equip: Object.fromEntries(EQUIPMENT.map((e) => [e.id, 5])) };
    expect(powerSurcharge(all, 60)).toBe((EQUIPMENT.length * EQUIP_TIERS[5].kw - powerCapacity(60)) * 15_000);
  });
  it('chặn: mở cửa, thiếu cấp, thiếu tiền, bậc tối đa', () => {
    expect(equipBlock({}, 'fryer', 30, 1e9, true)).toBe('open');
    expect(equipBlock({}, 'fryer', 5, 1e9, false)).toBe('level');
    expect(equipBlock({}, 'fryer', 30, 0, false)).toBe('money');
    expect(equipBlock({}, 'fryer', 30, 1e9, false)).toBeNull();
    expect(equipBlock({ equip: { fryer: 5 } }, 'fryer', 99, 1e9, false)).toBe('max');
  });
});

describe('thiết bị 5 bậc — mua', () => {
  it('đóng cửa + đủ tiền thì lên bậc 2 và trừ tiền; đang mở cửa thì không', () => {
    useGame.setState({ level: 30, money: 5_000_000, shopOpen: true, biz: { ...useGame.getState().biz, equip: undefined } } as never);
    upgradeEquip('fryer');
    expect(useGame.getState().biz.equip?.fryer).toBeUndefined();
    useGame.setState({ shopOpen: false } as never);
    upgradeEquip('fryer');
    expect(useGame.getState().biz.equip?.fryer).toBe(2);
    expect(useGame.getState().money).toBe(5_000_000 - EQUIP_TIERS[2].price);
  });
});

describe('hạn mức điện nâng được + đồ điện khác', () => {
  const fridges = (n: number) => Array.from({ length: n }, () => ({ type: 'fridge' }));
  it('đồ điện (tủ mát, camera, POS) cộng vào tải; đồ dùng thử thì không', () => {
    expect(powerUsed(undefined, fridges(2))).toBe(EQUIPMENT.length + 0.8);
    expect(powerUsed({ upgrades: ['camera', 'pos'] })).toBe(EQUIPMENT.length + 0.2);
    expect(powerUsed(undefined, [{ type: 'freezer', trial: true }])).toBe(EQUIPMENT.length);
  });
  it('chưa nâng gì thì không bao giờ phụ phí dù có nhiều tủ (golden an toàn)', () => {
    expect(electricActive(undefined)).toBe(false);
    expect(powerSurcharge(undefined, 1, fridges(40))).toBe(0);
  });
  it('nâng một trạm thì hệ điện bật: nhiều tủ làm vượt hạn mức → phụ phí', () => {
    const b = { equip: { fryer: 2 } };
    expect(electricActive(b)).toBe(true);
    expect(powerSurcharge(b, 1, fridges(10))).toBeGreaterThan(0);
  });
  it('hạn mức tăng đúng theo bậc điện và bậc cao hơn thì rộng hơn', () => {
    for (let t = 1; t < POWER_TIERS.length; t++) {
      expect(POWER_TIERS[t].bonus).toBeGreaterThan(POWER_TIERS[t - 1].bonus);
      expect(POWER_TIERS[t].price).toBeGreaterThan(POWER_TIERS[t - 1].price);
    }
    expect(powerCapacity(20, { powerTier: 2 })).toBe(basePowerCapacity(20) + POWER_TIERS[2].bonus);
    const b = { equip: { fryer: 5, food_grill: 5, steamer: 5 }, powerTier: 0 };
    expect(powerSurcharge({ ...b, powerTier: 4 }, 30)).toBeLessThan(powerSurcharge(b, 30));
  });
  it('chặn nâng điện: mở cửa, thiếu cấp, thiếu tiền, bậc tối đa', () => {
    expect(powerBlock({}, 30, 1e9, true)).toBe('open');
    expect(powerBlock({}, 1, 1e9, false)).toBe('level');
    expect(powerBlock({}, 30, 0, false)).toBe('money');
    expect(powerBlock({}, 30, 1e9, false)).toBeNull();
    expect(powerBlock({ powerTier: POWER_TIERS.length - 1 }, 99, 1e9, false)).toBe('max');
  });
  it('mua nâng điện: đóng cửa + đủ tiền thì lên bậc 1 và trừ tiền', () => {
    useGame.setState({ level: 30, money: 5_000_000, shopOpen: true, biz: { ...useGame.getState().biz, powerTier: undefined } } as never);
    upgradePower();
    expect(useGame.getState().biz.powerTier).toBeUndefined();
    useGame.setState({ shopOpen: false } as never);
    upgradePower();
    expect(useGame.getState().biz.powerTier).toBe(1);
    expect(useGame.getState().money).toBe(5_000_000 - POWER_TIERS[1].price);
  });
});
