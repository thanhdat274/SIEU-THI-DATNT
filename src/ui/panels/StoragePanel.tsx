import { fitLots, nearestLife } from '../../data/freshness';
import { storageCapacity, storageUsed, useGame } from '../../core/store';
import { warehouseTier, WAREHOUSE_TIERS } from '../../data/warehouse';
import { caseSize, describeUnits, formatMoney, productById } from '../../data/products';
import { LifeBadge, Footer, styles } from './shared';

/** Kho hàng: thùng nguyên + hàng lẻ đã khui, hạn gần nhất, chỗ trống. */
export function StoragePanel() {
  const { storage, storageLots, deliveries, warehouseTier: tierIndex, level, money, autoSwap, upgradeWarehouse, openPanel, closePanel } = useGame();
  const tier = warehouseTier(tierIndex);
  const next = WAREHOUSE_TIERS[tierIndex + 1];
  const capacity = storageCapacity(tierIndex);
  const used = storageUsed(storage);
  const coming = storageUsed({}, ...deliveries.map((d) => d.items));
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
        <div style={{ height: '100%', borderRadius: 4, width: `${Math.min(100, (used / capacity) * 100)}%`, background: used >= capacity ? '#e17055' : '#00b894' }} />
      </div>
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
