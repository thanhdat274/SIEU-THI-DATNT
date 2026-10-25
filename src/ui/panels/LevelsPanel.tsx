import { useState } from 'react';
import { useGame } from '../../core/store';
import { maxStaff } from '../../data/staff';
import { customersPerDay, MAX_LEVEL, unlocksAt, xpToNext } from '../../data/levels';
import { Footer, styles } from './shared';

/** Lộ trình cấp: tiến độ cấp hiện tại và mọi mốc có mở khóa, kèm XP còn thiếu. */
export function LevelsPanel() {
  const { level, xp, closePanel } = useGame();
  const [showAll, setShowAll] = useState(false);
  const unlocksWithStaff = (lv: number) => [
    ...unlocksAt(lv),
    ...(lv > 1 && maxStaff(lv - 1) > 0 && maxStaff(lv) > maxStaff(lv - 1) ? [`Thêm chỗ nhân viên (tối đa ${maxStaff(lv)})`] : []),
  ];
  // XP tích lũy từ chỗ đang đứng tới từng cấp sau
  const rows: { lv: number; need: number; unlocks: string[] }[] = [];
  let need = xpToNext(level) - xp;
  for (let lv = level + 1; lv <= MAX_LEVEL; lv++) {
    const unlocks = unlocksWithStaff(lv);
    if (unlocks.length || showAll) rows.push({ lv, need, unlocks });
    need += xpToNext(lv);
  }
  const past = Array.from({ length: level - 1 }, (_, i) => i + 2).filter((lv) => unlocksWithStaff(lv).length);
  return (
    <>
      <h2 style={styles.title}>⭐ Lộ trình cấp độ</h2>
      <p style={styles.sub}>
        Bán hàng và làm khách vui để lấy XP. Mỗi cấp thêm {customersPerDay(2) - customersPerDay(1)} khách mỗi ngày
        (hiện khoảng {customersPerDay(level)} khách/ngày).
      </p>
      <div style={{ ...styles.card, display: 'block', marginBottom: 12, maxWidth: 780 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <b>{level >= MAX_LEVEL ? `Cấp tối đa ${MAX_LEVEL}` : `Cấp ${level} → ${level + 1}`}</b>
          <span>{xp} / {xpToNext(level)} XP</span>
        </div>
        <div style={{ height: 8, background: '#555', borderRadius: 4, marginTop: 6, overflow: 'hidden' }}>
          <div style={{ width: `${Math.min(100, (xp / xpToNext(level)) * 100)}%`, height: '100%', background: '#f1c40f' }} />
        </div>
      </div>
      <label style={{ fontSize: 13, opacity: 0.8 }}>
        <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} /> Hiện cả các cấp không mở khóa gì
      </label>
      <div style={{ display: 'grid', gap: 6, marginTop: 8, maxWidth: 780 }}>
        {rows.map((r, i) => (
          <div key={r.lv} style={{ ...styles.card, display: 'block', outline: i === 0 ? '2px solid #f1c40f' : undefined }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <b>🔒 Cấp {r.lv}</b>
              <span style={{ opacity: 0.75, fontSize: 13 }}>còn {r.need.toLocaleString('vi-VN')} XP</span>
            </div>
            {r.unlocks.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                {r.unlocks.map((u) => (
                  <span key={u} style={{ fontSize: 12, padding: '2px 9px', borderRadius: 999, background: 'rgba(255,255,255,0.1)' }}>{u}</span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      {past.length > 0 && (
        <details style={{ marginTop: 12, fontSize: 13 }}>
          <summary>✓ Đã mở khóa ({past.length} mốc)</summary>
          {past.map((lv) => <div key={lv} style={{ opacity: 0.75, marginTop: 4 }}>Cấp {lv}: {unlocksWithStaff(lv).join(' · ')}</div>)}
        </details>
      )}
      <Footer onClose={closePanel} />
    </>
  );
}
