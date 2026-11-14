import { blockedLabel } from '../shortLabel';
import { fitLots, nearestLife, tierMarkdown } from '../../data/freshness';
import { Dropdown } from '../Dropdown';
import { useGame } from '../../core/store';
import { furnitureDef } from '../../data/furniture';
import { CATEGORIES, formatMoney, unlockedProducts } from '../../data/products';
import { repairCost, RISK_RULES, wears } from '../../data/risks';
import { wearRisk } from '../../data/wearRisk';
import { shelfCount, itemHealthList } from '../../data/analytics';
import { shelfSlotValue } from '../../data/shelfSlotValue';
import { LifeBadge, Footer, styles } from './shared';
import { masteryBadge } from '../../data/sellMastery';
import { t } from '../../core/i18n';

export function ShelfPanel({ uid }: { uid: number }) {
  const { level, storage, storageLots, furniture, stockTier, openPanel, closePanel, soldEver, analytics, demand } = useGame();
  const f = furniture.find((it) => it.uid === uid);
  if (!f) return null;
  const def = furnitureDef(f.type);
  const products = unlockedProducts(level).filter((p) => def.categories.includes(p.category));
  const onShelf = shelfCount(furniture);
  const slot = shelfSlotValue(itemHealthList(analytics, level, storage, onShelf, demand), onShelf);
  return (
    <>
      <h2 style={styles.title}>🗄️ {def.name}</h2>
      <p style={styles.sub}>
        {t('panels_stock.moi_tang_co')}{' '}{def.slots}{' '}{t('panels_stock.o_moi_o_bay_mot_mon')}{' '}{def.capacity}{t('panels_stock.nen_mot_tang_bay_duoc_nhieu')}{' '}{def.categories.map((c) => CATEGORIES[c]).join(', ')}{t('panels_stock.hang_lay_tu_kho_lo_gan')}
        {def.priceBonus ? t('panels_stock.khach_tra_them_khi_mua_o', { v0: def.priceBonus * 100 }) : ''}
      </p>
      <WearRow uid={uid} />
      {/* Tầng trên cùng ở trên; trong mỗi tầng ô 1 trước */}
      {f.tiers.map((tier, i) => ({ tier, i })).sort((a, b) => Math.floor(b.i / def.slots) - Math.floor(a.i / def.slots) || a.i - b.i).map(({ tier, i }) => (
        <div key={i} style={{ ...styles.row, ...(i % def.slots === 0 ? { marginTop: 8 } : {}) }}>
          <b style={{ width: 92, fontSize: 13 }}>
            {i % def.slots === 0 ? t('panels_stock.tang', { v0: Math.floor(i / def.slots) + 1 }) : ''}
            <span style={{ opacity: 0.6, fontWeight: 400 }}>{' '}{t('panels_stock.o')}{' '}{(i % def.slots) + 1}</span>
          </b>
          <Dropdown
            value={tier.productId ?? ''}
            onChange={(v) => stockTier(uid, i, v || null)}
            style={styles.select}
            ariaLabel={t('panels_stock.hang_bay_o_tang_o', { v0: Math.floor(i / def.slots) + 1, v1: (i % def.slots) + 1 })}
            options={[
              { value: '', label: t('panels_stock.trong') },
              ...products.map((p) => {
                const life = nearestLife(fitLots(storageLots[p.id], storage[p.id] ?? 0, p.id));
                const s = slot.items.find((x) => x.id === p.id);
                const sl = s ? (s.flag === 'lose' ? t('panels_stock.dang_lo') : t('panels_stock.lai_o_ngay', { v0: formatMoney(s.perSlot ?? 0) })) : t('panels_stock.chua_bay');
                return { value: p.id, label: p.name, hint: `kho: ${storage[p.id] ?? 0}${life ? ` · ⏳${life}d` : ''}${sl}${masteryBadge(level, soldEver[p.id] ?? 0)}` };
              }),
            ]}
          />
          <span style={{ width: 50 }}>{tier.count}/{def.capacity}</span>
          <LifeBadge
            life={tier.productId ? nearestLife(fitLots(tier.lots, tier.count, tier.productId)) : null}
            sale={tierMarkdown(tier.productId, tier.lots, tier.count)}
          />
          {tier.productId && (() => {
            const s = slot.items.find((x) => x.id === tier.productId);
            if (!s) return null;
            return (
              <span style={{ fontSize: 11, color: s.flag === 'lose' ? '#e74c3c' : '#e67e22', marginLeft: 6 }}>
                {t('panels_stock.lai')}{' '}{formatMoney(s.perSlot ?? 0)}{t('panels_stock.o_ngay')}
                {s.flag === 'lose' ? t('panels_stock.dang_lo_nen_don') : slot.best != null && s.perSlot != null && s.perSlot < slot.best ? t('panels_stock.kem_o_hay_nhat', { v0: formatMoney(slot.best) }) : ''}
              </span>
            );
          })()}
          <button
            style={styles.btn}
            disabled={!tier.productId || tier.count >= def.capacity || !(storage[tier.productId] > 0)}
            onClick={() => stockTier(uid, i, tier.productId)}
          >
            {blockedLabel(!tier.productId ? null : tier.count >= def.capacity ? t('panels_stock.da_day') : !(storage[tier.productId] > 0) ? t('panels_stock.kho_het') : null, t('panels_stock.bay_day'), 0, 0)}
          </button>
        </div>
      ))}
      <Footer onClose={closePanel}>
        <button style={styles.btn} onClick={() => f.tiers.forEach((t, i) => t.productId && stockTier(uid, i, t.productId))}>
          {t('panels_stock.bay_day_ca_ke')}
        </button>
        <button style={styles.btn} onClick={() => openPanel({ type: 'planogram' })}>{t('panels_stock.so_do_ke')}</button>
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
      <span>{f.broken ? t('panels_stock.dang_hong_khach_khong_lay_duoc') : t('panels_stock.do_mon', { wear })}</span>
      <div style={{ flex: 1, height: 6, background: '#555', borderRadius: 3 }}>
        <div style={{ width: `${wear}%`, height: '100%', borderRadius: 3, background: wear >= RISK_RULES.wear.breakFrom ? '#e74c3c' : '#e67e22' }} />
      </div>
      <button style={styles.btn} disabled={!canService} title={canService ? '' : t('panels_stock.mon_tu_moi_can_bao_tri', { serviceFrom: RISK_RULES.wear.serviceFrom })} onClick={() => repairFurniture(uid)}>
        {f.broken ? t('panels_stock.sua') : t('panels_stock.bao_tri')} {formatMoney(repairCost(f.type))}
      </button>
      {(() => {
        const wr = wearRisk(f.type, wear, !!f.broken);
        if (wr.broken) {
          return <div style={{ width: '100%', fontSize: 12, color: '#e74c3c' }}>{t('panels_stock.ke_hong_khach_khong_lay_duoc')}{' '}{formatMoney(wr.repairCost)}.</div>;
        }
        if (wr.verdict === 'danger') {
          return (
            <div style={{ width: '100%', fontSize: 12, color: '#e67e22' }}>
              {t('panels_stock.nguy_co_hong_dem_nay')}{Math.round(wr.breakChance * 100)}{t('panels_stock.rui_ro_tien_sua')}{formatMoney(wr.expectedRepairExposure)}{t('panels_stock.dem_nen_sua_lam_bao_tri')}
            </div>
          );
        }
        if (wr.serviceable) {
          return <div style={{ width: '100%', fontSize: 12, color: '#f1c40f' }}>{t('panels_stock.du_dieu_kien_bao_tri_mon')}{' '}{RISK_RULES.wear.serviceFrom}{t('panels_stock.lam_som_la_ve_trang')}{' '}{formatMoney(wr.repairCost)}{t('panels_stock.phong_hong')}</div>;
        }
        return null;
      })()}
    </div>
  );
}
