import { useGame } from '../../core/store';
import { formatMoney, productById } from '../../data/products';
import { regularById } from '../../data/regulars';
import { menuFulfillable, menuCookMinutes, menuValue, lifeEventById, gioLabel, LIFE_EVENT_KIND_LABEL, type LifeEventState } from '../../data/lifeEvent';
import type { CookingStation } from '../../data/recipes';
import { styles } from './shared';

const TIER = ['gọn', 'đủ', 'linh đình'] as const;
const TIER_ICON = ['🥣', '🍲', '🏮'];

/** GĐ Hệ2-L3 (SPEC-CHIEU-SAU §2.5) — Thẻ "🏮 Việc nhà trong hẻm" ở Sổ đầu ngày.
 *  Hiện khi `biz.lifeEvent` có việc đang mời/đã nhận:
 *   - Chưa nhận: cho xem từng mức cỗ (gọn/đủ/linh đình) cần gì, đã có trạm chưa, tổng giờ nấu,
 *     thưởng ra sao → nút Nhận (chọn mức) / Từ chối (không mất gì).
 *   - Đã nhận: đếm lùi + còn thiếu gì trong kho + nút Giao khi tới ngày. */
export function LifeEventCard({
  st,
  stations,
}: {
  st: LifeEventState;
  stations: readonly string[];
}) {
  const def = lifeEventById(st.defId);
  const money = useGame((s) => s.money);
  const day = useGame((s) => s.day);
  const storage = useGame((s) => s.storage);
  const accept = useGame((s) => s.acceptLifeEvent);
  const decline = useGame((s) => s.declineLifeEvent);
  const deliver = useGame((s) => s.deliverLifeEvent);
  if (!def) return null;
  const host = regularById(def.host);
  const hostName = host?.name ?? def.host;
  const daysLeft = st.eventDay - day;
  const kindLabel = LIFE_EVENT_KIND_LABEL[def.kind];
  const whenLabel = def.kind === 'gio' ? ` · ${gioLabel(def)} hằng năm` : '';

  if (!st.accepted) {
    // Đang MỜI — bấm chọn mức cỗ.
    return (
      <div style={{ ...styles.card, display: 'block', fontSize: 12, lineHeight: 1.6, marginBottom: 8, borderLeft: '3px solid #f1c40f' }}>
        <b style={{ ...styles.cardTitle, color: '#f1c40f' }}>🏮 Việc nhà trong hẻm · {kindLabel} {hostName}{whenLabel}</b>
        <div style={{ marginTop: 2, color: '#f5d799' }}>
          Nhà {hostName} có việc, nhờ tiệm lo cỗ. Còn <b>{daysLeft}</b> ngày {daysLeft > 1 ? 'nữa' : ''}. Chọn mức cỗ:
        </div>
        <div style={{ marginTop: 6 }}>
          {def.menus.map((menu, tier) => {
            const need = Object.entries(menu);
            const okStations = menuFulfillable(menu, stations as CookingStation[]);
            const minutes = menuCookMinutes(menu);
            return (
              <div key={tier} style={{ border: '1px solid rgba(241, 196, 15, 0.28)', borderRadius: 6, padding: 8, marginBottom: 6, background: 'rgba(255,255,255,0.06)' }}>
                <div style={{ color: '#f1c40f' }}><b>{TIER_ICON[tier]} Cỗ {TIER[tier]}</b> — nhận {formatMoney(def.bonus[tier] as number)} · 💛 +{def.friendship[tier]} thân thiết</div>
                <div style={{ marginTop: 2, color: 'rgba(255,255,255,0.82)' }}>
                  {need.map(([id, q]) => `${q} ${productById(id)?.name ?? id}`).join(' · ')}
                  <span style={{ color: okStations ? '#2ecc71' : '#ff7675' }}> · {okStations ? 'đủ trạm nấu' : 'thiếu trạm'}</span>
                  {' · '}≈{Math.round(minutes / 60)}h nấu
                </div>
                <button
                  onClick={() => accept(tier as 0 | 1 | 2)}
                  style={{ ...styles.btn, marginTop: 6, background: okStations ? '#e67e22' : 'rgba(255,255,255,0.14)', color: okStations ? '#fff' : 'rgba(255,255,255,0.45)', fontWeight: okStations ? 700 : 400, cursor: okStations ? 'pointer' : 'not-allowed' }}
                  disabled={!okStations}
                >
                  {okStations ? `Nhận cỗ ${TIER[tier]}` : 'Cần trạm nấu trước'}
                </button>
              </div>
            );
          })}
        </div>
        <button onClick={decline} style={{ ...styles.btn, marginTop: 4, background: 'transparent', border: '1px solid rgba(255,255,255,0.22)', color: 'rgba(255,255,255,0.78)' }}>
          Từ chối (không mất gì)
        </button>
        <div style={{ marginTop: 4, color: 'rgba(255,255,255,0.62)' }}>Lỡ hẹn sau khi nhận: chủ và cả họ hụt thân thiết, một review 1★.</div>
      </div>
    );
  }

  // Đã nhận — đếm lùi + còn thiếu gì.
  const menu = def.menus[st.tier];
  const missing = Object.entries(menu)
    .filter(([id, q]) => (storage[id] ?? 0) < q)
    .map(([id, q]) => `${q - (storage[id] ?? 0)} ${productById(id)?.name ?? id}`);
  const ready = daysLeft <= 0 && missing.length === 0;
  return (
    <div style={{ ...styles.card, display: 'block', fontSize: 12, lineHeight: 1.6, marginBottom: 8, borderLeft: '3px solid #f1c40f' }}>
      <b style={{ ...styles.cardTitle, color: '#f1c40f' }}>🏮 Đã nhận {kindLabel} {hostName}{whenLabel} · mức {TIER[st.tier]}</b>
      {daysLeft > 0
        ? <div style={{ marginTop: 2, color: 'rgba(255,255,255,0.85)' }}>Còn <b>{daysLeft}</b> ngày để chuẩn bị. Cần: {Object.entries(menu).map(([id, q]) => `${q} ${productById(id)?.name ?? id}`).join(' · ')}.</div>
        : <div style={{ marginTop: 2, color: 'rgba(255,255,255,0.85)' }}>Đến ngày cỗ — hãy giao.</div>}
      {missing.length > 0
        ? <div style={{ marginTop: 2, color: '#ff7675' }}>Còn thiếu: {missing.join(', ')}</div>
        : <div style={{ marginTop: 2, color: '#2ecc71' }}>Kho đã đủ cỗ.</div>}
      <button
        onClick={() => deliver()}
        disabled={!ready}
        style={{ ...styles.btn, marginTop: 6, background: ready ? '#2ecc71' : 'rgba(255,255,255,0.14)', color: ready ? '#1d1f2b' : 'rgba(255,255,255,0.45)', fontWeight: ready ? 700 : 400, cursor: ready ? 'pointer' : 'not-allowed' }}
      >
        {ready ? '🏮 Giao cỗ' : `Giao sau (thiếu ${missing.length} món${daysLeft > 0 ? ' / chưa tới ngày' : ''})`}
      </button>
    </div>
  );
}

/** Tiêu để MorningPanel biết có nên render thẻ không (tránh nạp cả card khi không có việc). */
export const lifeEventCardDue = (le?: LifeEventState | null): boolean => !!le;
