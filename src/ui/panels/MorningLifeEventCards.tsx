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
      <div style={{ ...styles.card, display: 'block', fontSize: 12, lineHeight: 1.6, marginBottom: 8, borderColor: '#a0522d' }}>
        <b style={{ ...styles.cardTitle, color: '#a0522d' }}>🏮 Việc nhà trong hẻm · {kindLabel} {hostName}{whenLabel}</b>
        <div style={{ marginTop: 2, color: '#7f5539' }}>
          Nhà {hostName} có việc, nhờ tiệm lo cỗ. Còn <b>{daysLeft}</b> ngày {daysLeft > 1 ? 'nữa' : ''}. Chọn mức cỗ:
        </div>
        <div style={{ marginTop: 6 }}>
          {def.menus.map((menu, tier) => {
            const need = Object.entries(menu);
            const okStations = menuFulfillable(menu, stations as CookingStation[]);
            const minutes = menuCookMinutes(menu);
            return (
              <div key={tier} style={{ border: '1px solid #d9b38c', borderRadius: 6, padding: 6, marginBottom: 4, background: '#fff8f0' }}>
                <div style={{ color: '#8b4513' }}><b>{TIER_ICON[tier]} Cỗ {TIER[tier]}</b> — nhận {formatMoney(def.bonus[tier] as number)} · 💛 +{def.friendship[tier]} thân thiết</div>
                <div style={{ marginTop: 2, color: '#555' }}>
                  {need.map(([id, q]) => `${q} ${productById(id)?.name ?? id}`).join(' · ')}
                  <span style={{ color: okStations ? '#2ecc71' : '#c0392b' }}> · {okStations ? 'đủ trạm nấu' : 'thiếu trạm'}</span>
                  {' · '}≈{Math.round(minutes / 60)}h nấu
                </div>
                <button
                  onClick={() => accept(tier as 0 | 1 | 2)}
                  style={{ ...styles.btn, marginTop: 4, background: okStations ? '#8b4513' : '#bbb', color: '#fff', cursor: okStations ? 'pointer' : 'not-allowed' }}
                  disabled={!okStations}
                >
                  {okStations ? `Nhận cỗ ${TIER[tier]}` : 'Cần trạm nấu trước'}
                </button>
              </div>
            );
          })}
        </div>
        <button onClick={decline} style={{ ...styles.btn, marginTop: 4, background: 'transparent', borderColor: '#bbb', color: '#777' }}>
          Từ chối (không mất gì)
        </button>
        <div style={{ marginTop: 2, color: '#999' }}>Lỡ hẹn sau khi nhận: chủ và cả họ hụt thân thiết, một review 1★.</div>
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
    <div style={{ ...styles.card, display: 'block', fontSize: 12, lineHeight: 1.6, marginBottom: 8, borderColor: '#8b4513' }}>
      <b style={{ ...styles.cardTitle, color: '#8b4513' }}>🏮 Đã nhận {kindLabel} {hostName}{whenLabel} · mức {TIER[st.tier]}</b>
      {daysLeft > 0
        ? <div style={{ marginTop: 2, color: '#7f5539' }}>Còn <b>{daysLeft}</b> ngày để chuẩn bị. Cần: {Object.entries(menu).map(([id, q]) => `${q} ${productById(id)?.name ?? id}`).join(' · ')}.</div>
        : <div style={{ marginTop: 2, color: '#7f5539' }}>Đến ngày cỗ — hãy giao.</div>}
      {missing.length > 0
        ? <div style={{ marginTop: 2, color: '#c0392b' }}>Còn thiếu: {missing.join(', ')}</div>
        : <div style={{ marginTop: 2, color: '#2ecc71' }}>Kho đã đủ cỗ.</div>}
      <button
        onClick={() => deliver()}
        disabled={!ready}
        style={{ ...styles.btn, marginTop: 4, background: ready ? '#8b4513' : '#ccc', color: '#fff', cursor: ready ? 'pointer' : 'not-allowed' }}
      >
        {ready ? '🏮 Giao cỗ' : `Giao sau (thiếu ${missing.length} món${daysLeft > 0 ? ' / chưa tới ngày' : ''})`}
      </button>
    </div>
  );
}

/** Tiêu để MorningPanel biết có nên render thẻ không (tránh nạp cả card khi không có việc). */
export const lifeEventCardDue = (le?: LifeEventState | null): boolean => !!le;
