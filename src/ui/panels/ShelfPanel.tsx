import { fitLots, nearestLife, tierMarkdown } from '../../data/freshness';
import { Dropdown } from '../Dropdown';
import { useGame } from '../../core/store';
import { furnitureDef } from '../../data/furniture';
import { CATEGORIES, formatMoney, unlockedProducts } from '../../data/products';
import { repairCost, RISK_RULES, wears } from '../../data/risks';
import { wearRisk } from '../../data/wearRisk';
import { LifeBadge, Footer, styles } from './shared';

export function ShelfPanel({ uid }: { uid: number }) {
  const { level, storage, storageLots, furniture, stockTier, openPanel, closePanel } = useGame();
  const f = furniture.find((it) => it.uid === uid);
  if (!f) return null;
  const def = furnitureDef(f.type);
  const products = unlockedProducts(level).filter((p) => def.categories.includes(p.category));
  return (
    <>
      <h2 style={styles.title}>🗄️ {def.name}</h2>
      <p style={styles.sub}>
        Mỗi tầng có {def.slots} ô, mỗi ô bày một món (tối đa {def.capacity}), nên một tầng bày được nhiều loại. Bày được: {def.categories.map((c) => CATEGORIES[c]).join(', ')}. Hàng lấy từ kho, lô gần hết hạn bày trước và tự giảm giá khi cận hạn.
        {def.priceBonus ? ` Khách trả thêm ${def.priceBonus * 100}% khi mua ở đây.` : ''}
      </p>
      <WearRow uid={uid} />
      {/* Tầng trên cùng ở trên; trong mỗi tầng ô 1 trước */}
      {f.tiers.map((tier, i) => ({ tier, i })).sort((a, b) => Math.floor(b.i / def.slots) - Math.floor(a.i / def.slots) || a.i - b.i).map(({ tier, i }) => (
        <div key={i} style={{ ...styles.row, ...(i % def.slots === 0 ? { marginTop: 8 } : {}) }}>
          <b style={{ width: 92, fontSize: 13 }}>
            {i % def.slots === 0 ? `Tầng ${Math.floor(i / def.slots) + 1}` : ''}
            <span style={{ opacity: 0.6, fontWeight: 400 }}> · ô {(i % def.slots) + 1}</span>
          </b>
          <Dropdown
            value={tier.productId ?? ''}
            onChange={(v) => stockTier(uid, i, v || null)}
            style={styles.select}
            ariaLabel={`Hàng bày ở tầng ${Math.floor(i / def.slots) + 1}, ô ${(i % def.slots) + 1}`}
            options={[
              { value: '', label: '(Trống)' },
              ...products.map((p) => {
                const life = nearestLife(fitLots(storageLots[p.id], storage[p.id] ?? 0, p.id));
                return { value: p.id, label: p.name, hint: `kho: ${storage[p.id] ?? 0}${life ? ` · ⏳${life}d` : ''}` };
              }),
            ]}
          />
          <span style={{ width: 50 }}>{tier.count}/{def.capacity}</span>
          <LifeBadge
            life={tier.productId ? nearestLife(fitLots(tier.lots, tier.count, tier.productId)) : null}
            sale={tierMarkdown(tier.productId, tier.lots, tier.count)}
          />
          <button
            style={styles.btn}
            disabled={!tier.productId || tier.count >= def.capacity || !(storage[tier.productId] > 0)}
            onClick={() => stockTier(uid, i, tier.productId)}
          >
            Bày đầy
          </button>
        </div>
      ))}
      <Footer onClose={closePanel}>
        <button style={styles.btn} onClick={() => f.tiers.forEach((t, i) => t.productId && stockTier(uid, i, t.productId))}>
          Bày đầy cả kệ
        </button>
        <button style={styles.btn} onClick={() => openPanel({ type: 'planogram' })}>🗺️ Sơ đồ kệ</button>
      </Footer>
    </>
  );
}

/** Độ mòn và nút sửa/bảo trì của một kệ (mở từ cấp hao mòn). */
export function WearRow({ uid }: { uid: number }) {
  const { level, furniture, repairFurniture } = useGame();
  const f = furniture.find((it) => it.uid === uid);
  if (!f || level < RISK_RULES.wear.unlock || !wears(f.type)) return null;
  const wear = f.wear ?? 0;
  const canService = f.broken || wear >= RISK_RULES.wear.serviceFrom;
  return (
    <div style={{ ...styles.card, gap: 10, marginBottom: 8, outline: f.broken ? '2px solid #e74c3c' : undefined }}>
      <span>{f.broken ? '❌ Đang hỏng: khách không lấy được hàng' : `🔧 Độ mòn ${wear}%`}</span>
      <div style={{ flex: 1, height: 6, background: '#555', borderRadius: 3 }}>
        <div style={{ width: `${wear}%`, height: '100%', borderRadius: 3, background: wear >= RISK_RULES.wear.breakFrom ? '#e74c3c' : '#e67e22' }} />
      </div>
      <button style={styles.btn} disabled={!canService} title={canService ? '' : `Mòn từ ${RISK_RULES.wear.serviceFrom}% mới cần bảo trì`} onClick={() => repairFurniture(uid)}>
        {f.broken ? 'Sửa' : 'Bảo trì'} {formatMoney(repairCost(f.type))}
      </button>
      {(() => {
        const wr = wearRisk(f.type, wear, !!f.broken);
        if (wr.broken) {
          return <div style={{ width: '100%', fontSize: 12, color: '#e74c3c' }}>❌ Kệ hỏng — khách không lấy được hàng ở đây. Sửa ngay tốn {formatMoney(wr.repairCost)}.</div>;
        }
        if (wr.verdict === 'danger') {
          return (
            <div style={{ width: '100%', fontSize: 12, color: '#e67e22' }}>
              ⚠️ Nguy cơ hỏng đêm nay ~{Math.round(wr.breakChance * 100)}% — rủi ro tiền sửa ~{formatMoney(wr.expectedRepairExposure)}/đêm; nên sửa/làm bảo trì sớm.
            </div>
          );
        }
        if (wr.serviceable) {
          return <div style={{ width: '100%', fontSize: 12, color: '#f1c40f' }}>🔧 Đủ điều kiện bảo trì (mòn ≥ {RISK_RULES.wear.serviceFrom}%) — làm sớm là về trắng {formatMoney(wr.repairCost)}, phòng hỏng.</div>;
        }
        return null;
      })()}
    </div>
  );
}
