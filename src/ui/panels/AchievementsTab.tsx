import { askConfirm } from '../ConfirmDialog';
import { useGame } from '../../core/store';
import { Callout, Stat, styles } from './shared';
import { ACHIEVEMENTS } from '../../data/biz';
import { achievementCtx, freshAchievements } from '../../core/bizAchieve';
import { nearestMilestones } from '../../data/goals';
import { nextBonus, prestigeEligible, prestigePreview, PRESTIGE_BONUS, PRESTIGE_MAX_LEVEL, PRESTIGE_MIN_LEVEL, PRESTIGE_MIN_REVENUE, revenueFactor } from '../../core/prestige';
import { PARTNER_TIERS } from '../../data/supplierRel';
import { recentAvgProfit } from '../../data/gifts';
import { ngGoalProgress } from '../../data/ngGoals';
import { useSession } from '../../net/session';
import { formatMoney } from '../../data/products';
import { NearMilestonesView, NgGoalsCard, NextUnlockTeaser } from './PrestigeParts';
import { card, title, btn, sub } from './businessStyles';
import { fmtNum } from '../../core/format';

/** "Sắp đạt": nhắc những cột mốc còn cách không xa. */
function NearMilestones() {
  const { level, day, totals } = useGame();
  return <NearMilestonesView steps={nearestMilestones({ level, day, revenue: totals.revenue, itemsSold: totals.itemsSold, customers: totals.customers })} />;
}

export function Achievements() {
  const { biz } = useGame();
  const done = new Set(biz.achievements);
  const claimed = ACHIEVEMENTS.filter((a) => done.has(a.id));
  const claimedMoney = claimed.reduce((n, a) => n + a.reward, 0);
  const ctx = achievementCtx(useGame.getState());
  const waiting = freshAchievements(useGame.getState());
  const waitingMoney = waiting.reduce((n, a) => n + a.reward, 0);
  return (
    <>
      <NearMilestones />
      {/* Thẻ tổng (học từ Coffee Sứa Ơi): số bậc, tiền thưởng đã nhận, thưởng sắp về ví tối nay */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 8 }}>
        <Stat icon="🏆" label="bậc thành tựu" value={`${done.size}/${ACHIEVEMENTS.length}`} />
        <Stat icon="💰" label="thưởng đã nhận" value={formatMoney(claimedMoney)} />
        <Stat icon="⏳" label={waiting.length ? 'sắp về ví tối nay' : 'đang chờ mốc mới'} value={waitingMoney ? `+${formatMoney(waitingMoney)}` : '—'} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 6 }}>
        {ACHIEVEMENTS.map((a) => {
          const isDone = done.has(a.id);
          const g = !isDone && a.goal ? a.goal(ctx) : null;
          const pct = g ? Math.max(0, Math.min(100, (g.cur / g.goal) * 100)) : 0;
          return (
            <div key={a.id} style={{ ...card, marginBottom: 0, opacity: isDone ? 1 : 0.75 }}>
              <b>{isDone ? a.icon : '🔒'} {a.name}</b>
              <div style={sub}>{a.desc} · thưởng {formatMoney(a.reward)}</div>
              {g && (
                <div style={{ marginTop: 4 }}>
                  <div style={{ height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.15)', overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', borderRadius: 3, background: '#f1c40f' }} />
                  </div>
                  <div style={{ ...sub, fontSize: 11, marginTop: 2 }}>
                    {g.money
                      ? `${formatMoney(Math.min(g.cur, g.goal))} / ${formatMoney(g.goal)}`
                      : `${fmtNum(Math.min(g.cur, g.goal))} / ${fmtNum(g.goal)}`}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <PrestigeSection />
    </>
  );
}

/** Tái sinh (NG+): bắt đầu lại tiệm từ cấp 1, giữ bộ sưu tập tài khoản, doanh thu tăng dần theo số lần. */
function PrestigeSection() {
  const { biz, level, totals, day, marketClearedDay, history, analytics, ordersDone, staff } = useGame();
  const online = !!useSession((ss) => ss.coop);
  const p = biz.prestige;
  const eligible = prestigeEligible(level, totals.revenue, p.level);
  const capped = p.level >= PRESTIGE_MAX_LEVEL;
  const nextMult = capped ? null : revenueFactor(nextBonus(p.level));
  const preview = prestigePreview({
    level,
    lifetimeRevenue: totals.revenue,
    prestigeLevel: p.level,
    bonus: p.bonus,
    avgDailyProfit: recentAvgProfit(history),
    supplierRel: biz.supplierRel ?? {},
    marketClearedDay,
    currentDay: day,
    analyticsDays: Math.max(0, Object.keys(analytics?.flags ?? {}).length),
    brandLegacy: p.brandLegacy ?? null, // Hệ4-L9 — nhãn vòng trước
    brand: biz.brand ?? null,           // Hệ4-L9 — nhãn đang có ở vòng này
  });
  const goals = ngGoalProgress({
    prestigeLevel: p.level,
    level,
    staffCount: staff.length,
    ordersDone,
    supplierRel: biz.supplierRel ?? {},
    marketClearedDay,
    rivalsBeaten: biz.rivalsBeaten, // GĐ171: mục tiêu rival đo theo vòng (reset mỗi tái sinh — GĐ170)
    stance: biz.stance, // Hệ3-L8: mục tiêu theo hướng biển đo bậc vòng này
  });
  return (
    <div style={{ ...card, marginTop: 8, border: '1px solid rgba(241,196,15,0.4)' }}>
      <div style={title}>🌟 Tái sinh (NG+)</div>
      {p.brandLegacy && (
        <div style={{ ...sub, opacity: 0.85 }}>
          🏷️ Hồ sơ nhãn: <b>{p.brandLegacy.name}</b> (uy tín cao nhất {p.brandLegacy.maxRep}/100).
        </div>
      )}
      {capped ? (
        <div style={sub}>
          Đã tái sinh tối đa {PRESTIGE_MAX_LEVEL} lần — doanh thu đang +{Math.round(p.bonus * 100)}%.
        </div>
      ) : eligible ? (
        <>
          <div style={sub}>
            Vòng {p.level + 1}. Doanh thu đang +{Math.round(p.bonus * 100)}%, tái sinh thêm sẽ là +{Math.round((nextMult! - 1) * 100)}% (tối đa +{Math.round(PRESTIGE_MAX_LEVEL * PRESTIGE_BONUS * 100)}%).
          </div>
          {!capped && (
            <Callout tone="ok" title="🌳 Chuẩn bị tái sinh" style={{ marginTop: 8 }}>
              {preview.projectedDailyGain > 0 && (
                <div style={sub}>
                  Nhận: vòng sau lời thêm ≈ <b>{formatMoney(preview.projectedDailyGain)}/ngày</b> (thêm +{preview.nextBonus}% so với lãi hiện tại).
                </div>
              )}
              <div style={sub}>
                Bỏ lại:{' '}
                {preview.suppliersActive > 0 ? <b>{preview.suppliersActive} mối quen</b> : 'chưa có mối quen'}
                {preview.topRelTier > 0 && <span>{` (bậc ${preview.topRelTier}${preview.topRelTier >= PARTNER_TIERS.length ? '' : ', còn hoàn tháng'})`}</span>}
                {' · '}
                {preview.analyticsDays > 0 ? <b>{preview.analyticsDays} ngày</b> : '0 ngày'} dữ liệu phân tích
                {preview.unsoldMarketDay && <span style={{ color: '#f1c40f' }}> · 🧺 phiên chợ hôm nay chưa kịp gánh!</span>}
                {preview.lostBrand && <span style={{ color: '#f1c40f' }}> · 🏷️ nhãn <b>{preview.lostBrand.name}</b> (uy tín {preview.lostBrand.maxRep})</span>}
              </div>
            </Callout>
          )}
          {online && <div style={sub}>Chơi hẻm online không tái sinh được — chỉ ở chế độ chơi đơn.</div>}
          {!online && (
            <button
              style={{ ...btn, marginLeft: 0, marginTop: 6 }}
              onClick={async () => {
                if (!await askConfirm('🌟 Tái sinh: bắt đầu lại tiệm từ cấp 1, KHÔNG THỂ HOÀN TÁC!\n\nThành tựu, danh hiệu, cốt truyện, nhà, xe, thú cưng, bộ sưu tập và doanh thu cả đời giữ nguyên; tiền, cấp, ngày, nội thất, kho, nhân viên, trang trại... đều làm lại từ đầu.', { danger: true, title: '🌟 Tái sinh', okLabel: 'Tái sinh' })) return;
                useGame.getState().doPrestige();
              }}
            >🌟 Tái sinh</button>
          )}
        </>
      ) : (
        <div style={{ ...sub, color: '#999' }}>
          Cần cấp {PRESTIGE_MIN_LEVEL} + doanh thu cả đời {formatMoney(PRESTIGE_MIN_REVENUE)} để tái sinh (mở khi cuối game). Giữ bộ sưu tập tài khoản và bán đắt dần mỗi vòng.
        </div>
      )}
      <NgGoalsCard prestigeLevel={p.level} cachedGoals={goals} claimedIds={p.goalsClaimed ?? []} onClaim={(id) => useGame.getState().claimNgGoal(id)} />
      <NextUnlockTeaser prestige={p.level} />
    </div>
  );
}

