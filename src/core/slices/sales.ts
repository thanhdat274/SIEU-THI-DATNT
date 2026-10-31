import { formatMoney, productById } from '../../data/products';
import { happyHourActive } from '../../data/rhythm';
import { makeVendorOffer, vendorById, wholesaleTotal } from '../../data/wholesale';
import { missKey } from '../../data/advice';
import { counterActive, PRICE_WAR_CUT } from '../../data/biz';
import { defaultCounterPolicy, type CounterPolicy } from '../../data/counterDeals';
import { RISK_RULES } from '../../data/risks';
import { hasUpgrade } from '../../data/upgrades';
import { isNight, NIGHT_PRICE_MUL } from '../../data/night';
import { comboById, maxActiveCombos } from '../../data/combos';
import { paymentById } from '../../data/payments';
import { COOKED_PRODUCT_IDS } from '../../data/recipes';
import { type GameState, type SetState, type GetState, addHour } from '../gameTypes';
import { copyStock, takeStock } from '../stock';
import { HOMEGROWN_PREMIUM } from '../../data/garden';
import { marketClearValue } from '../../data/chophien';
import { itemHealthList, shelfCount } from '../../data/analytics';
import { revenueFactor } from '../prestige';

/** Bán hàng ở quầy: giá, giờ vàng, tính tiền, bán sỉ, combo, trộm và tiền giả. */

export const createSalesSlice = (set: SetState, get: GetState): Pick<GameState, 'priceOf' | 'setPrice' | 'setPrices' | 'setHappyHour' | 'checkout' | 'noteMiss' | 'setAllowCredit' | 'setCounterPolicy' | 'offerWholesale' | 'acceptWholesale' | 'declineWholesale' | 'sellMarketSurplus' | 'toggleCombo' | 'noteComboHits' | 'recordTheft' | 'recordCounterfeit' | 'tallyDemographics'> => ({
  priceOf: (productId, minutes = get().minutes) => {
    const s = get();
    let p = s.prices[productId] ?? productById(productId).sell;
    // Đợt đối đầu giá với đối thủ: mọi món bán rẻ hơn trong ngày
    if (counterActive(s.biz.counter, s.day, 'price')) p = Math.round(p * (1 - PRICE_WAR_CUT));
    // Giờ vàng tự đặt: giảm giá đúng khung 2 tiếng đã chọn
    if (happyHourActive(s.happyHour, minutes)) p = Math.round(p * (1 - s.happyHour!.off / 100));
    // Ca đêm: khách khuya lười trả giá, được phép bán đắt hơn buổi ngày
    if (hasUpgrade(s.biz, 'night') && isNight(minutes)) p = Math.round(p * NIGHT_PRICE_MUL);
    // Tái sinh (NG+): tiệm tái sinh bán đắt hơn theo bonus (revenueFactor 0 → giữ nguyên như cũ)
    p = Math.round(p * revenueFactor(s.biz.prestige.bonus));
    return p;
  },
  setPrice: (productId, price) => set({ prices: { ...get().prices, [productId]: price } }),
  // Đổi nhiều giá một lúc, chỉ món còn đúng giá người bấm vừa thấy (from): ở hẻm online người khác
  // vừa đổi giá món đó thì giữ giá của họ, không đè bằng bảng giá cũ. to = null là về giá gợi ý.
  setPrices: (changes) => {
    const prices = { ...get().prices };
    let applied = 0;
    for (const [id, { from, to }] of Object.entries(changes)) {
      if (prices[id] !== from) continue;
      if (to == null) delete prices[id];
      else prices[id] = to;
      applied++;
    }
    set({ prices });
    return applied;
  },
  setHappyHour: (hh) => set({ happyHour: hh }),
  checkout: (items, discount = 0, combos = 0, payment = 'cash', profId?: string) => {
    const s = get();
    const total = items.reduce((sum, it) => sum + it.price, 0) - discount;
    // Ví điện tử / máy POS lấy ít % phí, tiền mặt và chuyển khoản không mất gì
    const pay = paymentById(payment);
    const fee = Math.round(total * pay.fee);
    // Món "nhà trồng/nhà nuôi" còn trong kho: khách thích hàng nhà làm, trả thêm 20%
    const homegrown = { ...s.garden.homegrown };
    let premium = 0;
    for (const it of items) {
      if ((homegrown[it.id] ?? 0) > 0) {
        homegrown[it.id]!--;
        if (!homegrown[it.id]) delete homegrown[it.id];
        premium += it.price * HOMEGROWN_PREMIUM;
      }
    }
    premium = Math.round(premium / 100) * 100;
    const salesToday = { ...s.salesToday };
    const byItem = { ...s.stats.byItem };
    for (const it of items) {
      salesToday[it.id] = (salesToday[it.id] ?? 0) + 1;
      const line = byItem[it.id] ?? { qty: 0, revenue: 0, cost: 0 };
      byItem[it.id] = { qty: line.qty + 1, revenue: line.revenue + it.price, cost: line.cost + productById(it.id).buy };
    }
    const byMethod = { ...s.stats.byMethod };
    const m = byMethod[payment] ?? { revenue: 0, count: 0 };
    byMethod[payment] = { revenue: m.revenue + total, count: m.count + 1 };
    set({
      salesToday,
      garden: { ...s.garden, homegrown },
      money: s.money + total - fee + premium,
      stats: {
        ...s.stats, revenue: s.stats.revenue + total + premium, itemsSold: s.stats.itemsSold + items.length, byItem,
        byHour: addHour(s.stats.byHour, s.minutes, 0, total + premium), byMethod,
        fees: (s.stats.fees ?? 0) + fee,
        combos: (s.stats.combos ?? 0) + combos, comboDiscount: (s.stats.comboDiscount ?? 0) + discount,
      },
      totals: {
        ...s.totals, revenue: s.totals.revenue + total + premium, itemsSold: s.totals.itemsSold + items.length,
        cookedSold: s.totals.cookedSold + items.filter((it) => COOKED_PRODUCT_IDS.has(it.id)).length,
      },
    });
    // Mỗi món 1 XP, hàng đắt cho thêm (cứ 20.000đ thêm 1 XP)
    s.addXp(items.reduce((sum, it) => sum + 1 + Math.floor(it.price / 20000), 0));
    get().communitySale(items.map((it) => it.id));
    // Nhân khẩu học (GĐ62): ghi doanh thu theo nghề khách vãng lai khi quầy truyền profId
    if (profId) get().tallyDemographics(profId, { revenue: total + premium });
    // Sổ tay Tiệm (GĐ36): ghi món vừa bán để đếm "đã khám phá X/Y món"
    get().recordDiscovery(items.map((it) => it.id));
  },
  noteMiss: (reason, productId) => {
    const s = get();
    const key = missKey(reason, productId);
    set({ stats: {
      ...s.stats,
      missed: { ...s.stats.missed, [reason]: (s.stats.missed?.[reason] ?? 0) + 1 },
      missLog: { ...s.stats.missLog, [key]: (s.stats.missLog?.[key] ?? 0) + 1 },
    } });
    // Chỉ báo MỘT lần mỗi ngày (lần đầu khách tìm món mà kệ hết); các món sau xem ở bảng Nhập hàng
    if (reason === 'stock' && productId && !s.stats.missed?.stock) {
      const name = productById(productId).name;
      s.notify((s.storage[productId] ?? 0) > 0
        ? `⚠️ Kệ hết ${name}, trong kho còn — bày lên kệ ngay!`
        : `⚠️ Khách tìm ${name} mà hết hàng — nhớ nhập thêm`);
    }
  },
  setAllowCredit: (on) => set({ allowCredit: on }),
  setCounterPolicy: (patch) => {
    const cur = get().counterPolicy ?? defaultCounterPolicy();
    set({ counterPolicy: { ...cur, ...patch } });
  },
  offerWholesale: () => {
    const s = get();
    if (s.vendorOffer) return s.vendorOffer;
    const offer = makeVendorOffer(s.level, s.minutes);
    if (!offer) return null;
    set({ vendorOffer: offer, vendorDay: s.day });
    const v = vendorById(offer.vendorId)!;
    s.notify(`${v.icon} ${v.name} ghé lấy sỉ ${v.goods}`);
    return offer;
  },
  acceptWholesale: () => {
    const s = get();
    const offer = s.vendorOffer;
    if (!offer) return false;
    const missing = Object.entries(offer.items).filter(([id, q]) => (s.storage[id] ?? 0) < q);
    if (missing.length) {
      s.notify(`Kho còn thiếu: ${missing.map(([id, q]) => `${q - (s.storage[id] ?? 0)} ${productById(id).name}`).join(', ')}`);
      return false;
    }
    const k = copyStock(s);
    for (const [id, q] of Object.entries(offer.items)) takeStock(k, id, q);
    const pay = wholesaleTotal(offer.items, s.priceOf);
    const units = Object.values(offer.items).reduce((n, q) => n + q, 0);
    const byItem = { ...s.stats.byItem };
    for (const [id, q] of Object.entries(offer.items)) {
      const line = byItem[id] ?? { qty: 0, revenue: 0, cost: 0 };
      const revenue = wholesaleTotal({ [id]: q }, s.priceOf);
      byItem[id] = { qty: line.qty + q, revenue: line.revenue + revenue, cost: line.cost + productById(id).buy * q };
    }
    set({
      ...k, vendorOffer: null, money: s.money + pay,
      stats: { ...s.stats, revenue: s.stats.revenue + pay, itemsSold: s.stats.itemsSold + units, byItem },
      totals: { ...s.totals, revenue: s.totals.revenue + pay, itemsSold: s.totals.itemsSold + units },
    });
    get().addXp(10 + Math.floor(units / 3));
    s.notify(`🤝 Bán sỉ cho ${vendorById(offer.vendorId)?.name}: ${units} món, +${formatMoney(pay)}`);
    return true;
  },
  declineWholesale: () => set({ vendorOffer: null }),
  sellMarketSurplus: () => {
    const s = get();
    if (s.marketClearedDay === s.day) return { ok: false, reason: 'already' };
    const shelved = shelfCount(s.furniture);
    const val = marketClearValue({
      day: s.day, storage: s.storage, shelved,
      health: itemHealthList(s.analytics, s.level, s.storage, shelved, s.demand),
    });
    if (!val || val.rows.length === 0) return { ok: false, reason: 'no-surplus' };
    const k = copyStock(s);
    for (const r of val.rows) takeStock(k, r.id, r.qty);
    const byItem = { ...s.stats.byItem };
    let units = 0;
    for (const r of val.rows) {
      const p = productById(r.id);
      const line = byItem[r.id] ?? { qty: 0, revenue: 0, cost: 0 };
      byItem[r.id] = { qty: line.qty + r.qty, revenue: line.revenue + r.est, cost: line.cost + p.buy * r.qty };
      units += r.qty;
    }
    const pay = val.total;
    set({
      ...k, marketClearedDay: s.day, marketLast: { day: s.day, units, revenue: pay },
      money: s.money + pay,
      stats: { ...s.stats, revenue: s.stats.revenue + pay, itemsSold: s.stats.itemsSold + units, byItem },
      totals: { ...s.totals, revenue: s.totals.revenue + pay, itemsSold: s.totals.itemsSold + units },
    });
    get().addXp(10 + Math.floor(units / 4));
    s.notify(`🧺 Bán chợ phiên: ${units} món dư, +${formatMoney(pay)}`);
    return { ok: true, units, pay };
  },
  toggleCombo: (id) => {
    const s = get();
    if (s.activeCombos.includes(id)) return set({ activeCombos: s.activeCombos.filter((c) => c !== id) });
    const max = maxActiveCombos(s.level);
    if (s.activeCombos.length >= max) return s.notify(`Chỉ chạy được ${max} combo cùng lúc, tắt bớt một cái nhé`);
    set({ activeCombos: [...s.activeCombos, id] });
    s.notify(`🎁 Bắt đầu chạy combo ${comboById(id)?.name}`);
  },
  noteComboHits: (byCombo) => {
    if (!byCombo || !Object.keys(byCombo).length) return;
    const s = get();
    const merged = { ...s.comboHitCount };
    let changed = false;
    for (const [id, n] of Object.entries(byCombo)) {
      if (!n) continue;
      merged[id] = (merged[id] ?? 0) + n;
      changed = true;
    }
    if (changed) set({ comboHitCount: merged });
  },
  recordTheft: (value, caught) => {
    const s = get();
    const r = s.riskToday;
    const riskToday = { leak: r.leak, blocked: r.blocked, events: r.events + 1 };
    if (!caught) {
      riskToday.leak += value;
      set({ riskToday });
      return s.notify(`🦹 Có kẻ lấy ${formatMoney(value)} hàng rồi chuồn mất!`);
    }
    const fine = value * RISK_RULES.theft.fineMul;
    // Phạt đã cộng vào tiền (recovered) — ghi vào sổ rủi ro là "chặn/thu lại", kinh tế không đổi.
    riskToday.blocked += fine;
    set({ money: s.money + fine, stats: { ...s.stats, revenue: s.stats.revenue + fine }, riskToday });
    s.notify(`🚨 Bắt quả tang kẻ trộm! Trả hàng và nộp phạt ${formatMoney(fine)}`);
  },
  recordCounterfeit: (note, detected) => {
    const s = get();
    const r = s.riskToday;
    const riskToday = { leak: r.leak, blocked: r.blocked, events: r.events + 1 };
    if (detected) {
      // Chặn được tiền giả: khách đổi tiền thật, không mất — chỉ ghi vào sổ.
      riskToday.blocked += note;
      set({ riskToday });
      return s.notify(`🔍 Phát hiện tờ ${formatMoney(note)} giả, khách đành đổi tiền thật`);
    }
    // Không phát hiện: két vẫn mất like trước (fakeCash++ giữ nguyên) — ghi là "lọt".
    riskToday.leak += note;
    set({ money: s.money - note, fakeCash: s.fakeCash + note, riskToday });
  },
  tallyDemographics: (id, patch) => {
    const s = get();
    if (!Object.keys(patch).length) return;
    const cur = s.biz.demographics?.[id] ?? { visits: 0, revenue: 0, walkouts: 0 };
    set({
      biz: {
        ...s.biz,
        demographics: {
          ...(s.biz.demographics ?? {}),
          [id]: {
            visits: cur.visits + (patch.visits ?? 0),
            revenue: cur.revenue + (patch.revenue ?? 0),
            walkouts: cur.walkouts + (patch.walkouts ?? 0),
          },
        },
      },
    });
  },
});
