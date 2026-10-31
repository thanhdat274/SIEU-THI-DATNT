import { beforeEach, describe, expect, it } from 'vitest';
import { newGameData, useGame } from '../core/store';
import { PARTY_ORDERS, orderValue } from '../data/orders';

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
