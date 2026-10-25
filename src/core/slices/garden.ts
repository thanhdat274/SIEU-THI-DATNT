import { formatMoney, productById } from '../../data/products';
import { CHICKEN_PRICE, COOP_MAX, COOP_UNLOCK, cropById, CROPS, EGG_PER_TRAY, FEED_PRODUCT, GARDEN_UNLOCK, HOMEGROWN_PREMIUM, plotReady, type GardenState, type Plot } from '../../data/garden';
import type { GameState, SetState, GetState } from '../gameTypes';
import { copyStock, putStock, takeStock } from '../stock';

/** Vườn rau và chuồng gà sau nhà: trồng, tưới, thu hoạch, nuôi gà lấy trứng. */

export const createGardenSlice = (set: SetState, get: GetState): Pick<GameState, 'plantCrop' | 'waterGarden' | 'harvestPlot' | 'buyChicken' | 'feedCoop' | 'collectEggs'> => ({
  plantCrop: (plotIndex, cropId) => {
    const s = get();
    if (s.level < GARDEN_UNLOCK) return s.notify(`Vườn rau mở ở cấp ${GARDEN_UNLOCK} — sửa lại nhà cho thoáng đã`);
    const def = cropById(cropId);
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
    s.notify(`${def.icon} Đã trồng ${def.name} (${formatMoney(def.seedCost)}): ~${def.days} ngày nữa thu được, nhớ tưới mỗi sáng`);
  },
  waterGarden: () => {
    const s = get();
    if (s.weather === 'rain' || s.weather === 'storm') return s.notify('🌧️ Trời đang mưa, cây đã đủ nước');
    const todo = s.garden.plots.filter((p) => p.crop && p.wateredDay !== s.day).length;
    if (!todo) return s.notify('Vườn đã tưới hết rồi');
    set({ garden: { ...s.garden, plots: s.garden.plots.map((p) => (p.crop ? { ...p, wateredDay: s.day } : p)) } });
    s.notify(`💧 Đã tưới ${todo} luống: tưới đủ mỗi ngày cây lớn nhanh gấp rưỡi, mưa thì khỏi tưới`);
  },
  harvestPlot: (plotIndex) => {
    const s = get();
    const plot = s.garden.plots[plotIndex];
    if (!plot?.crop) return;
    const def = cropById(plot.crop);
    if (!plotReady(plot)) return s.notify(`${def.name} chưa lớn xong (còn ~${Math.ceil(def.days - plot.growth)} ngày)`);
    const k = copyStock(s);
    putStock(k, def.productId, def.yieldQty);
    const homegrown = { ...s.garden.homegrown };
    homegrown[def.productId] = (homegrown[def.productId] ?? 0) + def.yieldQty;
    set({
      ...k,
      garden: { ...s.garden, plots: s.garden.plots.map((p, i) => (i === plotIndex ? { crop: null, growth: 0, wateredDay: 0 } : p)), homegrown },
    });
    s.notify(`🧺 Thu hoạch ${def.yieldQty} ${productById(def.productId).name} nhà trồng: vào kho, bán được giá hơn ${Math.round(HOMEGROWN_PREMIUM * 100)}%`);
    s.addXp(5);
  },
  buyChicken: () => {
    const s = get();
    if (s.level < COOP_UNLOCK) return s.notify(`Chuồng gà mở ở cấp ${COOP_UNLOCK}`);
    const coop = s.garden.coop ?? { chickens: 0, fedDay: 0, eggs: 0 };
    if (coop.chickens >= COOP_MAX) return s.notify(`Chuồng chỉ chứa ${COOP_MAX} con`);
    if (s.money < CHICKEN_PRICE) return s.notify(`Không đủ tiền mua gà (${formatMoney(CHICKEN_PRICE)})`);
    set({
      garden: { ...s.garden, coop: { ...coop, chickens: coop.chickens + 1 } },
      money: s.money - CHICKEN_PRICE,
      stats: { ...s.stats, spent: s.stats.spent + CHICKEN_PRICE },
    });
    s.notify(`🐔 Mua một con gà (${formatMoney(CHICKEN_PRICE)}): cho ăn cám mỗi ngày là có trứng`);
  },
  feedCoop: () => {
    const s = get();
    const coop = s.garden.coop;
    if (!coop?.chickens) return s.notify('Chưa có con gà nào mà cho ăn gì');
    if (coop.fedDay === s.day) return s.notify('Hôm nay gà ăn rồi');
    const need = coop.chickens;
    const k = copyStock(s);
    let bought = 0;
    const have = k.storage[FEED_PRODUCT] ?? 0;
    if (have < need) {
      const cost = productById(FEED_PRODUCT).buy * (need - have) * 2;
      if (s.money < cost) return s.notify(`Kho hết cám gà, mua lẻ cần ${formatMoney(cost)} — nhập ${productById(FEED_PRODUCT).name} ở Đại lý cho rẻ`);
      set({ money: s.money - cost, stats: { ...s.stats, spent: s.stats.spent + cost } });
      bought = cost;
    }
    takeStock(k, FEED_PRODUCT, need);
    set({ ...k, garden: { ...get().garden, coop: { ...coop, fedDay: s.day } } });
    s.notify(`🌾 Cho ${need} con gà ăn no${bought ? ` (mua lẻ cám ${formatMoney(bought)})` : ''} — tối nay gà đẻ trứng`);
  },
  collectEggs: () => {
    const s = get();
    const coop = s.garden.coop;
    if (!coop?.eggs) return s.notify('Chuồng chưa có trứng nào');
    const trays = Math.floor(coop.eggs / EGG_PER_TRAY);
    if (!trays) return s.notify(`Mới ${coop.eggs} quả, đủ ${EGG_PER_TRAY} quả sẽ gói thành một vỉ`);
    const k = copyStock(s);
    putStock(k, 'trung', trays);
    const homegrown = { ...s.garden.homegrown };
    homegrown['trung'] = (homegrown['trung'] ?? 0) + trays;
    set({ ...k, garden: { ...s.garden, coop: { ...coop, eggs: coop.eggs - trays * EGG_PER_TRAY }, homegrown } });
    s.notify(`🥚 Gói ${trays} vỉ trứng nhà nuôi vào kho — khách thích hàng nhà nuôi, trả giá cao hơn`);
    s.addXp(4);
  },
});

/** Nhãn "rau nhà trồng" áp cho món nào đang có hàng nhà trồng trong kho (hiện ở bảng giá/vườn). */
export const homegrownIds = (g: GardenState) => Object.keys(g.homegrown).filter((id) => g.homegrown[id] > 0);

/** Số món nhà trồng còn (để HUD hiện huy hiệu). */
export const homegrownTotal = (g: GardenState) => Object.values(g.homegrown).reduce((n, q) => n + q, 0);

/** Danh sách giống trồng được ở cấp hiện tại. */
export const unlockedCrops = (level: number) => CROPS.filter((c) => c.unlock <= level);
