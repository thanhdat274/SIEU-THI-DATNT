import { useGame } from '../../core/store';
import { upgradeEquip, upgradePower } from '../../core/biz';
import {
  EQUIPMENT, EQUIP_TIERS, EQUIP_TIER_NAME, POWER_TIERS, equipBlock, equipTier, powerBlock, powerCapacity, powerSurcharge, powerTier, powerUsed,
  type EquipTier,
} from '../../data/equipment';
import { formatMoney } from '../../data/products';
import { card, btn, sub, row, pill } from './businessStyles';

/** Khu "Thiết bị" trong tab Nâng cấp: các trạm nấu × 5 bậc, bảng chỉ số trước/sau, thanh công suất điện. */
export function EquipmentSection() {
  const { level, money, biz, shopOpen, furniture } = useGame();
  const used = powerUsed(biz, furniture);
  const cap = powerCapacity(level, biz);
  const over = powerSurcharge(biz, level, furniture);
  const pt = powerTier(biz);
  const pNext = pt < POWER_TIERS.length - 1 ? POWER_TIERS[pt + 1] : null;
  const pBlk = powerBlock(biz, level, money, shopOpen);
  const pct = Math.min(100, Math.round((used / Math.max(cap, used)) * 100));
  const num = (v: number) => `×${v}`;
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ ...card, marginBottom: 6 }}>
        <b>⚡ Công suất điện: {used} / {cap} kW</b>
        <div style={{ height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.15)', margin: '6px 0' }}>
          <div style={{ width: `${pct}%`, height: '100%', borderRadius: 4, background: over > 0 ? '#e74c3c' : '#2ecc71' }} />
        </div>
        <div style={sub}>
          {over > 0 ? `Vượt hạn mức: phụ phí ${formatMoney(over)} mỗi tối (không cắt điện). Nâng hạn mức điện hoặc bớt đồ ngốn điện.` : 'Còn trong hạn mức — bậc cao nấu nhanh hơn nhưng ngốn điện. Chỉ nâng được khi đóng cửa tiệm.'}
          {' '}Tủ mát, tủ đông, quầy thịt, máy bán nước, camera, POS đều tốn điện.
        </div>
        <div style={{ ...row, marginTop: 6 }}>
          <div>
            <b>🔌 {POWER_TIERS[pt].name}</b>
            <div style={sub}>{pNext ? `Nâng lên ${pNext.name}: hạn mức ${cap} → ${cap + pNext.bonus - POWER_TIERS[pt].bonus} kW` : 'Đã ở bậc điện cao nhất'}</div>
          </div>
          {pNext && (
            <button style={btn} disabled={pBlk !== null} title={pBlk === 'open' ? 'Đóng cửa tiệm rồi mới nâng được' : undefined} onClick={() => upgradePower()}>
              {pBlk === 'level' ? `Cần cấp ${pNext.unlock}` : pBlk === 'open' ? 'Đóng cửa để nâng' : `Nâng điện ${formatMoney(pNext.price)}`}
            </button>
          )}
        </div>
      </div>
      {EQUIPMENT.map((e) => {
        const t = equipTier(biz, e.id);
        const cur = EQUIP_TIERS[t];
        const nextTier = t < 5 ? ((t + 1) as EquipTier) : null;
        const next = nextTier ? EQUIP_TIERS[nextTier] : null;
        const blk = equipBlock(biz, e.id, level, money, shopOpen);
        return (
          <div key={e.id} style={card}>
            <div style={row}>
              <div>
                <b>{e.icon} {e.name}</b> <span style={{ ...pill, background: 'rgba(241,196,15,0.2)', color: '#f1c40f' }}>Bậc {t}: {EQUIP_TIER_NAME[t]}</span>
                <div style={sub}>
                  Tốc độ nấu {num(cur.speed)}{next ? ` → ${num(next.speed)}` : ''} · Điện {cur.kw} kW{next ? ` → ${next.kw} kW` : ''}
                </div>
              </div>
              {nextTier && next && (
                <button style={btn} disabled={blk !== null} title={blk === 'open' ? 'Đóng cửa tiệm rồi mới nâng được' : undefined} onClick={() => upgradeEquip(e.id)}>
                  {blk === 'level' ? `Cần cấp ${next.unlock}` : blk === 'open' ? 'Đóng cửa để nâng' : `Lên ${EQUIP_TIER_NAME[nextTier]} ${formatMoney(next.price)}`}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
