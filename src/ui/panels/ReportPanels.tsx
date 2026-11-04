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
import { supplyChainOverview, supplyRestockManifest } from '../../data/supplyChain';
import { signHiepLuc } from '../../core/biz';
import { seasonEvent, seasonObjective, seasonEventName, SEASON_EVENT_DAYS, SEASON_REWARD_PER_STAR } from '../../data/seasonEvent';
import { planDay, type DayAction } from '../../data/dayPlan';
import { demandForecast } from '../../data/counterDemand';
import { hasSkill } from '../../data/titles';
import { hasUpgrade } from '../../data/upgrades';
import { petActive } from '../../data/bizAchievements';
import { theftToday } from '../../data/theftRisk';
import { cleanBonus, CLEAN_TIERS, nextCleanTier } from '../../data/cleanOps';
import { monthOf } from '../../data/calendar';
import { trending } from '../../data/suppliers';
import { describeDay, WEATHER } from '../../data/weather';
import { trafficForecast } from '../../data/trafficForecast';
import { tomorrowTeaser } from '../../data/tomorrowTeaser';
import { missingForContract, reservedMissing, commitBonusValue, supplyContractById, contractStreakProgress, CONTRACT_STREAK_BONUS } from '../../data/contracts';
import { leakTone, riskLiveToday, riskLevers } from '../../data/risk';
import { nightPnl, nightPayback, nightPaybackLabel } from '../../data/nightReport';
import { PHONE_SLOTS } from '../../data/phoneOrders';
import { paymentById, type PaymentMethod } from '../../data/payments';
import { solvency } from '../../data/solvency';
import { loanBurden } from '../../data/loanBurden';
import { incomeSplit, incomeLevers, salesTrend } from '../../data/incomeSplit';
import { dailyBurn } from '../../data/dailyBurn';
import { recentAvgRevenue } from '../../data/minorPayoff';
import { AdviceCard, HourChart, ItemTable, HistoryChart } from './HistoryPanel';
import { SummaryMoneyCards } from './SummaryCards';
import { Callout, Stat, Footer, Swatch, styles, Tabs } from './shared';

/** Day-stats rỗng: SummaryPanel phải render được kể cả khi panel mở thiếu stats (đường mở lạ,
 * save lệch schema) — đọc `.revenue` trên undefined là sập toàn bộ UI (GĐ93 audit bắt được). */
export const EMPTY_DAY_STATS: DayStats = { revenue: 0, spent: 0, wages: 0, itemsSold: 0, customers: 0, unhappy: 0, xp: 0 };

export function SummaryPanel({ day }: { day: number }) {
  const panel = useGame((s) => s.panel);
  const { level, xp, history, openPanel, setShift, notify, storage, storageLots, furniture, priceOf, riskTrend, staff, skills, soldEver, comboHitCount, biz, weatherSeed, weather, regulars, totals, repLog, giftStreak, giftLastDay, giftGraceDay, happyHour, analytics, demand: stateDemand, marketLast, debts, questLog } = useGame();
  const [tab, setTab] = useState<'overview' | 'items'>('overview');
  if (panel?.type !== 'summary') return null;
  // GĐ126: `day` prop = ngày VỪA KẾT THÚC (N), nhưng endDay đã sang ngày mới trong cùng set().
  // Store `useGame(s => s.day)` = N+1 = MAI; weather/weatherSeed cũng là của mai. Luôn dùng MAI.
  const nowDay = useGame((s) => s.day);
  const teaserRows = tomorrowTeaser({
    day: nowDay, level, weatherSeed, weather, regulars, repLog, totals, history,
    giftStreak, giftLastDay, giftGraceDay,
    surpriseArc: biz.surpriseArc, // GĐ164: chuyện sự kiện còn dở → mồi "mai có tiếp"
    poached: Object.keys(biz.rival?.poached ?? {}), // GĐ793: khách bị lôi kéo thì mai không ghé
  });
  const st = panel.stats ?? EMPTY_DAY_STATS;
  // GĐ123: thẻ "phá kỷ lục" trong tổng kết cuối ngày — mồi quay lại mỗi ngày cho người chơi cấp cao,
  // nơi mọi việc đã auto: chỉ còn mục tiêu "tự phá kỷ lục của mình" là còn chạm được.
  const records = computeRecords({ history, soldEver, comboHitCount, level, prestigeBonus: biz.prestige.bonus });
  const feed = recordFeedToday(st, records);
  const feedActive = feed.filter((f) => f.best !== null);
  const profit = st.revenue - st.spent - st.wages - (st.rent ?? 0) - (st.fees ?? 0);
  const methods = (Object.entries(st.byMethod ?? {}) as [PaymentMethod, { revenue: number; count: number }][])
    .sort((a, b) => b[1].revenue - a[1].revenue);
  const lines = Object.entries(st.byItem ?? {}).map(([id, l]) => ({ id, ...l, gross: l.revenue - l.cost }));
  const goodsRevenue = lines.reduce((n, l) => n + l.revenue, 0);
  const goodsCost = lines.reduce((n, l) => n + l.cost, 0);
  const best = [...lines].sort((a, b) => b.qty - a.qty)[0];
  const richest = [...lines].sort((a, b) => b.gross - a.gross)[0];
  const missed = st.missed ?? {};
  const missTotal = (missed.stock ?? 0) + (missed.price ?? 0) + (missed.wait ?? 0) + (missed.expired ?? 0);
  const { hours, peak, quiet } = peakHours(st.byHour);
  const timeAdvice = peakAdvice(peak, missed.wait ?? 0);
  // GĐ120: thẻ dạy chơi 'mất khách vì chờ quầy' — đóng vòng lặp của dấu hiệu sốt ruột GĐ119
  const waitLoss = waitLossStats(st.byHour, missed, st.customers);
  // GĐ129: thẻ tích điểm đáng/không — quà đã tặng so khách kéo thêm nhờ +% (chỉ khi bật thẻ)
  const loyaltyPay = loyaltyPayoff(biz.loyalty, st);
  // GĐ148: danh tiếng ĐÁNG bao nhiêu khách — định lượng phần thưởng khách-vào-cửa của sao
  const rep148 = reputationOf(repLog);
  const payoff148 = repPayoff(rep148, level, furniture.filter((f) => f.type === 'plant').length);
  // GĐ130: giờ vàng có đáng không hôm nay — khách kéo thêm quy ra tiền so tiền đã giảm giá (thuần đọc)
  const happyPay = happyPayoff(happyHour, st.byHour);
  // GĐ131: định lượng lãi bỏ lỡ vì kệ/kho hết hàng tiệm chính — đóng vòng mua kệ/kho có ROI (thuần đọc)
  const missRev = storeMissRevenue(st.missLog, storage);
  // GĐ149: quầy thịt cá — tổng kết cuối ngày định lượng tiền bỏ lỡ vì người bán thịt cá thiếu/giỏi chưa đủ.
  // Thuần đọc: butcherValueToday(staff) + meatFromByItem(st.byItem) (+ recentMeatRevenue từ analytics).
  const butcherV = butcherValueToday(staff);
  const meatToday = meatFromByItem(st.byItem);
  const meatMissed149 = missedMeatRevenue(meatToday.revenue, butcherV);
  const hasMeatCounter = furniture.some((f) => f.type === 'meat_counter');
  // GĐ150: Sổ nợ — định lượng tiền mặt đang bị khóa thành nợ + nợ quá hạn/sắp mất hẳn (thuần đọc).
  // `nowDay` = MAI (N+1) — trùng cách endDay tính `age = s.day + 1 − d.since` khi xoá nợ xấu, nên
  // với ngày vừa kết thúc N thì các món đã bị xoá tối nay sẽ hiện writeOffTonight = đúng thực tế.
  const debt150 = debtLedger(debts, nowDay);
  // GĐ133: bản kê NGƯỢC hàng hỏng đêm qua (theo món + chi phí + nguyên nhân) — đóng nửa "sau" của vòng nhập hàng
  const spoilNite = spoilNightReport(analytics, day);
  // GĐ137: mồi "🧺 Chợ phiên ngày mai" — tổng kết cuối ngày báo trước phiên chợ đầu ngõ (nếu ngày mai
  // là ngày chợ) + hàng DƯ hiện có đáng gánh. THUẦN đọc state, không đổi save/kinh tế.
  const marketTom = marketClearValue({
    day: nowDay + 1, storage, shelved: shelfCount(furniture),
    health: itemHealthList(analytics, level, storage, shelfCount(furniture), stateDemand),
  });
  // Gợi ý giờ cao điểm đã nói chuyện chờ lâu thì bỏ dòng chờ lâu chung chung
  const advice = walkoutAdvice(st.missLog ?? {}, storage, priceOf)
    .filter((a) => !(timeAdvice[0]?.action === 'staff' && a.action === 'staff'))
    .concat(timeAdvice);
  const expiring = expiringSoon(storage, storageLots, furniture.flatMap((f) => f.tiers));
  const expiryTips = expiryAdvice(expiring);
  const act = (a: Advice) => a.action && openPanel({ type: a.action });
  const tabs = [['overview', 'Tổng quan'], ['items', `Theo món (${lines.length})`]] as const;
  const shopName = useGame((s) => s.shopName);
  return (
    <>
      <h2 style={styles.title}>🌙 {shopName} · Tổng kết ngày {day}</h2>
      {panel.fainted !== undefined && (
        <div style={{ background: '#4a2a2a', borderRadius: 8, padding: '8px 12px', margin: '0 0 8px', fontSize: 13 }}>
          😵 Hôm qua bạn thức quá khuya và ngất — mất {formatMoney(panel.fainted)} tiền thuốc. Tối nay nhớ về nhà ngủ trước 2:00 sáng (ăn sáng thì được thêm 1 giờ).
        </div>
      )}
      <Tabs tabs={tabs} value={tab} onChange={setTab} />
      {tab === 'overview' ? (
        <>
          {/* GĐ126: Thẻ "Mai tiệm có gì" — mồi quay lại ngày mai. Đọc state có sẵn (đã sang ngày
              mới nên `weather`, `day`… là của MAI), không đổi save/kinh tế. Ẩn khi không có dòng. */}
          {teaserRows.length > 0 && (
            <Callout tone="accent" title="🔮 Mai tiệm có gì" style={{ marginTop: 8 }}>
              <div style={{ marginTop: 2 }}>
                {teaserRows.map((row) => (
                  <button key={row.id} onClick={() => openPanel({ type: row.panel })}
                    title={row.hint}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', background: 'transparent', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left', color: 'inherit', fontSize: 12, padding: '4px 0', minHeight: 36, borderRadius: 6 }}>
                    <span style={{ flexShrink: 0 }}>{row.icon}</span>
                    <span style={{ flex: 1, minWidth: 0 }}>{row.text}</span>
                    {row.hint && <span style={{ flexShrink: 0, textAlign: 'right', fontSize: 11, whiteSpace: 'nowrap', color: row.hintColor ?? 'rgba(255,255,255,0.8)' }}>{row.hint}</span>}
                    <span style={{ flexShrink: 0, color: '#f1c40f' }}>→</span>
                  </button>
                ))}
              </div>
            </Callout>
          )}
          {marketLast && marketLast.day === day && marketLast.units > 0 && (
            <Callout tone="ok" title="🧺 Chợ phiên hôm nay" style={{ marginTop: 8 }}>
              <div style={{ fontSize: 12, marginTop: 4 }}>
                Đã gánh <b>{marketLast.units} món dư</b> ra chợ, thu về <b>{formatMoney(marketLast.revenue)}</b> thay vì để ế/hỏng.
              </div>
            </Callout>
          )}
          {marketTom && (
            <Callout tone="ok" title="🧺 Chợ phiên ngày mai" style={{ marginTop: 8 }}>
              <div style={{ marginTop: 2 }}>
                {marketTom.rows.map((r) => (
                  <div key={r.id} style={{ display: 'flex', gap: 8, alignItems: 'baseline', fontSize: 12 }}>
                    <span style={{ minWidth: 150 }}>{r.name}: {r.qty} món</span>
                    <span style={{ opacity: 0.8 }}>~{formatMoney(r.est)} · {r.reason === 'cold' ? 'cần lạnh dư' : 'bán chậm'}</span>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 12, marginTop: 4 }}>
                Gánh ~{marketTom.units} món dư ra chợ ngày mai, thu về ~<b>{formatMoney(marketTom.total)}</b> thay vì để ế/hỏng.
              </div>
            </Callout>
          )}
          {!payoff148.insufficient && Math.abs(payoff148.extraKhach) >= 3 && (
            <Callout tone="event" style={{ marginTop: 8 }}>
              <button onClick={() => openPanel({ type: 'reviews' })} title="Xem chi tiết danh tiếng"
                style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left', color: 'inherit', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}>
                <b style={{ fontSize: 13, color: '#9b59b6' }}>⭐ Danh tiếng {rep148.overall.toFixed(1)}★</b>
                <span style={{ marginLeft: 'auto', fontSize: 11, opacity: 0.7 }}>xem →</span>
              </button>
              <div style={{ fontSize: 12, marginTop: 4, color: payoff148.extraKhach >= 0 ? '#2ecc71' : '#e74c3c' }}>
                {payoff148.extraKhach >= 0
                  ? <>Giữ phong độ giúp tiệm được thêm <b>~{payoff148.extraKhach} khách/ngày</b> ({Math.round(Math.abs(payoff148.pct) * 100)}% người đi đường).</>
                  : <>Danh tiếng đang tụt, mất khoảng <b>~{Math.abs(payoff148.extraKhach)} khách/ngày</b>. Sửa mặt yếu nhất để hút khách lại.</>}
                <span style={{ opacity: 0.75 }}> Nâng 0.5★: thêm ~{payoff148.nextStarKhach} khách/ngày.</span>
                {(() => {
                  const rm = repMoney(payoff148, avgPerVisit(st.revenue, st.customers));
                  return (
                    <div style={{ marginTop: 4, opacity: 0.9 }}>
                      ≈ <b>{formatMoney(rm.moneyPerDay)}</b> doanh thu/ngày vì {rm.moneyPerDay >= 0 ? 'có' : 'thiếu'} danh tiếng · nâng 0.5★ ≈ +{formatMoney(rm.nextStarMoney)}/ngày.
                    </div>
                  );
                })()}
              </div>
            </Callout>
          )}
          {hasMeatCounter && butcherV.skill < MAX_BUTCHER_STAR && meatToday.revenue > 0 && (
            <Callout tone={butcherV.present ? 'warn' : 'danger'} strong={!butcherV.present} style={{ marginTop: 8 }}
              title={<>🔪 Thịt cá hôm nay thu {formatMoney(meatToday.revenue)}</>}
              actions={
                <div style={{ marginTop: 6 }}>
                  <button onClick={() => openPanel({ type: 'staff' })} style={{ ...styles.btn, fontSize: 11, padding: '2px 8px' }}>
                    {butcherV.present ? '👥 Nâng người bán thịt cá →' : '👥 Xếp người bán thịt cá →'}
                  </button>
                </div>
              }>
              <div style={{ fontSize: 12, marginTop: 4 }}>
                {butcherV.present
                  ? <>Người bán thịt cá {butcherV.skill}★ trực — bán được ~{butcherV.pct}% nhu cầu thịt cá.</>
                  : <>Không có người bán thịt cá — khách chỉ mua ~{butcherV.pct}% nhu cầu (quầy thịt cá gần như đứng im).</>}
                {meatMissed149 > 0 && (
                  <span style={{ color: '#f1c40f' }}> Thuê/bồi dưỡng người bán 5★ có thể thêm ~{formatMoney(meatMissed149)}/ngày.</span>
                )}
              </div>
            </Callout>
          )}
          {debt150.count > 0 && (
            <Callout tone={debt150.writeOffTonightAmount > 0 ? 'danger' : debt150.lateAmount > 0 ? 'warn' : 'info'}
              strong={debt150.writeOffTonightAmount > 0} style={{ marginTop: 8 }}
              title={`💳 Sổ nợ đang khóa ${formatMoney(debt150.lockedTotal)} tiền mặt`}
              actions={
                <div style={{ marginTop: 6 }}>
                  <button onClick={() => openPanel({ type: 'regulars' })} style={{ ...styles.btn, fontSize: 11, padding: '2px 8px' }}>
                    📒 Mở sổ nợ → nhắc / xoá
                  </button>
                </div>
              }>
              <div style={{ fontSize: 12, marginTop: 4 }}>
                {debt150.writeOffTonightAmount > 0 ? (
                  <span style={{ color: '#e74c3c' }}>⚠️ <b>{formatMoney(debt150.writeOffTonightAmount)}</b> quá {DEBT_WRITE_OFF_DAYS} ngày — <b>mất hẳn</b> nếu không nhắc/xoá. Đã có {debt150.lateCount} món quá hạn ({formatMoney(debt150.lateAmount)}).</span>
                ) : debt150.lateAmount > 0 ? (
                  <span style={{ color: '#e67e22' }}>⚠️ {debt150.lateCount} món nợ quá {DEBT_LATE_DAYS} ngày ({formatMoney(debt150.lateAmount)}) — sau {DEBT_WRITE_OFF_DAYS} ngày sẽ mất hẳn. Hãy nhắc/xoá nợ.</span>
                ) : (
                  <span>Khách quen đang giữ {debt150.count} món nợ ({formatMoney(debt150.lockedTotal)}) — còn đang trong hạn.</span>
                )}
              </div>
            </Callout>
          )}
          <table style={{ ...styles.table, fontSize: 15 }}>
            <tbody>
              <tr><td style={styles.left}>Doanh thu</td><td>{formatMoney(st.revenue)}</td></tr>
              {!!st.comboDiscount && <tr><td style={styles.left}>  trong đó đã giảm cho {st.combos} combo</td><td style={{ opacity: 0.75 }}>-{formatMoney(st.comboDiscount)}</td></tr>}
              <tr><td style={styles.left}>Lãi gộp trên hàng bán (giá bán − giá nhập)</td><td style={{ color: '#2ecc71' }}>{formatMoney(goodsRevenue - goodsCost - (st.comboDiscount ?? 0))}</td></tr>
              <tr><td style={styles.left}>Chi tiêu (nhập hàng, nội thất)</td><td>-{formatMoney(st.spent)}</td></tr>
              <tr><td style={styles.left}>Lương nhân viên</td><td>-{formatMoney(st.wages)}</td></tr>
              <tr><td style={styles.left}>Tiền nhà (theo bậc tiệm)</td><td>-{formatMoney(st.rent ?? 0)}</td></tr>
              <tr>
                <td style={styles.left}><b>Tiền vào − tiền ra</b></td>
                <td style={{ color: profit >= 0 ? '#2ecc71' : '#e74c3c' }}><b>{formatMoney(profit)}</b></td>
              </tr>
              {!!st.credited && <tr><td style={styles.left}>  trong đó khách quen ghi sổ (chưa thu)</td><td style={{ color: '#e67e22' }}>{formatMoney(st.credited)}</td></tr>}
              {!!st.repaid && <tr><td style={styles.left}>Thu nợ cũ</td><td style={{ color: '#2ecc71' }}>+{formatMoney(st.repaid)}</td></tr>}
              <tr><td style={styles.left}>Món đã bán</td><td>{st.itemsSold}</td></tr>
              {!!st.online && (
                <tr><td style={styles.left}>📲 Bán online (sau hoa hồng)</td><td>{formatMoney(st.online)}{st.grabFees ? ` · phí Grab -${formatMoney(st.grabFees)}` : ''}</td></tr>
              )}
              {!!(st.shrinkCash || st.shrinkItems) && (
                <tr>
                  <td style={styles.left} title="Két thiếu tiền hoặc kho hụt hàng mà không ai biết vì sao — có thể có người tắt mắt">🕵️ Thất thoát không rõ</td>
                  <td style={{ color: '#e67e22' }}>{[st.shrinkCash ? formatMoney(st.shrinkCash) : '', st.shrinkItems ? `${st.shrinkItems} món` : ''].filter(Boolean).join(' · ')}</td>
                </tr>
              )}
              {!!st.spoiledItems && (
                <tr><td style={styles.left}>Hàng hết hạn bỏ đi</td><td style={{ color: '#e67e22' }}>{st.spoiledItems} món (vốn {formatMoney(st.spoiledCost ?? 0)})</td></tr>
              )}
              <tr><td style={styles.left}>Khách ghé</td><td>{st.customers} ({st.unhappy} không hài lòng)</td></tr>
              <tr><td style={styles.left}>Kinh nghiệm</td><td>+{st.xp} XP · Cấp {level} ({xp}/{xpToNext(level)})</td></tr>
            </tbody>
          </table>
          {/* GĐ1178: "lãi bán hàng thật" so "thưởng nhiệm vụ + kèo" (Luật 10) — nguồn thu tách hai nửa.
              `profit` ("Tiền vào − tiền ra") trừ cả tiền nhập kho nên ngày nào cũng âm, không phản ánh sức bán;
              `salesProfit` (lãi gộp − lương − thuê) là con số game lưu/thuật toán dùng để cân bằng nhưng chưa
              bao giờ thấy. THUẦN đọc: incomeSplit from state có sẵn + stats.questIncome (ghi lúc claim). */}
          {(() => {
            const split = incomeSplit(st, questLog, day);
            const sharePct = split.rewardShare !== null ? Math.round(split.rewardShare * 100) : null;
            const tone = split.health === 'loss' ? 'danger' : split.health === 'heavy' || split.health === 'tight' ? 'accent' : 'ok';
            const note = split.health === 'loss'
              ? <span>Lãi bán thật <b>âm</b> — thưởng {formatMoney(split.reward)} đang gánh lỗ vận hành. Coi lại giá bán, đừng trông chờ thưởng bù.</span>
              : split.health === 'heavy'
                ? <span>Hôm nay thưởng chiếm <b>{sharePct}%</b> lãi bán thật — bán hàng phải là nghề chính (Luật 10): nới lãi bán lên thay vì trông chờ thưởng.</span>
                : split.health === 'tight'
                  ? <span>Thưởng chiếm <b>{sharePct}%</b> lãi bán thật — đã <b>gần bằng lãi bán</b>, coi chừng lấn nghề chính (Luật 10): nới lãi bán lên đừng trông chờ thưởng.</span>
                  : sharePct !== null
                    ? <span>Thưởng chiếm {sharePct}% lãi bán thật — bán hàng vẫn là nghề chính.</span>
                    : <span>Bán hàng vẫn là nghề chính — hôm nay lãi bán thật bằng 0, thưởng là nguồn phụ.</span>;
            // GĐ1203: nối chẩn đoán → hành động — khi health là loss/heavy/tight (lãi bán thật âm hoặc thưởng
            // lấn nghề), kê 1-2 nguyên nhân khách không mua được (đã tính ở `advice` ngay dưới: kệ trống khi
            // kho còn / hết cả kho / chê đắt / chờ lâu) cạnh lời khuyên "nới lãi bán lên", bấm mở thẳng panel
            // sửa. Hết hộp đen giữa chẩn đoán và phương thuốc; `ok` không kê (tránh nhiễu).
            const levers = incomeLevers(split.health, advice);
            // GĐ1207: đóng vòng phản hồi — sau khi bấm nút "Soi giá / nới lãi / hạ lương", người chơi cần
            // thấy sức bán thật có cải thiện qua 7 ngày không, chứ chỉ 1 con số hôm nay không đủ biết hướng.
            const trend = salesTrend(history);
            const trendLine = trend.days > 0 ? (
              <span style={{ fontSize: 11, opacity: 0.85, marginLeft: 6 }}>
                {trend.dir === 'up' ? '🔼 lãi bán thật đang cải thiện (7 ngày)'
                  : trend.dir === 'down' ? '▼ lãi bán thật đang xấu đi (7 ngày)'
                    : trend.days < 2 ? '▬ mới có 1 ngày, chưa thể đo xu hướng'
                      : '▬ lãi bán thật 7 ngày ổn định'}
              </span>
            ) : null;
            return (
              <Callout tone={tone} style={{ marginTop: 8 }}
                title={<>🎯 Lãi bán hàng thật {split.salesProfit < 0 ? formatMoney(split.salesProfit) : <b style={{ color: '#2ecc71' }}>+{formatMoney(split.salesProfit)}</b>} · thưởng <b style={{ color: '#2ecc71' }}>+{formatMoney(split.quest)}</b>{split.bet > 0 ? <span> + kèo <b style={{ color: '#2ecc71' }}>+{formatMoney(split.bet)}</b></span> : null}{trendLine}</>}>
                <div style={{ fontSize: 12, opacity: 0.8, marginTop: 2 }}>
                  Lãi bán thật = lãi gộp bán hàng/ngày + dịch vụ − lương − tiền nhà (không trừ tiền nhập kho).<br />
                  {note}
                </div>
                {levers.length > 0 && (
                  <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {levers.map((lv, i) => (
                      <button key={i} onClick={() => lv.action && openPanel({ type: lv.action as any })} style={{ ...styles.btn, fontSize: 11, padding: '2px 8px', textAlign: 'left' }}>
                        {lv.icon} {lv.text} →
                      </button>
                    ))}
                  </div>
                )}
              </Callout>
            );
          })()}
          {(() => {
            const last = riskTrend.length ? riskLiveToday(riskTrend[riskTrend.length - 1]) : { leak: 0, blocked: 0, events: 0 };
            if (last.events <= 0) return null; // ngày yên ả (không rủi ro) thì không bày thẻ, tránh nhiễu
            const tone = leakTone(last.leak, st.revenue);
            // GĐ1206: nối chẩn đoán → hành động — lọt trội (warn/bad) thì kê phòng thủ ĐANG THIẾU
            // (bảo vệ → staff, Mắt tinh → skills); bấm mở thẳng panel sửa. Hết hộp đen "mất tiền mà không
            // biết chặn cách nào"; `ok` không kê. THUẦN đọc — chỉ đọc cờ phòng thủ có sẵn (staff/skills).
            const riskLevs = riskLevers(tone, {
              hasGuard: staff.some((e) => e.role === 'guard'),
              hasSharpEye: hasSkill(skills, 'sharp_eye'),
            });
            return (
              <Callout tone={tone === 'bad' ? 'danger' : tone === 'warn' ? 'accent' : 'ok'} style={{ marginTop: 8 }}
                title={<>🛡️ Rủi ro hôm nay — chặn {formatMoney(last.blocked)} · lọt {formatMoney(last.leak)} · {last.events} lần</>}>
                <div style={{ fontSize: 12, opacity: 0.75, marginTop: 2 }}>
                  Lọt: trộm khuất · tiền giả lọt · nhân viên gian lận · Chặn: bắt quả tang (phạt) · phát hiện tiền giả · thu lại khi bắt
                </div>
                {(() => {
                  // GĐ1215: mở "hộp đen" trộm vặt — thấy P(1 khách là kẻ trộm) × P(bắt) theo phòng thủ
                  // hiện tại (chỉ số THUẦN từ theftToday — nối GĐ1211/1212). Đọc cờ có sẵn; ban ngày,
                  // đêm chạy ca thì trộm ×2 (quy ước chú thích "trộm đêm ×2" cùng nightReport).
                  const tt = theftToday({
                    hasDog: petActive(biz.pets.dog, nowDay - 1),
                    hasCamera: hasUpgrade(biz, 'camera'),
                    guardOnDuty: staff.some((e) => e.role === 'guard'),
                    cashierStaffed: staff.some((e) => e.role === 'cashier'),
                    hasSharpEye: hasSkill(skills, 'sharp_eye'),
                  });
                  return (
                    <div style={{ fontSize: 11, opacity: 0.8, marginTop: 5 }}>
                      🕵️ P(1 khách là kẻ trộm) ~{(tt.spawnChance * 100).toFixed(2)}% · P(bắt) ~{(tt.catchChance * 100).toFixed(0)}% → kỳ vọng{' '}
                      <b>{Math.round(st.customers * tt.leakPerThief)}</b> kẻ trộm lọt/ngày{' '}
                      <span style={{ opacity: 0.6 }}>(chạy ca đêm thì trộm ×2)</span>
                    </div>
                  );
                })()}
                {riskLevs.length > 0 && (
                  <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {riskLevs.map((lv, i) => (
                      <button key={i} onClick={() => lv.action && openPanel({ type: lv.action as any })} style={{ ...styles.btn, fontSize: 11, padding: '2px 8px', textAlign: 'left' }}>
                        {lv.icon} {lv.text} →
                      </button>
                    ))}
                  </div>
                )}
              </Callout>
            );
          })()}
          {/* GĐ124: Thẻ "Combo hôm nay" trong tổng kết — đóng vòng phản hồi cho quyết định xoay slot
              combo (combo chạy trong slot hạn chế mà trước đây chỉ có comboHitCount tích lũy cả đời = hộp đen).
              Dữ liệu là transient per-day (comboDay, không persist); chỉ hiện khi hôm nay có combo kích hoạt. */}
          {(() => {
            const today = comboDaySnapshot();
            const rows = Object.entries(today)
              .map(([id, t]) => {
                const def = comboById(id);
                if (!def) return null;
                const [a, b] = def.items.map(productById);
                const full = priceOf(a.id) + priceOf(b.id);
                const cut = Math.round((full * def.discount) / 100) * 100;
                const margin = full - cut - a.buy - b.buy;
                return { def, t, margin };
              })
              .filter((r): r is NonNullable<typeof r> => r !== null)
              .sort((x, y) => (y.t.count ?? 0) - (x.t.count ?? 0))
              .slice(0, 5);
            if (!rows.length) return null;
            return (
              <div style={{ ...styles.card, marginTop: 8 }}>
                <b style={styles.cardTitle}>🎁 Combo hôm nay</b>
                <div style={{ marginTop: 4, display: 'grid', gap: 3 }}>
                  {rows.map(({ def, t, margin }) => (
                    <div key={def.id} style={{ fontSize: 12, display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                      <span>{def.icon} {def.name}: <b>{t.count} lần</b> · giảm {formatMoney(t.discount)}</span>
                      <span style={{ color: margin > 0 ? '#2ecc71' : '#e74c3c', fontWeight: 600 }}>lãi cả cặp {formatMoney(margin)}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
          {/* GĐ123: Thẻ "phá kỷ lục" trong tổng kết ngày — mồi quay lại mỗi ngày cho người chơi cấp cao
              (nơi mọi việc đã auto) bằng mục tiêu tự phá kỷ lục của chính mình. Chỉ hiện khi có kỷ lục
              để so (best !== null); đọc state có sẵn (history/soldEver/comboHitCount), không đổi save. */}
          {feedActive.length > 0 && (
            <div style={{ ...styles.card, marginTop: 8 }}>
              <b style={styles.cardTitle}>🏆 Đang đua phá kỷ lục</b>
              <div style={{ marginTop: 4, display: 'grid', gap: 3 }}>
                {feedActive.map((f) => (
                  <button key={f.label} onClick={() => openPanel({ type: 'records' })}
                    style={{ background: 'transparent', border: 'none', padding: '6px 0', cursor: 'pointer', width: '100%', color: 'inherit', textAlign: 'left', fontSize: 12, display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', borderRadius: 6 }}>
                    <span>{f.icon} {f.label}: <b>{f.unit === 'money' ? formatMoney(f.today) : `${f.today} lượt`}</b></span>
                    {f.beating ? (
                      <span style={{ color: '#2ecc71', fontWeight: 600 }}>🔥 Đã phá {f.unit === 'money' ? formatMoney(f.best!) : `${f.best!} lượt`}</span>
                    ) : (
                      <span style={{ color: f.remaining <= Math.round((f.best ?? 1) * 0.2) ? '#f1c40f' : 'inherit', opacity: f.remaining > Math.round((f.best ?? 1) * 0.2) ? 0.75 : 1 }}>
                        🎯 còn {f.unit === 'money' ? formatMoney(f.remaining) : `${f.remaining} lượt`}
                      </span>
                    )}
                  </button>
                ))}
              </div>
              <button onClick={() => openPanel({ type: 'records' })} style={{ ...styles.btn, marginTop: 4 }}>Sổ kỷ lục</button>
            </div>
          )}
          {/* Báo cáo ca đêm tiệm chính (GĐ65): lời/lỗ của khoản đầu tư 15 triệu "Mở ca đêm 24h".
              Thuần đọc từ byHour (giờ ≥22) + nhân viên ca đêm (pay ×1,5) — không thêm state/save. */}
          {(() => {
            const np = nightPnl(st.byHour, staff, skills);
            if (np.verdict === 'idle') return null; // chưa mở ca đêm / chưa thuê ai, không bày thẻ tránh nhiễu
            const color = np.verdict === 'ok' ? '#2ecc71' : '#e74c3c';
            const pb = nightPayback(np); // GĐ192: hồi vốn sau bao lâu cho khoản đầu tư 15tr
            const pbColor = pb.verdict === 'good' ? '#2ecc71' : pb.verdict === 'slow' ? '#e67e22' : '#e74c3c';
            return (
              <Callout tone={np.verdict === 'ok' ? 'ok' : 'danger'} style={{ marginTop: 8 }}
                title={<>🌙 Đêm qua: thu {formatMoney(np.revenue)} (ca đêm +15%) · lương ca đêm −{formatMoney(np.wages)} · <span style={{ color }}>lời ròng {formatMoney(np.net)}</span></>}>
                <div style={{ fontSize: 12, opacity: 0.75, marginTop: 2 }}>
                  {np.verdict === 'ok'
                    ? 'Mở xuyên đêm đang có lời — bán được đắt hơn buổi ngày, khách khuya lười trả giá.'
                    : '⚠️ Ca đêm đang lỗ — cân nhắc bớt nhân viên ca đêm, rút bảo vệ thừa, hoặc đóng cửa đúng giờ để khỏi trả lương ×1,5.'}
                </div>
                <div style={{ fontSize: 12, marginTop: 3, color: pbColor }}>
                  💸 15tr nâng cấp "Mở ca đêm": <b>{nightPaybackLabel(pb)}</b>
                  {pb.verdict !== 'losing' ? ` (lời ~${formatMoney(pb.netPerNight)}/đêm)` : ''}
                  {' '}· <span style={{ opacity: 0.7 }}>*chưa tính trộm đêm ×2 & dậy trễ mất buổi sáng</span>
                </div>
              </Callout>
            );
          })()}
          {/* GĐ120: Thẻ dạy chơi 'mất khách vì chờ quầy' — phản hồi cuối ngày của dấu hiệu sốt
              ruột GĐ119. Chỉ hiện khi có ai bỏ về vì chờ; đọc state có sẵn (missed.wait /
              byHour / customers), không đổi save/kinh tế. Nút trỏ tới gợi ý xếp ca đã có. */}
          {waitLoss && (() => {
            const pct = Math.round(waitLoss.pct * 100);
            const bad = waitLoss.pct >= 0.1; // mất ≥10% khách vì chờ là đáng sốt
            const color = bad ? '#e74c3c' : '#f1c40f';
            return (
              <Callout tone={bad ? 'danger' : 'accent'} style={{ marginTop: 8 }}
                title={<>⏳ Mất {waitLoss.count} khách vì chờ quầy quá lâu <span style={{ color }}>(bằng ~{pct}% khách ghé hôm nay)</span></>}>
                <div style={{ fontSize: 12, opacity: 0.75, marginTop: 2 }}>
                  Khách đứng chờ 😕😤 quá lâu rồi bỏ về. Đứng quầy giờ đông (giờ cao điểm nhất {waitLoss.peakHour !== null ? `${waitLoss.peakHour}h–${waitLoss.peakHour + 1}h` : 'trong hôm nay'}) hoặc thuê thêm thu ngân để không bỏ lỡ.
                </div>
              </Callout>
            );
          })()}
          {/* GĐ268: phản hồi cuối ngày CUỐI TUẦN — Thứ 7/CN vừa khép thì gộp nhóm ăn vặt ra
              số: bán được bao nhiêu, đáng bao nhiêu % doanh thu, đủ mục tiêu "Cuối tuần ăn vặt"
              chưa. Khép mảnh PHẢN HỒI của nhịp GĐ254–267 (kế hoạch → hành động → phản hồi).
              Thuần đọc sổ bán của ngày vừa kết thúc, không đổi kinh tế. */}
          {isWeekend(day) && (() => {
            const wr = weekendRecap(st, level, weekendQuestTarget(level));
            const isSunday = (day - 1) % 7 === 6;
            return (
              <Callout tone={wr.met ? 'ok' : 'accent'} style={{ marginTop: 8 }}
                title={<>🍬 Cuối tuần: bán {wr.sold} món ăn vặt <span style={{ opacity: 0.75 }}>(~{formatMoney(wr.value)} · {wr.sharePct}% doanh thu)</span></>}>
                <div style={{ fontSize: 12, opacity: 0.75, marginTop: 2 }}>
                  {wr.met
                    ? `Đủ mục tiêu ${wr.target} món của "Cuối tuần ăn vặt" — khách cuối tuần được đã giò.`
                    : `Mục tiêu ${wr.target} món — còn thiếu ${wr.target - wr.sold} món. Cuối tuần sau nhớ châm kệ từ sáng.${isSunday ? '' : ' Mai Chủ nhật còn một ngày.'}`}
                  {isSunday && ' Tuần mới bắt đầu Thứ 2 — chúc buôn may bán đắt!'}
                </div>
              </Callout>
            );
          })()}
          {(() => {
            // GĐ248: tổng kết đội hôm nay — soi % rảnh (GĐ246) đúng lúc chốt ngày, khi quyết định
            // xếp ca mai. Phân biệt "dư người" với "lệch ca" bằng tín hiệu mất khách vì chờ (GĐ120).
            // Chỉ lên thẻ khi có người rảnh bất thường; đội vừa sức thì khỏi ồn.
            const recap = staffDayRecap(staffDaySnapshot(), staff, waitLoss?.count ?? 0);
            if (recap.verdict !== 'idle_heavy' && recap.verdict !== 'shift_mismatch') return null;
            const mi = recap.mostIdle!;
            return (
              <Callout tone="warn" style={{ marginTop: 8 }}
                title={recap.verdict === 'shift_mismatch'
                  ? <>🧍 Đội lệch ca: rảnh lúc vắng, mất khách lúc đông</>
                  : <>🧍 {mi.icon} {mi.name} rảnh ~{mi.idlePct}% ca hôm nay</>}>
                <div style={{ fontSize: 12, opacity: 0.75, marginTop: 2 }}>
                  {recap.verdict === 'shift_mismatch'
                    ? `${mi.name} rảnh ~${mi.idlePct}% ca (đứng không ~${mi.idleMin}′) nhưng vẫn mất ${waitLoss?.count} khách vì chờ quầy — bài toán xếp ca chứ không phải thiếu người: dồn ca vào giờ đông, ca vắng cho nghỉ bớt.`
                    : `Đứng không ~${mi.idleMin}′ trên ~${mi.workMin + mi.idleMin}′ có mặt. Mai xem lại vai này: bớt một ca, 🔀 điều sang tiệm kia hoặc không tuyển thêm vai tương tự.`}
                </div>
                <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {(() => {
                    // GĐ253: biến gợi ý thành hành động — nút chạy setShift có sẵn, người chơi bấm mới đổi.
                    const fix = staffShiftFix(staffDaySnapshot(), staff, waitLoss?.count ?? 0, waitLoss?.peakHour ?? null, st.byHour);
                    if (!fix) return null;
                    const save = fix.wageDelta < 0 ? ` (tiết kiệm ~${formatMoney(-fix.wageDelta)}/ngày)` : '';
                    return (
                      <button style={{ ...styles.btn, fontSize: 11, padding: '2px 8px' }}
                        onClick={() => { setShift(fix.id, fix.to); notify(`🔀 Đã xếp lại ca mai cho ${fix.name}: ${fix.label}${save}`); }}>
                        🔀 {fix.name} — {fix.label}{save}
                      </button>
                    );
                  })()}
                  <button style={{ ...styles.btn, fontSize: 11, padding: '2px 8px' }} onClick={() => openPanel({ type: 'staff' })}>
                    👥 Bảng nhân viên
                  </button>
                </div>
              </Callout>
            );
          })()}
          <SummaryMoneyCards loyaltyPay={loyaltyPay} happyPay={happyPay} missRev={missRev} spoilNite={spoilNite} openPanel={openPanel} />
          {methods.length > 0 && (
            <>
              <h3 style={{ margin: '12px 0 4px', fontSize: 14 }}>💳 Tiền vào theo hình thức thanh toán</h3>
              <table style={{ ...styles.table, fontSize: 13 }}>
                <tbody>
                  {methods.map(([id, m]) => {
                    const def = paymentById(id);
                    return (
                      <tr key={id} title={def.desc}>
                        <td style={styles.left}>{def.icon} {def.name} <span style={{ opacity: 0.6 }}>· {m.count} lượt</span></td>
                        <td>{formatMoney(m.revenue)} <span style={{ opacity: 0.6 }}>({st.revenue ? Math.round((m.revenue / st.revenue) * 100) : 0}%)</span></td>
                      </tr>
                    );
                  })}
                  {!!st.fees && (
                    <tr title="Phí ví điện tử / máy POS đã trừ khỏi tiền thật về">
                      <td style={styles.left}>↳ Phí thanh toán</td>
                      <td style={{ color: '#e67e22' }}>-{formatMoney(st.fees)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 6, marginTop: 10, maxWidth: 560 }}>
            {best && <Stat icon="🔥" label="Bán chạy nhất" value={`${productById(best.id).name} · ${best.qty} món`} />}
            {richest && <Stat icon="💰" label="Lãi nhiều nhất" value={`${productById(richest.id).name} · ${formatMoney(richest.gross)}`} />}
            {missTotal > 0 && (
              <Stat icon="😞" label={`Lỡ ${missTotal} lượt bán`}
                value={[missed.stock && `${missed.stock} hết hàng`, missed.price && `${missed.price} chê đắt`, missed.wait && `${missed.wait} chờ lâu bỏ về`, missed.expired && `${missed.expired} ngại hàng cận hạn`].filter(Boolean).join(' · ')} />
            )}
          </div>
          {hours.length > 0 && <HourChart hours={hours} peak={peak?.hour} quiet={quiet?.hour} />}
          {expiryTips.length > 0 && (
            <AdviceCard title={`🥀 Hàng sắp hỏng (${expiring.reduce((n, l) => n + l.qty, 0)} món)`} items={expiryTips} onAct={act} />
          )}
          {advice.length > 0 && <AdviceCard title="💡 Vì sao khách không mua được · nên làm gì" items={advice} onAct={act} />}
          <HistoryChart history={history} />
        </>
      ) : (
        <ItemTable lines={lines} />
      )}
      <p style={{ ...styles.sub, marginTop: 12 }}>💾 Đã tự động lưu game. "Tiền vào − tiền ra" tính cả tiền nhập hàng để bán những ngày sau, nên có hôm âm dù bán có lãi.</p>
      <Footer onClose={() => openPanel({ type: 'morning' })} closeLabel="☀️ Sang ngày mới · xem sổ đầu ngày" />
    </>
  );
}
