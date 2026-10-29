import { ProductIcon } from '../ProductIcon';
import { useState } from 'react';
import { useGame, useClock, formatClock, type DayRecord, type DayStats, type ItemLine } from '../../core/store';
import { rentOf } from '../../data/shopTiers';
import { furnitureDef } from '../../data/furniture';
import { xpToNext } from '../../data/levels';
import { RECIPES } from '../../data/recipes';
import { kitchenValue } from '../../data/kitchenValue';
import { pickEveningPrep } from '../../data/cookSchedule';
import { cookSpeed, bartenderBoost } from '../../core/slices/orders';
import { caseSize, formatMoney, productById } from '../../data/products';
import { describeRep, meetsRep, REP_FACTORS, REP_INFO, REP_MIN_SAMPLES, reputationOf, type RepSample } from '../../data/reputation';
import { repPayoff, repPayoffFocus } from '../../data/repPayoff';
import { repMoney, avgPerVisit } from '../../data/repMoney';
import { butcherValueToday, MAX_BUTCHER_STAR, meatFromByItem, missedMeatRevenue, recentMeatRevenue } from '../../data/butcherValue';
import { debtLedger } from '../../data/debtLedger';
import { regularRep, regularById, regularsExpectedToday, REGULARS } from '../../data/regulars';
import { LOAN_DAILY_RATE, loyaltyPayoff } from '../../data/biz';
import { happyPayoff } from '../../data/rhythm';
import { QUAN_NUOC_MAX_STAFF, QUAN_NUOC_WAGE, QUAN_PRICE_OPTIONS, quanNuocDayAction, quanNuocHealth } from '../../data/quanNuoc';
import { CREDIT_FRIENDSHIP, CREDIT_UNLOCK, creditLimit, DEBT_LATE_DAYS, DEBT_WRITE_OFF_DAYS } from '../../data/credit';
import { CHANGE_OPTS, counterPolicySummary, defaultCounterPolicy, HAGGLE_OPTS } from '../../data/counterDeals';
import { ACTION_LABEL, expiringSoon, expiryAdvice, peakAdvice, peakHours, spoilNightReport, storeMissRevenue, waitLossStats, walkoutAdvice, type Advice, type HourStat } from '../../data/advice';
import { dateOfDoy, dayEffects, dayOfYear, festivalStock, isWeekend, upcomingFestival, weekdayOf } from '../../data/calendar';
import { festivalValue } from '../../data/festivalValue';
import { festivalPrepAction, festivalRestockPlan } from '../../data/festivalRestock';
import { prepItems, prepReadiness, prepBonus, PREP_MIN_QTY } from '../../data/festivalPrep';
import { itemHealthList, shelfAttention, shelfCount } from '../../data/analytics';
import { computeRecords, recordFeedToday } from '../../data/records';
import { comboDaySnapshot, resetComboDay } from '../../core/slices/comboDay';
import { resetStaffDay, staffDaySnapshot } from '../../core/slices/staffDay';
import { staffDayRecap, staffShiftFix } from '../../data/staffIdle';
import { comboById } from '../../data/combos';
import { branchMorningPlan } from '../../data/branchMorning';
import { storageUsed } from '../../core/gameTypes';
import { hiepLucEligible, hiepLucPayoff, HIEPLUC_COC, HIEPLUC_MIN } from '../../data/hiepLuc';
import { earlyUnlockTeaser } from '../../data/unlockMap';
import { marketClearValue, isMarketDay } from '../../data/chophien';
import { alleySignalsToday } from '../../data/alleySignals';
import { supplyChainOverview, supplyRestockManifest } from '../../data/supplyChain';
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
import { missingForContract, reservedMissing, commitBonusValue, SUPPLY_CONTRACTS, supplyContractById, contractStreakProgress, CONTRACT_STREAK_EVERY, CONTRACT_STREAK_BONUS } from '../../data/contracts';
import { leakTone, riskLiveToday } from '../../data/risk';
import { nightPnl, nightPayback, nightPaybackLabel } from '../../data/nightReport';
import { PHONE_SLOTS } from '../../data/phoneOrders';
import { paymentById, type PaymentMethod } from '../../data/payments';
import { solvency } from '../../data/solvency';
import { loanBurden } from '../../data/loanBurden';
import { dailyBurn } from '../../data/dailyBurn';
import { recentAvgRevenue } from '../../data/minorPayoff';
import { Callout, Stat, starColor, Footer, Swatch, styles, Tabs } from './shared';

/** Day-stats rỗng: SummaryPanel phải render được kể cả khi panel mở thiếu stats (đường mở lạ,
 * save lệch schema) — đọc `.revenue` trên undefined là sập toàn bộ UI (GĐ93 audit bắt được). */
export const EMPTY_DAY_STATS: DayStats = { revenue: 0, spent: 0, wages: 0, itemsSold: 0, customers: 0, unhappy: 0, xp: 0 };

export function SummaryPanel({ day }: { day: number }) {
  const panel = useGame((s) => s.panel);
  const { level, xp, history, closePanel, openPanel, setShift, notify, storage, storageLots, furniture, priceOf, riskTrend, staff, skills, soldEver, comboHitCount, biz, weatherSeed, weather, regulars, totals, repLog, giftStreak, giftLastDay, giftGraceDay, happyHour, analytics, demand: stateDemand, marketClearedDay, marketLast, debts } = useGame();
  const [tab, setTab] = useState<'overview' | 'items'>('overview');
  if (panel?.type !== 'summary') return null;
  // GĐ126: `day` prop = ngày VỪA KẾT THÚC (N), nhưng endDay đã sang ngày mới trong cùng set().
  // Store `useGame(s => s.day)` = N+1 = MAI; weather/weatherSeed cũng là của mai. Luôn dùng MAI.
  const nowDay = useGame((s) => s.day);
  const teaserRows = tomorrowTeaser({
    day: nowDay, level, weatherSeed, weather, regulars, repLog, totals, history,
    giftStreak, giftLastDay, giftGraceDay,
    surpriseArc: biz.surpriseArc, // GĐ164: chuyện sự kiện còn dở → mồi "mai có tiếp"
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
          {(() => {
            const last = riskTrend.length ? riskLiveToday(riskTrend[riskTrend.length - 1]) : { leak: 0, blocked: 0, events: 0 };
            if (last.events <= 0) return null; // ngày yên ả (không rủi ro) thì không bày thẻ, tránh nhiễu
            const tone = leakTone(last.leak, st.revenue);
            return (
              <Callout tone={tone === 'bad' ? 'danger' : tone === 'warn' ? 'accent' : 'ok'} style={{ marginTop: 8 }}
                title={<>🛡️ Rủi ro hôm nay — chặn {formatMoney(last.blocked)} · lọt {formatMoney(last.leak)} · {last.events} lần</>}>
                <div style={{ fontSize: 12, opacity: 0.75, marginTop: 2 }}>
                  Lọt: trộm khuất · tiền giả lọt · nhân viên gian lận · Chặn: bắt quả tang (phạt) · phát hiện tiền giả · thu lại khi bắt
                </div>
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
              Thuần đọc từ byHour (giờ ≥22) + nhân viên ca đêm (pay ×1.5) — không thêm state/save. */}
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
                    : '⚠️ Ca đêm đang lỗ — cân nhắc bớt nhân viên ca đêm, rút bảo vệ thừa, hoặc đóng cửa đúng giờ để khỏi trả lương ×1.5.'}
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
          {loyaltyPay && loyaltyPay.verdict !== 'soon' && (
            <Callout tone={loyaltyPay.verdict === 'keep' ? 'ok' : 'warn'} style={{ marginTop: 8 }} title="🎫 Thẻ tích điểm hôm nay">
              <div style={{ fontSize: 12, opacity: 0.75, marginTop: 2 }}>
                {loyaltyPay.verdict === 'keep'
                  ? `Nhờ +${loyaltyPay.boostPct}% khách, kéo thêm ~${loyaltyPay.extraCustomers} khách (~${formatMoney(loyaltyPay.extraValue)}/ngày) — so với quà tặng ~${formatMoney(loyaltyPay.costToday)}/ngày (món ~${formatMoney(loyaltyPay.avgGift)}) là ĐÁNG giữ.`
                  : `Quà tặng ~${formatMoney(loyaltyPay.costToday)}/ngày (món ~${formatMoney(loyaltyPay.avgGift)}) cao hơn giá trị khách kéo thêm (~${formatMoney(loyaltyPay.extraValue)}/ngày) — nâng lên ${5}/${10}/${15} tem hoặc tắt cho đỡ tốn.`}
              </div>
            </Callout>
          )}
          {happyPay && (
            <Callout tone={happyPay.verdict === 'great' ? 'ok' : happyPay.verdict === 'ok' ? 'accent' : 'danger'} style={{ marginTop: 8 }}
              title={`🌞 Giờ vàng hôm nay (${happyPay.from}h–${happyPay.to}h)`}>
              <div style={{ fontSize: 12, opacity: 0.75, marginTop: 2 }}>
                {happyPay.verdict === 'great'
                  ? `Kéo thêm ~${happyPay.extraCustomers} khách (~${formatMoney(happyPay.extraValue)} lợi) so tiền giảm giá ~${formatMoney(happyPay.discountCost)} — hiệu quả ~${happyPay.efficiency.toFixed(1)}×, giữ mức này.`
                  : happyPay.verdict === 'ok'
                  ? `Kéo thêm ~${happyPay.extraCustomers} khách (~${formatMoney(happyPay.extraValue)} lợi) nhưng tiền giảm giá ~${formatMoney(happyPay.discountCost)} chiếm phần lớn (hiệu quả ~${happyPay.efficiency.toFixed(1)}×) — cân nhắc hạ mức chiết khấu để lời hơn.`
                  : `Tiền giảm giá ~${formatMoney(happyPay.discountCost)} vượt lợi khách kéo thêm (~${formatMoney(happyPay.extraValue)}) — giờ vàng đang tốn, nên hạ mức giảm hoặc đổi giờ sang giờ vắng.`}
              </div>
            </Callout>
          )}
          {missRev && missRev.totalLoss > 0 && (
            <Callout tone="danger" style={{ marginTop: 8 }} title={<>📦 Hết hàng bỏ lỡ ~{formatMoney(missRev.totalLoss)} hôm nay</>}>
              <div style={{ fontSize: 12, opacity: 0.75, marginTop: 2 }}>
                {missRev.inStorageCount > 0 && missRev.outOfStockCount > 0
                  ? `${missRev.rows.length} món khách tìm mà kệ trống: ${missRev.inStorageCount} món còn trong kho (chỉ thiếu chỗ bày — xếp thêm lên kệ) · ${missRev.outOfStockCount} món hết cả kho (nhập thêm). ${missRev.rows.slice(0, 3).map((r) => `${r.name} ~${formatMoney(r.estLoss)}`).join(' · ')}`
                  : missRev.inStorageCount > 0
                  ? `${missRev.rows.length} món còn hàng trong kho nhưng kệ hết chỗ — bày thêm lên kệ để không bỏ lỡ: ${missRev.rows.slice(0, 3).map((r) => `${r.name} ~${formatMoney(r.estLoss)}`).join(' · ')}`
                  : `${missRev.rows.length} món hết cả kho — nhập thêm để không bỏ lỡ: ${missRev.rows.slice(0, 3).map((r) => `${r.name} ~${formatMoney(r.estLoss)}`).join(' · ')}`}
              </div>
            </Callout>
          )}
          {spoilNite && spoilNite.totalCost > 0 && (
            <Callout tone="danger" style={{ marginTop: 8 }} title={<>🥀 Đêm qua hỏng ~{formatMoney(spoilNite.totalCost)} hàng</>}>
              <div style={{ marginTop: 4, display: 'grid', gap: 2 }}>
                {spoilNite.rows.slice(0, 3).map((r) => (
                  <button key={r.id} onClick={() => openPanel({ type: 'order' })}
                    style={{ display: 'flex', gap: 8, alignItems: 'baseline', background: 'transparent', border: 'none', color: 'inherit', fontSize: 12, cursor: 'pointer', padding: 0, textAlign: 'left' }}>
                    <span style={{ minWidth: 150 }}>{r.name}: {r.spoiled} món · vốn {formatMoney(r.cost)} →</span>
                    <span style={{ opacity: 0.8 }}>
                      {r.kind === 'cold' ? 'cần lạnh để ngoài tủ' : r.kind === 'short' ? 'món tươi hạn ngắn, nhập nhiều không kịp bán' : 'để lâu hết hạn'}
                    </span>
                  </button>
                ))}
              </div>
              <div style={{ fontSize: 12, opacity: 0.75, marginTop: 3 }}>Giảm bớt nhập món hay hỏng hoặc cất tủ lạnh hàng mát — chỉnh ở Nhập hàng.</div>
            </Callout>
          )}
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

/**
 * Sổ đầu ngày: mọi thứ cần biết để chuẩn bị trong một màn hình — dịp lễ, hàng hot,
 * khách quen dự kiến ghé (và món họ thích còn trong kho không), lời hẹn giữ món,
 * hợp đồng tới kỳ giao và khe giờ điện thoại. Chỉ liệt kê, không tự quyết thay người chơi.
 */
export function MorningPanel() {
  const { day, level, xp, weatherSeed, weather, forecast, regulars, reservations, storage,
    furniture, staff, contracts, deliveries, shopTier, closePanel, openPanel, repLog, history,
    storageLots, debts, biz, money, branch, licenses, skills, happyHour, analytics, marketClearedDay,
    demand: stateDemand, activeCombos, priceOf, sellMarketSurplus, stats } = useGame();
  const branchChores = branch ? branchMorningPlan(branch, storageUsed(storage), licenses, day) : [];
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
  const quanHealth = biz.quanNuoc.open ? quanNuocHealth(biz.quanNuoc, level, storage, biz.quanNuocLast ?? null) : null;
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
  const expected = regularsExpectedToday(day, weatherSeed, level, regulars, rep);
  const resList = Object.entries(reservations).filter(([, r]) => r.day === day);
  const haveStock = (id: string) => (storage[id] ?? 0) > 0 || furniture.some((f) => f.tiers.some((t) => t.productId === id && t.count > 0))
    || deliveries.some((d) => (d.items[id] ?? 0) > 0);
  const dueContracts = Object.entries(contracts)
    .map(([id, cs]) => ({ cs, def: supplyContractById(cs.defId) }))
    .filter(({ cs, def }) => def && cs.dueDay <= day + 1);
  // GĐ76: gộp mọi nhắc chuẩn bị ngày thành một danh sách ưu tiên (danger trước, khử trùng, cap 7).
  const candidates: DayAction[] = [];
  for (const c of branchChores) candidates.push({ icon: c.icon, text: c.text, panel: 'branch', danger: c.danger, priority: 1 });
  // GĐ189: quán nước thiếu kho — trước giờ chỉ là thẻ thụ động, giờ thành việc sáng ưu tiên (nạp đồ uống).
  const quanAction = quanNuocDayAction(quanHealth);
  if (quanAction) candidates.push(quanAction);
  for (const { cs, def } of dueContracts) candidates.push({ icon: '📦', text: `${def!.title}: giao trước ngày ${cs.dueDay}`, panel: 'contracts', danger: cs.dueDay <= day, priority: cs.dueDay <= day ? 0 : 2 });
  if (biz.loan && biz.loan.dueDay - day <= 3) candidates.push({ icon: '🏦', text: `Nợ ngân hàng sắp hạn (${Math.max(0, biz.loan.dueDay - day)} ngày)`, panel: 'business', danger: true, priority: 0 });
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
  const actions = planDay(candidates);
  // GĐ132: mồi "🧭 Sắp mở khóa" cho người chơi MỚI (tuần đầu) — 1–2 hệ lớn sắp mở + XP còn thiếu (thuần đọc)
  const earlyUnlocks = earlyUnlockTeaser({ level, xp, day });
  // GĐ135: mồi "🧺 Hôm nay chợ phiên" — bản đánh giá (preview, pure-read) hàng DƯ đáng gánh ra bán.
  // Chỉ hiện ngày chợ (mỗi tuần từ ngày 7), khi có món dư, và chưa bán hôm nay. Bán thật ở GĐ136.
  const chophien = marketClearedDay === day ? null : marketClearValue({
    day, storage, shelved,
    health: itemHealthList(analytics, level, storage, shelved, stateDemand),
  });
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

      {/* GĐ199: Rốn kho chung — nối tiệm chính + chi nhánh + quán nước về một rốn kho (trục multi-shop).
          Liệt kê mỗi điểm bán còn dư/cạn + điểm nghẽn nên xử lý trước (quán nước deterministic,
          chi nhánh & kho chung quan sát được). Thuần đọc, không đổi save/kinh tế. */}
      {(() => {
        const sc = supplyChainOverview(storage, branch ?? undefined, biz.quanNuoc, level, biz.quanNuocLast ?? null);
        return (
          <Callout tone={sc.choke ? (sc.choke.state === 'danger' ? 'danger' : 'warn') : 'info'} style={{ marginBottom: 8 }}
            title={<>🔗 Rốn kho chung{sc.choke ? ` — nghẽn: ${sc.choke.icon} ${sc.choke.name}` : ''}</>}>
            <div style={{ marginTop: 4, display: 'grid', gap: 3 }}>
              {sc.outlets.filter((o) => o.state !== 'idle').map((o) => (
                <div key={o.id} style={{ fontSize: 12, color: o.state === 'danger' ? '#e74c3c' : o.state === 'warn' ? '#e67e22' : 'inherit', opacity: o.state === 'ok' ? 0.85 : 1 }}>
                  {o.icon} <b>{o.name}</b>: {o.line}
                </div>
              ))}
               {sc.choke && <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>Xử lý điểm nghẽn trước — nguồn cho các điểm còn lại là kho chung.</div>}
              {(() => {
                // GĐ202: "Phiếu nạp kho" — biến gợi ý thành số đơn vị cụ thể cần chở/nhập cho từng điểm bán.
                const rm = supplyRestockManifest(storage, branch ?? undefined, biz.quanNuoc, level, biz.quanNuocLast ?? null);
                if (rm.total === 0 && sc.choke) return null;
                return (
                  <div style={{ marginTop: 6, borderTop: '1px dashed rgba(255,255,255,0.18)', paddingTop: 6 }}>
                    <div style={{ fontSize: 12 }}>🧾 Phiếu nạp kho: {rm.line}</div>
                    {rm.lines.length > 0 && (
                      <div style={{ marginTop: 3, display: 'grid', gap: 2, fontSize: 11, opacity: 0.9 }}>
                        {rm.lines.map((l, i) => (
                          <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'space-between' }}>
                            <span>
                              {l.outlet === 'teahouse' ? '🍵' : '🏪'} <b>{l.label}</b>: thêm <b>{l.need.toLocaleString('vi-VN')}</b> (kho chung có {l.inWarehouse.toLocaleString('vi-VN')}) — {l.source === 'warehouse' ? 'chở được' : 'nhập thêm'}
                            </span>
                            <button onClick={() => openPanel({ type: l.outlet === 'teahouse' ? ('quannuoc' as never) : ('branch' as never) })}
                              style={{ ...styles.btn, fontSize: 11, padding: '1px 6px', flex: '0 0 auto' }}>
                              {l.source === 'warehouse' ? 'nạp →' : 'nhập →'}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </Callout>
        );
      })()}

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

      {/* 🛒 Nhu cầu quầy: dự báo cầu theo giờ của tiệm chính (GĐ78) */}
      <div style={{ ...styles.card, display: 'block', marginBottom: 8, outline: '1px solid rgba(46,204,113,0.35)' }}>
        <b style={styles.cardTitle}>🛒 Nhu cầu quầy hôm nay</b>
        <div style={{ fontSize: 12, marginTop: 2, opacity: 0.9 }}>
          ~{demand.expectedTotal} khách dự kiến cả ngày · đỉnh: {demand.peakBands.join(', ')} (ước lượng theo nhịp + lễ/thời tiết)
        </div>
        <div style={{ marginTop: 6, display: 'flex', alignItems: 'flex-end', gap: 4, height: 44 }}>
          {demand.bands.map((b, i) => (
            <div key={i} title={`${b.label}: ~${b.expected} khách (${b.perHour}/giờ)`} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <div style={{ width: '100%', height: Math.max(4, Math.round(b.pressure / 100 * 34)), background: b.peak ? '#2ecc71' : 'rgba(46,204,113,0.45)', borderRadius: 3 }} />
              <span style={{ fontSize: 9, opacity: 0.8, whiteSpace: 'nowrap' }}>{b.label}</span>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 12, marginTop: 4 }}>
          ⏰ {demand.bands.filter((b) => b.peak).slice(0, 2).map((b) => b.label).join(' · ') || demand.bands[0]?.label} đông: bày sẵn món &nbsp;
          <button onClick={() => openPanel({ type: 'order' })} style={{ ...styles.btn, fontSize: 11, padding: '1px 6px' }}>châm kệ món tủ →</button>
          · <button onClick={() => openPanel({ type: 'staff' })} style={{ ...styles.btn, fontSize: 11, padding: '1px 6px' }}>đủ người đứng quầy →</button>
        </div>
        <div style={{ fontSize: 12, marginTop: 4, paddingTop: 4, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          🧭 Nếp vận hành: chuỗi <b>{cleanStreak}</b> ngày sạch · kỷ lục <b>{biz.cleanBest ?? 0}</b> · {cleanExtra}
        </div>
      </div>

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
                : `Còn thiếu ${formatMoney(-sol.margin)} để trả gốc vay nếu hôm nay không bán thêm — kíp bơm doanh thu hoặc xả sỉ/gánh chợ (GĐ211).`}
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
              <b>Còn {fv.inDays} ngày:</b> khách ×{fv.traffic} ({fvDelta})
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

/** Sổ nợ: khách quen ghi sổ, nhắc nợ hoặc xoá nợ; bật/tắt cho ghi sổ. */
export function DebtBook() {
  const { level, day, debts, regulars, allowCredit, setAllowCredit, remindDebt, forgiveDebt, counterPolicy, setCounterPolicy } = useGame();
  if (level < CREDIT_UNLOCK) return null;
  const rows = Object.entries(debts).filter(([, d]) => d.amount > 0);
  const total = rows.reduce((n, [, d]) => n + d.amount, 0);
  const ledger = debtLedger(debts, day);
  const policy = counterPolicy ?? defaultCounterPolicy();
  const summ = counterPolicySummary(policy);
  return (
    <>
    <div style={{ ...styles.card, display: 'block', maxWidth: 560, marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <b>📒 Sổ nợ {rows.length ? `· ${formatMoney(total)}` : ''}</b>
        <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
          <input type="checkbox" checked={allowCredit} onChange={(e) => setAllowCredit(e.target.checked)} /> Cho ghi sổ
        </label>
      </div>
      <div style={{ fontSize: 12, opacity: 0.75, marginTop: 2 }}>
        Khách quen từ {CREDIT_FRIENDSHIP} 💛 có lúc quên ví, xin ghi sổ (hạn mức theo độ thân). Thường lần ghé sau sẽ trả.
        Quá {DEBT_LATE_DAYS} ngày nên nhắc nợ; quá {DEBT_WRITE_OFF_DAYS} ngày coi như mất.
      </div>
      {ledger.count > 0 && (
        <div style={{ fontSize: 12, marginTop: 4, fontWeight: 600, color: ledger.writeOffTonightAmount > 0 ? '#e74c3c' : ledger.lateAmount > 0 ? '#e67e22' : '#3498db' }}>
          {ledger.lockedTotal > 0 && <>Tổng nợ đang khóa <b>{formatMoney(ledger.lockedTotal)}</b> tiền mặt.</>}
          {ledger.writeOffTonightAmount > 0
            ? <> <b>{formatMoney(ledger.writeOffTonightAmount)}</b> quá {DEBT_WRITE_OFF_DAYS} ngày — <b>sẽ mất hẳn tối nay</b> nếu không nhắc/xoá!</>
            : ledger.lateAmount > 0
              ? <> {ledger.lateCount} món quá hạn ({formatMoney(ledger.lateAmount)}) — còn {Math.min(...ledger.rows.filter((r) => r.late && !r.writeOffTonight).map((r) => r.daysLeft), DEBT_WRITE_OFF_DAYS)} ngày nữa là mất hẳn. Hãy nhắc/xoá.</>
              : <> Còn trong hạn — nhớ nhắc/xoá khi tới hạn.</>}
        </div>
      )}
      {!rows.length && <div style={{ fontSize: 12, marginTop: 4 }}>Chưa ai nợ.</div>}
      {rows.map(([id, d]) => {
        const r = regularById(id);
        const age = day - d.since;
        const daysLeft = DEBT_WRITE_OFF_DAYS - age;
        const aboutToLose = daysLeft <= 0;
        return (
          <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, fontSize: 13, background: aboutToLose ? 'rgba(231,76,60,0.10)' : undefined, borderRadius: 4 }}>
            <span style={{ flex: 1 }}>
              {r?.name}: <b>{formatMoney(d.amount)}</b>
              <span style={{ opacity: 0.7, fontSize: 12, color: aboutToLose ? '#e74c3c' : age >= DEBT_LATE_DAYS ? '#e67e22' : undefined }}>
                {' '}· {age} ngày · hạn mức {formatMoney(creditLimit(regulars[id]))}{d.reminded ? ' · đã nhắc' : ''}
                {aboutToLose
                  ? <b style={{ color: '#e74c3c' }}> — MẤT HẲN tối nay!</b>
                  : age >= DEBT_LATE_DAYS
                    ? ` — còn ${daysLeft} ngày nữa mất hẳn`
                    : ''}
              </span>
            </span>
            <button style={styles.btn} disabled={d.reminded} onClick={() => remindDebt(id)} title="Lần ghé tới chắc chắn trả, nhưng khách hơi ngại">Nhắc nợ</button>
            <button style={styles.btn} onClick={() => forgiveDebt(id)} title="Mất tiền nhưng khách thân hơn">Xoá nợ</button>
          </div>
        );
      })}
    </div>
    <div style={{ ...styles.card, display: 'block', maxWidth: 560, marginBottom: 8 }}>
      <div style={{ fontSize: 13 }}><b>🧾 Chính sách quầy</b> <span style={{ opacity: 0.7, fontSize: 11 }}>thái độ mặc cả & tiền lẻ</span></div>
      <div style={{ fontSize: 12, opacity: 0.75, marginTop: 2 }}>{summ.haggleText} {summ.changeText}</div>
      <div style={{ marginTop: 6 }}>
        <div style={{ fontSize: 12, opacity: 0.85 }}>🙏 Mặc cả</div>
        {HAGGLE_OPTS.map((o) => (
          <label key={o.value} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 12, marginTop: 3, cursor: 'pointer' }}>
            <input type="radio" name="counter-haggle" checked={policy.haggle === o.value} onChange={() => setCounterPolicy({ haggle: o.value })} style={{ marginTop: 2 }} />
            <span>
              <b>{o.label}</b>
              <span style={{ display: 'block', opacity: 0.7 }}>{o.note}</span>
            </span>
          </label>
        ))}
      </div>
      <div style={{ marginTop: 6 }}>
        <div style={{ fontSize: 12, opacity: 0.85 }}>🪙 Tiền lẻ</div>
        {CHANGE_OPTS.map((o) => (
          <label key={o.value} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 12, marginTop: 3, cursor: 'pointer' }}>
            <input type="radio" name="counter-change" checked={policy.change === o.value} onChange={() => setCounterPolicy({ change: o.value })} style={{ marginTop: 2 }} />
            <span>
              <b>{o.label}</b>
              <span style={{ display: 'block', opacity: 0.7 }}>{o.note}</span>
            </span>
          </label>
        ))}
      </div>
      <div style={{ fontSize: 11, opacity: 0.6, marginTop: 6 }}>Nhắc mỗi lần = như trước (bạn quyết từng đơn). Luôn/không/thối kẹo = tự xử lý mãi, khỏi hỏi lại.</div>
    </div>
    </>
  );
}

export function AdviceCard({ title, items, onAct }: { title: string; items: Advice[]; onAct: (a: Advice) => void }) {
  return (
    <div style={{ ...styles.card, display: 'block', marginTop: 10, maxWidth: 560 }}>
      <b style={styles.cardTitle}>{title}</b>
      {items.map((a, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, marginTop: 4 }}>
          <span style={{ flex: 1 }}>{a.icon} {a.text}</span>
          {a.action && <button style={{ ...styles.btn, whiteSpace: 'nowrap' }} onClick={() => onAct(a)}>{ACTION_LABEL[a.action]}</button>}
        </div>
      ))}
    </div>
  );
}

/** Khách ghé theo giờ: cột cao nhất là giờ đông nhất. */
export function HourChart({ hours, peak, quiet }: { hours: HourStat[]; peak?: number; quiet?: number }) {
  const max = Math.max(1, ...hours.map((h) => h.customers));
  return (
    <div style={{ ...styles.card, display: 'block', marginTop: 10, maxWidth: 560 }}>
      <b style={styles.cardTitle}>🕒 Khách theo giờ</b>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 70, marginTop: 6 }}>
        {hours.map((h) => (
          <div key={h.hour} title={`${h.hour}h: ${h.customers} khách · ${formatMoney(h.revenue)}`} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
            <span style={{ fontSize: 10 }}>{h.customers || ''}</span>
            <div style={{ width: '100%', height: `${(h.customers / max) * 50}px`, minHeight: h.customers ? 2 : 0, borderRadius: 3, background: h.hour === peak ? '#e67e22' : h.hour === quiet ? '#95a5a6' : '#3498db' }} />
            <span style={{ fontSize: 10, opacity: 0.7 }}>{h.hour}h</span>
          </div>
        ))}
      </div>
      {peak !== undefined && (
        <div style={{ fontSize: 12, marginTop: 4 }}>
          🟠 Đông nhất {peak}h–{peak + 1}h{quiet !== undefined && <> · ⚪ vắng nhất {quiet}h–{quiet + 1}h (lúc rảnh để dọn dẹp, châm hàng)</>}
        </div>
      )}
    </div>
  );
}

/** Danh tiếng 5 mặt, mặt yếu nhất kèm cách sửa, và những gì danh tiếng đang mở hoặc còn khoá. */
export function ReputationCard({ log }: { log: RepSample[] }) {
  const { level, regulars, furniture } = useGame();
  const rep = reputationOf(log);
  // GĐ148: định lượng phần thưởng khách-vào-cửa của danh tiếng (customers.ts:197)
  const plants = furniture.filter((f) => f.type === 'plant').length;
  const payoff = repPayoff(rep, level, plants);
  const focus = repPayoffFocus(rep, level);
  // Chưa đủ lượt khách: reputationOf trả placeholder 3.0 — không được hiện như điểm thật (GĐ37)
  const insufficient = rep.samples < REP_MIN_SAMPLES;
  const gated = [
    ...SUPPLY_CONTRACTS.filter((c) => c.rep && c.unlock <= level + 5).map((c) => ({ name: `${c.icon} Hợp đồng ${c.title}`, need: c.rep! })),
    ...REGULARS.filter((r) => !regulars[r.id]?.visits && r.unlock <= level + 5 && regularRep(r)).map((r) => ({ name: `💛 Khách quen ${r.name}`, need: regularRep(r)! })),
  ].filter((g) => !meetsRep(rep, g.need)).slice(0, 4);
  return (
    <div style={{ ...styles.card, display: 'block', marginBottom: 10, maxWidth: 560 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <b>⭐ Danh tiếng {insufficient ? 'chưa đủ khách' : `${rep.overall.toFixed(1)}★`}</b>
        <span style={{ fontSize: 12, opacity: 0.7 }}>{rep.samples} lượt khách gần nhất</span>
      </div>
      {insufficient && <div style={{ fontSize: 12, opacity: 0.75 }}>Cần ít nhất {REP_MIN_SAMPLES} lượt khách mới chấm được để có điểm thật.</div>}
      {REP_FACTORS.map((k) => (
        <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, marginTop: 4, opacity: insufficient ? 0.4 : 1 }}>
          <span style={{ width: 130 }}>{REP_INFO[k].icon} {REP_INFO[k].name}</span>
          <div style={{ flex: 1, height: 6, background: '#555', borderRadius: 3 }}>
            <div style={{ width: `${((rep.factors[k] - 1) / 4) * 100}%`, height: '100%', borderRadius: 3, background: starColor(Math.round(rep.factors[k])) }} />
          </div>
          <span style={{ width: 30, textAlign: 'right' }}>{insufficient ? '—' : rep.factors[k].toFixed(1)}</span>
        </div>
      ))}
      {rep.weakest && rep.factors[rep.weakest] < 4 && (
        <div style={{ fontSize: 12, marginTop: 6 }}>💡 Yếu nhất: <b>{REP_INFO[rep.weakest].name}</b>. {REP_INFO[rep.weakest].low}{!payoff.insufficient && focus.gainKhach > 0 && (
          <span style={{ color: '#e67e22' }}> Nâng mặt này lên 4★ được thêm <b>~{focus.gainKhach} khách/ngày</b>.</span>
        )}</div>
      )}
      {!payoff.insufficient && (
        <div style={{ fontSize: 12, marginTop: 6, color: payoff.extraKhach >= 0 ? '#2ecc71' : '#e74c3c' }}>
          🚶 Danh tiếng làm <b>{Math.abs(payoff.pct * 100).toFixed(0)}%</b> người đi đường ghé{payoff.extraKhach >= 0 ? ' hơn' : ' ít hơn'} →{' '}
          <b>{payoff.extraKhach >= 0 ? '~+' : '~−'}{Math.abs(payoff.extraKhach)} khách/ngày</b>
          <span style={{ opacity: 0.75 }}> (cấp {level}). Nâng 0.5★: thêm ~{payoff.nextStarKhach} khách/ngày.</span>
        </div>
      )}
      {gated.length > 0 && (
        <div style={{ fontSize: 12, marginTop: 6 }}>
          🔒 Danh tiếng sẽ mở: {gated.map((g) => `${g.name} (${describeRep(g.need)})`).join(' · ')}
        </div>
      )}
      <div style={{ fontSize: 11, opacity: 0.65, marginTop: 4 }}>Danh tiếng cao thì nhiều người đi đường ghé hơn, mở khách quen mới, hợp đồng và mục tiêu dịp lễ lớn.</div>
    </div>
  );
}

/** Bảng theo món: bấm tiêu đề để sắp xếp. */
export function ItemTable({ lines }: { lines: (ItemLine & { id: string; gross: number })[] }) {
  const [sort, setSort] = useState<'qty' | 'revenue' | 'gross'>('gross');
  if (!lines.length) return <p style={styles.sub}>Hôm nay chưa bán được món nào.</p>;
  const rows = [...lines].sort((a, b) => b[sort] - a[sort]);
  const head = (key: typeof sort, label: string) => (
    <th style={{ cursor: 'pointer', textDecoration: sort === key ? 'underline' : undefined }} onClick={() => setSort(key)}>{label}{sort === key ? ' ▾' : ''}</th>
  );
  return (
    <div style={{ overflowX: 'auto' }}>
    <table style={styles.table}>
      <thead>
        <tr><th style={styles.left}>Mặt hàng</th>{head('qty', 'Số món')}{head('revenue', 'Doanh thu')}{head('gross', 'Lãi gộp')}<th>Lãi/món</th></tr>
      </thead>
      <tbody>
        {rows.map((l) => {
          const p = productById(l.id);
          return (
            <tr key={l.id}>
              <td style={styles.left}><ProductIcon product={p} /> {p.name}</td>
              <td>{l.qty}</td>
              <td>{formatMoney(l.revenue)}</td>
              <td style={{ color: l.gross >= 0 ? '#2ecc71' : '#e74c3c' }}>{formatMoney(l.gross)}</td>
              <td style={{ opacity: 0.8 }}>{formatMoney(Math.round(l.gross / l.qty))}</td>
            </tr>
          );
        })}
      </tbody>
      </table>
    </div>
  );
}

/** Cột doanh thu và đường "tiền vào − tiền ra" của các ngày gần đây. */
export function HistoryChart({ history }: { history: DayRecord[] }) {
  if (history.length < 2) return null;
  const max = Math.max(1, ...history.map((h) => Math.max(h.revenue, Math.abs(h.profit))));
  const H = 70;
  return (
    <div style={{ marginTop: 12, maxWidth: 560 }}>
      <div style={{ fontSize: 12, marginBottom: 6, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '4px 12px' }}>
        <span style={{ opacity: 0.75 }}>{history.length} ngày gần đây</span>
        {([['#f1c40f', 'Doanh thu'], ['#2ecc71', 'Tiền vào − ra: lãi'], ['#e74c3c', 'Tiền vào − ra: lỗ']] as const).map(([color, label]) => (
          <span key={label} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <i style={{ width: 11, height: 11, borderRadius: 3, background: color, display: 'inline-block' }} />
            {label}
          </span>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: H + 18 }}>
        {history.map((h) => (
          <div key={h.day} title={`Ngày ${h.day}: doanh thu ${formatMoney(h.revenue)}, tiền vào − ra ${formatMoney(h.profit)}, ${h.customers} khách`}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 1, height: H }}>
              <div style={{ width: 7, height: (h.revenue / max) * H, background: '#f1c40f', borderRadius: 2 }} />
              <div style={{ width: 7, height: (Math.abs(h.profit) / max) * H, background: h.profit >= 0 ? '#2ecc71' : '#e74c3c', borderRadius: 2 }} />
            </div>
            <span style={{ fontSize: 10, opacity: 0.6 }}>{h.day}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Sổ theo dõi: biểu đồ doanh thu – lãi – khách – sao của tối đa 30 ngày gần nhất (kèm số hôm nay đang chạy). */
export function HistoryPanel() {
  const { history, stats, day, closePanel } = useGame();
  const shelfHeat = useGame((s) => s.shelfHeat);
  const furnitureList = useGame((s) => s.furniture);
  const today: DayRecord = {
    day,
    revenue: stats.revenue,
    profit: stats.revenue - stats.spent - (stats.wages ?? 0) - (stats.rent ?? 0),
    customers: stats.customers,
    unhappy: stats.unhappy,
  };
  const days = [...history, today].slice(-14);
  const W = 620;
  const H = 190;
  const padL = 8;
  const padB = 22;
  const stepX = days.length > 1 ? (W - padL * 2) / (days.length - 1) : 0;
  const maxMoney = Math.max(...days.map((d) => Math.max(d.revenue, d.profit)), 1);
  const maxCust = Math.max(...days.map((d) => d.customers), 1);
  const x = (i: number) => padL + i * stepX;
  const yMoney = (v: number) => H - padB - (Math.max(v, 0) / maxMoney) * (H - padB - 10);
  const yCust = (v: number) => H - padB - (v / maxCust) * (H - padB - 10);
  const line = (pick: (d: DayRecord) => number) => days.map((d, i) => `${x(i)},${yMoney(pick(d))}`).join(' ');
  // Đường sao 1–5: vẽ trên cùng khung hình, càng cao càng tốt
  const rated = days.map((d, i) => ({ d, i })).filter(({ d }) => typeof d.rating === 'number');
  const ratingLine = rated.map(({ d, i }) => `${x(i)},${H - padB - ((d.rating! - 1) / 4) * (H - padB - 10)}`).join(' ');
  const best = [...days].sort((a, b) => b.profit - a.profit)[0];
  const avgProfit = days.reduce((n, d) => n + d.profit, 0) / days.length;
  const zero = H - padB;
  return (
    <>
      <h2 style={styles.title}>📈 Sổ theo dõi 30 ngày</h2>
      <p style={styles.sub}>Doanh thu và lãi từng ngày (lãi hôm nay chưa trừ lương/tiền nhà tới khi sang ngày mới). Cột xám là số lượt khách. Dùng để nhìn đà tăng trưởng: nhập thêm hàng thì doanh thu có nhích không, khách có đông dần không.</p>
      {/* viewBox để SVG co theo panel (max-width:100%) thay vì giữ cố định 600px tràn ngang màn hẹp */}
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', maxWidth: 600, background: '#fafbfc', borderRadius: 8, border: '1px solid #e3e6ea' }}>
        <line x1={padL} y1={zero} x2={W - padL} y2={zero} stroke="#d6dae0" />
        {days.map((d, i) => (
          <g key={d.day}>
            <rect x={x(i) - 6} y={yCust(d.customers)} width={12} height={Math.max(1, zero - yCust(d.customers))} fill="#d9dee5" opacity={0.9}>
              <title>{`Ngày ${d.day}: ${d.customers} lượt khách`}</title>
            </rect>
                <text x={x(i)} y={H - 6} textAnchor="middle" fontSize={10} fill="#8a919c">{d.day}</text>
          </g>
        ))}
        <polyline points={line((d) => d.revenue)} fill="none" stroke="#3498db" strokeWidth={2} />
        <polyline points={line((d) => d.profit)} fill="none" stroke="#2ecc71" strokeWidth={2} />
        {rated.length > 1 && <polyline points={ratingLine} fill="none" stroke="#f1c40f" strokeWidth={2} strokeDasharray="5 3" />}
      </svg>
      <p style={{ ...styles.sub, marginTop: 8 }}>
        <span style={{ color: '#3498db' }}>━ Doanh thu</span> · <span style={{ color: '#2ecc71' }}>━ Lãi</span> · <span style={{ color: '#f1c40f' }}>╌ ⭐ đánh giá</span> · ▮ Khách
      </p>
      <p style={styles.row}>
        🏆 Lãi nhất: <b>ngày {best.day}</b> — doanh thu {formatMoney(best.revenue)}, lãi {formatMoney(best.profit)}
      </p>
      <p style={{ ...styles.row, flexWrap: 'wrap' }}>📊 Lãi bình quân {days.length} ngày: <b>{formatMoney(avgProfit)}</b>/ngày · khách bình quân <b>{Math.round(days.reduce((n, d) => n + d.customers, 0) / days.length)}</b> lượt/ngày</p>
      {/* Heatmap vị trí kệ: kệ nào bán chạy nhất kể từ khi đặt (xem bản đồ màu ở màn 🏪 Sắp xếp → 🔥) */}
      {(() => {
        const ranked = furnitureList
          .filter((f) => furnitureDef(f.type).tiers > 0)
          .map((f) => ({ f, sold: shelfHeat[f.uid] ?? 0 }))
          .sort((a, b) => b.sold - a.sold);
        if (!ranked.length || ranked.every((r) => r.sold === 0)) return null;
        const top = ranked[0];
        const worst = ranked[ranked.length - 1];
        return (
          <p style={styles.row}>
            🔥 Kệ bán chạy nhất: <b>{furnitureDef(top.f.type).name}</b> ({top.sold} món)
            {worst.sold < top.sold && <> · kệ ế nhất: {furnitureDef(worst.f.type).name} ({worst.sold} món)</>}
            <> · xem bản đồ màu ở <b>🏪 Sắp xếp → 🔥</b>, kệ gần cửa/lối đi được khách để ý hơn</>
          </p>
        );
      })()}
      <Footer onClose={closePanel} />
    </>
  );
}
