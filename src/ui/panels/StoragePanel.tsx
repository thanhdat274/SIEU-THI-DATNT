import { fitLots, nearestLife } from '../../data/freshness';
import { storageCapacity, storageUsed, useGame } from '../../core/store';
import { warehouseTier, WAREHOUSE_TIERS } from '../../data/warehouse';
import { caseSize, describeUnits, formatMoney, productById } from '../../data/products';
import { storeMissRevenue, coldOverflow } from '../../data/advice';
import { stockCapital } from '../../data/stockCapital';
import { stockTurn } from '../../data/stockTurn';
import { shelfCount } from '../../data/analytics';
import { itemHealthList } from '../../data/analytics';
import { warehouseUpgradeValue } from '../../data/warehouseUpgrade';
import { Callout, LifeBadge, Footer, styles } from './shared';

/** Kho hàng: thùng nguyên + hàng lẻ đã khui, hạn gần nhất, chỗ trống. */
export function StoragePanel() {
  const { storage, storageLots, deliveries, warehouseTier: tierIndex, level, money, priceOf, autoSwap, upgradeWarehouse, openPanel, closePanel, stats, weather, analytics, furniture, demand } = useGame();
  const tier = warehouseTier(tierIndex);
  const next = WAREHOUSE_TIERS[tierIndex + 1];
  const capacity = storageCapacity(tierIndex);
  const used = storageUsed(storage);
  const coming = storageUsed({}, ...deliveries.map((d) => d.items));
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
        Đang chứa <b>{used}/{capacity} thùng</b>{coming > 0 && ` · ${coming} thùng sẽ về sáng mai`}. Thùng đã khui vẫn chiếm một chỗ.
        {' '}Bày kệ dùng hàng lẻ trước rồi mới khui thùng mới. Tủ lạnh kho giữ lạnh {tier.cold} món hàng mát, đông lạnh, tươi; phần dư để ngoài hỏng nhanh.
      </p>
      <div style={{ height: 8, borderRadius: 4, background: '#ffffff22', margin: '6px 0 10px' }}>
        <div style={{ height: '100%', borderRadius: 4, width: `${Math.min(100, (used / capacity) * 100)}%`, background: used >= capacity ? '#e67e22' : '#2ecc71' }} />
      </div>
      {(() => {
        const cap = stockCapital(storage, priceOf);
        if (!cap) return null;
        const overCash = cap.totalRetail > money;
        return (
          <Callout tone={overCash ? 'warn' : 'info'} style={{ marginBottom: 8 }} title={`🪙 Kho đang chôn ${formatMoney(cap.totalCost)} vốn (giá nhập) · trị giá bán lẻ ${formatMoney(cap.totalRetail)}`}>
            <div style={{ marginTop: 2, fontSize: 12 }}>
              {cap.lines.length > 0 && <>Chôn nhiều nhất: {cap.lines.slice(0, 3).map((l) => `${l.name} ${formatMoney(l.costTotal)}`).join(' · ')}.</>}{' '}
              {overCash
                ? `Trị giá kho còn vượt cả tiền mặt (${formatMoney(money)}) — kho ứ vốn, cân nhắc xả sỉ (GĐ211) hay bày kệ bán bớt trước khi nhập thêm.`
                : 'Vốn nằm trong hàng hoá đang chờ bán; xem nếu muốn bơm vốn vào chỗ khác.'}
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
              Vốn hàng ~{formatMoney(turn.totalValue)} đang chờ bán hết.
              {worst ? ` ⚠️ Chôn lâu nhất theo giá trị: ${worst.name} (${formatMoney(worst.value)}, ${worst.daysLeft == null ? 'không bán' : `còn ~${worst.daysLeft.toFixed(0)} ngày`}) — xả sớm / giảm nhập.` : ' Xoay vòng ổn, không món nào kẹt lâu.'}
            </div>
          </Callout>
        );
      })()}
      {missRev && missRev.totalLoss > 0 && (
        <Callout tone="danger" style={{ marginBottom: 8 }} title={`📦 Hôm qua bỏ lỡ ~${formatMoney(missRev.totalLoss)} vì hết chỗ/kho`}>
          <div style={{ marginTop: 2, fontSize: 12 }}>
            {missRev.inStorageCount > 0
              ? `${missRev.rows[0]?.name} còn trong kho mà kệ hết chỗ — nâng kho/kệ thêm để bày đủ, thu hồi dần.`
              : `${missRev.rows[0]?.name} hết cả kho — nhập thêm rồi nâng kho để chứa đủ.`}
          </div>
        </Callout>
      )}
      {coldOv && (
        <Callout tone="warn" style={{ marginBottom: 8 }} title={`🧊 Tủ lạnh kho đầy: ${coldOv.coldQty}/${coldOv.capacity} món cần lạnh`}>
          <div style={{ marginTop: 2, fontSize: 12 }}>
            Dư {coldOv.overflow} món phải để ngoài nhiệt độ thường — hỏng nhanh gấp ~
            {coldOv.items[0]?.penalty.toFixed(1)}×{' '}
            {coldOv.nextCapacity
              ? `· nâng kho giữ lạnh được ${coldOv.nextCapacity} món.`
              : '· đã kho tối đa, bán bớt món lạnh dự trữ.'}
          </div>
          <div style={{ marginTop: 2, opacity: 0.75 }}>
            {coldOv.items.map((it) => `· ${it.name}: ${it.qty} món`).join(' ')}
          </div>
        </Callout>
      )}
      {items.length === 0 ? <p style={styles.sub}>Kho trống. Vào Nhập hàng để đặt thêm.</p> : (
        <table style={styles.table}>
          <tbody>
            {items.map(({ id, q, life }) => (
              <tr key={id}>
                <td style={styles.left}>{productById(id).name}</td>
                <td>{describeUnits(id, q)}</td>
                <td style={{ opacity: 0.7 }}>{q} món · thùng {caseSize(id)}</td>
                <td><LifeBadge life={life} sale={0} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {next && (
        <div style={{ ...styles.card, marginTop: 12 }}>
          <span style={{ flex: 1, fontSize: 13 }}>
            <b>Nâng lên {next.name}</b>: chứa {next.cases} thùng, giữ lạnh {next.cold} món, {next.racks} kệ, {next.fridges} tủ lạnh.
          </span>
          <button style={styles.btn} disabled={level < next.unlock || money < next.price} onClick={upgradeWarehouse}>
            {level < next.unlock ? `🔒 Cấp ${next.unlock}` : formatMoney(next.price)}
          </button>
        </div>
      )}
      {next && (() => {
        const wu = warehouseUpgradeValue(tierIndex, storage, priceOf, money);
        const tone = wu.verdict === 'upgrade' ? (wu.affordable ? 'warn' : 'danger') : wu.verdict === 'soon' ? 'accent' : 'ok';
        return (
          <Callout tone={tone} style={{ marginTop: 12 }} title={`🏭 Kho dùng ${wu.casePct}% thùng · giữ lạnh ${wu.coldPct}%${wu.overflow > 0 ? ` (tràn ${wu.overflow} → ~${formatMoney(wu.overflowValue)} hỏng nhanh)` : ''}`}>
            <div style={{ marginTop: 2, fontSize: 12 }}>
              {wu.verdict === 'upgrade' && 'Đang tràn/đụng trần kho — nên nâng lên ' + wu.next!.name + ' (' + formatMoney(wu.next!.price) + ')' + (wu.affordable ? ', tiền đủ.' : ', tiền chưa đủ.' )}
              {wu.verdict === 'soon' && `Sắp đụng trần (${Math.max(wu.coldPct, wu.casePct)}%) — chuẩn bị ${formatMoney(wu.next!.price)} cho ${wu.next!.name} (${wu.next!.cases} thùng / giữ lạnh ${wu.next!.cold}).`}
              {wu.verdict === 'ok' && 'Kho còn rộng, chưa cần nâng.'}
            </div>
          </Callout>
        );
      })()}
      <label style={{ ...styles.card, display: 'flex', fontSize: 13, marginTop: 8 }}>
        <input type="checkbox" checked={autoSwap} onChange={(e) => useGame.setState({ autoSwap: e.target.checked })} />
        Tự thay ô kệ hết hàng (kho cũng hết, không có đơn chờ) bằng món khác đang có trong kho
      </label>
      <Footer onClose={closePanel}>
        <button style={styles.btn} onClick={() => openPanel({ type: 'planogram' })}>🗺️ Sơ đồ kệ</button>
        <button style={styles.btn} onClick={() => openPanel({ type: 'order' })}>📦 Nhập hàng</button>
      </Footer>
    </>
  );
}
