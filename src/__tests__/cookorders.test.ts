import { beforeEach, describe, expect, it } from 'vitest';
import { newGameData, useGame, type Furniture } from '../core/store';
import { COOKED_PRODUCT_IDS, RECIPES, COOK_UNLOCK } from '../data/recipes';
import {
  COOK_ORDER_MINUTES, COOK_ORDER_MUL, DELIVERY_MINUTES, PHONE_SLOTS, phoneCallFor, phoneOrderValue,
} from '../data/phoneOrders';
import { REGULARS, reserveAsk } from '../data/regulars';

/** Bộ test B5 — nấu theo đơn: điện thoại đặt món nhà làm giá hời, khách quen đặt suất nấu. */

describe('phoneCallFor — đơn nấu món nhà làm', () => {
  it('có trạm nấu + đủ cấp: một phần cuộc gọi là đơn nấu (món nhà làm, giá hời, hẹn lâu hơn để kịp nấu)', () => {
    const stations = ['sugarcane_press', 'drink_counter'] as const;
    let cook = 0, normal = 0;
    for (let seed = 1; seed < 300; seed++) {
      const o = phoneCallFor(seed, 30, 2, 25, {}, 1, 'sunny', {}, [...stations]);
      if (!o) continue;
      if (o.premium) {
        cook++;
        const [id, qty] = Object.entries(o.items)[0];
        expect(COOKED_PRODUCT_IDS.has(id), `${id} phải là món nhà làm`).toBe(true);
        expect(qty).toBeGreaterThanOrEqual(4);
        expect(o.premium).toBe(COOK_ORDER_MUL);
        expect(o.dueAt - o.calledAt).toBe(COOK_ORDER_MINUTES);
      } else {
        normal++;
        expect(o.dueAt - o.calledAt).toBe(DELIVERY_MINUTES);
      }
    }
    expect(cook).toBeGreaterThan(0);
    expect(normal).toBeGreaterThan(0);
  });

  it('chưa có trạm nấu hoặc chưa đủ cấp bếp: không bao giờ có đơn nấu', () => {
    for (let seed = 1; seed < 200; seed++) {
      expect(phoneCallFor(seed, 30, 2, 25, {}, 1, 'sunny', {})?.premium).toBeFalsy();
      expect(phoneCallFor(seed, 30, 2, 15, {}, 1, 'sunny', {}, ['hot_kettle'])?.premium).toBeFalsy();
    }
  });

  it('đơn nấu trả giá hời: giá trị = tổng giá bán × hệ số premium', () => {
    const o = {
      id: 1, houseId: 'nha_12', caller: 'X', reason: 'r', items: { nuoc_mia: 6 },
      calledAt: PHONE_SLOTS[0], answerBy: PHONE_SLOTS[0] + 20, dueAt: PHONE_SLOTS[0] + COOK_ORDER_MINUTES,
      status: 'ringing' as const, premium: COOK_ORDER_MUL,
    };
    const price = 9100;
    expect(phoneOrderValue(o, () => price)).toBeCloseTo(6 * price * COOK_ORDER_MUL);
  });

  it('đơn nấu chỉ đòi món của trạm đang có và đã mở khóa', () => {
    // drink_counter đặt ở trạm nhưng level 25: recipe unlock 34 (cà phê đen) và 36 (cà phê trứng) không ra
    for (let seed = 1; seed < 300; seed++) {
      const o = phoneCallFor(seed, 30, 1, 25, {}, 1, 'sunny', {}, ['drink_counter']);
      if (o?.premium) {
        const [id] = Object.keys(o.items);
        const r = RECIPES.find((x) => x.outputId === id)!;
        expect(r.station).toBe('drink_counter');
        expect(r.unlock).toBeLessThanOrEqual(25);
      }
    }
  });
});

describe('store — đơn nấu và hàng nhà làm không nhập được ở mối', () => {
  beforeEach(() => {
    useGame.setState({
      ...newGameData(), day: 10, level: 25, money: 5000000,
      furniture: [{ uid: 1, type: 'sugarcane_press', x: -2, z: -2, rot: 0, tiers: [] } as Furniture],
    });
  });

  it('buy() từ chối món nhà làm (phải tự nấu)', () => {
    expect(useGame.getState().buy('tra_sua', 1)).toBe(false);
    expect(useGame.getState().storage.tra_sua ?? 0).toBe(0);
  });

  it('giao đơn nấu xong: tiền theo giá hời, cộng vào cookedSold', () => {
    const before = useGame.getState().money;
    useGame.setState({
      // 600 = nửa sau khung hẹn (gọi lúc 500, hẹn lúc 900): boa thường 15%, không dính thưởng giao nhanh
      minutes: 600,
      phoneOrders: [{
        id: 7, houseId: 'nha_12', caller: 'Cô Hạnh', reason: 'đơn nấu', items: { nuoc_mia: 5 },
        calledAt: 500, answerBy: 520, dueAt: 900, status: 'ringing', premium: COOK_ORDER_MUL,
      }],
      storage: { ...useGame.getState().storage, nuoc_mia: 5 },
    });
    expect(useGame.getState().answerPhone(7)).toBe(true);
    expect(useGame.getState().deliverPhone(7)).toBe(true);
    const s = useGame.getState();
    // giá bán nước mía 9100 × 5 × 1.3 + boa 15% (làm tròn nghìn)
    const value = 9100 * 5 * COOK_ORDER_MUL;
    const tip = Math.round((value * 0.15) / 1000) * 1000;
    expect(s.money - before).toBe(value + tip - 0);
    expect(s.totals.cookedSold).toBe(5);
    expect(s.phoneOrdersDone).toBe(1);
  });
});

describe('reserveAsk — khách quen đặt suất nấu', () => {
  it('có món nấu được: một nửa lời hẹn là món nhà làm; không có thì chỉ món ưa thích', () => {
    const def = REGULARS[0];
    const prog = { friendship: 20, visits: 5, perks: [], discovered: [] };
    let cookedAsk = 0, total = 0;
    for (let i = 0; i < 500; i++) {
      const ask = reserveAsk(def, prog, 25, false, () => i / 500 + 0.0001, ['nuoc_mia', 'tra_sua']);
      if (!ask) continue;
      total++;
      if (COOKED_PRODUCT_IDS.has(ask.productId)) cookedAsk++;
    }
    expect(total).toBeGreaterThan(0);
    expect(cookedAsk).toBeGreaterThan(0);
    // Không có bếp: không bao giờ xin món nhà làm
    for (let i = 0; i < 300; i++) {
      const ask = reserveAsk(def, prog, 25, false, () => i / 300 + 0.0001);
      if (ask) expect(COOKED_PRODUCT_IDS.has(ask.productId)).toBe(false);
    }
  });

  it('món nấu xin đều là món trạm mình có và mở được ở cấp mình', () => {
    const def = REGULARS[0];
    const prog = { friendship: 20, visits: 5, perks: [], discovered: [] };
    for (let i = 0; i < 400; i++) {
      const ask = reserveAsk(def, prog, 22, false, () => i / 400 + 0.0001, ['com_suon_nuong', 'tra_gung_nong']);
      if (ask && COOKED_PRODUCT_IDS.has(ask.productId)) {
        // com_suon_nuong unlock 40 > 22 → không bao giờ được xin
        expect(ask.productId).toBe('tra_gung_nong');
      }
    }
  });
});
