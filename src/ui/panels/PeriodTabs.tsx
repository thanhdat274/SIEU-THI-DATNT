import { useGame } from '../../core/store';
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

/** Tab Lãi lỗ tuần và Tháng (tách từ BusinessPanel, GĐ876). */
export function Week() {
  const { biz, day, level, history, venueTrend, riskTrend } = useGame();
  const vt = venueTrendSummary(venueTrend);
  const w = biz.week;
  const r = biz.lastWeek;
  // Thử thách tuần hiện tại; save cũ thiếu counter trong tally thì tiến độ coi như 0.
  const ch = weeklyChallenge(Math.ceil(day / 7), level);
  const chTarget = ch.target(level);
  const chCurrent = ch.measure === 'revenue' ? w.revenue : (w[ch.measure] ?? 0);
  const chMet = chTarget > 0 && chCurrent >= chTarget;
  // GĐ121: nhịp chạy tuần — có theo kịp không? có nguy cơ mất chuỗi không? (thuần đọc tally+streak)
  const pace = weekPace(chCurrent, chTarget, w.startDay + WEEK_DAYS - day, biz.weekStreak, level);
  const total = history.reduce((n, h) => n + h.profit, 0);
  const best = history.reduce<(typeof history)[number] | null>((b, h) => (!b || h.profit > b.profit ? h : b), null);
  return (
    <>
      <div style={card}>
        <b>📈 Lãi lỗ {history.length} ngày gần đây</b>
        <div style={sub}>
          Tổng tiền vào − ra: <b style={{ color: total >= 0 ? '#2ecc71' : '#e74c3c' }}>{formatMoney(total)}</b>
          {best && ` · ngày tốt nhất: ngày ${best.day} (${formatMoney(best.profit)})`}
        </div>
        {history.length < 2 ? <div style={sub}>Chơi thêm vài ngày để xem biểu đồ.</div> : <HistoryChart history={history} />}
      </div>
      <div style={card}>
        <b>📅 Tuần này (ngày {w.startDay}–{w.startDay + WEEK_DAYS - 1}{(w.startDay - 1) % WEEK_DAYS === 0 ? ' · Thứ 2 → Chủ nhật' : ''}) — hôm nay {weekdayOf(day)}</b>
        <div>Doanh thu {formatMoney(w.revenue)} · Lãi {formatMoney(w.profit)} · {w.customers} khách</div>
        {w.goal !== null ? (
          <>
            <div style={{ marginTop: 4 }}>🎯 Mục tiêu: {formatMoney(w.goal)} (thưởng 5% nếu đạt)</div>
            <div style={{ height: 8, background: '#555', borderRadius: 4, marginTop: 4 }}>
              <div style={{ width: `${Math.min(100, (w.revenue / w.goal) * 100)}%`, height: '100%', borderRadius: 4, background: '#2ecc71' }} />
            </div>
          </>
        ) : <div style={sub}>Tuần đầu chưa có mục tiêu; hết tuần sẽ đặt mục tiêu cao hơn 10%.</div>}
        <div style={sub}>Số liệu cộng vào lúc tổng kết mỗi tối.</div>
      </div>
      {/* Thử thách tuần: mục tiêu phụ của tuần hiện tại, thưởng tự cộng lúc chốt tuần (không có nút nhận). */}
      <div style={card}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={iconTile}>{ch.icon}</div>
          <div style={{ flex: 1, minWidth: 160 }}>
            <b>🎯 {ch.title}</b>
            <div style={sub}>{ch.desc(level)}</div>
          </div>
        </div>
        <div style={{ height: 8, background: '#555', borderRadius: 4, marginTop: 6 }}>
          <div style={{ width: `${chTarget > 0 ? Math.min(100, (chCurrent / chTarget) * 100) : 0}%`, height: '100%', borderRadius: 4, background: chMet ? '#2ecc71' : '#f1c40f' }} />
        </div>
        <div style={{ ...row, marginTop: 4, flexWrap: 'wrap' }}>
          <span>{Math.round(chCurrent).toLocaleString('vi-VN')}/{Math.round(chTarget).toLocaleString('vi-VN')} {ch.unit}</span>
          {chMet && <span style={{ ...pill, background: 'rgba(46,204,113,0.2)', color: '#2ecc71' }}>✅ Đã đủ — giữ đều nhé!</span>}
        </div>
        {/* GĐ121: nhịp chạy tuần — dòng dự báo + nguy cơ mất chuỗi (thuần đọc, không đổi state) */}
        {!chMet && pace && (() => {
          const pctPace = Math.round(pace.pace * 100);
          const pctProj = Math.round(pace.projected).toLocaleString('vi-VN');
          // GĐ262: nói "tới Chủ nhật" chỉ khi cửa sổ tuần khối-aligned (startDay 1/8/15… — play thường
          // luôn đúng vì endDay tăng 1 ngày each; save lệch do can thiệp tay thì nói trung tính).
          const aligned = (w.startDay - 1) % WEEK_DAYS === 0;
          const due = aligned ? ' (tới Chủ nhật)' : '';
          const dueLong = aligned ? ' trước Chủ nhật' : '';
          return (
            <>
              <div style={{ ...row, marginTop: 4, flexWrap: 'wrap', gap: 4 }}>
                <span style={{ opacity: 0.85 }}>⏱ Nhịp {pctPace}% mục tiêu · còn {pace.remainingDays} ngày{due}</span>
                {pace.onTrack
                  ? <span style={{ ...pill, background: 'rgba(46,204,113,0.2)', color: '#2ecc71' }}>📈 Dự kiến kịp ({pctProj} {ch.unit})</span>
                  : <span style={{ ...pill, background: 'rgba(241,196,15,0.2)', color: '#f1c40f' }}>📉 Dự kiến hụt — còn {pace.remainingDays} ngày để bù{dueLong}</span>}
              </div>
              {pace.streakAtRisk && (
                <div style={{ ...sub, color: '#e74c3c', marginTop: 3 }}>
                  ⚠️ Đang hụt MÀ có chuỗi {biz.weekStreak} tuần — trượt tuần này sẽ mất +{pace.streakXp} XP chuỗi.
                </div>
              )}
              <div style={{ ...sub, marginTop: 3 }}>
                Còn thiếu {Math.round(pace.missing).toLocaleString('vi-VN')} {ch.unit} nữa là đủ mục tiêu tuần này.
              </div>
            </>
          );
        })()}
        <div style={sub}>
          Thưởng {formatMoney(ch.reward(level))}
          {biz.weekStreak > 0 && ` · chuỗi ${biz.weekStreak} tuần`}
          {/* GĐ169 — chuỗi đền bằng XP thay vì nhân tiền: từ tuần đạt thứ 3 liên tiếp mỗi tuần +35% XP cần lên cấp. */}
          {biz.weekStreak + 1 >= STREAK_XP_FROM && ` · đạt tuần này: +${Math.round(STREAK_XP_RATE_WEEK * xpToNext(level))} XP`}
        </div>
      </div>
      {r && (
        <div style={card}>
          <b>📊 Báo cáo tuần {r.week}</b>
          <div>Doanh thu {formatMoney(r.revenue)} · Lãi {formatMoney(r.profit)} · {r.customers} khách ({r.unhappy} không vui)</div>
          {r.goal !== null && <div>{r.goalMet ? `✅ Đạt mục tiêu ${formatMoney(r.goal)}, thưởng ${formatMoney(r.reward)}` : `❌ Chưa đạt mục tiêu ${formatMoney(r.goal)}`}</div>}
          {r.challenge && (
            <div>
              {r.challenge.met
                ? `🎯 ${r.challenge.icon} ${r.challenge.title}: XONG, +${formatMoney(r.challenge.reward)}`
                : `🎯 ${r.challenge.icon} ${r.challenge.title}: ${Math.round(r.challenge.current).toLocaleString('vi-VN')}/${Math.round(r.challenge.target).toLocaleString('vi-VN')} ${r.challenge.unit} — chưa xong`}
            </div>
          )}
          {(r.challengeStreak ?? biz.weekStreak) >= 2 && <div>🔥 Chuỗi {(r.challengeStreak ?? biz.weekStreak)} tuần{r.streakXp ? ` — +${r.streakXp} XP` : ''}</div>}
          {r.best && <div>💰 Lãi nhiều nhất: {productById(r.best).name}</div>}
          {r.worst && <div>📉 Lãi mỗi món thấp nhất: {productById(r.worst).name} · cân nhắc tăng giá hoặc bỏ bớt</div>}
          <div>🎯 Mục tiêu tuần tới: {formatMoney(r.nextGoal)}</div>
        </div>
      )}
      {/* Xu hướng cơ sở: chi nhánh 24/7 + quán nước có đang đỡ hơn theo ngày không (cửa sổ 14 ngày). */}
      {vt.length > 0 && (
        <div style={card}>
          <div style={title}>📈 Xu hướng cơ sở (14 ngày)</div>
          {vt.map((t) => (
            <div key={t.label} style={{ marginTop: 6 }}>
              <div style={{ ...row, flexWrap: 'wrap' }}>
                <b>{t.icon} {t.label}</b>
                <span
                  style={{ ...pill, background: t.direction === 'up' ? 'rgba(46,204,113,0.2)' : t.direction === 'down' ? 'rgba(231,76,60,0.2)' : 'rgba(255,255,255,0.08)', color: t.direction === 'up' ? '#2ecc71' : t.direction === 'down' ? '#e74c3c' : '#ccc' }}
                >
                  {t.direction === 'up' ? '📈 đang tăng' : t.direction === 'down' ? '📉 đang giảm' : '➖ khá đều'}
                </span>
              </div>
              <div style={{ marginTop: 3 }}>
                Mới nhất <b>{formatMoney(t.last)}</b>
                {t.days >= 2 && (
                  <>
                    {' '}· trung bình {formatMoney(t.recent)} so {formatMoney(t.earlier)} ({t.delta >= 0 ? '+' : ''}{formatMoney(t.delta)})
                    {t.pct !== 0 && ` · ${t.pct > 0 ? '+' : ''}${t.pct}%`}
                  </>
                )}
                {t.best && <div style={sub}>Cao nhất cửa sổ: ngày {t.best.day} · {formatMoney(t.best.value)}</div>}
                <div style={sub}>{t.label.startsWith('Chi nhánh') ? 'Lãi thô chi nhánh = thu − lương, chưa trừ tiền điện cuối ngày.' : 'Lãi quán nước = doanh thu − lương nhân viên.'} Cần ≥2 ngày để thấy xu hướng.</div>
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
            <div style={title}>📉 Xu hướng rủi ro (14 ngày)</div>
            <div style={{ ...row, flexWrap: 'wrap' }}>
              <b>🛡️ Lọt rủi ro (trộm + tiền giả + gian lận)</b>
              <span
                style={{ ...pill, background: isUp ? 'rgba(231,76,60,0.2)' : isDown ? 'rgba(46,204,113,0.2)' : 'rgba(255,255,255,0.08)', color: isUp ? '#e74c3c' : isDown ? '#2ecc71' : '#ccc' }}
              >
                {isUp ? '📈 đang tăng' : isDown ? '📉 đang giảm' : '➖ khá đều'}
              </span>
            </div>
            <div style={{ marginTop: 3 }}>
              Mới nhất <b>{formatMoney(last?.leak ?? 0)}</b>/ngày
              {rs.days >= 2 && (
                <> · nửa gần {formatMoney(rs.leakLast)} so nửa trước {formatMoney(rs.leakEarly)} ({rs.leakDelta >= 0 ? '+' : ''}{formatMoney(rs.leakDelta)})</>
              )}
              {' · '}tuần này lọt <b>{formatMoney(rs.weekLeak)}</b> · chặn <b>{formatMoney(rs.weekBlocked)}</b>
            </div>
            {isUp && (
              <div style={{ ...sub, marginTop: 4, color: '#e74c3c' }}>
                🛡️ Lọt {formatMoney(rs.weekLeak)} tuần này — camera/chó/mắt tinh có đang đỡ?
              </div>
            )}
            <div style={sub}>Chỉ báo 2 chiều: lọt = thứ thật mất; chặn = thứ thu lại/bắt được. Cần ≥2 ngày để thấy xu hướng.</div>
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
  const chTarget = ch.target(level);
  const chCurrent = ch.measure === 'revenue' ? mo.revenue : (mo[ch.measure] ?? 0);
  const chMet = chTarget > 0 && chCurrent >= chTarget;
  const remainingDays = daysRemainingInMonth(day);
  const totalDays = MONTH_LENGTHS[m - 1];
  const mPace = monthPace(chCurrent, chTarget, remainingDays, totalDays, biz.monthStreak, level);
  return (
    <>
      <div style={card}>
        <b>📆 Tháng {m} này (bắt đầu ngày {mo.startDay}, hôm nay ngày {day})</b>
        <div>Doanh thu {formatMoney(mo.revenue)} · Lãi {formatMoney(mo.profit)} · {mo.customers} khách</div>
        {mo.goal !== null ? (
          <>
            <div style={{ marginTop: 4 }}>🎯 Mục tiêu: {formatMoney(mo.goal)} (thưởng 6% nếu đạt)</div>
            <div style={{ height: 8, background: '#555', borderRadius: 4, marginTop: 4 }}>
              <div style={{ width: `${Math.min(100, (mo.revenue / Math.max(1, mo.goal)) * 100)}%`, height: '100%', borderRadius: 4, background: '#2ecc71' }} />
            </div>
          </>
        ) : <div style={sub}>Tháng đầu chưa có mục tiêu; hết tháng sẽ đặt mục tiêu cao hơn 15%.</div>}
        <div style={sub}>Số liệu cộng vào lúc tổng kết mỗi tối. Một năm có 12 tháng, lễ hội theo từng tháng.</div>
      </div>
      <div style={card}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={iconTile}>{ch.icon}</div>
          <div style={{ flex: 1, minWidth: 160 }}>
            <b>🎯 {ch.title}</b>
            <div style={sub}>{ch.desc(level)}</div>
          </div>
        </div>
        <div style={{ height: 8, background: '#555', borderRadius: 4, marginTop: 6 }}>
          <div style={{ width: `${chTarget > 0 ? Math.min(100, (chCurrent / chTarget) * 100) : 0}%`, height: '100%', borderRadius: 4, background: chMet ? '#2ecc71' : '#f1c40f' }} />
        </div>
        <div style={{ ...row, marginTop: 4, flexWrap: 'wrap' }}>
          <span>{Math.round(chCurrent).toLocaleString('vi-VN')}/{Math.round(chTarget).toLocaleString('vi-VN')} {ch.unit}</span>
          {chMet && <span style={{ ...pill, background: 'rgba(46,204,113,0.2)', color: '#2ecc71' }}>✅ Đã đủ — giữ đều nhé!</span>}
        </div>
        {!chMet && mPace && (() => {
          const pctPace = Math.round(mPace.pace * 100);
          const pctProj = Math.round(mPace.projected).toLocaleString('vi-VN');
          return (
            <>
              <div style={{ ...row, marginTop: 4, flexWrap: 'wrap', gap: 4 }}>
                <span style={{ opacity: 0.85 }}>⏱ Nhịp {pctPace}% mục tiêu · còn {mPace.remainingDays} ngày (hết tháng {m})</span>
                {mPace.onTrack
                  ? <span style={{ ...pill, background: 'rgba(46,204,113,0.2)', color: '#2ecc71' }}>📈 Dự kiến kịp ({pctProj} {ch.unit})</span>
                  : <span style={{ ...pill, background: 'rgba(241,196,15,0.2)', color: '#f1c40f' }}>📉 Dự kiến hụt — còn {mPace.remainingDays} ngày để bù</span>}
              </div>
              {mPace.streakAtRisk && (
                <div style={{ ...sub, color: '#e74c3c', marginTop: 3 }}>
                  ⚠️ Đang hụt MÀ có chuỗi {biz.monthStreak} tháng — trượt tháng này sẽ mất +{mPace.streakXp} XP chuỗi.
                </div>
              )}
              <div style={{ ...sub, marginTop: 3 }}>
                Còn thiếu {Math.round(mPace.missing).toLocaleString('vi-VN')} {ch.unit} nữa là đủ mục tiêu tháng này.
              </div>
            </>
          );
        })()}
        <div style={sub}>
          Thưởng {formatMoney(ch.reward(level))}
          {biz.monthStreak > 0 && ` · chuỗi ${biz.monthStreak} tháng`}
          {/* GĐ169 — chuỗi tháng đền bằng XP gấp đôi tuần (bỏ nhân tiền chuỗi cũ). */}
          {biz.monthStreak + 1 >= STREAK_XP_FROM && ` · đạt tháng này: +${Math.round(STREAK_XP_RATE_MONTH * xpToNext(level))} XP`}
        </div>
      </div>
      {r && (
        <div style={card}>
          <b>📊 Báo cáo tháng {r.month}</b>
          <div>Doanh thu {formatMoney(r.revenue)} · Lãi {formatMoney(r.profit)} · {r.customers} khách ({r.unhappy} không vui)</div>
          {r.goal !== null && <div>{r.goalMet ? `✅ Đạt mục tiêu ${formatMoney(r.goal)}, thưởng ${formatMoney(r.reward)}` : `❌ Chưa đạt mục tiêu ${formatMoney(r.goal)}`}</div>}
          {r.challenge && (
            <div>
              {r.challenge.met
                ? `🎯 ${r.challenge.icon} ${r.challenge.title}: XONG, +${formatMoney(r.challenge.reward)}`
                : `🎯 ${r.challenge.icon} ${r.challenge.title}: ${Math.round(r.challenge.current).toLocaleString('vi-VN')}/${Math.round(r.challenge.target).toLocaleString('vi-VN')} ${r.challenge.unit} — chưa xong`}
            </div>
          )}
          {(r.monthStreak ?? biz.monthStreak) >= 2 && <div>🔥 Chuỗi {(r.monthStreak ?? biz.monthStreak)} tháng{r.streakXp ? ` — +${r.streakXp} XP` : ''}</div>}
          {r.best && <div>💰 Lãi nhiều nhất: {productById(r.best).name}</div>}
          {r.worst && <div>📉 Lãi mỗi món thấp nhất: {productById(r.worst).name} · cân nhắc tăng giá hoặc bỏ bớt</div>}
          <div>🎯 Mục tiêu tháng tới: {formatMoney(r.nextGoal)}</div>
        </div>
      )}
      {(() => {
        const yr = biz.year ?? emptyYear(day, yearOf(day));
        const lr = biz.lastYear;
        return (
          <>
            <div style={card}>
              <b>📅 Năm {yr.year} này (bắt đầu ngày {yr.startDay})</b>
              <div>Doanh thu {formatMoney(yr.revenue)} · Lãi {formatMoney(yr.profit)} · {yr.customers} khách ({yr.unhappy} không vui)</div>
              <div style={sub}>⭐ {yr.seasonStars} sao 4 mùa năm này · một năm = 365 ngày, khép năm có thưởng tròn năm</div>
            </div>
            {lr && (
              <div style={card}>
                <b>🏅 Báo cáo năm {lr.year}</b>
                <div>Doanh thu {formatMoney(lr.revenue)} · Lãi {formatMoney(lr.profit)} · {lr.customers} khách ({lr.unhappy} không vui)</div>
                <div>⭐ {lr.seasonStars} sao 4 mùa · 🎉 Thưởng tròn năm +{formatMoney(lr.reward)}</div>
              </div>
            )}
          </>
        );
      })()}
      {(() => {
        const a = readAlmanac(biz.seasonAlmanac ?? {});
        const nxt = nextAlmanacMilestone(a.total, biz.almanacClaimed ?? []);
        const SI: Record<string, string> = { spring: '🌱 Xuân', summer: '☀️ Hè', autumn: '🍂 Thu', winter: '❄️ Đông' };
        return (
          <div style={card}>
            <b>📖 Sổ Mùa — sao mọi mùa (đời)</b>
            <div style={sub}>Tích lũy vĩnh viễn qua các năm, không reset khi sang mùa/năm mới.</div>
            <div>{ALMANAC_SEASONS.map((s) => `${SI[s]} ${a.perSeason[s]}`).join(' · ')}</div>
            <div>⭐ Tổng {a.total} sao {a.favorite ? `· mùa hợp nhất: ${SI[a.favorite]}` : ''}</div>
            {nxt
              ? <div style={sub}>🎯 Mốc tiếp: {nxt.at} sao (còn {nxt.remaining} sao) → +{formatMoney(almanacMilestoneReward(nxt.at, level))}</div>
              : <div style={sub}>🏁 Đã chạm mốc cuối {ALMANAC_MILESTONES[ALMANAC_MILESTONES.length - 1]} sao</div>}
          </div>
        );
      })()}
    </>
  );
}
