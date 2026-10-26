import { formatMoney, productById } from '../../data/products';
import { happyHourActive } from '../../data/rhythm';
import { makeVendorOffer, vendorById, wholesaleTotal } from '../../data/wholesale';
import { missKey } from '../../data/advice';
import { counterActive, PRICE_WAR_CUT } from '../../data/biz';
import { RISK_RULES } from '../../data/risks';
import { hasUpgrade } from '../../data/upgrades';
import { isNight, NIGHT_PRICE_MUL } from '../../data/night';
import { comboById, maxActiveCombos } from '../../data/combos';
import { paymentById } from '../../data/payments';
import { COOKED_PRODUCT_IDS } from '../../data/recipes';
import { type GameState, type SetState, type GetState, addHour } from '../gameTypes';
import { copyStock, takeStock } from '../stock';
import { HOMEGROWN_PREMIUM } from '../../data/garden';

/** Bán hàng ở quầy: giá, giờ vàng, tính tiền, bán sỉ, combo, trộm và tiền giả. */

export const createSalesSlice = (set: SetState, get: GetState): Pick<GameState, 'priceOf' | 'setPrice' | 'setHappyHour' | 'checkout' | 'noteMiss' | 'setAllowCredit' | 'offerWholesale' | 'acceptWholesale' | 'declineWholesale' | 'toggleCombo' | 'recordTheft' | 'recordCounterfeit'> => ({
  priceOf: (productId, minutes = get().minutes) => {
    const s = get();
    let p = s.prices[productId] ?? productById(productId).sell;
    // Đợt đối đầu giá với đối thủ: mọi món bán rẻ hơn trong ngày
    if (counterActive(s.biz.counter, s.day, 'price')) p = Math.round(p * (1 - PRICE_WAR_CUT));
    // Giờ vàng tự đặt: giảm giá đúng khung 2 tiếng đã chọn
    if (happyHourActive(s.happyHour, minutes)) p = Math.round(p * (1 - s.happyHour!.off / 100));
    // Ca đêm: khách khuya lười trả giá, được phép bán đắt hơn buổi ngày
    if (hasUpgrade(s.biz, 'night') && isNight(minutes)) p = Math.round(p * NIGHT_PRICE_MUL);
    return p;
  },
  setPrice: (productId, price) => set({ prices: { ...get().prices, [productId]: price } }),
  setHappyHour: (hh) => set({ happyHour: hh }),
  checkout: (items, discount = 0, combos = 0, payment = 'cash') => {
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
  },
  noteMiss: (reason, productId) => {
    const s = get();
    const key = missKey(reason, productId);
    set({ stats: {
      ...s.stats,
      missed: { ...s.stats.missed, [reason]: (s.stats.missed?.[reason] ?? 0) + 1 },
      missLog: { ...s.stats.missLog, [key]: (s.stats.missLog?.[key] ?? 0) + 1 },
    } });
    // Lần đầu trong ngày khách tìm một món mà kệ hết: báo để người chơi kịp bày/nhập thêm
    if (reason === 'stock' && productId && !s.stats.missLog?.[key]) {
      const name = productById(productId).name;
      s.notify((s.storage[productId] ?? 0) > 0
        ? `⚠️ Kệ hết ${name}, trong kho còn — bày lên kệ ngay!`
        : `⚠️ Khách tìm ${name} mà hết hàng — nhớ nhập thêm`);
    }
  },
  setAllowCredit: (on) => set({ allowCredit: on }),
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
  toggleCombo: (id) => {
    const s = get();
    if (s.activeCombos.includes(id)) return set({ activeCombos: s.activeCombos.filter((c) => c !== id) });
    const max = maxActiveCombos(s.level);
    if (s.activeCombos.length >= max) return s.notify(`Chỉ chạy được ${max} combo cùng lúc, tắt bớt một cái nhé`);
    set({ activeCombos: [...s.activeCombos, id] });
    s.notify(`🎁 Bắt đầu chạy combo ${comboById(id)?.name}`);
  },
  recordTheft: (value, caught) => {
    const s = get();
    if (!caught) return s.notify(`🦹 Có kẻ lấy ${formatMoney(value)} hàng rồi chuồn mất!`);
    const fine = value * RISK_RULES.theft.fineMul;
    set({ money: s.money + fine, stats: { ...s.stats, revenue: s.stats.revenue + fine } });
    s.notify(`🚨 Bắt quả tang kẻ trộm! Trả hàng và nộp phạt ${formatMoney(fine)}`);
  },
  recordCounterfeit: (note, detected) => {
    const s = get();
    if (detected) return s.notify(`🔍 Phát hiện tờ ${formatMoney(note)} giả, khách đành đổi tiền thật`);
    set({ money: s.money - note, fakeCash: s.fakeCash + note });
  },
});
