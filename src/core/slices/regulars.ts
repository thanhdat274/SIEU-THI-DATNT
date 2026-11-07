import { formatMoney, productById } from '../../data/products';
import { composeReview, REVIEW_CAP } from '../../data/reviews';
import { REGULARS, regularById, regularCheckout, BIRTHDAY_BONUS, isBirthday, regularFriendship, regularWalkout, INFLUENCER_ID, RESERVE_BONUS, RESERVE_MISS_LOSS, rescueGiftFor } from '../../data/regulars';
import { FORGIVE_FRIEND_GAIN, installmentNow, REMIND_FRIEND_LOSS } from '../../data/credit';
import { counterActive, RESCUE_FEE, RESCUE_FRIENDSHIP } from '../../data/biz';
import { copyStock, takeStock } from '../stock';
import { arcForRegular, arcById, currentArcStep, arcStepFulfilled } from '../../data/regularArc';
import { satisfiedLine, walkoutLine } from '../../data/regularTrust';
import { REP_CAP } from '../../data/reputation';
import { regularGiftPlan, giftFriendship, giftXp, giftableCount, giftRemainNote } from '../../data/regularGift';
import { type GameState, type SetState, type GetState, addHour } from '../gameTypes';

/** Khách: lượt ghé, khách quen, lời hẹn giữ món, sổ nợ, đánh giá. */

export const createRegularsSlice = (set: SetState, get: GetState): Pick<GameState, 'recordVisit' | 'regularVisit' | 'addReservation' | 'cancelReservation' | 'adjustFriendship' | 'rescuePoachedRegular' | 'checkoutOnCredit' | 'collectDebt' | 'collectDebtPartial' | 'remindDebt' | 'forgiveDebt' | 'giftRegular' | 'addReview'> => ({
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
  regularVisit: (id, basket, paid, miss) => {
    const s = get();
    const def = regularById(id);
    if (!def) return 0;
    if (!paid) {
      set({ regulars: { ...s.regulars, [id]: regularWalkout(s.regulars[id], s.day, def, miss?.id) } });
      s.notify(`😞 ${def.name}: "${walkoutLine(def.lines.walkout, miss && { name: productById(miss.id).name, why: miss.why })}"`);
      return 0;
    }
    const r = regularCheckout(def, s.regulars[id], basket, s.day);
    set({
      regulars: { ...s.regulars, [id]: r.progress },
      money: s.money + r.tip,
      stats: { ...s.stats, revenue: s.stats.revenue + r.tip },
      biz: { ...s.biz, triAnMonth: (s.biz.triAnMonth ?? 0) + 1 }, // Sổ thương mến (GĐ69): 1 khách quen được phục vụ
    });
    // Câu chuyện khách quen (GĐ80): mời đợt nhờ vả nếu đủ thân & chưa có; đo tiến độ theo giỏ mua hôm nay
    const arcBase = s.biz.regularArcs ?? {};
    let arcState = arcBase[id];
    const freshOffer = !arcState;
    if (!arcState) {
      const arcDef = arcForRegular(def, s.regulars[id], arcBase, s.level);
      if (arcDef) arcState = { arcId: arcDef.id, step: 0, offerDay: s.day, expiresDay: s.day + arcDef.days, waitingReward: false };
    }
    let arcNote = '';
    if (arcState) {
      const arc = arcById(arcState.arcId);
      const step = arc ? currentArcStep(arc, arcState) : null;
      let next = arcState;
      let advanceNote = '';
      if (arc && step && !arcState.done && !arcState.waitingReward && arcStepFulfilled(step, basket)) {
        const stepNext = arcState.step + 1;
        const waiting = stepNext >= arc.steps.length;
        next = { ...arcState, step: stepNext, waitingReward: waiting };
        advanceNote = waiting ? ' — xong hết bước, tối nay gom thưởng' : ` — ${def.name} nhận đủ: ${arc.steps[stepNext]?.note}`;
      }
      set({ biz: { ...get().biz, regularArcs: { ...arcBase, [id]: next } } });
      arcNote = freshOffer ? ` · 📖 bắt đầu: ${arc?.title} (hạn ${arc?.days} ngày)` : ` · 📖${advanceNote}`;
    }
    // Influencer ghé: khán giả theo chân, trang mạng xã hội thêm người theo dõi
    if (id === INFLUENCER_ID) {
      set({ social: { ...get().social, followers: get().social.followers + 25 } });
      s.notify('📱 Chị Vy quay clip mua sắm: trang tiệm thêm 25 người theo dõi!');
    }
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
    if (r.newPerks.length) s.notify(`💛 ${def.name} thân thiết hơn: ${r.newPerks.map((p) => p.description).join(' ')}${tip}${resNote}${giftNote}${arcNote}`);
    else if (r.points >= BIRTHDAY_BONUS && isBirthday(def, s.day)) s.notify(`🎂 Sinh nhật ${def.name}: +${BIRTHDAY_BONUS} thân thiết${tip}${resNote || giftNote || arcNote}`); // GĐ759: thay câu thường, không thêm thông báo
    else s.notify(`😊 ${def.name}: "${satisfiedLine(def.lines.satisfied, get().regulars[id], s.shopName)}"${tip}${resNote}${giftNote}${arcNote}`);
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
  // GĐ793 — đòi lại khách quen bị rival lôi kéo: tặng 1 món họ thích trong kho + tiền quà, mỗi ngày 1 người.
  // Chạy ở máy chạy (GUARDED 'rival:poach') nên chơi đơn và hẻm online ra cùng kết quả.
  rescuePoachedRegular: (id) => {
    const s = get();
    const rival = s.biz.rival;
    const def = regularById(id);
    if (!rival || !def || !(id in (rival.poached ?? {}))) return false;
    if (s.biz.rescueDay === s.day) {
      s.notify('Hôm nay đã đòi một khách rồi — mai tính tiếp');
      return false;
    }
    const gift = rescueGiftFor(def, s.level, (pid) => (s.storage[pid] ?? 0) > 0);
    if (!gift) {
      s.notify(`Cần 1 ${productById(def.favorites[0]).name} trong kho để làm quà đòi khách về`);
      return false;
    }
    if (s.money < RESCUE_FEE) {
      s.notify(`Cần ${formatMoney(RESCUE_FEE)} mua quà đòi khách về`);
      return false;
    }
    const stock = copyStock({ storage: s.storage, storageLots: s.storageLots });
    takeStock(stock, gift, 1);
    const poached = { ...(rival.poached ?? {}) };
    delete poached[id];
    set({
      storage: stock.storage,
      storageLots: stock.storageLots,
      money: s.money - RESCUE_FEE,
      stats: { ...s.stats, spent: s.stats.spent + RESCUE_FEE },
      biz: { ...s.biz, rival: { ...rival, poached }, rescueDay: s.day },
    });
    get().adjustFriendship(id, RESCUE_FRIENDSHIP);
    get().notify(`💛 Tặng ${productById(gift).name}, ${def.name} quay lại tiệm — +${RESCUE_FRIENDSHIP} thân thiết`);
    return true;
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
  // GĐ734 — chấp nhận trả góp: nhận nửa hôm nay, phần còn lại mở sổ 7 ngày mới (since = hôm nay)
  collectDebtPartial: (regularId) => {
    const s = get();
    const debt = s.debts[regularId];
    if (!debt?.amount) return 0;
    const now = installmentNow(debt.amount);
    const rest = debt.amount - now;
    const debts = { ...s.debts };
    if (rest > 0) debts[regularId] = { amount: rest, since: s.day };
    else delete debts[regularId];
    set({ debts, money: s.money + now, stats: { ...s.stats, repaid: (s.stats.repaid ?? 0) + now } });
    s.notify(`🤝 ${regularById(regularId)?.name} trả trước ${formatMoney(now)} — còn ${formatMoney(rest)} trả trong 7 ngày`);
    return now;
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
  // GĐ1557 — tặng 1 món khách thích từ kho: +3 thân thiết, mỗi khách 1 lần/ngày (cấp ≥38).
  giftRegular: (id) => {
    const s = get();
    const def = regularById(id);
    if (!def) return false;
    const plan = regularGiftPlan(def, s.regulars[id], s.level, s.day, s.storage);
    if ('error' in plan) {
      s.notify(`🎁 ${plan.error}`);
      return false;
    }
    const stock = copyStock({ storage: s.storage, storageLots: s.storageLots });
    takeStock(stock, plan.productId, 1);
    set({ storage: stock.storage, storageLots: stock.storageLots });
    const gain = giftFriendship(isBirthday(def, s.day));
    get().adjustFriendship(id, gain);
    const after = get().regulars[id];
    if (after) set({ regulars: { ...get().regulars, [id]: { ...after, lastGiftDay: s.day } } });
    set({ stats: { ...get().stats, gifts: (get().stats.gifts ?? 0) + 1 } }); // GĐ1584
    const bxp = giftXp(gain > 3); // GĐ1588
    if (bxp) get().addXp(bxp);
    s.notify(`🎁 Tặng ${def.name} 1 ${productById(plan.productId).name} · +${gain} thân thiết${gain > 3 ? ' (🎂 sinh nhật ×2, +' + bxp + ' XP)' : ''}${giftRemainNote(giftableCount(REGULARS.filter((r) => r.unlock <= s.level), get().regulars, s.level, s.day, get().storage))}`);
    return true;
  },
  addReview: (stars, reason, productId) => {
    const s = get();
    const review = composeReview({
      id: (s.reviews.at(-1)?.id ?? 0) + 1, day: s.day, minute: Math.floor(s.minutes), stars, reason,
      productId, productName: productId ? productById(productId).name : undefined,
    });
    set({
      reviews: [...s.reviews, review].slice(-REVIEW_CAP),
      ...(stars === 5 ? {
        totals: { ...s.totals, fiveStars: s.totals.fiveStars + 1 },
        // Đếm theo ngày song song với totals: sổ tuần dùng cái này cho thử thách "khách khen 5★"
        stats: { ...s.stats, fiveStars: (s.stats.fiveStars ?? 0) + 1 },
      } : {}),
    });
  },
});
