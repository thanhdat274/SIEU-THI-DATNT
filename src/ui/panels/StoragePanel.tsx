import { fitLots, nearestLife } from '../../data/freshness';
import { storageCapacity, storageUsed, useGame } from '../../core/store';
import { warehouseTier, WAREHOUSE_TIERS } from '../../data/warehouse';
import { MATERIAL_FROM_TIER, MATERIAL_KEYS, MATERIAL_LABEL, costOfMaterials, hasMaterials, materialBlockLabel, materialsFor, missingMaterials } from '../../data/wareMaterials';
import { caseSize, describeUnits, formatMoney, productById } from '../../data/products';
import { shortLabel } from '../shortLabel';
import { storeMissRevenue, coldOverflow } from '../../data/advice';
import { stockCapital, pendingCapital } from '../../data/stockCapital';
import { stockTurn } from '../../data/stockTurn';
import { shelfCount } from '../../data/analytics';
import { itemHealthList } from '../../data/analytics';
import { warehouseUpgradeValue } from '../../data/warehouseUpgrade';
import { Callout, LifeBadge, Footer, styles } from './shared';
import { t } from '../../core/i18n';

/** Kho hàng: thùng nguyên + hàng lẻ đã khui, hạn gần nhất, chỗ trống. */
export function StoragePanel() {
  const { storage, storageLots, deliveries, warehouseTier: tierIndex, level, money, priceOf, autoSwap, upgradeWarehouse, buyMaterialPack, wareMaterials, openPanel, closePanel, stats, weather, analytics, furniture, demand } = useGame();
  const tier = warehouseTier(tierIndex);
  const next = WAREHOUSE_TIERS[tierIndex + 1];
  const capacity = storageCapacity(tierIndex);
  const used = storageUsed(storage);
  const coming = storageUsed({}, ...deliveries.map((d) => d.items));
  const pending = pendingCapital(deliveries, priceOf); // GĐ1179: vốn đã chốt nhưng hàng chưa về
  // GĐ131: lãi bỏ lỡ hôm qua vì kệ/kho hết hàng — ROI cho quyết định nâng kho (thuần đọc)
  const missRev = storeMissRevenue(stats?.missLog, storage);
  // GĐ134: tủ lạnh kho đầy — định lượng hàng cần lạnh vượt khả năng giữ lạnh (thuần đọc)
  const coldOv = coldOverflow(storage, tierIndex, weather);
  const items = Object.entries(storage)
    .filter(([, q]) => q > 0)
    .map(([id, q]) => ({ id, q, life: nearestLife(fitLots(storageLots[id], q, id)) }))
    .sort((a, b) => (a.life ?? Infinity) - (b.life ?? Infinity));
  return (
    <>
      <h2 style={styles.title}>🏭 {tier.name}</h2>
      <p style={styles.sub}>
        {t('panels_stock.dang_chua')}{' '}<b>{used}/{capacity}{' '}{t('panels_stock.thung')}</b>{coming > 0 && t('panels_stock.thung_se_ve_sang_mai_von', { coming, v1: formatMoney(pending.cost) })}{t('panels_stock.thung_da_khui_van_chiem_mot')}
        {' '}{t('panels_stock.bay_ke_dung_hang_le_truoc')}{' '}{tier.cold}{' '}{t('panels_stock.mon_hang_mat_dong_lanh_tuoi')}
      </p>
      <div style={{ height: 8, borderRadius: 4, background: '#ffffff22', margin: '6px 0 10px' }}>
        <div style={{ height: '100%', borderRadius: 4, width: `${Math.min(100, (used / capacity) * 100)}%`, background: used >= capacity ? '#e67e22' : '#2ecc71' }} />
      </div>
      {(() => {
        const cap = stockCapital(storage, priceOf);
        if (!cap) return null;
        const overCash = cap.totalRetail > money;
        return (
          <Callout tone={overCash ? 'warn' : 'info'} style={{ marginBottom: 8 }} title={t('panels_stock.kho_dang_chon_von_gia_nhap', { v0: formatMoney(cap.totalCost), v1: formatMoney(cap.totalRetail) })}>
            <div style={{ marginTop: 2, fontSize: 12 }}>
              {cap.lines.length > 0 && <>{t('panels_stock.chon_nhieu_nhat')}{' '}{cap.lines.slice(0, 3).map((l) => `${l.name} ${formatMoney(l.costTotal)}`).join(' · ')}.</>}{' '}
              {overCash
                ? t('panels_stock.tri_gia_kho_con_vuot_ca', { v0: formatMoney(money) })
                : t('panels_stock.von_nam_trong_hang_hoa_dang')}
              {pending.orders > 0 && (
                <> <br />{t('panels_stock.tren_duong_ve_sang_mai')}{' '}{pending.orders}{' '}{t('panels_stock.don')}{' '}{formatMoney(pending.cost)}{' '}{t('panels_stock.von_gia_nhap_da_tru_tinh')}{' '}{formatMoney(cap.totalCost + pending.cost)}.</>
              )}
            </div>
          </Callout>
        );
      })()}
      {(() => {
        const onShelf = shelfCount(furniture);
        const list = itemHealthList(analytics, level, storage, onShelf, demand);
        const turn = stockTurn(list, storage, onShelf);
        if (turn.avgDays == null && turn.topStale.length === 0) return null;
        const worst = turn.topStale[0];
        return (
          <Callout tone={turn.topStale.length > 0 ? 'warn' : 'accent'} style={{ marginBottom: 8 }} title={`⏳ Tồn kho quay ${turn.avgDays != null ? `~${turn.avgDays.toFixed(0)} ngày/lần` : 'chậm (chưa ước được ngày)'}`}>
            <div style={{ marginTop: 2, fontSize: 12 }}>
              {t('panels_stock.von_hang')}{formatMoney(turn.totalValue)}{' '}{t('panels_stock.dang_cho_ban_het')}
              {worst ? ` ⚠️ Chôn lâu nhất theo giá trị: ${worst.name} (${formatMoney(worst.value)}, ${worst.daysLeft == null ? 'không bán' : `còn ~${worst.daysLeft.toFixed(0)} ngày`}) — xả sớm / giảm nhập.` : t('panels_stock.xoay_vong_on_khong_mon_nao')}
            </div>
          </Callout>
        );
      })()}
      {missRev && missRev.totalLoss > 0 && (
        <Callout tone="danger" style={{ marginBottom: 8 }} title={t('panels_stock.hom_qua_bo_lo_vi_het', { v0: formatMoney(missRev.totalLoss) })}>
          <div style={{ marginTop: 2, fontSize: 12 }}>
            {missRev.inStorageCount > 0
              ? t('panels_stock.con_trong_kho_ma_ke_het', { v0: missRev.rows[0]?.name })
              : t('panels_stock.het_ca_kho_nhap_them_roi', { v0: missRev.rows[0]?.name })}
          </div>
        </Callout>
      )}
      {coldOv && (
        <Callout tone="warn" style={{ marginBottom: 8 }} title={t('panels_stock.tu_lanh_kho_day_mon_can', { coldQty: coldOv.coldQty, capacity: coldOv.capacity })}>
          <div style={{ marginTop: 2, fontSize: 12 }}>
            {t('panels_stock.du')}{' '}{coldOv.overflow}{' '}{t('panels_stock.mon_phai_de_ngoai_nhiet_do')}
            {coldOv.items[0]?.penalty.toFixed(1)}×{' '}
            {coldOv.nextCapacity
              ? t('panels_stock.nang_kho_giu_lanh_duoc_mon', { nextCapacity: coldOv.nextCapacity })
              : t('panels_stock.da_kho_toi_da_ban_bot')}
          </div>
          <div style={{ marginTop: 2, opacity: 0.75 }}>
            {coldOv.items.map((it) => t('panels_stock.mon_2', { name: it.name, qty: it.qty })).join(' ')}
          </div>
        </Callout>
      )}
      {items.length === 0 ? <p style={styles.sub}>{t('panels_stock.kho_trong_vao_nhap_hang_de')}</p> : (
        <div style={{ overflowX: 'auto', maxWidth: '100%' }}>
          <table style={styles.table}>
            <tbody>
              {items.map(({ id, q, life }) => (
                <tr key={id}>
                  <td style={styles.left}>{productById(id).name}</td>
                  <td>{describeUnits(id, q)}</td>
                  <td style={{ opacity: 0.7 }}>{q}{' '}{t('panels_stock.mon_thung')}{' '}{caseSize(id)}</td>
                  <td><LifeBadge life={life} sale={0} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {next && (
        <div style={{ ...styles.card, marginTop: 12 }}>
          <span style={{ flex: 1, fontSize: 13 }}>
            <b>{t('panels_stock.nang_len')}{' '}{next.name}</b>{t('panels_stock.chua')}{' '}{next.cases}{' '}{t('panels_stock.thung_giu_lanh')}{' '}{next.cold}{' '}{t('panels_stock.mon_3')}{' '}{next.racks}{' '}{t('panels_stock.ke')}{' '}{next.fridges}{' '}{t('panels_stock.tu_lanh')}
          </span>
          <button style={styles.btn} disabled={level < next.unlock || money < next.price || !hasMaterials(wareMaterials, tierIndex + 1)} onClick={upgradeWarehouse}>
            {level < next.unlock ? t('panels_stock.cap', { unlock: next.unlock }) : (materialBlockLabel(wareMaterials, tierIndex + 1) ?? shortLabel(formatMoney(next.price), next.price, money))}
          </button>
        </div>
      )}
      {next && tierIndex + 1 >= MATERIAL_FROM_TIER && (() => {
        // GĐ1945 — vật liệu nâng kho: để ở bãi, không chiếm thùng
        const need = materialsFor(tierIndex + 1);
        const miss = missingMaterials(wareMaterials, tierIndex + 1);
        const cost = costOfMaterials(miss);
        return (
          <div style={{ ...styles.card, marginTop: 8 }}>
            <span style={{ flex: 1, fontSize: 13 }}>
              <b>{t('panels_stock.vat_lieu_nang_kho')}</b>{' '}{t('panels_stock.khong_chiem_thung')}{' '}
              {MATERIAL_KEYS.map((k) => (
                <span key={k} style={{ marginRight: 8, color: miss[k] > 0 ? '#ff7675' : '#55efc4' }}>
                  {MATERIAL_LABEL[k]} {wareMaterials?.[k] ?? 0}/{need[k]}
                </span>
              ))}
            </span>
            {cost > 0 ? (
              <button style={styles.btn} disabled={money < cost} onClick={buyMaterialPack}>
                {shortLabel(t('panels_stock.mua_du_phan_thieu'), cost, money)}
              </button>
            ) : <span style={{ fontSize: 12, color: '#2ecc71' }}>{t('panels_stock.du_vat_lieu')}</span>}
          </div>
        );
      })()}
      {next && (() => {
        const wu = warehouseUpgradeValue(tierIndex, storage, priceOf, money);
        const tone = wu.verdict === 'upgrade' ? (wu.affordable ? 'warn' : 'danger') : wu.verdict === 'soon' ? 'accent' : 'ok';
        return (
          <Callout tone={tone} style={{ marginTop: 12 }} title={`🏭 Kho dùng ${wu.casePct}% thùng · giữ lạnh ${wu.coldPct}%${wu.overflow > 0 ? ` (tràn ${wu.overflow} → ~${formatMoney(wu.overflowValue)} hỏng nhanh)` : ''}`}>
            <div style={{ marginTop: 2, fontSize: 12 }}>
              {wu.verdict === 'upgrade' && t('panels_stock.dang_tran_dung_tran_kho_nen') + wu.next!.name + ' (' + formatMoney(wu.next!.price) + ')' + (wu.affordable ? t('panels_stock.tien_du') : t('panels_stock.tien_chua_du') )}
              {wu.verdict === 'soon' && t('panels_stock.sap_dung_tran_chuan_bi_cho', { v0: Math.max(wu.coldPct, wu.casePct), v1: formatMoney(wu.next!.price), v2: wu.next!.name, v3: wu.next!.cases, v4: wu.next!.cold })}
              {wu.verdict === 'ok' && t('panels_stock.kho_con_rong_chua_can_nang')}
            </div>
          </Callout>
        );
      })()}
      <label style={{ ...styles.card, display: 'flex', fontSize: 13, marginTop: 8 }}>
        <input type="checkbox" checked={autoSwap} onChange={(e) => useGame.setState({ autoSwap: e.target.checked })} />
        {t('panels_stock.tu_thay_o_ke_het_hang')}
      </label>
      <Footer onClose={closePanel}>
        <button style={styles.btn} onClick={() => openPanel({ type: 'planogram' })}>{t('panels_stock.so_do_ke')}</button>
        <button style={styles.btn} onClick={() => openPanel({ type: 'order' })}>{t('panels_stock.nhap_hang')}</button>
      </Footer>
    </>
  );
}
