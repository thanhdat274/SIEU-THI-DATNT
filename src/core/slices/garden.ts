import { formatMoney, productById } from '../../data/products';
import {
  ANIMALS, emptyPlot, EGG_PER_TRAY, FARM_BUILDING_MAX_STAR, FARM_BUILDINGS, FARM_ORDER_UNLOCK, FERTILIZER_BOOST, FERTILIZER_PRODUCT,
  GARDEN_UNLOCK, HOMEGROWN_PREMIUM, LAND_TIERS, animalMode, farmCritChance, farmGrazeDiscount, fattenReady, harvestYield, inSeason, penCap, plotReady,
  type AnimalKind, type FarmBuildingId, type GardenState, type Plot,
} from '../../data/garden';
import { CROPS, cropById, type CropDef } from '../../data/garden';
import type { GameState, SetState, GetState } from '../gameTypes';
import { copyStock, putStock, takeStock } from '../stock';

/** Trang trại đầu ngõ: trồng, tưới, bón phân, thu hoạch, nuôi vật nuôi, công trình, dọn trại, đơn quán xóm. */

/** Tìm giống theo id, undefined nếu id lạ (an toàn với bản lưu cũ). */
const cropDef = (id: string): CropDef | undefined => CROPS.find((c) => c.id === id) ?? (cropById(id) ?? undefined);

export const createGardenSlice = (set: SetState, get: GetState): Pick<GameState,
  'plantCrop' | 'waterGarden' | 'fertilizePlot' | 'harvestPlot' | 'buyAnimal' | 'feedPen' | 'collectPen' | 'sellFattened' | 'expandFarm' | 'deliverFarmOrder' | 'buyFarmBuilding' | 'upgradeFarmBuilding' | 'cleanupFarm'
> => ({
  plantCrop: (plotIndex, cropId) => {
    const s = get();
    if (s.level < GARDEN_UNLOCK) return s.notify(`Trang trại mở ở cấp ${GARDEN_UNLOCK} — mua được đất là làm ăn được`);
    const def = cropDef(cropId);
    if (!def || s.level < def.unlock) return;
    const plot = s.garden.plots[plotIndex];
    if (!plot || plot.crop) return s.notify('Luống này đang có cây rồi');
    if (s.money < def.seedCost) return s.notify(`Không đủ tiền mua giống ${def.name} (${formatMoney(def.seedCost)})`);
    const plots: Plot[] = s.garden.plots.map((p, i) => (i === plotIndex ? { crop: cropId, growth: 0, wateredDay: s.day } : p));
    set({
      garden: { ...s.garden, plots },
      money: s.money - def.seedCost,
      stats: { ...s.stats, spent: s.stats.spent + def.seedCost },
    });
    const extra = def.regrowDays ? `, trồng một lần mãi mãi mỗi ${def.regrowDays} ngày cho trái` : '';
    s.notify(`${def.icon} Đã trồng ${def.name} (${formatMoney(def.seedCost)}): ~${def.days} ngày nữa thu được, nhớ tưới mỗi sáng${extra}`);
  },
  waterGarden: () => {
    const s = get();
    if (s.weather === 'rain' || s.weather === 'storm') return s.notify('🌧️ Trời đang mưa, cây đã đủ nước');
    if (s.garden.buildings.tuoi_tu_dong) return s.notify('💧 Hệ tưới nhỏ giọt tự lo rồi, khỏi tưới tay');
    const todo = s.garden.plots.filter((p) => p.crop && p.wateredDay !== s.day).length;
    if (!todo) return s.notify('Đã tưới hết rồi');
    set({ garden: { ...s.garden, plots: s.garden.plots.map((p) => (p.crop ? { ...p, wateredDay: s.day } : p)) } });
    s.notify(`💧 Đã tưới ${todo} luống: tưới đủ mỗi ngày cây lớn nhanh gấp rưỡi, mưa thì khỏi tưới`);
  },
  fertilizePlot: (plotIndex) => {
    const s = get();
    const plot = s.garden.plots[plotIndex];
    if (!plot?.crop) return;
    const def = cropDef(plot.crop)!;
    if (plot.fertilizedDay !== undefined && plot.fertilizedDay !== null) {
      return s.notify(def.regrowDays ? 'Cây lâu năm bón một lần lúc trồng là đủ — các vụ sau vẫn ra trái đều' : 'Luống này đã bón phân vụ rồi');
    }
    if (plotReady(plot)) return s.notify('Luống đã chín rồi — thu hoạch đi, bón sau cho vụ mới');
    if ((s.storage[FERTILIZER_PRODUCT] ?? 0) < 1) return s.notify(`Kho hết ${productById(FERTILIZER_PRODUCT).name} — nhập ở Nhập hàng rồi bón`);
    const k = copyStock(s);
    takeStock(k, FERTILIZER_PRODUCT, 1);
    // Rút ngắn 30% THỜI GIAN CÒN LẠI (tối thiểu 1 ngày) — bón càng sớm càng đáng tiền
    const remaining = Math.max(0, def.days - plot.growth);
    const boost = Math.max(1, Math.round(remaining * FERTILIZER_BOOST));
    set({
      ...k,
      garden: { ...s.garden, plots: s.garden.plots.map((p, i) => (i === plotIndex ? { ...p, growth: p.growth + boost, fertilizedDay: s.day } : p)) },
    });
    s.notify(`🌱 Đã bón phân cho ${def.name}: rút bớt ~${boost} ngày chờ đợi của vụ này`);
  },
  harvestPlot: (plotIndex) => {
    const s = get();
    const plot = s.garden.plots[plotIndex];
    if (!plot?.crop) return;
    const def = cropDef(plot.crop)!;
    if (!plotReady(plot)) return s.notify(`${def.name} chưa lớn xong (còn ~${Math.ceil(def.days - plot.growth)} ngày)`);
    // Mùa vụ tính theo ngày cây CHÍN (không cho để chín chờ đúng vụ); bù nhìn may thì thu gấp đôi
    let qty = harvestYield(def, s.day, plot.ripeDay);
    const doubled = Math.random() < farmCritChance(s.garden);
    if (doubled) qty *= 2;
    const k = copyStock(s);
    putStock(k, def.productId, qty);
    const homegrown = { ...s.garden.homegrown };
    homegrown[def.productId] = (homegrown[def.productId] ?? 0) + qty;
    set({
      ...k,
      garden: {
        ...s.garden,
        plots: s.garden.plots.map((p, i) => (i === plotIndex
          ? (def.regrowDays ? { ...p, growth: def.days - def.regrowDays, ripeDay: undefined } : emptyPlot())
          : p)),
        homegrown,
      },
    });
    const note = def.regrowDays ? ` — cây lâu năm, ${def.regrowDays} ngày nữa ra trái tiếp` : '';
    s.notify(`🧺 Thu hoạch ${qty} ${productById(def.productId).name} nhà trồng${doubled ? ' — bù nhìn trúng: thu gấp đôi!' : inSeason(def, s.day) && def.season ? ' (đúng mùa vụ, trái sai)' : ''}: bán được giá hơn ${Math.round(HOMEGROWN_PREMIUM * 100)}%${note}`);
    s.addXp(5);
  },
  buyAnimal: (kind) => {
    const s = get();
    const def = ANIMALS[kind];
    if (!def) return;
    if (s.level < def.unlock) return s.notify(`${def.name} mở ở cấp ${def.unlock}`);
    if (s.garden.land < def.landTier) return s.notify(`Cần đất bậc ${def.landTier + 1} (${LAND_TIERS[def.landTier].name}) mới nuôi được ${def.name.toLowerCase()}`);
    const cap = penCap(s.garden.land, kind);
    const pen = s.garden.pens[kind] ?? { count: 0, fedDay: 0, feedKg: 0, pending: 0, fattened: 0 };
    if (pen.count >= cap) return s.notify(`Chuồng ${def.name.toLowerCase()} chỉ chứa ${cap} con — mở rộng đất trại để nuôi thêm`);
    if (s.money < def.price) return s.notify(`Không đủ tiền mua ${def.name.toLowerCase()} (${formatMoney(def.price)})`);
    // Mua giữa kỳ vỗ béo: con mới không kịp ăn đủ ngày — lứa chín chỉ nhận lại giá giống, không tính thịt
    const late = def.fattenDays !== undefined && (pen.fattened ?? 0) > 0;
    set({
      garden: {
        ...s.garden,
        pens: { ...s.garden.pens, [kind]: { ...pen, count: pen.count + 1, lateJoins: late ? (pen.lateJoins ?? 0) + 1 : pen.lateJoins ?? 0 } },
      },
      money: s.money - def.price,
      stats: { ...s.stats, spent: s.stats.spent + def.price },
    });
    s.notify(`${def.icon} Mua một con ${def.name.toLowerCase()} (${formatMoney(def.price)}): cho ăn cám mỗi ngày là có sản phẩm${late ? ' — mua giữa kỳ vỗ béo: con này xuất chuồng chỉ nhận lại giá giống' : ''}`);
  },
  feedPen: (kind) => {
    const s = get();
    const pen = s.garden.pens[kind];
    const def = ANIMALS[kind];
    if (!pen?.count) return s.notify('Chưa có con nào mà cho ăn gì');
    if (pen.fedDay === s.day) return s.notify('Hôm nay đàn này ăn rồi');
    // Ăn cám còn trong máng trước, thiếu thì mở bao/túi cám từ kho, kho cũng hết thì mua lẻ đắt hơn 50%.
    // Bãi thả cho vật nuôi tự gặm cỏ: bớt một phần cám mỗi ngày.
    const need = pen.count * def.feedKgPerDay * (1 - farmGrazeDiscount(s.garden));
    let feedKg = pen.feedKg;
    const k = copyStock(s);
    const have = k.storage[def.feedProduct] ?? 0;
    const short = Math.max(0, need - feedKg);
    const bags = Math.min(have, Math.ceil(short / def.feedBagKg - 1e-9));
    const rest = Math.ceil((short - bags * def.feedBagKg) / def.feedBagKg - 1e-9);
    const bagBuy = productById(def.feedProduct).buy;
    const cost = Math.round(rest * bagBuy * 1.5);
    if (rest && s.money < cost) {
      return s.notify(`Máng còn ${feedKg.toFixed(1)} kg, kho hết cám — mua lẻ cần ${formatMoney(cost)} hoặc nhập ${productById(def.feedProduct).name} trước`);
    }
    if (bags) takeStock(k, def.feedProduct, bags);
    feedKg = Math.max(0, feedKg + bags * def.feedBagKg + rest * def.feedBagKg - need);
    set({
      ...k,
      money: s.money - cost,
      stats: { ...s.stats, spent: s.stats.spent + cost },
      garden: { ...get().garden, pens: { ...get().garden.pens, [kind]: { ...pen, fedDay: s.day, feedKg } } },
    });
    s.notify(`${def.icon} Cho ${pen.count} con ${def.name.toLowerCase()} ăn no${cost ? ` (mua lẻ cám ${formatMoney(cost)})` : ''}`);
  },
  collectPen: (kind) => {
    const s = get();
    const pen = s.garden.pens[kind];
    const def = ANIMALS[kind];
    if (!pen?.count) return;
    const mode = animalMode(def);
    if (mode === 'milk') {
      if (!pen.pending) return s.notify('Thùng vắt còn trống');
      const k = copyStock(s);
      putStock(k, def.productId, pen.pending);
      const homegrown = { ...s.garden.homegrown };
      homegrown[def.productId] = (homegrown[def.productId] ?? 0) + pen.pending;
      set({ ...k, garden: { ...s.garden, pens: { ...s.garden.pens, [kind]: { ...pen, pending: 0 } }, homegrown } });
      s.notify(`🥛 Vắt ${pen.pending} lốc ${productById(def.productId).name} nhà nuôi vào kho — khách thích hàng nhà nuôi`);
      s.addXp(4);
      return;
    }
    if (mode !== 'egg') return;
    if (!pen.pending) return s.notify('Chuồng chưa có trứng nào');
    const trays = Math.floor(pen.pending / EGG_PER_TRAY);
    if (!trays) return s.notify(`Mới ${pen.pending} quả, đủ ${EGG_PER_TRAY} quả sẽ gói thành một vỉ`);
    const k = copyStock(s);
    putStock(k, def.productId, trays);
    const homegrown = { ...s.garden.homegrown };
    homegrown[def.productId] = (homegrown[def.productId] ?? 0) + trays;
    set({ ...k, garden: { ...s.garden, pens: { ...s.garden.pens, [kind]: { ...pen, pending: pen.pending - trays * EGG_PER_TRAY } }, homegrown } });
    s.notify(`🥚 Gói ${trays} vỉ ${productById(def.productId).name} nhà nuôi vào kho — khách thích hàng nhà nuôi`);
    s.addXp(4);
  },
  sellFattened: (kind) => {
    const s = get();
    const pen = s.garden.pens[kind];
    const def = ANIMALS[kind];
    if (!pen?.count) return;
    if (!fattenReady(kind, pen)) return s.notify(`${def.name} nuôi ${(pen.fattened ?? 0)}/${def.fattenDays} ngày — chưa đủ ngày xuất chuồng`);
    // Con mua GIỮA kỳ vỗ béo chưa ăn đủ ngày: không ra thịt, nhận lại giá giống (chặn mua trễ ăn theo)
    const late = Math.min(pen.lateJoins ?? 0, pen.count);
    const readyCount = pen.count - late;
    const meat = (def.meatPerHead ?? 0) * readyCount;
    const refund = late * def.price;
    const k = copyStock(s);
    if (meat > 0) putStock(k, def.productId, meat);
    const homegrown = { ...s.garden.homegrown };
    if (meat > 0) homegrown[def.productId] = (homegrown[def.productId] ?? 0) + meat;
    set({
      ...k,
      garden: { ...s.garden, pens: { ...s.garden.pens, [kind]: { count: 0, fedDay: 0, feedKg: pen.feedKg, pending: 0, fattened: 0, lateJoins: 0 } }, homegrown },
      money: s.money + refund,
    });
    s.notify(`${def.icon} Xuất chuồng ${readyCount} ${def.name.toLowerCase()} (${meat} ${productById(def.productId).name} vào kho) — quán xóm sáng mai ghé mua liền${late ? `; ${late} con mua giữa kỳ chỉ nhận lại giá giống ${formatMoney(refund)}` : ''}`);
    s.addXp(10);
  },
  expandFarm: () => {
    const s = get();
    const tier = LAND_TIERS[s.garden.land + 1];
    if (!tier) return s.notify('🚜 Trại đã rộng nhất rồi — trang trại đầu ngõ kìa!');
    if (s.level < tier.unlock) return s.notify(`${tier.name} mở ở cấp ${tier.unlock}`);
    if (s.money < tier.cost) return s.notify(`Không đủ tiền mua đất (${formatMoney(tier.cost)})`);
    const extra = tier.plots - s.garden.plots.length;
    const plots = [...s.garden.plots, ...Array.from({ length: extra }, emptyPlot)];
    const caps = Object.entries(tier.caps).map(([kind, n]) => `${n} ${ANIMALS[kind as AnimalKind].name.toLowerCase()}`).join(', ');
    set({
      garden: { ...s.garden, land: s.garden.land + 1, plots },
      money: s.money - tier.cost,
      stats: { ...s.stats, spent: s.stats.spent + tier.cost },
    });
    s.notify(`🚜 Đã mở rộng "${tier.name}": ${tier.plots} luống, chuồng chứa ${caps}`);
    s.addXp(30);
  },
  deliverFarmOrder: () => {
    const s = get();
    const order = s.garden.farmOrder;
    if (!order) return;
    const k = copyStock(s);
    // Quán đặt NÔNG SẢN NHÀ TRỒNG/NHÀ NUÔI — hàng mua lẻ về kho không tính (chặn đôi lại mua đắt giao rẻ)
    const hg = { ...s.garden.homegrown };
    for (const it of order.items) {
      const have = k.storage[it.productId] ?? 0;
      const home = hg[it.productId] ?? 0;
      if (have < it.qty || home < it.qty) {
        return s.notify(`📦 Quán chỉ nhận nông sản nhà trồng/nhà nuôi: ${productById(it.productId).name} cần ${it.qty} (kho ${have}, nhà trồng ${home})`);
      }
    }
    let total = 0;
    for (const it of order.items) {
      takeStock(k, it.productId, it.qty);
      const left = (hg[it.productId] ?? 0) - it.qty;
      if (left > 0) hg[it.productId] = left;
      else delete hg[it.productId];
      total += it.qty * productById(it.productId).sell;
    }
    const pay = Math.round(total * order.bonus);
    set({ ...k, garden: { ...s.garden, farmOrder: null, homegrown: hg }, money: s.money + pay });
    s.notify(`📦 Giao đơn cho ${order.from}: thu ${formatMoney(pay)} (giá hời ×${order.bonus} cho nông sản nhà trồng)`);
    s.addXp(8);
  },
  buyFarmBuilding: (id) => {
    const s = get();
    const def = FARM_BUILDINGS[id];
    if (!def) return;
    if (s.garden.buildings[id]) return s.notify('Công trình này đã có rồi');
    if (s.level < def.unlock) return s.notify(`${def.name} mở ở cấp ${def.unlock}`);
    if (s.money < def.cost) return s.notify(`Không đủ tiền xây ${def.name.toLowerCase()} (${formatMoney(def.cost)})`);
    set({
      garden: { ...s.garden, buildings: { ...s.garden.buildings, [id]: 1 } },
      money: s.money - def.cost,
      stats: { ...s.stats, spent: s.stats.spent + def.cost },
    });
    s.notify(`${def.icon} Xây xong ${def.name} (sao 1/3): ${def.note}. Dọn trại lấy gỗ đá mà nâng sao`);
    s.addXp(20);
  },
  upgradeFarmBuilding: (id) => {
    const s = get();
    const def = FARM_BUILDINGS[id];
    const star = s.garden.buildings[id];
    if (!def || !star) return s.notify('Chưa có công trình này — mua trước đã');
    if (star >= FARM_BUILDING_MAX_STAR) return s.notify(`${def.name} đã tối ${FARM_BUILDING_MAX_STAR} sao rồi`);
    const cost = def.upgrades[star - 1];
    if (s.garden.wood < cost.wood || s.garden.stone < cost.stone) {
      return s.notify(`Cần ${cost.wood} gỗ + ${cost.stone} đá (đang có ${s.garden.wood} gỗ, ${s.garden.stone} đá) — dọn trại mỗi sáng là có`);
    }
    if (s.money < cost.money) return s.notify(`Không đủ tiền nâng sao (${formatMoney(cost.money)})`);
    set({
      garden: { ...s.garden, buildings: { ...s.garden.buildings, [id]: star + 1 }, wood: s.garden.wood - cost.wood, stone: s.garden.stone - cost.stone },
      money: s.money - cost.money,
      stats: { ...s.stats, spent: s.stats.spent + cost.money },
    });
    s.notify(`${def.icon} ${def.name} lên sao ${star + 1}/${FARM_BUILDING_MAX_STAR} — hiệu ứng mạnh thêm`);
    s.addXp(12);
  },
  cleanupFarm: () => {
    const s = get();
    const debris = s.garden.debris;
    if (!debris) return s.notify('Trại đang sạch — cỏ dại mọc lại sau mỗi đêm, bão qua là nhiều');
    // Mỗi đống dọn ra 1 gỗ + 1 đá, nửa khả năng thêm 1 gỗ (kiểu HappyTown dọn trại ra tài nguyên nâng công trình)
    let wood = 0, stone = 0;
    for (let i = 0; i < debris; i++) {
      wood++;
      stone++;
      if (Math.random() < 0.5) wood++;
    }
    set({ garden: { ...s.garden, debris: 0, wood: s.garden.wood + wood, stone: s.garden.stone + stone } });
    s.notify(`🧹 Dọn ${debris} đống cỏ cành: nhặt ${wood} gỗ, ${stone} đá — dành nâng sao công trình (đang có ${s.garden.wood + wood} gỗ, ${s.garden.stone + stone} đá)`);
    s.addXp(3);
  },
});
