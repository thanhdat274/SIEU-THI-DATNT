import { formatMoney, productById } from '../../data/products';
import { composeReview, REVIEW_CAP } from '../../data/reviews';
import { regularById, regularCheckout, regularFriendship, regularWalkout, RESERVE_BONUS, RESERVE_MISS_LOSS } from '../../data/regulars';
import { FORGIVE_FRIEND_GAIN, REMIND_FRIEND_LOSS } from '../../data/credit';
import { counterActive } from '../../data/biz';
import { REP_CAP } from '../../data/reputation';
import { type GameState, type SetState, type GetState, addHour } from '../gameTypes';

/** Khách: lượt ghé, khách quen, lời hẹn giữ món, sổ nợ, đánh giá. */

export const createRegularsSlice = (set: SetState, get: GetState): Pick<GameState, 'recordVisit' | 'regularVisit' | 'addReservation' | 'cancelReservation' | 'adjustFriendship' | 'checkoutOnCredit' | 'collectDebt' | 'remindDebt' | 'forgiveDebt' | 'addReview'> => ({
  recordVisit: (happy, sample) => {
    const s = get();
    set({
      ...(sample ? { repLog: [...s.repLog, sample].slice(-REP_CAP) } : {}),
      stats: {
        ...s.stats, customers: s.stats.customers + 1, unhappy: s.stats.unhappy + (happy ? 0 : 1),
        byHour: addHour(s.stats.byHour, s.minutes, 1, 0),
      },
      totals: { ...s.totals, customers: s.totals.customers + 1 },
    });
    if (happy) s.addXp(2);
  },
  regularVisit: (id, basket, paid) => {
    const s = get();
    const def = regularById(id);
    if (!def) return 0;
    if (!paid) {
      set({ regulars: { ...s.regulars, [id]: regularWalkout(s.regulars[id], s.day) } });
      s.notify(`😞 ${def.name}: "${def.lines.walkout}"`);
      return 0;
    }
    const r = regularCheckout(def, s.regulars[id], basket, s.day);
    set({
      regulars: { ...s.regulars, [id]: r.progress },
      money: s.money + r.tip,
      stats: { ...s.stats, revenue: s.stats.revenue + r.tip },
    });
    // Đợt tri ân khách quen (phản công đối thủ): mỗi khách ghé hôm nay được tặng quà
    let giftNote = '';
    if (counterActive(s.biz.counter, s.day, 'gift')) {
      get().adjustFriendship(id, 2);
      giftNote = ' · 🎁 quà tri ân +2 thân thiết';
    }
    // Lời hẹn giữ món hôm nay: giữ đúng thì khách mừng, hẹn mà không mua được thì phật ý
    const res = s.reservations[id];
    let resNote = '';
    if (res && res.day === s.day) {
      const got = basket.filter((it) => it.id === res.productId).reduce((n, it) => n + 1, 0);
      if (got >= res.qty) {
        get().adjustFriendship(id, RESERVE_BONUS);
        resNote = ` · 🤝 Giữ đúng hẹn ${res.qty} ${productById(res.productId).name}, +${RESERVE_BONUS} thân thiết`;
        set({ stats: { ...get().stats, reservationsFilled: (get().stats.reservationsFilled ?? 0) + 1 } });
      } else {
        get().adjustFriendship(id, -RESERVE_MISS_LOSS);
        resNote = ` · 😔 Đã hẹn giữ ${res.qty} ${productById(res.productId).name} mà không mua được, -${RESERVE_MISS_LOSS} thân thiết`;
      }
      const { [id]: _drop, ...restRes } = get().reservations;
      set({ reservations: restRes });
    }
    const tip = r.tip ? ` · boa ${formatMoney(r.tip)}` : '';
    if (r.newPerks.length) s.notify(`💛 ${def.name} thân thiết hơn: ${r.newPerks.map((p) => p.description).join(' ')}${tip}${resNote}${giftNote}`);
    else s.notify(`😊 ${def.name}: "${def.lines.satisfied}"${tip}${resNote}${giftNote}`);
    return r.tip;
  },
  addReservation: (regularId, productId, qty) => {
    const s = get();
    if (!regularById(regularId)) return;
    set({ reservations: { ...s.reservations, [regularId]: { productId, qty, day: s.day + 1 } } });
    s.notify(`🤝 Đã hẹn giữ ${qty} ${productById(productId).name} cho ${regularById(regularId)?.name} — mai khách ghé lấy, nhớ bày đầy kệ!`);
  },
  cancelReservation: (regularId) => {
    const s = get();
    if (!s.reservations[regularId]) return;
    const { [regularId]: _drop, ...rest } = s.reservations;
    set({ reservations: rest });
    s.notify(`👎 Đã từ chối lời hẹn giữ món (không mất thân thiết)`);
  },
  adjustFriendship: (id, delta) => {
    const s = get();
    const def = regularById(id);
    if (!def) return;
    const r = regularFriendship(def, s.regulars[id], delta);
    set({ regulars: { ...s.regulars, [id]: r.progress } });
    if (r.newPerks.length) s.notify(`💛 ${def.name} thân thiết hơn: ${r.newPerks.map((p) => p.description).join(' ')}`);
  },
  checkoutOnCredit: (regularId, items, discount = 0, combos = 0) => {
    // Ghi nhận bán hàng như thường (sổ thanh toán ghi vào "Ghi sổ"), rồi lấy lại tiền khỏi két và ghi vào sổ nợ
    get().checkout(items, discount, combos, 'credit');
    const s = get();
    const total = items.reduce((sum, it) => sum + it.price, 0) - discount;
    const old = s.debts[regularId];
    const amount = (old?.amount ?? 0) + total;
    set({
      money: s.money - total,
      debts: { ...s.debts, [regularId]: { amount, since: old?.since ?? s.day } },
      stats: { ...s.stats, credited: (s.stats.credited ?? 0) + total },
    });
    s.notify(`📒 ${regularById(regularId)?.name} quên ví, ghi sổ ${formatMoney(total)} (tổng nợ ${formatMoney(amount)})`);
  },
  collectDebt: (regularId) => {
    const s = get();
    const debt = s.debts[regularId];
    if (!debt?.amount) return 0;
    const debts = { ...s.debts };
    delete debts[regularId];
    set({ debts, money: s.money + debt.amount, stats: { ...s.stats, repaid: (s.stats.repaid ?? 0) + debt.amount } });
    s.notify(`💵 ${regularById(regularId)?.name} trả nợ ${formatMoney(debt.amount)}${debt.reminded ? '' : ', cảm ơn tiệm cho ghi sổ'}`);
    return debt.amount;
  },
  remindDebt: (regularId) => {
    const s = get();
    const debt = s.debts[regularId];
    if (!debt || debt.reminded) return;
    set({ debts: { ...s.debts, [regularId]: { ...debt, reminded: true } } });
    s.adjustFriendship(regularId, -REMIND_FRIEND_LOSS);
    s.notify(`📞 Đã nhắc ${regularById(regularId)?.name}, lần tới ghé sẽ trả (khách hơi ngại, -${REMIND_FRIEND_LOSS} thân thiết)`);
  },
  forgiveDebt: (regularId) => {
    const s = get();
    const debt = s.debts[regularId];
    if (!debt) return;
    const debts = { ...s.debts };
    delete debts[regularId];
    set({ debts });
    s.adjustFriendship(regularId, FORGIVE_FRIEND_GAIN);
    s.notify(`🤝 Xoá nợ ${formatMoney(debt.amount)} cho ${regularById(regularId)?.name} · +${FORGIVE_FRIEND_GAIN} thân thiết`);
  },
  addReview: (stars, reason, productId) => {
    const s = get();
    const review = composeReview({
      id: (s.reviews.at(-1)?.id ?? 0) + 1, day: s.day, minute: Math.floor(s.minutes), stars, reason,
      productId, productName: productId ? productById(productId).name : undefined,
    });
    set({
      reviews: [...s.reviews, review].slice(-REVIEW_CAP),
      ...(stars === 5 ? { totals: { ...s.totals, fiveStars: s.totals.fiveStars + 1 } } : {}),
    });
  },
});
