import { useGame } from '../../core/store';
import { useState } from 'react';
import { productById, formatMoney, fmtMul } from '../../data/products';
import { shortLabel } from '../shortLabel';
import {
  ANIMALS, ANIMAL_ORDER, animalMode, CROPS, EGG_PER_TRAY, FARM_BUILDING_MAX_STAR, FARM_BUILDINGS, FARM_BUILDING_ORDER, FARM_ORDER_UNLOCK,
  FERTILIZER_PRODUCT, GARDEN_UNLOCK, cropById, inSeason, LAND_TIERS, monthOf, penCap, fattenReady, plotLabel, plotReady,
  type FarmBuildingId, type GardenState,
} from '../../data/garden';
import { animalBuyPayback, animalPerDay, bestAnimal, bestCrop, cropPerDay, farmBuildingValue, farmExpandPayback } from '../../data/farmValue';
import { farmVsCook } from '../../data/farmKitchenValue';
import { bestCropForMenu, bestAnimalForMenu, farmVsDrinks, homegrownImpact, orderSellNote } from '../../data/farmQuanValue';
import { isWeekend } from '../../data/calendar';
import { expiringSoon, expiryNoteFor, newUnlockMark } from '../../data/advice';
import { isXoiCungDay } from '../../data/tiemXoi';
import { preserveDefsOf, preserveDefById, phoiReady, rackCap, vaiCap, chumCap, VAI_UNLOCK, CHUM_UNLOCK, pickleState, pickleAge, uRipe, uAged, PHOI_UNLOCK } from '../../data/preserve';
import { describeDay, type Weather } from '../../data/weather';
import { Callout, Footer, styles, Tabs } from './shared';

/** Trang trại đầu ngõ: trồng theo mùa vụ, nuôi 7 loài, công trình + dọn trại lấy gỗ đá nâng sao, đơn quán xóm. */
export function GardenPanel() {
  const [tab, setTab] = useState<'farm' | 'phoi'>('farm');
  const { garden, level, money, day, weather, weatherSeed, forecast, storage, storageLots, furniture, biz, plantCrop, waterGarden, waterPlot, fertilizePlot, harvestPlot, buyAnimal, feedPen, collectPen, sellFattened, expandFarm, deliverFarmOrder, buyFarmBuilding, upgradeFarmBuilding, cleanupFarm, startPreserve, collectPreserve, setRackCovered, buyRackTarp, closePanel } = useGame();
  const homegrown = Object.entries(garden.homegrown).filter(([, q]) => q > 0);
  const quanMenu = biz.quanNuoc?.open ? (biz.quanNuoc.menu ?? []) : []; // GĐ1141: quán đóng → mảng rỗng (không gợi pha), không phải undefined (xét tất cả)
  const stationOpen = (st: import('../../data/recipes').CookingStation) => furniture.some((f2) => f2.type === st); // GĐ1140
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
      <Tabs tabs={[['farm', '🚜 Trang trại'], ['phoi', '🏺 Phơi · Muối · Ủ']]} value={tab} onChange={setTab} />
      {tab === 'phoi' && (
        <PhoiTab level={level} money={money} day={day} weather={weather} weatherSeed={weatherSeed} tomorrow={forecast[0] ?? weather}
          garden={garden} storage={storage} buyFarmBuilding={buyFarmBuilding} upgradeFarmBuilding={upgradeFarmBuilding}
          startPreserve={startPreserve} collectPreserve={collectPreserve} setRackCovered={setRackCovered} buyRackTarp={buyRackTarp} />
      )}
      {tab === 'farm' && (level < GARDEN_UNLOCK ? (
        <p style={styles.sub}>🔒 Trang trại mở ở cấp {GARDEN_UNLOCK}: dọn lại mảnh đất ven đường đã.</p>
      ) : (
        <div style={{ display: 'grid', gap: 6, maxWidth: 560 }}>
          {(() => {
            // GĐ1104 — "Hôm nay đáng" nay nhìn thấy giá trị pha: cây nằm trong thực đơn quán được
            // định giá theo món pha hời hơn bán lẻ (menu chưa mở/món chưa mở → y hệt bestCrop cũ).
            const bc = bestCropForMenu(level, day, quanMenu); // GĐ1141: luôn qua ForMenu (menu rỗng → y hệt bestCrop)
            const ba = bestAnimalForMenu(garden, level, quanMenu);
            if (!bc && !ba) return null;
            return (
              <Callout tone="warn" title="💡 Hôm nay đáng: ">
                <div style={{ fontSize: 12, marginTop: 4 }}>
                  {bc && <span>Trồng <b>{bc.crop.icon} {bc.crop.name}</b> ~{formatMoney(Math.round(bc.perDay))}/luống/ngày{bc.inSeasonNow && bc.crop.season ? ' (đúng mùa ×1,5)' : ''}{'drinkName' in bc && bc.drinkName ? ` · pha ${bc.drinkName} lời hơn bán lẻ` : ''}{ba ? ' · ' : ''}</span>}
                  {ba && <span>Nuôi <b>{ba.def.icon} {ba.def.name}</b> ~{formatMoney(Math.round(ba.perDay))}/con/ngày{ba.perDay < 0 ? ' (lỗ cám!)' : ''}{'drinkName' in ba && ba.drinkName ? ` · pha ${ba.drinkName} lời hơn bán lẻ` : ''}</span>}
                </div>
              </Callout>
            );
          })()}

          {(() => {
            // GĐ147 — Nấu hay bán lẻ: với từng nông sản nhà trồng/nuôi đang có trong kho,
            // so bán lẻ (nhãn nhà trồng ×1,2) với nấu thành món (lãi món tính cơ hội phí thật).
            const expiringMap = new Map(expiringSoon(storage, storageLots, furniture.flatMap((f2) => f2.tiers)).map((l) => [l.id, l.life]));
            const lines = homegrown
              .map(([id, qty]) => {
                // GĐ1093 — xét cả BẾP (nấu) lẫn QUÁN NƯỚC (pha): chọn nơi nông sản bõ nhất.
                const f = farmVsCook(id, 0, { level, stationOpen }); // GĐ1140: chỉ nấu món đã mở cấp + trạm đã xây
                const q = farmVsDrinks(id, 0, quanMenu); // GĐ1139: chỉ tư vấn pha món ĐANG trên thực đơn
                const cookNet = f.best?.homegrownNet ?? -Infinity;
                const brewNet = q.best?.homegrownNet ?? -Infinity;
                // GĐ1111 — đơn quán xóm đang mua nông sản này (trả ×bonus) → nhắc trước khi nấu/pha cả lot
                const note = orderSellNote(id, order, qty);
                // GĐ1117 — hàng sắp hết hạn: nấu/pha/giao ngay trước khi hỏng
                const exp = expiringMap.get(id);
                const expiryNote = expiryNoteFor(exp);
                if (!f.best && !q.best) return { id, qty, key: id, impact: -Infinity, text: `${productById(id).name}: bán lẻ ~${formatMoney(f.sellPerUnit)}/món${note}${expiryNote}` };
                if (brewNet > cookNet) {
                  const d = q.best!;
                  return {
                    id, qty, key: id,
                    text: `pha <b>${d.recipe.name}</b> (~${d.glasses} ly/1) lời ~${formatMoney(d.homegrownNet)}/1 (+${formatMoney(d.homegrownNet)} so bán lẻ ${formatMoney(q.sellPerUnit)})${note}${expiryNote}`,
                    thin: d.homegrownNet < q.sellPerUnit,
                  };
                }
                const d = f.best!;
                return {
                  id, qty, key: id,
                  text: `nấu <b>${d.recipe.name}</b> lời ~${formatMoney(d.homegrownNet)} (+${formatMoney(d.deltaVsSell)} so bán lẻ ${formatMoney(d.sellLot)})${note}${expiryNote}`,
                  thin: d.homegrownNet < d.sellLot, // nấu lời còn kém cả bán lẻ cả lot — bán lẻ thật sự đáng cân nhắc
                  impact: homegrownImpact(id, quanMenu, { level, stationOpen }), // GĐ1109/1139/1140
                };
              })
              .sort((a, b) => (b.impact ?? -Infinity) - (a.impact ?? -Infinity))
              .slice(0, 5);
            if (!lines.length) return null;
            return (
              <Callout tone="event" title="🧑‍🍳 Nấu/pha hay bán lẻ: ">
                <div style={{ fontSize: 12, marginTop: 4 }}>
                  {lines.map((l) => (
                    <div key={l.key} style={{ marginBottom: 2, color: l.thin ? '#e67e22' : undefined }}>
                      <span dangerouslySetInnerHTML={{ __html: l.text }} />
                    </div>
                  ))}
                  <div style={{ opacity: 0.75, marginTop: 3 }}>Lãi món tính theo giá bán lẻ nhà trồng (×1,2) của nông sản — bếp/quán luôn cộng thêm giá trị cho nông sản, chỉ món nào lời <i>mỏng</i> (màu cam) thì bán lẻ cũng đáng cân nhắc khi trạm bận.</div>
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
                }).join(' · ')} — giá hời ×{fmtMul(order.bonus)}{order.bonus > 1.25 ? (isXoiCungDay(order.dueDay) && !isWeekend(order.dueDay) ? ' (quán cần đồ cúng)' : ' (quán đông cuối tuần)') : ''} cho nông sản nhà trồng, hạn ngày {order.dueDay} (còn {Math.max(0, order.dueDay - day)} ngày)
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
            {(() => {
              const fb = farmExpandPayback(garden, level, day);
              if (!fb || fb.verdict === 'nodata') return null;
              return (
                <div style={{ fontSize: 12, marginTop: 4, opacity: 0.85 }}>
                  💸 Ước hồi vốn {formatMoney(fb.cost)}: mỗi luống mới thêm ~{formatMoney(fb.perPlotPerDay)}/ngày (trồng giống đáng nhất) → ≈{fb.paybackDays} ngày {fb.verdict === 'worth' ? '(đáng)' : '(chậm)'}
                </div>
              );
            })()}
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
                          {c.icon} {c.name}{newUnlockMark(c.unlock, level)} ({money >= c.seedCost ? formatMoney(c.seedCost) : shortLabel('', c.seedCost, money)}){onSeason && c.season ? ' 🌤️' : ''}
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
                  <b>{def.icon} {def.name}</b>{!locked && newUnlockMark(def.unlock, level)}
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
                    {(() => {
                      const bp = animalBuyPayback(kind, garden);
                      const tone = bp.verdict === 'worth' ? '#2ecc71' : bp.verdict === 'loss' ? '#e74c3c' : '#e67e22';
                      return <div style={{ marginTop: 4, color: tone }}>💡 {bp.line}.</div>;
                    })()}
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
            const fbVal = farmBuildingValue(garden).find(v => v.id === id);
            return (
              <div key={id} style={{ ...styles.card, display: 'block' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                  <b>{def.icon} {def.name}{def.unlock === level && star === 0 ? newUnlockMark(def.unlock, level) : ''} {star > 0 ? `${'★'.repeat(star)}${'☆'.repeat(FARM_BUILDING_MAX_STAR - star)}` : ''}</b>
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
                {fbVal && (
                  <div style={{ fontSize: 12, marginTop: 4, color: fbVal.hasMoney ? '#2ecc71' : '#e67e22' }}>
                    💡 {fbVal.line}
                  </div>
                )}
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
      ))}
      <Footer onClose={closePanel} />
    </>
  );
}

/** Hệ 1 (§1.10) — tab "🏺 Phơi · Muối · Ủ" trong Sân phơi: dự báo 2 ngày kèm giờ mưa, giàn, các nong đang phơi, mẻ mới. */
function PhoiTab(props: {
  level: number; money: number; day: number; weather: Weather; weatherSeed: number; tomorrow: Weather;
  garden: GardenState; storage: Record<string, number>;
  buyFarmBuilding: (id: FarmBuildingId) => void; upgradeFarmBuilding: (id: FarmBuildingId) => void;
  startPreserve: (defId: string) => void; collectPreserve: (jobId: number) => void;
  setRackCovered: (on: boolean) => void; buyRackTarp: () => void;
}) {
  const { level, money, day, weather, weatherSeed, tomorrow, garden, storage, buyFarmBuilding, upgradeFarmBuilding, startPreserve, collectPreserve, setRackCovered, buyRackTarp } = props;
  const star = garden.buildings.gian_phoi ?? 0;
  const rackCovered = garden.rackLog.day === day && !!garden.rackLog.out && garden.rackLog.out.length === 0;
  const phoiDefs = preserveDefsOf('phoi').filter((d) => d.unlock <= level);
  const phoiJobs = garden.preserveJobs.filter((j) => preserveDefById(j.defId).kind === 'phoi');
  const gd = FARM_BUILDINGS.gian_phoi;
  // Lát L5 — Dãy vại muối
  const vaiStar = garden.buildings.vai_muoi ?? 0;
  const muoiDefs = preserveDefsOf('muoi').filter((d) => d.unlock <= level);
  const muoiJobs = garden.preserveJobs.filter((j) => preserveDefById(j.defId).kind === 'muoi');
  const vd = FARM_BUILDINGS.vai_muoi;
  // Lát L6 — Nhà chum ủ
  const chumStar = garden.buildings.chum_u ?? 0;
  const uDefs = preserveDefsOf('u').filter((d) => d.unlock <= level);
  const uJobs = garden.preserveJobs.filter((j) => preserveDefById(j.defId).kind === 'u');
  const cd = FARM_BUILDINGS.chum_u;
  return (
    <div style={{ display: 'grid', gap: 6, maxWidth: 560 }}>
      {level < PHOI_UNLOCK ? (
        <div style={styles.card}>🔒 Hệ Phơi · Muối · Ủ mở ở cấp {PHOI_UNLOCK}: tráng bánh tráng, phơi tôm khô, mực một nắng… trước nhất cần Sân phơi trong <b>Công trình</b> (tab Trang trại → dọn trại lấy gỗ đá để xây/nâng).</div>
      ) : (
        <>
          <Callout tone="info" title="🌤️ Dự báo 2 ngày — giàn phơi">
            <div style={{ fontSize: 12, marginTop: 4 }}>
              Hôm nay: <b>{describeDay(weatherSeed, day, weather)}</b> · Mai: <b>{describeDay(weatherSeed, day + 1, tomorrow)}</b>. Cất giàn trước cơn mưa / giông bão là mẻ an toàn.
            </div>
          </Callout>

          <div style={{ ...styles.card, display: 'block' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
              <b>{gd.icon} {gd.name} {star > 0 ? `${'★'.repeat(star)}${'☆'.repeat(FARM_BUILDING_MAX_STAR - star)}` : ''}</b>
              <span style={{ display: 'flex', gap: 4 }}>
                {star === 0 ? (
                  <button style={{ ...styles.btn, background: money >= gd.cost ? '#f1c40f' : '#555', color: money >= gd.cost ? '#222' : '#fff' }} onClick={() => buyFarmBuilding('gian_phoi')}>
                    Xây Sân phơi ({formatMoney(gd.cost)})
                  </button>
                ) : (
                  <>
                    <button style={{ ...styles.btn, background: rackCovered ? '#3498db' : '#e67e22', color: '#fff' }} onClick={() => setRackCovered(!rackCovered)}>
                      {rackCovered ? '☀️ Mang giàn ra phơi' : '🌙 Cất giàn'}
                    </button>
                    {!garden.rackTarp && money >= 2_500_000 && (
                      <button style={{ ...styles.btn, background: '#8e44ad', color: '#fff' }} onClick={buyRackTarp} title="Mưa to để ngoài cũng không ướt, vẫn nhận 0,4 nắng">
                        🪂 Bạt kéo ({formatMoney(2_500_000)})
                      </button>
                    )}
                  </>
                )}
              </span>
            </div>
            <div style={{ fontSize: 12, opacity: 0.75, marginTop: 4 }}>
              {star === 0 ? `${gd.note}. Mở ở cấp ${PHOI_UNLOCK}.` : `${star} sao: sân có ${rackCap(star)} nong${garden.rackTarp ? ' · đã có bạt kéo' : ''}. Gỗ/đá nâng sao ở Dọn trại.`}
            </div>
            {star > 0 && star < FARM_BUILDING_MAX_STAR && (
              <button style={{ ...styles.btn, background: '#f1c40f', color: '#222', marginTop: 6 }} onClick={() => upgradeFarmBuilding('gian_phoi')}
                title={`Cần gỗ + đá + tiền, thêm 2 nong`}>
                ⬆️ Lên sao {star + 1} ({formatMoney(gd.upgrades[star - 1].money)} + 🪵{gd.upgrades[star - 1].wood} 🪨{gd.upgrades[star - 1].stone})
              </button>
            )}
          </div>

          {phoiJobs.length === 0 ? (
            <div style={{ ...styles.card, fontSize: 12, opacity: 0.75 }}>Giàn đang trống — chọn một mẻ dưới đây để bắt đầu phơi.</div>
          ) : (
            phoiJobs.map((j) => {
              const def = preserveDefById(j.defId);
              const ready = phoiReady(j, def);
              const out = productById(def.outputId);
              const pct = Math.min(100, Math.round((j.sun / def.need) * 100));
              return (
                <div key={j.id} style={{ ...styles.card, display: 'block' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                    <b>{out.name}</b>
                    <button style={{ ...styles.btn, background: ready ? '#2ecc71' : '#555', color: '#fff' }} onClick={() => collectPreserve(j.id)}>
                      {ready ? `🧺 Gỡ xuống (${def.outputQty})` : `⏳ ${j.sun.toFixed(1)}/${def.need} nắng`}
                    </button>
                  </div>
                  <div style={{ height: 6, background: '#333', borderRadius: 3, marginTop: 6, overflow: 'hidden' }}>
                    <div style={{ height: 6, width: `${pct}%`, background: ready ? '#2ecc71' : '#f1c40f' }} />
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.75, marginTop: 4 }}>
                    Bắt đầu ngày {j.startDay} · {j.wet > 0 ? `dính mưa ${j.wet} lần` : 'chưa dính mưa'}{j.allHomegrown ? ' · toàn nhà trồng (giá hơn)' : ''} · {def.note}
                  </div>
                </div>
              );
            })
          )}

          <div style={{ ...styles.card, display: 'block' }}>
            <b>☀️ Bắt đầu một mẻ phơi</b>
            <div style={{ fontSize: 12, marginTop: 4, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {phoiDefs.map((d) => {
                const out = productById(d.outputId);
                const lack = d.inputs.find((i) => (storage[i.productId] ?? 0) < i.quantity);
                const can = star > 0 && !lack && phoiJobs.length < rackCap(star);
                const label = `${out.name}${d.inputs.map((i) => ` (${productById(i.productId).name} ${i.quantity})`).join('')}`;
                return (
                  <button key={d.id} style={{ ...styles.btn, background: can ? '#2ecc71' : '#555', color: '#fff' }} onClick={() => startPreserve(d.id)}
                    title={lack ? `Thiếu ${productById(lack.productId).name} — nhập trước rồi phơi` : `${out.name}: ${d.note}`}>
                    {label}
                  </button>
                );
              })}
            </div>
            <div style={{ fontSize: 12, opacity: 0.75, marginTop: 4 }}>
              {phoiDefs.length === 0 ? `Chưa có mẻ phơi nào ở cấp này${star ? '' : ' — còn cần xây Sân phơi trước'}.` : 'Mẹo: bánh tráng phơi sương mù cũng đủ nắng (fogBonus); mực một nắng chỉ ăn ngày nắng đẹp.'}
            </div>
          </div>

          <div style={{ display: 'block', marginTop: 6 }}>
            {level < VAI_UNLOCK ? (
              <div style={styles.card}>🔒 Dãy vại muối mở ở cấp {VAI_UNLOCK}: ngâm dưa muối, cà pháo, chanh muối, củ kiệu… vớt đúng cửa sổ thì ngon, để trễ thì khú/hỏng.</div>
            ) : (
              <div style={{ ...styles.card, display: 'block' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                  <b>{vd.icon} {vd.name} {vaiStar > 0 ? `${'★'.repeat(vaiStar)}${'☆'.repeat(FARM_BUILDING_MAX_STAR - vaiStar)}` : ''}</b>
                  {vaiStar === 0 ? (
                    <button style={{ ...styles.btn, background: money >= vd.cost ? '#f1c40f' : '#555', color: money >= vd.cost ? '#222' : '#fff' }} onClick={() => buyFarmBuilding('vai_muoi')}>
                      Xây Dãy vại ({formatMoney(vd.cost)})
                    </button>
                  ) : (
                    <span style={{ fontSize: 12, opacity: 0.75 }}>{vaiCap(vaiStar)} vại</span>
                  )}
                </div>
                {vaiStar > 0 && vaiStar < FARM_BUILDING_MAX_STAR && (
                  <button style={{ ...styles.btn, background: '#f1c40f', color: '#222', marginTop: 6 }} onClick={() => upgradeFarmBuilding('vai_muoi')}
                    title={`Cần gỗ + đá + tiền, thêm 2 vại`}>
                    ⬆️ Lên sao {vaiStar + 1} ({formatMoney(vd.upgrades[vaiStar - 1].money)} + 🪵{vd.upgrades[vaiStar - 1].wood} 🪨{vd.upgrades[vaiStar - 1].stone})
                  </button>
                )}
                {muoiJobs.length === 0 ? (
                  <div style={{ fontSize: 12, opacity: 0.75, marginTop: 6 }}>{vaiStar === 0 ? 'Xây Dãy vại để ngâm món muối chua.' : 'Vại trống — chọn một mẻ dưới đây.'}</div>
                ) : (
                  muoiJobs.map((j) => {
                    const d = preserveDefById(j.defId);
                    const out = productById(d.outputId);
                    const st = pickleState(j, d, day);
                    const age = pickleAge(j, day);
                    const win = st === 'ngon' ? '🟢 NGON' : st === 'haran' ? '⏳ còn hăng' : st === 'dat' ? '🟡 đạt' : st === 'kem' ? '🟠 khú' : '🔴 hỏng';
                    const can = st === 'ngon' || st === 'dat' || st === 'kem';
                    return (
                      <div key={j.id} style={{ ...styles.card, display: 'block', marginTop: 6 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                          <b>{out.name}</b>
                          <button style={{ ...styles.btn, background: can ? '#2ecc71' : '#555', color: '#fff' }} onClick={() => collectPreserve(j.id)} disabled={st === 'haran'}>
                            {st === 'haran' ? `⏳ ngày ${age.toFixed(1)}/${d.window![0]} còn hăng` : st === 'hong' ? `🗑️ Hỏng — đổ bỏ` : `🫙 Vớt (${age.toFixed(1)})`}
                          </button>
                        </div>
                        <div style={{ fontSize: 12, opacity: 0.75, marginTop: 4 }}>
                          Bắt đầu ngày {j.startDay} · cửa sổ vớt ngon {d.window![0]}–{d.window![0] + 1} · {win}{j.allHomegrown ? ' · toàn nhà trồng' : ''}
                          {st === 'ngon' ? ' · GIÁ HƠN +20%' : ''}
                        </div>
                      </div>
                    );
                  })
                )}
                <div style={{ fontSize: 12, marginTop: 4, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {muoiDefs.map((d) => {
                    const out = productById(d.outputId);
                    const lack = d.inputs.find((i) => (storage[i.productId] ?? 0) < i.quantity);
                    const can = vaiStar > 0 && !lack && muoiJobs.length < vaiCap(vaiStar);
                    const label = `${out.name}${d.inputs.map((i) => ` (${productById(i.productId).name} ${i.quantity})`).join('')}`;
                    return (
                      <button key={d.id} style={{ ...styles.btn, background: can ? '#2ecc71' : '#555', color: '#fff' }} onClick={() => startPreserve(d.id)}
                        title={lack ? `Thiếu ${productById(lack.productId).name} — nhập trước rồi muối` : `${out.name}: vớt ngon ngày ${d.window![0]}–${d.window![0] + 1}. ${d.note}`}>
                        {label}
                      </button>
                    );
                  })}
                </div>
                <div style={{ fontSize: 12, opacity: 0.75, marginTop: 4 }}>
                  Mỗi món có cửa sổ vớt riêng (nút hiện "còn hăng / vớt ngon"): vớt đúng đầu cửa sổ thì NGON (toàn lô bán +20%), vớt trễ thì khú (×0,6) rồi hỏng. Nắng nóng làm chua nhanh, mưa không hại vại.
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'block', marginTop: 6 }}>
            {level < CHUM_UNLOCK ? (
              <div style={styles.card}>🔒 Nhà chum ủ mở ở cấp {CHUM_UNLOCK}: ủ mắm tép, tương bần, nước mắm, tỏi đen, tôm chua Huế, tương hột. Chum không hỏng theo thời gian — giữ lâu tới mốc ủ thì ra NHIỀU hơn.</div>
            ) : (
              <div style={{ ...styles.card, display: 'block' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                  <b>{cd.icon} {cd.name} {chumStar > 0 ? `${'★'.repeat(chumStar)}${'☆'.repeat(FARM_BUILDING_MAX_STAR - chumStar)}` : ''}</b>
                  {chumStar === 0 ? (
                    <button style={{ ...styles.btn, background: money >= cd.cost ? '#f1c40f' : '#555', color: money >= cd.cost ? '#222' : '#fff' }} onClick={() => buyFarmBuilding('chum_u')}>
                      Xây Nhà chum ({formatMoney(cd.cost)})
                    </button>
                  ) : (
                    <span style={{ fontSize: 12, opacity: 0.75 }}>{chumCap(chumStar)} chum</span>
                  )}
                </div>
                {chumStar > 0 && chumStar < FARM_BUILDING_MAX_STAR && (
                  <button style={{ ...styles.btn, background: '#f1c40f', color: '#222', marginTop: 6 }} onClick={() => upgradeFarmBuilding('chum_u')}
                    title={`Cần gỗ + đá + tiền, thêm 1 chum`}>
                    ⬆️ Lên sao {chumStar + 1} ({formatMoney(cd.upgrades[chumStar - 1].money)} + 🪵{cd.upgrades[chumStar - 1].wood} 🪨{cd.upgrades[chumStar - 1].stone})
                  </button>
                )}
                {uJobs.length === 0 ? (
                  <div style={{ fontSize: 12, opacity: 0.75, marginTop: 6 }}>{chumStar === 0 ? 'Xây Nhà chum để bắt đầu ủ.' : 'Chum trống — chọn một mẻ dưới đây.'}</div>
                ) : (
                  uJobs.map((j) => {
                    const d = preserveDefById(j.defId);
                    const out = productById(d.outputId);
                    const age = pickleAge(j, day);
                    const ripe = uRipe(j, d, day);
                    const aged = uAged(j, d, day);
                    const label = aged ? `🫛 Rút ${d.aged!.outputQty}` : ripe ? `🫛 Rút ${d.outputQty}` : `⏳ ${age.toFixed(0)}/${d.need} ngày`;
                    return (
                      <div key={j.id} style={{ ...styles.card, display: 'block', marginTop: 6 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                          <b>{out.name}</b>
                          <button style={{ ...styles.btn, background: ripe ? '#2ecc71' : '#555', color: '#fff' }} onClick={() => collectPreserve(j.id)} disabled={!ripe}>
                            {label}
                          </button>
                        </div>
                        <div style={{ fontSize: 12, opacity: 0.75, marginTop: 4 }}>
                          Bắt đầu ngày {j.startDay} · rút ngon từ ngày {d.need}{d.aged ? ` · ủ LÂU tới ${d.aged.day} ngày ra ${d.aged.outputQty} (nhãn nhà làm)` : ''}{j.allHomegrown ? ' · toàn nhà trồng' : ''}{aged ? ' · GIÁ HƠN +20%' : ''}
                        </div>
                      </div>
                    );
                  })
                )}
                <div style={{ fontSize: 12, marginTop: 4, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {uDefs.map((d) => {
                    const out = productById(d.outputId);
                    const lack = d.inputs.find((i) => (storage[i.productId] ?? 0) < i.quantity);
                    const can = chumStar > 0 && !lack && uJobs.length < chumCap(chumStar);
                    const label = `${out.name}${d.inputs.map((i) => ` (${productById(i.productId).name} ${i.quantity})`).join('')}`;
                    return (
                      <button key={d.id} style={{ ...styles.btn, background: can ? '#2ecc71' : '#555', color: '#fff' }} onClick={() => startPreserve(d.id)}
                        title={lack ? `Thiếu ${productById(lack.productId).name} — nhập trước rồi ủ` : `${out.name}: ${d.need} ngày rút; ${d.aged ? `ủ ${d.aged.day} ngày ra ${d.aged.outputQty}. ` : ''}${d.note}`}>
                        {label}
                      </button>
                    );
                  })}
                </div>
                <div style={{ fontSize: 12, opacity: 0.75, marginTop: 4 }}>
                  Chum không hỏng theo thời gian; đủ ngày là rút được hàng thường, GIỮ thêm tới mốc ủ lâu (nếu món có) thì ra nhiều hơn và cả lô bán +20%.
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
