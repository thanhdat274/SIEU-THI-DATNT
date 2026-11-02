import { Callout } from './shared';
import { formatMoney, fmtMul } from '../../data/products';
import { runRewardScale, runTargetScale, type NgGoal } from '../../data/ngGoals';
import type { MilestoneStep } from '../../data/goals';
import { PRESTIGE_TITLES } from '../../data/titles';
import { PRESTIGE_COSTUMES } from '../../data/costumes';
import { btn, card, pill, sub } from './businessStyles';

/** GĐ954: các thẻ props-based của tab Thành tựu/Tái sinh, tách nguyên văn khỏi BusinessPanel. */
/** "Sắp đạt": nhắc những cột mốc người chơi còn cách không xa — mồi "thêm chút nữa là xong". */
const UNIT: Record<MilestoneStep['m']['key'], string> = { level: 'cấp', day: 'ngày', revenue: 'đồng', itemsSold: 'món', customers: 'khách' };
export function NearMilestonesView({ steps }: { steps: MilestoneStep[] }) {
  if (steps.length === 0) return null;
  return (
    <div style={card}>
      <b>🎯 Sắp đạt: {steps.length} mốc gần nhất</b>
      {steps.map(({ m, pct, remaining }) => (
        <div key={m.id} style={{ marginTop: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
            <span>{m.icon} {m.name}</span>
            <span style={sub}>còn {remaining.toLocaleString('vi-VN')} {UNIT[m.key]}</span>
          </div>
          <div style={{ height: 6, background: '#555', borderRadius: 4, marginTop: 3 }}>
            <div style={{ width: `${Math.round(pct * 100)}%`, height: '100%', borderRadius: 4, background: '#f1c40f' }} />
          </div>
        </div>
      ))}
      <div style={sub}>Tiến độ tính theo tổng doanh thu từng đạt, không theo tiền đang có.</div>
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
    <Callout tone="info" title="🌱 Mục tiêu vòng tái sinh" style={{ marginTop: 10 }}>
      <div style={sub}>
        Vòng {prestigeLevel + 1} — mục tiêu ×{fmtScale(tScale)}, thưởng ×{fmtScale(rScale)} (vòng sau khó hơn, đền xứng hơn; trần ×3 / ×2,5).
      </div>
      <div style={sub}>Đạt {doneCount}/{cachedGoals.length} mốc của vòng này — nhận thưởng tiền, reset khi tái sinh lần sau.</div>
      {cachedGoals.map((g) => {
        const isClaimed = claimed.has(g.id);
        return (
          <div key={g.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginTop: 6 }}>
            <div>
              <span style={{ opacity: g.done ? 1 : 0.55 }}>{g.icon} <b>{g.name}</b> — {g.desc}</span>
              <div style={{ ...sub, color: g.done ? '#2ecc71' : undefined }}>{g.done ? '✓ Đạt' : 'Chưa đạt'}</div>
            </div>
            {g.done && !isClaimed ? (
              <button style={btn} onClick={() => onClaim(g.id)}>Nhận +{formatMoney(g.reward)}</button>
            ) : isClaimed ? (
              <span style={{ ...pill, background: 'rgba(46,204,113,0.2)', color: '#2ecc71' }}>✓ Đã nhận</span>
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
    ...PRESTIGE_TITLES.map((t) => ({ icon: t.lockIcon ?? '🔒', need: t.prestige ?? 0, name: t.name, kind: 'Danh hiệu' as const })),
    ...PRESTIGE_COSTUMES.map((c) => ({ icon: '👕', need: c.prestige ?? 0, name: c.name, kind: 'Trang phục' as const })),
  ]).filter((x) => !x.need || x.need > prestige);
  const next = locked.filter((x) => x.need === prestige + 1);
  const farther = locked.filter((x) => x.need > prestige + 1);
  if (!next.length && !farther.length) return null;
  return (
    <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px dashed rgba(255,255,255,0.12)' }}>
      {next.length > 0 && (
        <div style={sub}>
          <b style={{ color: '#f1c40f' }}>Mở khóa NG+ ở lần tái sinh tiếp theo:</b>
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
          Còn chờ ở mức tái sinh cao hơn: {farther.map((x) => `${x.icon} ${x.name} (${x.need} lần)`).join(' · ')}
        </div>
      )}
    </div>
  );
}
