import { useGame } from '../../core/store';
import { RECIPES, STATIONS, type CookingStation } from '../../data/recipes';
import { formatMoney, productById } from '../../data/products';
import { FESTIVALS, festivalOn } from '../../data/calendar';
import { Footer, styles } from './shared';

/** Sổ nấu: công thức theo trạm, nguyên liệu lấy từ kho (lô cận hạn trước), mẻ xong về kho chờ bày kệ. */
export function CookPanel() {
  const { level, storage, furniture, cookJobs, startCook, closePanel, openPanel, setBuildMode } = useGame();
  const day = useGame((s) => s.day);
  const stationCount = (st: CookingStation) => furniture.filter((f) => f.type === st).length;
  const busyAt = (st: CookingStation) => cookJobs.filter((j) => RECIPES.find((r) => r.id === j.recipeId)?.station === st).length;
  return (
    <>
      <h2 style={styles.title}>🍳 Sổ nấu</h2>
      <p style={styles.sub}>
        Món nhà làm không nhập được ở mối nào — chỉ có bằng cách nấu từ nguyên liệu trong kho (lô cận hạn dùng trước).
        Nấu xong món tự về kho, bày lên kệ như hàng thường; khách thích món nhà làm nên hỏi mua nhiều hơn.
        Mỗi trạm mỗi lúc nấu một mẻ; thuê 🍳 Chế biến (cấp 25) thì nấu nhanh hơn theo tay nghề.
      </p>
      {cookJobs.length > 0 && (
        <div style={{ ...styles.card, display: 'block', marginBottom: 10, maxWidth: 560 }}>
          <b style={{ fontSize: 13 }}>🔥 Đang nấu</b>
          {cookJobs.map((j) => {
            const r = RECIPES.find((x) => x.id === j.recipeId);
            return (
              <div key={j.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginTop: 4 }}>
                <span style={{ flex: 1 }}>{r?.name ?? j.recipeId}</span>
                <div style={{ width: 140, height: 8, background: '#555', borderRadius: 4 }}>
                  <div style={{ width: `${Math.min(100, ((j.total - j.remaining) / j.total) * 100)}%`, height: '100%', borderRadius: 4, background: '#f1c40f' }} />
                </div>
                <span style={{ opacity: 0.75, width: 74, textAlign: 'right' }}>còn ~{Math.ceil(j.remaining)} phút</span>
              </div>
            );
          })}
        </div>
      )}
      {STATIONS.map((st) => {
        const own = stationCount(st.id);
        const busy = busyAt(st.id);
        const recipes = RECIPES.filter((r) => r.station === st.id).sort((a, b) => a.unlock - b.unlock);
        return (
          <div key={st.id} style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '4px 0' }}>
              <b>{st.icon} {st.name}</b>
              <span style={{ fontSize: 12, opacity: own ? 0.75 : 0.95, color: own ? undefined : '#f39c12' }}>
                {own ? `${busy}/${own} trạm bận` : `chưa có trạm — mua ở 🛠️ Xây dựng (cấp ${st.unlock})`}
              </span>
              {!own && level >= st.unlock && (
                <button style={{ ...styles.btn, marginLeft: 0 }} onClick={() => setBuildMode(true)}>Mua trạm</button>
              )}
            </div>
            <div style={{ display: 'grid', gap: 6, maxWidth: 560 }}>
              {recipes.map((r) => {
                const out = productById(r.outputId);
                const inputCost = r.inputs.reduce((n, i) => n + productById(i.productId).buy * i.quantity, 0);
                const gross = out.sell * r.outputQty - inputCost;
                const missing = r.inputs.filter((i) => (storage[i.productId] ?? 0) < i.quantity);
                const locked = level < r.unlock;
                const noStation = !own;
                const stationFull = busy >= own;
                // Giỏ quà ngày lễ: chỉ gói được trong đúng dịp trên lịch
                const fest = r.festival ? FESTIVALS.find((f) => f.id === r.festival) : undefined;
                const outOfSeason = !!fest && festivalOn(day)?.id !== fest.id;
                const reason = locked ? `🔒 Cấp ${r.unlock}` : outOfSeason ? `Ngoài dịp ${fest!.name}` : noStation ? 'Thiếu trạm' : stationFull ? 'Trạm bận' : missing.length ? 'Thiếu nguyên liệu' : null;
                return (
                  <div key={r.id} style={{ ...styles.card, opacity: locked || outOfSeason ? 0.5 : 1 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <b>{r.name}</b>
                      {fest && <span style={{ fontSize: 11, color: outOfSeason ? '#f39c12' : '#2ecc71', marginLeft: 6 }}>{fest.icon} {outOfSeason ? `chỉ trong dịp ${fest.name}` : 'đúng dịp — gói đi!'}</span>}
                      <div style={{ fontSize: 12, opacity: 0.8 }}>
                        {r.inputs.map((i) => {
                          const have = storage[i.productId] ?? 0;
                          return `${i.quantity} ${productById(i.productId).name} (${have})`;
                        }).join(' + ')}
                        {' '}→ <b>{r.outputQty} × {out.name}</b> · {r.durationMin} phút
                      </div>
                      <div style={{ fontSize: 12 }}>
                        Lãi gộp ~<b style={{ color: gross > 0 ? '#2ecc71' : '#e74c3c' }}>{formatMoney(gross)}</b>/mẻ
                        {missing.length > 0 && !locked && (
                          <span style={{ color: '#ff8a7a' }}> · thiếu: {missing.map((i) => productById(i.productId).name).join(', ')}</span>
                        )}
                      </div>
                    </div>
                    {locked ? (
                      <span style={{ fontSize: 12 }}>🔒 Cấp {r.unlock}</span>
                    ) : (
                      <button style={styles.btn} disabled={!!reason} title={reason ?? 'Bắt đầu nấu'} onClick={() => startCook(r.id)}>
                        {reason ?? '🍳 Nấu'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
      <Footer onClose={closePanel}>
        <button style={styles.btn} onClick={() => openPanel({ type: 'order' })}>📦 Nhập nguyên liệu</button>
        <button style={styles.btn} onClick={() => openPanel({ type: 'storage' })}>🏭 Xem kho</button>
      </Footer>
    </>
  );
}
