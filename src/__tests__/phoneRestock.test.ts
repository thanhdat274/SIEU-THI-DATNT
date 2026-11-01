import { beforeEach, describe, expect, it, vi } from 'vitest';
import { newGameData, useGame } from '../core/store';
import { DELIVERY_MINUTES, NEIGHBOR_HOUSES, type PhoneOrder } from '../data/phoneOrders';
import { COOKED_PRODUCT_IDS } from '../data/recipes';
import { PRODUCTS, productById } from '../data/products';

/** restockAndAnswerPhone — nhập bù phần thiếu rồi nghe máy; món nhà làm không nhập bù được; thiếu tiền thì không đổi gì. */

const g = () => useGame.getState();
const PID = PRODUCTS.find((p) => !COOKED_PRODUCT_IDS.has(p.id))!.id;
const COOKED = [...COOKED_PRODUCT_IDS][0];
const order = (items: Record<string, number>): PhoneOrder => ({
  id: 1, houseId: NEIGHBOR_HOUSES[0].id, caller: 'Cô Ba', reason: 'x', items,
  calledAt: 600, answerBy: 620, dueAt: 600 + DELIVERY_MINUTES, status: 'ringing',
});

beforeEach(() => {
  useGame.setState({ ...newGameData(), money: 1_000_000, level: 20, phoneOrders: [order({ [PID]: 4 })], storage: { [PID]: 1 }, minutes: 610 });
});

describe('restockAndAnswerPhone', () => {
  it('thiếu hàng: nhập bù đúng phần thiếu, trừ tiền, rồi nghe máy (kho về 0)', () => {
    const s0 = g().stats.spent;
    expect(g().restockAndAnswerPhone(1)).toBe(true);
    expect(g().stats.spent).toBe(s0 + productById(PID).buy * 3);
    expect(g().storage[PID] ?? 0).toBe(0);
    expect(g().phoneOrders[0].status).toBe('carrying');
  });

  it('đủ hàng sẵn: không tốn tiền nhập bù', () => {
    useGame.setState({ storage: { [PID]: 4 } });
    const s0 = g().stats.spent;
    expect(g().restockAndAnswerPhone(1)).toBe(true);
    expect(g().stats.spent).toBe(s0);
  });

  it('không đủ tiền nhập bù: false, không đổi đơn/kho', () => {
    const notify = vi.fn();
    useGame.setState({ money: 0, notify });
    expect(g().restockAndAnswerPhone(1)).toBe(false);
    expect(notify).toHaveBeenCalledWith(expect.stringContaining('Không đủ tiền nhập bù'));
    expect(g().phoneOrders[0].status).toBe('ringing');
    expect(g().storage[PID]).toBe(1);
  });

  it('thiếu món nhà làm: không nhập bù, không trừ tiền', () => {
    const notify = vi.fn();
    useGame.setState({ phoneOrders: [order({ [COOKED]: 2 })], storage: {}, notify });
    const m0 = g().money;
    expect(g().restockAndAnswerPhone(1)).toBe(false);
    expect(notify).toHaveBeenCalledWith(expect.stringContaining('món nhà làm'));
    expect(g().money).toBe(m0);
    expect(g().phoneOrders[0].status).toBe('ringing');
  });

  it('id lạ: false', () => {
    expect(g().restockAndAnswerPhone(99)).toBe(false);
  });
});
