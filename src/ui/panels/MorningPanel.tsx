import { cungGoodsAction, nextEventLine, sapEventActions, tiemXoiCungAction } from '../../data/dayEventActions';
import { tiemXoiMorning, TIEM_XOI_WAGE } from '../../data/tiemXoi';
import { useState } from 'react';
import { useGame, useClock, formatClock, type DayStats } from '../../core/store';
import { rentOf } from '../../data/shopTiers';
import { xpToNext } from '../../data/levels';
import { RECIPES } from '../../data/recipes';
import { kitchenValue } from '../../data/kitchenValue';
import { pickEveningPrep } from '../../data/cookSchedule';
import { cookSpeed, bartenderBoost } from '../../core/slices/orders';
import { caseSize, formatMoney, productById, fmtMul } from '../../data/products';
import { reputationOf } from '../../data/reputation';
import { repPayoff } from '../../data/repPayoff';
import { repMoney, avgPerVisit } from '../../data/repMoney';
import { butcherValueToday, MAX_BUTCHER_STAR, meatFromByItem, missedMeatRevenue, recentMeatRevenue } from '../../data/butcherValue';
import { debtLedger, debtDayAction } from '../../data/debtLedger';
import { regularById, regularsExpectedToday, birthdaysToday, birthdayHint, birthdayEve, REGULARS } from '../../data/regulars';
import { LOAN_DAILY_RATE, loyaltyPayoff } from '../../data/biz';
import { happyPayoff } from '../../data/rhythm';
import { QUAN_NUOC_UNLOCK, QUAN_NUOC_WAGE, QUAN_PRICE_OPTIONS, isQuanMatchDay } from '../../data/quanNuoc';
import { quanNuocDayAction, quanNuocHealth } from '../../data/quanNuocInsights';
import { DEBT_LATE_DAYS, DEBT_WRITE_OFF_DAYS } from '../../data/credit';
import { expiringSoon, expiryAdvice, peakAdvice, peakHours, spoilNightReport, storeMissRevenue, waitLossStats, walkoutAdvice, type Advice } from '../../data/advice';
import { dateOfDoy, dayEffects, dayOfYear, festivalStock, isWeekend, upcomingFestival, weekdayOf } from '../../data/calendar';
import { festivalValue } from '../../data/festivalValue';
import { festivalPrepAction, festivalRestockPlan } from '../../data/festivalRestock';
import { prepItems, prepBonus, PREP_MIN_QTY } from '../../data/festivalPrep';
import { itemHealthList, shelfAttention, shelfCount } from '../../data/analytics';
import { computeRecords, recordFeedToday } from '../../data/records';
import { comboDaySnapshot, resetComboDay } from '../../core/slices/comboDay';
import { resetStaffDay, staffDaySnapshot } from '../../core/slices/staffDay';
import { pickMorningShiftAction, staffDayRecap, staffShiftFix } from '../../data/staffIdle';
import { autoOpenNote, cashierOpensMorning } from '../../core/routine';
import { weekendRecap } from '../../data/weekendRestock';
import { weekendQuestTarget } from '../../data/quests';
import { comboById } from '../../data/combos';
import { branchMorningPlan } from '../../data/branchMorning';
import { feedCost, landmark2Progress, landmarkProgress } from '../../data/landmark';
import { storageUsed } from '../../core/gameTypes';
import { hiepLucEligible, HIEPLUC_COC, HIEPLUC_MIN } from '../../data/hiepLuc';
import { earlyUnlockTeaser } from '../../data/unlockMap';
import { marketClearValue, marketDayAction } from '../../data/chophien';
import { fairMerchantAction } from '../../data/fairmerchant';
import { alleySignalsToday } from '../../data/alleySignals';
import { SupplyChainCard } from './SupplyChainCard';
import { CounterDemandCard } from './CounterDemandCard';
import { signHiepLuc } from '../../core/biz';
import { seasonEvent, seasonObjective, seasonEventName, SEASON_EVENT_DAYS, SEASON_REWARD_PER_STAR } from '../../data/seasonEvent';
import { planDay, type DayAction } from '../../data/dayPlan';
import { demandForecast } from '../../data/counterDemand';
import { hasSkill } from '../../data/titles';
import { cleanBonus, CLEAN_TIERS, nextCleanTier } from '../../data/cleanOps';
import { monthOf } from '../../data/calendar';
import { trending } from '../../data/suppliers';
import { describeDay, WEATHER } from '../../data/weather';
import { trafficForecast } from '../../data/trafficForecast';
import { tomorrowTeaser } from '../../data/tomorrowTeaser';
import { missingForContract, reservedMissing, commitBonusValue, supplyContractById, contractStreakProgress, CONTRACT_STREAK_BONUS } from '../../data/contracts';
import { leakTone, riskLiveToday } from '../../data/risk';
import { nightPnl, nightPayback, nightPaybackLabel } from '../../data/nightReport';
import { PHONE_SLOTS } from '../../data/phoneOrders';
import { paymentById, type PaymentMethod } from '../../data/payments';
import { solvency } from '../../data/solvency';
import { loanBurden } from '../../data/loanBurden';
import { dailyBurn } from '../../data/dailyBurn';
import { recentAvgRevenue } from '../../data/minorPayoff';
import { AdviceCard, HourChart, ItemTable, HistoryChart } from './HistoryPanel';
import { Callout, Stat, Footer, Swatch, styles, Tabs } from './shared';



/**
 * Sổ đầu ngày: mọi thứ cần biết để chuẩn bị trong một màn hình — dịp lễ, hàng hot,
 * khách quen dự kiến ghé (và món họ thích còn trong kho không), lời hẹn giữ món,
 * hợp đồng tới kỳ giao và khe giờ điện thoại. Chỉ liệt kê, không tự quyết thay người chơi.
 */
export function MorningPanel() {
  const { day, level, xp, weatherSeed, weather, forecast, regulars, reservations, storage,
    furniture, staff, contracts, deliveries, shopTier, closePanel, openPanel, repLog, history,
    storageLots, debts, biz, money, branch, licenses, skills, happyHour, analytics, marketClearedDay,
    demand: stateDemand, activeCombos, priceOf, sellMarketSurplus, stats, autoRoutine, autoOpenAt, lastSummary } = useGame();
  const branchChores = branch ? branchMorningPlan(branch, storageUsed(storage), licenses, day, weatherSeed) : [];
  // GĐ123: mồi "kệ cần chú ý" từ analytics có sẵn — giống hệt AnalyticsPanel để không lệch số liệu.
  const shelved = shelfCount(furniture);
  const sickest = shelfAttention(itemHealthList(analytics, level, storage, shelved, stateDemand), 3);
  // GĐ124: mồi "combo hôm qua kém" từ dữ liệu transient per-day (comboDay vẫn còn data HÔM QUA khi vừa
  // sang ngày mới, reset khi đóng Sổ đầu ngày). Giúp quyết định xoay slot combo — chỉ hiện khi có bằng chứng.
  const yesterCombos = (() => {
    const snap = comboDaySnapshot();
    const running = activeCombos ?? [];
    const rows = running
      .map((id) => {
        const def = comboById(id);
        const t = snap[id];
        if (!def || !t || !t.count) return null;
        const [a, b] = def.items.map(productById);
        const full = priceOf(a.id) + priceOf(b.id);
        const cut = Math.round((full * def.discount) / 100) * 100;
        const margin = full - cut - a.buy - b.buy;
        return { def, t, margin };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null)
      // chỉ nhắc combo đang chạy NHƯNG hôm qua ít bán (count < mức đáng kể) hoặc lỗ cả cặp
      .filter((r) => r.margin < 0 || r.t.count <= 3)
      .sort((x, y) => (x.margin === y.margin ? x.t.count - y.t.count : x.margin - y.margin))
      .slice(0, 2);
    return rows;
  })();
  // GĐ127: Sổ kinh doanh quán nước — mồi quyết định (thuê/sa thải, nhập kho, cân kho
  // với kệ tiệm chính). THUẦN đọc state có sẵn; UI chỉ hiện dòng khi có tín hiệu.
  const quanHealth = biz.quanNuoc.open ? quanNuocHealth(biz.quanNuoc, level, storage, biz.quanNuocLast ?? null, weather, day) : null;
  const demand = demandForecast({
    level, day, weatherSeed,
    localLegend: hasSkill(skills, 'local_legend'),
    happy: happyHour,
  });
  const cleanStreak = biz.cleanStreak ?? 0;
  const cleanNext = nextCleanTier(cleanStreak);
  const cleanExtra = cleanNext ? `chạm ${cleanNext.name} → +${formatMoney(cleanBonus(cleanNext.n, level))}` : `đã đạt ${CLEAN_TIERS[CLEAN_TIERS.length - 1].name}`;
  const shopName = useGame((s) => s.shopName);
  const rep = reputationOf(repLog);
  const effects = dayEffects(weatherSeed, day, level);
  const soon = upcomingFestival(day);
  // GĐ245: soi dịp lễ ra khách/tiền — trên nền trữ hàng (GĐ70), định lượng hệ số khách và chi phí
  // nhập ra con số: khách thêm/ngày × giỏ bình quân 7 ngày. Hiện ở CẢ thẻ lễ ĐANG diễn ra lẫn SẮP tới.
  const last7 = history.slice(-7);
  const avgCust7 = last7.length ? last7.reduce((a, h) => a + h.customers, 0) / last7.length : 0;
  const fv = festivalValue({ day, level, customers: avgCust7, revenue: recentAvgRevenue(history, 7) });
  const fvDelta = fv && (
    <>
      ~{Math.round(fv.deltaKhachPerDay)} khách/ngày
      {avgCust7 > 0 && <> ≈ <b style={{ color: '#2ecc71' }}>+{formatMoney(Math.round(fv.moneyDeltaPerDay))}</b>/ngày</>}
      {fv.hotIds.length > 0 && <> · {fv.hotIds.length} món hot mở khóa</>}
    </>
  );
  const hot = trending(day, level).filter((id) => !effects.hot.includes(id));
  const expected = regularsExpectedToday(day, weatherSeed, level, regulars, rep, Object.keys(biz.rival?.poached ?? {})); // GĐ793
  const resList = Object.entries(reservations).filter(([, r]) => r.day === day);
  const haveStock = (id: string) => (storage[id] ?? 0) > 0 || furniture.some((f) => f.tiers.some((t) => t.productId === id && t.count > 0))
    || deliveries.some((d) => (d.items[id] ?? 0) > 0);
  const dueContracts = Object.entries(contracts)
    .map(([id, cs]) => ({ cs, def: supplyContractById(cs.defId) }))
    .filter(({ cs, def }) => def && cs.dueDay <= day + 1);
  // GĐ76: gộp mọi nhắc chuẩn bị ngày thành một danh sách ưu tiên (danger trước, khử trùng, cap 7).
  const candidates: DayAction[] = [];
  for (const c of branchChores) candidates.push({ icon: c.icon, text: c.text, panel: c.text.includes('xin nghỉ hôm nay') || c.text.includes('xin chuyển sang') ? 'staff' : 'branch', danger: c.danger, priority: 1 });
  // GĐ189: quán nước thiếu kho — trước giờ chỉ là thẻ thụ động, giờ thành việc sáng ưu tiên (nạp đồ uống).
  const quanAction = quanNuocDayAction(quanHealth, day, weather);
  if (quanAction) candidates.push(quanAction);
  // GĐ612: ngày cúng khách hỏi nhang/trái cây (GĐ609) — nhắc nhập món đã mở mà chưa có hàng
  const cungAct = cungGoodsAction(day, level, haveStock); // GĐ612/613 → GĐ633 tách hàm thuần
  if (cungAct) candidates.push(cungAct);
  // GĐ604: đêm có trận — tiện lợi đông sau 22h (GĐ601)
  candidates.push(...sapEventActions(biz.sapRong, biz.sapKinds, day, weather)); // GĐ625/631 → GĐ632 tách hàm thuần
  if (branch?.open && isQuanMatchDay(day, weather)) candidates.push({ icon: '⚽', text: 'Tối nay có trận — tiện lợi đông 22h–24h ×1,2, xếp đủ kệ', panel: 'branch', danger: false, priority: 3 });
  // GĐ589: ngày cúng — tiệm xôi đông; GĐ599: thợ tự nấu ×1,3 nên chỉ nhắc thêm thợ khi còn thiếu
  const xoiCungAct = tiemXoiCungAction(biz.tiemXoi, day); // GĐ599 → GĐ635
  if (xoiCungAct) candidates.push(xoiCungAct);
  for (const { cs, def } of dueContracts) candidates.push({ icon: '📦', text: `${def!.title}: giao trước ngày ${cs.dueDay}`, panel: 'contracts', danger: cs.dueDay <= day, priority: cs.dueDay <= day ? 0 : 2 });
  if (biz.loan && biz.loan.dueDay - day <= 3) candidates.push({ icon: '🏦', text: `Nợ ngân hàng sắp hạn (${Math.max(0, biz.loan.dueDay - day)} ngày)`, panel: 'business', danger: true, priority: 0 });
  // GĐ759 — sinh nhật khách quen: khách đã quen ghé chắc chắn, mua là +3 thân thiết → nhắc nhập món họ thích
  for (const e of birthdayEve(day, level, regulars, haveStock, Object.keys(biz.rival?.poached ?? {}))) candidates.push({ icon: '🎂', text: e.text, panel: 'order', danger: false, priority: 3 }); // GĐ781/793
  for (const d of birthdaysToday(expected, day)) { const h = birthdayHint(d, haveStock); candidates.push({ icon: '🎂', text: h.text, panel: 'regulars', danger: false, priority: h.priority }); }
  // GĐ747 — nợ khách quen sắp bị xoá (Sổ nợ nằm trong panel Khách quen, không ai mở): nhắc lên Sổ đầu ngày
  const debtAct = debtDayAction(debts, day);
  if (debtAct) candidates.push(debtAct);
  // GĐ741 — góp vật liệu công trình vào việc sáng: lượt góp hàng ngày nằm sâu trong panel, đưa lên Sổ đầu
  // ngày để góp đều (càng sớm hưởng lâu). Cả hai công trình xong thì không còn việc này.
  if (biz.landmark && biz.landmark.lastContributeDay < day) {
    const p1 = landmarkProgress(biz.landmark.contributions);
    const p2 = landmark2Progress(biz.landmark.contributions);
    const isP2 = p1.done;
    const idx = isP2 ? (p2?.index ?? 0) : p1.index;
    const proj = isP2 ? 'Đèn Đường Ngõ 1' : 'Sân chơi';
    candidates.push({ icon: isP2 ? '💡' : '🏗️', text: `Góp vật liệu ${proj} hôm nay (${formatMoney(feedCost(idx, level))})`, panel: 'landmark', danger: false, priority: 3 });
  }
  if (hiepLucEligible(branch, biz.quanNuoc, level) && !(biz.hiepLuc?.active && biz.hiepLuc.m === monthOf(day))) candidates.push({ icon: '🤝', text: 'Lập đối tác chi nhánh × quán nước', panel: 'morning', danger: false, priority: 3 });
  const se = seasonEvent(day);
  if (se) {
    const obj = seasonObjective(weatherSeed ?? 0, day);
    const claimed = biz.seasonEvt?.season === se.season && biz.seasonEvt.claimedDay === se.dayIndex;
    if (obj && !claimed) candidates.push({ icon: obj.icon, text: `Sự kiện ${seasonEventName(se.season)}: ${obj.title} (${obj.detail})`, panel: 'morning', danger: false, priority: 3 });
  }
  // GĐ249: trữ lễ thành việc sáng — lễ sắp tới còn món thiếu thì vào danh sách việc hôm nay (mẫu GĐ189).
  // Việc sáng không lọc theo mối (chưa chọn mối nào) — món mối không bán OrderPanel tự nói rõ (GĐ247).
  const festivalPrep = festivalPrepAction(festivalRestockPlan({ day, level, storage, sells: () => true, caseSizeOf: caseSize }), formatMoney);
  if (festivalPrep) candidates.push(festivalPrep);
  // GĐ257: cuối tuần thành việc sáng — Thứ 7/CN khách thật sự hay mua ăn vặt (GĐ255) nên nhắc
  // châm kệ đúng nhóm ngay buổi sáng, cùng nhịp "trữ lễ" GĐ249. Ưu tiên thấp (3) để nhường việc bức thiết.
  if (isWeekend(day)) candidates.push({ icon: '🍬', text: `Cuối tuần (${weekdayOf(day)}): khách hay mua ăn vặt — nhớ châm kệ mì, bánh kẹo, nước ngọt`, panel: 'order', danger: false, priority: 3 });
  // GĐ135: mồi "🧺 Hôm nay chợ phiên" — bản đánh giá (preview, pure-read) hàng DƯ đáng gánh ra bán.
  // Chỉ hiện ngày chợ (mỗi tuần từ ngày 7), khi có món dư, và chưa bán hôm nay. Bán thật ở GĐ136.
  const chophien = marketClearedDay === day ? null : marketClearValue({
    day, storage, shelved,
    health: itemHealthList(analytics, level, storage, shelved, stateDemand),
  });
  // GĐ290: chợ phiên thành việc sáng — đưa vào danh sách việc hôm nay khi có hàng dư
  const marketAction = marketDayAction(chophien);
  if (marketAction) candidates.push(marketAction);
  // GĐ293/294: thương lái ghé đầu tháng thành việc sáng — ngày 1–2 chưa lấy lô thì nhắc
  // xem lô sỉ chiết khấu trong Nhập hàng; lấy lô xong (biz.fairTaken = tháng) tự ẩn.
  const fairAct = fairMerchantAction(day, biz.fairTaken);
  if (fairAct) candidates.push(fairAct);
  // GĐ295/300: tổng kết đội hôm qua thành việc sáng. Ưu tiên bản máy chạy đã CHỐT SẴN trong
  // lastSummary (GĐ300) → máy khách hẻm online thấy y hệt máy chạy; chỉ khi không có (save cũ / vào
  // giữa ngày) mới tự tính từ snapshot transient của máy này.
  const yStats = lastSummary && lastSummary.day === day - 1 ? lastSummary.stats : undefined;
  const shiftAct = pickMorningShiftAction(
    lastSummary && lastSummary.day === day - 1 ? lastSummary.staffIdle : undefined,
    staffDaySnapshot(), staff, yStats,
  );
  if (shiftAct) candidates.push(shiftAct);
  const actions = planDay(candidates);
  const nextEvt = nextEventLine(day, level, QUAN_NUOC_UNLOCK, forecast[0]); // GĐ637
  // GĐ132: mồi "🧭 Sắp mở khóa" cho người chơi MỚI (tuần đầu) — 1–2 hệ lớn sắp mở + XP còn thiếu (thuần đọc)
  const earlyUnlocks = earlyUnlockTeaser({ level, xp, day });
  const courier = staff.some((w) => w.role === 'courier');
  const pct = (x: number) => `${x >= 1 ? '+' : ''}${Math.round((x - 1) * 100)}%`;
  const today = dateOfDoy(dayOfYear(day));
  const expiring = expiringSoon(storage, storageLots, furniture.flatMap((f) => f.tiers));
  const expiryTips = expiryAdvice(expiring);
  const dueDebts = expected
    .map((r) => ({ r, debt: debts[r.id] }))
    .filter(({ debt }) => debt && debt.amount > 0);
  const favsOf = (rid: string) => {
    const def = REGULARS.find((x) => x.id === rid);
    return def ? def.favorites.filter((id) => productById(id).unlock <= level) : [];
  };
  // GĐ149: quầy thịt cá — đưa hộp đen nhu cầu (meat.ts NO_BUTCHER_DEMAND/meatDemandFactor) ra con số
  // khách/tiền. Thuần đọc state có sẵn; hiện ở Sổ đầu ngày vì quyết định thuê/xếp người bán thịt cá
  // là việc NÊN làm TRƯỚC khi mở cửa. Chỉ hiện khi có quầy thịt cá và chưa đủ người bán 5★.
  const hasMeatCounter = furniture.some((f) => f.type === 'meat_counter');
  const butcherV = butcherValueToday(staff);
  const recentMeat = recentMeatRevenue(analytics, 7);
  const meatMissed = missedMeatRevenue(recentMeat.revenue, butcherV);
  // GĐ161 "kịch bản nấu theo giờ": khung 13–17h vắng là thời điểm bắt đầu mẻ nấu
  // cho giờ vàng tối. 1 dòng duy nhất khi có món nấu được và giờ đang 13–17h —
  // chọn món mẻ DÀI NHẤT vẫn kịp 17h (mốc bắt đầu muộn nhất còn đúng sự thật);
  // hòa duration thì lấy món lời nhất/phút trạm (GĐ145). Thuần đọc, không đổi state.
  const nowMinutes = useClock((c) => Math.floor(c.minutes));
  const eveningPrep = (() => {
    if (nowMinutes < 13 * 60 || nowMinutes >= 17 * 60) return null;
    const cSpeed = cookSpeed(useGame.getState);
    const bBoost = bartenderBoost(useGame.getState);
    const cands = RECIPES
      .filter((r) => !r.festival && level >= r.unlock
        && furniture.some((f) => f.type === r.station)
        && r.inputs.every((i) => (storage[i.productId] ?? 0) >= i.quantity))
      .map((r) => ({
        id: r.id,
        name: r.name,
        durationMin: Math.ceil(r.durationMin / (cSpeed * (r.station === 'drink_counter' ? bBoost : 1))),
        perMinute: kitchenValue(r).perMinute,
      }));
    return pickEveningPrep(cands, nowMinutes);
  })();
  return (
    <>
      <h2 style={styles.title}>☀️ {shopName} · Sổ đầu ngày {day} ({today.day}/{today.month}) · {weekdayOf(day)}</h2>
      <p style={styles.sub}>
        {WEATHER[weather].icon} Hôm nay {describeDay(weatherSeed, day, weather)} · mai {WEATHER[forecast[0]].icon} {describeDay(weatherSeed, day + 1, forecast[0])}.
        {(() => {
          // GĐ276: phản chiếu lịch tự động ở mức lập kế hoạch — mở sớm thì khẳng định, 8h thì nhắc chỉnh.
          const note = autoOpenNote(autoOpenAt, autoRoutine, cashierOpensMorning(staff));
          return note ? <div style={{ marginTop: 2 }}>{note}</div> : null;
        })()}{' '}
        Đọc xong nên nhập hàng bày kệ trước khi mở cửa — khách quen ghé đúng giờ quen.
        🏠 Tiền nhà trả cuối ngày: <b>{formatMoney(rentOf(shopTier))}</b>.
        {(() => {
          const tf = trafficForecast({ weather, tomorrow: forecast[0], level });
          return (
            <> Mai {WEATHER[forecast[0]].icon}: khách ghé ~{Math.round(tf.tomorrowTraffic * 100)}% mức thường (~{Math.round(tf.tomorrowKhach)} khách).
              {tf.verdict === 'hot' ? ' Trời đông, nên trữ thêm món bán chạy.' : tf.verdict === 'slow' ? ' Trời vắng — đừng chất thêm hàng kẻo tồn.' : ''}</>
          );
        })()}
      </p>
      {/* GĐ565: tin sáng đầy đủ — toast chỉ hiện 3 giây và gộp '+N tin' */}
      {lastSummary?.day === day - 1 && lastSummary.news?.length ? (
        <div style={{ ...styles.card, display: 'block', fontSize: 12, lineHeight: 1.6 }}>
          <b>📰 Tin sáng nay</b>
          {lastSummary.news.map((n, i) => <div key={i}>{n}</div>)}
        </div>
      ) : null}

      {/* GĐ198: Đọc con hẻm — tín hiệu 3D hẻm đang bật hôm nay (chợ phiên / sửa đường / lễ hội).
          Thuần đọc từng nguồn chân lý của bên dựng cảnh (gđ181/184/197), dạy "con hẻm đổi cảnh theo lịch". */}
      {(() => {
        const sigs = alleySignalsToday(weatherSeed ?? 0, day, level);
        const busy = sigs.filter((s) => s.active);
        return (
          <Callout tone={busy.length ? 'accent' : 'info'} style={{ marginBottom: 8 }}
            title={<>🌇 Con hẻm hôm nay{busy.length ? `: ${busy.map((s) => `${s.icon} ${s.name}`).join(' · ')}` : ''}</>}>
            <div style={{ marginTop: 4, display: 'grid', gap: 2 }}>
              {busy.length === 0
                ? <div style={{ fontSize: 12, opacity: 0.78 }}>Hẻm thường vắng — vài chậu cây trước hiên, đèn ấm lên lúc chập tối. Ngày có chợ phiên / lễ hội / sửa đường thì cảnh đổi liền theo.</div>
                : busy.map((s) => <div key={s.id} style={{ fontSize: 12 }}>{s.icon} <b>{s.name}</b>: {s.desc}</div>)}
            </div>
          </Callout>
        );
      })()}

      {/* GĐ199/GĐ202: Rốn kho chung + phiếu nạp kho (tách GĐ919 sang SupplyChainCard) */}
      <SupplyChainCard storage={storage} branch={branch ?? undefined} quanNuoc={biz.quanNuoc} quanNuocLast={biz.quanNuocLast ?? null} level={level} weather={weather} day={day} />

      {earlyUnlocks && (
        <div style={{ ...styles.card, display: 'block', marginBottom: 8, outline: '2px solid #f1c40f' }}>
          <b style={styles.cardTitle}>🧭 Sắp mở khóa</b>
          <div style={{ marginTop: 4, display: 'grid', gap: 2 }}>
            {earlyUnlocks.map((u) => (
              u.panel ? (
                <button key={u.id} onClick={() => openPanel(u.panel!())}
                  style={{ display: 'flex', gap: 8, alignItems: 'baseline', background: 'transparent', border: 'none', color: '#f1c40f', fontSize: 12, cursor: 'pointer', padding: 0, textAlign: 'left' }}>
                  <span style={{ minWidth: 150 }}>{u.icon} {u.name} →</span>
                  <span style={{ opacity: 0.8 }}>cấp {u.atLevel} · còn {u.xpAway.toLocaleString('vi-VN')} XP</span>
                </button>
              ) : (
                // Mốc tự vận hành (chương truyện) không có bảng mở nhanh — hiện chỉ đọc
                <div key={u.id} style={{ display: 'flex', gap: 8, alignItems: 'baseline', fontSize: 12 }}>
                  <span style={{ minWidth: 150 }}>{u.icon} {u.name}</span>
                  <span style={{ opacity: 0.8 }}>cấp {u.atLevel} · còn {u.xpAway.toLocaleString('vi-VN')} XP</span>
                </div>
              )
            ))}
          </div>
          <div style={{ fontSize: 11, opacity: 0.7, marginTop: 3 }}>Bán hàng & làm khách vui để lấy XP.</div>
        </div>
      )}

      {chophien && (
        <Callout tone="ok" title="🧺 Hôm nay chợ phiên đầu ngõ" style={{ marginBottom: 8 }}>
          <div style={{ marginTop: 4, display: 'grid', gap: 2 }}>
            {chophien.rows.map((r) => (
              <div key={r.id} style={{ display: 'flex', gap: 8, alignItems: 'baseline', fontSize: 12 }}>
                <span style={{ minWidth: 150 }}>{r.name}: {r.qty} món</span>
                <span style={{ opacity: 0.8 }}>~{formatMoney(r.est)} · {r.reason === 'cold' ? 'cần lạnh dư' : 'bán chậm'}</span>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 12, marginTop: 4 }}>
            Gánh ~{chophien.units} món dư ra bán, thu về ~<b>{formatMoney(chophien.total)}</b> thay vì để ế/hỏng.
          </div>
          <button onClick={() => sellMarketSurplus()}
            style={{ ...styles.btn, marginTop: 6, width: '100%', background: '#2ecc71' }}>
            🧺 Gánh bán ngay (+~{formatMoney(chophien.total)})
          </button>
          <div style={{ fontSize: 11, opacity: 0.7, marginTop: 3 }}>Chợ trả thấp hơn giá bán lẻ nhưng giải phóng hàng tồn — mỗi phiên một lần.</div>
        </Callout>
      )}

      {actions.length > 0 && (
        <div style={{ ...styles.card, display: 'block', marginBottom: 8, outline: '1px solid rgba(26,188,156,0.4)' }}>
          <b style={styles.cardTitle}>🗓️ Việc hôm nay · ưu tiên</b>
          <div style={{ marginTop: 4, display: 'grid', gap: 2 }}>
            {actions.map((a, i) => (
              <button key={i} onClick={() => openPanel({ type: a.panel as never })}
                style={{ display: 'flex', gap: 8, alignItems: 'baseline', background: 'transparent', border: 'none', color: a.danger ? '#e74c3c' : 'inherit', fontSize: 12, cursor: 'pointer', padding: 0, textAlign: 'left' }}>
                <span style={{ minWidth: 140 }}>{a.icon} {a.text} →</span>
                <span style={{ opacity: 0.8 }}>{a.danger ? 'bức thiết' : 'nên làm'}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      {nextEvt && <button onClick={() => openPanel({ type: 'calendar' })} title="Xem lịch năm" style={{ display: 'block', fontSize: 11, opacity: 0.7, margin: '-4px 0 8px', background: 'transparent', border: 'none', color: 'inherit', padding: 0, cursor: 'pointer', textAlign: 'left' }}>{nextEvt} →</button>}

      {sickest.length > 0 && (
        <Callout tone="danger" title="🔎 Kệ cần chú ý" style={{ marginBottom: 8 }}>
          <div style={{ marginTop: 4, display: 'grid', gap: 2 }}>
            {sickest.map((s, i) => (
              <button key={i} onClick={() => openPanel({ type: 'analytics' })}
                style={{ display: 'flex', gap: 8, alignItems: 'baseline', background: 'transparent', border: 'none', color: '#e74c3c', fontSize: 12, cursor: 'pointer', padding: 0, textAlign: 'left' }}>
                <span>{s.icon} {s.text} → sổ phân tích</span>
              </button>
            ))}
          </div>
        </Callout>
      )}

      {yesterCombos.length > 0 && (
        <Callout tone="accent" title="💡 Combo hôm qua kém hiệu quả" style={{ marginBottom: 8 }}>
          <div style={{ marginTop: 4, display: 'grid', gap: 2 }}>
            {yesterCombos.map(({ def, t, margin }) => (
              <button key={def.id} onClick={() => openPanel({ type: 'combos' })}
                style={{ display: 'flex', gap: 8, alignItems: 'baseline', background: 'transparent', border: 'none', color: '#f1c40f', fontSize: 12, cursor: 'pointer', padding: 0, textAlign: 'left' }}>
                <span>{def.icon} "{def.name}" hôm qua {t.count} lần · giảm {formatMoney(t.discount)} · <b>lãi cả cặp {formatMoney(margin)}</b> {margin < 0 ? '(lỗ)' : '(bán chậm)'} → xét xoay slot ở combo</span>
              </button>
            ))}
          </div>
        </Callout>
      )}

      {biz.loan && (
        <div style={{ ...styles.card, display: 'block', marginBottom: 8, outline: biz.loan.dueDay - day <= 3 ? '2px solid #e74c3c' : undefined }}>
          <b style={styles.cardTitle}>🏦 Đang nợ ngân hàng {formatMoney(biz.loan.principal)}</b>
          <div style={{ fontSize: 12, marginTop: 2 }}>
            Tối nay trừ lãi {formatMoney(Math.round(biz.loan.principal * LOAN_DAILY_RATE))} · hạn trả ngày {biz.loan.dueDay} (còn {Math.max(0, biz.loan.dueDay - day)} ngày)
            · trả gốc ở Kinh doanh → Vay &amp; hụi.
          </div>
        </div>
      )}

      {/* 🛒 Nhu cầu quầy (GĐ78) — tách GĐ920 sang CounterDemandCard */}
      <CounterDemandCard demand={demand} cleanStreak={cleanStreak} cleanBest={biz.cleanBest ?? 0} cleanExtra={cleanExtra} />

      {/* GĐ161: 1 dòng gợi ý duy nhất khi mở sổ trong khung vắng 13–17h — nấu kịp giờ vàng tối */}
      {eveningPrep && (
        <Callout tone="accent" style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 12 }}>
            🍳 Muốn kịp giờ vàng tối: bắt đầu nấu <b>{eveningPrep.name}</b> trước ~{formatClock(eveningPrep.startBy)}.
          </div>
        </Callout>
      )}

      {hasMeatCounter && butcherV.skill < MAX_BUTCHER_STAR && (
        <Callout tone={butcherV.present ? 'warn' : 'danger'} strong={!butcherV.present} style={{ marginBottom: 8 }}
          title={<>🔪 {butcherV.present
            ? `Người bán thịt cá ${butcherV.skill}★ trực hôm nay — bán được ~${butcherV.pct}% nhu cầu thịt cá`
            : 'Không có người bán thịt cá trực hôm nay — khách chỉ mua ~22% nhu cầu thịt cá'}</>}
          actions={
            <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button onClick={() => openPanel({ type: 'staff' })} style={{ ...styles.btn, fontSize: 11, padding: '2px 8px' }}>
                {butcherV.present ? '👥 Nâng/bồi dưỡng người bán thịt cá →' : '👥 Xếp người bán thịt cá →'}
              </button>
              <button onClick={() => openPanel({ type: 'analytics' })} style={{ ...styles.btn, fontSize: 11, padding: '2px 8px' }}>
                📊 Xem sổ thịt cá →
              </button>
            </div>
          }>
          <div style={{ fontSize: 12, marginTop: 2 }}>
            {butcherV.present
              ? `Hệ số cầu ${butcherV.factor.toFixed(2).replace('.', ',')} so với mốc ${butcherV.maxFactor.toFixed(2).replace('.', ',')} (người bán 5★).`
              : 'Quầy thịt cá (650k) đang hầu như đứng im — người bán thịt cá làm tăng gấp ~4,6 lần nhu cầu ban đầu.'}
          </div>
          {recentMeat.revenue > 0 && meatMissed > 0 && (
            <div style={{ fontSize: 12, marginTop: 2, color: '#f1c40f' }}>
              💸 Gần đây thịt cá thu ~{formatMoney(recentMeat.revenue)}/ngày{butcherV.present
                ? ` — lên 5★ thêm ~${formatMoney(meatMissed)}/ngày`
                : ` — thuê người bán 5★ có thể thêm ~${formatMoney(meatMissed)}/ngày`}
            </div>
          )}
        </Callout>
      )}

      {biz.hui && (
        <div style={{ ...styles.card, display: 'block', marginBottom: 8 }}>
          <b style={styles.cardTitle}>🤝 Đang góp hụi {formatMoney(biz.hui.daily)}/ngày</b>
          <div style={{ fontSize: 12, marginTop: 2 }}>
            Đã góp {biz.hui.paidDays}/{biz.hui.members} ngày{!biz.hui.received && ` · ngày ${biz.hui.turnDay} tới lượt hốt ${formatMoney(biz.hui.daily * biz.hui.members)}`}.
          </div>
        </div>
      )}

      {(biz.loan || biz.hui) && (() => {
        const sol = solvency({ money, storage, priceOf, loan: biz.loan, hui: biz.hui, day });
        return (
          <Callout tone={sol.cover ? 'ok' : 'danger'} style={{ marginBottom: 8 }} title={`🪙 Cân đối: tiền + bán hết kho = ${formatMoney(sol.liquid)} (nợ gốc ${formatMoney(sol.liabilities)})`}>
            <div style={{ marginTop: 2, fontSize: 12 }}>
              {sol.cover
                ? `Bán hết kho cộng tiền mặt đủ trả gốc vay, còn thừa ${formatMoney(sol.margin)}.`
                : `Còn thiếu ${formatMoney(-sol.margin)} để trả gốc vay nếu hôm nay không bán thêm — kíp bơm doanh thu hoặc xả sỉ/gánh chợ.`}
              {' '}Mỗi tối cần gom ngoài quầy: lãi vay {formatMoney(sol.loanInterestToday)}
              {sol.huiDueToday > 0 && ` + góp hụi ${formatMoney(sol.huiDueToday)}`}
              {sol.daysToLoanDue != null && ` · hạn trả gốc còn ${sol.daysToLoanDue} ngày`}.
            </div>
          </Callout>
        );
      })()}

      {biz.loan && (() => {
        const lb = loanBurden(biz.loan.principal, stats?.revenue ?? 0);
        return (
          <Callout tone={lb.pctOfRevenue != null && lb.pctOfRevenue > 10 ? 'warn' : 'accent'} style={{ marginBottom: 8 }} title={`🏦 Lãi vay ngốn ${formatMoney(lb.interest)}/ngày${lb.pctOfRevenue != null ? ` = ${lb.pctOfRevenue.toFixed(0)}% doanh thu hôm nay` : ''}`}>
            <div style={{ marginTop: 2, fontSize: 12 }}>
              Mỗi 1.000.000đ trả bớt gốc tiết kiệm ~{formatMoney(lb.interestSavedPerMillion)} lãi mỗi ngày —
              {lb.pctOfRevenue != null && lb.pctOfRevenue > 10
                ? ' đang nặng (lãi ăn trên 10% dòng tiền): trả bớt càng sớm càng nhẹ.'
                : ' đang nhẹ so với dòng tiền hôm nay.'}
            </div>
          </Callout>
        );
      })()}

      {(() => {
        const db = dailyBurn(
          staff,
          branch?.staff ?? [],
          shopTier,
          biz.loan,
          biz.hui,
          recentAvgRevenue(history, 7),
        );
        const tone = db.avgRevenue > 0 && db.burnShare != null && db.burnShare > 0.8 ? 'warn' : 'accent';
        return (
          <Callout tone={tone} style={{ marginBottom: 8 }} title={`🔥 Chi phí cố định/ngày: ${formatMoney(db.total)}${db.burnShare != null ? ` = ${Math.round(db.burnShare * 100)}% doanh thu bình quân` : ''}`}>
            <div style={{ marginTop: 2, fontSize: 12 }}>
              Lương {formatMoney(db.wages)} · thuê {formatMoney(db.rent)} · lãi vay {formatMoney(db.loanInterest)} · góp hụi {formatMoney(db.huiDue)}.
              {db.burnShare == null && ` Chưa có doanh thu bình quân để so — mở vài ngày rồi xem lại.`}
              {db.burnShare != null && (db.covered
                ? ` Doanh thu bình quân ${formatMoney(db.avgRevenue)} còn thừa ${formatMoney(db.margin)} sau chi phí cố định.`
                : ` Doanh thu bình quân ${formatMoney(db.avgRevenue)} thiếu ${formatMoney(-db.margin)} để trùm chi phí cố định — tăng doanh thu hoặc cắt bớt lương/nợ.`)}
            </div>
          </Callout>
        );
      })()}

      {biz.quanNuoc.open && (
        <Callout tone={biz.quanNuocLast && biz.quanNuocLast.served < biz.quanNuocLast.wanted ? 'warn' : 'ok'} style={{ marginBottom: 8 }} title="🧋 Quán nước">
          {biz.quanNuocLast ? (
            <>
              <div style={{ fontSize: 12, marginTop: 2 }}>
                Hôm qua: {biz.quanNuocLast.served}/{biz.quanNuocLast.wanted} ly · {formatMoney(biz.quanNuocLast.revenue)}
              </div>
              {quanHealth?.shortYesterday && quanHealth.missedRevenue > 0 && (
                <div style={{ fontSize: 12, marginTop: 2, color: '#e67e22' }}>💸 Hôm qua bỏ lỡ ~{formatMoney(quanHealth.missedRevenue)} vì kho thiếu — nhập nước/ngọt/cà phê để bán đủ.</div>
              )}
            </>
          ) : (
            <div style={{ fontSize: 12, marginTop: 2 }}>Mới mở — kết quả có sau đêm đầu.</div>
          )}
          <div style={{ fontSize: 12, marginTop: 2 }}>
            Hôm nay: {biz.quanNuoc.staff} nhân viên · giá {QUAN_PRICE_OPTIONS[biz.quanNuoc.price].label} · lương {formatMoney(biz.quanNuoc.staff * QUAN_NUOC_WAGE)}/ngày
          </div>
          {quanHealth && !quanHealth.driesMain && quanHealth.hire && quanHealth.hireMarginal !== null && (
            <div style={{ fontSize: 12, marginTop: 2, color: quanHealth.hireMarginal >= 0 ? '#2ecc71' : '#e67e22' }}>
              {quanHealth.hireMarginal >= 0
                ? `💰 Tuyển 1 người: lời ròng ~${formatMoney(quanHealth.hire.profit)} (đang ~${formatMoney(quanHealth.tonight.profit)}, +${formatMoney(quanHealth.hireMarginal)}/ngày) — đáng so với lương ${formatMoney(QUAN_NUOC_WAGE)}.`
                : `💰 Tuyển thêm 1 người chưa đáng: bán thêm ${formatMoney(quanHealth.hire.served - quanHealth.tonight.served)} ly nhưng lương ${formatMoney(QUAN_NUOC_WAGE)}/ngày cao hơn lời tăng (lời ròng ~${formatMoney(quanHealth.hire.profit)} vs ~${formatMoney(quanHealth.tonight.profit)}).`}
            </div>
          )}
          {quanHealth?.driesMain && (
            <div style={{ fontSize: 12, marginTop: 2, color: '#e74c3c' }}>
              🥤 Kho chỉ còn {quanHealth.drinkUnitsNow} ly đồ uống (quán tiêu {quanHealth.consumedYesterday} ly hôm qua) — tối nay ăn hết là kệ tiệm chính cạn nước. Nhập nước/ngọt/cà phê.
            </div>
          )}
        </Callout>
      )}

      {biz.tiemXoi?.open && (() => {
        const last = biz.tiemXoiLast;
        const m = tiemXoiMorning(biz.tiemXoi, last);
        return (
          <Callout tone={m.net !== null && m.net < 0 ? 'warn' : 'ok'} style={{ marginBottom: 8 }} title="🍚 Tiệm xôi">
            <div style={{ fontSize: 12, marginTop: 2 }}>
              {last
                ? <>Hôm qua nấu {last.total} phần · rẻ hơn nhập lẻ {formatMoney(last.saved)} − lương {formatMoney(last.wages)} = <b style={{ color: m.net! >= 0 ? '#2ecc71' : '#e74c3c' }}>{formatMoney(m.net!)}</b></>
                : 'Mới mở — kết quả có sau đêm đầu.'}
            </div>
            {m.idle && <div style={{ fontSize: 12, marginTop: 2, color: '#e67e22' }}>👷 Kho xôi đã đủ, thợ còn dư sức — cho nghỉ bớt một người đỡ lương {formatMoney(TIEM_XOI_WAGE)}/ngày.</div>}
          </Callout>
        );
      })()}

      {branchChores.length > 0 && (
        <Callout tone="warn" title="🏪 Tiện lợi 24/7: việc hôm nay" style={{ marginBottom: 8 }}>
          {branchChores.map((c, i) => (
            <button key={i} onClick={() => openPanel({ type: 'branch' })}
              style={{ display: 'block', width: '100%', textAlign: 'left', background: 'transparent', border: 'none', color: c.danger ? '#e74c3c' : '#f1c40f', fontSize: 12, marginTop: 2, cursor: 'pointer', padding: 0 }}>
              {c.icon} {c.text}
            </button>
          ))}
        </Callout>
      )}

      {hiepLucEligible(branch, biz.quanNuoc, level) && (
        <Callout tone="event" title="🤝 Đối tác chi nhánh × quán nước" style={{ marginBottom: 8 }}>
          {biz.hiepLuc?.active && biz.hiepLuc.m === monthOf(day) ? (
            <div style={{ fontSize: 12, marginTop: 2 }}>
              Đang hiệp lực tháng này: gom {formatMoney(biz.hiepLucMonth ?? 0)}/{formatMoney(HIEPLUC_MIN)} doanh thu chung{biz.hiepLucStreak ? ` · chuỗi ${biz.hiepLucStreak} tháng` : ''}. Cuối tháng đủ ngưỡng được thưởng (cọc {formatMoney(HIEPLUC_COC)} hoàn lại).
            </div>
          ) : (
            <div style={{ fontSize: 12, marginTop: 2 }}>
              Cả 2 cơ sở đang mở — lập đối tác để gom doanh thu chung mỗi tháng, đủ {formatMoney(HIEPLUC_MIN)} được thưởng + chuỗi tháng.
              <button onClick={signHiepLuc} style={{ display: 'block', marginTop: 4, ...styles.btn }}>
                🤝 Lập đối tác (cọc {formatMoney(HIEPLUC_COC)}, hoàn cuối tháng)
              </button>
            </div>
          )}
        </Callout>
      )}

      {seasonEvent(day) && (() => {
        const ev = seasonEvent(day)!;
        const obj = seasonObjective(weatherSeed ?? 0, day);
        const stars = biz.seasonEvt?.season === ev.season ? (biz.seasonEvt?.stars ?? 0) : 0;
        const claimedToday = biz.seasonEvt?.claimedDay === ev.dayIndex;
        const name = seasonEventName(ev.season);
        return (
          <Callout tone="ok" title={`🌟 ${name} · ngày ${ev.dayIndex + 1}/${SEASON_EVENT_DAYS}`} style={{ marginBottom: 8 }}>
            {obj && (
              <div style={{ fontSize: 12, marginTop: 2 }}>
                {obj.icon} Mục tiêu hôm nay: <b>{obj.title}</b> ({obj.detail})
                {claimedToday ? ' ✓ xong' : ' — làm để +1 sao'}
              </div>
            )}
            <div style={{ fontSize: 12, marginTop: 2, opacity: 0.85 }}>⭐ {stars} sao mùa · mỗi mục tiêu thưởng {formatMoney(SEASON_REWARD_PER_STAR)}</div>
          </Callout>
        );
      })()}

      {effects.festival && (
        <div style={{ ...styles.card, display: 'block', marginBottom: 8, outline: '2px solid #f1c40f' }}>
          <b style={styles.cardTitle}>{effects.festival.icon} {effects.festival.name} đang diễn ra</b>
          <div style={{ fontSize: 12, marginTop: 2 }}>
            👥 khách {pct(effects.festival.traffic)}{effects.festival.cost !== 1 && ` · 💰 giá nhập ${pct(effects.festival.cost)}`}
            {effects.festival.tolerance && ' · 😤 khách chịu giá cao'}
          </div>
          {festivalStock(effects.festival, level).length > 0 && (
            <div style={{ fontSize: 12, marginTop: 2 }}>
              Hàng nên bày sẵn: {festivalStock(effects.festival, level).map((id) => `${productById(id).name}${haveStock(id) ? ' ✓' : ' ⚠️ kho không có'}`).join(', ')}
            </div>
          )}
          {fv && fvDelta && (
            <div style={{ fontSize: 12, marginTop: 2 }}>
              🎉 ước thêm {fvDelta}
            </div>
          )}
        </div>
      )}
      {effects.hot.length > 0 && (
        <div style={{ ...styles.card, display: 'block', marginBottom: 8 }}>
          <b style={styles.cardTitle}>🎯 Hàng của dịp hôm nay</b>
          <div style={{ fontSize: 12, marginTop: 2 }}>{effects.hot.map((id) => `${productById(id).name}${haveStock(id) ? ' ✓' : ' ⚠️ chưa có'}`).join(', ')}</div>
        </div>
      )}
      {hot.length > 0 && (
        <div style={{ ...styles.card, display: 'block', marginBottom: 8 }}>
          <b style={styles.cardTitle}>🔥 Hàng hot tuần này</b>
          <div style={{ fontSize: 12, marginTop: 2 }}>{hot.map((id) => `${productById(id).name}${haveStock(id) ? ' ✓' : ' ⚠️ chưa có'}`).join(', ')}</div>
        </div>
      )}
      {soon && (
        <div style={{ ...styles.card, display: 'block', marginBottom: 8 }}>
          <b style={styles.cardTitle}>⏳ {soon.festival.icon} {soon.festival.name} {soon.inDays === 1 ? 'ngày mai' : `sau ${soon.inDays} ngày`}</b>
          <div style={{ fontSize: 12, marginTop: 2 }}>
            🎊 Đón lễ: trữ sẵn{' '}
            {prepItems(soon.festival, level).map((id, i) => (
              <span key={id}>
                {i > 0 && ', '}
                {productById(id).name}
                {(storage[id] ?? 0) >= PREP_MIN_QTY
                  ? <b style={{ color: '#2ecc71' }}> ✓</b>
                  : <b style={{ color: '#f1c40f' }}> ⚠️ còn {Math.max(0, PREP_MIN_QTY - (storage[id] ?? 0))} thiếu</b>}
              </span>
            ))}
            <span style={{ opacity: 0.7 }}> · đủ trước {soon.inDays === 1 ? 'ngày mai' : 'lễ'} → <b style={{ color: '#2ecc71' }}>+{formatMoney(prepBonus(soon.festival, level))}</b> đón lễ</span>
          </div>
          {fv && (
            <div style={{ fontSize: 12, marginTop: 2 }}>
              <b>Còn {fv.inDays} ngày:</b> khách ×{fmtMul(fv.traffic)} ({fvDelta})
              {fv.cost > 1 && <> · giá nhập +{Math.round((fv.cost - 1) * 100)}% (bán đắt vẫn đông)</>}
            </div>
          )}
        </div>
      )}

      <h3 style={{ margin: '10px 0 4px', fontSize: 14 }}>💛 Khách quen dự kiến ghé hôm nay ({expected.length})</h3>
      {expected.length === 0 && <p style={styles.sub}>Không ai trong nhóm khách quen có lịch ghé hôm nay.</p>}
      <div style={{ display: 'grid', gap: 6, maxWidth: 560 }}>
        {expected.map((r) => {
          const prog = regulars[r.id];
          const res = reservations[r.id];
          const favs = favsOf(r.id);
          return (
            <div key={r.id} style={{ ...styles.card, display: 'block' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <b><Swatch color={r.color} /> {r.name}</b>
                <span style={{ fontSize: 12, opacity: 0.7 }}>{formatClock(r.visitFrom)}–{formatClock(r.visitUntil)}{res ? ' · 🤝 đang giữ món hẹn' : ''}</span>
              </div>
              <div style={{ fontSize: 12, marginTop: 2 }}>
                Món thích: {favs.length
                  ? favs.map((id) => `${prog?.discovered.includes(id) || res?.productId === id ? productById(id).name : '???'}${haveStock(id) ? ' ✓' : ' ⚠️'}`).join(', ')
                  : 'chưa biết'}
              </div>
            </div>
          );
        })}
      </div>

      {dueDebts.length > 0 && (
        <>
          <h3 style={{ margin: '10px 0 4px', fontSize: 14 }}>📒 Nợ của khách quen ghé hôm nay</h3>
          <div style={{ display: 'grid', gap: 6, maxWidth: 560 }}>
            {dueDebts.map(({ r, debt }) => debt && (
              <div key={r.id} style={{ ...styles.card }}>
                <span style={{ flex: 1, fontSize: 13 }}>
                  <b>{r.name}</b> nợ <b>{formatMoney(debt.amount)}</b> từ ngày {debt.since}
                  {day - debt.since >= DEBT_LATE_DAYS && <span style={{ color: '#ff7675' }}> · quá {DEBT_LATE_DAYS} ngày, mất hẳn sau ngày {debt.since + DEBT_WRITE_OFF_DAYS}</span>}
                  {debt.reminded && ' · đã nhắc, lần này chắc trả'}
                </span>
                {!debt.reminded && <button style={styles.btn} onClick={() => useGame.getState().remindDebt(r.id)}>Nhắc nợ</button>}
              </div>
            ))}
          </div>
        </>
      )}

      {expiring.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <AdviceCard title={`🥀 Hàng sắp hỏng (${expiring.reduce((n, l) => n + l.qty, 0)} món)`} items={expiryTips} onAct={(a) => a.action && openPanel({ type: a.action })} />
        </div>
      )}

      {resList.length > 0 && (
        <>
          <h3 style={{ margin: '10px 0 4px', fontSize: 14 }}>🤝 Lời hẹn giữ món hôm nay</h3>
          <div style={{ display: 'grid', gap: 6, maxWidth: 560 }}>
            {resList.map(([rid, r]) => (
              <div key={rid} style={{ ...styles.card }}>
                <span style={{ flex: 1, fontSize: 13 }}>
                  Giữ <b>{r.qty} {productById(r.productId).name}</b> cho {regularById(rid)?.name}
                  {haveStock(r.productId) ? ' — kho/kệ đủ ✓' : ' — ⚠️ chưa có hàng, nhập hoặc bày ngay'}
                </span>
                <button style={styles.btn} onClick={() => useGame.getState().cancelReservation(rid)}>Huỷ hẹn</button>
              </div>
            ))}
          </div>
        </>
      )}

      {dueContracts.length > 0 && (
        <>
          <h3 style={{ margin: '10px 0 4px', fontSize: 14 }}>🚚 Hợp đồng tới kỳ giao</h3>
          <div style={{ display: 'grid', gap: 6, maxWidth: 560 }}>
            {dueContracts.map(({ cs, def }) => def && (
              <div key={cs.defId} style={{ ...styles.card }}>
                <span style={{ flex: 1, fontSize: 13 }}>
                  <b>{def.title}</b>
                  {cs.dueDay === day
                    ? <span style={{ color: '#f1c40f', fontWeight: 600 }}> · HẠN HÔM NAY</span>
                    : cs.dueDay < day
                      ? <span style={{ color: '#e74c3c', fontWeight: 600 }}> · QUÁ HẠN (hạn ngày {cs.dueDay})</span>
                      : <span> · hạn ngày mai ({cs.dueDay})</span>}
                  {cs.committed ? (() => {
                    const lm = reservedMissing(def, cs.locked);
                    return lm.length
                      ? <span style={{ color: '#ff7675' }}> 🤝 cam kết — ⚠️ ngăn thiếu {lm.map((m) => `${m.need} ${productById(m.id).name}`).join(', ')}</span>
                      : <span style={{ color: '#2ecc71', marginLeft: 6 }}>🤝 đã cam kết — hàng trữ riêng sẵn sàng ✓</span>;
                  })() : (() => {
                    const missing = missingForContract(def, storage);
                    return missing.length
                      ? <span style={{ color: '#ff7675' }}> · thiếu: {missing.map((m) => `${m.need} ${productById(m.id).name}`).join(', ')}</span>
                      : <span style={{ color: '#f1c40f' }}> · kho đủ · nên 🤝 Cam kết để giao được thêm {formatMoney(commitBonusValue(def))} tin cậy</span>;
                  })()}
                </span>
                <button style={styles.btn} onClick={() => openPanel({ type: 'contracts' })}>Xem</button>
              {(() => {
                const p = contractStreakProgress(cs, day);
                const riskColor = p.risk === 'overdue' ? '#e74c3c' : '#f1c40f';
                return (
                  <div style={{ fontSize: 12, marginTop: 4, width: '100%' }}>
                    {p.streak > 0 && (
                      <span style={{ color: '#3498db' }}>🎯 Chuỗi {p.streak} · còn {p.toMilestone} kỳ nữa tới mốc +{Math.round(CONTRACT_STREAK_BONUS * 100)}% </span>
                    )}
                    {p.risk === 'overdue' && p.streak > 0 && (
                      <span style={{ color: riskColor, fontWeight: 600 }}>⚠️ Giao sẽ đứt chuỗi {p.streak} kỳ về 0</span>
                    )}
                    {p.risk === 'overdue' && p.streak === 0 && (
                      <span style={{ color: riskColor, fontWeight: 600 }}>⚠️ Đã quá hạn — giao sẽ tính muộn</span>
                    )}
                    {p.risk === 'due_soon' && p.streak > 0 && (
                      <span style={{ color: riskColor }}>⏳ Còn {p.daysLeft} ngày nữa — giao đúng hẹn để giữ chuỗi {p.streak}</span>
                    )}
                  </div>
                );
              })()}
            </div>
            ))}
          </div>
        </>
      )}

      <h3 style={{ margin: '10px 0 4px', fontSize: 14 }}>📞 Điện thoại</h3>
      <p style={styles.sub}>
        {courier
          ? `Hôm nay có ${PHONE_SLOTS.length} khe giờ hàng xóm gọi điện đặt hàng: ${PHONE_SLOTS.map((m) => formatClock(m)).join(', ')}. Nghe máy kịp mới có đơn.`
          : `Chưa thuê 🛵 Giao hàng nên không có cuộc gọi nào. Thuê nhân viên giao hàng để mở đơn điện thoại (khe giờ: ${PHONE_SLOTS.map((m) => formatClock(m)).join(', ')}).`}
      </p>
      <Footer onClose={() => { resetComboDay(); resetStaffDay(); closePanel(); }}>
        <button style={styles.btn} onClick={() => openPanel({ type: 'order' })}>📦 Nhập hàng</button>
        <button style={styles.btn} onClick={() => openPanel({ type: 'storage' })}>🏭 Kho</button>
      </Footer>
    </>
  );
}
