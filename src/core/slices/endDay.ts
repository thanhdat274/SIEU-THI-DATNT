import { formatMoney, productById, unlockedProducts } from '../../data/products';
import { fitJoin, fitList } from '../../data/onboarding';
import { SHOP_TIERS, rentOf, OPERATING_REVENUE_RATE } from '../../data/shopTiers';
import { sapKindIcons, sapEventIncome, sapRongEvent, sapRongIncome } from '../../data/sapRong';
import { describeDay, forecastFrom, WEATHER } from '../../data/weather';
import { fitLots, nearestLife } from '../../data/freshness';
import { regularById } from '../../data/regulars';
import { offerForDay, partyOrderById, STORY_ORDER_FRIEND_LOSS } from '../../data/orders';
import { morningNews } from '../../data/calendar';
import { DEBT_LATE_DAYS, DEBT_WRITE_OFF_DAYS, WRITE_OFF_FRIEND_LOSS, type Debt } from '../../data/credit';
import { INSPECTION_EVERY, INSPECTION_FINE, INSPECTION_REWARD, INSPECTION_UNLOCK, activeAds, inspectionResult, type BizState } from '../../data/biz';
import { sceneFor, surpriseArcById } from '../../data/surpriseArcs';
import { isQuanMatchDay, quanDayNews, quanNuocDay } from '../../data/quanNuoc';
import { isXoiCungDay, tiemXoiDay, tiemXoiSaved, tiemXoiDinePlan } from '../../data/tiemXoi';
import { bizEndOfDay, checkAchievements, freshAchievements } from '../biz';
import { type DayStats } from '../dayStats';
import { PHONE_FRIEND_GAIN } from '../../data/phoneOrders';
import { nextMarketIndex } from '../../data/market';
import { hasSkill } from '../../data/titles';
import { repairCost, RISK_RULES, wears } from '../../data/risks';
import { hasUpgrade } from '../../data/upgrades';
import { LATE_WAKE_AT } from '../../data/night';
import { summarizeReviews } from '../../data/reviews';
import { dailyWage, generateCandidates } from '../../data/staff';
import { morningShiftAction } from '../../data/staffIdle';
import { staffDaySnapshot } from '../slices/staffDay';
import { eventOn } from '../../data/events';
import { supplyContractById } from '../../data/contracts';
import { branchPowerBill, restingOn } from '../../data/branches';
import { VENUE_TREND_DAYS, type VenueDay } from '../../data/venueTrend';
import { RISK_TREND_DAYS, emptyRiskToday } from '../../data/risk';
import { type GameState, type ContractState, type DayRecord, type SetState, type GetState, DAY_START, HISTORY_DAYS, wagesDue, emptyStats, daySalesProfit } from '../gameTypes';
import { putStock, spoilOvernight, takeStock, type Stock } from '../stock';
import { isCookStation } from '../../data/furniture';
import type { CookingStation } from '../../data/recipes';
import { COMPLAINTS_FOR_SURPRISE, isAlcohol, LICENSE_FINE, LICENSE_GRACE, licenseById, licenseStatus, missingLicenses, newInspection, RENEW_WARN_DAYS, requiredLicenses, SURPRISE_INSPECTION, SUSPEND_AFTER } from '../../data/licenses';
import { staffDayEnd } from '../../data/staffTraits';
import { BUZZ_DAYS, CRISIS_MUL, POST_CAP, SOCIAL_UNLOCK, socialDayEnd, type SocialPost } from '../../data/social';
import { ANIMAL_ORDER, farmCritChance, farmhandChores, FARM_ORDER_UNLOCK, farmOrderCapacity, farmOrderNews, farmOrderProduce, gardenNight, makeFarmOrder, type AnimalKind } from '../../data/garden';
import { preserveNight, farmhandPreserve, preserveDefById } from '../../data/preserve';
import { crisisNight } from '../../data/crisis';
import { lifeEventFor, lifeEventById, gioLabel } from '../../data/lifeEvent';
import { stanceActive, stanceFitByDirection, applyStanceDay, stanceTier, STANCE_UNLOCK, STANCE_META, hasStanceSeal, isStanceSealable, type StanceState } from '../../data/stance';
import { buildStanceCtx } from '../../data/stanceData';
import { logAnalyticsDay } from '../../data/analytics';
import { appRating } from '../../data/online';
import { onlineDayEnd } from './online';
import { onlineDayEvent, onlineEventLine } from '../../data/online';
import { wageRelief } from '../../data/wageRelief';
import { runBranch, branchNewDay } from './branch';
import { simRng } from '../rand';

/** Cuối ngày: chi nhánh chạy qua đêm, hàng hỏng, nợ, đơn, thanh tra, thị trường, lương, sang ngày mới. */

/** Trung bình trượt theo ngày, ngày gần nặng hơn. */
function movingAverage(avg: Record<string, number>, today: Record<string, number>) {
  const out: Record<string, number> = {};
  for (const id of new Set([...Object.keys(avg), ...Object.keys(today)])) {
    const v = (avg[id] ?? 0) * 0.6 + (today[id] ?? 0) * 0.4;
    if (v >= 0.05) out[id] = Math.round(v * 100) / 100;
  }
  return out;
}

/** Kết thúc ngày: hiện bảng tổng kết, sang ngày mới. */
export const endDay = (set: SetState, get: GetState, extra: Partial<GameState> = {}) => {
  // GĐ568: ô thông báo chỉ một chỗ — mọi tin đêm gom vào log, cuối hàm bật MỘT toast (thời tiết trước, '+N tin'); đủ ở Sổ đầu ngày.
  const log: string[] = [];
  const say = (m: string) => { log.push(m); };
  let weatherLine = '';
  // Cửa hàng tiện lợi bán xuyên đêm trong lúc chủ ngủ: chạy nốt tới giờ thức dậy sáng mai
  if (get().branch) {
    const lateWake = get().minutes >= 24 * 60;
    const delta = extra.money !== undefined ? extra.money - get().money : 0;
    set(runBranch(get, 24 * 60 + (lateWake ? LATE_WAKE_AT : DAY_START)));
    if (extra.money !== undefined) extra = { ...extra, money: get().money + delta };
  }
  const s = get();
  const br = s.branch;
  // Người nghỉ hôm nay hoặc xin nghỉ đột xuất (không ai thay) thì không trả lương ngày đó
  const paid = br ? br.staff.filter((st) => !restingOn(br, st.id, s.day) && !(br.event?.kind === 'calloff' && br.event.staffId === st.id)) : [];
  const branchWages = Math.round(paid.reduce((n, st) => n + dailyWage(st), 0) * (hasSkill(s.skills, 'good_boss') ? 0.9 : 1));
  const nextBranch = br ? branchNewDay(br, s.day) : null;
  if (nextBranch?.news.length) say(nextBranch.news.join(' · '));
  if (br) say(`🏪 Tiện lợi 24/7: ${br.customersToday} khách${isQuanMatchDay(s.day, s.weather) ? ' ⚽' : ''}, thu ${formatMoney(br.revenueToday)}, lương ${formatMoney(branchWages)}`
    + (br.missedToday ? ` · ${br.missedToday} khách bỏ về (thiếu thu ngân/hết hàng)` : '')
    + (br.lostToday ? ` · mất ${br.lostToday} món (trộm/hỏng)` : '')
    + (br.event?.kind === 'drunk' ? ' · đêm qua có khách say quậy' : br.event?.kind === 'blackout' ? ' · đêm qua mất điện' : br.event?.kind === 'calloff' ? (br.event.covered ? ' · có người làm thay ca đêm' : ' · ca đêm thiếu người') : ''));
  if (s.pendingUpgrade) {
    // Mặt tiền giữ nguyên, tiệm nới ra phía sau: giữ đồ đạc ở đúng chỗ cũ
    const shift = (SHOP_TIERS[s.shopTier + 1].depth - SHOP_TIERS[s.shopTier].depth) / 2;
    set({
      shopTier: s.shopTier + 1,
      pendingUpgrade: false,
      furniture: s.furniture.map((f) => ({ ...f, z: f.z + shift })),
      mainCounter: s.mainCounter && { ...s.mainCounter, z: s.mainCounter.z + shift },
      opening: { day: s.day + 1, tier: s.shopTier + 1 },
    });
    say(`🏗️ Thợ đã xây xong: ${SHOP_TIERS[s.shopTier + 1].name}! Mai khai trương, cả hẻm sẽ tới mừng, xem mục tiêu ở Nhiệm vụ`);
  }
  // Qua đêm hàng cũ đi một ngày hạn, rồi hàng đặt hôm nay về kho lúc sáng mai (hạn đầy)
  const aged = spoilOvernight(get());
  // Trang trại qua một đêm: cây lớn theo tưới/mưa, bão phá vườn, vật nuôi cho sản phẩm nếu được cho ăn.
  // Có phụ trại (farmhand) thì lo sẵn từ tối: tưới luống khô, đổ cám từ kho cho chuồng đói, gom hàng chờ thu.
  const farmhand = s.staff.find((st) => st.role === 'farmhand');
  // Hàng nhà trồng/nhà nuôi hỏng qua đêm thì rút nhãn cho đúng số còn trong kho
  let garden = Object.keys(aged.byId).length ? (() => {
    const hg = { ...s.garden.homegrown };
    for (const [id, n] of Object.entries(aged.byId)) {
      const left = (hg[id] ?? 0) - n;
      if (left > 0) hg[id] = left;
      else if (hg[id] !== undefined) delete hg[id];
    }
    return { ...s.garden, homegrown: hg };
  })() : s.garden;
  let farmhandPicked: { productId: string; qty: number }[] = [];
  let farmhandFeedUsed: { productId: string; bags: number }[] = [];
  // Hệ 1 L4 — phụ trại thu hộ mẻ phơi chín (để dưới (endDay) cho vào kho + nhãn), + rackLog cho mai.
  const preservePicked: { productId: string; qty: number; homegrown: boolean }[] = [];
  let fhPreserveRack: { day: number; out: [number, number][] } | undefined;
  const farmhandNews: string[] = [];
  const fed: Partial<Record<AnimalKind, boolean>> = {};
  for (const kk of ANIMAL_ORDER) if (garden.pens[kk]?.fedDay === s.day) fed[kk] = true;
  if (farmhand) {
    const chores = farmhandChores(garden, aged.storage, s.day, { crit: farmCritChance(garden) });
    garden = chores.garden;
    farmhandPicked = chores.picked;
    farmhandFeedUsed = chores.feedUsed;
    for (const kk of chores.fedKinds) fed[kk] = true;
    if (chores.news.length) farmhandNews.push(`🧑‍🌾 ${farmhand.name} lo trại hộ: ${chores.news.join(', ')}`);
    // Hệ 1 L4 — phụ trại lo SÂN PHƠI hộ: thu mẻ chín + cất/mang giàn theo TRỜI MAI (chạy TRƯỚC
    // preserveNight để mẻ chín đã rời giàn; preserveNight còn lại nhận nắng của HÔM NAY).
    if (garden.preserveJobs.some((j) => preserveDefById(j.defId).kind === 'phoi')) {
      const fhP = farmhandPreserve({ jobs: garden.preserveJobs, day: s.day, seed: s.weatherSeed, weather: s.weather });
      garden = { ...garden, preserveJobs: fhP.jobs, rackLog: fhP.rackLog };
      fhPreserveRack = fhP.rackLog;
      preservePicked.push(...fhP.picked);
      if (fhP.news.length) farmhandNews.push(`🧑‍🌾 ${farmhand.name} lo sân phơi hộ: ${fhP.news.join(', ')}`);
    }
  }
  const gardenNightResult = gardenNight(garden, { day: s.day, weather: s.weather, fed });
  garden = gardenNightResult.garden;
  // Hệ 1 (§1.5) — mẻ phơi qua đêm nhận nắng theo thời tiết hôm nay + trạng thái giàn (TẤT ĐỊNH từ
  // rainSpell trên weatherSeed+day — KHÔNG gọi simRng, golden cấp 30 vẫn nguyên). Giàn để ngoài là
  // mặc định mỗi ngày; game không có đồng hồ nên "cất kịp mưa + 0,4" là mốc lát L3 (Sổ đầu ngày).
  const phoiOut: [number, number][] = garden.rackLog?.day === s.day ? garden.rackLog.out : [[0, 1440]];
  const phoiNight = preserveNight(garden.preserveJobs, phoiOut, {
    day: s.day, weather: s.weather, seed: s.weatherSeed,
    tarp: !!garden.rackTarp,
    stormSafe: (garden.buildings?.nha_luoi ?? 0) >= 3, // SPEC §1.8: nhà lưới 3★ che sân phơi khỏi bão
  });
  // Hệ 1 L4 — phụ trại đã cất/mang giàn cho NGÀY MAI (và thu mẻ chín) từ khối farmhand phía trên:
  // giữ rackLog của nó (nếu có) thay vì reset mặc định, để mai mưa giàn đã nằm trong nhà.
  garden = { ...garden, preserveJobs: phoiNight.jobs, rackLog: fhPreserveRack ?? { day: s.day + 1, out: [[0, 1440]] } };
  // Sổ phân tích 30 ngày: bán/hỏng/lỡ bán theo từng món + cờ combo & giờ vàng của hôm nay
  const lostPerItem: Record<string, number> = {};
  for (const [key, n] of Object.entries(s.stats.missLog ?? {})) {
    const pid = key.split(':')[1];
    if (pid) lostPerItem[pid] = (lostPerItem[pid] ?? 0) + n;
  }
  const analytics = logAnalyticsDay(s.analytics, s.day, s.stats.byItem ?? {}, lostPerItem, aged.byId,
    { combo: s.activeCombos.length > 0, happyHour: !!s.happyHour, ads: activeAds(s.biz.ads, s.day).length > 0 });
  const k: Stock = { storage: aged.storage, storageLots: aged.storageLots };
  for (const d of s.deliveries) for (const [id, qty] of Object.entries(d.items)) putStock(k, id, qty);
  // Quán nước đầu ngõ (GĐ7): chạy THEO NGÀY sau phần chi nhánh — rút đồ uống khỏi kho thật `k`
  // (đã gồm hàng hết hạn bỏ đi + đơn mới về sáng mai), doanh thu cộng sổ, lương trừ két.
  // Kết quả ghi vào biz.quanNuocLast để UI hiện, kèm một dòng tin sáng mai.
  let quanRevenue = 0;
  let quanWages = 0;
  let quanNuocLast: BizState['quanNuocLast'];
  const quanNews: string[] = [];
  if (s.biz.quanNuoc?.open) {
    const q = quanNuocDay(s.biz.quanNuoc, s.level, k.storage, (id, qty) => takeStock(k, id, qty).reduce((n, l) => n + l.qty, 0), s.weather, s.day, simRng());
    if (q) {
      quanRevenue = q.revenue;
      quanWages = q.wages;
      quanNuocLast = { day: s.day, revenue: q.revenue, served: q.served, wanted: q.wanted, wages: q.wages, profit: q.revenue - q.wages, event: q.event };
      const head = `🧋 Quán nước: ${q.served}/${q.wanted} ly · ${formatMoney(q.revenue)} · lương −${formatMoney(q.wages)}`
        + (s.biz.quanNuoc.hand?.day === s.day ? ` · tự pha ${s.biz.quanNuoc.hand.n} mẻ` : '') + (isQuanMatchDay(s.day, s.weather) ? ' · ⚽ tối có trận' : '');
      // GĐ707: dựng tin qua hàm thuần — sự kiện không bị thay bằng dòng "kho thiếu" sai khi quá 90 ký tự
      quanNews.push(quanDayNews(head, q));
    }
  }
  // Tiệm xôi (GĐ410): nấu bù xôi vào kho thật `k` sau quán nước, giá vốn + lương trừ két.
  let tiemXoiLast: BizState['tiemXoiLast'];
  // GĐ501: sạp hàng rong Ngõ 2 — nghỉ khi mưa/bão
  if (s.biz.sapRong) {
    const sapEvent = sapRongEvent(simRng());
    const raw = sapRongIncome(s.biz.sapRong, s.weather, s.day, s.biz.sapKinds, s.biz.sapTiers, s.biz.tiemXoi.open, s.biz.sapHandDay === s.day);
    const sap = sapEventIncome(raw, sapEvent);
    quanRevenue += sap;
    quanNews.push(sap ? `${sapKindIcons(s.biz.sapRong, s.biz.sapKinds)} sạp hàng rong Ngõ 2 · +${formatMoney(sap)}${sapEvent === 'tour' ? ' · 🚌 đoàn khách ghé' : sapEvent === 'gio' ? ' · 💨 gió mùa, khách vắng' : ''}${isXoiCungDay(s.day) && s.biz.sapKinds?.slice(0, s.biz.sapRong).includes('xoi') ? ' · 🙏' : ''}${isQuanMatchDay(s.day, s.weather) && s.biz.sapKinds?.slice(0, s.biz.sapRong).includes('nuocmia') ? ' · ⚽' : ''}` : '🛒 Trời mưa: sạp hàng rong Ngõ 2 nghỉ bán');
  }
  if (s.biz.tiemXoi?.open) {
    const t = tiemXoiDay(s.biz.tiemXoi, s.level, k.storage, (id, qty) => putStock(k, id, qty), s.day, simRng());
    if (t) {
      tiemXoiLast = { day: s.day, total: t.total, cost: t.cost, wages: t.wages, saved: tiemXoiSaved(t.made, t.event === 'gao' ? 1.25 : 1), event: t.event };
      quanWages += t.cost + t.wages;
      // GĐ484: khách ngồi ăn tại chỗ trong nhà tiệm, lấy xôi từ kho, bán giá lẻ
      const dine = tiemXoiDinePlan(s.biz.tiemXoi, s.level, k.storage, s.weather, s.day);
      for (const [id, qty] of Object.entries(dine.take)) takeStock(k, id, qty);
      quanRevenue += dine.revenue;
      tiemXoiLast = { ...tiemXoiLast!, dine: dine.portions, dineRevenue: dine.revenue };
      if (dine.portions) quanNews.push(`🍚 Khách ăn tại tiệm xôi ${dine.portions} suất · +${formatMoney(dine.revenue)}${isXoiCungDay(s.day) ? ' · 🙏 ngày cúng' : ''}`);
      // GĐ711: đuôi sự kiện giữ ở mọi giá (bài học GĐ707 — không thay bằng dòng khác), quá dài thì bỏ phần tự đồ trước
      const evTail = t.event === 'cooker' ? ' · 🍚 nồi hỏng, nấu chậm' : t.event === 'gao' ? ' · 🌾 gạo khan, giá vốn tăng' : '';
      const hand = s.biz.tiemXoi.handDay === s.day ? ' · chủ tự đồ 1 mẻ' : '';
      const xoiLine = (t.total ? `🍚 Tiệm xôi nấu ${t.total} phần vào kho · −${formatMoney(t.cost + t.wages)}` : '🍚 Tiệm xôi: kho đủ xôi, hôm nay không nấu') + evTail + hand;
      quanNews.push([...xoiLine].length <= 90 ? xoiLine : (t.total ? `🍚 Tiệm xôi nấu ${t.total} phần vào kho · −${formatMoney(t.cost + t.wages)}` : '🍚 Tiệm xôi: kho đủ xôi, hôm nay không nấu') + evTail);
    }
  }
  // Phụ trại đổ cám hộ + gom nông sản về kho (kèm nhãn nhà trồng/nhà nuôi bán được giá hơn)
  for (const f of farmhandFeedUsed) takeStock(k, f.productId, f.bags);
  if (farmhandPicked.length) {
    const homegrown = { ...garden.homegrown };
    for (const p of farmhandPicked) {
      putStock(k, p.productId, p.qty);
      homegrown[p.productId] = (homegrown[p.productId] ?? 0) + p.qty;
    }
    garden = { ...garden, homegrown };
  }
  // Hệ 1 L4 — mẻ phơi phụ trại thu hộ: vào kho; nhãn nhà trồng chỉ theo mẻ toàn nhà trồng (allHomegrown).
  if (preservePicked.length) {
    const homegrown = { ...garden.homegrown };
    for (const p of preservePicked) {
      putStock(k, p.productId, p.qty);
      if (p.homegrown) homegrown[p.productId] = (homegrown[p.productId] ?? 0) + p.qty;
    }
    garden = { ...garden, homegrown };
  }
  // Đơn quán xóm đặt nông sản: quá hạn thì quán xin lỗi bỏ, trống thì có đơn mới chờ
  const gardenNews = [...gardenNightResult.news, ...farmhandNews, ...phoiNight.news];
  if (garden.farmOrder && s.day >= garden.farmOrder.dueDay) {
    gardenNews.push(`📦 ${garden.farmOrder.from} huỷ đơn nông sản quá hạn — đơn khác sẽ ghé sau`);
    garden = { ...garden, farmOrder: null };
  }
  if (!garden.farmOrder && s.level >= FARM_ORDER_UNLOCK) {
    const order = makeFarmOrder(s.day + 1, undefined, farmOrderProduce(garden), farmOrderCapacity(garden));
    garden = { ...garden, farmOrder: order };
    gardenNews.push(farmOrderNews(order));
  }
  // Sổ nợ: nợ lâu thì nhắc chủ tiệm, quá hạn chót coi như mất
  const debts: Record<string, Debt> = {};
  for (const [rid, d] of Object.entries(s.debts)) {
    const age = s.day + 1 - d.since;
    if (age > DEBT_WRITE_OFF_DAYS) {
      s.adjustFriendship(rid, -WRITE_OFF_FRIEND_LOSS);
      say(`📕 ${regularById(rid)?.name} quỵt nợ ${formatMoney(d.amount)} sau ${DEBT_WRITE_OFF_DAYS} ngày`);
      continue;
    }
    if (age === DEBT_LATE_DAYS + 1) say(`📒 ${regularById(rid)?.name} nợ ${formatMoney(d.amount)} đã ${DEBT_LATE_DAYS} ngày, nên nhắc nợ`);
    debts[rid] = d;
  }
  // Đơn gọi điện chưa giao: hàng đã soạn mang về kho, khách phật ý
  for (const o of s.phoneOrders.filter((p) => p.status === 'carrying')) {
    for (const [id, qty] of Object.entries(o.items)) putStock(k, id, qty, o.lots?.[id]);
    s.addReview(2, 'wait');
    if (o.regular) s.adjustFriendship(o.regular, -PHONE_FRIEND_GAIN);
  }
  // Lời hẹn giữ món: chỉ giữ lại hẹn mới lập hôm nay (cho ngày mai); hẹn cũ khách đã ghé hay không thì xoá
  const reservations = Object.fromEntries(
    Object.entries(s.reservations).filter(([, r]) => r.day === s.day + 1),
  );
  if (s.deliveries.length) say(`🚚 Hàng đã về kho: ${s.deliveries.length} đơn`);
  if (aged.items) say(`🗑️ ${aged.items} món hết hạn phải bỏ đi (vốn ${formatMoney(aged.cost)})`);
  // Nhu cầu: trung bình trượt, ngày gần nặng hơn
  const demand = movingAverage(s.demand, s.demandToday);
  const sales = movingAverage(s.sales, s.salesToday);
  const today = s.forecast[0];
  // Đơn tiệc: quá hạn chưa giao thì người đặt phật ý; lời mời không nhận thì hết hạn
  let order = s.order;
  if (order && order.dueDay <= s.day) {
    const def = partyOrderById(order.id);
    if (order.accepted && def) {
      s.addReview(1, 'stock');
      if (def.regular) s.adjustFriendship(def.regular, -STORY_ORDER_FRIEND_LOSS);
      // GĐ Hệ2-L2: tiếng dữ lan theo cạnh — người có cạnh với khách lỡ hẹn hụt thân theo trọng số.
      if (def.regular) s.applyRipple(def.regular, -STORY_ORDER_FRIEND_LOSS);
      say(`😠 Lỡ hẹn đơn "${def.title}" của ${def.from}${def.regular ? ` · -${STORY_ORDER_FRIEND_LOSS} thân thiết` : ''}`);
    }
    order = null;
  }
  // Chỉ mời đơn tiệc có MÓN NHÀ LÀM khi đã có đúng trạm nấu để làm — tránh đơn "kẹt" không giao được
  const cookStations = [...new Set(s.furniture.filter((f) => isCookStation(f.type)).map((f) => f.type as CookingStation))];
  order ??= offerForDay(s.weatherSeed, s.day + 1, s.level, s.regulars, cookStations);
  // Kệ hao mòn qua đêm, mòn nhiều có thể hỏng
  const w = RISK_RULES.wear;
  let brokeNow = 0;
  let furniture = aged.furniture.map((f) => {
    if (s.level < w.unlock || !wears(f.type) || f.broken) return f;
    const wear = Math.min(100, (f.wear ?? 0) + w.perNight[0] + Math.floor(simRng()() * (w.perNight[1] - w.perNight[0] + 1)));
    const broken = simRng()() < (wear - w.breakFrom) * w.perPoint;
    if (broken) brokeNow++;
    return { ...f, wear, broken };
  });
  // Hợp đồng bảo trì: thợ ghé sáng nay — kệ mòn được bảo trì miễn phí, kệ hỏng sửa ngay nửa giá
  let maintCost = 0;
  let maintFixed = 0;
  if (hasUpgrade(s.biz, 'maintenance')) {
    furniture = furniture.map((f) => {
      if (!wears(f.type)) return f;
      if (f.broken) {
        maintCost += Math.round(repairCost(f.type) / 2000) * 1000;
        maintFixed++;
        return { ...f, wear: 10, broken: false };
      }
      return (f.wear ?? 0) >= w.serviceFrom ? { ...f, wear: 10 } : f;
    });
    brokeNow = 0;
  }
  // Sự kiện ngẫu nhiên hôm nay (ngày mới) + hợp đồng cung cấp tới kỳ giao
  const nextEvent = eventOn(s.weatherSeed, s.day + 1, s.level);
  let contractNews: string[] = [];
  const contracts: Record<string, ContractState> = { ...s.contracts };
  for (const [cid, cs2] of Object.entries(contracts)) {
    const cdef = supplyContractById(cid);
    if (!cdef) continue;
    // Quá hạn: đã qua ngày mà chưa giao kỳ này — lần giao kế tiếp sẽ không tính chuỗi đúng hẹn.
    if (cs2.dueDay < s.day + 1) contracts[cid] = { ...cs2, overdue: true };
    if (cs2.dueDay <= s.day + 1) {
      contractNews.push((cs2.delivered === 0 && cs2.pending)
        ? `\u{1F4CB} "${cdef.title}" chờ giao kỳ đầu (mỗi ${cdef.periodDays} ngày)`
        : `\u{1F69A} "${cdef.title}" tới kỳ giao hàng, xem ở Hợp đồng`);
    }
  }
  const news = morningNews(s.weatherSeed, s.day + 1, s.level);
  if (nextEvent) news.push(`${nextEvent.icon} Sự kiện hôm nay: ${nextEvent.blurb}`);
  // GĐ164: chuyện sự kiện còn dở mà ngày mai vẫn trong hạn — nhắc trong tin sáng (gợi ý ngắn của cảnh kế)
  const arcSt = s.biz.surpriseArc;
  if (arcSt && !arcSt.done && s.day + 1 <= arcSt.expiresDay) {
    const arc = surpriseArcById(arcSt.arcId);
    const sc = arc ? sceneFor(arc, arcSt) : null;
    if (arc && sc) news.push(`📖 Chuyện hôm qua còn dở: ${sc.teaser ?? arc.title}`);
  }
  news.push(...gardenNews);
  if (quanNews.length) news.push(...quanNews);
  if (contractNews.length) news.push(...contractNews);
  if (order && !order.accepted) news.push(`📋 ${partyOrderById(order.id)!.from} muốn đặt đơn, xem ở Nhiệm vụ`);
  if (brokeNow) news.push(`🔧 ${brokeNow} kệ bị hỏng qua đêm, bấm vào kệ để sửa`);
  if (maintFixed) news.push(`🔧 Thợ bảo trì đã sửa ${maintFixed} kệ hỏng sáng nay (nửa giá: ${formatMoney(maintCost)})`);
  else if (hasUpgrade(s.biz, 'maintenance')) news.push('🔧 Thợ bảo trì đã ghé: kệ mòn được chăm sóc như mới');
  // Tủ mát/tủ đông hỏng mà còn hàng: mất lạnh qua đêm, hàng trong tủ hỏng nhanh hơn
  // Dùng `furniture` (đã age qua đêm) chứ không phải `s.furniture` — mới phản ánh tủ hỏng đêm nay
  const coldBroken = furniture.filter((f) => f.broken && (f.type === 'fridge' || f.type === 'freezer')
    && f.tiers.some((t) => t.count > 0));
  if (coldBroken.length) news.push(`🧊 ${coldBroken.length} tủ lạnh đang hỏng: hàng mát trong tủ không được giữ lạnh, hỏng nhanh như để ngoài kho — sửa sớm!`);
  // Giấy phép bắt buộc: lần đầu phải có thì được nhắc kèm hạn chót (ân hạn), quá hạn chót mà thiếu thì thanh tra phạt
  const shelved = [...new Set([...s.furniture.flatMap((f) => f.tiers.filter((t) => t.productId && t.count > 0).map((t) => t.productId!)), ...Object.keys(s.branch?.shelf ?? {}).filter(isAlcohol)])];
  const needLicenses = requiredLicenses({ level: s.level, hasCookStation: s.furniture.some((f) => isCookStation(f.type)), shelved });
  let inspection = s.inspection ?? newInspection();
  const noticed = { ...inspection.noticed };
  for (const id of missingLicenses(s.licenses, needLicenses, s.day + 1)) {
    if (noticed[id] !== undefined) continue;
    noticed[id] = s.day + 1;
    news.push(`${licenseById(id).icon} Từ nay tiệm phải có ${licenseById(id).name} — hạn chót ngày ${s.day + 1 + LICENSE_GRACE}, xin ở bảng Giấy phép`);
  }
  for (const id of needLicenses) {
    if (licenseStatus(s.licenses, id, s.day + 1) === 'expiring' && s.licenses[id]! - s.day === RENEW_WARN_DAYS) news.push(`${licenseById(id).icon} ${licenseById(id).name} còn ${RENEW_WARN_DAYS - 1} ngày nữa hết hạn, nhớ gia hạn`);
  }
  inspection = { ...inspection, noticed };
  // Thanh tra thị trường: định kỳ, hoặc đột xuất khi khách phản ánh nhiều / tiệm vừa trượt. Chấm theo chỉ số ngày vừa đóng cửa
  let inspectPay = 0;
  const complaints = s.reviews.filter((r) => r.day === s.day && r.stars <= 2).length;
  const periodic = s.day % INSPECTION_EVERY === 0;
  const surprise = !periodic && (complaints >= COMPLAINTS_FOR_SURPRISE || inspection.strikes > 0) && simRng()() < SURPRISE_INSPECTION;
  if (s.level >= INSPECTION_UNLOCK && (periodic || surprise)) {
    const near = furniture.reduce((n, f) => n + f.tiers.reduce((m, t) => {
      if (!t.productId || t.count <= 0) return m;
      const life = nearestLife(fitLots(t.lots, t.count, t.productId));
      return life !== null && life <= 1 ? m + t.count : m;
    }, 0), 0);
    const priced = Object.keys(s.prices);
    const priceIndex = priced.length ? priced.reduce((n, id) => n + s.prices[id] / productById(id).sell, 0) / priced.length : 1;
    const insp = inspectionResult({ dirt: s.dirt, nearExpiryOnShelves: near, priceIndex, rating: summarizeReviews(s.reviews.slice(-30)).average, coldBroken: coldBroken.length });
    // Thiếu giấy phép đã quá ân hạn: phạt riêng từng tờ và coi như trượt
    const lacking = missingLicenses(s.licenses, needLicenses, s.day).filter((id) => s.day >= (noticed[id] ?? s.day) + LICENSE_GRACE);
    const pass = insp.pass && !lacking.length;
    inspectPay = (pass ? INSPECTION_REWARD : -INSPECTION_FINE) - lacking.length * LICENSE_FINE;
    const strikes = pass ? 0 : inspection.strikes + 1;
    const suspend = strikes >= SUSPEND_AFTER;
    inspection = { ...inspection, strikes: suspend ? 0 : strikes, lastDay: s.day, lastPass: pass, suspendedDay: suspend ? s.day + 1 : inspection.suspendedDay };
    news.push(`📋 Thanh tra ${periodic ? 'thị trường' : 'ĐỘT XUẤT (khách phản ánh)'} ${insp.score}/4: ${insp.notes.join(' · ')}`
      + (lacking.length ? ` · ❌ Thiếu ${lacking.map((id) => licenseById(id).name).join(', ')} (phạt ${formatMoney(lacking.length * LICENSE_FINE)})` : '')
      + ` — ${pass ? `ĐẠT, thưởng ${formatMoney(INSPECTION_REWARD)}` : `KHÔNG ĐẠT, phạt ${formatMoney(INSPECTION_FINE)}`}`);
    if (suspend) news.push(`⛔ Trượt thanh tra ${SUSPEND_AFTER} lần liền: tiệm bị ĐÌNH CHỈ kinh doanh ngày mai!`);
    else if (strikes === SUSPEND_AFTER - 1) news.push('⚠️ Trượt thêm một lần nữa là bị đình chỉ kinh doanh!');
  }
  // Nhân viên: thêm ngày công, kinh nghiệm; người tắt mắt ra tay (bị bắt thì thu lại); người niềm nở được khen
  const crew = staffDayEnd(s.staff, {
    revenue: s.stats.revenue, storage: k.storage, hasCamera: hasUpgrade(s.biz, 'camera'), hasManager: s.staff.some((st) => st.role === 'manager'), hasLead: s.staff.some((st) => st.rank === 'lead'),
  });
  for (const [id, q] of Object.entries(crew.goodsTaken)) takeStock(k, id, q);
  for (let i = 0; i < crew.praises; i++) get().addReview(5);
  news.push(...crew.news);
  const shrinkItems = Object.values(crew.goodsTaken).reduce((n, q) => n + q, 0);
  // Mạng xã hội: lời khen chê nổi bật hôm nay lên mạng, có thể lan truyền
  const socialDay = s.level >= SOCIAL_UNLOCK ? socialDayEnd(s.social, get().reviews, s.day) : { social: s.social, news: [] };
  news.push(...socialDay.news);
  // Bắt được nhân viên ăn bớt hàng: tin xấu lan trên mạng thành khủng hoảng nhỏ (mỗi lần một nửa cơ hội)
  let socialNext = socialDay.social;
  if (crew.caught.length && !socialNext.buzz && s.level >= SOCIAL_UNLOCK && simRng()() < 0.5) {
    const id = (socialNext.posts.at(-1)?.id ?? 0) + 1;
    const post: SocialPost = {
      id, day: s.day, author: 'Khách qua đường', stars: 1,
      text: `🚨 Nghe đồn ${s.shopName} vừa bắt được nhân viên ăn bớt hàng trong kho... mua đồ ở đây sợ quá!`,
      likes: 30 + Math.round(socialNext.followers * 0.3), shares: 12, viral: true,
    };
    socialNext = { ...socialNext, posts: [...socialNext.posts, post].slice(-POST_CAP), buzz: { kind: 'crisis', postId: id, until: s.day + BUZZ_DAYS, mul: CRISIS_MUL } };
    news.push('📱⚠️ Tin bắt được nhân viên gian lận lan trên mạng, khách đang xì xào — nên đăng bài xin lỗi ở Mạng xã hội');
  }
  // Đơn app còn đang chở: coi như tới trễ; đơn chưa nhận thì app huỷ. GĐ717: sự kiện app cho ngày mai
  // rút bằng băm riêng (weatherSeed + ngày — mẫu eventOn): không rút dòng simRng, mô phỏng cũ không lệch
  const onlineEv = onlineDayEvent(s.weatherSeed, s.day + 1);
  const onlineDay = onlineDayEnd(s, onlineEv);
  if (s.online.done || s.online.orders.length) news.push(`📲 App hôm nay: thu ${formatMoney(s.online.revenueToday + onlineDay.money)} (đã trừ hoa hồng)${s.online.grabFeesToday ? `, phí Grab ${formatMoney(s.online.grabFeesToday)}` : ''} · điểm ${appRating(onlineDay.online).toFixed(1)}★`);
  if (onlineEv) news.push(onlineEventLine(onlineEv));
  if (s.fakeCash) news.push(`💸 Kiểm két thấy ${formatMoney(s.fakeCash)} tiền giả`);
  weatherLine = `Hôm nay: ${describeDay(s.weatherSeed, s.day + 1, today)}. ${WEATHER[today].tip}`; log.push(...news); // GĐ565/568: đủ tin ở lastSummary.news → Sổ đầu ngày
  // Giá tham chiếu thị trường nhích theo khan hiếm (kho + kệ) và cầu trung bình của từng món
  const market: Record<string, number> = { ...s.market };
  for (const p of unlockedProducts(s.level)) {
    const onShelf = furniture.reduce((n, f) => n + f.tiers.reduce((m, t) => m + (t.productId === p.id ? t.count : 0), 0), 0);
    market[p.id] = nextMarketIndex(market[p.id] ?? 1, (k.storage[p.id] ?? 0) + onShelf, 0, demand[p.id] ?? 0);
  }
  // Trả lương và tiền nhà cuối ngày (kèm phí thợ bảo trì sáng nay nếu có); chi nhánh mua đứt nên không cộng tiền thuê
  const rentFull = rentOf(s.shopTier);
  // Hệ8-L8 (SPEC-CHIEU-RONG §8.3): trong biến cố dài, tiệm đang âm tiền thì chủ nhà miễn tiền nhà 3 ngày
  // (mỗi đợt một lần — `rentGrace` undefined nghĩa là đợt này còn quyền). Chỉ áp khi thật sự không đủ trả nhà.
  const crisisAct = s.biz.crisis;
  let rent = rentFull;
  let rentGraceN: number | undefined; // giá trị mới ghi lại vào crisis (undefined = không đổi)
  if (crisisAct && s.money < rentFull) {
    const g = crisisAct.rentGrace;
    if (g === undefined) { rent = 0; rentGraceN = 3; } // lần đầu đợt này: tặng khung 3 ngày
    else if (g > 0) { rent = 0; rentGraceN = g - 1; } // tiếp tục hưởng ngày còn lại
  }
  if (rent === 0 && rentFull > 0) say(`🏠 Chủ nhà miễn tiền nhà ${formatMoney(rentFull)} hôm nay — hẻm gặp biến cố dài, thông cảm 3 ngày`);
  const relief = wageRelief(s.money - rent, wagesDue(s), s.staff); // GĐ1525
  const wages = wagesDue(s) - relief + branchWages;
  if (relief) say(`🤝 Két không đủ trả lương — người làm lâu nhất thông cảm bỏ qua ${formatMoney(relief)} hôm nay`);
  // Chi phí vận hành theo doanh thu (điện/nước/bảo trì): % doanh thu, nhỏ lúc đầu, đáng kể khi lên siêu thị
  // Tiện lợi chạy tủ mát/đông suốt 24h nên có hóa đơn điện riêng; doanh thu quán nước tự lo chi phí của nó
  const branchPower = br ? branchPowerBill(br) : 0;
  const opCost = Math.round((s.stats.revenue + onlineDay.money + crew.tips) * OPERATING_REVENUE_RATE) + branchPower;
  // GĐ1832 (review đợt 2 R1 / đợt 3 R2): thưởng thành tựu sẽ được checkAchievements() cộng vào ví
  // SAU khi tính dòng "Tiền vào − tiền ra" (đêm nay) — đọc trước bằng hàm thuần để tổng kết báo
  // đúng khoản chênh lệch với ví; phí vận hành thì tách khỏi `spent` thành dòng riêng.
  const achvReward = freshAchievements(s).reduce((n, a) => n + a.reward, 0);
  const stats: DayStats = {
    ...s.stats, wages, rent, spent: s.stats.spent + maintCost + opCost, spoiledItems: aged.items, spoiledCost: aged.cost,
    revenue: s.stats.revenue + onlineDay.money + crew.tips + quanRevenue, online: (s.stats.online ?? 0) + onlineDay.money,
    ...(crew.cashLoss || shrinkItems ? { shrinkCash: crew.cashLoss, shrinkItems } : {}),
    ...(achvReward ? { achvReward } : {}),
    ...(opCost + maintCost > 0 ? { opCost: opCost + maintCost } : {}),
  };
  if (opCost >= 5000 && s.day > 1) say(`💡 Chi phí vận hành (điện/nước) ${formatMoney(opCost)}${branchPower ? ` — riêng tiện lợi 24/7 ${formatMoney(branchPower)} tiền điện` : ''}`);
  // GĐ300: chốt sẵn việc sáng 🧍 NGAY TẠI MÁY CHẠY. Snapshot staffDay là transient ngoài useGame
  // (chỉ máy chạy mô phỏng mới có), nên nếu để Sổ đầu ngày tự đọc thì máy khách hẻm online sẽ không
  // bao giờ thấy việc này. Tính ở đây rồi gửi kèm lastSummary → hai chế độ ra KẾT QUẢ GIỐNG NHAU.
  const staffIdleAct = morningShiftAction(staffDaySnapshot(), s.staff, stats);
  const staffIdleNote = staffIdleAct ? { staffIdle: staffIdleAct } : {};
  const biz = bizEndOfDay(s, stats, (br?.revenueToday ?? 0) + quanRevenue);
  if (biz.news.length) say(biz.news.join(' · '));
  // GĐ Hệ8-L3 (SPEC-CHIEU-RONG §8) — Biến cố dài: đêm nay mở/đóng đợt biến cố cho ngày mai.
  // TẤT ĐỊNH từ lịch hash trên weatherSeed (KHÔNG simRng — R1), cấp mở ≥ 36 nên golden L30 vẫn nguyên;
  // tắt bằng biz.calmYears (Năm yên ả). Chỉ chạm biz.*crisis, không đụng phần khác.
  const crisisN = crisisNight(s.weatherSeed, s.day, s.level, biz.biz);
  if (crisisN.news.length) say(crisisN.news.join(' · '));
  // Hệ8-L8 — miễn tiền nhà ở trên đã tiêu một ngày trong khung 3 ngày → ghi lại vào crisis state.
  const crisisNext = crisisN.crisis && rentGraceN !== undefined ? { ...crisisN.crisis, rentGrace: rentGraceN } : crisisN.crisis;
  biz.biz = {
    ...biz.biz,
    crisis: crisisNext, crisesSeen: crisisN.crisesSeen, crisisBadges: crisisN.crisisBadges, roadBoon: crisisN.roadBoon, lastCrisis: crisisN.lastCrisis,
  };
  // GĐ Hệ2-L3 (SPEC-CHIEU-SAU §2.5) — VIỆC NHÀ TRONG HẺM: mời ĐÁM GIỖ hằng năm (giỗ lặp, R4,
  // không lưu — ngày băm từ id cùng lịch nên hai máy hẻm luôn khớp). Cổng cấp ≥ LIFE_EVENT_UNLOCK
  // (golden L30 an toàn); một việc một lúc (biz.lifeEvent), tối đa 1 giỗ/năm (R7).
  const curLife = biz.biz.lifeEvent;
  if (curLife && curLife.accepted && curLife.eventDay <= s.day) {
    // Đã nhận lời mà hết ngày cỗ chưa giao → lỡ hẹn: chủ −, cụm họ hàng −, một review 1★.
    const ldef = lifeEventById(curLife.defId);
    if (ldef) {
      const loss = ldef.friendship[curLife.tier];
      s.addReview(1, 'stock');
      s.adjustFriendship(ldef.host, -loss);
      s.applyRipple(ldef.host, -loss, { friendlyOnly: true });
      say(`😠 Lỡ hẹn đám giỗ nhà ${regularById(ldef.host)?.name ?? ldef.host}: -${loss} thân thiết`);
    }
    biz.biz = { ...biz.biz, lifeEvent: undefined };
  } else if (!curLife || curLife.eventDay < s.day) {
    const offer = lifeEventFor({ day: s.day, seed: s.weatherSeed, level: s.level, regulars: s.regulars, done: biz.biz.lifeEventsDone });
    if (offer) {
      const ldef = lifeEventById(offer.defId);
      biz.biz = { ...biz.biz, lifeEvent: { defId: offer.defId, eventDay: offer.eventDay, tier: 0, accepted: false } };
      if (ldef) say(`🏮 Giỗ nhà ${regularById(ldef.host)?.name ?? ldef.host} (${gioLabel(ldef)}) nhờ lo cỗ — xem Sổ đầu ngày`);
    }
  }
  // Kết quả quán nước hôm nay ghi vào biz để UI hiển thị (xem lại "hôm qua bán được bao nhiêu ly")
  if (quanNuocLast) biz.biz = { ...biz.biz, quanNuocLast };
  if (tiemXoiLast) {
    // GĐ489: cộng dồn suất ăn tại chỗ (thành tựu "Quán xôi đông khách")
    const tx = biz.biz.tiemXoi;
    biz.biz = { ...biz.biz, tiemXoiLast, tiemXoi: { ...tx, dineTotal: (tx.dineTotal ?? 0) + (tiemXoiLast.dine ?? 0) } };
  }
  // Hệ 3 (SPEC-CHIEU-SAU §3.5) — CUỐI NGÀY cập nhật biển hiệu: hôm nay khớp hướng đang treo không.
  // Đo ĐÚNG hướng treo (stanceFitByDirection). Cổng cấp ≥ 60 (R1) + stanceActive (không phải đang làm
  // lại biển) → tiệm không treo biển / golden L30 hoàn toàn không chạm.
  const stStance0 = biz.biz.stance;
  const stStance2 = biz.biz.stance2;
  if (s.level >= STANCE_UNLOCK) {
    // Cập nhật TỪNG biển đang hiệu lực (biển chính + biển phụ Hệ3-L8 khi đủ 3 ấn). Đo đúng hướng
    // đang treo (stanceFitByDirection); đang làm lại biển (switchUntil) → stanceActive false, không đổi.
    let b = biz.biz;
    const tickSign = (sig: { st: StanceState | undefined; key: 'stance' | 'stance2' }) => {
      if (!sig.st || !stanceActive(sig.st, s.day)) return;
      const fitNow = stanceFitByDirection(buildStanceCtx(s))[sig.st.id];
      const nextSt = applyStanceDay(sig.st, fitNow, s.day);
      const nm = STANCE_META[sig.st.id].name;
      if (fitNow) say(`🪧 Hôm nay khớp hướng ${nm} (bậc ${stanceTier(nextSt.fitDays)})`);
      else if ((sig.st.missStreak ?? 0) + 1 >= 3) say(`🪧 ${nm} lệch 3 ngày liền — tụt một bậc`);
      else say(`🪧 Hôm nay lệch hướng ${nm} — coi lại thẻ Định vị`);
      b = { ...b, [sig.key]: nextSt };
      // Hệ 3 L8 (SPEC §3.7) — đạt bậc 5 một hướng → nhận ẤN định vị, lưu prestige.seals (giữ qua NG+).
      // Ấn chỉ có ý nghĩa ở vòng NG+ chơi đơn; lợi nhỏ và gated chỉ bởi có ấn → golden/hẻm không đổi.
      if (isStanceSealable(nextSt) && !hasStanceSeal(b, sig.st.id)) {
        const seals = [...(b.prestige.seals ?? []), sig.st.id];
        b = { ...b, prestige: { ...b.prestige, seals } };
        say(`🏅 Đạt bậc 5 hướng ${nm} — nhận Ấn ${nm}, giữ qua các lần tái sinh`);
      }
    };
    tickSign({ st: stStance0, key: 'stance' });
    tickSign({ st: stStance2, key: 'stance2' });
    biz.biz = b;
  }
  const todayReviews = s.reviews.filter((r) => r.day === s.day);
  const record: DayRecord = {
    day: s.day, revenue: stats.revenue, profit: stats.revenue - stats.spent - wages - rent,
    customers: stats.customers, unhappy: stats.unhappy,
    salesProfit: daySalesProfit(stats) - wages - rent,
    ...(todayReviews.length ? { rating: todayReviews.reduce((n, r) => n + r.stars, 0) / todayReviews.length } : {}),
  };
  const nextId = Math.max(0, ...s.staff.map((st) => st.id), ...s.candidates.map((c) => c.id)) + 1;
  // Nhật ký cơ sở (chi nhánh + quán nước) cho mục "Xu hướng cơ sở": lãi thô chi nhánh = thu − lương (chưa trừ điện);
  // quán nước chỉ ghi khi có mở. Giữ cửa sổ lăn như history.
  const venueDay: VenueDay = {
    day: s.day,
    branchRevenue: br ? br.revenueToday : 0,
    branchProfit: br ? Math.round(br.revenueToday - branchWages) : 0,
    branchCustomers: br ? br.customersToday : 0,
    branchMissed: br ? br.missedToday : 0,
    quanRevenue: quanNuocLast ? quanNuocLast.revenue : 0,
    quanProfit: quanNuocLast ? quanNuocLast.profit : 0,
    ...(tiemXoiLast ? { xoiNet: tiemXoiLast.saved - tiemXoiLast.wages } : {}),
  };
  // Sổ rủi ro (GĐ58): gộp thất thoát/chặn trong ngày (trộm + tiền giả đã cộng vào riskToday lúc bán)
  // + nhân viên gian lận (crew) rồi ghi 1 ngày vào riskTrend và reset riskToday — kinh tế không đổi.
  const blockedFromStaff = crew.blockedCash + Object.entries(crew.blockedGoods).reduce((n, [id, q]) => n + q * productById(id).buy, 0);
  const leakFromStaff = crew.cashLoss + Object.entries(crew.goodsTaken).reduce((n, [id, q]) => n + q * productById(id).buy, 0);
  const riskDay = {
    day: s.day + 1,
    leak: s.riskToday.leak + leakFromStaff,
    blocked: s.riskToday.blocked + blockedFromStaff,
    events: s.riskToday.events + crew.caught.length,
  };
  // Thức qua nửa đêm (ca đêm) thì hôm sau dậy trễ, bỏ lỡ buổi sáng đông khách
  const wokeLate = s.minutes >= 24 * 60;
  if (wokeLate) say('😴 Ngủ muộn vì ca đêm: hôm nay dậy trễ, bỏ lỡ buổi sáng đông khách!');
  // GĐ1833 (review đợt 2 R3 / đợt 3 R3): két âm sau khi trả nhà/lương/vận hành — nói thẳng con số
  // thiếu trong tổng kết (và kê dòng riêng) để người chơi biết mình đang nợ chứ không mất một cách vô cớ.
  const moneyAfter = (extra.money ?? s.money) - wages - rent - maintCost - opCost + inspectPay + biz.money + onlineDay.money + crew.tips - crew.cashLoss + quanRevenue - quanWages;
  if (moneyAfter < 0) {
    stats.shortfall = -moneyAfter; // stats là DayStats — panel/lastSummary giữ cùng tham chiếu
    say(`⚠️ Két thiếu ${formatMoney(-moneyAfter)} sau khi trả nhà/lương/vận hành — bán bù sớm kẻo lún sâu`);
  }
  set({
    candidates: generateCandidates(s.level, nextId),
    day: s.day + 1,
    minutes: wokeLate ? LATE_WAKE_AT : DAY_START,
    shopOpen: false,
    dirt: 0,
    buildMode: false,
    placing: null,
    panel: { type: 'summary', day: s.day, stats },
    lastSummary: { day: s.day, stats, ...staffIdleNote, ...(log.length ? { news: log } : {}) },
    stats: emptyStats(),
    ...k, furniture, order, phoneOrders: [], phoneSlot: 0, debts, vendorOffer: null, event: nextEvent, contracts, fakeCash: 0, wheelBoost: 1, history: [...s.history, record].slice(-HISTORY_DAYS), venueTrend: [...s.venueTrend, venueDay].slice(-VENUE_TREND_DAYS), riskTrend: [...s.riskTrend, riskDay].slice(-RISK_TREND_DAYS), riskToday: emptyRiskToday(), deliveries: [], demand, demandToday: {}, sales, salesToday: {}, reservations, market,
    garden, analytics,
    weather: s.forecast[0], forecast: forecastFrom(s.weatherSeed, s.day + 1, s.forecast[0]),
    ...extra,
    money: moneyAfter,
    staff: crew.staff.filter((st) => st.id !== biz.poachedStaffId), social: socialNext, online: onlineDay.online, inspection,
    biz: biz.biz,
    branch: nextBranch ? { ...nextBranch.branch, revenueToday: 0, customersToday: 0, lostToday: 0, missedToday: 0, simAt: wokeLate ? LATE_WAKE_AT : DAY_START, lastTrip: nextBranch.branch.lastTrip - 1440 } : null,
  });
  // GĐ169 — thưởng chuỗi tuần/tháng đổi XP: cộng sau khi state ngày mới đã set (đi qua addXp để
  // lên cấp/mở khóa đúng một luồng; XP Chuỗi là thành phần kinh tế NHẸ Leader duyệt theo audit).
  // GĐ569: tin sau ngủ (lên cấp, thành tựu, danh hiệu, thay ô) cũng gom vào cùng toast — đứng ngay sau thời tiết.
  const nightLen = log.length;
  const realNotify = get().notify;
  set({ notify: say });
  try {
    if (biz.streakXp) get().addXp(biz.streakXp);
    checkAchievements();
    // Hàng mới về sáng nay: ô kệ hết hàng mà kho không còn món đó thì đổi sang món khác
    get().checkTitles();
    if (s.autoSwap) {
      const swapped = get().replaceEmptySlots();
      if (swapped.length && s.day > 1) say(fitList('🔄 Thay ô hết hàng: ', swapped));
    }
  } finally {
    set({ notify: realNotify });
  }
  const after = log.splice(nightLen);
  log.unshift(...after);
  realNotify(fitJoin([weatherLine, ...log]));
};
