import { useGame } from '../../core/store';
import { ALL_TITLES, PRESTIGE_TITLES, SKILLS, nextSkillPointLevel, skillPoints, TITLES, type SkillId } from '../../data/titles';
import { counterfeitRisk, COINFAKE_UNLOCK, COINFAKE_LEAK_HIGH, COINFAKE_LEAK_MODERATE } from '../../data/counterfeitRisk';
import { formatMoney } from '../../data/products';
import { dailyWage } from '../../data/staff';
import { spoilNightReport, storeMissRevenue } from '../../data/advice';
import { trafficForecast } from '../../data/trafficForecast';
import { skillPayoff } from '../../data/skillPayoff';
import { Footer, styles } from './shared';
import { t } from '../../core/i18n';

/** Danh hiệu đã đạt và cây kỹ năng chủ tiệm. */
export function SkillsPanel() {
  const {
    level, skills, titles, learnSkill, closePanel, biz, stats, fakeCash,
    staff, day, weather, forecast, weatherSeed, analytics, storage,
  } = useGame();
  const left = skillPoints(level) - skills.length;
  const prestige = biz.prestige.level;
  const hasSharpEye = skills.includes('sharp_eye');
  const counterRisk = level >= COINFAKE_UNLOCK
    ? counterfeitRisk({ level, customers: stats.customers, revenue: stats.revenue, hasSharpEye, fakeCash })
    : null;
  // GĐ1266 — một con số THẬT cho từng kỹ năng (soi cây kỹ năng là quyết định "nghề" của chính chủ).
  // Tính MỘT lần context từ store rồi gọi helper THUẦN skillPayoff cho từng kỹ năng — không đổi state.
  const payCtx = {
    staffWageBill: staff.reduce((n, st) => n + dailyWage(st), 0),
    todayKhach: trafficForecast({ weather, tomorrow: forecast[0] ?? weather, level, day, seed: weatherSeed }).todayKhach,
    revenueToday: stats.revenue,
    itemsSoldToday: stats.itemsSold,
    customersToday: stats.customers,
    waitMissed: stats.missed?.wait ?? 0,
    yesterdaySpoil: spoilNightReport(analytics, day - 1)?.totalCost ?? 0,
    shelfMissInStorageLoss: (() => {
      const miss = storeMissRevenue(stats.missLog, storage);
      if (!miss) return 0;
      return miss.rows.filter((r) => r.inStorage > 0).reduce((n, r) => n + r.estLoss, 0);
    })(),
  };
  const payoffOf = (id: SkillId) => skillPayoff(id, payCtx);
  return (
    <>
      <h2 style={styles.title}>🏅 Danh hiệu & kỹ năng</h2>
      <p style={styles.sub}>{t('panels_quest.cu_5_cap_duoc_1_diem')}{' '}{left}{' '}{t('panels_quest.diem')}</p>
      <div style={{ display: 'grid', gap: 6 }}>
        {SKILLS.map((k) => {
          const learned = skills.includes(k.id);
          const can = !learned && left > 0 && level >= k.unlock;
          return (
            <div key={k.id} style={{ ...styles.card, gap: 10, opacity: learned || level >= k.unlock ? 1 : 0.5 }}>
              <span style={{ fontSize: 22 }}>{k.icon}</span>
              <div style={{ flex: 1 }}>
                <b>{k.name}</b>
                <div style={{ fontSize: 12, opacity: 0.8 }}>{k.description}</div>
                {counterRisk && k.id === 'sharp_eye' && (
                  <div style={{ fontSize: 11, marginTop: 2, color: counterRisk.hasSharpEye ? '#2ecc71' : counterRisk.leakPerDay >= COINFAKE_LEAK_MODERATE ? '#e67e22' : '#999' }}>
                    {counterRisk.hasSharpEye
                      ? `Đã học: tiền giả lọt còn ~${formatMoney(counterRisk.leakPerDay)}/ngày${counterRisk.fakeCashToday > 0 ? ` · két hôm nay đang giữ ${formatMoney(counterRisk.fakeCashToday)} chưa thu hồi` : ''}`
                      : t('panels_quest.tien_gia_ro_ngay_hoc_chan', { v0: formatMoney(counterRisk.leakPerDay), v1: formatMoney(counterRisk.sharpEyeSavesPerDay) })}
                  </div>
                )}
                {!learned && (() => {
                  const p = payoffOf(k.id);
                  return p.ok ? <div style={{ fontSize: 11, marginTop: 2, color: '#2ecc71' }}>{p.line}</div> : null;
                })()}
              </div>
              {learned ? <span style={{ color: '#2ecc71' }}>{t('panels_quest.da_hoc')}</span> : level < k.unlock ? <span style={{ opacity: 0.7 }}>{t('panels_quest.cap')}{' '}{k.unlock}</span> : (
                <button style={styles.btn} disabled={!can} onClick={() => learnSkill(k.id)}>{left > 0 ? t('panels_quest.hoc') : t('panels_quest.het_diem_cap', { v0: nextSkillPointLevel(level) })}</button>
              )}
            </div>
          );
        })}
      </div>
      <h3 style={{ margin: '14px 0 8px', fontSize: 15 }}>{t('panels_quest.danh_hieu')}{titles.length}/{ALL_TITLES.length})</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 6 }}>
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
      <h3 style={{ margin: '14px 0 8px', fontSize: 15 }}>{t('panels_quest.danh_hieu_ng_tai_sinh')}</h3>
      <p style={styles.sub}>{t('panels_quest.moi_lan_tai_sinh_mo_them')}</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 6 }}>
        {PRESTIGE_TITLES.map((pt) => {
          const got = titles.includes(pt.id);
          const locked = !got && prestige < (pt.prestige ?? 0);
          return (
            <div key={pt.id} style={{ ...styles.card, display: 'block', opacity: got ? 1 : 0.5, border: '1px solid rgba(241,196,15,0.25)' }} title={pt.description}>
              <b>{got ? pt.icon : (locked ? (pt.lockIcon ?? '🔒') : '🔒')} {pt.name}</b>
              <div style={{ fontSize: 12, opacity: 0.8 }}>{pt.description}</div>
              <div style={{ fontSize: 11, opacity: 0.65 }}>
                {got ? t('panels_quest.da_mo') : locked ? t('panels_quest.tai_sinh_lan', { prestige: pt.prestige }) : t('panels_quest.chua_dat_tai_sinh_lan', { prestige: pt.prestige })}
              </div>
            </div>
          );
        })}
      </div>
      <Footer onClose={closePanel} />
    </>
  );
}
