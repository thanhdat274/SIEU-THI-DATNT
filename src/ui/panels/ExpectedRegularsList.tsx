import { formatClock, type GameState } from '../../core/store';
import { productById, formatMoney } from '../../data/products';
import type { RegularDef } from '../../data/regulars';
import type { RegularHurt } from '../../data/regularChurn';
import type { RegularSpend, NextPerkValue, ReferValue, NextPerkTimeline } from '../../data/regularValue';
import { Swatch, styles } from './shared';

/** GĐ941: tách khỏi MorningPanel (nguyên văn danh sách khách quen dự kiến ghé hôm nay). */
export function ExpectedRegularsList({ expected, regulars, reservations, favsOf, haveStock, churn, value, nextPerk, refer, timeline }: {
  expected: RegularDef[]; regulars: GameState['regulars']; reservations: GameState['reservations'];
  favsOf: (rid: string) => string[]; haveStock: (id: string) => boolean;
  /** GĐ1285 — khách quen nào đang bị phụ món ưa (missLog/reviews); không có thì bỏ qua. */
  churn?: RegularHurt[];
  /** GĐ1289 — ước tính tiền mỗi lần ghé của khách quen (giỏ + boa); chỉ dùng để định lượng rủi ro mất tiền khi đang bị phụ. */
  value?: (rid: string) => RegularSpend | null;
  /** GĐ1293 — mốc perk kế tiếp tăng (đ)/lần ghé nếu nâng thân thiết; chỉ hiện khi có tiền + còn ít mốc. */
  nextPerk?: (rid: string) => NextPerkValue | null;
  /** GĐ1298 — giá trị perk giới thiệu bạn bè (khách lẻ + doanh thu/tuần); chỉ hiện khi đã có perk. */
  refer?: (rid: string) => ReferValue | null;
  /** GĐ1301 — mốc perk kế tiếp còn bao lâu (tuần): bổ sung vào dòng ⚡ khi có. */
  timeline?: (rid: string) => NextPerkTimeline | null;
}) {
  return (
    <>
      <h3 style={{ margin: '10px 0 4px', fontSize: 14 }}>💛 Khách quen dự kiến ghé hôm nay ({expected.length})</h3>
      {expected.length === 0 && <p style={styles.sub}>Không ai trong nhóm khách quen có lịch ghé hôm nay.</p>}
      <div style={{ display: 'grid', gap: 6 }}>
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
              {(() => {
                const nv = nextPerk ? nextPerk(r.id) : null;
                if (!nv || nv.delta == null || nv.delta <= 0 || nv.toGo > 4) return null;
                const tl = timeline ? timeline(r.id) : null;
                return (
                  <div style={{ fontSize: 11, marginTop: 3, color: '#16a085' }}>
                    ⚡ {nv.perk.title} (+~{formatMoney(nv.delta)}/lần) — còn {nv.toGo} thân thiết
                    {tl && tl.weeksToPerk > 0 ? ` (~${tl.weeksToPerk} tuần)` : ''}
                  </div>
                );
              })()}
              {(() => {
                const rf = refer ? refer(r.id) : null;
                if (!rf || rf.extraRevenueWeek <= 0) return null;
                return (
                  <div style={{ fontSize: 11, marginTop: 3, color: '#8e44ad' }}>
                    👥 Rủ thêm ~{rf.extraCustomersWeek} khách/tuần (≈{formatMoney(rf.extraRevenueWeek)})
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
