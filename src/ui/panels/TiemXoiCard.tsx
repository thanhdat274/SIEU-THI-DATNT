import { formatMoney } from '../../data/products';
import { tiemXoiMorning, TIEM_XOI_WAGE } from '../../data/tiemXoi';
import { Callout } from './shared';

type Xoi = Parameters<typeof tiemXoiMorning>;

/** GĐ924: tách khỏi MorningPanel (nguyên văn thẻ "Tiệm xôi"). */
export function TiemXoiCard({ tiemXoi, last }: { tiemXoi: Xoi[0]; last: Xoi[1] }) {
  const m = tiemXoiMorning(tiemXoi, last);
  return (
    <Callout tone={m.net !== null && m.net < 0 ? 'warn' : 'ok'} style={{ marginBottom: 8 }} title="🍚 Tiệm xôi">
      <div style={{ fontSize: 12, marginTop: 2 }}>
        {last
          ? <>Hôm qua nấu {last.total} phần · rẻ hơn nhập lẻ {formatMoney(last.saved)} − lương {formatMoney(last.wages)} = <b style={{ color: m.net! >= 0 ? '#2ecc71' : '#e74c3c' }}>{formatMoney(m.net!)}</b></>
          : 'Mới mở — kết quả có sau đêm đầu.'}
      </div>
      {!!last?.dineRevenue && (
        <div style={{ fontSize: 12, marginTop: 2, color: '#2ecc71' }}>
          🪑 Khách ngồi ăn tại chỗ {last.dine} suất · <b>+{formatMoney(last.dineRevenue)}</b> bán tại chỗ
        </div>
      )}
      {m.idle && <div style={{ fontSize: 12, marginTop: 2, color: '#e67e22' }}>👷 Kho xôi đã đủ, thợ còn dư sức — cho nghỉ bớt một người đỡ lương {formatMoney(TIEM_XOI_WAGE)}/ngày.</div>}
    </Callout>
  );
}
