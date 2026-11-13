import { describe, expect, it } from 'vitest';
import {
  LIFE_CRAFT_MINI, LIFE_EVENT_UNLOCK, lifeCraftBonus, lifeCraftFriendBonus, lifeEventById, nextGioDay, menuValue,
} from '../data/lifeEvent';
import { miniDefById } from '../data/festivalMini';
import { REGULARS } from '../data/regulars';
import { newGameData, useGame } from '../core/store';

/** Hệ 7 §7.6 — việc nhà dùng lại trò ② (giỗ) và ① (cưới): khéo tay → tiền công thêm lúc giao cỗ. */
describe('lifeCraft (pure)', () => {
  it('bonus tỉ lệ điểm, trần 10% giá trị mâm, chưa chơi = 0, kẹp', () => {
    expect(lifeCraftBonus(1000, undefined)).toBe(0);
    expect(lifeCraftBonus(1000, 0)).toBe(0);
    expect(lifeCraftBonus(1000, 50)).toBe(50);
    expect(lifeCraftBonus(1000, 100)).toBe(100);
    expect(lifeCraftBonus(1000, 999)).toBe(100);
  });
  it('khéo tay ≥80 thêm 1 thân thiết', () => {
    expect(lifeCraftFriendBonus(79)).toBe(0);
    expect(lifeCraftFriendBonus(80)).toBe(1);
    expect(lifeCraftFriendBonus(undefined)).toBe(0);
  });
  it('giỗ → viec_gio, cưới → viec_cuoi, đều có def mini hợp lệ không gắn dịp lễ', () => {
    for (const id of Object.values(LIFE_CRAFT_MINI)) {
      const d = miniDefById(id!)!;
      expect(d.festivals).toEqual([]);
      expect(d.unlock).toBeGreaterThanOrEqual(LIFE_EVENT_UNLOCK);
    }
    expect(LIFE_CRAFT_MINI.gio).toBe('viec_gio');
    expect(LIFE_CRAFT_MINI.cuoi).toBe('viec_cuoi');
  });
});

describe('lifeCraft (slice)', () => {
  const g = () => useGame.getState();
  function setup() {
    useGame.setState({
      ...newGameData(), level: LIFE_EVENT_UNLOCK, day: 120, money: 0, notify: () => {},
      regulars: Object.fromEntries(REGULARS.map((r) => [r.id, { friendship: 40, visits: 0, perks: [], discovered: [] }])),
    });
    const def = lifeEventById('gio_ba_nam')!;
    const eventDay = nextGioDay(def, 120);
    useGame.setState({ biz: { ...g().biz, lifeEvent: { defId: def.id, eventDay, tier: 0, accepted: false } } });
    return { def, eventDay };
  }
  function deliver(craft?: number) {
    const { def, eventDay } = setup();
    g().acceptLifeEvent(0);
    if (craft !== undefined) g().craftLifeEvent(craft);
    const stock: Record<string, number> = {};
    for (const id of Object.keys(def.menus[0])) stock[id] = 10;
    useGame.setState({ day: eventDay, storage: stock });
    expect(g().deliverLifeEvent()).toBe(true);
    return { pay: g().money, friend: g().regulars[def.host].friendship, def };
  }

  it('chưa nhận lời thì không ghi điểm; ghi một lần, lần sau bị bỏ qua', () => {
    setup();
    g().craftLifeEvent(90);
    expect(g().biz.lifeEvent?.craft).toBeUndefined();
    g().acceptLifeEvent(0);
    g().craftLifeEvent(60);
    g().craftLifeEvent(100);
    expect(g().biz.lifeEvent?.craft).toBe(60);
  });
  it('giao cỗ: có khéo tay → nhiều tiền hơn đúng phần thưởng; điểm cao → +1 thân thiết', () => {
    const base = deliver();
    const good = deliver(100);
    const bonus = lifeCraftBonus(menuValue(good.def.menus[0]), 100);
    expect(good.pay - base.pay).toBe(bonus);
    expect(bonus).toBeGreaterThan(0);
    expect(good.friend - base.friend).toBe(1);
  });
});
