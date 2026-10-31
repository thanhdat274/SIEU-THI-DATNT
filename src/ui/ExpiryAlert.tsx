import { useGame } from '../core/store';
import { formatMoney } from '../data/products';
import { nearExpiryItems } from '../data/freshness';
import { spoilRiskValue } from '../data/spoilRisk';

/** Lô cận hạn trong kho/kệ — nhắc xử lý trước khi hỏng mất vốn (GĐ43). */
export function ExpiryAlert() {
  const storage = useGame((s) => s.storage);
  const storageLots = useGame((s) => s.storageLots);
  const furniture = useGame((s) => s.furniture);
  const priceOf = useGame((s) => s.priceOf);
  const shelves = furniture.flatMap((f) => f.tiers);
  const items = nearExpiryItems(storage, storageLots, shelves);
  if (!items.length) return null;
  const risk = spoilRiskValue(storage, storageLots, shelves, priceOf);
  return (
    <div className="hud-alert warn">
      ⏳ <b>Hàng sắp hết hạn:</b> {items.map((i) => `${i.name} (${i.qty})`).join(', ')}
      {risk && (
        <small className="hud-wholesale-tip">
          ≈ {formatMoney(risk.tonightValue > 0 ? risk.tonightValue : risk.totalValue)}
          {risk.tonightValue > 0 ? ' hỏng đêm nay' : ' đang cận hạn'} · tổng {formatMoney(risk.totalValue)} — bày bán / hạ giá / bán sỉ kịp kẻo mất.
        </small>
      )}
      <span className="hud-alert-actions">
        <button className="hud-btn primary" onClick={() => useGame.getState().openPanel({ type: 'storage' })}>Xử lý</button>
      </span>
    </div>
  );
}

