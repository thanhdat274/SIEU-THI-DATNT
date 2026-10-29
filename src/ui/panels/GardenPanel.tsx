import { useGame } from '../../core/store';
import { productById, formatMoney } from '../../data/products';
import {
  ANIMALS, ANIMAL_ORDER, animalMode, CROPS, EGG_PER_TRAY, FARM_BUILDING_MAX_STAR, FARM_BUILDINGS, FARM_BUILDING_ORDER, FARM_ORDER_UNLOCK,
  FERTILIZER_PRODUCT, GARDEN_UNLOCK, cropById, inSeason, LAND_TIERS, monthOf, penCap, fattenReady, plotLabel, plotReady,
} from '../../data/garden';
import { animalPerDay, bestAnimal, bestCrop, cropPerDay } from '../../data/farmValue';
import { farmVsCook } from '../../data/farmKitchenValue';
import { Callout, Footer, styles } from './shared';

/** Trang trại đầu ngõ: trồng theo mùa vụ, nuôi 7 loài, công trình + dọn trại lấy gỗ đá nâng sao, đơn quán xóm. */
export function GardenPanel() {
  const { garden, level, money, day, weather, storage, plantCrop, waterGarden, waterPlot, fertilizePlot, harvestPlot, buyAnimal, feedPen, collectPen, sellFattened, expandFarm, deliverFarmOrder, buyFarmBuilding, upgradeFarmBuilding, cleanupFarm, closePanel } = useGame();
  const homegrown = Object.entries(garden.homegrown).filter(([, q]) => q > 0);
  const tier = LAND_TIERS[garden.land] ?? LAND_TIERS[LAND_TIERS.length - 1];
  const nextTier = LAND_TIERS[garden.land + 1];
  const order = garden.farmOrder;
  const orderPay = order ? Math.round(order.items.reduce((n, it) => n + it.qty * productById(it.productId).sell, 0) * order.bonus) : 0;
  const orderReady = order ? order.items.every((it) => (storage[it.productId] ?? 0) >= it.qty && (garden.homegrown[it.productId] ?? 0) >= it.qty) : false;
  const seasonCrops = CROPS.filter((c) => c.season && inSeason(c, day));
  return (
    <>
      <h2 style={styles.title}>🚜 Trang trại đầu ngõ</h2>
      <p style={styles.sub}>
        Mảnh trại cuối đường thứ hai (bấm nút 🚜 Ra trại để qua). Hiện là "{tier.name}" với {garden.plots.length} luống đất,
        chuồng {ANIMAL_ORDER.map((k) => ANIMALS[k].name.toLowerCase()).join('/')}. Hàng nhà trồng/nhà nuôi vào kho — khách trả thêm 20%, chi nhánh 24/7 bán được luôn.
      </p>
      {level < GARDEN_UNLOCK ? (
        <p style={styles.sub}>🔒 Trang trại mở ở cấp {GARDEN_UNLOCK}: dọn lại mảnh đất ven đường đã.</p>
      ) : (
        <div style={{ display: 'grid', gap: 6, maxWidth: 560 }}>
          {(() => {
            const bc = bestCrop(level, day);
            const ba = bestAnimal(garden);
            if (!bc && !ba) return null;
            return (
              <Callout tone="warn" title="💡 Hôm nay đáng: ">
                <div style={{ fontSize: 12, marginTop: 4 }}>
                  {bc && <span>Trồng <b>{bc.crop.icon} {bc.crop.name}</b> ~{formatMoney(Math.round(bc.perDay))}/luống/ngày{bc.inSeasonNow && bc.crop.season ? ' (đúng mùa ×1,5)' : ''}{ba ? ' · ' : ''}</span>}
                  {ba && <span>Nuôi <b>{ba.def.icon} {ba.def.name}</b> ~{formatMoney(Math.round(ba.perDay))}/con/ngày{ba.perDay < 0 ? ' (lỗ cám!)' : ''}</span>}
                </div>
              </Callout>
            );
          })()}

          {(() => {
            // GĐ147 — Nấu hay bán lẻ: với từng nông sản nhà trồng/nuôi đang có trong kho,
            // so bán lẻ (nhãn nhà trồng ×1,2) với nấu thành món (lãi món tính cơ hội phí thật).
            const lines = homegrown
              .map(([id, qty]) => {
                const f = farmVsCook(id);
                if (!f.best) return { id, qty, key: id, text: `${productById(id).name}: bán lẻ ~${formatMoney(f.sellPerUnit)}/món` };
                const d = f.best;
                return {
                  id, qty, key: id,
                  text: `${productById(id).name}: nấu <b>${d.recipe.name}</b> lời ~${formatMoney(d.homegrownNet)} (+${formatMoney(d.deltaVsSell)} so bán lẻ ${formatMoney(d.sellLot)})`,
                  thin: d.homegrownNet < d.sellLot, // nấu lời còn kém cả bán lẻ cả lot — bán lẻ thật sự đáng cân nhắc
                };
              })
              .slice(0, 5);
            if (!lines.length) return null;
            return (
              <Callout tone="event" title="🧑‍🍳 Nấu hay bán lẻ: ">
                <div style={{ fontSize: 12, marginTop: 4 }}>
                  {lines.map((l) => (
                    <div key={l.key} style={{ marginBottom: 2, color: l.thin ? '#e67e22' : undefined }}>
                      <span dangerouslySetInnerHTML={{ __html: l.text }} />
                    </div>
                  ))}
                  <div style={{ opacity: 0.75, marginTop: 3 }}>Lãi món tính theo giá bán lẻ nhà trồng (×1,2) của nông sản — bếp luôn cộng thêm giá trị cho nông sản, chỉ món nào lời <i>mỏng</i> (màu cam) thì bán lẻ cũng đáng cân nhắc khi trạm bận.</div>
                </div>
              </Callout>
            );
          })()}

          {order ? (
            <Callout tone="warn" title={`📦 Đơn của ${order.from}`} actions={
              <button style={{ ...styles.btn, background: orderReady ? '#2ecc71' : '#555', color: '#fff' }} onClick={deliverFarmOrder}>
                Giao đơn · {formatMoney(orderPay)}
              </button>
            }>
              <div style={{ fontSize: 12, marginTop: 4 }}>
                {order.items.map((it) => {
                  const have = storage[it.productId] ?? 0;
                  const home = garden.homegrown[it.productId] ?? 0;
                  const ok = have >= it.qty && home >= it.qty;
                  return `${productById(it.productId).name} ${have}/${it.qty} (nhà trồng ${home})${ok ? '✓' : '⚠️'}`;
                }).join(' · ')} — giá hời ×{order.bonus} cho nông sản nhà trồng, hạn ngày {order.dueDay} (còn {Math.max(0, order.dueDay - day)} ngày)
              </div>
            </Callout>
          ) : level >= FARM_ORDER_UNLOCK ? (
            <div style={{ ...styles.card, fontSize: 12, opacity: 0.75 }}>📦 Đơn quán xóm: đang trống — hôm sau sẽ có quán ghé đặt nông sản.</div>
          ) : null}

          {seasonCrops.length > 0 && (
            <Callout tone="ok" title={`🌤️ Đang vào mùa vụ (tháng ${monthOf(day)}): trái sai gấp rưỡi`}>
              <div style={{ fontSize: 12, marginTop: 4 }}>
                {seasonCrops.map((c) => `${c.icon} ${c.name} (${c.season![0]}–${c.season![1]})`).join(' · ')} — trồng giống này hôm nay thu được nhiều hơn hẳn.
              </div>
            </Callout>
          )}

          <div style={{ ...styles.card, display: 'block' }}>
            <b>🚜 Đất trại: {tier.name}</b>
            <div style={{ fontSize: 12, marginTop: 4 }}>
              {garden.plots.length} luống · {ANIMAL_ORDER.filter((k) => penCap(garden.land, k) > 0).map((k) => `${ANIMALS[k].icon} ${penCap(garden.land, k)}`).join(' · ')}
              {garden.plots.some((p) => p.crop && p.wateredDay !== day) && (
                <button style={{ ...styles.btn, background: '#3498db', color: '#fff', marginLeft: 8 }} onClick={waterGarden} title="Tưới hết luống đang thiếu nước hôm nay">
                  💧 Tưới cả vườn
                </button>
              )}
              {nextTier ? (
                <button style={{ ...styles.btn, background: level >= nextTier.unlock && money >= nextTier.cost ? '#2ecc71' : '#555', color: '#fff', marginLeft: 8 }}
                  onClick={expandFarm} title={level < nextTier.unlock ? `Cần cấp ${nextTier.unlock}` : `Mua thêm ${nextTier.plots - garden.plots.length} luống và chuồng mới`}>
                  ⬆️ Mở rộng "{nextTier.name}" ({formatMoney(nextTier.cost)}){level < nextTier.unlock ? ` — cấp ${nextTier.unlock}` : ''}
                </button>
              ) : (
                <span style={{ opacity: 0.7, marginLeft: 8 }}>✔️ Đã rộng nhất</span>
              )}
            </div>
          </div>

          {garden.plots.map((p, i) => {
            const ready = plotReady(p);
            const canFert = p.crop && p.fertilizedDay === undefined;
            const wateredWhy = weather === 'rain' || weather === 'storm' ? '🌧️ Trời đang mưa, cây đã đủ nước'
              : garden.buildings.tuoi_tu_dong ? '💧 Hệ tưới nhỏ giọt tự lo rồi'
              : p.wateredDay === day ? 'Hôm nay đã tưới luống này rồi' : undefined;
            const watered = !!wateredWhy;
            return (
              <div key={i} style={{ ...styles.card, display: 'block' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <b>Luống {i + 1}: {p.crop ? plotLabel(p, day) : 'Đất trống'}</b>
                  <span style={{ display: 'flex', gap: 4 }}>
                    {p.crop && ready && (
                      <button style={{ ...styles.btn, background: '#2ecc71', color: '#fff' }} onClick={() => harvestPlot(i)}>🧺 Thu hoạch</button>
                    )}
                    {p.crop && !ready && (
                      <button
                        disabled={watered}
                        style={{ ...styles.btn, background: watered ? '#555' : '#3498db', color: '#fff', opacity: watered ? 0.6 : 1, cursor: watered ? 'not-allowed' : undefined }}
                        title={wateredWhy}
                        onClick={() => waterPlot(i)}
                      >
                        {watered ? '✔️ Đã đủ nước' : '💧 Tưới'}
                      </button>
                    )}
                    {canFert && !ready && (
                      <button style={{ ...styles.btn, background: (storage[FERTILIZER_PRODUCT] ?? 0) > 0 ? '#8e44ad' : '#555', color: '#fff' }}
                        onClick={() => fertilizePlot(i)} title={`Rút bớt 30% thời gian còn lại của vụ (tối thiểu 1 ngày) — cần 1 ${productById(FERTILIZER_PRODUCT).name} trong kho; cây lâu năm bón một lần lúc trồng là đủ`}>
                        🌱 Bón phân{(storage[FERTILIZER_PRODUCT] ?? 0) > 0 ? ` (kho ${storage[FERTILIZER_PRODUCT]})` : ' (hết phân — nhập ở Nhập hàng)'}
                      </button>
                    )}
                  </span>
                </div>
                {p.crop && (
                  <div style={{ fontSize: 12, opacity: 0.85, marginTop: 3 }}>
                    {(() => {
                      const cv = cropPerDay(cropById(p.crop), { day, ripeDay: p.ripeDay });
                      return (
                        <span style={cv.perDay < 0 ? { color: '#e74c3c', fontWeight: 600 } : undefined}>
                          🌱 ~{formatMoney(Math.round(cv.perDay))}/luống/ngày{cv.perDay < 0 ? ' (lỗ giống!)' : cv.inSeasonNow && cv.crop.season ? ' · đúng mùa ×1,5' : ''}
                        </span>
                      );
                    })()}
                  </div>
                )}
                {!p.crop && (
                  <div style={{ fontSize: 12, marginTop: 4, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {CROPS.filter((c) => c.unlock <= level).map((c) => {
                      const onSeason = inSeason(c, day);
                      return (
                        <button key={c.id} style={{ ...styles.btn, background: money >= c.seedCost ? (onSeason && c.season ? '#1e8449' : '#2ecc71') : '#555', color: '#fff' }}
                          onClick={() => plantCrop(i, c.id)}
                          title={`~${c.days} ngày, thu ${c.yieldQty} món${c.regrowDays ? `, sau đó mỗi ${c.regrowDays} ngày ra trái tiếp` : ''}${c.season ? `, mùa vụ tháng ${c.season[0]}–${c.season[1]} (đúng vụ ×1,5)` : ''}`}>
                          {c.icon} {c.name} ({formatMoney(c.seedCost)}){onSeason && c.season ? ' 🌤️' : ''}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {ANIMAL_ORDER.map((kind) => {
            const def = ANIMALS[kind];
            const pen = garden.pens[kind];
            const cap = penCap(garden.land, kind);
            const locked = level < def.unlock || garden.land < def.landTier;
            const need = (pen?.count ?? 0) * def.feedKgPerDay;
            const hungry = pen && pen.fedDay !== day && pen.feedKg < need && (storage[def.feedProduct] ?? 0) === 0;
            const bags = storage[def.feedProduct] ?? 0;
            const feedName = productById(def.feedProduct).name;
            const mode = animalMode(def);
            return (
              <div key={kind} style={{ ...styles.card, display: 'block' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                  <b>{def.icon} {def.name}</b>
                  <span style={{ display: 'flex', gap: 4 }}>
                    {pen && pen.count > 0 && mode === 'fatten' && (
                      <>
                        <button style={{ ...styles.btn, background: hungry ? '#c0392b' : '#8e44ad', color: '#fff' }} onClick={() => feedPen(kind)}>
                          {hungry ? '⚠️ Hết cám — mua lẻ' : '🌾 Cho ăn'}
                        </button>
                        <button style={{ ...styles.btn, background: fattenReady(kind, pen) ? '#e67e22' : '#555', color: '#fff' }} onClick={() => sellFattened(kind)}
                          title={fattenReady(kind, pen) ? `Xuất chuồng: ~${(def.meatPerHead ?? 0) * pen.count} ${productById(def.productId).name} vào kho` : `Cần cho ăn đủ ${def.fattenDays} ngày`}>
                          🏷️ Xuất chuồng ({pen.fattened ?? 0}/{def.fattenDays})
                        </button>
                      </>
                    )}
                    {pen && pen.count > 0 && mode === 'egg' && (
                      <>
                        <button style={{ ...styles.btn, background: hungry ? '#c0392b' : '#8e44ad', color: '#fff' }} onClick={() => feedPen(kind)}>
                          {hungry ? '⚠️ Hết cám — mua lẻ' : '🌾 Cho ăn'}
                        </button>
                        <button style={{ ...styles.btn, background: pen.pending >= EGG_PER_TRAY ? '#e67e22' : '#555', color: '#fff' }} onClick={() => collectPen(kind)}>
                          🥚 Lấy trứng ({pen.pending}/{EGG_PER_TRAY})
                        </button>
                      </>
                    )}
                    {pen && pen.count > 0 && mode === 'milk' && (
                      <>
                        <button style={{ ...styles.btn, background: hungry ? '#c0392b' : '#8e44ad', color: '#fff' }} onClick={() => feedPen(kind)}>
                          {hungry ? '⚠️ Hết cám — mua lẻ' : '🌾 Cho ăn'}
                        </button>
                        <button style={{ ...styles.btn, background: pen.pending >= 1 ? '#e67e22' : '#555', color: '#fff' }} onClick={() => collectPen(kind)}>
                          🥛 Vắt sữa ({pen.pending})
                        </button>
                      </>
                    )}
                  </span>
                </div>
                {locked ? (
                  <div style={{ fontSize: 12, opacity: 0.75, marginTop: 4 }}>
                    🔒 {def.name} mở ở cấp {def.unlock}{garden.land < def.landTier ? ` và cần đất "${LAND_TIERS[def.landTier].name}"` : ''}. {def.note}.
                  </div>
                ) : !pen || pen.count === 0 ? (
                  <div style={{ fontSize: 12, marginTop: 4 }}>
                    <button style={{ ...styles.btn, background: money >= def.price ? '#e67e22' : '#555', color: '#fff' }} onClick={() => buyAnimal(kind)}>
                      Mua con đầu tiên ({formatMoney(def.price)})
                    </button>
                    <span style={{ opacity: 0.75, marginLeft: 8 }}>{def.note}.</span>
                  </div>
                ) : (
                  <div style={{ fontSize: 12, marginTop: 4 }}>
                    {pen.count}/{cap} con · {pen.fedDay === day ? '✅ Hôm nay đã cho ăn' : '⚠️ Chưa cho ăn hôm nay'}
                    {` · máng ${pen.feedKg.toFixed(1)}/${need.toFixed(1)} kg · kho ${bags} ${feedName}`}
                    {(() => {
                      const av = animalPerDay(kind, garden);
                      return (
                        <div style={{ marginTop: 3 }}>
                          <span style={av.perDay < 0 ? { color: '#e74c3c', fontWeight: 600 } : undefined}>
                            🐾 ~{formatMoney(Math.round(av.perDay))}/con/ngày
                          </span>
                          {av.perDay < 0 && <span style={{ color: '#e74c3c' }}> (nuôi lỗ vì cám!)</span>}
                          {mode === 'fatten' && av.fattenRemaining > 0 && (
                            <span style={{ color: '#e67e22' }}> · ⚠️ còn nuôi {av.fattenRemaining} ngày nữa mới bõ</span>
                          )}
                        </div>
                      );
                    })()}
                    {pen.count < cap && (
                      <button style={{ ...styles.btn, background: money >= def.price ? '#e67e22' : '#555', color: '#fff' }} onClick={() => buyAnimal(kind)}>
                        + Mua thêm ({formatMoney(def.price)})
                      </button>
                    )}
                    <div style={{ opacity: 0.75, marginTop: 2 }}>
                      {mode === 'fatten'
                        ? `Mỗi con ăn ${def.feedKgPerDay} kg cám/ngày, đủ ${def.fattenDays} ngày xuất chuồng ra ~${def.meatPerHead} ${productById(def.productId).name} — nhập ${feedName} ở Nhập hàng cho rẻ.`
                        : `Mỗi con ăn ${def.feedKgPerDay} kg cám/ngày — nhập ${feedName} ở Nhập hàng cho rẻ, kho hết thì mua lẻ bị tính đắt thêm 50%.`}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          <Callout tone="info" title={`🧹 Dọn trại · 🪵 ${garden.wood} gỗ · 🪨 ${garden.stone} đá`} actions={
            <button style={{ ...styles.btn, background: garden.debris > 0 ? '#f1c40f' : '#555', color: garden.debris > 0 ? '#222' : '#fff' }} onClick={cleanupFarm}
              title="Cỏ dại cành rụng mọc lại sau mỗi đêm (bão rơi nhiều) — dọn lấy gỗ đá nâng sao công trình">
              {garden.debris > 0 ? `Dọn ${garden.debris} đống rác` : 'Trại đang sạch'}
            </button>
          }>
            <div style={{ fontSize: 12, opacity: 0.75, marginTop: 4 }}>
              Gỗ đá chỉ để nâng sao công trình — sáng mai cỏ lại mọc, dọn đều tay là có lũ.
            </div>
          </Callout>

          {FARM_BUILDING_ORDER.map((id) => {
            const def = FARM_BUILDINGS[id];
            const star = garden.buildings[id] ?? 0;
            const upCost = star > 0 && star < FARM_BUILDING_MAX_STAR ? def.upgrades[star - 1] : null;
            const canUp = !!upCost && money >= upCost.money && garden.wood >= upCost.wood && garden.stone >= upCost.stone;
            return (
              <div key={id} style={{ ...styles.card, display: 'block' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                  <b>{def.icon} {def.name} {star > 0 ? `${'★'.repeat(star)}${'☆'.repeat(FARM_BUILDING_MAX_STAR - star)}` : ''}</b>
                  <span style={{ display: 'flex', gap: 4 }}>
                    {star === 0 && (
                      <button style={{ ...styles.btn, background: level >= def.unlock && money >= def.cost ? '#f1c40f' : '#555', color: level >= def.unlock && money >= def.cost ? '#222' : '#fff' }} onClick={() => buyFarmBuilding(id)}
                        title={level < def.unlock ? `Mở ở cấp ${def.unlock}` : def.note}>
                        Xây ({formatMoney(def.cost)}){level < def.unlock ? ` — cấp ${def.unlock}` : ''}
                      </button>
                    )}
                    {upCost && (
                      <button style={{ ...styles.btn, background: canUp ? '#f1c40f' : '#555', color: canUp ? '#222' : '#fff' }} onClick={() => upgradeFarmBuilding(id)}
                        title={`Cần ${upCost.wood} gỗ + ${upCost.stone} đá + ${formatMoney(upCost.money)}`}>
                        ⬆️ Lên sao {star + 1} ({formatMoney(upCost.money)} + 🪵{upCost.wood} 🪨{upCost.stone})
                      </button>
                    )}
                    {star >= FARM_BUILDING_MAX_STAR && <span style={{ opacity: 0.7 }}>✔️ Tối sao</span>}
                  </span>
                </div>
                <div style={{ fontSize: 12, opacity: 0.75, marginTop: 4 }}>
                  {star > 0 ? `${def.note} — đang có ${star} sao.` : `${def.note}.`}
                </div>
              </div>
            );
          })}

          <div style={{ ...styles.card, display: 'block' }}>
            <b>🏷️ Hàng nhà trồng đang có trong kho</b>
            <div style={{ fontSize: 12, marginTop: 4 }}>
              {homegrown.length
                ? homegrown.map(([id, q]) => `${productById(id).name} ×${q}`).join(', ')
                : 'Chưa có — thu hoạch, lấy trứng hay vắt sữa sẽ có.'}
            </div>
          </div>
        </div>
      )}
      <Footer onClose={closePanel} />
    </>
  );
}
