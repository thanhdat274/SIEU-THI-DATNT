import { type PreserveMorningTip } from '../../data/preserve';
import { styles } from './shared';

/** GĐ Hệ1-L3 (SPEC-CHIEU-SAU §1.10) — Một thẻ gộp "🏺 Phơi · Muối · Ủ" trong Sổ đầu ngày.
 *  Chỉ hiện khi có việc (mẻ chín chờ thu, giàn đang phơi mà hôm nay mưa — kèm giờ mưa), người
 *  chưa đọc hướng dẫn vẫn biết phải cất giàn. Bấm vào việc thì mở bảng Trang trại (nơi cất/thu).
 *  Nội dung do `preserveMorningTips` (data/preserve.ts) tính — thuần, dễ test; UI chỉ trình bày. */
export function PreserveCard({ tips, onOpen }: { tips: PreserveMorningTip[]; onOpen: () => void }) {
  if (!tips.length) return null;
  return (
    <div style={{ ...styles.card, display: 'block', fontSize: 12, lineHeight: 1.6, marginBottom: 8 }}>
      <b style={styles.cardTitle}>🏺 Phơi · Muối · Ủ</b>
      {tips.map((t, i) => (
        <div key={i} style={{ marginTop: 2 }}>
          {t.icon} {t.text}{' '}
          <button onClick={onOpen} style={{ background: 'transparent', border: 'none', padding: 0, color: '#2e86c1', cursor: 'pointer', fontSize: 12, textDecoration: 'underline' }}>
            {t.act}
          </button>
        </div>
      ))}
    </div>
  );
}
