import { beforeEach, describe, expect, it } from 'vitest';
import { newGameData, useGame } from '../core/store';
import { updateOnline } from '../core/slices/online';
import { emptyProgress, REGULARS, regularById } from '../data/regulars';
import { makeOnlineOrder, newOnline, ONLINE_REGULAR_CHANCE, ONLINE_REGULAR_FRIENDSHIP, pickOnlineRegular, VERY_LATE } from '../data/online';
import { setSimSeed, clearSimSeed } from '../core/rand';

/**
 * GĐ718 — khách quen đặt app: đơn app đôi khi là của khách quen thân (≥30 thân thiết, đã mở khoá),
 * giỏ nghiêng về món khách ưa; giao đúng hẹn +2 thân thiết, trễ −2 (dùng regularFriendship — kẹp ≥0,
 * mở perk nếu vượt mốc). Không tính là lần ghé (visits chỉ cho khách tới tiệm — câu chuyện 10/30/60).
 * Bản lưu cũ: đơn không có regularId = khách vãng lai, mọi đường giữ nguyên.
 */

const g = () => useGame.getState();
const first = REGULARS[0];

describe('pickOnlineRegular — một lần rút vừa cửa vừa chọn người', () => {
  const regs = { [first.id]: { ...emptyProgress(), friendship: 40 } };
  it('roll < 25%: chọn đúng khách đủ thân; roll cao: không có khách quen; cùng roll cùng người', () => {
    const pick = pickOnlineRegular(regs, 20, 0.2, regularById);
    expect(pick?.id).toBe(first.id);
    expect(pick?.name).toBe(first.name);
    expect(pickOnlineRegular(regs, 20, 0.9, regularById)).toBeUndefined();
    expect(pickOnlineRegular(regs, 20, 0.2, regularById)).toEqual(pickOnlineRegular(regs, 20, 0.2, regularById));
  });
  it('chưa đủ thân hoặc chưa mở khoá thì không bao giờ được chọn', () => {
    expect(pickOnlineRegular({ [first.id]: { ...emptyProgress(), friendship: ONLINE_REGULAR_FRIENDSHIP - 1 } }, 20, 0.1, regularById)).toBeUndefined();
    expect(pickOnlineRegular(regs, (regularById(first.id)?.unlock ?? 1) - 1, 0.1, regularById)).toBeUndefined();
  });
});

describe('makeOnlineOrder với khách quen — tên thật, giỏ nghiêng món ưa', () => {
  it('đơn mang tên khách quen + regularId; món nằm trong món ưa', () => {
    const ref = { id: first.id, name: first.name, favorites: ['nuoc'] };
    const o = makeOnlineOrder(1, 20, 600, () => 0.5, ref);
    expect(o.customer).toBe(first.name);
    expect(o.regularId).toBe(first.id);
    expect(Object.keys(o.items).length).toBeGreaterThan(0);
    expect(Object.keys(o.items).every((id) => ref.favorites.includes(id))).toBe(true);
  });
  it('khách quen không có món ưa nào mở khoá: về giỏ thường nhưng vẫn là đơn của khách quen', () => {
    const ref = { id: first.id, name: first.name, favorites: ['mon_khong_ton_tai'] };
    const o = makeOnlineOrder(1, 20, 600, () => 0.5, ref);
    expect(o.customer).toBe(first.name);
    expect(o.regularId).toBe(first.id);
    expect(Object.keys(o.items).length).toBeGreaterThan(0);
  });
  it('không truyền khách quen: hành vi cũ nguyên vẹn (khách vãng lai, không regularId)', () => {
    const o = makeOnlineOrder(1, 20, 600, () => 0.5);
    expect(o.regularId).toBeUndefined();
    expect(o.customer).not.toBe(first.name);
  });
});

describe('updateOnline — khách quen đặt và nhận thân thiết khi giao', () => {
  beforeEach(() => {
    useGame.setState({
      ...newGameData(), level: 20, money: 5_000_000, shopOpen: true, minutes: 600, notify: () => {},
      regulars: { [first.id]: { ...emptyProgress(), friendship: 40 } },
    });
  });

  it('đơn mới đôi khi là của khách quen (quét seed thấy ít nhất 1/40 đơn), giao đúng hẹn +2 thân thiết', () => {
    let found = -1;
    for (let s = 1; s <= 40 && found < 0; s++) {
      setSimSeed(s);
      useGame.setState({ online: { ...newOnline(), open: true, nextAt: 600, nextId: 1, ratingSum: 460, ratingCount: 100 } });
      updateOnline(useGame.setState, useGame.getState);
      clearSimSeed();
      const o = g().online.orders[0];
      if (o?.regularId === first.id) found = s;
    }
    expect(found).toBeGreaterThan(0);
    // giao đúng hẹn: thân thiết 40 → 42, không tính là lần ghé (đồng dừng ở 600 — arriveAt phải ≤ 600)
    const o = g().online.orders[0];
    useGame.setState({ online: { ...g().online, nextAt: 9999, orders: [{ ...o, status: 'shipping', via: 'grab', arriveAt: Math.min(590, o.dueAt - 5) }] } });
    updateOnline(useGame.setState, useGame.getState);
    expect(g().regulars[first.id].friendship).toBe(42);
    expect(g().regulars[first.id].visits).toBe(0);
  });

  it('giao trễ: −2 thân thiết, kẹp ở 0 khi đang 1 điểm; đơn khách vãng lai không đổi thân thiết', () => {
    const ship = (regularId?: string) => ({
      id: 1, customer: regularId ? first.name : 'Khách Q.', items: { nuoc: 1 }, km: 2, placedAt: 560, dueAt: 550,
      status: 'shipping' as const, via: 'grab' as const, arriveAt: 590, // tới sau hẹn 550 nhưng trước đồng hồ 600 → 3★ trễ
      ...(regularId ? { regularId } : {}),
    });
    useGame.setState({ online: { ...newOnline(), open: true, nextAt: 9999, orders: [ship(first.id)] } });
    updateOnline(useGame.setState, useGame.getState);
    expect(g().regulars[first.id].friendship).toBe(38);
    // kẹp 0
    useGame.setState({ regulars: { [first.id]: { ...emptyProgress(), friendship: 1 } } });
    useGame.setState({ online: { ...newOnline(), open: true, nextAt: 9999, orders: [ship(first.id)] } });
    updateOnline(useGame.setState, useGame.getState);
    expect(g().regulars[first.id].friendship).toBe(0);
    // khách vãng lai (bản lưu cũ không regularId): thân thiết nguyên vẹn
    useGame.setState({ regulars: { [first.id]: { ...emptyProgress(), friendship: 40 } } });
    useGame.setState({ online: { ...newOnline(), open: true, nextAt: 9999, orders: [ship(undefined)] } });
    updateOnline(useGame.setState, useGame.getState);
    expect(g().regulars[first.id].friendship).toBe(40);
  });
});
