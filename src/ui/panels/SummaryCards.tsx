import type { ReactNode } from 'react';
import { formatMoney } from '../../data/products';
import type { loyaltyPayoff } from '../../data/biz';
import type { happyPayoff } from '../../data/rhythm';
import type { spoilNightReport, storeMissRevenue } from '../../data/advice';
import { Callout } from './shared';
import { t } from '../../core/i18n';

type P = {
  loyaltyPay: ReturnType<typeof loyaltyPayoff>;
  happyPay: ReturnType<typeof happyPayoff>;
  missRev: ReturnType<typeof storeMissRevenue>;
  spoilNite: ReturnType<typeof spoilNightReport>;
  openPanel: (p: any) => void;
};

/** Các thẻ cảnh báo/đánh giá cuối ngày (thẻ tích điểm, giờ vàng, hết hàng bỏ lỡ, hỏng đêm qua). */
export function SummaryMoneyCards({ loyaltyPay, happyPay, missRev, spoilNite, openPanel }: P): ReactNode {
  return (
    <>
          {loyaltyPay && loyaltyPay.verdict !== 'soon' && (
            <Callout tone={loyaltyPay.verdict === 'keep' ? 'ok' : 'warn'} style={{ marginTop: 8 }} title={t('panels_report.the_tich_diem_hom_nay')}>
              <div style={{ fontSize: 12, opacity: 0.75, marginTop: 2 }}>
                {loyaltyPay.verdict === 'keep'
                  ? t('panels_report.nho_khach_keo_them_khach_ngay', { boostPct: loyaltyPay.boostPct, extraCustomers: loyaltyPay.extraCustomers, v2: formatMoney(loyaltyPay.extraValue), v3: formatMoney(loyaltyPay.costToday), v4: formatMoney(loyaltyPay.avgGift) })
                  : t('panels_report.qua_tang_ngay_mon_cao_hon', { v0: formatMoney(loyaltyPay.costToday), v1: formatMoney(loyaltyPay.avgGift), v2: formatMoney(loyaltyPay.extraValue), n5: 5, n10: 10, n15: 15 })}
              </div>
            </Callout>
          )}
          {happyPay && (
            <Callout tone={happyPay.verdict === 'great' ? 'ok' : happyPay.verdict === 'ok' ? 'accent' : 'danger'} style={{ marginTop: 8 }}
              title={t('panels_report.gio_vang_hom_nay_h_h', { from: happyPay.from, to: happyPay.to })}>
              <div style={{ fontSize: 12, opacity: 0.75, marginTop: 2 }}>
                {happyPay.verdict === 'great'
                  ? t('panels_report.keo_them_khach_loi_so_tien', { extraCustomers: happyPay.extraCustomers, v1: formatMoney(happyPay.extraValue), v2: formatMoney(happyPay.discountCost), v3: happyPay.efficiency.toFixed(1) })
                  : happyPay.verdict === 'ok'
                  ? t('panels_report.keo_them_khach_loi_nhung_tien', { extraCustomers: happyPay.extraCustomers, v1: formatMoney(happyPay.extraValue), v2: formatMoney(happyPay.discountCost), v3: happyPay.efficiency.toFixed(1) })
                  : t('panels_report.tien_giam_gia_vuot_loi_khach', { v0: formatMoney(happyPay.discountCost), v1: formatMoney(happyPay.extraValue) })}
              </div>
            </Callout>
          )}
          {missRev && missRev.totalLoss > 0 && (
            <Callout tone="danger" style={{ marginTop: 8 }} title={<>{t('panels_report.het_hang_bo_lo')}{formatMoney(missRev.totalLoss)}{' '}{t('panels_report.hom_nay_2')}</>}>
              <div style={{ fontSize: 12, opacity: 0.75, marginTop: 2 }}>
                {missRev.inStorageCount > 0 && missRev.outOfStockCount > 0
                  ? `${missRev.rows.length} món khách tìm mà kệ trống: ${missRev.inStorageCount} món còn trong kho (chỉ thiếu chỗ bày — xếp thêm lên kệ) · ${missRev.outOfStockCount} món hết cả kho (nhập thêm). ${missRev.rows.slice(0, 3).map((r) => `${r.name} ~${formatMoney(r.estLoss)}`).join(' · ')}`
                  : missRev.inStorageCount > 0
                  ? `${missRev.rows.length} món còn hàng trong kho nhưng kệ hết chỗ — bày thêm lên kệ để không bỏ lỡ: ${missRev.rows.slice(0, 3).map((r) => `${r.name} ~${formatMoney(r.estLoss)}`).join(' · ')}`
                  : `${missRev.rows.length} món hết cả kho — nhập thêm để không bỏ lỡ: ${missRev.rows.slice(0, 3).map((r) => `${r.name} ~${formatMoney(r.estLoss)}`).join(' · ')}`}
              </div>
            </Callout>
          )}
          {spoilNite && spoilNite.totalCost > 0 && (
            <Callout tone="danger" style={{ marginTop: 8 }} title={<>{t('panels_report.dem_qua_hong')}{formatMoney(spoilNite.totalCost)}{' '}{t('panels_report.hang')}</>}>
              <div style={{ marginTop: 4, display: 'grid', gap: 2 }}>
                {spoilNite.rows.slice(0, 3).map((r) => (
                  <button key={r.id} onClick={() => openPanel({ type: 'order' })}
                    style={{ display: 'flex', gap: 8, alignItems: 'baseline', background: 'transparent', border: 'none', color: 'inherit', fontSize: 12, cursor: 'pointer', padding: 0, textAlign: 'left' }}>
                    <span style={{ minWidth: 150 }}>{r.name}: {r.spoiled}{' '}{t('panels_report.mon_von_2')}{' '}{formatMoney(r.cost)} →</span>
                    <span style={{ opacity: 0.8 }}>
                      {r.kind === 'cold' ? t('panels_report.can_lanh_de_ngoai_tu') : r.kind === 'short' ? t('panels_report.mon_tuoi_han_ngan_nhap_nhieu') : t('panels_report.de_lau_het_han')}
                    </span>
                  </button>
                ))}
              </div>
              <div style={{ fontSize: 12, opacity: 0.75, marginTop: 3 }}>{t('panels_report.giam_bot_nhap_mon_hay_hong')}</div>
            </Callout>
          )}
    </>
  );
}
