import type { Lot } from '../../data/freshness';
import {
  ACCEPT_WINDOW, APP_COMMISSION, appRating, deliveryStars, grabFee, grabTravel, makeOnlineOrder, ONLINE_HOURS, ONLINE_OPEN_COST,
  ONLINE_UNLOCK, onlineValue, orderGap, ownTravel, type OnlineState,
} from '../../data/online';
import { formatMoney, productById } from '../../data/products';
import { playSfx } from '../audio';
import type { GameState, GetState, SetState } from '../gameTypes';
import { copyStock, takeStock } from '../stock';

/** Bán online qua app: nhận/từ chối đơn, chọn người chở; đơn đổ về và giao tới nơi chạy trong tick. */

/** Nhân viên giao hàng đang rảnh (mỗi người chở một đơn app một lúc), người tay nghề cao trước. */
const freeCouriers = (s: GameState) => {
  const busy = s.online.orders.filter((o) => o.status === 'shipping' && o.via === 'own').length;
  return s.staff.filter((st) => st.role === 'courier').sort((a, b) => b.skill - a.skill).slice(busy);
};

/** Mỗi tick: đơn mới đổ về theo điểm app, đơn chờ quá lâu bị huỷ, hàng tới tay khách thì nhận tiền và sao. */
export const updateOnline = (set: SetState, get: GetState) => {
  const s = get();
  const on = s.online;
  if (!on.open && !on.orders.length) return;
  const m = s.minutes;
  let online: OnlineState = on;
  const news: string[] = [];
  let money = 0;
  let items = 0;
  let doneCount = 0; // số đơn app tới tay khách tick này (đo nhiệm vụ ngày)
  const deliveredKeys: string[] = []; // món đã giao (cho Sổ tay Tiệm GĐ36)
  // Đơn mới: chỉ khi gian hàng mở, tiệm mở cửa và trong giờ app
  if (on.open && s.shopOpen && m >= ONLINE_HOURS[0] && m < ONLINE_HOURS[1] && m >= on.nextAt) {
    const order = makeOnlineOrder(on.nextId, s.level, m);
    const gap = orderGap(appRating(on), s.level);
    online = { ...online, orders: [...online.orders, order], nextId: on.nextId + 1, nextAt: m + gap * (0.6 + Math.random() * 0.8) };
    playSfx('ring');
    news.push(`📲 Đơn app mới: ${order.customer} (${order.km} km) — mở Bán online để nhận`);
  }
  const kept = [];
  for (const o of online.orders) {
    if (o.status === 'new' && m > o.placedAt + ACCEPT_WINDOW) {
      // Tiệm không nhận kịp: app tự huỷ và trừ nhẹ điểm
      online = { ...online, ratingSum: online.ratingSum + 4, ratingCount: online.ratingCount + 1 };
      news.push(`⌛ App huỷ đơn của ${o.customer} vì tiệm không nhận kịp`);
      continue;
    }
    if (o.status === 'shipping' && o.arriveAt !== undefined && m >= o.arriveAt) {
      const stars = deliveryStars(o, o.arriveAt);
      const pay = Math.round(onlineValue(o, s.priceOf) * (1 - APP_COMMISSION));
      money += pay;
      items += Object.values(o.items).reduce((n, q) => n + q, 0);
      doneCount++;
      deliveredKeys.push(...Object.keys(o.items));
      online = {
        ...online, ratingSum: online.ratingSum + stars, ratingCount: online.ratingCount + 1, done: online.done + 1,
        late: online.late + (stars < 5 ? 1 : 0), revenueToday: online.revenueToday + pay,
      };
      news.push(stars === 5 ? `✅ Đơn app tới tay ${o.customer} đúng hẹn: +${formatMoney(pay)} · 5★` : `🐢 Đơn app tới trễ cho ${o.customer}: +${formatMoney(pay)} · ${stars}★`);
      continue;
    }
    kept.push(o);
  }
  if (online === on && kept.length === on.orders.length && !news.length) return;
  online = { ...online, orders: kept };
  set({
    online, money: s.money + money,
    stats: { ...s.stats, revenue: s.stats.revenue + money, itemsSold: s.stats.itemsSold + items, online: (s.stats.online ?? 0) + money, onlineDone: (s.stats.onlineDone ?? 0) + doneCount },
    totals: { ...s.totals, revenue: s.totals.revenue + money, itemsSold: s.totals.itemsSold + items },
  });
  if (money) get().addXp(Math.round(money / 20000));
  if (deliveredKeys.length) get().recordDiscovery(deliveredKeys); // Sổ tay Tiệm (GĐ36)
  if (news.length) s.notify(news.join(' · '));
};

export const createOnlineSlice = (set: SetState, get: GetState): Pick<GameState, 'openOnline' | 'toggleOnline' | 'acceptOnline' | 'declineOnline'> => ({
  openOnline: () => {
    const s = get();
    if (s.online.open || s.online.ratingCount || s.online.done) return false;
    if (s.level < ONLINE_UNLOCK) { s.notify(`Bán online mở ở cấp ${ONLINE_UNLOCK}`); return false; }
    if (s.money < ONLINE_OPEN_COST) { s.notify('Không đủ tiền mở gian hàng trên app!'); return false; }
    set({
      online: { ...s.online, open: true, nextAt: s.minutes + 10 },
      money: s.money - ONLINE_OPEN_COST,
      stats: { ...s.stats, spent: s.stats.spent + ONLINE_OPEN_COST },
      totals: { ...s.totals, spent: s.totals.spent + ONLINE_OPEN_COST },
    });
    s.notify('📲 Đã mở gian hàng trên app! Đơn sẽ đổ về khi tiệm mở cửa — giao đúng hẹn để giữ điểm cao');
    return true;
  },
  toggleOnline: () => {
    const s = get();
    if (!s.online.done && !s.online.ratingCount && !s.online.open) return;
    set({ online: { ...s.online, open: !s.online.open, nextAt: s.minutes + 10 } });
    s.notify(s.online.open ? '⏸️ Tạm ngưng nhận đơn app' : '▶️ Mở nhận đơn app trở lại');
  },
  acceptOnline: (id, via) => {
    const s = get();
    const o = s.online.orders.find((it) => it.id === id && it.status === 'new');
    if (!o) return false;
    const missing = Object.entries(o.items).filter(([pid, q]) => (s.storage[pid] ?? 0) < q);
    if (missing.length) {
      s.notify(`Kho còn thiếu: ${missing.map(([pid, q]) => `${q - (s.storage[pid] ?? 0)} ${productById(pid).name}`).join(', ')}`);
      return false;
    }
    let travel: number;
    let fee = 0;
    if (via === 'own') {
      const courier = freeCouriers(s)[0];
      if (!courier) { s.notify('Không còn nhân viên giao hàng rảnh — gọi Grab hoặc thuê thêm người giao'); return false; }
      travel = ownTravel(o.km, courier.skill);
    } else {
      fee = grabFee(o.km);
      if (s.money < fee) { s.notify('Không đủ tiền gọi Grab!'); return false; }
      travel = grabTravel(o.km);
    }
    const k = copyStock(s);
    const lots: Record<string, Lot[]> = {};
    const hg = { ...s.garden.homegrown };
    for (const [pid, q] of Object.entries(o.items)) {
      lots[pid] = takeStock(k, pid, q);
      // Hàng nhà trồng giao qua app cũng rút nhãn (app tính giá riêng, không cộng thưởng nhà trồng)
      const left = (hg[pid] ?? 0) - q;
      if (left > 0) hg[pid] = left;
      else if (hg[pid] !== undefined) delete hg[pid];
    }
    const arriveAt = Math.round(s.minutes + travel);
    set({
      ...k,
      garden: { ...s.garden, homegrown: hg },
      money: s.money - fee,
      online: {
        ...s.online, grabFeesToday: s.online.grabFeesToday + fee,
        orders: s.online.orders.map((it) => (it === o ? { ...o, status: 'shipping' as const, via, arriveAt, lots } : it)),
      },
      stats: { ...s.stats, spent: s.stats.spent + fee, grabFees: (s.stats.grabFees ?? 0) + fee },
    });
    s.notify(`${via === 'own' ? '🛵 Nhân viên tiệm' : `🟢 Grab (${formatMoney(fee)})`} đang chở đơn cho ${o.customer}, tới nơi sau ~${travel} phút${arriveAt > o.dueAt ? ' — sẽ trễ hẹn!' : ''}`);
    return true;
  },
  declineOnline: (id) => {
    const s = get();
    const o = s.online.orders.find((it) => it.id === id && it.status === 'new');
    if (!o) return;
    // Từ chối chủ động đỡ hơn để app tự huỷ, nhưng vẫn trừ chút điểm
    set({ online: { ...s.online, orders: s.online.orders.filter((it) => it !== o), ratingSum: s.online.ratingSum + 4.5, ratingCount: s.online.ratingCount + 1 } });
  },
});

/** Cuối ngày: đơn đang chở coi như tới trễ (tính tiền, sao thấp); đơn chưa nhận thì app huỷ (chưa lấy hàng khỏi kho). */
export function onlineDayEnd(s: GameState) {
  const on = s.online;
  let money = 0;
  let { ratingSum, ratingCount, done, late } = on;
  for (const o of on.orders) {
    if (o.status === 'shipping') {
      money += Math.round(onlineValue(o, s.priceOf) * (1 - APP_COMMISSION));
      ratingSum += 3; ratingCount++; done++; late++;
    }
  }
  return { money, online: { ...on, orders: [], ratingSum, ratingCount, done, late, revenueToday: 0, grabFeesToday: 0, nextAt: 0 } };
}
