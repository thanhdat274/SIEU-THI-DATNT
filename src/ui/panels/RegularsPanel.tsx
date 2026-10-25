import { useGame, formatClock } from '../../core/store';
import { productById } from '../../data/products';
import { nextPerk, REGULARS, type PerkEffect } from '../../data/regulars';
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
  const { level, regulars, closePanel } = useGame();
  const met = REGULARS.filter((r) => r.unlock <= level);
  return (
    <>
      <h2 style={styles.title}>💛 Khách quen</h2>
      <DebtBook />
      <p style={styles.sub}>
        Khách quen ghé vào giờ quen. Bán đúng món họ thích thì thân hơn (+2, món khác +1, mỗi ngày một lần);
        để họ về tay không thì mất 1 điểm. Thân đủ mốc thì họ ghé thường hơn, mua thêm món và boa tiền.
      </p>
      <div style={{ display: 'grid', gap: 6, maxWidth: 560 }}>
        {met.map((r) => {
          const prog = regulars[r.id];
          const next = nextPerk(r, prog);
          const pts = prog?.friendship ?? 0;
          const from = r.perks.filter((p) => prog?.perks.includes(p.title)).at(-1)?.threshold ?? 0;
          return (
            <div key={r.id} style={{ ...styles.card, display: 'block' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <b><Swatch color={r.color} /> {r.name}</b>
                <span style={{ opacity: 0.75, fontSize: 12 }}>{formatClock(r.visitFrom)}–{formatClock(r.visitUntil)} · {prog?.visits ?? 0} lần ghé</span>
              </div>
              <div style={{ fontSize: 12, opacity: 0.8 }}>{r.role}. {r.bio}</div>
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
            </div>
          );
        })}
        {REGULARS.length > met.length && <p style={styles.sub}>Lên cấp để gặp thêm {REGULARS.length - met.length} khách quen nữa.</p>}
      </div>
      <Footer onClose={closePanel} />
    </>
  );
}
