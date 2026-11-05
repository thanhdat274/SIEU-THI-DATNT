import { useGame } from '../../core/store';
import { demandForecast } from '../../data/counterDemand';
import { professionBandMix, topSegmentsOf } from '../../data/professionDemand';
import { segmentHurt, recentLostByProduct, HIT_LABEL } from '../../data/segmentHurt';
import { productById } from '../../data/products';
import { counterThroughputNote } from '../../agents/customerEntity';
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
  const level = useGame((s) => s.level);
  const day = useGame((s) => s.day);
  // GĐ1271 — "khung này AI đến?": soi phân khúc khách theo nghề cho khung giờ ĐÔNG NHẤT hôm nay
  // (nhu cầu quầy chỉ cho số khách/khung, không cho biết họ là ai). THUẦN đọc PROFESSIONS —
  // đúng trọng số pickProfession + món ưa thích professionWants; không đổi kinh tế/save/seed.
  const busiest = [...demand.bands].sort((a, b) => b.expected - a.expected)[0];
  const mix = busiest ? professionBandMix({ level, day, band: busiest, expected: busiest.expected }) : null;
  const segs = mix ? topSegmentsOf(mix) : [];
  // GĐ1276 — "phân khúc nào đang bị hụt?": quy lượt lỡ bán món trong 7 ngày gần (analytics) + lời chê
  // (reviews) về đúng món ưa của từng nghề → cho chủ biết nhóm khách nào cần nuôi. THUẦN đọc — không đổi
  // economy/save/seed, co-op an toàn. Chỉ hiện khi có tín hiệu thật (không ồn ngày ai cũng ổn).
  const analytics = useGame((s) => s.analytics);
  const reviews = useGame((s) => s.reviews);
  const topHurt = segmentHurt({ level, day, lostByProduct: recentLostByProduct(analytics, day), reviews })[0];
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
    {mix && segs.length > 0 && (
      <div style={{ fontSize: 12, marginTop: 3, paddingTop: 4, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        👥 Khung đông nhất <b>{mix.band.label}</b>: {segs.slice(0, 2).map((sg, i) => (
          <span key={sg.id}>
            {i > 0 && <>&nbsp;·&nbsp;</>}
            <span title={`${sg.name} — thích: ${sg.likes.slice(0, 4).join(', ') || 'nhiều món thoáng'} · nhạy giá ${sg.sensitivity} · kiên nhẫn ${sg.patience}`}>
              {sg.icon} {sg.name}{sg.likes[0] ? ` (hay mua ${sg.likes[0]})` : ''}
            </span>
          </span>
        ))}
      </div>
    )}
    {topHurt && (
      <div style={{ fontSize: 12, marginTop: 3, paddingTop: 4, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <b>💢 Phân khúc đang hụt:</b>{' '}
        <span title={`${topHurt.profession.name} — món ưa bị hụt: ${topHurt.affectedLikes.slice(0, 6).map((id) => productById(id)?.name ?? id).join(', ') || 'chưa xác định'}`}>
          {topHurt.profession.icon} {topHurt.profession.name}
          {topHurt.lost > 0 ? ` · ${topHurt.lost} lượt lỡ món` : ''}
          {topHurt.complaints.slice(0, 2).map((c) => ` · ${c.count} chê ${HIT_LABEL[c.reason]}`).join('')}
        </span>
      </div>
    )}
    <div style={{ fontSize: 11.5, marginTop: 3, opacity: 0.75 }}>{counterThroughputNote()}</div>
    <div style={{ fontSize: 12, marginTop: 4, paddingTop: 4, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
      🧭 Nếp vận hành: chuỗi <b>{cleanStreak}</b> ngày sạch · kỷ lục <b>{cleanBest}</b> · {cleanExtra}
    </div>
  </div>
  );
}
