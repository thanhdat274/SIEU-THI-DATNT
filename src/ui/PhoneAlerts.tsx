import { formatClock, useClock, useGame } from '../core/store';
import { formatMoney, productById } from '../data/products';
import { describeItems, houseById, phoneOrderValue } from '../data/phoneOrders';
import { phoneNetProfit } from '../data/phoneNet';

/** Điện thoại tiệm: cuộc gọi đang đổ chuông (nghe máy để soạn hàng) và đơn đang mang đi giao. */
export function PhoneAlerts() {
  const orders = useGame((s) => s.phoneOrders);
  const minutes = useClock((c) => Math.floor(c.minutes));
  const storage = useGame((s) => s.storage);
  const priceOf = useGame((s) => s.priceOf);
  const answer = useGame((s) => s.answerPhone);
  const decline = useGame((s) => s.declinePhone);
  const restock = useGame((s) => s.restockAndAnswerPhone);
  return (
    <>
      {orders.map((o) => {
        const house = houseById(o.houseId)?.name ?? '';
        if (o.status === 'ringing') {
          const shortCost = Object.entries(o.items).reduce((sum, [id, q]) => sum + Math.max(0, q - (storage[id] ?? 0)) * productById(id).buy, 0);
          const short = shortCost > 0;
          const cook = !!o.premium && !o.vip;
          const vip = !!o.vip;
          const net = phoneNetProfit(o, priceOf);
          return (
            <div key={o.id} className="hud-alert phone ringing">
              {vip ? '👑' : cook ? '🍳' : '📞'} <b>{o.caller}</b> ({house}, {o.reason}): {describeItems(o.items)} · {formatMoney(phoneOrderValue(o, priceOf))}
              {vip && <b> (đơn VIP, giá hời ×{o.premium})</b>}
              {cook && <b> (đơn nấu, giá hời ×{o.premium})</b>}
              <small className="hud-wholesale-tip"> · lời ròng ~{formatMoney(net.net)} (đã trừ chi phí {cook ? 'nguyên liệu bếp' : 'giá mua nhập'}){net.net < 0 ? ' — đơn này lỗ, cân nhắc!' : ''}</small>
              <small> · còn {Math.max(0, Math.ceil(o.answerBy - minutes))} phút để nghe máy</small>
              <span className="hud-alert-actions">
                {short ? (
                  cook ? (
                    <span className="hud-hint">Nấu ở trạm xong bấm nghe máy — món nhà làm không nhập được ở mối nào</span>
                  ) : (
                    <button className="hud-btn primary" onClick={() => restock(o.id)} title="Nhập ngay phần kho còn thiếu rồi soạn hàng đi giao">
                      🛒 Nhập bù {formatMoney(shortCost)} & soạn hàng
                    </button>
                  )
                ) : (
                  <button className="hud-btn primary" onClick={() => answer(o.id)} title="Soạn hàng từ kho rồi mang đi giao">
                    📦 Nghe máy, soạn hàng
                  </button>
                )}
                <button className="hud-btn" onClick={() => decline(o.id)}>Từ chối</button>
              </span>
            </div>
          );
        }
        const left = Math.ceil(o.dueAt - minutes);
        return (
          <div key={o.id} className={`hud-alert phone ${left < 0 ? 'warn' : ''}`}>
            🛵 Mang {describeItems(o.items)} tới <b>{house}</b> cho {o.caller} · {left >= 0 ? `hẹn ${formatClock(o.dueAt)} (còn ${left} phút)` : `trễ ${-left} phút, không còn boa`}
          </div>
        );
      })}
    </>
  );
}
