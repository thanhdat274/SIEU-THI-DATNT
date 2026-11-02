import { useGame } from '../../core/store';
import { demandForecast } from '../../data/counterDemand';
import { styles } from './shared';

interface Props {
  demand: ReturnType<typeof demandForecast>;
  cleanStreak: number;
  cleanBest: number;
  cleanExtra: string;
}

/** GĐ920: tách khỏi MorningPanel (nguyên văn khối "Nhu cầu quầy hôm nay" GĐ78, thuần đọc). */
export function CounterDemandCard({ demand, cleanStreak, cleanBest, cleanExtra }: Props) {
  const openPanel = useGame((s) => s.openPanel);
  return (
  <div style={{ ...styles.card, display: 'block', marginBottom: 8, outline: '1px solid rgba(46,204,113,0.35)' }}>
    <b style={styles.cardTitle}>🛒 Nhu cầu quầy hôm nay</b>
    <div style={{ fontSize: 12, marginTop: 2, opacity: 0.9 }}>
      ~{demand.expectedTotal} khách dự kiến cả ngày · đỉnh: {demand.peakBands.join(', ')} (ước lượng theo nhịp + lễ/thời tiết)
    </div>
    <div style={{ marginTop: 6, display: 'flex', alignItems: 'flex-end', gap: 4, height: 44 }}>
      {demand.bands.map((b, i) => (
        <div key={i} title={`${b.label}: ~${b.expected} khách (${b.perHour}/giờ)`} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <div style={{ width: '100%', height: Math.max(4, Math.round(b.pressure / 100 * 34)), background: b.peak ? '#2ecc71' : 'rgba(46,204,113,0.45)', borderRadius: 3 }} />
          <span style={{ fontSize: 11, opacity: 0.8, whiteSpace: 'nowrap' }}>{b.label}</span>
        </div>
      ))}
    </div>
    <div style={{ fontSize: 12, marginTop: 4 }}>
      ⏰ {demand.bands.filter((b) => b.peak).slice(0, 2).map((b) => b.label).join(' · ') || demand.bands[0]?.label} đông: bày sẵn món &nbsp;
      <button onClick={() => openPanel({ type: 'order' })} style={{ ...styles.btn, fontSize: 11, padding: '1px 6px' }}>châm kệ món tủ →</button>
      · <button onClick={() => openPanel({ type: 'staff' })} style={{ ...styles.btn, fontSize: 11, padding: '1px 6px' }}>đủ người đứng quầy →</button>
    </div>
    <div style={{ fontSize: 12, marginTop: 4, paddingTop: 4, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
      🧭 Nếp vận hành: chuỗi <b>{cleanStreak}</b> ngày sạch · kỷ lục <b>{cleanBest}</b> · {cleanExtra}
    </div>
  </div>
  );
}
