import { formatMoney, productById, unlockedProducts } from '../../data/products';
import { SHOP_TIERS, rentOf, OPERATING_REVENUE_RATE } from '../../data/shopTiers';
import { describeDay, forecastFrom, WEATHER } from '../../data/weather';
import { fitLots, nearestLife } from '../../data/freshness';
import { regularById } from '../../data/regulars';
import { offerForDay, partyOrderById, STORY_ORDER_FRIEND_LOSS } from '../../data/orders';
import { morningNews } from '../../data/calendar';
import { DEBT_LATE_DAYS, DEBT_WRITE_OFF_DAYS, WRITE_OFF_FRIEND_LOSS, type Debt } from '../../data/credit';
import { INSPECTION_EVERY, INSPECTION_FINE, INSPECTION_REWARD, INSPECTION_UNLOCK, inspectionResult } from '../../data/biz';
import { bizEndOfDay, checkAchievements } from '../biz';
import { PHONE_FRIEND_GAIN } from '../../data/phoneOrders';
import { nextMarketIndex } from '../../data/market';
import { hasSkill } from '../../data/titles';
import { repairCost, RISK_RULES, wears } from '../../data/risks';
import { hasUpgrade } from '../../data/upgrades';
import { LATE_WAKE_AT } from '../../data/night';
import { summarizeReviews } from '../../data/reviews';
import { dailyWage, generateCandidates } from '../../data/staff';
import { eventOn } from '../../data/events';
import { supplyContractById } from '../../data/contracts';
import { branchPowerBill, restingOn } from '../../data/branches';
import { type GameState, type ContractState, type DayRecord, type SetState, type GetState, DAY_START, HISTORY_DAYS, wagesDue, emptyStats } from '../gameTypes';
import { putStock, spoilOvernight, takeStock, type Stock } from '../stock';
import { isCookStation } from '../../data/furniture';
import { COMPLAINTS_FOR_SURPRISE, LICENSE_FINE, LICENSE_GRACE, licenseById, licenseStatus, missingLicenses, newInspection, RENEW_WARN_DAYS, requiredLicenses, SURPRISE_INSPECTION, SUSPEND_AFTER } from '../../data/licenses';
import { staffDayEnd } from '../../data/staffTraits';
import { BUZZ_DAYS, CRISIS_MUL, POST_CAP, SOCIAL_UNLOCK, socialDayEnd, type SocialPost } from '../../data/social';
import { ANIMAL_ORDER, farmCritChance, farmhandChores, FARM_ORDER_UNLOCK, gardenNight, makeFarmOrder, type AnimalKind } from '../../data/garden';
import { logAnalyticsDay } from '../../data/analytics';
import { appRating } from '../../data/online';
import { onlineDayEnd } from './online';
import { runBranch, branchNewDay } from './branch';

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
  if (nextBranch?.news.length) s.notify(nextBranch.news.join(' · '));
  if (br) s.notify(`🏪 Tiện lợi 24/7: ${br.customersToday} khách, thu ${formatMoney(br.revenueToday)}, lương ${formatMoney(branchWages)}`
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
    s.notify(`🏗️ Thợ đã xây xong: ${SHOP_TIERS[s.shopTier + 1].name}! Mai khai trương, cả hẻm sẽ tới mừng, xem mục tiêu ở Nhiệm vụ`);
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
  }
  const gardenNightResult = gardenNight(garden, { day: s.day, weather: s.weather, fed });
  garden = gardenNightResult.garden;
  // Sổ phân tích 30 ngày: bán/hỏng/lỡ bán theo từng món + cờ combo & giờ vàng của hôm nay
  const lostPerItem: Record<string, number> = {};
  for (const [key, n] of Object.entries(s.stats.missLog ?? {})) {
    const pid = key.split(':')[1];
    if (pid) lostPerItem[pid] = (lostPerItem[pid] ?? 0) + n;
  }
  const analytics = logAnalyticsDay(s.analytics, s.day, s.stats.byItem ?? {}, lostPerItem, aged.byId,
    { combo: s.activeCombos.length > 0, happyHour: !!s.happyHour });
  const k: Stock = { storage: aged.storage, storageLots: aged.storageLots };
  for (const d of s.deliveries) for (const [id, qty] of Object.entries(d.items)) putStock(k, id, qty);
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
  // Đơn quán xóm đặt nông sản: quá hạn thì quán xin lỗi bỏ, trống thì có đơn mới chờ
  const gardenNews = [...gardenNightResult.news, ...farmhandNews];
  if (garden.farmOrder && s.day >= garden.farmOrder.dueDay) {
    gardenNews.push(`📦 ${garden.farmOrder.from} huỷ đơn nông sản quá hạn — đơn khác sẽ ghé sau`);
    garden = { ...garden, farmOrder: null };
  }
  if (!garden.farmOrder && s.level >= FARM_ORDER_UNLOCK) {
    const order = makeFarmOrder(s.day + 1);
    garden = { ...garden, farmOrder: order };
    gardenNews.push(`📦 ${order.from} đặt mua nông sản, hạn ngày ${order.dueDay} — xem ở bảng Trang trại`);
  }
  // Sổ nợ: nợ lâu thì nhắc chủ tiệm, quá hạn chót coi như mất
  const debts: Record<string, Debt> = {};
  for (const [rid, d] of Object.entries(s.debts)) {
    const age = s.day + 1 - d.since;
    if (age > DEBT_WRITE_OFF_DAYS) {
      s.adjustFriendship(rid, -WRITE_OFF_FRIEND_LOSS);
      s.notify(`📕 ${regularById(rid)?.name} quỵt nợ ${formatMoney(d.amount)} sau ${DEBT_WRITE_OFF_DAYS} ngày`);
      continue;
    }
    if (age === DEBT_LATE_DAYS + 1) s.notify(`📒 ${regularById(rid)?.name} nợ ${formatMoney(d.amount)} đã ${DEBT_LATE_DAYS} ngày, nên nhắc nợ`);
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
  if (s.deliveries.length) s.notify(`🚚 Hàng đã về kho: ${s.deliveries.length} đơn`);
  if (aged.items) s.notify(`🗑️ ${aged.items} món hết hạn phải bỏ đi (vốn ${formatMoney(aged.cost)})`);
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
      s.notify(`😠 Lỡ hẹn đơn "${def.title}" của ${def.from}${def.regular ? ` · -${STORY_ORDER_FRIEND_LOSS} thân thiết` : ''}`);
    }
    order = null;
  }
  order ??= offerForDay(s.weatherSeed, s.day + 1, s.level, s.regulars);
  // Kệ hao mòn qua đêm, mòn nhiều có thể hỏng
  const w = RISK_RULES.wear;
  let brokeNow = 0;
  let furniture = aged.furniture.map((f) => {
    if (s.level < w.unlock || !wears(f.type) || f.broken) return f;
    const wear = Math.min(100, (f.wear ?? 0) + w.perNight[0] + Math.floor(Math.random() * (w.perNight[1] - w.perNight[0] + 1)));
    const broken = Math.random() < (wear - w.breakFrom) * w.perPoint;
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
    if (cs2.dueDay <= s.day + 1) {
      contractNews.push((cs2.delivered === 0 && cs2.pending)
        ? `\u{1F4CB} "${cdef.title}" chờ giao kỳ đầu (mỗi ${cdef.periodDays} ngày)`
        : `\u{1F69A} "${cdef.title}" tới kỳ giao hàng, xem ở Hợp đồng`);
    }
  }
  const news = morningNews(s.weatherSeed, s.day + 1, s.level);
  if (nextEvent) news.push(`${nextEvent.icon} Sự kiện hôm nay: ${nextEvent.blurb}`);
  news.push(...gardenNews);
  if (contractNews.length) news.push(...contractNews);
  if (order && !order.accepted) news.push(`📋 ${partyOrderById(order.id)!.from} muốn đặt đơn, xem ở Nhiệm vụ`);
  if (brokeNow) news.push(`🔧 ${brokeNow} kệ bị hỏng qua đêm, bấm vào kệ để sửa`);
  if (maintFixed) news.push(`🔧 Thợ bảo trì đã sửa ${maintFixed} kệ hỏng sáng nay (nửa giá: ${formatMoney(maintCost)})`);
  else if (hasUpgrade(s.biz, 'maintenance')) news.push('🔧 Thợ bảo trì đã ghé: kệ mòn được chăm sóc như mới');
  // Tủ mát/tủ đông hỏng mà còn hàng: mất lạnh qua đêm, hàng trong tủ hỏng nhanh hơn
  const coldBroken = s.furniture.filter((f) => f.broken && (f.type === 'fridge' || f.type === 'freezer')
    && f.tiers.some((t) => t.count > 0));
  if (coldBroken.length) news.push(`🧊 ${coldBroken.length} tủ lạnh đang hỏng: hàng mát trong tủ không được giữ lạnh, hỏng nhanh như để ngoài kho — sửa sớm!`);
  // Giấy phép bắt buộc: lần đầu phải có thì được nhắc kèm hạn chót (ân hạn), quá hạn chót mà thiếu thì thanh tra phạt
  const shelved = [...new Set([...s.furniture.flatMap((f) => f.tiers.filter((t) => t.productId && t.count > 0).map((t) => t.productId!)), ...Object.keys(s.branch?.shelf ?? {})])];
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
  const surprise = !periodic && (complaints >= COMPLAINTS_FOR_SURPRISE || inspection.strikes > 0) && Math.random() < SURPRISE_INSPECTION;
  if (s.level >= INSPECTION_UNLOCK && (periodic || surprise)) {
    const near = s.furniture.reduce((n, f) => n + f.tiers.reduce((m, t) => {
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
  if (crew.caught.length && !socialNext.buzz && s.level >= SOCIAL_UNLOCK && Math.random() < 0.5) {
    const id = (socialNext.posts.at(-1)?.id ?? 0) + 1;
    const post: SocialPost = {
      id, day: s.day, author: 'Khách qua đường', stars: 1,
      text: `🚨 Nghe đồn ${s.shopName} vừa bắt được nhân viên ăn bớt hàng trong kho... mua đồ ở đây sợ quá!`,
      likes: 30 + Math.round(socialNext.followers * 0.3), shares: 12, viral: true,
    };
    socialNext = { ...socialNext, posts: [...socialNext.posts, post].slice(-POST_CAP), buzz: { kind: 'crisis', postId: id, until: s.day + BUZZ_DAYS, mul: CRISIS_MUL } };
    news.push('📱⚠️ Tin bắt được nhân viên gian lận lan trên mạng, khách đang xì xào — nên đăng bài xin lỗi ở Mạng xã hội');
  }
  // Đơn app còn đang chở: coi như tới trễ; đơn chưa nhận thì app huỷ
  const onlineDay = onlineDayEnd(s);
  if (s.online.done || s.online.orders.length) news.push(`📲 App hôm nay: thu ${formatMoney(s.online.revenueToday + onlineDay.money)} (đã trừ hoa hồng)${s.online.grabFeesToday ? `, phí Grab ${formatMoney(s.online.grabFeesToday)}` : ''} · điểm ${appRating(onlineDay.online).toFixed(1)}★`);
  if (s.fakeCash) news.push(`💸 Kiểm két thấy ${formatMoney(s.fakeCash)} tiền giả`);
  s.notify([`Hôm nay: ${describeDay(s.weatherSeed, s.day + 1, today)}. ${WEATHER[today].tip}`, ...news].join(' · '));
  // Giá tham chiếu thị trường nhích theo khan hiếm (kho + kệ) và cầu trung bình của từng món
  const market: Record<string, number> = { ...s.market };
  for (const p of unlockedProducts(s.level)) {
    const onShelf = furniture.reduce((n, f) => n + f.tiers.reduce((m, t) => m + (t.productId === p.id ? t.count : 0), 0), 0);
    market[p.id] = nextMarketIndex(market[p.id] ?? 1, (k.storage[p.id] ?? 0) + onShelf, 0, demand[p.id] ?? 0);
  }
  // Trả lương và tiền nhà cuối ngày (kèm phí thợ bảo trì sáng nay nếu có); chi nhánh mua đứt nên không cộng tiền thuê
  const wages = wagesDue(s) + branchWages;
  const rent = rentOf(s.shopTier);
  // Chi phí vận hành theo doanh thu (điện/nước/bảo trì): % doanh thu, nhỏ lúc đầu, đáng kể khi lên siêu thị
  // Tiện lợi chạy tủ mát/đông suốt 24h nên có hóa đơn điện riêng
  const branchPower = br ? branchPowerBill(br) : 0;
  const opCost = Math.round((s.stats.revenue + onlineDay.money + crew.tips) * OPERATING_REVENUE_RATE) + branchPower;
  const stats = {
    ...s.stats, wages, rent, spent: s.stats.spent + maintCost + opCost, spoiledItems: aged.items, spoiledCost: aged.cost,
    revenue: s.stats.revenue + onlineDay.money + crew.tips, online: (s.stats.online ?? 0) + onlineDay.money,
    ...(crew.cashLoss || shrinkItems ? { shrinkCash: crew.cashLoss, shrinkItems } : {}),
  };
  if (opCost >= 5000) s.notify(`💡 Chi phí vận hành (điện/nước) ${formatMoney(opCost)}${branchPower ? ` — riêng tiện lợi 24/7 ${formatMoney(branchPower)} tiền điện` : ''}`);
  const biz = bizEndOfDay(s, stats);
  if (biz.news.length) s.notify(biz.news.join(' · '));
  const todayReviews = s.reviews.filter((r) => r.day === s.day);
  const record: DayRecord = {
    day: s.day, revenue: stats.revenue, profit: stats.revenue - stats.spent - wages - rent,
    customers: stats.customers, unhappy: stats.unhappy,
    ...(todayReviews.length ? { rating: todayReviews.reduce((n, r) => n + r.stars, 0) / todayReviews.length } : {}),
  };
  const nextId = Math.max(0, ...s.staff.map((st) => st.id), ...s.candidates.map((c) => c.id)) + 1;
  // Thức qua nửa đêm (ca đêm) thì hôm sau dậy trễ, bỏ lỡ buổi sáng đông khách
  const wokeLate = s.minutes >= 24 * 60;
  if (wokeLate) s.notify('😴 Ngủ muộn vì ca đêm: hôm nay dậy trễ, bỏ lỡ buổi sáng đông khách!');
  set({
    candidates: generateCandidates(s.level, nextId),
    day: s.day + 1,
    minutes: wokeLate ? LATE_WAKE_AT : DAY_START,
    shopOpen: false,
    dirt: 0,
    buildMode: false,
    placing: null,
    panel: { type: 'summary', day: s.day, stats },
    stats: emptyStats(),
    ...k, furniture, order, phoneOrders: [], phoneSlot: 0, debts, vendorOffer: null, event: nextEvent, contracts, fakeCash: 0, wheelBoost: 1, history: [...s.history, record].slice(-HISTORY_DAYS), deliveries: [], demand, demandToday: {}, sales, salesToday: {}, reservations, market,
    garden, analytics,
    weather: s.forecast[0], forecast: forecastFrom(s.weatherSeed, s.day + 1, s.forecast[0]),
    ...extra,
    money: (extra.money ?? s.money) - wages - rent - maintCost - opCost + inspectPay + biz.money + onlineDay.money + crew.tips - crew.cashLoss,
    staff: crew.staff.filter((st) => st.id !== biz.poachedStaffId), social: socialNext, online: onlineDay.online, inspection,
    biz: biz.biz,
    branch: nextBranch ? { ...nextBranch.branch, revenueToday: 0, customersToday: 0, lostToday: 0, missedToday: 0, simAt: wokeLate ? LATE_WAKE_AT : DAY_START, lastTrip: nextBranch.branch.lastTrip - 1440 } : null,
  });
  checkAchievements();
  // Hàng mới về sáng nay: ô kệ hết hàng mà kho không còn món đó thì đổi sang món khác
  get().checkTitles();
  if (s.autoSwap) {
    const swapped = get().replaceEmptySlots();
    if (swapped.length) s.notify(`🔄 Thay ô hết hàng: ${swapped.join(', ')}`);
  }
};
