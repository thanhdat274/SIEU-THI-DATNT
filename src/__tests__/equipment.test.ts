import { describe, expect, it } from 'vitest';
import {
  EQUIPMENT, EQUIP_TIERS, equipBlock, equipSpeed, powerCapacity, powerSurcharge, powerUsed,
} from '../data/equipment';
import { useGame } from '../core/store';
import { upgradeEquip } from '../core/biz';

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
    const all = { equip: { fryer: 5, food_grill: 5, steamer: 5 } };
    expect(powerSurcharge(all, 60)).toBe((18 - powerCapacity(60)) * 15_000);
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
