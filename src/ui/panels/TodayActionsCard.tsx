import type { DayAction } from '../../data/dayPlan';
import { styles } from './shared';

/** GĐ942: tách khỏi MorningPanel (nguyên văn thẻ "Việc hôm nay · ưu tiên"). Rỗng thì không dựng. */
export function TodayActionsCard({ actions, onOpen }: { actions: DayAction[]; onOpen: (panel: string) => void }) {
  if (actions.length === 0) return null;
  return (
    <div style={{ ...styles.card, display: 'block', marginBottom: 8, outline: '1px solid rgba(26,188,156,0.4)' }}>
      <b style={styles.cardTitle}>🗓️ Việc hôm nay · ưu tiên</b>
      <div style={{ marginTop: 4, display: 'grid', gap: 2 }}>
        {actions.map((a, i) => (
          <button key={i} onClick={() => onOpen(a.panel)}
            style={{ display: 'flex', gap: 8, alignItems: 'baseline', background: 'transparent', border: 'none', color: a.danger ? '#e74c3c' : 'inherit', fontSize: 12, cursor: 'pointer', padding: 0, textAlign: 'left' }}>
            <span style={{ minWidth: 140 }}>{a.icon} {a.text} →</span>
            <span style={{ opacity: 0.8 }}>{a.danger ? 'bức thiết' : 'nên làm'}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
