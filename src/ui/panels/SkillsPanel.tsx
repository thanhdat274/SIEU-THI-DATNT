import { useGame } from '../../core/store';
import { SKILLS, skillPoints, TITLES } from '../../data/titles';
import { Footer, styles } from './shared';

/** Danh hiệu đã đạt và cây kỹ năng chủ tiệm. */
export function SkillsPanel() {
  const { level, skills, titles, learnSkill, closePanel } = useGame();
  const left = skillPoints(level) - skills.length;
  return (
    <>
      <h2 style={styles.title}>🏅 Danh hiệu & kỹ năng</h2>
      <p style={styles.sub}>Cứ 5 cấp được 1 điểm kỹ năng. Còn {left} điểm.</p>
      <div style={{ display: 'grid', gap: 6, maxWidth: 560 }}>
        {SKILLS.map((k) => {
          const learned = skills.includes(k.id);
          const can = !learned && left > 0 && level >= k.unlock;
          return (
            <div key={k.id} style={{ ...styles.card, gap: 10, opacity: learned || level >= k.unlock ? 1 : 0.5 }}>
              <span style={{ fontSize: 22 }}>{k.icon}</span>
              <div style={{ flex: 1 }}>
                <b>{k.name}</b>
                <div style={{ fontSize: 12, opacity: 0.8 }}>{k.description}</div>
              </div>
              {learned ? <span style={{ color: '#2ecc71' }}>✔ Đã học</span> : level < k.unlock ? <span style={{ opacity: 0.7 }}>🔒 Cấp {k.unlock}</span> : (
                <button style={styles.btn} disabled={!can} onClick={() => learnSkill(k.id)}>Học</button>
              )}
            </div>
          );
        })}
      </div>
      <h3 style={{ margin: '14px 0 8px', fontSize: 15 }}>Danh hiệu ({titles.length}/{TITLES.length})</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 6, maxWidth: 560 }}>
        {TITLES.map((t) => {
          const got = titles.includes(t.id);
          return (
            <div key={t.id} style={{ ...styles.card, display: 'block', opacity: got ? 1 : 0.45 }} title={t.description}>
              <b>{got ? t.icon : '🔒'} {t.name}</b>
              <div style={{ fontSize: 12, opacity: 0.8 }}>{t.description}</div>
            </div>
          );
        })}
      </div>
      <Footer onClose={closePanel} />
    </>
  );
}
