import { beforeEach, describe, expect, it } from 'vitest';
import { newGameData, useGame } from '../core/store';
import { TIEM_XOI_HAND, TIEM_XOI_UNLOCK, tiemXoiHandPick, tiemXoiIds } from '../data/tiemXoi';

/** GĐ439 — chủ tự đồ một mẻ xôi ở sạp, mỗi ngày một lần. */
const g = () => useGame.getState();
let msgs: string[] = [];

beforeEach(() => {
  msgs = [];
  useGame.setState({ ...newGameData(), level: TIEM_XOI_UNLOCK, money: 100_000_000, notify: (m: string) => { msgs.push(m); } });
});

describe('steamXoiHand', () => {
  it('chưa mở tiệm thì không đồ', () => {
    expect(g().steamXoiHand()).toBe(false);
  });

  it('đồ món thiếu nhất vào kho, trừ tiền, một lần/ngày', () => {
    g().buyTiemXoi();
    const id = tiemXoiHandPick(g().level, g().storage)!;
    expect(tiemXoiIds(g().level)).toContain(id);
    const before = g().storage[id] ?? 0;
    const money = g().money;
    expect(g().steamXoiHand()).toBe(true);
    expect(g().storage[id]).toBe(before + TIEM_XOI_HAND);
    expect(g().money).toBeLessThan(money);
    expect(g().steamXoiHand()).toBe(false);
    useGame.setState({ day: g().day + 1 });
    expect(g().steamXoiHand()).toBe(true);
    for (const m of msgs) expect(m.length).toBeLessThanOrEqual(90);
  });
});
