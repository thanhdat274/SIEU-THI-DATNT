import { beforeEach, describe, expect, it } from 'vitest';
import { newGameData, useGame } from '../core/store';
import { updateOnline } from '../core/slices/online';
import {
  ACCEPT_WINDOW, deliveryStars, grabFee, grabTravel, makeOnlineOrder, newOnline, ONLINE_HOURS, orderKindTag, VERY_LATE,
} from '../data/online';
import { mulberry32, setSimSeed, clearSimSeed } from '../core/rand';
import type { OnlineOrder } from '../data/online';

/**
 * GĐ715 — đơn app biết thể loại: GẤP (hẹn rất sớm, giỏ nhỏ, gần — Grab luôn kịp, người giao tay nghề thấp
 * hoặc nhận muộn thì trễ) và LỚN (một món 6–10 phần, hẹn thoáng — cửa ở kho đủ hàng). Đơn thường giữ nguyên.
 * kind không set = đơn thường → bản lưu cũ thiếu trường không cần migration.
 */

const g = () => useGame.getState();
const pickSeed = (want: NonNullable<OnlineOrder['kind']>) => {
  for (let s = 1; s <= 200; s++) {
    if (makeOnlineOrder(1, 20, 600, mulberry32(s)).kind === want) return s;
  }
  throw new Error(`không tìm thấy seed ra đơn ${want}`);
};

describe('phân bố loại đơn (400 seed, seed cố định)', () => {
  it('gấp ~16%, lớn ~12%, cùng seed ra cùng loại', () => {
    let rush = 0;
    let bulk = 0;
    for (let s = 1; s <= 400; s++) {
      const kind = makeOnlineOrder(1, 20, 600, mulberry32(s)).kind;
      if (kind === 'rush') rush++;
      if (kind === 'bulk') bulk++;
    }
    expect(rush).toBeGreaterThanOrEqual(40); // binomial 400×0.16: 64±3σ
    expect(rush).toBeLessThanOrEqual(90);
    expect(bulk).toBeGreaterThanOrEqual(28);
    expect(bulk).toBeLessThanOrEqual(68);
    expect(makeOnlineOrder(1, 20, 600, mulberry32(7)).kind).toBe(makeOnlineOrder(1, 20, 600, mulberry32(7)).kind);
  });
});

describe('bất biến đơn GẤP', () => {
  const o = makeOnlineOrder(pickSeed('rush'), 20, 600, mulberry32(pickSeed('rush')));
  it('gần (≤5 km), một món 1–2 phần', () => {
    expect(o.km).toBeLessThanOrEqual(5);
    expect(Object.keys(o.items)).toHaveLength(1);
    expect(Object.values(o.items)[0]).toBeLessThanOrEqual(2);
  });
  it('hẹn rất sớm: ACCEPT_WINDOW + 10′ + đường ngắn', () => {
    expect(o.dueAt - o.placedAt).toBe(ACCEPT_WINDOW + 10 + Math.round(o.km * 3));
    // Grab luôn kịp mọi đơn gấp: quãng xa nhất 5 km vẫn nhanh hơn hẹn sớm nhất
    for (const km of [1, 2, 3, 4, 5]) expect(grabTravel(km)).toBeLessThan(ACCEPT_WINDOW + 10 + km * 3);
  });
  it('trễ vẫn bị chấm 3★/1★ như thường (VERY_LATE áp dụng cả gấp)', () => {
    expect(deliveryStars(o, o.dueAt)).toBe(5);
    expect(deliveryStars(o, o.dueAt + 1)).toBe(3);
    expect(deliveryStars(o, o.dueAt + VERY_LATE + 1)).toBe(1);
  });
});

describe('bất biến đơn LỚN', () => {
  const seed = pickSeed('bulk');
  const o = makeOnlineOrder(1, 20, 600, mulberry32(seed));
  it('một món 6–10 phần, hẹn thoáng thêm 30′', () => {
    expect(Object.keys(o.items)).toHaveLength(1);
    const q = Object.values(o.items)[0];
    expect(q).toBeGreaterThanOrEqual(6);
    expect(q).toBeLessThanOrEqual(10);
    expect(o.dueAt - o.placedAt).toBe(Math.round(ACCEPT_WINDOW + 50 + o.km * 8));
  });
  it('nhận qua Grab: trừ đúng số lượng kho lớn; kho thiếu thì chặn', () => {
    const pid = Object.keys(o.items)[0];
    const q = o.items[pid];
    useGame.setState({ ...newGameData(), level: 20, money: 2_000_000, storage: { [pid]: 20 }, shopOpen: true, minutes: 600 });
    useGame.setState({ online: { ...newOnline(), open: true, nextAt: 9999, orders: [{ ...o, id: 1, placedAt: 600, status: 'new' }] } });
    expect(g().acceptOnline(1, 'grab')).toBe(true);
    expect(g().storage[pid]).toBe(20 - q);
    expect(g().money).toBe(2_000_000 - grabFee(o.km));
    // kho thiếu: chặn nhận, báo thiếu đúng món
    useGame.setState({ ...newGameData(), level: 20, money: 2_000_000, storage: { [pid]: 1 }, shopOpen: true, minutes: 600, notify: () => {} });
    useGame.setState({ online: { ...newOnline(), open: true, nextAt: 9999, orders: [{ ...o, id: 2, placedAt: 600, status: 'new' }] } });
    let said = '';
    useGame.setState({ notify: (m: string) => { said = m; } });
    expect(g().acceptOnline(2, 'grab')).toBe(false);
    expect(said).toContain('Kho còn thiếu');
  });
});

describe('tin báo và nhãn loại', () => {
  beforeEach(() => {
    useGame.setState({
      ...newGameData(), level: 20, money: 2_000_000, shopOpen: true, minutes: 600, notify: () => {},
      online: { ...newOnline(), open: true, nextAt: 600 },
    });
  });
  it('tin đơn gấp / lớn có đuôi loại, dài ≤ 90 ký tự; đơn thường không đuôi', () => {
    for (const want of ['rush', 'bulk'] as const) {
      const seed = pickSeed(want);
      useGame.setState({ online: { ...newOnline(), open: true, nextAt: 600, nextId: 1 } });
      setSimSeed(seed);
      const said: string[] = [];
      useGame.setState({ notify: (m: string) => said.push(m) });
      updateOnline(useGame.setState, useGame.getState);
      clearSimSeed();
      expect(said.some((m) => m.includes(want === 'rush' ? '(gấp)' : '(lớn)'))).toBe(true);
      const line = said.find((m) => m.includes('Đơn app mới'))!;
      expect(line.length).toBeLessThanOrEqual(90);
    }
    // 600 phút nằm trong khung giờ app; đơn thường: không đuôi
    expect(orderKindTag(undefined)).toBe('');
    expect(ONLINE_HOURS[0]).toBeLessThanOrEqual(600);
  });
});

describe('bản lưu cũ thiếu kind = đơn thường', () => {
  it('xoá kind qua JSON round-trip: mọi đường (tin, huỷ, cuối ngày) chạy như cũ', () => {
    const o: OnlineOrder = JSON.parse(JSON.stringify(makeOnlineOrder(1, 20, 600, mulberry32(pickSeed('bulk')))));
    delete o.kind;
    expect(o.kind).toBeUndefined();
    expect(orderKindTag(o.kind)).toBe('');
    useGame.setState({
      ...newGameData(), level: 20, money: 2_000_000, shopOpen: true, minutes: 600 + ACCEPT_WINDOW + 1, notify: () => {},
      online: { ...newOnline(), open: true, nextAt: 9999, orders: [o] },
    });
    updateOnline(useGame.setState, useGame.getState); // không ai nhận → app huỷ như đơn thường
    expect(g().online.orders).toHaveLength(0);
    expect(g().online.ratingCount).toBe(1);
  });
});
