import { askConfirm } from '../ConfirmDialog';
import { useGame } from '../../core/store';
import { Callout } from './shared';
import { ACHIEVEMENTS } from '../../data/biz';
import { nearestMilestones } from '../../data/goals';
import { nextBonus, prestigeEligible, prestigePreview, PRESTIGE_BONUS, PRESTIGE_MAX_LEVEL, PRESTIGE_MIN_LEVEL, PRESTIGE_MIN_REVENUE, revenueFactor } from '../../core/prestige';
import { PARTNER_TIERS } from '../../data/supplierRel';
import { recentAvgProfit } from '../../data/gifts';
import { ngGoalProgress } from '../../data/ngGoals';
import { useSession } from '../../net/session';
import { formatMoney } from '../../data/products';
import { NearMilestonesView, NgGoalsCard, NextUnlockTeaser } from './PrestigeParts';
import { card, title, btn, sub } from './businessStyles';

/** "Sắp đạt": nhắc những cột mốc còn cách không xa. */
function NearMilestones() {
  const { level, day, totals } = useGame();
  return <NearMilestonesView steps={nearestMilestones({ level, day, revenue: totals.revenue, itemsSold: totals.itemsSold, customers: totals.customers })} />;
}

export function Achievements() {
  const { biz } = useGame();
  const done = new Set(biz.achievements);
  return (
    <>
      <NearMilestones />
      <p style={sub}>Đã đạt {done.size}/{ACHIEVEMENTS.length} thành tựu.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 6 }}>
        {ACHIEVEMENTS.map((a) => (
          <div key={a.id} style={{ ...card, marginBottom: 0, opacity: done.has(a.id) ? 1 : 0.55 }}>
            <b>{done.has(a.id) ? a.icon : '🔒'} {a.name}</b>
            <div style={sub}>{a.desc} · thưởng {formatMoney(a.reward)}</div>
          </div>
        ))}
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

