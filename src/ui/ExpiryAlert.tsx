import { useGame } from '../core/store';
import { formatMoney } from '../data/products';
import { nearExpiryItems } from '../data/freshness';
import { spoilRiskValue } from '../data/spoilRisk';
import { mergeByName } from './mergeByName';
import { t } from '../core/i18n';

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
      ⏳ <b>{t('biz.hang_sap_het_han')}</b> {mergeByName(items).map((i) => `${i.name} (${i.qty})`).join(', ')}
      {risk && (
        <small className="hud-wholesale-tip">
          ≈ {formatMoney(risk.tonightValue > 0 ? risk.tonightValue : risk.totalValue)}
          {risk.tonightValue > 0 ? t('biz.hong_dem_nay') : t('biz.dang_can_han')}{risk.tonightValue > 0 && risk.tonightValue !== risk.totalValue ? t('biz.tong', { v0: formatMoney(risk.totalValue) }) : ''}{' '}{t('biz.bay_ban_ha_gia_ban_si')}
        </small>
      )}
      <span className="hud-alert-actions">
        <button className="hud-btn primary" onClick={() => useGame.getState().openPanel({ type: 'storage' })}>{t('biz.xu_ly')}</button>
      </span>
    </div>
  );
}

