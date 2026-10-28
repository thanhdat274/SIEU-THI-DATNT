import { useGame } from '../../core/store';
import { roadmapAhead, SYSTEM_UNLOCKS } from '../../data/unlockMap';
import { Footer, styles } from './shared';

/** 🗺️ Phía trước — bản đồ toàn ván các HỆ lớn mở khóa theo cấp (không phải từng món/kệ). */
export function RoadmapPanel() {
  const { level, xp, closePanel, openPanel } = useGame();
  const road = roadmapAhead({ level, xp });
  const unlocked = SYSTEM_UNLOCKS.filter((s) => s.atLevel <= level);
  return (
    <>
      <h2 style={styles.title}>🗺️ Phía trước — mở khóa các hệ</h2>
      <p style={styles.sub}>
        Các hệ lớn sẽ mở theo cấp, xếp thứ tự trước→sau. Không còn thứ gì sắp mở thì làm sâu hệ đang có.
      </p>
      {road.length === 0 ? (
        <p style={{ ...styles.card, opacity: 0.85 }}>🏁 Đã mở toàn bộ hệ lớn. Giờ là lúc vận hành và mở rộng sâu.</p>
      ) : (
        <div style={{ display: 'grid', gap: 6, marginTop: 8, maxWidth: 780 }}>
          {road.map((r, i) => (
            <div key={r.id} style={{ ...styles.card, display: 'block', outline: i === 0 ? '2px solid #f1c40f' : undefined }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline' }}>
                <b>{r.icon} {r.name}</b>
                <span style={{ opacity: 0.75, fontSize: 13 }}>🔒 Cấp {r.atLevel} · còn {r.xpAway.toLocaleString('vi-VN')} XP</span>
              </div>
              <div style={{ fontSize: 13, opacity: 0.8, marginTop: 3 }}>{r.desc}</div>
            </div>
          ))}
        </div>
      )}
      {unlocked.length > 0 && (
        <details style={{ marginTop: 12, fontSize: 13 }}>
          <summary>✓ Đã mở ({unlocked.length} hệ) — mở nhanh</summary>
          <div style={{ display: 'grid', gap: 6, marginTop: 8 }}>
            {unlocked.map((s) => (
              <div key={s.id} style={{ ...styles.card, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <span>{s.icon} {s.name}</span>
                <button style={styles.btn} onClick={() => openPanel(s.panel())}>Xem</button>
              </div>
            ))}
          </div>
        </details>
      )}
      <Footer onClose={closePanel} />
    </>
  );
}
