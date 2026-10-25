import { useGame } from '../../core/store';
import { productById, formatMoney } from '../../data/products';
import { CHICKEN_PRICE, COOP_MAX, COOP_UNLOCK, CROPS, EGG_PER_TRAY, GARDEN_UNLOCK, plotLabel, plotReady } from '../../data/garden';
import { Footer, styles } from './shared';

/** Vườn rau + chuồng gà sau nhà: trồng, tưới, thu hoạch, nuôi gà lấy trứng. */
export function GardenPanel() {
  const { garden, level, money, day, plantCrop, waterGarden, harvestPlot, buyChicken, feedCoop, collectEggs, closePanel } = useGame();
  const homegrown = Object.entries(garden.homegrown).filter(([, q]) => q > 0);
  return (
    <>
      <h2 style={styles.title}>🌱 Vườn nhà</h2>
      <p style={styles.sub}>
        Sau nhà có {garden.plots.length} luống đất. Trồng giống, tưới mỗi sáng (mưa tưới hộ) thì tới ngày thu hoạch.
        Hàng nhà trồng vào kho với nhãn "rau nhà trồng" — khách trả thêm 20%, nấu ăn cũng dùng được, chi nhánh 24/7 bán được luôn.
      </p>
      {level < GARDEN_UNLOCK ? (
        <p style={styles.sub}>🔒 Vườn mở ở cấp {GARDEN_UNLOCK}: dọn lại mảnh sau nhà đã.</p>
      ) : (
        <div style={{ display: 'grid', gap: 6, maxWidth: 560 }}>
          {garden.plots.map((p, i) => {
            const ready = plotReady(p);
            return (
              <div key={i} style={{ ...styles.card, display: 'block' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <b>Luống {i + 1}: {p.crop ? plotLabel(p, day) : 'Đất trống'}</b>
                  <span style={{ display: 'flex', gap: 4 }}>
                    {p.crop && ready && (
                      <button style={{ ...styles.btn, background: '#2ecc71', color: '#fff' }} onClick={() => harvestPlot(i)}>🧺 Thu hoạch</button>
                    )}
                    {p.crop && !ready && (
                      <button style={{ ...styles.btn, background: '#3498db', color: '#fff' }} onClick={waterGarden}>💧 Tưới</button>
                    )}
                  </span>
                </div>
                {!p.crop && (
                  <div style={{ fontSize: 12, marginTop: 4, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {CROPS.filter((c) => c.unlock <= level).map((c) => (
                      <button key={c.id} style={{ ...styles.btn, background: money >= c.seedCost ? '#27ae60' : '#555', color: '#fff' }}
                        onClick={() => plantCrop(i, c.id)} title={`~${c.days} ngày, thu ${c.yieldQty} món`}>
                        {c.icon} Trồng {c.name} ({formatMoney(c.seedCost)})
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          <div style={{ ...styles.card, display: 'block' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <b>🐔 Chuồng gà</b>
              <span style={{ display: 'flex', gap: 4 }}>
                {garden.coop && level >= COOP_UNLOCK && (
                  <>
                    <button style={{ ...styles.btn, background: '#8e44ad', color: '#fff' }} onClick={feedCoop}>🌾 Cho ăn</button>
                    <button style={{ ...styles.btn, background: garden.coop.eggs >= EGG_PER_TRAY ? '#f39c12' : '#555', color: '#fff' }} onClick={collectEggs}>
                      🥚 Lấy trứng ({garden.coop.eggs}/{EGG_PER_TRAY})
                    </button>
                  </>
                )}
              </span>
            </div>
            {level < COOP_UNLOCK ? (
              <div style={{ fontSize: 12, opacity: 0.75, marginTop: 4 }}>🔒 Chuồng gà mở ở cấp {COOP_UNLOCK}.</div>
            ) : !garden.coop ? (
              <div style={{ fontSize: 12, marginTop: 4 }}>
                <button style={{ ...styles.btn, background: money >= CHICKEN_PRICE ? '#e67e22' : '#555', color: '#fff' }} onClick={buyChicken}>
                  🐔 Mua con gà đầu tiên ({formatMoney(CHICKEN_PRICE)})
                </button>
                <span style={{ opacity: 0.75, marginLeft: 8 }}>Cho ăn cám gà mỗi ngày, trứng gói thành vỉ bán như hàng nhà nuôi.</span>
              </div>
            ) : (
              <div style={{ fontSize: 12, marginTop: 4 }}>
                {garden.coop.chickens}/{COOP_MAX} con · {garden.coop.fedDay === day ? '✅ Hôm nay đã cho ăn' : '⚠️ Chưa cho ăn hôm nay'}
                {garden.coop.chickens < COOP_MAX && (
                  <button style={{ ...styles.btn, background: money >= CHICKEN_PRICE ? '#e67e22' : '#555', color: '#fff' }} onClick={buyChicken}>
                    + Mua thêm ({formatMoney(CHICKEN_PRICE)})
                  </button>
                )}
              </div>
            )}
          </div>
          <div style={{ ...styles.card, display: 'block' }}>
            <b>🏷️ Hàng nhà trồng đang có trong kho</b>
            <div style={{ fontSize: 12, marginTop: 4 }}>
              {homegrown.length
                ? homegrown.map(([id, q]) => `${productById(id).name} ×${q}`).join(', ')
                : 'Chưa có — thu hoạch hoặc lấy trứng sẽ có.'}
            </div>
          </div>
        </div>
      )}
      <Footer onClose={closePanel} />
    </>
  );
}
