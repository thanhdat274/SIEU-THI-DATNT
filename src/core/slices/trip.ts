import { haulerById, routeById, roundTripMinutes, routeUnlocked, haulerUnlocked, tripTravelCost, COOL_BOX, type HaulerId } from '../../data/routes';
import { beginTrip, tripLoadStock, routeStockResolve, routeStockSpend, checkCart, cartBuyCostDiscounted, cartCases, weekOfDay, routeRelTier, debtOverdue, courierAutoHaggle, courierSafeOption, TRIP_DEBT_DUE_DAYS, TRIP_DEBT_PCT, type TripState } from '../../data/trip';
import { haggleFloor, haggleOffer, haggleDiscount, HAGGLE_MAX_ROUNDS, HAGGLE_GRUDGE_WEEKS } from '../../data/haggle';
import { roadEventDraw, type RoadCtx } from '../../data/roadEvents';
import { addRel, relTier } from '../../data/supplierRel';
import { festivalOn } from '../../data/calendar';
import { productById, formatMoney, caseSize } from '../../data/products';
import type { GameState, GetState, SetState } from '../gameTypes';

/** Nhãn vị trí khi chủ đang đi tỉnh (SPEC §5.3 — vắng mặt thật; chỉ UI, không đổi kinh tế/golden). */
export const TRIP_AWAY = 'Đang đi tỉnh';
export const TRIP_HOME = 'Nhà của bạn';

/** Người chơi tối đa mang theo số tiền này (chỉ là giới hạn mạnh; thực tế két cũng giới hạn). */
const MAX_CARRY_K = 500_000_000;

const mm = (m: number): string => {
  const x = Math.floor(m) % 1440;
  return `${String(Math.floor(x / 60)).padStart(2, '0')}:${String(x % 60).padStart(2, '0')}`;
};

/** Bối cảnh một chuyến để rút/lọc chuyện dọc đường (L5) — phụ thuộc state + giỏ xe. Dùng chung slice & UI. */
export const tripCtx = (s: Pick<GameState, 'weather' | 'regulars'>, t: TripState, cases: number): RoadCtx => {
  let topFriend = -1;
  let hasFriend = false;
  for (const p of Object.values(s.regulars)) {
    if (p.friendship > topFriend) topFriend = p.friendship;
  }
  hasFriend = topFriend >= 3;
  let hasCargo = false;
  let hasDryCargo = false;
  for (const pid of Object.keys(t.cart)) {
    const p = productById(pid);
    if (!p) continue;
    hasCargo = true;
    if (p.category !== 'drink' && p.category !== 'fresh' && p.category !== 'meat') hasDryCargo = true;
  }
  return {
    weather: s.weather,
    festival: festivalOn(t.day) !== undefined,
    hasFriend,
    loadPct: cases > 0 ? cartCases(t.cart) / cases : 0,
    hasCargo,
    hasDryCargo,
  };
}

/** Khách quen thân NHẤT (để quà thân thiết của chuyện "quá giang" chảy tới) — undefined nếu chưa ai thân. */
function topFriendId(s: GameState): string | undefined {
  let best: string | undefined; let max = -1;
  for (const [id, p] of Object.entries(s.regulars)) {
    if (p.friendship > max) { max = p.friendship; best = id; }
  }
  return max >= 3 ? best : undefined;
}

/** Bậc mối ruột tại nguồn tuyến này (SPEC §5.7) — cho sàn mặc cả, weeklyCap +10%/bậc, và ghi nợ từ bậc 3. */
function routeTier(s: GameState, routeId: string): number {
  return routeRelTier(s.biz.supplierRel?.[`route:${routeId}`]);
}

/**
 * Hệ 5 — Chuyến đi tỉnh (SPEC-CHIEU-RONG §5). L2: `startTrip` + vắng mặt + xe về nhập kho.
 *
 * - `startTrip(routeId, by, cash)`: kiểm tra mở tuyến/xe, chưa có chuyến nào, đủ tiền vé/xăng; trừ phí
 *   đi lại, đặt `location = 'Đang đi tỉnh'` (chủ tự đi) và ghi `biz.trip`. Mọi tuyến/xe mở > 30 nên
 *   simGolden không bao giờ tới đây (người chơi phải tự bấm).
 * - `tripSetCart(items)`: lập giỏ hàng chở về (giới hạn bởi tiền mang theo); là món duy nhất L2 điều
 *   chỉnh trước khi về (các nhịp chọn hàng/mặc cả làm ở L3–L5).
 * - `tripArrive()`: xe về — hàng vào kho (hạn bớt theo đường, trừ khi có thùng đá), xoá chuyến, chủ về
 *   nhà. Gọi từ tick khi `minutes ≥ returnAt` hoặc endDay nếu ngủ trước khi về (§5.10).
 */
export const createTripSlice = (set: SetState, get: GetState): Pick<GameState, 'startTrip' | 'tripSetCart' | 'tripHaggle' | 'tripAcceptPrice' | 'tripChoose' | 'buyHauler' | 'buyCoolBox' | 'tripArrive' | 'tripRepayDebt'> => ({
  startTrip: (routeId: string, by: 'self' | number, cash: number, presetCart?: Record<string, number>) => {
    const s = get();
    // §5.6 — ngày GIÔNG BÃO không cho xuất phát (dự báo biết trước 2 ngày); chặn cả tự đi lẫn sai người.
    if (s.weather === 'storm') return s.notify('⛈️ Hôm nay trời giông bão — không nên lên đường, mai đi lành hơn.');
    const route = routeById(routeId);
    if (!route) return s.notify('🚚 Không tìm thấy tuyến này.');
    if (!routeUnlocked(route, s.level)) return s.notify(`🚚 Tuyến "${route.name}" mở từ cấp ${route.unlock}.`);
    if (s.biz.trip) return s.notify('🚚 Đang có một chuyến đi tỉnh — xong chuyến này mới đi tiếp được.');
    const carry = Math.floor(cash);
    if (carry <= 0) return s.notify('🚚 Mang theo ít nhất một khoản tiền để mua hàng.');
    if (carry > MAX_CARRY_K) return s.notify('🚚 Số tiền mang theo quả là quá khổ.');

    // L8 (§5.8) — sai người giao hàng đi thay: không sửa giỏ/mặc cả giữa chừng, không chuyện do người chơi
    // chọn; cần nhân viên courier + xe chở hàng (ba gác/xe tải); lập sẵn giỏ hàng kèm trần tiền.
    if (by !== 'self') {
      const courier = s.staff.find((w) => w.id === by && w.role === 'courier');
      if (!courier) return s.notify('🚚 Chọn một người giao hàng (vai 🛵) để sai đi.');
      const h = haulerById(s.biz.hauler ?? 'moto');
      if (!h || !haulerUnlocked(h, s.level)) return;
      const hasCargoCar = s.biz.hauler === 'ba_gac' || s.biz.hauler === 'xe_tai';
      if (!hasCargoCar) return s.notify('🚚 Sai người đi cần xe chở hàng (ba gác / xe tải) — mua ở mục sắm xe.');
      if (!presetCart || Object.keys(presetCart).length === 0) return s.notify('🚚 Lập sẵn giỏ hàng để người giao chở về.');
      const clean: Record<string, number> = {};
      for (const [pid, q] of Object.entries(presetCart)) {
        const qq = Math.floor(q); if (qq <= 0 || !productById(pid)) continue;
        clean[pid] = (clean[pid] ?? 0) + qq;
      }
      if (Object.keys(clean).length === 0) return s.notify('🚚 Giỏ hàng lập sẵn rỗng.');
      const miles = roundTripMinutes(route, h);
      if (s.money < tripTravelCost(h, miles)) return s.notify(`🚚 Không đủ tiền vé/xăng (${formatMoney(tripTravelCost(h, miles))}).`);
      const tier = routeTier(s, route.id);
      const stock = routeStockResolve(s.biz.routeStock, route, s.day, tier);
      const check = checkCart({ ...beginTrip(route, h, s.day, Math.floor(s.minutes), by, carry, clean), cart: clean }, route, h, stock);
      if (!check.ok) return s.notify(`🚚 Giỏ hàng: ${check.reason}.`);
      // chuyện dọc đường do người giao TỰ chọn phương án an toàn (chậm) trước khi lên đường (§5.8).
      const ctx = tripCtx(s, beginTrip(route, h, s.day, Math.floor(s.minutes), by, carry, clean), h.cases);
      let delayMin = 0; const flags: string[] = [];
      for (const beat of [1, 4] as const) {
        const evt = roadEventDraw(s.weatherSeed, s.day, route.id, beat, ctx);
        if (evt) {
          const i = courierSafeOption(evt);
          if (i >= 0) delayMin += evt.options[i].minutes;
          flags.push(evt.id);
        }
      }
      const trip: TripState = beginTrip(route, h, s.day, Math.floor(s.minutes), by, carry, clean);
      trip.delayMin = delayMin;
      trip.returnAt += delayMin;
      trip.flags = flags;
      const autoBest = courierAutoHaggle(courier.skill);
      if (autoBest > 0) trip.haggle = { round: 0, best: autoBest, anger: 0 };
      const stocks = s.biz.routeStock ?? {};
      set({
        money: s.money - tripTravelCost(h, miles),
        location: s.location, // chủ Ở LẠI tiệm (người giao vắng cả buổi, §5.8)
        biz: { ...s.biz, trip, routeStock: { ...stocks, [route.id]: routeStockResolve(stocks, route, s.day, tier) } },
      });
      const d = autoBest > 0 ? `, tự mặc cả −${Math.round(autoBest * 100)}%` : '';
      s.notify(`🚚 ${courier.name} đi ${route.name} ${h.name} — về ${mm(trip.returnAt)}${d}.`);
      return;
    }

    const hauler = haulerById(s.biz.hauler ?? 'moto');
    if (!hauler) return;
    if (!haulerUnlocked(hauler, s.level)) return s.notify(`🚚 Xe này mở từ cấp ${hauler.unlock}.`);
    const minutes = roundTripMinutes(route, hauler);
    const travelCost = tripTravelCost(hauler, minutes);
    if (s.money < travelCost) return s.notify(`🚚 Không đủ tiền vé/xăng (${formatMoney(travelCost)}).`);
    if (carry > s.money - travelCost) return s.notify('🚚 Số tiền mang theo vượt quá két sau khi trừ vé/xăng.');

    const trip: TripState = beginTrip(route, hauler, s.day, Math.floor(s.minutes), 'self', carry, {});
    // L3 — đảm bảo đã có routeStock của tuyến cho tuần này để chọn hàng (R7 khấu trừ khi về).
    // L7 — mối ruột bậc cao làm mới nguồn tuần dày hơn (routeStockResolve chỉ áp khi sang tuần mới).
    const stocks = s.biz.routeStock ?? {};
    set({
      money: s.money - travelCost,
      location: TRIP_AWAY,
      biz: { ...s.biz, trip, routeStock: { ...stocks, [route.id]: routeStockResolve(stocks, route, s.day, routeTier(s, route.id)) } },
    });
    s.notify(`🚚 Lên đường ${route.name} bằng ${hauler.name} — xe về lúc ${mm(trip.returnAt)}. Vắng tiệm mấy tiếng nhé.`);
  },

  tripSetCart: (items: Record<string, number>) => {
    const s = get();
    const t = s.biz.trip;
    if (!t) return s.notify('🚚 Không có chuyến đi nào đang diễn ra.');
    if (t.by !== 'self') return s.notify('🚚 Người giao đang đi — giỏ lập sẵn rồi, không sửa giữa chừng.');
    const route = routeById(t.routeId);
    if (!route) return;
    const hauler = haulerById(t.hauler);
    if (!hauler) return;
    // L3 — giỏ hàng chở về phải nằm trong: tiền mang theo + sức chở xe + lượng còn ở nguồn tuần này (R7).
    // L7 — mối ruột bậc 3+ ("Mối ruột") được ghi nợ tối đa 20% cash: mua quá tiền mang theo, xe về ghi nợ (§5.7).
    const stock = routeStockResolve(s.biz.routeStock, route, s.day, routeTier(s, route.id));
    const clean: Record<string, number> = {};
    for (const [pid, qty] of Object.entries(items)) {
      const q = Math.floor(qty); if (q <= 0) continue;
      if (!productById(pid)) continue;
      clean[pid] = (clean[pid] ?? 0) + q;
    }
    const tier = routeTier(s, route.id);
    // L7 — mối ruột bậc 3+ được ghi nợ, nhưng CÒN nợ quá hạn tuyến này thì không vay tiếp (§5.7).
    const oldDebt = s.biz.routeDebt;
    const debtBlocked = !!oldDebt && oldDebt.routeId === route.id && debtOverdue(oldDebt, s.day);
    const debtLimit = tier >= 3 && t.by === 'self' && !debtBlocked ? Math.floor(t.cash * TRIP_DEBT_PCT) : 0;
    const check = checkCart({ ...t, cart: clean }, route, hauler, stock, debtLimit);
    if (!check.ok) return s.notify(`🚚 Chọn hàng: ${check.reason}.`);
    set({ biz: { ...s.biz, trip: { ...t, cart: clean } } });
    const paidNow = cartBuyCostDiscounted({ ...t, cart: clean, haggle: t.haggle }, route);
    s.notify(paidNow > t.cash
      ? '🚚 Chốt giỏ rồi — quá tiền mang theo, xe về ghi nợ mối ruột.'
      : '🚚 Đã chốt giỏ hàng chở về — xe về là hàng vào kho.');
  },

  // L4 — mức sàn mặc cả hiện tại của tuyến cho chuyến này (TẤT ĐỊNH theo weatherSeed + day + routeId).
  tripHaggle: (offer: number) => {
    const s = get();
    const t = s.biz.trip;
    if (!t) return s.notify('🚚 Không có chuyến đi nào đang diễn ra.');
    if (t.by !== 'self') return s.notify('🚚 Người đi thay mặc cả theo cách riêng (L8).');
    const route = routeById(t.routeId);
    if (!route) return;
    const already = haggleDiscount(t.haggle);
    if (already > 0) return s.notify('🚚 Đã chốt giá — đừng trả tiếp, người bán rất dễ phật ý.');
    const rel = s.biz.supplierRel?.[`route:${route.id}`];
    const tier = rel ? relTier(rel.spent).level : 0;
    const grudge = s.biz.routeGrudge?.routeId === route.id && s.biz.routeGrudge.untilWeek >= weekOfDay(s.day);
    const cases = cartCases(t.cart);
    const floor = haggleFloor(route, s.weatherSeed, t.day, tier, cases, 0, grudge);
    const offerC = Math.max(0, Math.min(0.16, offer));
    const res = haggleOffer(t.haggle, offerC, floor);
    if (res.accepted) {
      const pay = cartBuyCostDiscounted({ ...t, haggle: { round: res.round, best: offerC, anger: 0 } }, route);
      set({ biz: { ...s.biz, trip: { ...t, haggle: { round: res.round, best: offerC, anger: 0 } } } });
      s.notify(`🚚 Người bán gật: "Được, ${formatMoney(pay)}." Chốt giá.`);
      return;
    }
    if (res.grudge) {
      set({ biz: { ...s.biz, routeGrudge: { routeId: route.id, untilWeek: weekOfDay(s.day) + HAGGLE_GRUDGE_WEEKS - 1 }, trip: { ...t, haggle: { round: res.round, best: 0, anger: 0 } } } });
      s.notify('🚚 Ép quá tay mãi — người bán phật ý, tuần sau khó hạ giá.');
      return;
    }
    const left = HAGGLE_MAX_ROUNDS - res.round;
    set({ biz: { ...s.biz, trip: { ...t, haggle: { round: res.round, best: 0, anger: res.anger } } } });
    s.notify(left > 0
      ? `🚚 Người bán lắc đầu — còn ${left} lượt mặc cả.`
      : '🚚 Hết lượt — mua giá niêm yết của tuyến.');
  },

  tripAcceptPrice: () => {
    const s = get();
    const t = s.biz.trip;
    if (!t) return s.notify('🚚 Không có chuyến đi nào đang diễn ra.');
    set({ biz: { ...s.biz, trip: { ...t, haggle: { round: t.haggle?.round ?? 0, best: t.haggle?.best ?? 0, anger: t.haggle?.anger ?? 0 } } } });
    s.notify('🚚 Thôi, giá đó được rồi — chốt giỏ (không phạt).');
  },

  tripChoose: (evtId: string, index: number) => {
    const s = get();
    const t = s.biz.trip;
    if (!t) return s.notify('🚚 Không có chuyến đi nào đang diễn ra.');
    if (t.by !== 'self') return s.notify('🚚 Người giao tự chọn đường an toàn rồi.');
    const route = routeById(t.routeId);
    if (!route) return;
    const cases = haulerById(t.hauler)?.cases ?? 0;
    const ctx = tripCtx(s, t, cases);
    // Rút lại TẤT ĐỊNH cả 2 nhịp rồi khớp evtId → biết chuyện thuộc nhịp nào.
    const evtDi = roadEventDraw(s.weatherSeed, t.day, t.routeId, 1, ctx);
    const evtVe = roadEventDraw(s.weatherSeed, t.day, t.routeId, 4, ctx);
    const evt = evtDi?.id === evtId ? evtDi : evtVe?.id === evtId ? evtVe : null;
    if (!evt || t.flags.includes(evtId)) return s.notify('🚚 Chuyện đó đã qua rồi.');
    const opt = evt.options[index];
    if (!opt) return;

    let trip = { ...t, delayMin: t.delayMin + opt.minutes, returnAt: t.returnAt + opt.minutes, flags: [...t.flags, evtId] };
    let money = s.money;
    let regulars = s.regulars;
    let cart = t.cart;
    if (opt.cost) money = Math.max(0, money - opt.cost);
    if (opt.friend) {
      const fid = topFriendId(s);
      if (fid) {
        const cur = s.regulars[fid];
        regulars = { ...regulars, [fid]: { ...cur, friendship: cur.friendship + opt.friend } };
      }
    }
    if (opt.sell) {
      const pid = Object.keys(cart).find((k) => (cart[k] ?? 0) > 0);
      if (pid) {
        const p = productById(pid);
        const size = caseSize(pid);
        const take = Math.min(size, cart[pid] ?? 0);
        if (p && take > 0) { money += Math.round(p.buy * 1.2) * take; cart = { ...cart, [pid]: cart[pid] - take }; }
      }
    }
    set({ money, regulars, biz: { ...s.biz, trip: { ...trip, cart } } });
    const tail = opt.wet ? ' — để vậy, hàng có thể bị ướt.' : opt.cost ? ` — tốn ${formatMoney(opt.cost)}.` : opt.friend ? ' — người quen gắn bó hơn.' : opt.minutes > 0 ? ` — chậm ${opt.minutes}′.` : '';
    s.notify(`🚚 ${evt.title} đã xử lý${tail}`);
  },

  // L6 — mua/đổi xe chở hàng & thùng đá giữ lạnh (SPEC §5.4). Sim không gọi → golden giữ nguyên.
  buyHauler: (id: string) => {
    const s = get();
    const h = haulerById(id as HaulerId);
    if (!h) return s.notify('🚚 Không có xe này.');
    if (!haulerUnlocked(h, s.level)) return s.notify(`🚚 Xe này mở từ cấp ${h.unlock}.`);
    if (s.biz.hauler === h.id) return s.notify(`🚚 Đang dùng ${h.name} rồi.`);
    if (s.money < h.price) return s.notify(`🚚 Không đủ tiền — ${h.name} giá ${formatMoney(h.price)}.`);
    set({ money: s.money - h.price, biz: { ...s.biz, hauler: h.id } });
    s.notify(`🚚 Đổi sang ${h.name} — chở được ${h.cases} thùng/con.`);
  },

  buyCoolBox: () => {
    const s = get();
    if (s.biz.coolBox) return s.notify('🧊 Đã có thùng đá rồi.');
    if (s.level < COOL_BOX.unlock) return s.notify(`🧊 Thùng đá mở từ cấp ${COOL_BOX.unlock}.`);
    if (s.money < COOL_BOX.price) return s.notify(`🧊 Không đủ tiền — giá ${formatMoney(COOL_BOX.price)}.`);
    set({ money: s.money - COOL_BOX.price, biz: { ...s.biz, coolBox: true } });
    s.notify('🧊 Đã sắm thùng đá — hàng tươi về không còn mất hạn theo đường.');
  },

  tripArrive: () => {
    const s = get();
    const t = s.biz.trip;
    if (!t) return;
    const route = routeById(t.routeId);
    if (!route) return;
    const coolBox = !!s.biz.coolBox;
    const k = tripLoadStock(t, { storage: s.storage, storageLots: s.storageLots }, coolBox);
    const items = Object.entries(t.cart).reduce((n, [, q]) => n + Math.floor(q), 0);
    // L3 — hàng đã lấy khỏi nguồn: trừ lượng tuần của tuyến (R7 cổng chống farm).
    // L7 — mối ruột bậc cao làm nguồn tuần dày hơn (+10%/bậc) khi MỚI sang tuần.
    const stocks = s.biz.routeStock ?? {};
    const tier = routeTier(s, route.id);
    const st0 = routeStockResolve(stocks, route, s.day, tier);
    // L4 — trả TIỀN mua hàng (giá niêm yết tuyến trừ giảm thêm đã mặc cả) và ghi doanh mua mối ruột tại nguồn.
    // L7 (§5.7) — mối ruột bậc 3+ cho mua QUÁ tiền mang theo; khoản quá `cash` ghi nợ, trả trong 7 ngày.
    const goodsCost = cartBuyCostDiscounted(t, route);
    const carried = t.cash;
    const paid = Math.min(goodsCost, carried);
    const owing = Math.max(0, goodsCost - carried);
    const owes = tier >= 3 && owing > 0; // tự đi hay người giao đều vẫn là "mối ruột bậc 3+" của tuyến (§5.7)
    let money = Math.max(0, s.money - paid);
    let routeDebt = s.biz.routeDebt;
    if (owes) routeDebt = { routeId: route.id, amount: owing + (s.biz.routeDebt?.amount ?? 0), dueDay: s.day + TRIP_DEBT_DUE_DAYS };
    const spent = paid;
    const rel = s.biz.supplierRel ?? {};
    const relKey = `route:${route.id}`;
    set({
      ...k,
      money,
      location: t.by === 'self' ? TRIP_HOME : s.location,
      biz: {
        ...s.biz,
        trip: undefined,
        routeDebt,
        routeStock: { ...stocks, [route.id]: routeStockSpend(st0, route, t.cart) },
        supplierRel: { ...rel, [relKey]: addRel(rel[relKey], goodsCost) },
      },
    });
    const hauler = haulerById(t.hauler);
    if (owes) s.notify(`🚚 ${hauler?.name ?? 'Xe'} về — hàng vào kho, ghi nợ ${formatMoney(owing)} (trả ${TRIP_DEBT_DUE_DAYS} ngày).`);
    else if (items > 0) s.notify(`🚚 ${hauler?.name ?? 'Xe'} về — ${items} món vào kho, trả ${formatMoney(spent)}.`);
    else s.notify(`🚚 ${hauler?.name ?? 'Xe'} về (${route.name}) — không hàng.`);
  },

  // L7 (§5.7) — trả nợ mối ruột tại nguồn. Quá hạn vẫn phải trả đủ; trả xong nếu từng quá hạn thì người bán
  // giận (sàn mặc cả cao hơn 2 tuần) — nợ vướng mãi là mất ưu đãi mối ruột.
  tripRepayDebt: () => {
    const s = get();
    const d = s.biz.routeDebt;
    if (!d) return s.notify('🧾 Không có khoản nợ nào đang ghi.');
    if (s.money < d.amount) return s.notify(`🧾 Két chưa đủ trả nợ (còn ${formatMoney(d.amount)}).`);
    const wasOverdue = debtOverdue(d, s.day);
    const biz = { ...s.biz, routeDebt: undefined };
    if (wasOverdue) {
      biz.routeGrudge = { routeId: d.routeId, untilWeek: weekOfDay(s.day) + HAGGLE_GRUDGE_WEEKS - 1 };
      set({ money: s.money - d.amount, biz });
      s.notify(`🧾 Đã trả nợ ${formatMoney(d.amount)} — quá hạn nên người bán giận, 1-2 tuần khó mặc cả.`);
    } else {
      set({ money: s.money - d.amount, biz });
      s.notify(`🧾 Đã trả nợ ${formatMoney(d.amount)} cho mối ruột — giữ ưu đãi.`);
    }
  },
});
