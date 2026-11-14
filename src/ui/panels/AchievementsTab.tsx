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
import { t } from '../../core/i18n';

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
        <Stat icon="🏆" label={t('panels_quest.bac_thanh_tuu')} value={`${done.size}/${ACHIEVEMENTS.length}`} />
        <Stat icon="💰" label={t('panels_quest.thuong_da_nhan')} value={formatMoney(claimedMoney)} />
        <Stat icon="⏳" label={waiting.length ? t('panels_quest.sap_ve_vi_toi_nay') : t('panels_quest.dang_cho_moc_moi')} value={waitingMoney ? `+${formatMoney(waitingMoney)}` : '—'} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 6 }}>
        {ACHIEVEMENTS.map((a) => {
          const isDone = done.has(a.id);
          const g = !isDone && a.goal ? a.goal(ctx) : null;
          const pct = g ? Math.max(0, Math.min(100, (g.cur / g.goal) * 100)) : 0;
          return (
            <div key={a.id} style={{ ...card, marginBottom: 0, opacity: isDone ? 1 : 0.75 }}>
              <b>{isDone ? a.icon : '🔒'} {a.name}</b>
              <div style={sub}>{a.desc}{' '}{t('panels_quest.thuong_4')}{' '}{formatMoney(a.reward)}</div>
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
      <div style={title}>{t('panels_quest.tai_sinh_ng')}</div>
      {p.brandLegacy && (
        <div style={{ ...sub, opacity: 0.85 }}>
          {t('panels_quest.ho_so_nhan')}{' '}<b>{p.brandLegacy.name}</b>{' '}{t('panels_quest.uy_tin_cao_nhat')}{' '}{p.brandLegacy.maxRep}/100).
        </div>
      )}
      {capped ? (
        <div style={sub}>
          {t('panels_quest.da_tai_sinh_toi_da')}{' '}{PRESTIGE_MAX_LEVEL}{' '}{t('panels_quest.lan_doanh_thu_dang')}{Math.round(p.bonus * 100)}%.
        </div>
      ) : eligible ? (
        <>
          <div style={sub}>
            {t('panels_quest.vong')}{' '}{p.level + 1}{t('panels_quest.doanh_thu_dang')}{Math.round(p.bonus * 100)}{t('panels_quest.tai_sinh_them_se_la')}{Math.round((nextMult! - 1) * 100)}{t('panels_quest.toi_da')}{Math.round(PRESTIGE_MAX_LEVEL * PRESTIGE_BONUS * 100)}%).
          </div>
          {!capped && (
            <Callout tone="ok" title={t('panels_quest.chuan_bi_tai_sinh')} style={{ marginTop: 8 }}>
              {preview.projectedDailyGain > 0 && (
                <div style={sub}>
                  {t('panels_quest.nhan_vong_sau_loi_them')}{' '}<b>{formatMoney(preview.projectedDailyGain)}{t('panels_quest.ngay_3')}</b>{' '}{t('panels_quest.them')}{preview.nextBonus}{t('panels_quest.so_voi_lai_hien_tai')}
                </div>
              )}
              <div style={sub}>
                {t('panels_quest.bo_lai')}{' '}
                {preview.suppliersActive > 0 ? <b>{preview.suppliersActive}{' '}{t('panels_quest.moi_quen')}</b> : t('panels_quest.chua_co_moi_quen')}
                {preview.topRelTier > 0 && <span>{` (bậc ${preview.topRelTier}${preview.topRelTier >= PARTNER_TIERS.length ? '' : ', còn hoàn tháng'})`}</span>}
                {' · '}
                {preview.analyticsDays > 0 ? <b>{preview.analyticsDays}{' '}{t('panels_quest.ngay_4')}</b> : t('panels_quest.0_ngay')}{' '}{t('panels_quest.du_lieu_phan_tich')}
                {preview.unsoldMarketDay && <span style={{ color: '#f1c40f' }}>{' '}{t('panels_quest.phien_cho_hom_nay_chua_kip')}</span>}
                {preview.lostBrand && <span style={{ color: '#f1c40f' }}>{' '}{t('panels_quest.nhan_2')}{' '}<b>{preview.lostBrand.name}</b>{' '}{t('panels_quest.uy_tin')}{' '}{preview.lostBrand.maxRep})</span>}
              </div>
            </Callout>
          )}
          {online && <div style={sub}>{t('panels_quest.choi_hem_online_khong_tai_sinh')}</div>}
          {!online && (
            <button
              style={{ ...btn, marginLeft: 0, marginTop: 6 }}
              onClick={async () => {
                if (!await askConfirm(t('panels_quest.tai_sinh_bat_dau_lai_tiem'), { danger: true, title: t('panels_quest.tai_sinh'), okLabel: t('panels_quest.tai_sinh_2') })) return;
                useGame.getState().doPrestige();
              }}
            >{t('panels_quest.tai_sinh')}</button>
          )}
        </>
      ) : (
        <div style={{ ...sub, color: '#999' }}>
          {t('panels_quest.can_cap')}{' '}{PRESTIGE_MIN_LEVEL}{' '}{t('panels_quest.doanh_thu_ca_doi')}{' '}{formatMoney(PRESTIGE_MIN_REVENUE)}{' '}{t('panels_quest.de_tai_sinh_mo_khi_cuoi')}
        </div>
      )}
      <NgGoalsCard prestigeLevel={p.level} cachedGoals={goals} claimedIds={p.goalsClaimed ?? []} onClaim={(id) => useGame.getState().claimNgGoal(id)} />
      <NextUnlockTeaser prestige={p.level} />
    </div>
  );
}

