import { useGame } from '../../core/store';
import { upgradeEquip } from '../../core/biz';
import {
  EQUIPMENT, EQUIP_TIERS, EQUIP_TIER_NAME, equipBlock, equipTier, powerCapacity, powerSurcharge, powerUsed, type EquipTier,
} from '../../data/equipment';
import { formatMoney } from '../../data/products';
import { card, btn, sub, row, pill } from './businessStyles';

/** Khu "Thiết bị" trong tab Nâng cấp: 3 trạm nấu × 5 bậc, bảng chỉ số trước/sau, thanh công suất điện. */
export function EquipmentSection() {
  const { level, money, biz, shopOpen } = useGame();
  const used = powerUsed(biz);
  const cap = powerCapacity(level);
  const over = powerSurcharge(biz, level);
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
          {over > 0 ? `Vượt hạn mức: phụ phí ${formatMoney(over)} mỗi tối (không cắt điện). Hạn mức tăng theo cấp tiệm.` : 'Còn trong hạn mức — bậc cao nấu nhanh hơn nhưng ngốn điện. Chỉ nâng được khi đóng cửa tiệm.'}
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
