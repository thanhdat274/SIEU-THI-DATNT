import { trendMark } from '../trendMark';
import { questContext, useGame } from '../../core/store';
import { periodBlocker } from '../../data/quests';
import { HistoryChart } from './HistoryPanel';
import { WEEK_DAYS, weeklyChallenge, weekPace, monthlyChallenge, emptyMonth, monthPace, STREAK_XP_FROM, STREAK_XP_RATE_WEEK, STREAK_XP_RATE_MONTH } from '../../data/biz';
import { monthOf, weekdayOf, daysRemainingInMonth, MONTH_LENGTHS } from '../../data/calendar';
import { xpToNext } from '../../data/levels';
import { emptyYear, yearOf } from '../../data/yearReport';
import { readAlmanac, nextAlmanacMilestone, almanacMilestoneReward, ALMANAC_MILESTONES, ALMANAC_SEASONS } from '../../data/seasonAlmanac';
import { formatMoney, productById } from '../../data/products';
import { venueTrendSummary } from '../../data/venueTrend';
import { riskTrendSummary } from '../../data/risk';
import { card, title, pill, iconTile, sub, row } from './businessStyles';
import { fmtNum } from '../../core/format';
import { t } from '../../core/i18n';

/** Tab Lãi lỗ tuần và Tháng (tách từ BusinessPanel, GĐ876). */
export function Week() {
  const { biz, day, level, history, venueTrend, riskTrend } = useGame();
  const vt = venueTrendSummary(venueTrend);
  const w = biz.week;
  const r = biz.lastWeek;
  // Thử thách tuần hiện tại; save cũ thiếu counter trong tally thì tiến độ coi như 0.
  const ch = weeklyChallenge(Math.ceil(day / 7), level);
  const blocker = useGame((s) => periodBlocker(ch.measure, questContext(s)));
  const chTarget = ch.target(level, biz.services);
  const chCurrent = ch.measure === 'revenue' ? w.revenue : (w[ch.measure] ?? 0);
  const chMet = chTarget > 0 && chCurrent >= chTarget;
  // GĐ121: nhịp chạy tuần — có theo kịp không? có nguy cơ mất chuỗi không? (thuần đọc tally+streak)
  const pace = weekPace(chCurrent, chTarget, w.startDay + WEEK_DAYS - day, biz.weekStreak, level);
  const total = history.reduce((n, h) => n + h.profit, 0);
  const best = history.reduce<(typeof history)[number] | null>((b, h) => (!b || h.profit > b.profit ? h : b), null);
  return (
    <>
      <div style={card}>
        <b>{t('panels_report.lai_lo')}{' '}{history.length}{' '}{t('panels_report.ngay_gan_day')}</b>
        <div style={sub}>
          {t('panels_report.tong_tien_vao_ra')}{' '}<b style={{ color: total >= 0 ? '#2ecc71' : '#e74c3c' }}>{trendMark(total)}{formatMoney(total)}</b>
          {best && t('panels_report.ngay_tot_nhat_ngay', { day: best.day, v1: formatMoney(best.profit) })}
        </div>
        {history.length < 2 ? <div style={sub}>{t('panels_report.choi_them_vai_ngay_de_xem')}</div> : <HistoryChart history={history} />}
      </div>
      <div style={card}>
        <b>{t('panels_report.tuan_nay_ngay')}{' '}{w.startDay}–{w.startDay + WEEK_DAYS - 1}{(w.startDay - 1) % WEEK_DAYS === 0 ? t('panels_report.thu_2_chu_nhat') : ''}{t('panels_report.hom_nay')}{' '}{weekdayOf(day)}</b>
        <div>Doanh thu {formatMoney(w.revenue)}{' '}{t('panels_report.lai')}{' '}{formatMoney(w.profit)} · {w.customers}{' '}{t('panels_report.khach')}</div>
        {w.goal !== null ? (
          <>
            <div style={{ marginTop: 4 }}>{t('panels_report.muc_tieu')}{' '}{formatMoney(w.goal)}{' '}{t('panels_report.thuong_5_neu_dat')}</div>
            <div style={{ height: 8, background: '#555', borderRadius: 4, marginTop: 4 }}>
              <div style={{ width: `${Math.min(100, (w.revenue / w.goal) * 100)}%`, height: '100%', borderRadius: 4, background: '#2ecc71' }} />
            </div>
          </>
        ) : <div style={sub}>{t('panels_report.tuan_dau_chua_co_muc_tieu')}</div>}
        <div style={sub}>{t('panels_report.so_lieu_cong_vao_luc_tong')}</div>
      </div>
      {/* Thử thách tuần: mục tiêu phụ của tuần hiện tại, thưởng tự cộng lúc chốt tuần (không có nút nhận). */}
      <div style={card}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={iconTile}>{ch.icon}</div>
          <div style={{ flex: 1, minWidth: 160 }}>
            <b>🎯 {ch.title}</b>
            <div style={sub}>{ch.desc(level, biz.services)}</div>
            {blocker && <div style={{ ...sub, color: '#f39c12' }}>⚠️ {blocker}</div>}
          </div>
        </div>
        <div style={{ height: 8, background: '#555', borderRadius: 4, marginTop: 6 }}>
          <div style={{ width: `${chTarget > 0 ? Math.min(100, (chCurrent / chTarget) * 100) : 0}%`, height: '100%', borderRadius: 4, background: chMet ? '#2ecc71' : '#f1c40f' }} />
        </div>
        <div style={{ ...row, marginTop: 4, flexWrap: 'wrap' }}>
          <span>{fmtNum(Math.round(chCurrent))}/{fmtNum(Math.round(chTarget))} {ch.unit}</span>
          {chMet && <span style={{ ...pill, background: 'rgba(46,204,113,0.2)', color: '#2ecc71' }}>{t('panels_report.da_du_giu_deu_nhe')}</span>}
        </div>
        {/* GĐ121: nhịp chạy tuần — dòng dự báo + nguy cơ mất chuỗi (thuần đọc, không đổi state) */}
        {!chMet && pace && (() => {
          const pctPace = Math.round(pace.pace * 100);
          const pctProj = fmtNum(Math.round(pace.projected));
          // GĐ262: nói "tới Chủ nhật" chỉ khi cửa sổ tuần khối-aligned (startDay 1/8/15… — play thường
          // luôn đúng vì endDay tăng 1 ngày each; save lệch do can thiệp tay thì nói trung tính).
          const aligned = (w.startDay - 1) % WEEK_DAYS === 0;
          const due = aligned ? t('panels_report.toi_chu_nhat') : '';
          const dueLong = aligned ? t('panels_report.truoc_chu_nhat') : '';
          return (
            <>
              <div style={{ ...row, marginTop: 4, flexWrap: 'wrap', gap: 4 }}>
                <span style={{ opacity: 0.85 }}>{t('panels_report.nhip')}{' '}{pctPace}{t('panels_report.muc_tieu_con')}{' '}{pace.remainingDays}{' '}{t('panels_report.ngay_4')}{due}</span>
                {pace.onTrack
                  ? <span style={{ ...pill, background: 'rgba(46,204,113,0.2)', color: '#2ecc71' }}>{t('panels_report.du_kien_kip')}{pctProj} {ch.unit})</span>
                  : <span style={{ ...pill, background: 'rgba(241,196,15,0.2)', color: '#f1c40f' }}>{t('panels_report.du_kien_hut_con')}{' '}{pace.remainingDays}{' '}{t('panels_report.ngay_de_bu')}{dueLong}</span>}
              </div>
              {pace.streakAtRisk && (
                <div style={{ ...sub, color: '#e74c3c', marginTop: 3 }}>
                  {t('panels_report.dang_hut_ma_co_chuoi')}{' '}{biz.weekStreak}{' '}{t('panels_report.tuan_truot_tuan_nay_se_mat')}{pace.streakXp}{' '}{t('panels_report.xp_chuoi')}
                </div>
              )}
              <div style={{ ...sub, marginTop: 3 }}>
                {t('panels_report.con_thieu')}{' '}{fmtNum(Math.round(pace.missing))} {ch.unit}{' '}{t('panels_report.nua_la_du_muc_tieu_tuan')}
              </div>
            </>
          );
        })()}
        <div style={sub}>
          {t('panels_report.thuong_3')}{' '}{formatMoney(ch.reward(level))}
          {biz.weekStreak > 0 && t('panels_report.chuoi_tuan', { weekStreak: biz.weekStreak })}
          {/* GĐ169 — chuỗi đền bằng XP thay vì nhân tiền: từ tuần đạt thứ 3 liên tiếp mỗi tuần +35% XP cần lên cấp. */}
          {biz.weekStreak + 1 >= STREAK_XP_FROM && t('panels_report.dat_tuan_nay_xp', { v0: Math.round(STREAK_XP_RATE_WEEK * xpToNext(level)) })}
        </div>
      </div>
      {r && (
        <div style={card}>
          <b>{t('panels_report.bao_cao_tuan')}{' '}{r.week}</b>
          <div>Doanh thu {formatMoney(r.revenue)}{' '}{t('panels_report.lai')}{' '}{formatMoney(r.profit)} · {r.customers}{' '}{t('panels_report.khach_2')}{r.unhappy}{' '}{t('panels_report.khong_vui')}</div>
          {r.goal !== null && <div>{r.goalMet ? t('panels_report.dat_muc_tieu_thuong', { v0: formatMoney(r.goal), v1: formatMoney(r.reward) }) : t('panels_report.chua_dat_muc_tieu', { v0: formatMoney(r.goal) })}</div>}
          {r.challenge && (
            <div>
              {r.challenge.met
                ? `🎯 ${r.challenge.icon} ${r.challenge.title}: XONG, +${formatMoney(r.challenge.reward)}`
                : t('panels_report.chua_xong', { icon: r.challenge.icon, title: r.challenge.title, v2: fmtNum(Math.round(r.challenge.current)), v3: fmtNum(Math.round(r.challenge.target)), unit: r.challenge.unit })}
            </div>
          )}
          {(r.challengeStreak ?? biz.weekStreak) >= 2 && <div>{t('panels_report.chuoi')}{' '}{(r.challengeStreak ?? biz.weekStreak)}{' '}{t('panels_report.tuan')}{r.streakXp ? ` — +${r.streakXp} XP` : ''}</div>}
          {r.best && <div>{t('panels_report.lai_nhieu_nhat_2')}{' '}{productById(r.best).name}</div>}
          {r.worst && <div>{t('panels_report.lai_moi_mon_thap_nhat')}{' '}{productById(r.worst).name}{' '}{t('panels_report.can_nhac_tang_gia_hoac_bo')}</div>}
          <div>{t('panels_report.muc_tieu_tuan_toi')}{' '}{formatMoney(r.nextGoal)}</div>
        </div>
      )}
      {/* Xu hướng cơ sở: chi nhánh 24/7 + quán nước có đang đỡ hơn theo ngày không (cửa sổ 14 ngày). */}
      {vt.length > 0 && (
        <div style={card}>
          <div style={title}>{t('panels_report.xu_huong_co_so_14_ngay')}</div>
          {vt.map((tr) => (
            <div key={tr.label} style={{ marginTop: 6 }}>
              <div style={{ ...row, flexWrap: 'wrap' }}>
                <b>{tr.icon} {tr.label}</b>
                <span
                  style={{ ...pill, background: tr.direction === 'up' ? 'rgba(46,204,113,0.2)' : tr.direction === 'down' ? 'rgba(231,76,60,0.2)' : 'rgba(255,255,255,0.08)', color: tr.direction === 'up' ? '#2ecc71' : tr.direction === 'down' ? '#e74c3c' : '#ccc' }}
                >
                  {tr.direction === 'up' ? t('panels_report.dang_tang') : tr.direction === 'down' ? t('panels_report.dang_giam') : t('panels_report.kha_deu')}
                </span>
              </div>
              <div style={{ marginTop: 3 }}>
                {t('panels_report.moi_nhat')}{' '}<b>{formatMoney(tr.last)}</b>
                {tr.days >= 2 && (
                  <>
                    {' '}{t('panels_report.trung_binh')}{' '}{formatMoney(tr.recent)} so {formatMoney(tr.earlier)} ({tr.delta >= 0 ? '+' : ''}{formatMoney(tr.delta)})
                    {tr.pct !== 0 && ` · ${tr.pct > 0 ? '+' : ''}${tr.pct}%`}
                  </>
                )}
                {tr.best && <div style={sub}>{t('panels_report.cao_nhat_cua_so_ngay')}{' '}{tr.best.day} · {formatMoney(tr.best.value)}</div>}
                <div style={sub}>{tr.label.startsWith(t('panels_report.chi_nhanh')) ? t('panels_report.lai_tho_chi_nhanh_thu_luong') : t('panels_report.lai_quan_nuoc_doanh_thu_luong')}{' '}{t('panels_report.can_2_ngay_de_thay_xu')}</div>
              </div>
            </div>
          ))}
        </div>
      )}
      {/* Xu hướng rủi ro (GĐ58): chi an ninh có "đang đỡ" không — lọt rủi ro tăng/giảm + số lọt/chặn tuần này. */}
      {riskTrend.length > 0 && (() => {
        const rs = riskTrendSummary(riskTrend);
        const last = riskTrend[riskTrend.length - 1];
        const isUp = rs.leakDir === 'up';
        const isDown = rs.leakDir === 'down';
        return (
          <div style={card}>
            <div style={title}>{t('panels_report.xu_huong_rui_ro_14_ngay')}</div>
            <div style={{ ...row, flexWrap: 'wrap' }}>
              <b>{t('panels_report.lot_rui_ro_trom_tien_gia')}</b>
              <span
                style={{ ...pill, background: isUp ? 'rgba(231,76,60,0.2)' : isDown ? 'rgba(46,204,113,0.2)' : 'rgba(255,255,255,0.08)', color: isUp ? '#e74c3c' : isDown ? '#2ecc71' : '#ccc' }}
              >
                {isUp ? t('panels_report.dang_tang') : isDown ? t('panels_report.dang_giam') : t('panels_report.kha_deu')}
              </span>
            </div>
            <div style={{ marginTop: 3 }}>
              {t('panels_report.moi_nhat')}{' '}<b>{formatMoney(last?.leak ?? 0)}</b>{t('panels_report.ngay_5')}
              {rs.days >= 2 && (
                <>{' '}{t('panels_report.nua_gan')}{' '}{formatMoney(rs.leakLast)}{' '}{t('panels_report.so_nua_truoc')}{' '}{formatMoney(rs.leakEarly)} ({rs.leakDelta >= 0 ? '+' : ''}{formatMoney(rs.leakDelta)})</>
              )}
              {' · '}{t('panels_report.tuan_nay_lot')}{' '}<b>{formatMoney(rs.weekLeak)}</b>{' '}{t('panels_report.chan')}{' '}<b>{formatMoney(rs.weekBlocked)}</b>
            </div>
            {isUp && (
              <div style={{ ...sub, marginTop: 4, color: '#e74c3c' }}>
                {t('panels_report.lot_2')}{' '}{formatMoney(rs.weekLeak)}{' '}{t('panels_report.tuan_nay_camera_cho_mat_tinh')}
              </div>
            )}
            <div style={sub}>{t('panels_report.chi_bao_2_chieu_lot_thu')}</div>
          </div>
        );
      })()}
    </>
  );
}

/** Tab Tháng vận hành: mốc nhịp tháng (dương lịch 1–12) — mục tiêu doanh thu + thử thách + chuỗi tháng. */
export function Month() {
  const { biz, day, level } = useGame();
  const mo = biz.month ?? emptyMonth(day, monthOf(day));
  const r = biz.lastMonth;
  const m = monthOf(day);
  const ch = monthlyChallenge(mo.month, level);
  const blocker = useGame((s) => periodBlocker(ch.measure, questContext(s)));
  const chTarget = ch.target(level, biz.services);
  const chCurrent = ch.measure === 'revenue' ? mo.revenue : (mo[ch.measure] ?? 0);
  const chMet = chTarget > 0 && chCurrent >= chTarget;
  const remainingDays = daysRemainingInMonth(day);
  const totalDays = MONTH_LENGTHS[m - 1];
  const mPace = monthPace(chCurrent, chTarget, remainingDays, totalDays, biz.monthStreak, level);
  return (
    <>
      <div style={card}>
        <b>{t('panels_report.thang')}{' '}{m}{' '}{t('panels_report.nay_bat_dau_ngay')}{' '}{mo.startDay}{t('panels_report.hom_nay_ngay')}{' '}{day})</b>
        <div>Doanh thu {formatMoney(mo.revenue)}{' '}{t('panels_report.lai')}{' '}{formatMoney(mo.profit)} · {mo.customers}{' '}{t('panels_report.khach')}</div>
        {mo.goal !== null ? (
          <>
            <div style={{ marginTop: 4 }}>{t('panels_report.muc_tieu')}{' '}{formatMoney(mo.goal)}{' '}{t('panels_report.thuong_6_neu_dat')}</div>
            <div style={{ height: 8, background: '#555', borderRadius: 4, marginTop: 4 }}>
              <div style={{ width: `${Math.min(100, (mo.revenue / Math.max(1, mo.goal)) * 100)}%`, height: '100%', borderRadius: 4, background: '#2ecc71' }} />
            </div>
          </>
        ) : <div style={sub}>{t('panels_report.thang_dau_chua_co_muc_tieu')}</div>}
        <div style={sub}>{t('panels_report.so_lieu_cong_vao_luc_tong_2')}</div>
      </div>
      <div style={card}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={iconTile}>{ch.icon}</div>
          <div style={{ flex: 1, minWidth: 160 }}>
            <b>🎯 {ch.title}</b>
            <div style={sub}>{ch.desc(level, biz.services)}</div>
            {blocker && <div style={{ ...sub, color: '#f39c12' }}>⚠️ {blocker}</div>}
          </div>
        </div>
        <div style={{ height: 8, background: '#555', borderRadius: 4, marginTop: 6 }}>
          <div style={{ width: `${chTarget > 0 ? Math.min(100, (chCurrent / chTarget) * 100) : 0}%`, height: '100%', borderRadius: 4, background: chMet ? '#2ecc71' : '#f1c40f' }} />
        </div>
        <div style={{ ...row, marginTop: 4, flexWrap: 'wrap' }}>
          <span>{fmtNum(Math.round(chCurrent))}/{fmtNum(Math.round(chTarget))} {ch.unit}</span>
          {chMet && <span style={{ ...pill, background: 'rgba(46,204,113,0.2)', color: '#2ecc71' }}>{t('panels_report.da_du_giu_deu_nhe')}</span>}
        </div>
        {!chMet && mPace && (() => {
          const pctPace = Math.round(mPace.pace * 100);
          const pctProj = fmtNum(Math.round(mPace.projected));
          return (
            <>
              <div style={{ ...row, marginTop: 4, flexWrap: 'wrap', gap: 4 }}>
                <span style={{ opacity: 0.85 }}>{t('panels_report.nhip')}{' '}{pctPace}{t('panels_report.muc_tieu_con')}{' '}{mPace.remainingDays}{' '}{t('panels_report.ngay_het_thang')}{' '}{m})</span>
                {mPace.onTrack
                  ? <span style={{ ...pill, background: 'rgba(46,204,113,0.2)', color: '#2ecc71' }}>{t('panels_report.du_kien_kip')}{pctProj} {ch.unit})</span>
                  : <span style={{ ...pill, background: 'rgba(241,196,15,0.2)', color: '#f1c40f' }}>{t('panels_report.du_kien_hut_con')}{' '}{mPace.remainingDays}{' '}{t('panels_report.ngay_de_bu')}</span>}
              </div>
              {mPace.streakAtRisk && (
                <div style={{ ...sub, color: '#e74c3c', marginTop: 3 }}>
                  {t('panels_report.dang_hut_ma_co_chuoi')}{' '}{biz.monthStreak}{' '}{t('panels_report.thang_truot_thang_nay_se_mat')}{mPace.streakXp}{' '}{t('panels_report.xp_chuoi')}
                </div>
              )}
              <div style={{ ...sub, marginTop: 3 }}>
                {t('panels_report.con_thieu')}{' '}{fmtNum(Math.round(mPace.missing))} {ch.unit}{' '}{t('panels_report.nua_la_du_muc_tieu_thang')}
              </div>
            </>
          );
        })()}
        <div style={sub}>
          {t('panels_report.thuong_3')}{' '}{formatMoney(ch.reward(level))}
          {biz.monthStreak > 0 && t('panels_report.chuoi_thang', { monthStreak: biz.monthStreak })}
          {/* GĐ169 — chuỗi tháng đền bằng XP gấp đôi tuần (bỏ nhân tiền chuỗi cũ). */}
          {biz.monthStreak + 1 >= STREAK_XP_FROM && t('panels_report.dat_thang_nay_xp', { v0: Math.round(STREAK_XP_RATE_MONTH * xpToNext(level)) })}
        </div>
      </div>
      {r && (
        <div style={card}>
          <b>{t('panels_report.bao_cao_thang')}{' '}{r.month}</b>
          <div>Doanh thu {formatMoney(r.revenue)}{' '}{t('panels_report.lai')}{' '}{formatMoney(r.profit)} · {r.customers}{' '}{t('panels_report.khach_2')}{r.unhappy}{' '}{t('panels_report.khong_vui')}</div>
          {r.goal !== null && <div>{r.goalMet ? t('panels_report.dat_muc_tieu_thuong', { v0: formatMoney(r.goal), v1: formatMoney(r.reward) }) : t('panels_report.chua_dat_muc_tieu', { v0: formatMoney(r.goal) })}</div>}
          {r.challenge && (
            <div>
              {r.challenge.met
                ? `🎯 ${r.challenge.icon} ${r.challenge.title}: XONG, +${formatMoney(r.challenge.reward)}`
                : t('panels_report.chua_xong', { icon: r.challenge.icon, title: r.challenge.title, v2: fmtNum(Math.round(r.challenge.current)), v3: fmtNum(Math.round(r.challenge.target)), unit: r.challenge.unit })}
            </div>
          )}
          {(r.monthStreak ?? biz.monthStreak) >= 2 && <div>{t('panels_report.chuoi')}{' '}{(r.monthStreak ?? biz.monthStreak)}{' '}{t('panels_report.thang_2')}{r.streakXp ? ` — +${r.streakXp} XP` : ''}</div>}
          {r.best && <div>{t('panels_report.lai_nhieu_nhat_2')}{' '}{productById(r.best).name}</div>}
          {r.worst && <div>{t('panels_report.lai_moi_mon_thap_nhat')}{' '}{productById(r.worst).name}{' '}{t('panels_report.can_nhac_tang_gia_hoac_bo')}</div>}
          <div>{t('panels_report.muc_tieu_thang_toi')}{' '}{formatMoney(r.nextGoal)}</div>
        </div>
      )}
      {(() => {
        const yr = biz.year ?? emptyYear(day, yearOf(day));
        const lr = biz.lastYear;
        return (
          <>
            <div style={card}>
              <b>{t('panels_report.nam')}{' '}{yr.year}{' '}{t('panels_report.nay_bat_dau_ngay')}{' '}{yr.startDay})</b>
              <div>Doanh thu {formatMoney(yr.revenue)}{' '}{t('panels_report.lai')}{' '}{formatMoney(yr.profit)} · {yr.customers}{' '}{t('panels_report.khach_2')}{yr.unhappy}{' '}{t('panels_report.khong_vui')}</div>
              <div style={sub}>⭐ {yr.seasonStars}{' '}{t('panels_report.sao_4_mua_nam_nay_mot')}</div>
            </div>
            {lr && (
              <div style={card}>
                <b>{t('panels_report.bao_cao_nam')}{' '}{lr.year}</b>
                <div>Doanh thu {formatMoney(lr.revenue)}{' '}{t('panels_report.lai')}{' '}{formatMoney(lr.profit)} · {lr.customers}{' '}{t('panels_report.khach_2')}{lr.unhappy}{' '}{t('panels_report.khong_vui')}</div>
                <div>⭐ {lr.seasonStars}{' '}{t('panels_report.sao_4_mua_thuong_tron_nam')}{formatMoney(lr.reward)}</div>
              </div>
            )}
          </>
        );
      })()}
      {(() => {
        const a = readAlmanac(biz.seasonAlmanac ?? {});
        const nxt = nextAlmanacMilestone(a.total, biz.almanacClaimed ?? []);
        const SI: Record<string, string> = { spring: t('panels_report.xuan'), summer: t('panels_report.he'), autumn: '🍂 Thu', winter: t('panels_report.dong') };
        return (
          <div style={card}>
            <b>{t('panels_report.so_mua_sao_moi_mua_doi')}</b>
            <div style={sub}>{t('panels_report.tich_luy_vinh_vien_qua_cac')}</div>
            <div>{ALMANAC_SEASONS.map((s) => `${SI[s]} ${a.perSeason[s]}`).join(' · ')}</div>
            <div>{t('panels_report.tong')}{' '}{a.total} sao {a.favorite ? t('panels_report.mua_hop_nhat', { v0: SI[a.favorite] }) : ''}</div>
            {nxt
              ? <div style={sub}>{t('panels_report.moc_tiep')}{' '}{nxt.at}{' '}{t('panels_report.sao_con')}{' '}{nxt.remaining} sao) → +{formatMoney(almanacMilestoneReward(nxt.at, level))}</div>
              : <div style={sub}>{t('panels_report.da_cham_moc_cuoi')}{' '}{ALMANAC_MILESTONES[ALMANAC_MILESTONES.length - 1]} sao</div>}
          </div>
        );
      })()}
    </>
  );
}
