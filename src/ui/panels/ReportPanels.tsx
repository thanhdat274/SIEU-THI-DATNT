import { giftReportLine } from '../../data/regularGift';
import { trendMark } from '../trendMark';
import { machineDayTotal } from '../../data/machines';
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
import { expiringSoon, expiryAdvice, peakAdvice, peakHours, spoilNightReport, storeMissRevenue, waitLossStats, walkoutAdvice, waitMoneyCost, type Advice } from '../../data/advice';
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
import { impulseRecap } from '../../data/layout';
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
import { selfCheckoutPayoff } from '../../data/selfCheckoutPayoff';
import { AdviceCard, HourChart, ItemTable, HistoryChart } from './HistoryPanel';
import { SummaryMoneyCards } from './SummaryCards';
import { Callout, Stat, Footer, Swatch, styles, Tabs } from './shared';
import { t } from '../../core/i18n';

/** Day-stats rỗng: SummaryPanel phải render được kể cả khi panel mở thiếu stats (đường mở lạ,
 * save lệch schema) — đọc `.revenue` trên undefined là sập toàn bộ UI (GĐ93 audit bắt được). */
export const EMPTY_DAY_STATS: DayStats = { revenue: 0, spent: 0, wages: 0, itemsSold: 0, customers: 0, unhappy: 0, xp: 0 };

export function SummaryPanel({ day }: { day: number }) {
  const panel = useGame((s) => s.panel);
  const { level, xp, history, openPanel, setShift, notify, storage, storageLots, furniture, priceOf, riskTrend, staff, skills, soldEver, comboHitCount, biz, weatherSeed, weather, regulars, totals, repLog, giftStreak, giftLastDay, giftGraceDay, happyHour, analytics, demand: stateDemand, marketLast, debts, questLog } = useGame();
  const [tab, setTab] = useState<'overview' | 'items'>('overview');
  // GĐ1826 (review người chơi R8): ngày 1–2 gập các khối "nâng cao" (kỷ lục, ca đêm, thanh toán,
  // giờ bán...) sau nút "Xem chi tiết" — tổng kết ngày đầu chỉ giữ lõi: tiền, lãi bán thật, việc cần làm.
  const [more, setMore] = useState(day > 2);
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
  const tabs = [['overview', t('panels_report.tong_quan')], ['items', t('panels_report.theo_mon', { length: lines.length })]] as const;
  const shopName = useGame((s) => s.shopName);
  return (
    <>
      <h2 style={styles.title}>🌙 {shopName}{' '}{t('panels_report.tong_ket_ngay')}{' '}{day}</h2>
      {panel.fainted !== undefined && (
        <div style={{ background: '#4a2a2a', borderRadius: 8, padding: '8px 12px', margin: '0 0 8px', fontSize: 13 }}>
          {t('panels_report.hom_qua_ban_thuc_qua_khuya')}{' '}{formatMoney(panel.fainted)}{' '}{t('panels_report.tien_thuoc_toi_nay_nho_ve')}
        </div>
      )}
      <Tabs tabs={tabs} value={tab} onChange={setTab} />
      {tab === 'overview' ? (
        <>
          {/* GĐ126: Thẻ "Mai tiệm có gì" — mồi quay lại ngày mai. Đọc state có sẵn (đã sang ngày
              mới nên `weather`, `day`… là của MAI), không đổi save/kinh tế. Ẩn khi không có dòng. */}
          {teaserRows.length > 0 && (
            <Callout tone="accent" title={t('panels_report.mai_tiem_co_gi')} style={{ marginTop: 8 }}>
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
            <Callout tone="ok" title={t('panels_report.cho_phien_hom_nay')} style={{ marginTop: 8 }}>
              <div style={{ fontSize: 12, marginTop: 4 }}>
                {t('panels_report.da_ganh')}{' '}<b>{marketLast.units}{' '}{t('panels_report.mon_du')}</b>{' '}{t('panels_report.ra_cho_thu_ve')}{' '}<b>{formatMoney(marketLast.revenue)}</b>{' '}{t('panels_report.thay_vi_de_e_hong')}
              </div>
            </Callout>
          )}
          {marketTom && (
            <Callout tone="ok" title={t('panels_report.cho_phien_ngay_mai')} style={{ marginTop: 8 }}>
              <div style={{ marginTop: 2 }}>
                {marketTom.rows.map((r) => (
                  <div key={r.id} style={{ display: 'flex', gap: 8, alignItems: 'baseline', fontSize: 12 }}>
                    <span style={{ minWidth: 150 }}>{r.name}: {r.qty}{' '}{t('panels_report.mon')}</span>
                    <span style={{ opacity: 0.8 }}>~{formatMoney(r.est)} · {r.reason === 'cold' ? t('panels_report.can_lanh_du') : t('panels_report.ban_cham')}</span>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 12, marginTop: 4 }}>
                {t('panels_report.ganh')}{marketTom.units}{' '}{t('panels_report.mon_du_ra_cho_ngay_mai')}<b>{formatMoney(marketTom.total)}</b>{' '}{t('panels_report.thay_vi_de_e_hong')}
              </div>
            </Callout>
          )}
          {!payoff148.insufficient && Math.abs(payoff148.extraKhach) >= 3 && (
            <Callout tone="event" style={{ marginTop: 8 }}>
              <button onClick={() => openPanel({ type: 'reviews' })} title={t('panels_report.xem_chi_tiet_danh_tieng')}
                style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left', color: 'inherit', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}>
                <b style={{ fontSize: 13, color: '#9b59b6' }}>{t('panels_report.danh_tieng')}{' '}{rep148.overall.toFixed(1)}★</b>
                <span style={{ marginLeft: 'auto', fontSize: 11, opacity: 0.7 }}>xem →</span>
              </button>
              <div style={{ fontSize: 12, marginTop: 4, color: payoff148.extraKhach >= 0 ? '#2ecc71' : '#e74c3c' }}>
                {payoff148.extraKhach >= 0
                  ? <>{t('panels_report.giu_phong_do_giup_tiem_duoc')}{' '}<b>~{payoff148.extraKhach}{' '}{t('panels_report.khach_ngay')}</b> ({Math.round(Math.abs(payoff148.pct) * 100)}{t('panels_report.nguoi_di_duong')}</>
                  : <>{t('panels_report.danh_tieng_dang_tut_mat_khoang')}{' '}<b>~{Math.abs(payoff148.extraKhach)}{' '}{t('panels_report.khach_ngay')}</b>{t('panels_report.sua_mat_yeu_nhat_de_hut')}</>}
                <span style={{ opacity: 0.75 }}>{' '}{t('panels_report.nang_0_5_them')}{payoff148.nextStarKhach}{' '}{t('panels_report.khach_ngay_2')}</span>
                {(() => {
                  const rm = repMoney(payoff148, avgPerVisit(st.revenue, st.customers));
                  return (
                    <div style={{ marginTop: 4, opacity: 0.9 }}>
                      ≈ <b>{formatMoney(rm.moneyPerDay)}</b>{' '}{t('panels_report.doanh_thu_ngay_vi')}{' '}{rm.moneyPerDay >= 0 ? t('panels_report.co') : t('panels_report.thieu')}{' '}{t('panels_report.danh_tieng_nang_0_5')}{formatMoney(rm.nextStarMoney)}{t('panels_report.ngay')}
                    </div>
                  );
                })()}
              </div>
            </Callout>
          )}
          {hasMeatCounter && butcherV.skill < MAX_BUTCHER_STAR && meatToday.revenue > 0 && (
            <Callout tone={butcherV.present ? 'warn' : 'danger'} strong={!butcherV.present} style={{ marginTop: 8 }}
              title={<>{t('panels_report.thit_ca_hom_nay_thu')}{' '}{formatMoney(meatToday.revenue)}</>}
              actions={
                <div style={{ marginTop: 6 }}>
                  <button onClick={() => openPanel({ type: 'staff' })} style={{ ...styles.btn, fontSize: 11, padding: '2px 8px' }}>
                    {butcherV.present ? t('panels_report.nang_nguoi_ban_thit_ca') : t('panels_report.xep_nguoi_ban_thit_ca')}
                  </button>
                </div>
              }>
              <div style={{ fontSize: 12, marginTop: 4 }}>
                {butcherV.present
                  ? <>{t('panels_report.nguoi_ban_thit_ca')}{' '}{butcherV.skill}{t('panels_report.truc_ban_duoc')}{butcherV.pct}{t('panels_report.nhu_cau_thit_ca')}</>
                  : <>{t('panels_report.khong_co_nguoi_ban_thit_ca')}{butcherV.pct}{t('panels_report.nhu_cau_quay_thit_ca_gan')}</>}
                {meatMissed149 > 0 && (
                  <span style={{ color: '#f1c40f' }}>{' '}{t('panels_report.thue_boi_duong_nguoi_ban_5')}{formatMoney(meatMissed149)}{t('panels_report.ngay')}</span>
                )}
              </div>
            </Callout>
          )}
          {debt150.count > 0 && (
            <Callout tone={debt150.writeOffTonightAmount > 0 ? 'danger' : debt150.lateAmount > 0 ? 'warn' : 'info'}
              strong={debt150.writeOffTonightAmount > 0} style={{ marginTop: 8 }}
              title={t('panels_report.so_no_dang_khoa_tien_mat', { v0: formatMoney(debt150.lockedTotal) })}
              actions={
                <div style={{ marginTop: 6 }}>
                  <button onClick={() => openPanel({ type: 'regulars' })} style={{ ...styles.btn, fontSize: 11, padding: '2px 8px' }}>
                    {t('panels_report.mo_so_no_nhac_xoa')}
                  </button>
                </div>
              }>
              <div style={{ fontSize: 12, marginTop: 4 }}>
                {debt150.writeOffTonightAmount > 0 ? (
                  <span style={{ color: '#e74c3c' }}>⚠️ <b>{formatMoney(debt150.writeOffTonightAmount)}</b>{' '}{t('panels_report.qua')}{' '}{DEBT_WRITE_OFF_DAYS}{' '}{t('panels_report.ngay_2')}{' '}<b>{t('panels_report.mat_han')}</b>{' '}{t('panels_report.neu_khong_nhac_xoa_da_co')}{' '}{debt150.lateCount}{' '}{t('panels_report.mon_qua_han')}{formatMoney(debt150.lateAmount)}).</span>
                ) : debt150.lateAmount > 0 ? (
                  <span style={{ color: '#e67e22' }}>⚠️ {debt150.lateCount}{' '}{t('panels_report.mon_no_qua')}{' '}{DEBT_LATE_DAYS}{' '}{t('panels_report.ngay_3')}{formatMoney(debt150.lateAmount)}) — sau {DEBT_WRITE_OFF_DAYS}{' '}{t('panels_report.ngay_se_mat_han_hay_nhac')}</span>
                ) : (
                  <span>{t('panels_report.khach_quen_dang_giu')}{' '}{debt150.count}{' '}{t('panels_report.mon_no')}{formatMoney(debt150.lockedTotal)}{t('panels_report.con_dang_trong_han')}</span>
                )}
              </div>
            </Callout>
          )}
          {/* Playtest P1 T5: ngày đầu đưa lãi gộp bán hàng lên đầu — tiền nhập kho là vốn nằm trên kệ, không phải lỗ */}
          {day === 1 && goodsRevenue > 0 && (
            <p style={{ margin: '0 0 8px', fontSize: 15 }}>
              {t('panels_report.ngay_dau_ban_hang_lai_gop')}{' '}<b style={{ color: '#2ecc71' }}>{trendMark(goodsRevenue - goodsCost)}{formatMoney(goodsRevenue - goodsCost)}</b>
              <br /><small style={{ opacity: 0.8 }}>{t('panels_report.tien_nhap_kho_la_von_con')}</small>
            </p>
          )}
          <div style={{ overflowX: 'auto' }}>
          <table style={{ ...styles.table, fontSize: 15 }}>
            <tbody>
              <tr><td style={styles.left}>Doanh thu</td><td>{formatMoney(st.revenue)}</td></tr>
              {!!st.comboDiscount && <tr><td style={styles.left}>{' '}{t('panels_report.trong_do_da_giam_cho')}{' '}{st.combos} combo</td><td style={{ opacity: 0.75 }}>-{formatMoney(st.comboDiscount)}</td></tr>}
              {machineDayTotal(st.byService) > 0 && <tr><td style={styles.left}>{' '}{t('panels_report.trong_do_may_thu_phi')}</td><td style={{ opacity: 0.75 }}>{formatMoney(machineDayTotal(st.byService))}</td></tr>}
              {giftReportLine(st.gifts) && <tr><td style={styles.left}>{t('panels_report.qua_tang_khach_quen')}</td><td style={{ opacity: 0.75 }}>{giftReportLine(st.gifts)}</td></tr>}
              {!!st.clawWins && <tr><td style={styles.left}>{t('panels_report.khach_gap_trung_thu_bong')}</td><td style={{ opacity: 0.75 }}>{st.clawWins}{' '}{t('panels_report.lan')}</td></tr>}
              <tr><td style={styles.left}>{t('panels_report.lai_gop_tren_hang_ban_gia')}</td><td style={{ color: '#2ecc71' }}>{formatMoney(goodsRevenue - goodsCost - (st.comboDiscount ?? 0))}</td></tr>
              <tr><td style={styles.left}>{t('panels_report.chi_tieu_nhap_hang_noi_that')}</td><td>{st.spent > 0 ? `-${formatMoney(st.spent)}` : t('panels_report.0d')}</td></tr>
              {!!st.opCost && <tr><td style={styles.left} title={t('panels_report.dien_nuoc_theo_doanh_thu_tien')}>{' '}{t('panels_report.trong_do_phi_van_hanh')}</td><td style={{ opacity: 0.75 }}>-{formatMoney(st.opCost)}</td></tr>}
              <tr><td style={styles.left}>{t('panels_report.luong_nhan_vien')}</td><td>{st.wages > 0 ? `-${formatMoney(st.wages)}` : t('panels_report.0d')}</td></tr>
              <tr><td style={styles.left}>{t('panels_report.tien_nha_theo_bac_tiem')}</td><td>{(st.rent ?? 0) > 0 ? `-${formatMoney(st.rent ?? 0)}` : t('panels_report.0d')}</td></tr>
              <tr>
                <td style={styles.left}><b>{t('panels_report.tien_vao_tien_ra')}</b></td>
                <td style={{ color: profit >= 0 ? '#2ecc71' : '#e74c3c' }}><b>{trendMark(profit)}{formatMoney(profit)}</b></td>
              </tr>
              {/* GĐ1832 (review đợt 2 R1 / đợt 3 R2): thành tựu mở khóa trong đêm cộng vào ví SAU dòng này —
                  kê riêng để người soi sổ khớp được số dư với tổng kết */}
              {!!st.achvReward && <tr><td style={styles.left}>{t('panels_report.thuong_thanh_tuu_vao_vi_sau')}</td><td style={{ color: '#2ecc71' }}>+{formatMoney(st.achvReward)}</td></tr>}
              {/* GĐ1833 (review đợt 2 R3 / đợt 3 R3): két âm sau khi trả nhà/lương/vận hành — nêu rõ con số */}
              {!!st.shortfall && <tr><td style={styles.left}>{t('panels_report.ket_thieu_tien_sau_khi_tra')}</td><td style={{ color: '#e74c3c' }}>-{formatMoney(st.shortfall)}</td></tr>}
              {!!st.credited && <tr><td style={styles.left}>{' '}{t('panels_report.trong_do_khach_quen_ghi_so')}</td><td style={{ color: '#e67e22' }}>{formatMoney(st.credited)}</td></tr>}
              {!!st.repaid && <tr><td style={styles.left}>{t('panels_report.thu_no_cu')}</td><td style={{ color: '#2ecc71' }}>+{formatMoney(st.repaid)}</td></tr>}
              <tr><td style={styles.left}>{t('panels_report.mon_da_ban')}</td><td>{st.itemsSold}</td></tr>
              {!!st.online && (
                <tr><td style={styles.left}>{t('panels_report.ban_online_sau_hoa_hong')}</td><td>{formatMoney(st.online)}{st.grabFees ? t('panels_report.phi_grab', { v0: formatMoney(st.grabFees) }) : ''}</td></tr>
              )}
              {!!(st.shrinkCash || st.shrinkItems) && (
                <tr>
                  <td style={styles.left} title={t('panels_report.ket_thieu_tien_hoac_kho_hut')}>{t('panels_report.that_thoat_khong_ro')}</td>
                  <td style={{ color: '#e67e22' }}>{[st.shrinkCash ? formatMoney(st.shrinkCash) : '', st.shrinkItems ? t('panels_report.mon_2', { shrinkItems: st.shrinkItems }) : ''].filter(Boolean).join(' · ')}</td>
                </tr>
              )}
              {!!st.spoiledItems && (
                <tr><td style={styles.left}>{t('panels_report.hang_het_han_bo_di')}</td><td style={{ color: '#e67e22' }}>{st.spoiledItems}{' '}{t('panels_report.mon_von')}{' '}{formatMoney(st.spoiledCost ?? 0)})</td></tr>
              )}
              <tr><td style={styles.left}>{t('panels_report.khach_ghe')}</td><td>{st.customers} ({st.unhappy}{' '}{t('panels_report.khong_hai_long')}</td></tr>
              <tr><td style={styles.left}>{t('panels_report.kinh_nghiem')}</td><td>+{st.xp}{' '}{t('panels_report.xp_cap')}{' '}{level} ({xp}/{xpToNext(level)})</td></tr>
            </tbody>
          </table>
          </div>
          {/* GĐ1178: "lãi bán hàng thật" so "thưởng nhiệm vụ + kèo" (Luật 10) — nguồn thu tách hai nửa.
              `profit` ("Tiền vào − tiền ra") trừ cả tiền nhập kho nên ngày nào cũng âm, không phản ánh sức bán;
              `salesProfit` (lãi gộp − lương − thuê) là con số game lưu/thuật toán dùng để cân bằng nhưng chưa
              bao giờ thấy. THUẦN đọc: incomeSplit from state có sẵn + stats.questIncome (ghi lúc claim). */}
          {(() => {
            const split = incomeSplit(st, questLog, day);
            const sharePct = split.rewardShare !== null ? Math.round(split.rewardShare * 100) : null;
            const tone = split.health === 'loss' ? 'danger' : split.health === 'heavy' || split.health === 'tight' ? 'accent' : 'ok';
            const note = split.health === 'loss'
              ? <span>{t('panels_report.lai_ban_that')}{' '}<b>{t('panels_report.am')}</b>{' '}{t('panels_report.thuong')}{' '}{formatMoney(split.reward)}{' '}{t('panels_report.dang_ganh_lo_van_hanh_coi')}</span>
              : split.health === 'heavy'
                ? <span>{t('panels_report.hom_nay_thuong_chiem')}{' '}<b>{sharePct}%</b>{' '}{t('panels_report.lai_ban_that_ban_hang_phai')}</span>
                : split.health === 'tight'
                  ? <span>{t('panels_report.thuong_chiem')}{' '}<b>{sharePct}%</b>{' '}{t('panels_report.lai_ban_that_da')}{' '}<b>{t('panels_report.gan_bang_lai_ban')}</b>{t('panels_report.coi_chung_lan_nghe_chinh_luat')}</span>
                  : sharePct !== null
                    ? <span>{t('panels_report.thuong_chiem')}{' '}{sharePct}{t('panels_report.lai_ban_that_ban_hang_van')}</span>
                    : <span>{t('panels_report.ban_hang_van_la_nghe_chinh')}</span>;
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
                {trend.dir === 'up' ? t('panels_report.lai_ban_that_dang_cai_thien')
                  : trend.dir === 'down' ? t('panels_report.lai_ban_that_dang_xau_di')
                    : trend.days < 2 ? t('panels_report.moi_co_1_ngay_chua_the')
                      : t('panels_report.lai_ban_that_7_ngay_on')}
              </span>
            ) : null;
            return (
              <Callout tone={tone} style={{ marginTop: 8 }}
                title={<>{t('panels_report.lai_ban_hang_that')}{' '}{split.salesProfit < 0 ? formatMoney(split.salesProfit) : <b style={{ color: '#2ecc71' }}>+{formatMoney(split.salesProfit)}</b>}{' '}{t('panels_report.thuong_2')}{' '}<b style={{ color: '#2ecc71' }}>+{formatMoney(split.quest)}</b>{split.bet > 0 ? <span>{' '}{t('panels_report.keo')}{' '}<b style={{ color: '#2ecc71' }}>+{formatMoney(split.bet)}</b></span> : null}{trendLine}</>}>
                <div style={{ fontSize: 12, opacity: 0.8, marginTop: 2 }}>
                  {t('panels_report.lai_ban_that_lai_gop_ban')}<br />
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
                title={<>{t('panels_report.rui_ro_hom_nay_chan')}{' '}{formatMoney(last.blocked)}{' '}{t('panels_report.lot')}{' '}{formatMoney(last.leak)} · {last.events}{' '}{t('panels_report.lan')}</>}>
                <div style={{ fontSize: 12, opacity: 0.75, marginTop: 2 }}>
                  {t('panels_report.lot_trom_khuat_tien_gia_lot')}
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
                      {t('panels_report.p_1_khach_la_ke_trom')}{(tt.spawnChance * 100).toFixed(2)}{t('panels_report.p_bat')}{(tt.catchChance * 100).toFixed(0)}{t('panels_report.ky_vong')}{' '}
                      <b>{Math.round(st.customers * tt.leakPerThief)}</b>{' '}{t('panels_report.ke_trom_lot_ngay')}{' '}
                      <span style={{ opacity: 0.6 }}>{t('panels_report.chay_ca_dem_thi_trom_2')}</span>
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
                <b style={styles.cardTitle}>{t('panels_report.combo_hom_nay')}</b>
                <div style={{ marginTop: 4, display: 'grid', gap: 3 }}>
                  {rows.map(({ def, t: st, margin }) => (
                    <div key={def.id} style={{ fontSize: 12, display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                      <span>{def.icon} {def.name}: <b>{st.count}{' '}{t('panels_report.lan')}</b>{' '}{t('panels_report.giam')}{' '}{formatMoney(st.discount)}</span>
                      <span style={{ color: margin > 0 ? '#2ecc71' : '#e74c3c', fontWeight: 600 }}>{t('panels_report.lai_ca_cap')}{' '}{formatMoney(margin)}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
          {/* GĐ123: Thẻ "phá kỷ lục" trong tổng kết ngày — mồi quay lại mỗi ngày cho người chơi cấp cao
              (nơi mọi việc đã auto) bằng mục tiêu tự phá kỷ lục của chính mình. Chỉ hiện khi có kỷ lục
              để so (best !== null); đọc state có sẵn (history/soldEver/comboHitCount), không đổi save. */}
          {more && feedActive.length > 0 && (
            <div style={{ ...styles.card, marginTop: 8 }}>
              <b style={styles.cardTitle}>{t('panels_report.dang_dua_pha_ky_luc')}</b>
              <div style={{ marginTop: 4, display: 'grid', gap: 3 }}>
                {feedActive.map((f) => (
                  <button key={f.label} onClick={() => openPanel({ type: 'records' })}
                    style={{ background: 'transparent', border: 'none', padding: '6px 0', cursor: 'pointer', width: '100%', color: 'inherit', textAlign: 'left', fontSize: 12, display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', borderRadius: 6 }}>
                    <span>{f.icon} {f.label}: <b>{f.unit === 'money' ? formatMoney(f.today) : t('panels_report.luot', { today: f.today })}</b></span>
                    {f.beating ? (
                      <span style={{ color: '#2ecc71', fontWeight: 600 }}>{t('panels_report.da_pha')}{' '}{f.unit === 'money' ? formatMoney(f.best!) : t('panels_report.luot_2', { v0: f.best! })}</span>
                    ) : (
                      <span style={{ color: f.remaining <= Math.round((f.best ?? 1) * 0.2) ? '#f1c40f' : 'inherit', opacity: f.remaining > Math.round((f.best ?? 1) * 0.2) ? 0.75 : 1 }}>
                        {t('panels_report.con')}{' '}{f.unit === 'money' ? formatMoney(f.remaining) : t('panels_report.luot_3', { remaining: f.remaining })}
                      </span>
                    )}
                  </button>
                ))}
              </div>
              <button onClick={() => openPanel({ type: 'records' })} style={{ ...styles.btn, marginTop: 4 }}>{t('panels_report.so_ky_luc')}</button>
            </div>
          )}
          {/* Báo cáo ca đêm tiệm chính (GĐ65): lời/lỗ của khoản đầu tư 15 triệu "Mở ca đêm 24h".
              Thuần đọc từ byHour (giờ ≥22) + nhân viên ca đêm (pay ×1,5) — không thêm state/save. */}
          {more && (() => {
            const np = nightPnl(st.byHour, staff, skills);
            if (np.verdict === 'idle') return null; // chưa mở ca đêm / chưa thuê ai, không bày thẻ tránh nhiễu
            const color = np.verdict === 'ok' ? '#2ecc71' : '#e74c3c';
            const pb = nightPayback(np); // GĐ192: hồi vốn sau bao lâu cho khoản đầu tư 15tr
            const pbColor = pb.verdict === 'good' ? '#2ecc71' : pb.verdict === 'slow' ? '#e67e22' : '#e74c3c';
            return (
              <Callout tone={np.verdict === 'ok' ? 'ok' : 'danger'} style={{ marginTop: 8 }}
                title={<>{t('panels_report.dem_qua_thu')}{' '}{formatMoney(np.revenue)}{' '}{t('panels_report.ca_dem_15_luong_ca_dem')}{formatMoney(np.wages)} · <span style={{ color }}>{t('panels_report.loi_rong')}{' '}{formatMoney(np.net)}</span></>}>
                <div style={{ fontSize: 12, opacity: 0.75, marginTop: 2 }}>
                  {np.verdict === 'ok'
                    ? t('panels_report.mo_xuyen_dem_dang_co_loi')
                    : t('panels_report.ca_dem_dang_lo_can_nhac')}
                </div>
                <div style={{ fontSize: 12, marginTop: 3, color: pbColor }}>
                  {t('panels_report.15tr_nang_cap_mo_ca_dem')}{' '}<b>{nightPaybackLabel(pb)}</b>
                  {pb.verdict !== 'losing' ? t('panels_report.loi_dem', { v0: formatMoney(pb.netPerNight) }) : ''}
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
            // GĐ1221 — bề mặt "mất tiền vì chờ quầy": count × avgPerVisit → đồng tới gần, cùng mô-típ
            // storeMissRevenue (GĐ131 hết hàng) / dirtLoss (bẩn) — là mảnh cuối của bộ "mất tiền vì sao".
            const wmc = waitMoneyCost(waitLoss.count, avgPerVisit(st.revenue, st.customers));
            return (
              <Callout tone={bad ? 'danger' : 'accent'} style={{ marginTop: 8 }}
                title={<>{t('panels_report.mat')}{' '}{waitLoss.count}{' '}{t('panels_report.khach_vi_cho_quay_qua_lau')}{' '}<span style={{ color }}>{t('panels_report.bang')}{pct}{t('panels_report.khach_ghe_hom_nay')}</span></>}>
                <div style={{ fontSize: 12, opacity: 0.75, marginTop: 2 }}>
                  {t('panels_report.khach_dung_cho_qua_lau_roi')}{' '}{wmc.estRevenueLost > 0 ? `~${formatMoney(wmc.estRevenueLost)}` : t('panels_report.them_dong')}{' '}{t('panels_report.doanh_thu_hom_nay_dung_quay')}{' '}{waitLoss.peakHour !== null ? `${waitLoss.peakHour}h–${waitLoss.peakHour + 1}h` : t('panels_report.trong_hom_nay')}{t('panels_report.hoac_thue_them_thu_ngan_de')}
                </div>
                {(() => {
                  // GĐ1289 — quầy tự thanh toán: tay quay siêu thị còn thiếu sau GĐ120/1221 (vốn chỉ gợi
                  // xếp ca/thu thêm người) — ước phần khách bỏ vì chờ là khách mua ÍT món, đáng để tự quét.
                  const sco = selfCheckoutPayoff(waitLoss.count, avgPerVisit(st.revenue, st.customers));
                  return sco.line ? <div style={{ fontSize: 12, opacity: 0.75, marginTop: 2 }}>{sco.line}</div> : null;
                })()}
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
                title={<>{t('panels_report.cuoi_tuan_ban')}{' '}{wr.sold}{' '}{t('panels_report.mon_an_vat')}{' '}<span style={{ opacity: 0.75 }}>(~{formatMoney(wr.value)} · {wr.sharePct}% doanh thu)</span></>}>
                <div style={{ fontSize: 12, opacity: 0.75, marginTop: 2 }}>
                  {wr.met
                    ? t('panels_report.du_muc_tieu_mon_cua_cuoi', { target: wr.target })
                    : `Mục tiêu ${wr.target} món — còn thiếu ${wr.target - wr.sold} món. Cuối tuần sau nhớ châm kệ từ sáng.${isSunday ? '' : ' Mai Chủ nhật còn một ngày.'}`}
                  {isSunday && t('panels_report.tuan_moi_bat_dau_thu_2')}
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
                  ? <>{t('panels_report.doi_lech_ca_ranh_luc_vang')}</>
                  : <>🧍 {mi.icon} {mi.name}{' '}{t('panels_report.ranh')}{mi.idlePct}{t('panels_report.ca_hom_nay')}</>}>
                <div style={{ fontSize: 12, opacity: 0.75, marginTop: 2 }}>
                  {recap.verdict === 'shift_mismatch'
                    ? t('panels_report.ranh_ca_dung_khong_nhung_van', { name: mi.name, idlePct: mi.idlePct, idleMin: mi.idleMin, v3: waitLoss?.count })
                    : t('panels_report.dung_khong_tren_co_mat_mai', { idleMin: mi.idleMin, v1: mi.workMin + mi.idleMin })}
                </div>
                <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {(() => {
                    // GĐ253: biến gợi ý thành hành động — nút chạy setShift có sẵn, người chơi bấm mới đổi.
                    const fix = staffShiftFix(staffDaySnapshot(), staff, waitLoss?.count ?? 0, waitLoss?.peakHour ?? null, st.byHour);
                    if (!fix) return null;
                    const save = fix.wageDelta < 0 ? t('panels_report.tiet_kiem_ngay', { v0: formatMoney(-fix.wageDelta) }) : '';
                    return (
                      <button style={{ ...styles.btn, fontSize: 11, padding: '2px 8px' }}
                        onClick={() => { setShift(fix.id, fix.to); notify(t('panels_report.da_xep_lai_ca_mai_cho', { name: fix.name, label: fix.label, save })); }}>
                        🔀 {fix.name} — {fix.label}{save}
                      </button>
                    );
                  })()}
                  <button style={{ ...styles.btn, fontSize: 11, padding: '2px 8px' }} onClick={() => openPanel({ type: 'staff' })}>
                    {t('panels_report.bang_nhan_vien')}
                  </button>
                </div>
              </Callout>
            );
          })()}
          {more && <SummaryMoneyCards loyaltyPay={loyaltyPay} happyPay={happyPay} missRev={missRev} spoilNite={spoilNite} openPanel={openPanel} />}
          {more && methods.length > 0 && (
            <>
              <h3 style={{ margin: '12px 0 4px', fontSize: 14 }}>{t('panels_report.tien_vao_theo_hinh_thuc_thanh')}</h3>
              <div style={{ overflowX: 'auto' }}>
          <table style={{ ...styles.table, fontSize: 13 }}>
                <tbody>
                  {methods.map(([id, m]) => {
                    const def = paymentById(id);
                    return (
                      <tr key={id} title={def.desc}>
                        <td style={styles.left}>{def.icon} {def.name} <span style={{ opacity: 0.6 }}>· {m.count}{' '}{t('panels_report.luot_4')}</span></td>
                        <td>{formatMoney(m.revenue)} <span style={{ opacity: 0.6 }}>({st.revenue ? Math.round((m.revenue / st.revenue) * 100) : 0}%)</span></td>
                      </tr>
                    );
                  })}
                  {!!st.fees && (
                    <tr title={t('panels_report.phi_vi_dien_tu_may_pos')}>
                      <td style={styles.left}>{t('panels_report.phi_thanh_toan')}</td>
                      <td style={{ color: '#e67e22' }}>-{formatMoney(st.fees)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
              </div>
            </>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 6, marginTop: 10 }}>
            {best && <Stat icon="🔥" label={t('panels_report.ban_chay_nhat')} value={t('panels_report.mon_3', { v0: productById(best.id).name, qty: best.qty })} />}
            {richest && <Stat icon="💰" label={t('panels_report.lai_nhieu_nhat')} value={`${productById(richest.id).name} · ${formatMoney(richest.gross)}`} />}
            {missTotal > 0 && (
              <Stat icon="😞" label={t('panels_report.lo_luot_ban', { missTotal })}
                value={[missed.stock && t('panels_report.het_hang', { stock: missed.stock }), missed.price && t('panels_report.che_dat', { price: missed.price }), missed.wait && t('panels_report.cho_lau_bo_ve', { wait: missed.wait }), missed.expired && t('panels_report.ngai_hang_can_han', { expired: missed.expired })].filter(Boolean).join(' · ')} />
            )}
            {/* GĐ1219 — bề mặt "hàng chớp nhoáng" (kệ cạnh quầy): báo đếm + trung bình/ngày để khép
                vòng phản hồi của quyết định bày kẹo/bánh/nước ≤15k sát quầy (nguyên tắc a — trước giờ
                chỉ có đếm thành tựu ẩn, không báo cho người chơi). Thuần đọc totals.impulseSold / day. */}
            {totals.impulseSold > 0 && (() => {
              const r = impulseRecap(totals.impulseSold, day);
              return (
                <Stat icon="🍬" label={t('panels_report.hang_chop_nhoang_mon', { sold: r.sold })}
                  value={t('panels_report.tb_mon_ngay_ban_kep_luc', { v0: Math.round(r.perDay) })} />
              );
            })()}
          </div>
          {more && hours.length > 0 && <HourChart hours={hours} peak={peak?.hour} quiet={quiet?.hour} />}
          {/* GĐ1826 (review R8): nút mở/gập khối nâng cao — chỉ hiện ngày 1–2, từ ngày 3 mở mặc định. */}
          {day <= 2 && (
            <button onClick={() => setMore((v) => !v)} style={{ ...styles.btn, marginTop: 10 }}>
              {more ? t('panels_report.an_phan_nang_cao') : t('panels_report.xem_phan_nang_cao_ky_luc')}
            </button>
          )}
          {(st.substituted ?? 0) > 0 && (
            <p style={{ margin: '6px 0 0', fontSize: 12, opacity: 0.85 }}>
              {t('panels_report.da_cuu')}{' '}{st.substituted}{' '}{t('panels_report.luot_nho_khach_nhan_mon_thay')}
            </p>
          )}
          {expiryTips.length > 0 && (
            <AdviceCard title={t('panels_report.hang_sap_hong_mon', { v0: expiring.reduce((n, l) => n + l.qty, 0) })} items={expiryTips} onAct={act} />
          )}
          {advice.length > 0 && <AdviceCard title={t('panels_report.vi_sao_khach_khong_mua_duoc')} items={advice} onAct={act} />}
          <HistoryChart history={history} />
        </>
      ) : (
        <ItemTable lines={lines} />
      )}
      <p style={{ ...styles.sub, marginTop: 12 }}>{t('panels_report.da_tu_dong_luu_game_tien')}</p>
      <Footer onClose={() => openPanel({ type: 'morning' })} closeLabel={t('panels_report.sang_ngay_moi_xem_so_dau')} />
    </>
  );
}
