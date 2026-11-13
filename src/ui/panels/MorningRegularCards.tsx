import { useGame } from '../../core/store';
import { formatMoney, productById } from '../../data/products';
import { regularById, type RegularDef, type Reservation } from '../../data/regulars';
import { DEBT_LATE_DAYS, DEBT_WRITE_OFF_DAYS, type Debt } from '../../data/credit';
import { styles } from './shared';

/** GĐ934: tách khỏi MorningPanel (nguyên văn thẻ nợ khách quen + lời hẹn giữ món). */
export function DueDebtsCard({ dueDebts, day }: { dueDebts: { r: RegularDef; debt: Debt | undefined }[]; day: number }) {
  return (
    <>
      <h3 style={{ margin: '10px 0 4px', fontSize: 14 }}>📒 Nợ của khách quen ghé hôm nay</h3>
      <div style={{ display: 'grid', gap: 6 }}>
        {dueDebts.map(({ r, debt }) => debt && (
          <div key={r.id} style={{ ...styles.card }}>
            <span style={{ flex: 1, fontSize: 13 }}>
              <b>{r.name}</b> nợ <b>{formatMoney(debt.amount)}</b> từ ngày {debt.since}
              {day - debt.since >= DEBT_LATE_DAYS && <span style={{ color: '#ff7675' }}> · quá {DEBT_LATE_DAYS} ngày, mất hẳn sau ngày {debt.since + DEBT_WRITE_OFF_DAYS}</span>}
              {debt.reminded && ' · đã nhắc, lần này chắc trả'}
            </span>
            {!debt.reminded && <button style={styles.btn} onClick={() => useGame.getState().remindDebt(r.id)}>Nhắc nợ</button>}
          </div>
        ))}
      </div>
    </>
  );
}

export function ReservationsCard({ resList, haveStock }: { resList: [string, Reservation][]; haveStock: (id: string) => boolean }) {
  return (
    <>
      <h3 style={{ margin: '10px 0 4px', fontSize: 14 }}>🤝 Lời hẹn giữ món hôm nay</h3>
      <div style={{ display: 'grid', gap: 6 }}>
        {resList.map(([rid, r]) => (
          <div key={rid} style={{ ...styles.card }}>
            <span style={{ flex: 1, fontSize: 13 }}>
              Giữ <b>{r.qty} {productById(r.productId).name}</b> cho {regularById(rid)?.name}
              {haveStock(r.productId) ? ' — kho/kệ đủ ✓' : ' — ⚠️ chưa có hàng, nhập hoặc bày ngay'}
            </span>
            <button style={styles.btn} onClick={() => useGame.getState().cancelReservation(rid)}>Huỷ hẹn</button>
          </div>
        ))}
      </div>
    </>
  );
}
