import { furnitureDef, isCookStation } from '../../data/furniture';
import { formatMoney, productById } from '../../data/products';
import type { Lot } from '../../data/freshness';
import { regularById, regularFriendship } from '../../data/regulars';
import { missingForOrder, rushQuote, orderValue, partyOrderById, STORY_ORDER_FRIEND_GAIN } from '../../data/orders';
import { FESTIVALS, festivalOn } from '../../data/calendar';
import { vendorById } from '../../data/wholesale';
import { CANCEL_AFTER_LATE, describeItems, FAST_TIP, fastWindow, houseById, ON_TIME_TIP, PHONE_FRIEND_GAIN, PHONE_SLOTS, phoneCallFor, phoneOrderValue, type PhoneOrder } from '../../data/phoneOrders';
import { type CookingStation, COOKED_PRODUCT_IDS, RECIPE_MAP } from '../../data/recipes';
import { BARTENDER_SPEED_PER_STAR, bestSkillOnDuty, SHIFTS } from '../../data/staff';
import { workSpeed } from '../../data/staffTraits';
import { commitBonusValue, commitDeposit, CONTRACT_STREAK_BONUS, contractMilestoneDue, contractValue, missingForContract, reservedMissing, supplyContractById } from '../../data/contracts';
import { describeRep, meetsRep, reputationOf } from '../../data/reputation';
import { activeGoals, addSales, goalLocked, goalMet } from '../../data/community';
import { playSfx } from '../audio';
import type { GameState, SetState, GetState } from '../gameTypes';
import { copyStock, putStock, takeStock, type Stock } from '../stock';
import { formatClock } from '../store';

/** Đơn hàng: điện thoại giao tận nhà, đơn tiệc, mẻ nấu, hợp đồng cung cấp, mục tiêu chung của hẻm. */

/** Đầu bếp trực ca tay nghề cao nhất: mẻ nấu nhanh hơn bấy nhiêu (1★ = như chủ tự nấu). */
export const cookSpeed = (get: GetState) => {
  const s = get();
  let best = 1;
  for (const st of s.staff) {
    if (st.role !== 'cook') continue;
    const shift = SHIFTS[st.shift];
    if (s.minutes >= shift.from && s.minutes < shift.to) best = Math.max(best, workSpeed(st));
  }
  return best;
};

/** Pha chế trực ca: riêng mẻ ở trạm pha chế (cà phê, trà sữa...) nhanh thêm theo tay nghề, cộng cùng đầu bếp. */
export const bartenderBoost = (get: GetState) =>
  1 + BARTENDER_SPEED_PER_STAR * bestSkillOnDuty(get().staff, 'bartender', get().minutes);

/** Điện thoại: đổ chuông theo khung giờ khi tiệm mở; cúp máy khi không nghe; huỷ khi trễ quá lâu. */
export const updatePhones = (set: SetState, get: GetState) => {
  const s = get();
  let { phoneOrders, phoneSlot } = s;
  let changed = false;
  const hasCourier = s.staff.some((w) => w.role === 'courier');
  while (phoneSlot < PHONE_SLOTS.length && s.minutes >= PHONE_SLOTS[phoneSlot]) {
    // Lỡ khung giờ (tua nhanh qua), tiệm đóng cửa hoặc chưa thuê nhân viên giao hàng thì bỏ qua khung đó
    // Có trạm nấu trong tiệm thì đôi khi cuộc gọi là đơn nấu món nhà làm (giá hời)
    const stations = [...new Set(s.furniture.filter((f) => isCookStation(f.type)).map((f) => f.type as CookingStation))];
    const call = s.shopOpen && s.minutes < PHONE_SLOTS[phoneSlot] + 30 && hasCourier
      ? phoneCallFor(s.weatherSeed, s.day, phoneSlot, s.level, s.regulars, s.day * 100 + phoneSlot, s.weather, s.storage, stations, reputationOf(s.repLog).overall, s.furniture.some((f) => f.type === 'meat_counter'))
      : null;
    if (call) {
      phoneOrders = [...phoneOrders, call];
      playSfx('ring');
      s.notify(call.vip
        ? `👑 ${call.caller} (người nhà của ${regularById(call.regular!)?.name ?? 'khách quen'}) đặt GÓI LỚN: ${describeItems(call.items)} — giá hời ×${call.premium}!`
        : call.premium
          ? `🍳 ${call.caller} (${houseById(call.houseId)!.name}) đặt nấu: ${describeItems(call.items)} — trả giá hời ×${call.premium}, nấu xong nghe máy rồi mang đi!`
          : `📞 ${call.caller} (${houseById(call.houseId)!.name}) gọi đặt hàng: ${describeItems(call.items)}`);
    } else if (s.shopOpen && !hasCourier && (s.weather === 'rain' || s.weather === 'storm') && s.phoneHintDay !== s.day) {
      // Mưa mà không ai giao hàng thì lỡ hết đơn — nhắc một lần mỗi ngày cho khỏi làm phiền
      set({ phoneHintDay: s.day });
      s.notify('🌧️ Trời mưa, nhiều người muốn gọi đặt hàng — thuê nhân viên giao hàng để nhận đơn!');
    }
    phoneSlot++;
    changed = true;
  }
  const kept: PhoneOrder[] = [];
  let k: Stock | null = null;
  for (const o of phoneOrders) {
    if (o.status === 'ringing' && s.minutes > o.answerBy) {
      s.notify(`📵 ${o.caller} đã cúp máy vì không ai nghe`);
      changed = true;
    } else if (o.status === 'carrying' && s.minutes > o.dueAt + CANCEL_AFTER_LATE) {
      k ??= copyStock(get());
      for (const [id, qty] of Object.entries(o.items)) putStock(k, id, qty, o.lots?.[id]);
      s.addReview(2, 'wait');
      if (o.regular) s.adjustFriendship(o.regular, -PHONE_FRIEND_GAIN);
      s.notify(`😠 ${o.caller} huỷ đơn vì chờ quá lâu, hàng đã mang về kho`);
      changed = true;
    } else kept.push(o);
  }
  if (changed) set({ phoneOrders: kept, phoneSlot, ...(k ?? {}) });
  // Người bán rong chờ lâu không ai trả lời (hoặc tiệm đóng cửa) thì đi chỗ khác
  const offer = get().vendorOffer;
  if (offer && (s.minutes > offer.expiresAt || !s.shopOpen)) {
    const v = vendorById(offer.vendorId);
    set({ vendorOffer: null });
    s.notify(`${v?.icon} ${v?.name} chờ lâu quá, đi lấy hàng chỗ khác`);
  }
};

export const createOrdersSlice = (set: SetState, get: GetState): Pick<GameState, 'acceptOrder' | 'startCook' | 'declineOrder' | 'answerPhone' | 'restockAndAnswerPhone' | 'declinePhone' | 'deliverPhone' | 'deliverOrder' | 'rushDeliverOrder' | 'communitySale' | 'acceptContract' | 'commitContract' | 'releaseContract' | 'deliverContract'> => ({
  acceptOrder: () => {
    const s = get();
    if (!s.order) return;
    set({ order: { ...s.order, accepted: true } });
    s.notify(`📋 Đã nhận đơn, giao trước hết ngày ${s.order.dueDay}`);
  },
  startCook: (recipeId) => {
    const s = get();
    const r = RECIPE_MAP[recipeId];
    if (!r) return false;
    if (s.level < r.unlock) {
      s.notify(`Món "${r.name}" mở ở cấp ${r.unlock}`);
      return false;
    }
    // Giỏ quà ngày lễ: chỉ gói được trong đúng dịp (giỏ Tết gói mùa Tết...)
    if (r.festival) {
      const now = festivalOn(s.day);
      if (now?.id !== r.festival) {
        s.notify(`🎁 ${r.name} chỉ gói trong dịp ${FESTIVALS.find((f) => f.id === r.festival)?.name ?? r.festival}${now ? ' (đang là dịp khác)' : ' — chưa tới dịp'}`);
        return false;
      }
    }
    const stations = s.furniture.filter((f) => f.type === r.station);
    if (!stations.length) {
      s.notify(`Cần đặt trạm "${furnitureDef(r.station).name}" trong tiệm trước (mua ở 🛠️ Xây dựng)`);
      return false;
    }
    const busy = s.cookJobs.filter((j) => RECIPE_MAP[j.recipeId]?.station === r.station).length;
    if (busy >= stations.length) {
      s.notify(`${furnitureDef(r.station).name} đang bận mẻ trước, chờ chút nhé`);
      return false;
    }
    const missing = r.inputs.filter((i) => (s.storage[i.productId] ?? 0) < i.quantity);
    if (missing.length) {
      s.notify(`Thiếu nguyên liệu: ${missing.map((i) => `${i.quantity - (s.storage[i.productId] ?? 0)} ${productById(i.productId).name}`).join(', ')}. Nhập thêm rồi nấu nhé.`);
      return false;
    }
    const k = copyStock(s);
    // Nấu cũng tiêu HÀNG NHÀ TRỒNG/NHÀ NUÔI chứ không chỉ trừ kho chung: phải trừ luôn nhãn homegrown,
    // nếu không sẽ "nấu hết hàng nhà trồng, nhập lại hàng mua rồi bán vẫn ăn premium +20%" (lệch sổ + exploit).
    const homegrown = { ...s.garden.homegrown };
    for (const i of r.inputs) {
      takeStock(k, i.productId, i.quantity);
      const h = homegrown[i.productId] ?? 0;
      if (h > 0) {
        const left = h - i.quantity;
        if (left > 0) homegrown[i.productId] = left;
        else delete homegrown[i.productId];
      }
    }
    const id = Math.max(0, ...s.cookJobs.map((j) => j.id)) + 1;
    set({ ...k, garden: { ...s.garden, homegrown }, cookJobs: [...s.cookJobs, { id, recipeId, remaining: r.durationMin, total: r.durationMin }] });
    s.notify(`🍳 Đang nấu ${r.name} (${r.durationMin} phút) — nguyên liệu đã trừ kho, nấu xong tự vào kho`);
    return true;
  },
  declineOrder: () => set({ order: null }),
  answerPhone: (id) => {
    const s = get();
    const o = s.phoneOrders.find((p) => p.id === id && p.status === 'ringing');
    if (!o) return false;
    const missing = Object.entries(o.items).filter(([pid, q]) => (s.storage[pid] ?? 0) < q);
    if (missing.length) {
      s.notify(`Kho còn thiếu: ${missing.map(([pid, q]) => `${q - (s.storage[pid] ?? 0)} ${productById(pid).name}`).join(', ')}. Nhập thêm rồi nghe máy, hoặc từ chối.`);
      return false;
    }
    const k = copyStock(s);
    const lots: Record<string, Lot[]> = {};
    for (const [pid, q] of Object.entries(o.items)) lots[pid] = takeStock(k, pid, q);
    set({ ...k, phoneOrders: s.phoneOrders.map((p) => (p === o ? { ...o, status: 'carrying' as const, lots } : p)) });
    s.notify(`📦 Đã soạn hàng. Mang tới ${houseById(o.houseId)!.name} trước ${formatClock(o.dueAt)} để được boa`);
    return true;
  },
  restockAndAnswerPhone: (id) => {
    const s = get();
    const o = s.phoneOrders.find((p) => p.id === id && p.status === 'ringing');
    if (!o) return false;
    const missing = Object.entries(o.items)
      .map(([pid, q]) => [pid, q - (s.storage[pid] ?? 0)] as const)
      .filter(([, q]) => q > 0);
    // Món nhà làm không nhập bù bằng đơn được: phải nấu ở trạm mới giao được — báo rõ thay vì fail im lặng
    const cookedMissing = missing.filter(([pid]) => COOKED_PRODUCT_IDS.has(pid));
    if (cookedMissing.length) {
      s.notify(`🍳 ${cookedMissing.map(([pid, q]) => `${q} ${productById(pid).name}`).join(', ')} là món nhà làm — phải vào trạm chế biến nấu trước, không nhập bù được`);
      return false;
    }
    const restockable = missing.filter(([pid]) => !COOKED_PRODUCT_IDS.has(pid));
    const cost = restockable.reduce((sum, [pid, q]) => sum + productById(pid).buy * q, 0);
    if (s.money < cost) {
      s.notify(`Không đủ tiền nhập bù (cần ${formatMoney(cost)})`);
      return false;
    }
    const failed: string[] = [];
    for (const [pid, q] of restockable) if (!get().buy(pid, q)) failed.push(productById(pid).name);
    if (failed.length) {
      s.notify(`⚠️ Không nhập bù được: ${failed.join(', ')} (hết tiền hoặc kho không đủ chỗ). Vào bảng Kho xử lý rồi quay lại nghe máy`);
      return false;
    }
    if (missing.length) s.notify(`🛒 Đã nhập bù ${missing.map(([pid, q]) => `${q} ${productById(pid).name}`).join(', ')} (${formatMoney(cost)})`);
    return get().answerPhone(id);
  },
  declinePhone: (id) => {
    const s = get();
    const o = s.phoneOrders.find((p) => p.id === id && p.status === 'ringing');
    if (!o) return;
    set({ phoneOrders: s.phoneOrders.filter((p) => p !== o) });
  },
  deliverPhone: (id) => {
    const s = get();
    const o = s.phoneOrders.find((p) => p.id === id && p.status === 'carrying');
    if (!o) return false;
    const value = phoneOrderValue(o, s.priceOf);
    const fast = s.minutes <= fastWindow(o);
    const onTime = s.minutes <= o.dueAt;
    // Giao ngay trong nửa đầu khung hẹn: boa gấp đôi; giao kịp hẹn: boa thường
    const tip = onTime ? Math.round((value * (fast ? FAST_TIP : ON_TIME_TIP)) / 1000) * 1000 : 0;
    const pay = value + tip;
    const items = Object.values(o.items).reduce((n, q) => n + q, 0);
    const cooked = Object.entries(o.items).reduce((n, [id, q]) => n + (COOKED_PRODUCT_IDS.has(id) ? q : 0), 0);
    set({
      phoneOrders: s.phoneOrders.filter((p) => p !== o), phoneOrdersDone: s.phoneOrdersDone + 1, money: s.money + pay,
      stats: { ...s.stats, revenue: s.stats.revenue + pay, itemsSold: s.stats.itemsSold + items, cookOrders: (s.stats.cookOrders ?? 0) + (o.premium ? 1 : 0) },
      totals: {
        ...s.totals, revenue: s.totals.revenue + pay, itemsSold: s.totals.itemsSold + items,
        cookedSold: s.totals.cookedSold + cooked,
        cookOrdersDone: s.totals.cookOrdersDone + (o.premium ? 1 : 0),
      },
    });
    get().addXp(onTime ? 15 + items * 2 : 5);
    get().addReview(onTime ? 5 : 3, onTime ? undefined : 'wait', Object.keys(o.items)[0]);
    get().recordDiscovery(Object.keys(o.items)); // Sổ tay Tiệm (GĐ36)
    if (o.regular && onTime) get().adjustFriendship(o.regular, PHONE_FRIEND_GAIN);
    s.notify(onTime
      ? `🛵 Giao ${fast ? '⚡ lẹ như chớp' : 'kịp'} cho ${o.caller}: +${formatMoney(pay)} (boa ${formatMoney(tip)})${o.regular ? ` · 💛 +${PHONE_FRIEND_GAIN}` : ''}`
      : `🛵 Giao trễ cho ${o.caller}: +${formatMoney(pay)}, khách không boa`);
    return true;
  },
  deliverOrder: () => {
    const s = get();
    const def = s.order && partyOrderById(s.order.id);
    if (!def || !s.order?.accepted) return false;
    const missing = missingForOrder(def, s.storage);
    if (missing.length) {
      s.notify(`Kho còn thiếu: ${missing.map((m) => `${m.need} ${productById(m.id).name}`).join(', ')}`);
      return false;
    }
    const k = copyStock(s);
    for (const [id, q] of Object.entries(def.items)) takeStock(k, id, q);
    const pay = orderValue(def) + def.bonus;
    const items = Object.values(def.items).reduce((n, q) => n + q, 0);
    set({
      ...k, order: null, ordersDone: s.ordersDone + 1, money: s.money + pay,
      stats: { ...s.stats, revenue: s.stats.revenue + pay, itemsSold: s.stats.itemsSold + items },
      totals: { ...s.totals, revenue: s.totals.revenue + pay, itemsSold: s.totals.itemsSold + items },
    });
    get().addXp(def.xp);
    get().addReview(5, undefined, Object.keys(def.items)[0]);
    if (def.regular) get().adjustFriendship(def.regular, STORY_ORDER_FRIEND_GAIN);
    get().recordDiscovery(Object.keys(def.items)); // Sổ tay Tiệm (GĐ36)
    s.notify(`🎉 Giao xong "${def.title}": +${formatMoney(pay)} · +${def.xp} XP${def.regular ? ` · 💛 +${STORY_ORDER_FRIEND_GAIN} thân thiết với ${def.from}` : ''}`);
    get().checkTitles();
    return true;
  },
  rushDeliverOrder: () => {
    const s = get();
    const def = s.order && partyOrderById(s.order.id);
    if (!def || !s.order?.accepted) return false;
    const q = rushQuote(def, s.storage, s.day);
    if (!q.ok) {
      s.notify('Đơn có món nhà làm, đại lý không bán: phải tự nấu');
      return false;
    }
    if (s.money < q.cost) {
      s.notify(`Cần ${formatMoney(q.cost)} để nhập gấp, còn thiếu ${formatMoney(q.cost - s.money)}`);
      return false;
    }
    // Hàng nhập gấp đi thẳng vào đơn, không cần chỗ trống trong kho
    const k = copyStock(s);
    for (const [id, qty] of Object.entries(q.items)) putStock(k, id, qty);
    set({ ...k, money: s.money - q.cost, stats: { ...s.stats, spent: s.stats.spent + q.cost } });
    s.notify(`🏠 Nhập gấp ở đại lý: -${formatMoney(q.cost)}`);
    return get().deliverOrder();
  },
  communitySale: (ids) => {
    const s = get();
    const rep = reputationOf(s.repLog);
    const decor = s.furniture.filter((f) => f.type === 'plant').length;
    for (const goal of activeGoals(s.day, s.level, s.opening)) {
      const now = get();
      if (now.community[goal.key]?.done || goalLocked(goal, rep)) continue;
      const progress = addSales(goal, now.community[goal.key], ids);
      if (!goalMet(goal, progress, decor)) {
        set({ community: { ...now.community, [goal.key]: progress } });
        continue;
      }
      const host = goal.festival.host ? regularById(goal.festival.host) : undefined;
      const friend = host ? regularFriendship(host, now.regulars[host.id], goal.reward.friendship) : undefined;
      set({
        community: { ...now.community, [goal.key]: { ...progress, done: true } },
        money: now.money + goal.reward.money,
        ...(host && friend ? { regulars: { ...now.regulars, [host.id]: friend.progress } } : {}),
      });
      now.addXp(goal.reward.xp);
      now.notify(`🎉 Cả hẻm hoàn thành mục tiêu ${goal.festival.name}! +${formatMoney(goal.reward.money)}, +${goal.reward.xp} XP${host ? `, ${host.name} thân hơn` : ''}`);
    }
  },
  acceptContract: (id) => {
    const s = get();
    const def = supplyContractById(id);
    if (!def) return;
    if (s.contracts[id]) { s.notify('Hợp đồng này đang hoạt động rồi'); return; }
    if (s.level < def.unlock) { s.notify(`Cần cấp ${def.unlock} để nhận hợp đồng này`); return; }
    if (!meetsRep(reputationOf(s.repLog), def.rep)) { s.notify(`${def.from} chưa đủ tin tiệm, cần ${describeRep(def.rep!)}`); return; }
    set({ contracts: { ...s.contracts, [id]: { defId: id, dueDay: s.day + def.periodDays, delivered: 0, pending: true } } });
    s.notify(`📋 Nhận hợp đồng "${def.title}": ${formatMoney(contractValue(def))}/kỳ, giao mỗi ${def.periodDays} ngày`);
  },
  commitContract: (id) => {
    const s = get();
    const def = supplyContractById(id);
    const cs = s.contracts[id];
    if (!def || !cs) { s.notify('Hợp đồng không hợp lệ'); return; }
    if (cs.committed) { s.notify('Kỳ này đã cam kết rồi'); return; }
    const missing = missingForContract(def, s.storage);
    if (missing.length) { s.notify(`Kho chưa đủ để cam kết: ${missing.map((m) => `${m.need} ${productById(m.id).name}`).join(', ')}`); return; }
    const deposit = commitDeposit(def);
    if (s.money < deposit) { s.notify(`Cần ${formatMoney(deposit)} tiền cọc để cam kết`); return; }
    const k = copyStock(s);
    const locked: Record<string, number> = {};
    for (const [pid, q] of Object.entries(def.items)) { takeStock(k, pid, q); locked[pid] = q; }
    set({
      ...k,
      contracts: { ...s.contracts, [id]: { ...cs, committed: true, locked } },
      money: s.money - deposit,
    });
    s.notify(`🤝 Cam kết kỳ "${def.title}": đã trữ ${Object.values(def.items).reduce((n, q) => n + q, 0)} món riêng, cọc ${formatMoney(deposit)} (hoàn khi giao/hủy). Giao đủ hạn được thưởng tin cậy +${formatMoney(commitBonusValue(def))}.`);
  },
  releaseContract: (id) => {
    const s = get();
    const def = supplyContractById(id);
    const cs = s.contracts[id];
    if (!def || !cs || !cs.committed) { s.notify('Chưa cam kết kỳ này'); return; }
    const k = copyStock(s);
    for (const [pid, q] of Object.entries(cs.locked ?? {})) putStock(k, pid, q);
    const deposit = commitDeposit(def);
    set({
      ...k,
      contracts: { ...s.contracts, [id]: { ...cs, committed: false, locked: undefined } },
      money: s.money + deposit,
    });
    s.notify(`↩️ Hủy cam kết "${def.title}": trả hàng về kho bán chung, hoàn cọc ${formatMoney(deposit)} (mất thưởng tin cậy kỳ này).`);
  },
  deliverContract: (id) => {
    const s = get();
    const cs = s.contracts[id];
    const def = cs && supplyContractById(cs.defId);
    if (!def || !cs) { s.notify('Hợp đồng không hợp lệ'); return false; }
    // Đã cam kết: phải giao đủ từ ngăn trữ riêng (hàng đã khỏi kho bán chung), được thưởng tin cậy + hoàn cọc.
    const committed = cs.committed === true;
    const missing = committed
      ? reservedMissing(def, cs.locked)
      : missingForContract(def, s.storage);
    if (missing.length) {
      s.notify(`Kho còn thiếu: ${missing.map((m) => `${m.need} ${productById(m.id).name}`).join(', ')}`);
      return false;
    }
    const k = copyStock(s);
    if (committed) {
      for (const [pid, q] of Object.entries(cs.locked ?? {})) takeStock(k, pid, q);
    } else {
      for (const [pid, q] of Object.entries(def.items)) takeStock(k, pid, q);
    }
    const pay = contractValue(def);
    const commitBonus = committed ? commitBonusValue(def) : 0;
    const depositBack = committed ? commitDeposit(def) : 0;
    const earned = pay + commitBonus;
    const items = Object.values(def.items).reduce((n, q) => n + q, 0);
    const nextDue = s.day + def.periodDays;
    // Chuỗi giao đúng hẹn: giao trong hạn kỳ (chưa bị đánh dấu quá hạn) thì +1, trễ thì về 0.
    const onTime = !cs.overdue;
    const newStreak = onTime ? (cs.streak ?? 0) + 1 : 0;
    const milestone = contractMilestoneDue(newStreak);
    const streambonus = milestone ? Math.round((pay * CONTRACT_STREAK_BONUS) / 1000) * 1000 : 0;
    // Tiền về két = thu nhập thật (pay + tin cậy + mốc chuỗi) + hoàn lại tiền cọc đã giữ;
    // doanh thu/tổng chỉ tính THU NHẬP (cọc hoàn không phải doanh thu).
    const total = earned + streambonus + depositBack;
    set({
      ...k,
      contracts: { ...s.contracts, [id]: { ...cs, delivered: cs.delivered + 1, dueDay: nextDue, pending: false, streak: newStreak, overdue: false, committed: false, locked: undefined } },
      money: s.money + total,
      stats: { ...s.stats, revenue: s.stats.revenue + earned + streambonus, itemsSold: s.stats.itemsSold + items },
      totals: { ...s.totals, revenue: s.totals.revenue + earned + streambonus, itemsSold: s.totals.itemsSold + items, contractsDone: s.totals.contractsDone + 1 },
    });
    get().addXp(def.xp);
    get().recordDiscovery(Object.keys(def.items)); // Sổ tay Tiệm (GĐ36)
    s.notify(`🚚 Giao xong kỳ hạn "${def.title}": +${formatMoney(pay)} · +${def.xp} XP`
      + (commitBonus ? ` · 🤝 tin cậy +${formatMoney(commitBonus)}` : '')
      + (streambonus ? ` · 🎯 Mốc ${newStreak} kỳ đúng hẹn! +${formatMoney(streambonus)}` : (onTime ? ` · chuỗi đúng hẹn ${newStreak}` : ' · giao muộn, chuỗi đúng hẹn về 0')));
    get().checkTitles();
    return true;
  },
});
