import { useState } from 'react';
import { useGame } from '../../core/store';
import { maxStaff } from '../../data/staff';
import { customersPerDay, MAX_LEVEL, unlockGroups, unlocksAt, xpToNext } from '../../data/levels';
import { Footer, styles } from './shared';
import { fmtNum } from '../../core/format';
import { t } from '../../core/i18n';

/** Lộ trình cấp: tiến độ cấp hiện tại và mọi mốc có mở khóa, kèm XP còn thiếu. */
export function LevelsPanel() {
  const { level, xp, closePanel } = useGame();
  const [showAll, setShowAll] = useState(false);
  const unlocksWithStaff = (lv: number) => [
    ...unlocksAt(lv),
    ...(lv > 1 && maxStaff(lv - 1) > 0 && maxStaff(lv) > maxStaff(lv - 1) ? [t('panels_small.them_cho_nhan_vien_toi_da', { v0: maxStaff(lv) })] : []),
  ];
  const groupsWithStaff = (lv: number) => {
    const groups = unlockGroups(lv);
    if (lv > 1 && maxStaff(lv - 1) > 0 && maxStaff(lv) > maxStaff(lv - 1)) {
      groups.push({ label: t('panels_small.nhan_vien'), icon: '😀', items: [t('panels_small.them_cho_nhan_vien_toi_da', { v0: maxStaff(lv) })] });
    }
    return groups;
  };
  // XP tích lũy từ chỗ đang đứng tới từng cấp sau
  const rows: { lv: number; need: number; unlocks: string[]; groups: ReturnType<typeof groupsWithStaff> }[] = [];
  let need = xpToNext(level) - xp;
  for (let lv = level + 1; lv <= MAX_LEVEL; lv++) {
    const unlocks = unlocksWithStaff(lv);
    if (unlocks.length || showAll) rows.push({ lv, need, unlocks, groups: groupsWithStaff(lv) });
    need += xpToNext(lv);
  }
  const past = Array.from({ length: level - 1 }, (_, i) => i + 2).filter((lv) => unlocksWithStaff(lv).length);
  // T3-L5: cấp mở > 6 mục thì gom nhóm ("12 món mới · 2 đồ nội thất") thay vì liệt kê hết.
  const grouped = (r: typeof rows[number]) => r.unlocks.length > 6;
  return (
    <>
      <h2 style={styles.title}>{t('panels_small.lo_trinh_cap_do')}</h2>
      <p style={styles.sub}>
        {t('panels_small.ban_hang_va_lam_khach_vui')}{' '}{customersPerDay(2) - customersPerDay(1)}{' '}{t('panels_small.khach_moi_ngay_hien_khoang')}{' '}{customersPerDay(level)}{' '}{t('panels_small.khach_ngay')}
      </p>
      <div style={{ ...styles.card, display: 'block', marginBottom: 12, maxWidth: 780 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <b>{level >= MAX_LEVEL ? t('panels_small.cap_toi_da', { MAX_LEVEL }) : t('panels_small.cap_2', { level, v1: level + 1 })}</b>
          <span>{xp} / {xpToNext(level)} XP</span>
        </div>
        <div style={{ height: 8, background: '#555', borderRadius: 4, marginTop: 6, overflow: 'hidden' }}>
          <div style={{ width: `${Math.min(100, (xp / xpToNext(level)) * 100)}%`, height: '100%', background: '#f1c40f' }} />
        </div>
      </div>
      <label style={{ fontSize: 13, opacity: 0.8 }}>
        <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} />{' '}{t('panels_small.hien_ca_cac_cap_khong_mo')}
      </label>
      <div style={{ display: 'grid', gap: 8, marginTop: 8, maxWidth: 780 }}>
        {Array.from({ length: Math.ceil(MAX_LEVEL / 20) }, (_, bi) => {
          const from = bi * 20 + 1;
          const to = Math.min(MAX_LEVEL, (bi + 1) * 20);
          const bandRows = rows.filter((r) => r.lv >= from && r.lv <= to);
          if (!bandRows.length) return null;
          const isFirstBand = rows[0] && bandRows[0].lv === rows[0].lv;
          return (
            <details key={from} open={isFirstBand} style={{ ...styles.card, display: 'block', padding: '8px 12px' }}>
              <summary style={{ fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                {t('panels_small.cap_3')}{' '}{from}–{to} ({bandRows.length}{' '}{t('panels_small.moc')}
              </summary>
              <div style={{ display: 'grid', gap: 6, marginTop: 8 }}>
                {bandRows.map((r) => (
                  <div key={r.lv} style={{ padding: '8px 10px', borderRadius: 8, background: 'rgba(0,0,0,0.2)', outline: r.lv === rows[0]?.lv ? '2px solid #f1c40f' : undefined }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                      <b>{t('panels_small.cap_4')}{' '}{r.lv}</b>
                      <span style={{ opacity: 0.75, fontSize: 13 }}>{t('panels_small.con_2')}{' '}{fmtNum(r.need)} XP</span>
                    </div>
                    {r.unlocks.length > 0 && (grouped(r) ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6, fontSize: 12 }}>
                        {r.groups.map((g) => (
                          <span key={g.label} title={g.items.join(' · ')} style={{ padding: '2px 9px', borderRadius: 999, background: 'rgba(255,255,255,0.1)' }}>
                            {g.icon} {g.label} · {g.items.length === 1 ? g.items[0] : g.items.length}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                        {r.unlocks.map((u) => (
                          <span key={u} style={{ fontSize: 12, padding: '2px 9px', borderRadius: 999, background: 'rgba(255,255,255,0.1)' }}>{u}</span>
                        ))}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </details>
          );
        })}
      </div>
      {past.length > 0 && (
        <details style={{ marginTop: 12, fontSize: 13 }}>
          <summary>{t('panels_small.da_mo_khoa')}{past.length}{' '}{t('panels_small.moc')}</summary>
          {past.map((lv) => <div key={lv} style={{ opacity: 0.75, marginTop: 4 }}>{t('panels_small.cap_5')}{' '}{lv}: {unlocksWithStaff(lv).join(' · ')}</div>)}
        </details>
      )}
      <Footer onClose={closePanel} />
    </>
  );
}
