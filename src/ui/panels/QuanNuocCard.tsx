import { t } from '../../core/i18n';
import type { BizState } from "../../data/biz";
import { formatMoney } from "../../data/products";
import { QUAN_NUOC_WAGE, QUAN_PRICE_OPTIONS } from "../../data/quanNuoc";
import { quanNuocHealth } from "../../data/quanNuocInsights";
import { Callout } from "./shared";

type Health = NonNullable<ReturnType<typeof quanNuocHealth>>;
type QuanState = Parameters<typeof quanNuocHealth>[0];

/** GĐ923: tách khỏi MorningPanel (nguyên văn thẻ "Quán nước"). */
export function QuanNuocCard({ quanNuoc, quanNuocLast, quanHealth }: { quanNuoc: QuanState; quanNuocLast: NonNullable<BizState['quanNuocLast']> | null; quanHealth: Health | null }) {
  const biz = { quanNuoc, quanNuocLast };
  return (
  <Callout tone={biz.quanNuocLast && biz.quanNuocLast.served < biz.quanNuocLast.wanted ? 'warn' : 'ok'} style={{ marginBottom: 8 }} title={t('panels_quan.quan_nuoc')}>
    {biz.quanNuocLast ? (
      <>
        <div style={{ fontSize: 12, marginTop: 2 }}>
          {t('panels_quan.hom_qua_2')}{' '}{biz.quanNuocLast.served}/{biz.quanNuocLast.wanted} ly · {formatMoney(biz.quanNuocLast.revenue)}
        </div>
        {quanHealth?.shortYesterday && quanHealth.missedRevenue > 0 && (
          <div style={{ fontSize: 12, marginTop: 2, color: '#e67e22' }}>{t('panels_quan.hom_qua_bo_lo')}{formatMoney(quanHealth.missedRevenue)}{' '}{t('panels_quan.vi_kho_thieu_nhap_nuoc_ngot')}</div>
        )}
      </>
    ) : (
      <div style={{ fontSize: 12, marginTop: 2 }}>{t('panels_quan.moi_mo_ket_qua_co_sau')}</div>
    )}
    <div style={{ fontSize: 12, marginTop: 2 }}>
      {t('panels_quan.hom_nay')}{' '}{biz.quanNuoc.staff}{' '}{t('panels_quan.nhan_vien_gia')}{' '}{QUAN_PRICE_OPTIONS[biz.quanNuoc.price].label}{' '}{t('panels_quan.luong')}{' '}{formatMoney(biz.quanNuoc.staff * QUAN_NUOC_WAGE)}{t('panels_quan.ngay')}
    </div>
    {quanHealth && !quanHealth.driesMain && quanHealth.hire && quanHealth.hireMarginal !== null && (
      <div style={{ fontSize: 12, marginTop: 2, color: quanHealth.hireMarginal >= 0 ? '#2ecc71' : '#e67e22' }}>
        {quanHealth.hireMarginal >= 0
          ? t('panels_quan.tuyen_1_nguoi_loi_rong_dang', { v0: formatMoney(quanHealth.hire.profit), v1: formatMoney(quanHealth.tonight.profit), v2: formatMoney(quanHealth.hireMarginal), v3: formatMoney(QUAN_NUOC_WAGE) })
          : t('panels_quan.tuyen_them_1_nguoi_chua_dang', { v0: formatMoney(quanHealth.hire.served - quanHealth.tonight.served), v1: formatMoney(QUAN_NUOC_WAGE), v2: formatMoney(quanHealth.hire.profit), v3: formatMoney(quanHealth.tonight.profit) })}
      </div>
    )}
    {quanHealth?.driesMain && (
      <div style={{ fontSize: 12, marginTop: 2, color: '#e74c3c' }}>
        {t('panels_quan.kho_chi_con')}{' '}{quanHealth.drinkUnitsNow}{' '}{t('panels_quan.ly_do_uong_quan_tieu')}{' '}{quanHealth.consumedYesterday}{' '}{t('panels_quan.ly_hom_qua_toi_nay_an')}
      </div>
    )}
  </Callout>
  );
}
