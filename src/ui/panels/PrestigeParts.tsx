import { Callout } from './shared';
import { formatMoney, fmtMul } from '../../data/products';
import { runRewardScale, runTargetScale, type NgGoal } from '../../data/ngGoals';
import type { MilestoneStep } from '../../data/goals';
import { PRESTIGE_TITLES } from '../../data/titles';
import { PRESTIGE_COSTUMES } from '../../data/costumes';
import { btn, card, pill, sub } from './businessStyles';
import { fmtNum } from '../../core/format';
import { t } from '../../core/i18n';

/** GĐ954: các thẻ props-based của tab Thành tựu/Tái sinh, tách nguyên văn khỏi BusinessPanel. */
/** "Sắp đạt": nhắc những cột mốc người chơi còn cách không xa — mồi "thêm chút nữa là xong". */
const UNIT: Record<MilestoneStep['m']['key'], string> = { level: t('panels_misc.cap_2'), day: t('panels_misc.ngay_2'), revenue: t('panels_misc.dong'), itemsSold: t('panels_misc.mon'), customers: t('panels_misc.khach') };
export function NearMilestonesView({ steps }: { steps: MilestoneStep[] }) {
  if (steps.length === 0) return null;
  return (
    <div style={card}>
      <b>{t('panels_misc.sap_dat')}{' '}{steps.length}{' '}{t('panels_misc.moc_gan_nhat')}</b>
      {steps.map(({ m, pct, remaining }) => (
        <div key={m.id} style={{ marginTop: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
            <span>{m.icon} {m.name}</span>
            <span style={sub}>{t('panels_misc.con')}{' '}{fmtNum(remaining)} {UNIT[m.key]}</span>
          </div>
          <div style={{ height: 6, background: '#555', borderRadius: 4, marginTop: 3 }}>
            <div style={{ width: `${Math.round(pct * 100)}%`, height: '100%', borderRadius: 4, background: '#f1c40f' }} />
          </div>
        </div>
      ))}
      <div style={sub}>{t('panels_misc.tien_do_tinh_theo_tong_doanh')}</div>
    </div>
  );
}

/** 🌱 Mục tiêu vòng tái sinh (GĐ140): danh sách mốc NG+ theo vòng, nhận thưởng khi đạt — chỉ hiện ở vòng NG+ (prestige ≥ 1).
 * GĐ171: mục tiêu/thưởng nhân theo vòng (mục tiêu ×k, thưởng ×m) — dòng đầu báo rõ để người chơi thấy vòng sau khác vòng trước. */
export function NgGoalsCard({ prestigeLevel, cachedGoals, claimedIds, onClaim }: { prestigeLevel: number; cachedGoals: Array<Omit<NgGoal, 'done'> & { done: boolean; target?: number }>; claimedIds: string[]; onClaim: (id: string) => void }) {
  if (prestigeLevel < 1) return null;
  const claimed = new Set(claimedIds);
  const doneCount = cachedGoals.filter((g) => g.done).length;
  const tScale = runTargetScale(prestigeLevel);
  const rScale = runRewardScale(prestigeLevel);
  const fmtScale = (n: number) => fmtMul(n, 1);
  return (
    <Callout tone="info" title={t('panels_misc.muc_tieu_vong_tai_sinh')} style={{ marginTop: 10 }}>
      <div style={sub}>
        {t('panels_misc.vong')}{' '}{prestigeLevel + 1}{' '}{t('panels_misc.muc_tieu')}{fmtScale(tScale)}{t('panels_misc.thuong')}{fmtScale(rScale)}{' '}{t('panels_misc.vong_sau_kho_hon_den_xung')}
      </div>
      <div style={sub}>{t('panels_misc.dat')}{' '}{doneCount}/{cachedGoals.length}{' '}{t('panels_misc.moc_cua_vong_nay_nhan_thuong')}</div>
      {cachedGoals.map((g) => {
        const isClaimed = claimed.has(g.id);
        return (
          <div key={g.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginTop: 6 }}>
            <div>
              <span style={{ opacity: g.done ? 1 : 0.55 }}>{g.icon} <b>{g.name}</b> — {g.desc}</span>
              <div style={{ ...sub, color: g.done ? '#2ecc71' : undefined }}>{g.done ? t('panels_misc.dat_2') : t('panels_misc.chua_dat')}</div>
            </div>
            {g.done && !isClaimed ? (
              <button style={btn} onClick={() => onClaim(g.id)}>{t('panels_misc.nhan')}{formatMoney(g.reward)}</button>
            ) : isClaimed ? (
              <span style={{ ...pill, background: 'rgba(46,204,113,0.2)', color: '#2ecc71' }}>{t('panels_misc.da_nhan')}</span>
            ) : (
              <span style={{ ...pill, background: 'rgba(241,196,15,0.15)', color: '#f1c40f' }}>+{formatMoney(g.reward)}</span>
            )}
          </div>
        );
      })}
    </Callout>
  );
}

/** Mồi tiến trình: cho thấy thứ NG+ độc quyền sẽ mở ở mức tái sinh kế tiếp (và các mức xa hơn). */
export function NextUnlockTeaser({ prestige }: { prestige: number }) {
  const locked = ([
    ...PRESTIGE_TITLES.map((pt) => ({ icon: pt.lockIcon ?? '🔒', need: pt.prestige ?? 0, name: pt.name, kind: t('panels_misc.danh_hieu') })),
    ...PRESTIGE_COSTUMES.map((c) => ({ icon: '👕', need: c.prestige ?? 0, name: c.name, kind: t('panels_misc.trang_phuc') })),
  ]).filter((x) => !x.need || x.need > prestige);
  const next = locked.filter((x) => x.need === prestige + 1);
  const farther = locked.filter((x) => x.need > prestige + 1);
  if (!next.length && !farther.length) return null;
  return (
    <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px dashed rgba(255,255,255,0.12)' }}>
      {next.length > 0 && (
        <div style={sub}>
          <b style={{ color: '#f1c40f' }}>{t('panels_misc.mo_khoa_ng_o_lan_tai')}</b>
          <div style={{ marginTop: 4, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {next.map((x) => (
              <span key={`${x.kind}-${x.name}`} style={{ background: 'rgba(241,196,15,0.12)', padding: '4px 8px', borderRadius: 6, fontSize: 12 }}>
                {x.icon} <b>{x.name}</b> <span style={{ opacity: 0.7 }}>({x.kind})</span>
              </span>
            ))}
          </div>
        </div>
      )}
      {farther.length > 0 && (
        <div style={{ ...sub, marginTop: 6, opacity: 0.55 }}>
          {t('panels_misc.con_cho_o_muc_tai_sinh')}{' '}{farther.map((x) => t('panels_misc.lan', { icon: x.icon, name: x.name, need: x.need })).join(' · ')}
        </div>
      )}
    </div>
  );
}
