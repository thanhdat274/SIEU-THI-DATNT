import { beforeEach, describe, expect, it } from 'vitest';
import { newGameData, useGame } from '../core/store';
import { TIEM_XOI_HAND, tiemXoiHandQty, TIEM_XOI_UNLOCK, tiemXoiHandPick, tiemXoiIds } from '../data/tiemXoi';

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

describe('tin cuối ngày', () => {
  it('ghi chủ tự đồ khi đã đồ trong ngày, ≤90 ký tự', () => {
    g().buyTiemXoi();
    g().steamXoiHand();
    msgs = [];
    useGame.setState({ minutes: 20 * 60 });
    expect(g().sleep()).toBe(true);
    const seg = msgs.join('|').match(/🍚 Tiệm xôi.*?chủ tự đồ 1 mẻ/)?.[0];
    expect(seg).toBeTruthy();
    expect(seg!.length).toBeLessThanOrEqual(90);
  });
});

describe('GĐ444: thợ phụ tăng mẻ', () => {
  it('mỗi thợ +5 phần', () => {
    expect(tiemXoiHandQty(0)).toBe(TIEM_XOI_HAND);
    expect(tiemXoiHandQty(2)).toBe(TIEM_XOI_HAND + 10);
    g().buyTiemXoi();
    g().hireTiemXoi();
    const id = tiemXoiHandPick(g().level, g().storage)!;
    const before = g().storage[id] ?? 0;
    g().steamXoiHand();
    expect(g().storage[id]).toBe(before + TIEM_XOI_HAND + 5);
  });
});

describe('GĐ453: việc tay cho XP', () => {
  it('đồ xôi +4 XP', () => {
    g().buyTiemXoi();
    const xp = g().xp;
    g().steamXoiHand();
    expect(g().xp === xp + 4 || g().level > TIEM_XOI_UNLOCK).toBe(true);
  });
});
