import { useGame, useClock } from '../../core/store';
import { useState } from 'react';
import { RECIPES, STATIONS, type CookingStation } from '../../data/recipes';
import { formatMoney, productById } from '../../data/products';
import { kitchenValue } from '../../data/kitchenValue';
import { cookAdvice } from '../../data/cookSchedule';
import { cookSpeed, bartenderBoost } from '../../core/slices/orders';
import { FESTIVALS, festivalOn } from '../../data/calendar';
import { Footer, styles, Tabs } from './shared';

/** Sổ nấu: công thức theo trạm, nguyên liệu lấy từ kho (lô cận hạn trước), mẻ xong về kho chờ bày kệ. */
export function CookPanel() {
  const { level, storage, furniture, cookJobs, startCook, closePanel, openPanel, setBuildMode } = useGame();
  const day = useGame((s) => s.day);
  // GĐ161: giờ hiện tại (vẽ lại 1 lần mỗi phút game như Hud) + tốc độ trạm thật
  // (đầu bếp/pha chế trực ca — cùng nguồn cookSpeed/bartenderBoost với tick đồng hồ)
  const minutes = useClock((c) => Math.floor(c.minutes));
  const cSpeed = cookSpeed(useGame.getState);
  const bBoost = bartenderBoost(useGame.getState);
  // Tab theo trạm: sổ nấu đầy đủ dài ~9.000px trên điện thoại — chọn trạm là thấy ngay món cần nấu.
  // Màn hẹp mặc định mở trạm đầu tiên đang sở hữu (ít cuộn nhất); desktop rộng giữ "Tất cả" để xem toàn cảnh.
  const [station, setStation] = useState<'all' | CookingStation>(() => {
    if (typeof matchMedia !== 'undefined' && matchMedia('(max-width: 700px)').matches) {
      const owned = STATIONS.find((s) => furniture.some((f) => f.type === s.id));
      return owned ? owned.id : 'all';
    }
    return 'all';
  });
  const stationTabs = [['all', '🏷️ Tất cả'] as const, ...STATIONS.map((s) => [s.id, `${s.icon} ${s.name}`] as const)];
  const stationCount = (st: CookingStation) => furniture.filter((f) => f.type === st).length;
  const busyAt = (st: CookingStation) => cookJobs.filter((j) => RECIPES.find((r) => r.id === j.recipeId)?.station === st).length;
  return (
    <>
      <h2 style={styles.title}>🍳 Sổ nấu</h2>
      {/* GĐ99: mô tả đủ 4 câu chiếm ~1/4 màn 390px — giữ 2 dòng chính, giải thích vào thẻ gập */}
      <p style={{ ...styles.sub, marginBottom: 4 }}>
        Món nhà làm không nhập được ở mối nào — nấu từ nguyên liệu trong kho (lô cận hạn dùng trước), nấu xong tự về kho bày như hàng thường.
      </p>
      <details style={{ marginBottom: 10 }}>
        <summary style={{ fontSize: 12, opacity: 0.7 }}>Vì sao nên nấu nhà làm?</summary>
        <p style={{ ...styles.sub, margin: '4px 0 10px' }}>
          Khách thích món nhà làm nên hỏi mua nhiều hơn. Mỗi trạm mỗi lúc nấu một mẻ; thuê 🍳 Chế biến (cấp 25) thì nấu nhanh hơn theo tay nghề.
        </p>
      </details>
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
      <Tabs tabs={stationTabs} value={station} onChange={setStation} />
      {STATIONS.filter((st) => station === 'all' || st.id === station).map((st) => {
        const own = stationCount(st.id);
        const busy = busyAt(st.id);
        const recipes = RECIPES.filter((r) => r.station === st.id).sort((a, b) => a.unlock - b.unlock);
        return (
          <div key={st.id} style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '4px 0' }}>
              <b>{st.icon} {st.name}</b>
              <span style={{ fontSize: 12, opacity: own ? 0.75 : 0.95, color: own ? undefined : '#e67e22' }}>
                {own ? `${busy}/${own} trạm bận` : `chưa có trạm — mua ở 🛠️ Xây dựng (cấp ${st.unlock})`}
              </span>
              {!own && level >= st.unlock && (
                <button style={{ ...styles.btn, marginLeft: 0 }} onClick={() => setBuildMode(true)}>Mua trạm</button>
              )}
            </div>
            <div style={{ display: 'grid', gap: 6, maxWidth: 560 }}>
              {recipes.map((r) => {
                const out = productById(r.outputId);
                // GĐ145: lãi mẻ (khớp dòng cũ) + băng thông ⏱/phút + chi phí cơ hội của nguyên liệu
                const kv = kitchenValue(r);
                const gross = kv.netMargin;
                const missing = r.inputs.filter((i) => (storage[i.productId] ?? 0) < i.quantity);
                const locked = level < r.unlock;
                const noStation = !own;
                const stationFull = busy >= own;
                // Giỏ quà ngày lễ: chỉ gói được trong đúng dịp trên lịch
                const fest = r.festival ? FESTIVALS.find((f) => f.id === r.festival) : undefined;
                const outOfSeason = !!fest && festivalOn(day)?.id !== fest.id;
                const reason = locked ? `🔒 Cấp ${r.unlock}` : outOfSeason ? `Ngoài dịp ${fest!.name}` : noStation ? 'Thiếu trạm' : stationFull ? 'Trạm bận' : missing.length ? 'Thiếu nguyên liệu' : null;
                // GĐ161: khuyến nghị thời điểm (kịp giờ vàng nào) — chỉ khi món nấu được ngay được
                const advice = !reason
                  ? cookAdvice(r.id, minutes, Math.ceil(r.durationMin / (cSpeed * (r.station === 'drink_counter' ? bBoost : 1))))
                  : null;
                return (
                  <div key={r.id} style={{ ...styles.card, opacity: locked || outOfSeason ? 0.5 : 1 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <b>{r.name}</b>
                      {fest && <span style={{ fontSize: 11, color: outOfSeason ? '#e67e22' : '#2ecc71', marginLeft: 6 }}>{fest.icon} {outOfSeason ? `chỉ trong dịp ${fest.name}` : 'đúng dịp — gói đi!'}</span>}
                      <div style={{ fontSize: 12, opacity: 0.8 }}>
                        {r.inputs.map((i) => {
                          const have = storage[i.productId] ?? 0;
                          return `${i.quantity} ${productById(i.productId).name} (${have})`;
                        }).join(' + ')}
                        {' '}→ <b>{r.outputQty} × {out.name}</b> · {r.durationMin} phút
                      </div>
                      <div style={{ fontSize: 12 }}>
                        Lãi gộp ~<b style={{ color: gross > 0 ? '#2ecc71' : '#e74c3c' }}>{formatMoney(gross)}</b>/mẻ
                        {own && (
                          <span style={{ opacity: 0.85 }}> · ⏱ ~{formatMoney(Math.round(kv.perMinute))}/phút</span>
                        )}
                        {missing.length > 0 && !locked && (
                          <span style={{ color: '#ff8a7a' }}> · thiếu: {missing.map((i) => productById(i.productId).name).join(', ')}</span>
                        )}
                      </div>
                      {own && kv.verdict === 'sell_raw' && (
                        <div style={{ fontSize: 12, color: '#e74c3c', marginTop: 2 }}>
                          ⚠️ Nguyên liệu bán rời còn hời hơn nấu ~{formatMoney(kv.delta)}
                        </div>
                      )}
                      {advice && (
                        <div style={{ fontSize: 12, opacity: 0.85, marginTop: 2 }}>⏰ {advice}</div>
                      )}
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
