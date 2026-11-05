import { formatClock, type GameState } from '../../core/store';
import { productById, formatMoney } from '../../data/products';
import type { RegularDef } from '../../data/regulars';
import type { RegularHurt } from '../../data/regularChurn';
import type { RegularSpend } from '../../data/regularValue';
import { Swatch, styles } from './shared';

/** GĐ941: tách khỏi MorningPanel (nguyên văn danh sách khách quen dự kiến ghé hôm nay). */
export function ExpectedRegularsList({ expected, regulars, reservations, favsOf, haveStock, churn, value }: {
  expected: RegularDef[]; regulars: GameState['regulars']; reservations: GameState['reservations'];
  favsOf: (rid: string) => string[]; haveStock: (id: string) => boolean;
  /** GĐ1285 — khách quen nào đang bị phụ món ưa (missLog/reviews); không có thì bỏ qua. */
  churn?: RegularHurt[];
  /** GĐ1289 — ước tính tiền mỗi lần ghé của khách quen (giỏ + boa); chỉ dùng để định lượng rủi ro mất tiền khi đang bị phụ. */
  value?: (rid: string) => RegularSpend | null;
}) {
  return (
    <>
      <h3 style={{ margin: '10px 0 4px', fontSize: 14 }}>💛 Khách quen dự kiến ghé hôm nay ({expected.length})</h3>
      {expected.length === 0 && <p style={styles.sub}>Không ai trong nhóm khách quen có lịch ghé hôm nay.</p>}
      <div style={{ display: 'grid', gap: 6, maxWidth: 560 }}>
        {expected.map((r) => {
          const prog = regulars[r.id];
          const res = reservations[r.id];
          const favs = favsOf(r.id);
          return (
            <div key={r.id} style={{ ...styles.card, display: 'block' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <b><Swatch color={r.color} /> {r.name}</b>
                <span style={{ fontSize: 12, opacity: 0.7 }}>{formatClock(r.visitFrom)}–{formatClock(r.visitUntil)}{res ? ' · 🤝 đang giữ món hẹn' : ''}</span>
              </div>
              <div style={{ fontSize: 12, marginTop: 2 }}>
                Món thích: {favs.length
                  ? favs.map((id) => `${prog?.discovered.includes(id) || res?.productId === id ? productById(id).name : '???'}${haveStock(id) ? ' ✓' : ' ⚠️'}`).join(', ')
                  : 'chưa biết'}
              </div>
              {(() => {
                const cb = churn?.find((h) => h.regular.id === r.id);
                if (!cb) return null;
                const v = value ? value(r.id) : null;
                const tail = v ? ` bị hụt — kẻo bỏ, mất ~${formatMoney(v.total)}/lần ghé` : ' bị hụt — kẻo khách quen này bỏ.';
                return (
                  <div style={{ fontSize: 11, marginTop: 3, color: '#e74c3c' }}>
                    💔 {cb.hitFavorites.slice(0, 2).map((h) => `${productById(h.productId)?.name ?? h.productId} (${h.count})`).join(', ')}{tail}
                  </div>
                );
              })()}
            </div>
          );
        })}
      </div>
    </>
  );
}
