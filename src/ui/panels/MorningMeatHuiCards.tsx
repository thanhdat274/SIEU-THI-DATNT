import { useGame } from '../../core/store';
import { formatMoney } from '../../data/products';
import { butcherValueToday, recentMeatRevenue } from '../../data/butcherValue';
import { huiPayoff } from '../../data/minorPayoff';
import type { BizState } from '../../data/biz';
import { Callout, styles } from './shared';
import { t } from '../../core/i18n';

/** GĐ927: tách khỏi MorningPanel (nguyên văn thẻ người bán thịt cá + thẻ hụi). */
export function ButcherCard({ butcherV, recentMeat, meatMissed }: { butcherV: ReturnType<typeof butcherValueToday>; recentMeat: ReturnType<typeof recentMeatRevenue>; meatMissed: number }) {
  const openPanel = useGame((s) => s.openPanel);
  return (
    <Callout tone={butcherV.present ? 'warn' : 'danger'} strong={!butcherV.present} style={{ marginBottom: 8 }}
      title={<>🔪 {butcherV.present
        ? t('panels_morning.nguoi_ban_thit_ca_truc_hom', { skill: butcherV.skill, pct: butcherV.pct })
        : t('panels_morning.khong_co_nguoi_ban_thit_ca')}</>}
      actions={
        <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button onClick={() => openPanel({ type: 'staff' })} style={{ ...styles.btn, fontSize: 11, padding: '2px 8px' }}>
            {butcherV.present ? t('panels_morning.nang_boi_duong_nguoi_ban_thit') : t('panels_morning.xep_nguoi_ban_thit_ca')}
          </button>
          <button onClick={() => openPanel({ type: 'analytics' })} style={{ ...styles.btn, fontSize: 11, padding: '2px 8px' }}>
            {t('panels_morning.xem_so_thit_ca')}
          </button>
        </div>
      }>
      <div style={{ fontSize: 12, marginTop: 2 }}>
        {butcherV.present
          ? t('panels_morning.he_so_cau_so_voi_moc', { v0: butcherV.factor.toFixed(2).replace('.', ','), v1: butcherV.maxFactor.toFixed(2).replace('.', ',') })
          : t('panels_morning.quay_thit_ca_650k_dang_hau')}
      </div>
      {recentMeat.revenue > 0 && meatMissed > 0 && (
        <div style={{ fontSize: 12, marginTop: 2, color: '#f1c40f' }}>
          {t('panels_morning.gan_day_thit_ca_thu')}{formatMoney(recentMeat.revenue)}{t('panels_morning.ngay_3')}{butcherV.present
            ? t('panels_morning.len_5_them_ngay', { v0: formatMoney(meatMissed) })
            : t('panels_morning.thue_nguoi_ban_5_co_the', { v0: formatMoney(meatMissed) })}
        </div>
      )}
    </Callout>
  );
}

export function HuiCard({ hui }: { hui: NonNullable<BizState['hui']> }) {
  const p = huiPayoff(hui);
  return (
    <div style={{ ...styles.card, display: 'block', marginBottom: 8 }}>
      <b style={styles.cardTitle}>{t('panels_morning.dang_gop_hui')}{' '}{formatMoney(hui.daily)}{t('panels_morning.ngay_3')}</b>
      <div style={{ fontSize: 12, marginTop: 2 }}>
        {t('panels_morning.da_gop')}{' '}{hui.paidDays}/{hui.members}{' '}{t('panels_morning.ngay_2')}{!hui.received && t('panels_morning.ngay_toi_luot_hot', { turnDay: hui.turnDay, v1: formatMoney(hui.daily * hui.members) })}.
      </div>
      {/* GĐ1271 — soi GIÁ TRỊ + RỦI RO hụi: hốt sớm tiết kiệm lãi vay; vỡ hụi ~X%/vòng, mất tiền đã góp.
          Thuần đọc state/hằng số (LOAN_DAILY_RATE, HUI_COLLAPSE) — không đổi kinh tế/save. */}
      {p.daysSaved > 0 && (
        <div style={{ fontSize: 12, marginTop: 2, color: '#2ecc71' }}>
          {t('panels_morning.hot_som')}{' '}{p.daysSaved}{' '}{t('panels_morning.ngay_tiet_kiem')}{formatMoney(p.saveEarly)}{t('panels_morning.d_so_lai_vay_nh_vo')}{p.collapsePct.toFixed(0)}{t('panels_morning.vong_rui_mat')}{' '}{formatMoney(p.loseOnCollapse)}{t('panels_morning.d')}
        </div>
      )}
    </div>
  );
}
