import { beforeEach, describe, expect, it } from 'vitest';
import { newGameData, useGame } from '../core/store';
import { PARTY_ORDERS, STORY_ORDER_FRIEND_GAIN, orderValue } from '../data/orders';

/**
 * orders.ts (slice) — đơn tiệc: giao đủ hàng nhận tiền + thưởng, thiếu hàng bị chặn, nhập gấp trừ tiền đại lý rồi giao.
 */

const g = () => useGame.getState();
const def = PARTY_ORDERS.find((o) => !o.regular) ?? PARTY_ORDERS[0];
const full = () => Object.fromEntries(Object.entries(def.items).map(([id, q]) => [id, q + 1]));

beforeEach(() => {
  useGame.setState({ ...newGameData(), money: 1_000_000, level: 50, storage: full(), order: { id: def.id, dueDay: 99, accepted: true } });
});

describe('deliverOrder', () => {
  it('đủ hàng: trừ kho, cộng giá + thưởng, xong đơn, đánh giá 5★', () => {
    const m0 = g().money;
    expect(g().deliverOrder()).toBe(true);
    expect(g().money).toBe(m0 + orderValue(def) + def.bonus);
    for (const id of Object.keys(def.items)) expect(g().storage[id] ?? 0).toBe(1);
    expect(g().order).toBeNull();
    expect(g().ordersDone).toBe(1);
    expect(g().reviews.at(-1)?.stars).toBe(5);
  });

  it('chưa nhận đơn hoặc không có đơn: trả false, không đổi tiền', () => {
    useGame.setState({ order: { id: def.id, dueDay: 99, accepted: false } });
    const m0 = g().money;
    expect(g().deliverOrder()).toBe(false);
    useGame.setState({ order: null });
    expect(g().deliverOrder()).toBe(false);
    expect(g().money).toBe(m0);
  });

  it('thiếu hàng: chặn, kho/tiền nguyên, đơn còn đó', () => {
    useGame.setState({ storage: {} });
    const m0 = g().money;
    expect(g().deliverOrder()).toBe(false);
    expect(g().money).toBe(m0);
    expect(g().order).not.toBeNull();
  });

  // GĐ1047 — orders.deliverOrder nhánh KHÁCH QUEN (dòng 249 `if (def.regular)` + dòng 251
  // báo `💛 +N thân thiết với …`). Đơn tiệc mang `regular:` (data/orders 23) nhưng `def` ở
  // module-level của file này cố tình chọn đơn KHÔNG regular (line 10) nên nhánh này chưa chạy.
  it('GĐ1047: giao đơn tiệc của khách quen → tăng thân thiết +STORY_ORDER_FRIEND_GAIN và báo 💛', () => {
    const toasts: string[] = [];
    const rDef = PARTY_ORDERS.find((o) => o.regular)!;
    const fullR = () => Object.fromEntries(Object.entries(rDef.items).map(([id, q]) => [id, q + 1]));
    useGame.setState({
      ...newGameData(), money: 1_000_000, level: 50, storage: fullR(),
      order: { id: rDef.id, dueDay: 99, accepted: true },
      regulars: { [rDef.regular!]: { friendship: 4, visits: 0, perks: [], discovered: [] } },
      notify: (m) => void toasts.push(m),
    });
    expect(g().deliverOrder()).toBe(true);
    // từ 4 + 8 = 12 (< ngưỡng perk 15 → không notify của adjustFriendship, chỉ toast 251)
    expect(g().regulars[rDef.regular!].friendship).toBe(4 + STORY_ORDER_FRIEND_GAIN);
    expect(toasts.some((t) => t.includes(`💛 +${STORY_ORDER_FRIEND_GAIN} thân thiết`))).toBe(true);
  });
});

describe('rushDeliverOrder', () => {
  it('thiếu hàng, đủ tiền: trừ tiền nhập gấp rồi giao, két tăng đúng (thưởng − chi nhập)', () => {
    useGame.setState({ storage: {} });
    const m0 = g().money;
    const ok = g().rushDeliverOrder();
    expect(ok).toBe(true);
    if (ok) {
      expect(g().stats.spent).toBeGreaterThan(0);
      expect(g().money).toBe(m0 + orderValue(def) + def.bonus - g().stats.spent);
      expect(g().order).toBeNull();
    } else {
      expect(g().money).toBe(m0); // đơn có món nhà làm: đại lý không bán
    }
  });

  it('thiếu tiền nhập gấp: không trừ, không giao', () => {
    useGame.setState({ storage: {}, money: 0 });
    expect(g().rushDeliverOrder()).toBe(false);
    expect(g().money).toBe(0);
    expect(g().order).not.toBeNull();
  });
});
