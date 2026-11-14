import type { CSSProperties } from 'react';
import { formatMoney, productById } from '../data/products';
import { PREP_MIN_QTY } from '../data/festivalPrep';
import type { festivalRestockPlan } from '../data/festivalRestock';
import type { quanNuocRestockTip } from '../data/quanNuocInsights';
import type { supplyRestockManifest } from '../data/supplyChain';
import type { guideProducts } from '../data/onboarding';
import { dayTraffic, describeDay } from '../data/weather';
import { monthlyRelRebate, tierProgress } from '../data/supplierRel';
import { Callout } from './panels/shared';
import { fmtNum } from '../core/format';
import { t } from '../core/i18n';

/** GĐ947: các banner/callout đầu OrderPanel, tách nguyên văn. Hành động (điền giỏ) truyền qua props. */
const btn: CSSProperties = { border: 'none', borderRadius: 6, padding: '2px 8px', cursor: 'pointer', fontSize: 11, marginTop: 6 };
const guideBanner: CSSProperties = { background: 'rgba(52, 152, 219, 0.14)', border: '1px solid #3498db', borderRadius: 8, padding: '10px 12px', margin: '6px 0 10px', fontSize: 13 };
const guideBannerReady: CSSProperties = { border: '1px solid #2ecc71', background: 'rgba(46, 204, 113, 0.12)' };

export function GuideBanner({ guideItems, guideIn }: { guideItems: ReturnType<typeof guideProducts>; guideIn: string[] }) {
  return (
    <div style={{ ...guideBanner, ...(guideIn.length ? guideBannerReady : {}) }}>
      <div style={{ fontWeight: 700 }}>{t('order.ngay_dau_tien_nhap_3_mon')}</div>
      <div style={{ marginTop: 3, fontSize: 12 }}>
        {guideItems.map((g, gi) => (
          <span key={g.id}>
            {guideIn.includes(g.id) ? '✅' : '⬜'} {g.name}
            {gi < guideItems.length - 1 && <span style={{ opacity: 0.6 }}> · </span>}
          </span>
        ))}
      </div>
      <div style={{ marginTop: 4, fontSize: 12, fontWeight: 600, color: guideIn.length ? '#2ecc71' : '#f1c40f' }}>
        {guideIn.length ? t('order.san_sang_dat_hang') : t('order.moi_mon_mot_thung_la_du')}
      </div>
    </div>
  );
}

export function QuanDrinkTipCallout({ tip: restockTip, onFill }: { tip: NonNullable<ReturnType<typeof quanNuocRestockTip>>; onFill: () => void }) {
  return (
    <Callout
      tone={restockTip.verdict}
      title={restockTip.verdict === 'danger' ? t('order.nap_them_do_uong_cho_quan') : t('order.quan_nuoc_sap_an_kho_kho')}
      style={{ margin: '8px 0 6px' }}
    >
      <div style={{ fontSize: 12 }}>
        {restockTip.verdict === 'danger'
          ? t('order.hom_qua_quan_nuoc_bo_lo', { v0: fmtNum(restockTip.missedRevenue) })
          : t('order.quan_nuoc_chung_kho_voi_ke')}
        {t('order.toi_nay_quan_can')}{restockTip.wanted}{' '}{t('order.ly_ma_kho_chi_con')}{' '}{restockTip.have}{restockTip.shortfall > 0
          ? <>{' '}{t('order.nhap_them_it_nhat')}{' '}<b>{restockTip.shortfall} ly</b>{' '}{t('order.nuoc_ngot_ca_phe')}</>
          : t('order.da_du_chi_nhac_lai_tin')}.
        {restockTip.bottleneck && <>{' '}{t('order.nut_that')}{' '}<b>{restockTip.bottleneck}</b>{' '}{t('order.mua_dung_thu_do_moi_pha')}</>}
      </div>
      {restockTip.shortfall > 0 && (
        <button style={btn} onClick={onFill}>
          {t('order.nap_do_uong_quan_nuoc_vao')}
        </button>
      )}
    </Callout>
  );
}

export function FestivalPrepCallout({ plan: festivalPlan, onFill }: { plan: NonNullable<ReturnType<typeof festivalRestockPlan>>; onFill: () => void }) {
  return (
    <Callout tone="accent" title={`⏳ ${festivalPlan.festival.icon} ${festivalPlan.festival.name} ${festivalPlan.inDays === 1 ? 'ngày mai' : `sau ${festivalPlan.inDays} ngày`} — trữ lễ còn thiếu ${festivalPlan.lines.length} món`} style={{ margin: '8px 0 6px' }}>
      <div style={{ fontSize: 12 }}>
        {t('order.tru_du_moi_mon')}{' '}{PREP_MIN_QTY}{' '}{t('order.trong_kho_truoc_khi_le_bat')}{' '}<b style={{ color: '#2ecc71' }}>+{formatMoney(festivalPlan.bonus)}</b>.
        {festivalPlan.skipped.length > 0 && <>{' '}{t('order.mon_moi_nay_khong_ban')}{' '}{festivalPlan.skipped.map((id) => productById(id).name).join(', ')}{' '}{t('order.doi_moi_de_tru_not')}</>}
      </div>
      <button style={btn} onClick={onFill}>
        {t('order.tru_le_vao_gio')}
      </button>
    </Callout>
  );
}

export function NetworkFillCallout({ manifest: netManifest, onFillBranch }: { manifest: ReturnType<typeof supplyRestockManifest>; onFillBranch: () => void }) {
  return (
    <Callout tone={netManifest.buyNeed > 0 ? 'warn' : 'info'} title={t('order.nap_lien_mang_luoi_ron_kho')} style={{ margin: '8px 0 6px' }}>
      <div style={{ fontSize: 12 }}>
        <div>{netManifest.line}.</div>
        {netManifest.lines.filter((l) => l.outlet === 'branch').length > 0 && (
          <div style={{ marginTop: 3, fontSize: 11, opacity: 0.9 }}>
            {t('order.chi_nhanh_ke_can')}{' '}{netManifest.lines.filter((l) => l.outlet === 'branch').map((l) => `${l.label} ${l.need}${l.source === 'buy' ? ' (mua)' : ''}`).join(' · ')}
          </div>
        )}
        {netManifest.lines.some((l) => l.outlet === 'branch') && (
          <button style={btn} onClick={onFillBranch}>
            {t('order.dien_ke_chi_nhanh_vao_gio')}
          </button>
        )}
      </div>
    </Callout>
  );
}

/** GĐ957: dòng mối quen nhà cung cấp (bậc, tiến độ, hoàn cuối tháng), tách nguyên văn. */
export function SupplierRelLine({ life, monthSpent }: { life: number; monthSpent: number }) {
  const { cur, next, pct } = tierProgress(life);
  const rebate = monthlyRelRebate(life, monthSpent);
  const monthLeft = Math.max(0, cur.commit - monthSpent);
  return (
    <span>
      {t('order.moi_quen')}{' '}<b style={{ color: cur.level >= 3 ? '#e74c3c' : '#fff' }}>{cur.icon} {cur.name}</b>
      {next ? t('order.toi', { pct, icon: next.icon, name: next.name }) : t('order.da_toi_da')}
      {" "}{t('order.thang_nay_mua')}{' '}<b>{formatMoney(monthSpent)}</b>
      {cur.level > 0 && (rebate > 0
        ? <span style={{ color: '#2ecc71' }}>{' '}{t('order.se_hoan')}{' '}{formatMoney(rebate)}{' '}{t('order.cuoi_thang')}</span>
        : <span style={{ opacity: 0.8 }}>{' '}{t('order.con')}{' '}{formatMoney(monthLeft)}{' '}{t('order.nua_dat_cam_ket')}{Math.round(cur.rate * 100)}{t('order.hoan')}</span>)}
    </span>
  );
}

/** GĐ957: dòng dự báo thời tiết 2 ngày tới, tách nguyên văn. */
export function ForecastLine({ forecast, weatherSeed, day }: { forecast: Parameters<typeof describeDay>[2][]; weatherSeed: number; day: number }) {
  return (
    <>
          {t('order.du_bao')}{' '}{forecast.map((w, i) => (
            <span key={i}>
              {i > 0 && ' · '}
              <b>{i ? t('order.ngay_kia') : 'Mai'}</b> {describeDay(weatherSeed, day + 1 + i, w)}{' '}{t('order.khach')}{' '}{Math.round(dayTraffic(weatherSeed, day + 1 + i, w) * 100)}{t('order.ngay_thuong')}
            </span>
          ))}
          <span style={{ opacity: 0.75 }}>{' '}{t('order.so_goi_y_da_tinh_theo')}</span>
    </>
  );
}
