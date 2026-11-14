import { useGame } from '../../core/store';
import type { EarlyUnlockTeaser } from '../../data/unlockMap';
import { styles } from './shared';
import { fmtNum } from '../../core/format';

/** GĐ922: tách khỏi MorningPanel (nguyên văn thẻ "Sắp mở khóa" cho những ngày đầu). */
export function EarlyUnlocksCard({ earlyUnlocks }: { earlyUnlocks: EarlyUnlockTeaser[] }) {
  const openPanel = useGame((s) => s.openPanel);
  return (
    <div style={{ ...styles.card, display: 'block', marginBottom: 8, outline: '2px solid #f1c40f' }}>
      <b style={styles.cardTitle}>🧭 Sắp mở khóa</b>
      <div style={{ marginTop: 4, display: 'grid', gap: 2 }}>
        {earlyUnlocks.map((u) => (
          u.panel ? (
            <button key={u.id} onClick={() => openPanel(u.panel!())}
              style={{ display: 'flex', gap: 8, alignItems: 'baseline', background: 'transparent', border: 'none', color: '#f1c40f', fontSize: 12, cursor: 'pointer', padding: 0, textAlign: 'left' }}>
              <span style={{ minWidth: 150 }}>{u.icon} {u.name} →</span>
              <span style={{ opacity: 0.8 }}>cấp {u.atLevel} · còn {fmtNum(u.xpAway)} XP</span>
            </button>
          ) : (
            // Mốc tự vận hành (chương truyện) không có bảng mở nhanh — hiện chỉ đọc
            <div key={u.id} style={{ display: 'flex', gap: 8, alignItems: 'baseline', fontSize: 12 }}>
              <span style={{ minWidth: 150 }}>{u.icon} {u.name}</span>
              <span style={{ opacity: 0.8 }}>cấp {u.atLevel} · còn {fmtNum(u.xpAway)} XP</span>
            </div>
          )
        ))}
      </div>
      <div style={{ fontSize: 11, opacity: 0.7, marginTop: 3 }}>Bán hàng & làm khách vui để lấy XP.</div>
    </div>
  );
}
