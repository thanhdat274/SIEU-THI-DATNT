import { useGame } from '../../core/store';
import { formatMoney, productById } from '../../data/products';
import { regularById, type RegularDef, type Reservation } from '../../data/regulars';
import { DEBT_LATE_DAYS, DEBT_WRITE_OFF_DAYS, type Debt } from '../../data/credit';
import { styles } from './shared';
import { t } from '../../core/i18n';

/** GĐ934: tách khỏi MorningPanel (nguyên văn thẻ nợ khách quen + lời hẹn giữ món). */
export function DueDebtsCard({ dueDebts, day }: { dueDebts: { r: RegularDef; debt: Debt | undefined }[]; day: number }) {
  return (
    <>
      <h3 style={{ margin: '10px 0 4px', fontSize: 14 }}>{t('panels_morning.no_cua_khach_quen_ghe_hom')}</h3>
      <div style={{ display: 'grid', gap: 6 }}>
        {dueDebts.map(({ r, debt }) => debt && (
          <div key={r.id} style={{ ...styles.card }}>
            <span style={{ flex: 1, fontSize: 13 }}>
              <b>{r.name}</b>{' '}{t('panels_morning.no')}{' '}<b>{formatMoney(debt.amount)}</b>{' '}{t('panels_morning.tu_ngay')}{' '}{debt.since}
              {day - debt.since >= DEBT_LATE_DAYS && <span style={{ color: '#ff7675' }}>{' '}{t('panels_morning.qua')}{' '}{DEBT_LATE_DAYS}{' '}{t('panels_morning.ngay_mat_han_sau_ngay')}{' '}{debt.since + DEBT_WRITE_OFF_DAYS}</span>}
              {debt.reminded && t('panels_morning.da_nhac_lan_nay_chac_tra')}
            </span>
            {!debt.reminded && <button style={styles.btn} onClick={() => useGame.getState().remindDebt(r.id)}>{t('panels_morning.nhac_no')}</button>}
          </div>
        ))}
      </div>
    </>
  );
}

export function ReservationsCard({ resList, haveStock }: { resList: [string, Reservation][]; haveStock: (id: string) => boolean }) {
  return (
    <>
      <h3 style={{ margin: '10px 0 4px', fontSize: 14 }}>{t('panels_morning.loi_hen_giu_mon_hom_nay')}</h3>
      <div style={{ display: 'grid', gap: 6 }}>
        {resList.map(([rid, r]) => (
          <div key={rid} style={{ ...styles.card }}>
            <span style={{ flex: 1, fontSize: 13 }}>
              {t('panels_morning.giu')}{' '}<b>{r.qty} {productById(r.productId).name}</b> cho {regularById(rid)?.name}
              {haveStock(r.productId) ? t('panels_morning.kho_ke_du') : t('panels_morning.chua_co_hang_nhap_hoac_bay')}
            </span>
            <button style={styles.btn} onClick={() => useGame.getState().cancelReservation(rid)}>{t('panels_morning.huy_hen')}</button>
          </div>
        ))}
      </div>
    </>
  );
}
