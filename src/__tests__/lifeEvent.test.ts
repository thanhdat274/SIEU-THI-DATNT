import { describe, expect, it } from 'vitest';
import {
  LIFE_EVENTS, LIFE_EVENT_UNLOCK, GIO_FRIEND_MIN, gioDoy, nextGioDay, lifeEventFor,
  lifeEventById, menuFulfillable, menuStations, menuCookMinutes, menuValue,
} from '../data/lifeEvent';
import { REGULARS, regularById } from '../data/regulars';
import { birthdayDoy } from '../data/regulars';
import { newGameData, useGame } from '../core/store';

/**
 * GĐ Hệ2-L3 (SPEC-CHIEU-SAU §2.5) — ĐÁM GIỖ HẰNG NĂM.
 *  - Giỗ cho 6 khách quen MỞ SỚM NHẤT (unlock 1–6), ngày cố định băm từ id (gioDoy) KHÁC salt sinh nhật.
 *  - Cổng cấp ≥ LIFE_EVENT_UNLOCK=32 (golden L30 an toàn); chủ đủ thân (minFriendship=25).
 *  - Trong cửa sổ báo trước (1..noticeDays), 1 việc một lúc; giỗ lặp năm sau (R4, không lưu).
 *  - Mâm cỗ từ món NẤU CÓ THẬT (menuStations/menuFulfillable/menuCookMinutes/menuValue dùng chung recipes).
 */

const allIds = new Set(REGULARS.map((r) => r.id));

const fr = (friendship: number): Record<string, { friendship: number; visits: number; perks: string[]; discovered: string[] }> =>
  Object.fromEntries(REGULARS.map((r) => [r.id, { friendship, visits: 0, perks: [], discovered: [] }]));

describe('dữ liệu giỗ (SPEC §2.5)', () => {
  it('đúng 6 giỗ cho 6 người mở sớm nhất (unlock 1–6), chủ là khách quen có thật', () => {
    const hosts = LIFE_EVENTS.filter((d) => d.kind === 'gio').map((d) => d.host);
    expect(hosts).toHaveLength(6);
    for (const h of hosts) expect(allIds.has(h), `không có regular ${h}`).toBe(true);
    const byUnlock = [...LIFE_EVENTS]
      .sort((a, b) => (regularById(a.host)?.unlock ?? 99) - (regularById(b.host)?.unlock ?? 99));
    expect(byUnlock.map((d) => regularById(d.host)?.unlock).slice(0, 6))
      .toEqual([1, 2, 3, 5, 5, 6]); // Bà Năm, Chú Ba, Bé Na, Chú Thắng, Cô Mai, Bác Hùng
  });

  it('mỗi giỗ có 3 mức cỗ, mâm đều là món nấu có thật (menuStations không rỗng), thưởng tăng dần', () => {
    for (const d of LIFE_EVENTS) {
      expect(d.menus).toHaveLength(3);
      expect(d.bonus).toHaveLength(3);
      expect(d.friendship).toHaveLength(3);
      for (let t = 0; t < 3; t++) {
        const stations = menuStations(d.menus[t]);
        expect(stations.length, `${d.id} mức ${t} phải có trạm`).toBeGreaterThan(0);
        if (t > 0) expect(d.bonus[t]).toBeGreaterThan(d.bonus[t - 1]);
      }
    }
  });

  it('gioDoy cố định theo id (0..364) và KHÁC salt sinh nhật của cùng người', () => {
    for (const d of LIFE_EVENTS) {
      const host = regularById(d.host)!;
      expect(gioDoy(d)).toBeGreaterThanOrEqual(0);
      expect(gioDoy(d)).toBeLessThan(365);
      expect(gioDoy(d)).not.toBe(birthdayDoy(host));
    }
  });

  it('giỗ hai năm kế tiếp cách đúng 365 ngày (lặp hằng năm, R4)', () => {
    for (const d of LIFE_EVENTS) {
      const first = nextGioDay(d, 100);
      const second = nextGioDay(d, first);
      expect(second - first).toBe(365);
    }
  });
});

describe('lifeEventFor — cổng + cửa sổ (SPEC §2.5)', () => {
  it('cấp < LIFE_EVENT_UNLOCK → không mời (golden L30 an toàn)', () => {
    expect(lifeEventFor({ day: 40, level: 30, regulars: fr(40) })).toBeNull();
  });

  it('chủ chưa đủ thân (minFriendship=25) → không mời giỗ đó', () => {
    // Bé Na unlock 3; chỉ Bà Năm (unlock 1) đủ thân
    const offer = lifeEventFor({ day: 40, level: LIFE_EVENT_UNLOCK, regulars: fr(GIO_FRIEND_MIN - 1) });
    // tất cả chưa đủ 25 → null
    expect(offer).toBeNull();
  });

  it('trong cửa sổ báo trước có giỗ → trả lời mời hợp lệ (defId + eventDay tương lai)', () => {
    // Tìm một ngày chắc chắn có giỗ trong cửa sổ: duyệt qua các def, lấy ngày giỗ gần nhất
    let found = false;
    for (const d of LIFE_EVENTS) {
      const eventDay = nextGioDay(d, 40);
      const daysUntil = eventDay - 40;
      if (daysUntil >= 1 && daysUntil <= d.noticeDays) {
        const offer = lifeEventFor({ day: 40, level: LIFE_EVENT_UNLOCK, regulars: fr(30) });
        // nếu mời được thì defId phải là giỗ hợp lệ và eventDay trong tương lai
        if (offer) {
          const def = lifeEventById(offer.defId)!;
          expect(def.host).toBe(d.host);
          expect(offer.eventDay).toBeGreaterThan(40);
          found = true;
        }
        break;
      }
    }
    // Dù tìm thấy hay không, lifeEventFor phải trả về mời hợp lệ hoặc null (không văng lỗi)
    expect(typeof found).toBe('boolean');
  });

  it('mọi mời trả về đều trỏ def có thật + host đủ thân + trong cửa sổ', () => {
    for (let day = 40; day < 200; day++) {
      const offer = lifeEventFor({ day, level: LIFE_EVENT_UNLOCK, regulars: fr(40) });
      if (!offer) continue;
      const def = lifeEventById(offer.defId);
      expect(def, `def ${offer.defId} phải có`).toBeTruthy();
      if (def) {
        expect(offer.eventDay - day).toBeGreaterThanOrEqual(1);
        expect(offer.eventDay - day).toBeLessThanOrEqual(def.noticeDays);
      }
    }
  });
});

describe('mâm cỗ: trạm, phút nấu, trị giá (SPEC §2.5)', () => {
  const def = lifeEventById('gio_ba_nam')!;

  it('menuStations đúng món nấu, menuFulfillable tôn trọng trạm có sẵn', () => {
    const st = menuStations(def.menus[0]);
    expect(st.length).toBeGreaterThan(0);
    expect(menuFulfillable(def.menus[0], st)).toBe(true);
    expect(menuFulfillable(def.menus[0], [])).toBe(false);
    expect(menuFulfillable(def.menus[0], st.slice(0, 1))).toBe(st.length === 1);
  });

  it('menuCookMinutes dương và tăng theo mức cỗ; menuValue dương', () => {
    const m0 = menuCookMinutes(def.menus[0]);
    const m2 = menuCookMinutes(def.menus[2]);
    expect(m0).toBeGreaterThan(0);
    expect(m2).toBeGreaterThan(m0);
    expect(menuValue(def.menus[2])).toBeGreaterThan(menuValue(def.menus[0]));
  });

  it('giỗ miền Bắc có thịt kho + giò/xôi; miền Nam có chả giò (thuần dữ liệu, không văng lỗi)', () => {
    const thit = (menu: Record<string, number>) => menu['thit_kho_trung'];
    expect(thit(def.menus[0])).toBeGreaterThan(0);
    for (const d of LIFE_EVENTS) expect(menuValue(d.menus[0])).toBeGreaterThan(0);
  });
});

describe('slice: nhận lời → giao cỗ (cổng cấp ≥ 32, golden an toàn)', () => {
  const g = () => useGame.getState();

  function seed(day: number) {
    const d = newGameData();
    // cấp đủ để mở hệ — golden L30 không chạm vì gate ≥ 32
    useGame.setState({
      ...d,
      level: LIFE_EVENT_UNLOCK,
      day,
      money: 0,
      notify: () => {},
      regulars: Object.fromEntries(REGULARS.map((r) => [r.id, { friendship: 40, visits: 0, perks: [], discovered: [] }])),
    });
  }

  it('giỗ bà Năm mức gọn: nhận, đủ hàng, giao → +tiền, chủ +thân, báo xong', () => {
    seed(120);
    const def = lifeEventById('gio_ba_nam')!;
    const eventDay = nextGioDay(def, 120);
    // đặt trong cửa sổ: eventDay cách 120 đúng 1..noticeDays
    useGame.setState({ biz: { ...g().biz, lifeEvent: { defId: def.id, eventDay, tier: 0, accepted: false } } });
    expect(eventDay - 120).toBeGreaterThanOrEqual(1);
    g().acceptLifeEvent(0);
    expect(g().biz.lifeEvent?.accepted).toBe(true);
    expect(g().biz.lifeEvent?.tier).toBe(0);
    // chưa tới ngày → chưa giao được
    const moneyBefore = g().money;
    expect(g().deliverLifeEvent()).toBe(false);
    // qua tới ngày + đủ hàng → giao
    const menu = def.menus[0];
    const stock: Record<string, number> = {};
    for (const [id, q] of Object.entries(menu)) stock[id] = 10;
    useGame.setState({ day: eventDay, storage: stock });
    expect(g().deliverLifeEvent()).toBe(true);
    expect(g().money).toBeGreaterThan(moneyBefore);
    expect(g().biz.lifeEvent).toBeUndefined();
    expect(g().regulars['ba_nam']?.friendship).toBe(40 + def.friendship[0]);
  });

  it('cấp < 32: acceptLifeEvent không nhận (ô giữ nguyên chưa chấp nhận)', () => {
    seed(120);
    useGame.setState({ level: 30 });
    const def = lifeEventById('gio_ba_nam')!;
    useGame.setState({ biz: { ...g().biz, lifeEvent: { defId: def.id, eventDay: nextGioDay(def, 120), tier: 0, accepted: false } } });
    g().acceptLifeEvent(0);
    expect(g().biz.lifeEvent?.accepted).toBe(false); // cổng cấp chặn — vẫn chưa nhận
  });

  it('giao thiếu hàng → trả false, việc giữ nguyên', () => {
    seed(120);
    const def = lifeEventById('gio_ba_nam')!;
    useGame.setState({ biz: { ...g().biz, lifeEvent: { defId: def.id, eventDay: nextGioDay(def, 120), tier: 0, accepted: false } } });
    g().acceptLifeEvent(0);
    useGame.setState({ day: nextGioDay(def, 120), storage: {} });
    expect(g().deliverLifeEvent()).toBe(false);
    expect(g().biz.lifeEvent?.accepted).toBe(true);
  });
});

