import { useGame, formatClock } from '../../core/store';
import { productById, formatMoney } from '../../data/products';
import { nextPerk, REGULARS, type PerkEffect } from '../../data/regulars';
import { arcById, currentArcStep } from '../../data/regularArc';
import { lifetimeRegularVisits, vipTierOf, nextTierOf, monthlyTriAn, regularQuote, EMOTIONAL_FRIENDSHIP } from '../../data/regularTrust';
import { Footer, Swatch, styles } from './shared';
import { DebtBook } from './ReportPanels';

/** Biểu tượng nhận diện nhanh cho từng loại perk của khách quen. */
export const PERK_ICONS: Record<PerkEffect, string> = {
  bonus_tip: '💲',        // boa thêm tiền
  extra_item: '🛒',       // mua thêm món
  frequent_visit: '🔁',   // ghé thường hơn
  refer_friend: '👥',     // rủ bạn bè
  bulk_buy: '📦',         // mua số lượng lớn theo lô
  festival: '🎉',         // ngày hội
};

/** Khách quen: điểm thân thiết, món ưa thích đã biết, perk đã mở. */
export function RegularsPanel() {
  const { level, day, regulars, biz, closePanel } = useGame();
  const arcs = biz.regularArcs ?? {};
  const met = REGULARS.filter((r) => r.unlock <= level);
  const triVisits = lifetimeRegularVisits(regulars);
  const triTier = vipTierOf(triVisits);
  const triNext = nextTierOf(triVisits);
  const triPrev = triTier.threshold;
  const closeFriends = Object.values(regulars).filter((r) => r.friendship >= EMOTIONAL_FRIENDSHIP).length;
  const tri = monthlyTriAn(triVisits, biz.triAnMonth ?? 0, closeFriends);
  return (
    <>
      <h2 style={styles.title}>💛 Khách quen</h2>
      <DebtBook />
      <p style={styles.sub}>
        Khách quen ghé vào giờ quen. Bán đúng món họ thích thì thân hơn (+2, món khác +1, mỗi ngày một lần);
        để họ về tay không thì mất 1 điểm. Thân đủ mốc thì họ ghé thường hơn, mua thêm món và boa tiền.
      </p>
      <div style={{ ...styles.card, maxWidth: 560, marginBottom: 6, border: '1px solid rgba(243,156,18,0.4)', background: 'rgba(243,156,18,0.06)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <b>📖 Sổ thương mến</b>
          <span>{triTier.icon} {triTier.name} <span style={{ opacity: 0.7, fontSize: 12 }}>— {triVisits} lượt khách quen</span></span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, fontSize: 12 }}>
          {triNext ? (
            <>
              <div style={{ flex: 1, height: 6, background: '#555', borderRadius: 3 }}>
                <div style={{ width: `${Math.min(100, ((triVisits - triPrev) / (triNext.threshold - triPrev || 1)) * 100)}%`, height: '100%', borderRadius: 3, background: '#e67e22' }} />
              </div>
              <span style={{ opacity: 0.8 }}>còn {triNext.threshold - triVisits} lượt tới {triNext.icon} {triNext.name}</span>
            </>
          ) : (
            <span style={{ opacity: 0.8 }}>🛍️ Bậc cao nhất — bể khách quen toàn thịnh!</span>
          )}
        </div>
        <div style={{ fontSize: 12, marginTop: 4, opacity: 0.95 }}>
          Tháng này đã phục vụ <b>{biz.triAnMonth ?? 0} lượt khách quen</b>{' '}
          {closeFriends >= 1 && triTier.level >= 1
            ? <span>→ cuối tháng nhận 💝 tri ân <b style={{ color: '#2ecc71' }}>~{formatMoney(tri.amount)}</b></span>
            : <span style={{ opacity: 0.75 }}>(cần 1 khách thân 💛 ≥{EMOTIONAL_FRIENDSHIP} và bậc Tiệm ≥1 để nhận quà)</span>}
        </div>
      </div>
      <div style={{ display: 'grid', gap: 6, maxWidth: 560 }}>
        {met.map((r) => {
          const prog = regulars[r.id];
          const next = nextPerk(r, prog);
          const pts = prog?.friendship ?? 0;
          const from = r.perks.filter((p) => prog?.perks.includes(p.title)).at(-1)?.threshold ?? 0;
          const arcSt = arcs[r.id];
          const arc = arcSt ? arcById(arcSt.arcId) : undefined;
          // Thẻ gom lại (details): danh sách 10 khách quen dài ~5.000px trên điện thoại —
          // đóng mặc định để lướt nhanh, chạm vào khách cần xem mới mở chi tiết.
          return (
            <details key={r.id} style={{ background: '#3a3a4d', borderRadius: 8, padding: '8px 12px', maxWidth: 560 }}>
              <summary style={{ display: 'flex', justifyContent: 'space-between', gap: 8, cursor: 'pointer', listStyle: 'none', fontWeight: 700 }}>
                <span><Swatch color={r.color} /> {r.name}</span>
                <span style={{ opacity: 0.75, fontSize: 12, fontWeight: 400 }}>
                  {arcSt && !arcSt.done ? '📖 ' : ''}💛 {pts} · {prog?.visits ?? 0} lần ghé
                </span>
              </summary>
              <div style={{ marginTop: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 12, opacity: 0.75 }}>
                  <span>{r.role}</span>
                  <span>{formatClock(r.visitFrom)}–{formatClock(r.visitUntil)}</span>
                </div>
                <div style={{ fontSize: 12, opacity: 0.8 }}>{r.bio}</div>
                {regularQuote(r.lines.greeting, prog) && (
                  <div style={{ fontSize: 12, fontStyle: 'italic', marginTop: 2 }}>💬 “{r.lines.greeting}”</div>
                )}
                <div style={{ fontSize: 12, marginTop: 4 }}>
                  Thích: {r.favorites.map((id) => (prog?.discovered.includes(id) ? productById(id).name : '???')).join(', ')}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, fontSize: 12 }}>
                  <span>💛 {pts}</span>
                  {next && (
                    <>
                      <div style={{ flex: 1, height: 6, background: '#555', borderRadius: 3 }}>
                        <div style={{ width: `${Math.min(100, ((pts - from) / (next.threshold - from)) * 100)}%`, height: '100%', borderRadius: 3, background: '#f1c40f' }} />
                      </div>
                      <span style={{ opacity: 0.75 }}>{PERK_ICONS[next.effect]} {next.threshold}: {next.description}</span>
                    </>
                  )}
                </div>
                {!!prog?.perks.length && (
                  <div style={{ fontSize: 12, color: '#2ecc71', marginTop: 2 }}>
                    {r.perks.filter((p) => prog.perks.includes(p.title)).map((p) => PERK_ICONS[p.effect] + ' ' + p.description).join(' · ')}
                  </div>
                )}
                {arcSt && (() => {
                  if (!arc) return null;
                  if (arcSt.done) return <div style={{ fontSize: 12, color: '#e67e22', marginTop: 2 }}>📖 Đã xong: {arc.title} ✓</div>;
                  const step = currentArcStep(arc, arcSt);
                  const left = Math.max(0, arcSt.expiresDay - day);
                  return (
                    <div style={{ fontSize: 12, color: '#e67e22', marginTop: 2 }}>
                      📖 {arc.title} —&nbsp;
                      {arcSt.waitingReward
                        ? 'xong đủ bước, tối nay gom thưởng'
                        : step ? `bước ${arcSt.step + 1}/${arc.steps.length}: cần ${step.qty} ${productById(step.itemId).name}` : ''}
                      {' · hạn còn '}{left} ngày
                    </div>
                  );
                })()}
              </div>
            </details>
          );
        })}
        {REGULARS.length > met.length && <p style={styles.sub}>Lên cấp để gặp thêm {REGULARS.length - met.length} khách quen nữa.</p>}
      </div>
      <Footer onClose={closePanel} />
    </>
  );
}
