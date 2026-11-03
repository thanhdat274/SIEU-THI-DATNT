import { beforeEach, describe, expect, it } from 'vitest';
import { newGameData, useGame } from '../core/store';
import { DELIVERY_MINUTES, FAST_TIP, NEIGHBOR_HOUSES, ON_TIME_TIP, PHONE_FRIEND_GAIN, phoneOrderValue, type PhoneOrder } from '../data/phoneOrders';
import { PRODUCTS } from '../data/products';

/**
 * orders.ts (slice) — đơn điện thoại: nghe máy lấy hàng khỏi kho, giao kịp/trễ ăn boa khác nhau, từ chối thì không mất gì.
 * Khoá: thiếu kho chặn nghe máy, soạn hàng trừ kho, boa x2 nửa đầu khung hẹn, trễ thì không boa và đánh giá 3★.
 */

const g = () => useGame.getState();
const PID = PRODUCTS[0].id;
const order = (over: Partial<PhoneOrder> = {}): PhoneOrder => ({
  id: 1, houseId: NEIGHBOR_HOUSES[0].id, caller: 'Cô Ba', reason: 'x', items: { [PID]: 2 },
  calledAt: 600, answerBy: 620, dueAt: 600 + DELIVERY_MINUTES, status: 'ringing', ...over,
});

beforeEach(() => {
  useGame.setState({ ...newGameData(), money: 100_000, level: 20, phoneOrders: [order()], storage: { [PID]: 5 }, minutes: 610 });
});

describe('nghe máy / từ chối', () => {
  it('đủ hàng: trừ kho, chuyển carrying; id lạ hoặc đã carrying thì trả false', () => {
    expect(g().answerPhone(99)).toBe(false);
    expect(g().answerPhone(1)).toBe(true);
    expect(g().storage[PID]).toBe(3);
    expect(g().phoneOrders[0].status).toBe('carrying');
    expect(g().answerPhone(1)).toBe(false);
    expect(g().storage[PID]).toBe(3);
  });

  it('thiếu hàng: không nghe máy, kho nguyên, vẫn đổ chuông', () => {
    useGame.setState({ storage: { [PID]: 1 } });
    expect(g().answerPhone(1)).toBe(false);
    expect(g().storage[PID]).toBe(1);
    expect(g().phoneOrders[0].status).toBe('ringing');
  });

  it('từ chối: bỏ đơn đang đổ chuông, không đổi tiền/kho', () => {
    g().declinePhone(1);
    expect(g().phoneOrders).toEqual([]);
    expect(g().money).toBe(100_000);
    expect(g().storage[PID]).toBe(5);
  });
});

describe('giao đơn điện thoại', () => {
  const carry = (minutes: number) => {
    g().answerPhone(1);
    useGame.setState({ minutes });
  };

  it('chưa soạn hàng (ringing) thì không giao được', () => {
    expect(g().deliverPhone(1)).toBe(false);
  });

  it('giao ngay nửa đầu khung hẹn: boa FAST_TIP, cộng két + doanh thu, đơn xong', () => {
    carry(620);
    const o = g().phoneOrders[0];
    const value = phoneOrderValue(o, g().priceOf);
    const tip = Math.round((value * FAST_TIP) / 1000) * 1000;
    const m0 = g().money;
    expect(g().deliverPhone(1)).toBe(true);
    expect(g().money).toBe(m0 + value + tip);
    expect(g().stats.revenue).toBeGreaterThanOrEqual(value + tip);
    expect(g().phoneOrdersDone).toBe(1);
    expect(g().phoneOrders).toEqual([]);
  });

  it('giao kịp hẹn nhưng không lẹ: boa ON_TIME_TIP', () => {
    carry(600 + DELIVERY_MINUTES - 5);
    const o = g().phoneOrders[0];
    const value = phoneOrderValue(o, g().priceOf);
    const tip = Math.round((value * ON_TIME_TIP) / 1000) * 1000;
    const m0 = g().money;
    g().deliverPhone(1);
    expect(g().money).toBe(m0 + value + tip);
  });

  it('giao trễ: chỉ nhận giá hàng, không boa, đánh giá 3★ thay vì 5★', () => {
    carry(600 + DELIVERY_MINUTES + 10);
    const o = g().phoneOrders[0];
    const value = phoneOrderValue(o, g().priceOf);
    const m0 = g().money;
    g().deliverPhone(1);
    expect(g().money).toBe(m0 + value);
    expect(g().reviews.at(-1)?.stars).toBe(3);
  });

  // GĐ1046 — orders.deliverPhone nhánh KHÁCH QUEN (dòng 223 `if (o.regular && onTime) … +PHONE_FRIEND_GAIN`
  // và dòng 225 báo `💛 +N`). Giao kịp hẹn cho khách quen thì tăng thân thiết; giao trễ thì không.
  it('GĐ1046: đơn khách quen giao KỊP → tăng thân thiết +PHONE_FRIEND_GAIN và báo 💛', () => {
    const toasts: string[] = [];
    useGame.setState({ phoneOrders: [order({ regular: 'ba_nam' })], notify: (m) => void toasts.push(m) });
    carry(600 + DELIVERY_MINUTES - 5);
    expect(g().deliverPhone(1)).toBe(true);
    expect(g().regulars['ba_nam'].friendship).toBe(PHONE_FRIEND_GAIN); // bắt đầu 0, chưa có tiến độ
    expect(toasts.some((t) => t.includes('💛 +' + PHONE_FRIEND_GAIN))).toBe(true);
  });

  it('GĐ1046: giao KỊP cho khách quen vượt ngưỡng quyền lợi → mở khoá perk mới + báo "thân thiết hơn"', () => {
    const toasts: string[] = [];
    // đủ thân (13) + 3 = 16 ≥ ngưỡng 15 → đạt perk 'Ghé thường hơn' (line 225 notify của adjustFriendship)
    useGame.setState({
      phoneOrders: [order({ regular: 'ba_nam' })],
      regulars: { ba_nam: { friendship: 13, visits: 0, perks: [], discovered: [] } },
      notify: (m) => void toasts.push(m),
    });
    carry(600 + DELIVERY_MINUTES - 5);
    g().deliverPhone(1);
    expect(g().regulars['ba_nam'].friendship).toBe(16);
    expect(g().regulars['ba_nam'].perks).toContain('Ghé thường hơn');
    expect(toasts.some((t) => t.includes('thân thiết hơn'))).toBe(true);
  });

  it('GĐ1046: đơn khách quen giao TRỄ → không tăng thân thiết (chốt `&& onTime`)', () => {
    useGame.setState({ phoneOrders: [order({ regular: 'ba_nam' })] });
    carry(600 + DELIVERY_MINUTES + 10);
    expect(g().deliverPhone(1)).toBe(true);
    expect(g().regulars['ba_nam']).toBeUndefined(); // adjustFriendship không được gọi
  });
});

describe('GĐ1050 — nhánh biên nghe máy/từ chối (orders 153–196)', () => {
  it('nghe máy đơn có món KHÔNG CÓ trong kho (undefined ?? 0) → báo thiếu món đó, không mang', () => {
    // storage chỉ có PID, đơn đòi thêm 'sua' → nhánh `(s.storage[pid] ?? 0) < q` với storage[pid] undefined (dòng 153)
    useGame.setState({ storage: { [PID]: 5 }, phoneOrders: [order({ items: { [PID]: 2, sua: 1 } })] });
    const toasts: string[] = [];
    useGame.setState({ notify: (m) => void toasts.push(m) });
    expect(g().answerPhone(1)).toBe(false);
    expect(g().phoneOrders[0].status).toBe('ringing');
    expect(toasts.some((t) => t.includes('Kho còn thiếu'))).toBe(true);
  });

  it('nhiều đơn điện thoại: nghe một đơn → đơn đó carrying, đơn KIA vẫn ringing (map giữ nguyên)', () => {
    // storage đủ cho cả hai; dòng 161 `p === o ? … : p` nhánh false giữ đơn còn lại
    useGame.setState({ phoneOrders: [order({ id: 1 }), order({ id: 2 })] });
    expect(g().answerPhone(1)).toBe(true);
    const [a, b] = g().phoneOrders;
    expect(a.status).toBe('carrying');
    expect(b.status).toBe('ringing');
  });

  it('từ chối đơn KHÔNG ĐỔ CHUÔNG (đang carrying/còn lại) → không làm gì, đơn nguyên vẹn', () => {
    // dòng 196 `if (!o) return;` — không tìm thấy đơn ringing
    g().answerPhone(1); // chuyển sang carrying
    g().declinePhone(1);
    expect(g().phoneOrders).toHaveLength(1);
    expect(g().phoneOrders[0].status).toBe('carrying');
  });
});
