import { useClock, useGame } from '../core/store';
import { describeItems } from '../data/phoneOrders';
import { formatMoney } from '../data/products';
import { vendorById, wholesaleTotal } from '../data/wholesale';
import { wholesaleAdvice } from '../data/wholesaleValue';

/** Tách khỏi Hud, tải lười (GĐ418): lời xin lấy sỉ chỉ hiện thỉnh thoảng. */
/** Người bán rong đang đứng ở quầy xin lấy sỉ từ kho. */
export function VendorAlert() {
  const offer = useGame((s) => s.vendorOffer);
  const minutes = useClock((c) => Math.floor(c.minutes));
  const storage = useGame((s) => s.storage);
  const storageLots = useGame((s) => s.storageLots);
  const priceOf = useGame((s) => s.priceOf);
  const accept = useGame((s) => s.acceptWholesale);
  const decline = useGame((s) => s.declineWholesale);
  if (!offer) return null;
  const v = vendorById(offer.vendorId);
  const short = Object.entries(offer.items).some(([id, q]) => (storage[id] ?? 0) < q);
  const advice = wholesaleAdvice(offer, storage, storageLots, priceOf);
  const sellLines = advice ? advice.lines.filter((l) => l.verdict === 'sell') : [];
  return (
    <div className="hud-alert phone">
      {v?.icon} <b>{v?.name}</b> xin lấy sỉ: {describeItems(offer.items)} · trả {formatMoney(wholesaleTotal(offer.items, priceOf))} (giá sỉ)
      <small> · chờ thêm {Math.max(0, Math.ceil(offer.expiresAt - minutes))} phút</small>
      {advice && (advice.clearEmerging || !advice.canFulfill || sellLines.length > 0) && (
        <small className="hud-wholesale-tip">
          {!advice.canFulfill
            ? '⚠️ Kho thiếu — không nên nhận lời bán sỉ.'
            : advice.clearEmerging
              ? '💡 Có hàng cận hạn — bán sỉ đỡ mất trắng.'
              : sellLines.length > 0
                ? `Nên bán sỉ: ${sellLines.map((l) => l.name).join(' · ')}`
                : null}
        </small>
      )}
      <span className="hud-alert-actions">
        <button className="hud-btn primary" onClick={accept}>{short ? '⚠️ Kho thiếu' : '🤝 Bán sỉ từ kho'}</button>
        <button className="hud-btn" onClick={decline}>Không bán</button>
      </span>
    </div>
  );
}
