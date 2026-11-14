import { formatMoney } from '../../data/products';
import type { solvency } from '../../data/solvency';
import type { loanBurden } from '../../data/loanBurden';
import type { dailyBurn } from '../../data/dailyBurn';
import { Callout } from './shared';
import { t } from '../../core/i18n';

/** GĐ926: tách khỏi MorningPanel (nguyên văn ba Callout tài chính: cân đối, lãi vay, chi phí cố định). */
export function SolvencyCard({ sol }: { sol: ReturnType<typeof solvency> }) {
  return (
    <Callout tone={sol.cover ? 'ok' : 'danger'} style={{ marginBottom: 8 }} title={t('panels_morning.can_doi_tien_ban_het_kho', { v0: formatMoney(sol.liquid), v1: formatMoney(sol.liabilities) })}>
      <div style={{ marginTop: 2, fontSize: 12 }}>
        {sol.cover
          ? t('panels_morning.ban_het_kho_cong_tien_mat', { v0: formatMoney(sol.margin) })
          : t('panels_morning.con_thieu_de_tra_goc_vay', { v0: formatMoney(-sol.margin) })}
        {' '}{t('panels_morning.moi_toi_can_gom_ngoai_quay')}{' '}{formatMoney(sol.loanInterestToday)}
        {sol.huiDueToday > 0 && t('panels_morning.gop_hui', { v0: formatMoney(sol.huiDueToday) })}
        {sol.daysToLoanDue != null && t('panels_morning.han_tra_goc_con_ngay', { daysToLoanDue: sol.daysToLoanDue })}.
      </div>
    </Callout>
  );
}

export function LoanBurdenCard({ lb }: { lb: ReturnType<typeof loanBurden> }) {
  return (
    <Callout tone={lb.pctOfRevenue != null && lb.pctOfRevenue > 10 ? 'warn' : 'accent'} style={{ marginBottom: 8 }} title={`🏦 Lãi vay ngốn ${formatMoney(lb.interest)}/ngày${lb.pctOfRevenue != null ? ` = ${lb.pctOfRevenue.toFixed(0)}% doanh thu hôm nay` : ''}`}>
      <div style={{ marginTop: 2, fontSize: 12 }}>
        {t('panels_morning.moi_1_000_000d_tra_bot')}{formatMoney(lb.interestSavedPerMillion)}{' '}{t('panels_morning.lai_moi_ngay')}
        {lb.pctOfRevenue != null && lb.pctOfRevenue > 10
          ? t('panels_morning.dang_nang_lai_an_tren_10')
          : t('panels_morning.dang_nhe_so_voi_dong_tien')}
      </div>
    </Callout>
  );
}

export function DailyBurnCard({ db }: { db: ReturnType<typeof dailyBurn> }) {
  const tone = db.avgRevenue > 0 && db.burnShare != null && db.burnShare > 0.8 ? 'warn' : 'accent';
  return (
    <Callout tone={tone} style={{ marginBottom: 8 }} title={`🔥 Chi phí cố định/ngày: ${formatMoney(db.total)}${db.burnShare != null ? ` = ${Math.round(db.burnShare * 100)}% doanh thu bình quân` : ''}`}>
      <div style={{ marginTop: 2, fontSize: 12 }}>
        {t('panels_morning.luong')}{' '}{formatMoney(db.wages)}{' '}{t('panels_morning.thue')}{' '}{formatMoney(db.rent)}{' '}{t('panels_morning.lai_vay')}{' '}{formatMoney(db.loanInterest)}{' '}{t('panels_morning.gop_hui_2')}{' '}{formatMoney(db.huiDue)}.
        {db.burnShare == null && t('panels_morning.chua_co_doanh_thu_binh_quan', {  })}
        {db.burnShare != null && (db.covered
          ? t('panels_morning.doanh_thu_binh_quan_con_thua', { v0: formatMoney(db.avgRevenue), v1: formatMoney(db.margin) })
          : t('panels_morning.doanh_thu_binh_quan_thieu_de', { v0: formatMoney(db.avgRevenue), v1: formatMoney(-db.margin) }))}
      </div>
    </Callout>
  );
}
