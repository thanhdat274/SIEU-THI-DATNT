import { useGame } from '../../core/store';
import { formatMoney } from '../../data/products';
import { computeRecords, recordFeedToday } from '../../data/records';
import { Footer, styles } from './shared';
import { t } from '../../core/i18n';

/** Sổ Kỷ Lục: cột mốc cá nhân cao nhất — mồi "phá kỷ lục của chính mình" để quay lại mỗi ngày. */
export function RecordsPanel() {
  const { history, soldEver, comboHitCount, level, biz, stats, closePanel } = useGame();
  const r = computeRecords({ history, soldEver, comboHitCount, level, prestigeBonus: biz.prestige.bonus });
  const fresh = r.daysTracked === 0;
  const feed = recordFeedToday(stats, r);
  const fmt = (f: (typeof feed)[number], v: number) => (f.unit === 'money' ? formatMoney(v) : t('panels_quest.luot', { v }));
  const card = (icon: string, label: string, value: React.ReactNode, tip?: string) => (
    <div style={{ ...styles.card, gap: 8, padding: '10px 12px', flex: '1 1 220px', minWidth: 200 }} title={tip}>
      <div style={{ fontSize: 13, opacity: 0.75 }}>{icon} {label}</div>
      <b style={{ fontSize: 15 }}>{value}</b>
    </div>
  );
  return (
    <>
      <h2 style={styles.title}>{t('panels_quest.so_ky_luc')}</h2>
      <p style={styles.sub}>
        {t('panels_quest.cac_cot_moc_cao_nhat_cua')}{' '}{r.daysTracked}{' '}{t('panels_quest.ngay_theo_doi_gan_nhat_cu')}
      </p>
      {!fresh && (
        <>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, margin: '2px 0 8px' }}>
            {feed.map((f) => (
              <div
                key={f.label}
                title={t('panels_quest.so_voi_ky_luc_1_ngay')}
                style={{ ...styles.card, gap: 4, padding: '8px 12px', flex: '1 1 200px', minWidth: 190, borderColor: f.beating ? '#2ecc71' : undefined }}
              >
                <div style={{ fontSize: 13, opacity: 0.75 }}>{f.icon} {f.label}</div>
                <b style={{ fontSize: 15, color: f.beating ? '#2ecc71' : undefined }}>{fmt(f, f.today)}</b>
                {f.beating ? (
                  <div style={{ fontSize: 12, color: '#2ecc71', fontWeight: 600 }}>{t('panels_quest.da_pha_ky_luc_cu')}{' '}{fmt(f, f.best!)})</div>
                ) : f.best !== null && f.remaining > 0 ? (
                  <div style={{ fontSize: 12, ...(f.remaining <= Math.round(f.best * 0.2) ? { color: '#f1c40f', fontWeight: 600 } : { opacity: 0.7 }) }}>
                    {t('panels_quest.con_2')}{' '}{fmt(f, f.remaining)}{' '}{t('panels_quest.nua_la_pha_ky_luc_ky')}{' '}{fmt(f, f.best)})
                  </div>
                ) : null}
              </div>
            ))}
          </div>
          <p style={{ ...styles.sub, marginTop: -2 }}>{t('panels_quest.so_hom_nay_con_co_the')}{' '}{t('panels_quest.con_bao_nhieu_nua', {  })}{' '}{t('panels_quest.cang_ro_de_dut_diem_truoc')}</p>
        </>
      )}
      {fresh ? (
        <p style={styles.row}>{t('panels_quest.moi_khai_truong_choi_qua_vai')}</p>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
          {card('💰', t('panels_quest.thu_nhap_cao_nhat_ngay'), r.bestRevenueDay ? t('panels_quest.ngay_5', { v0: formatMoney(r.bestRevenueDay.value), day: r.bestRevenueDay.day }) : '—')}
          {card('💹', t('panels_quest.lai_cao_nhat_ngay'), r.bestProfitDay ? t('panels_quest.ngay_5', { v0: formatMoney(r.bestProfitDay.value), day: r.bestProfitDay.day }) : '—')}
          {card('🧑‍🤝‍🧑', t('panels_quest.dong_khach_nhat_ngay'), r.bestCustomersDay ? t('panels_quest.luot_ngay', { value: r.bestCustomersDay.value, day: r.bestCustomersDay.day }) : '—')}
          {card('📚', t('panels_quest.tong_thu_nhap_theo_doi'), formatMoney(r.totalRevenue))}
          {card('🚶', t('panels_quest.tong_luot_khach'), `${r.totalCustomers}`)}
          {card('⭐', t('panels_quest.cap_hien_tai'), `${r.level}${r.prestigeBonus > 0 ? ` · NG+ ${Math.round(r.prestigeBonus * 100)}%` : ''}`)}
          {card('📦', t('panels_quest.mon_yeu_thich_nhat'), r.favoriteProduct ? `${r.favoriteProduct.name} (${r.favoriteProduct.qty})` : '—')}
          {card('🎁', t('panels_quest.combo_kich_hoat_nhat'), r.bestCombo ? t('panels_quest.lan', { name: r.bestCombo.name, hits: r.bestCombo.hits }) : '—')}
        </div>
      )}
      <Footer onClose={closePanel} />
    </>
  );
}
