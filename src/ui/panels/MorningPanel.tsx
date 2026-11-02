import { cungGoodsAction, nextEventLine, sapEventActions, tiemXoiCungAction } from '../../data/dayEventActions';
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
import { regularsExpectedToday, birthdaysToday, birthdayHint, birthdayEve, REGULARS } from '../../data/regulars';
import { LOAN_DAILY_RATE, loyaltyPayoff } from '../../data/biz';
import { happyPayoff } from '../../data/rhythm';
import { QUAN_NUOC_UNLOCK, QUAN_NUOC_WAGE, QUAN_PRICE_OPTIONS, isQuanMatchDay } from '../../data/quanNuoc';
import { quanNuocDayAction, quanNuocHealth } from '../../data/quanNuocInsights';
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
import { hiepLucEligible } from '../../data/hiepLuc';
import { earlyUnlockTeaser } from '../../data/unlockMap';
import { marketClearValue, marketDayAction } from '../../data/chophien';
import { fairMerchantAction } from '../../data/fairmerchant';
import { SupplyChainCard } from './SupplyChainCard';
import { AlleyTodayCard, SeasonEventCard } from './MorningEventCards';
import { DueDebtsCard, ReservationsCard } from './MorningRegularCards';
import { DueContractsCard } from './DueContractsCard';
import { HotGoodsCards } from './HotGoodsCards';
import { CounterDemandCard } from './CounterDemandCard';
import { MarketSurplusCard } from './MarketSurplusCard';
import { EarlyUnlocksCard } from './EarlyUnlocksCard';
import { seasonEvent, seasonObjective, seasonEventName } from '../../data/seasonEvent';
import { planDay, type DayAction } from '../../data/dayPlan';
import { demandForecast } from '../../data/counterDemand';
import { hasSkill } from '../../data/titles';
import { cleanBonus, CLEAN_TIERS, nextCleanTier } from '../../data/cleanOps';
import { monthOf } from '../../data/calendar';
import { trending } from '../../data/suppliers';
import { describeDay, WEATHER } from '../../data/weather';
import { trafficForecast } from '../../data/trafficForecast';
import { tomorrowTeaser } from '../../data/tomorrowTeaser';
import { supplyContractById } from '../../data/contracts';
import { leakTone, riskLiveToday } from '../../data/risk';
import { nightPnl, nightPayback, nightPaybackLabel } from '../../data/nightReport';
import { PHONE_SLOTS } from '../../data/phoneOrders';
import { paymentById, type PaymentMethod } from '../../data/payments';
import { solvency } from '../../data/solvency';
import { loanBurden } from '../../data/loanBurden';
import { dailyBurn } from '../../data/dailyBurn';
import { recentAvgRevenue } from '../../data/minorPayoff';
import { AdviceCard, HourChart, ItemTable, HistoryChart } from './HistoryPanel';
import { QuanNuocCard } from './QuanNuocCard';
import { TiemXoiCard } from './TiemXoiCard';
import { SickShelvesCard, YesterCombosCard } from './MorningWarnCards';
import { SolvencyCard, LoanBurdenCard, DailyBurnCard } from './MorningFinanceCards';
import { ButcherCard, HuiCard } from './MorningMeatHuiCards';
import { BranchChoresCard, HiepLucCard } from './MorningBranchCards';
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

      <AlleyTodayCard weatherSeed={weatherSeed} day={day} level={level} />

      {/* GĐ199/GĐ202: Rốn kho chung + phiếu nạp kho (tách GĐ919 sang SupplyChainCard) */}
      <SupplyChainCard storage={storage} branch={branch ?? undefined} quanNuoc={biz.quanNuoc} quanNuocLast={biz.quanNuocLast ?? null} level={level} weather={weather} day={day} />

      {earlyUnlocks && <EarlyUnlocksCard earlyUnlocks={earlyUnlocks} />}

      {chophien && <MarketSurplusCard chophien={chophien} />}

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

      {sickest.length > 0 && <SickShelvesCard sickest={sickest} />}

      {yesterCombos.length > 0 && <YesterCombosCard yesterCombos={yesterCombos} />}

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

      {hasMeatCounter && butcherV.skill < MAX_BUTCHER_STAR && <ButcherCard butcherV={butcherV} recentMeat={recentMeat} meatMissed={meatMissed} />}

      {biz.hui && <HuiCard hui={biz.hui} />}

      {(biz.loan || biz.hui) && <SolvencyCard sol={solvency({ money, storage, priceOf, loan: biz.loan, hui: biz.hui, day })} />}

      {biz.loan && <LoanBurdenCard lb={loanBurden(biz.loan.principal, stats?.revenue ?? 0)} />}

      <DailyBurnCard db={dailyBurn(staff, branch?.staff ?? [], shopTier, biz.loan, biz.hui, recentAvgRevenue(history, 7))} />

      {biz.quanNuoc.open && <QuanNuocCard quanNuoc={biz.quanNuoc} quanNuocLast={biz.quanNuocLast ?? null} quanHealth={quanHealth} />}

      {biz.tiemXoi?.open && <TiemXoiCard tiemXoi={biz.tiemXoi} last={biz.tiemXoiLast} />}

      {branchChores.length > 0 && <BranchChoresCard branchChores={branchChores} />}

      {hiepLucEligible(branch, biz.quanNuoc, level) && <HiepLucCard biz={biz} day={day} />}

      {seasonEvent(day) && <SeasonEventCard day={day} weatherSeed={weatherSeed} biz={biz} />}

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
      <HotGoodsCards eventHot={effects.hot} weekHot={hot} haveStock={haveStock} />
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

      {dueDebts.length > 0 && <DueDebtsCard dueDebts={dueDebts} day={day} />}

      {expiring.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <AdviceCard title={`🥀 Hàng sắp hỏng (${expiring.reduce((n, l) => n + l.qty, 0)} món)`} items={expiryTips} onAct={(a) => a.action && openPanel({ type: a.action })} />
        </div>
      )}

      {resList.length > 0 && <ReservationsCard resList={resList} haveStock={haveStock} />}

      {dueContracts.length > 0 && <DueContractsCard dueContracts={dueContracts} day={day} storage={storage} />}

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
