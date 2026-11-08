import { nextEventLine } from '../../data/dayEventActions';
import { useGame, useClock, formatClock } from '../../core/store';
import { rentOf } from '../../data/shopTiers';
import { cookSpeed, bartenderBoost } from '../../core/slices/orders';
import { formatMoney, productById } from '../../data/products';
import { reputationOf } from '../../data/reputation';
import { butcherValueToday, MAX_BUTCHER_STAR, missedMeatRevenue, recentMeatRevenue } from '../../data/butcherValue';
import { regularsExpectedToday, REGULARS } from '../../data/regulars';
import { QUAN_NUOC_UNLOCK, QUAN_NUOC_WAGE } from '../../data/quanNuoc';
import { TIEM_XOI_WAGE } from '../../data/tiemXoi';
import { quanNuocHealth } from '../../data/quanNuocInsights';
import { expiringSoon, expiryAdvice } from '../../data/advice';
import { dateOfDoy, dayEffects, dayOfYear, upcomingFestival, weekdayOf } from '../../data/calendar';
import { Footer, IS_MOBILE, styles } from './shared';
import { festivalValue } from '../../data/festivalValue';
import { itemHealthList, shelfAttention, shelfCount } from '../../data/analytics';
import { comboDaySnapshot, resetComboDay } from '../../core/slices/comboDay';
import { resetStaffDay } from '../../core/slices/staffDay';
import { autoOpenNote, cashierOpensMorning } from '../../core/routine';
import { branchMorningPlan } from '../../data/branchMorning';
import { storageUsed } from '../../core/gameTypes';
import { hiepLucEligible } from '../../data/hiepLuc';
import { earlyUnlockTeaser } from '../../data/unlockMap';
import { marketClearValue } from '../../data/chophien';
import { SupplyChainCard } from './SupplyChainCard';
import { AlleyTodayCard, SeasonEventCard } from './MorningEventCards';
import { DueDebtsCard, ReservationsCard } from './MorningRegularCards';
import { DueContractsCard } from './DueContractsCard';
import { HotGoodsCards } from './HotGoodsCards';
import { LoanNoteCard, EveningPrepCallout, MorningNewsCard } from './MorningNotes';
import { ExpectedRegularsList } from './ExpectedRegularsList';
import { phoneWeatherInfo } from '../../data/phoneWeatherPayoff';
import { regularChurn } from '../../data/regularChurn';
import { regularSpendEstimate, nextPerkValue, weeklyTop, referValue, nextPerkTimeline, regularCohortSummary, regularCohortLine } from '../../data/regularValue';
import { TodayActionsCard } from './TodayActionsCard';
import { MorningSubtitle } from './MorningSubtitle';
import { eveningPrepFor, weakYesterdayCombos } from './morningCalc';
import { buildMorningActions } from './morningActions';
import { FestivalNowCard, FestivalSoonCard } from './FestivalCards';
import { CounterDemandCard } from './CounterDemandCard';
import { MarketSurplusCard } from './MarketSurplusCard';
import { EarlyUnlocksCard } from './EarlyUnlocksCard';
import { seasonEvent } from '../../data/seasonEvent';
import { demandForecast } from '../../data/counterDemand';
import { hasSkill } from '../../data/titles';
import { cleanBonus, CLEAN_TIERS, nextCleanTier } from '../../data/cleanOps';
import { trending } from '../../data/suppliers';
import { supplyContractById } from '../../data/contracts';
import { PHONE_SLOTS } from '../../data/phoneOrders';
import { solvency } from '../../data/solvency';
import { loanBurden } from '../../data/loanBurden';
import { dailyBurn } from '../../data/dailyBurn';
import { recentAvgRevenue } from '../../data/minorPayoff';
import { AdviceCard } from './HistoryPanel';
import { QuanNuocCard } from './QuanNuocCard';
import { TiemXoiCard } from './TiemXoiCard';
import { SickShelvesCard, YesterCombosCard } from './MorningWarnCards';
import { SolvencyCard, LoanBurdenCard, DailyBurnCard } from './MorningFinanceCards';
import { ButcherCard, HuiCard } from './MorningMeatHuiCards';
import { BranchChoresCard, HiepLucCard } from './MorningBranchCards';




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
  const yesterCombos = weakYesterdayCombos(comboDaySnapshot(), activeCombos ?? [], priceOf);
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
  // GĐ1285 — khách quen nào đang bị phụ món ưa (missLog của ngày + lời chê gần) → cảnh báo giữ chân
  const reviews = useGame((s) => s.reviews);
  const regularChurnData = regularChurn({ missLog: stats?.missLog, reviews });
  // GĐ1289 — ước tính tiền mỗi lần ghé (giỏ + boa) của từng khách quen, để định lượng "mất bao nhiêu" khi bị phụ
  const regularValueOf = (rid: string) => {
    const def = REGULARS.find((x) => x.id === rid);
    return def ? regularSpendEstimate({ def, level, priceOf, progress: regulars[rid] ?? undefined }) : null;
  };
  // GĐ1293 — mốc perk kế tiếp tăng bao nhiêu (đ)/lần ghé nếu nâng thân thiết; gợi chăm đúng người đáng
  const nextPerkValueOf = (rid: string) => {
    const def = REGULARS.find((x) => x.id === rid);
    return def ? nextPerkValue({ def, level, priceOf, progress: regulars[rid] ?? undefined }) : null;
  };
  // GĐ1301 — mốc perk kế tiếp còn bao lâu (tuần): +2 thân thiết/lần ghé mua món ưa × tần suất
  const nextPerkTimelineOf = (rid: string) => {
    const def = REGULARS.find((x) => x.id === rid);
    return def ? nextPerkTimeline({ def, level, priceOf, progress: regulars[rid] ?? undefined }) : null;
  };
  // GĐ1295 — ai là khách vàng THẬT theo tuần: giỏ+boa/lần (GĐ1289) × tần suất ghé (visitsToday) → đóng góp/tuần
  const weeklyTopData = weeklyTop({
    regulars: REGULARS, level, priceOf,
    progressOf: (rid) => regulars[rid] ?? undefined, topN: 3,
  });
  const rep = reputationOf(repLog);
  const effects = dayEffects(weatherSeed, day, level);
  const soon = upcomingFestival(day);
  // GĐ245: soi dịp lễ ra khách/tiền — trên nền trữ hàng (GĐ70), định lượng hệ số khách và chi phí
  // nhập ra con số: khách thêm/ngày × giỏ bình quân 7 ngày. Hiện ở CẢ thẻ lễ ĐANG diễn ra lẫn SẮP tới.
  const last7 = history.slice(-7);
  const avgCust7 = last7.length ? last7.reduce((a, h) => a + h.customers, 0) / last7.length : 0;
  // GĐ1298 — giá trị perk giới thiệu bạn bè: avgPerVisit (doanh thu/khách, GĐ1221) × bạn/lần × tần ghé → khách+tiền/tuần
  const avgPerVisit7 = avgCust7 > 0 ? recentAvgRevenue(history, 7) / avgCust7 : 0;
  const referValueOf = (rid: string) => {
    const def = REGULARS.find((x) => x.id === rid);
    return def ? referValue({ def, progress: regulars[rid] ?? undefined, avgPerVisit: avgPerVisit7 }) : null;
  };
  // GĐ1302 — bảng tổng "giá trị khách quen": cả LÔ góp ~bao nhiêu/tuần, ai gần mốc perk (đáng chăm), ai rủ thêm khách
  const cohortText = regularCohortLine(regularCohortSummary({
    regulars: REGULARS, level, priceOf,
    progressOf: (rid) => regulars[rid] ?? undefined, avgPerVisit: avgPerVisit7,
  }));
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
  // GĐ135: mồi "🧺 Hôm nay chợ phiên" — bản đánh giá (preview, pure-read) hàng DƯ đáng gánh ra bán.
  // Chỉ hiện ngày chợ (mỗi tuần từ ngày 7), khi có món dư, và chưa bán hôm nay. Bán thật ở GĐ136.
  const chophien = marketClearedDay === day ? null : marketClearValue({
    day, storage, shelved,
    health: itemHealthList(analytics, level, storage, shelved, stateDemand),
  });
  const actions = buildMorningActions({ day, level, weather, weatherSeed, storage, staff, regulars, expected, debts, biz, branch, branchChores, quanHealth, haveStock, dueContracts, chophien, lastSummary, furniture: useGame.getState().furniture });
  const nextEvt = nextEventLine(day, level, QUAN_NUOC_UNLOCK, forecast[0]); // GĐ637
  // GĐ132: mồi "🧭 Sắp mở khóa" cho người chơi MỚI (tuần đầu) — 1–2 hệ lớn sắp mở + XP còn thiếu (thuần đọc)
  const earlyUnlocks = earlyUnlockTeaser({ level, xp, day });
  const courier = staff.some((w) => w.role === 'courier');
  const phoneWx = phoneWeatherInfo(weather, level); // GĐ1309 — mưa/giông khách gọi đặt đơn nhiều hơn
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
  const eveningPrep = eveningPrepFor({
    nowMinutes, level, furniture, storage,
    cSpeed: nowMinutes >= 13 * 60 && nowMinutes < 17 * 60 ? cookSpeed(useGame.getState) : 1,
    bBoost: nowMinutes >= 13 * 60 && nowMinutes < 17 * 60 ? bartenderBoost(useGame.getState) : 1,
  });
  return (
    <>
      {/* GĐ1836 (review đợt 4 R5, tái xuất Đ1): mobile 375px tiêu đề đầy đủ bọc 3 dòng — bản mobile
          chỉ còn phần thay đổi theo ngày, tên tiệm/thứ để cho khung desktop */}
      <h2 style={styles.title}>{IS_MOBILE
        ? <>☀️ Sổ đầu ngày {day} ({today.day}/{today.month})</>
        : <>☀️ {shopName} · Sổ đầu ngày {day} ({today.day}/{today.month}) · {weekdayOf(day)}</>}</h2>
      <MorningSubtitle weatherSeed={weatherSeed} day={day} weather={weather} tomorrow={forecast[0]} level={level} rent={rentOf(shopTier)}
        autoNote={autoOpenNote(autoOpenAt, autoRoutine, cashierOpensMorning(staff))} />
      {/* GĐ565: tin sáng đầy đủ — toast chỉ hiện 3 giây và gộp '+N tin' */}
      {lastSummary?.day === day - 1 && <MorningNewsCard news={lastSummary.news} />}

      <AlleyTodayCard weatherSeed={weatherSeed} day={day} level={level} />

      {/* GĐ199/GĐ202: Rốn kho chung + phiếu nạp kho (tách GĐ919 sang SupplyChainCard) */}
      <SupplyChainCard storage={storage} branch={branch ?? undefined} quanNuoc={biz.quanNuoc} quanNuocLast={biz.quanNuocLast ?? null} level={level} weather={weather} day={day} />

      {earlyUnlocks && <EarlyUnlocksCard earlyUnlocks={earlyUnlocks} />}

      {chophien && <MarketSurplusCard chophien={chophien} />}

      <TodayActionsCard actions={actions} onOpen={(panel) => openPanel({ type: panel as never })} />
      {nextEvt && <button onClick={() => openPanel({ type: 'calendar' })} title="Xem lịch năm" style={{ display: 'block', fontSize: 11, opacity: 0.7, margin: '-4px 0 8px', background: 'transparent', border: 'none', color: 'inherit', padding: 0, cursor: 'pointer', textAlign: 'left' }}>{nextEvt} →</button>}

      {sickest.length > 0 && <SickShelvesCard sickest={sickest} />}

      {yesterCombos.length > 0 && <YesterCombosCard yesterCombos={yesterCombos} />}

      {biz.loan && <LoanNoteCard loan={biz.loan} day={day} />}

      {/* 🛒 Nhu cầu quầy (GĐ78) — tách GĐ920 sang CounterDemandCard */}
      <CounterDemandCard demand={demand} cleanStreak={cleanStreak} cleanBest={biz.cleanBest ?? 0} cleanExtra={cleanExtra} />

      {/* GĐ161: 1 dòng gợi ý duy nhất khi mở sổ trong khung vắng 13–17h — nấu kịp giờ vàng tối */}
      {eveningPrep && <EveningPrepCallout name={eveningPrep.name} startBy={eveningPrep.startBy} />}

      {hasMeatCounter && butcherV.skill < MAX_BUTCHER_STAR && <ButcherCard butcherV={butcherV} recentMeat={recentMeat} meatMissed={meatMissed} />}

      {biz.hui && <HuiCard hui={biz.hui} />}

      {(biz.loan || biz.hui) && <SolvencyCard sol={solvency({ money, storage, priceOf, loan: biz.loan, hui: biz.hui, day })} />}

      {biz.loan && <LoanBurdenCard lb={loanBurden(biz.loan.principal, stats?.revenue ?? 0)} />}

      <DailyBurnCard db={dailyBurn(staff, branch?.staff ?? [], shopTier, biz.loan, biz.hui, recentAvgRevenue(history, 7), (biz.quanNuoc.open ? biz.quanNuoc.staff * QUAN_NUOC_WAGE : 0) + (biz.tiemXoi?.open ? biz.tiemXoi.staff * TIEM_XOI_WAGE : 0))} />

      {biz.quanNuoc.open && <QuanNuocCard quanNuoc={biz.quanNuoc} quanNuocLast={biz.quanNuocLast ?? null} quanHealth={quanHealth} />}

      {biz.tiemXoi?.open && <TiemXoiCard tiemXoi={biz.tiemXoi} last={biz.tiemXoiLast} />}

      {branchChores.length > 0 && <BranchChoresCard branchChores={branchChores} />}

      {hiepLucEligible(branch, biz.quanNuoc, level) && <HiepLucCard biz={biz} day={day} />}

      {seasonEvent(day) && <SeasonEventCard day={day} weatherSeed={weatherSeed} biz={biz} />}

      {effects.festival && <FestivalNowCard festival={effects.festival} level={level} haveStock={haveStock} fv={fv} fvDelta={fvDelta} />}
      <HotGoodsCards eventHot={effects.hot} weekHot={hot} haveStock={haveStock} />
      {soon && <FestivalSoonCard soon={soon} level={level} storage={storage} fv={fv} fvDelta={fvDelta} />}

      <ExpectedRegularsList expected={expected} regulars={regulars} reservations={reservations} favsOf={favsOf} haveStock={haveStock} churn={regularChurnData} value={regularValueOf} nextPerk={nextPerkValueOf} refer={referValueOf} timeline={nextPerkTimelineOf} />

      {weeklyTopData && (
        <div style={{ fontSize: 12, marginTop: 8, color: '#b8860b' }}>
          🏆 Khách vàng theo tuần (giỏ × tần ghé): {weeklyTopData.map((w) => `${w.regular.name} ~${formatMoney(w.weekly)}/tuần`).join(' · ')}
        </div>
      )}
      {cohortText && (
        <div style={{ fontSize: 12, marginTop: 6, color: '#d2691e' }}>{cohortText}</div>
      )}

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
      {courier && phoneWx && (
        <div style={{ fontSize: 12, color: '#3498db', marginTop: 2 }}>{phoneWx.line}</div>
      )}
      <Footer onClose={() => { resetComboDay(); resetStaffDay(); closePanel(); }}>
        <button style={styles.btn} onClick={() => openPanel({ type: 'order' })}>📦 Nhập hàng</button>
        <button style={styles.btn} onClick={() => openPanel({ type: 'storage' })}>🏭 Kho</button>
      </Footer>
    </>
  );
}
