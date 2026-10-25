/**
 * Vườn rau và chuồng gà sau nhà: sáng ra đường tới tiệm thì ghé tưới cây, thu hoạch, cho gà ăn.
 * Cây lớn theo ngày, tưới thì lớn nhanh; mưa tưới hộ miễn phí, giông bão có thể bay hết vườn.
 * Gà được cho ăn bằng cám mua ở tiệm thì đẻ trứng, đủ một vỉ thì cất vào kho bán như hàng thường.
 * Hàng nhà trồng được gắn nhãn "rau nhà trồng": khách thích, sẵn sàng trả đắt hơn — bán ở tiệm
 * hay chuyển về chi nhánh 24/7 (kho chung) đều được.
 * Chỉ có dữ liệu và hàm thuần; hành động đổi trạng thái nằm ở `core/slices/garden`.
 */
import type { Weather } from './weather';

/** Mở vườn rau từ cấp này. */
export const GARDEN_UNLOCK = 8;
/** Mở chuồng gà từ cấp này. */
export const COOP_UNLOCK = 14;

export interface CropDef {
  id: string;
  /** Sản phẩm vào kho khi thu hoạch (trong PRODUCTS). */
  productId: string;
  name: string;
  icon: string;
  /** Số ngày lớn (đã tưới đầy đủ) thì thu được. */
  days: number;
  /** Tiền giống trả lúc trồng. */
  seedCost: number;
  /** Số món thu hoạch mỗi cây. */
  yieldQty: number;
  unlock: number;
}

export const CROPS: CropDef[] = [
  { id: 'rau_cai', productId: 'rau', name: 'Rau cải', icon: '🥬', days: 3, seedCost: 8000, yieldQty: 8, unlock: 1 },
  { id: 'bap', productId: 'bap', name: 'Bắp ngô', icon: '🌽', days: 4, seedCost: 12000, yieldQty: 6, unlock: 1 },
  { id: 'mia', productId: 'mia', name: 'Mía', icon: '🎋', days: 6, seedCost: 20000, yieldQty: 8, unlock: 12 },
  { id: 'traicay', productId: 'traicay', name: 'Cây ăn trái', icon: '🌳', days: 7, seedCost: 35000, yieldQty: 6, unlock: 20 },
];

export const cropById = (id: string) => CROPS.find((c) => c.id === id)!;

/** Số luống đất trong vườn. */
export const PLOT_COUNT = 4;

/** Một luống: đang trồng gì, đã lớn được mấy "ngày tưới", hôm nay đã tưới chưa. */
export interface Plot {
  crop: string | null;
  /** Ngày đã lớn xong (growth tính theo ngày tưới đủ; chưa đủ `days` thì chưa thu được). */
  growth: number;
  /** Ngày game gần nhất luống được tưới (tay hoặc mưa). */
  wateredDay: number;
}

/** Chuồng gà: mua gà lần đầu là có chuồng; cho ăn bằng cám gà mua ở tiệm. */
export interface Coop {
  chickens: number;
  /** Ngày gần nhất cả đàn được cho ăn. */
  fedDay: number;
  /** Trứng đang ấm trong chuồng, đủ 10 quả gói thành một vỉ. */
  eggs: number;
}

export interface GardenState {
  plots: Plot[];
  coop: Coop | null;
  /** Số món "nhà trồng/nhà nuôi" còn trong kho (bán được giá hơn): id sản phẩm → số món. */
  homegrown: Record<string, number>;
}

export const emptyPlot = (): Plot => ({ crop: null, growth: 0, wateredDay: 0 });

export const newGarden = (): GardenState => ({
  plots: Array.from({ length: PLOT_COUNT }, emptyPlot),
  coop: null,
  homegrown: {},
});

export const CHICKEN_PRICE = 250000;
export const COOP_MAX = 3;
/** Mỗi con gà mỗi ngày xác suất đẻ một quả. */
export const EGG_CHANCE = 0.85;
/** Bấy nhiêu quả gói thành một vỉ trứng (sản phẩm 'trung'). */
export const EGG_PER_TRAY = 10;
/** Cám gà: id sản phẩm cho gà ăn, mỗi con mỗi ngày một đơn vị. */
export const FEED_PRODUCT = 'cam_ga';

/** Khách trả thêm bấy nhiêu phần giá cho món nhà trồng (nêu ở gợi ý giá). */
export const HOMEGROWN_PREMIUM = 0.2;

/** Một đêm vườn: cây lớn theo tưới/mưa, bão có thể phá, gà đẻ trứng. Trả về vườn mới và tin sáng mai. */
export function gardenNight(
  g: GardenState,
  ctx: { day: number; weather: Weather; coopFedToday: boolean; rng?: () => number },
): { garden: GardenState; news: string[] } {
  const rng = ctx.rng ?? Math.random;
  const news: string[] = [];
  const rain = ctx.weather === 'rain' || ctx.weather === 'storm';
  const plots = g.plots.map((p) => {
    if (!p.crop) return p;
    if (ctx.weather === 'storm' && rng() < 0.4) {
      news.push(`⛈️ Giông bão làm sập luống ${cropById(p.crop).name}, phải trồng lại`);
      return emptyPlot();
    }
    const watered = p.wateredDay === ctx.day || rain;
    return { ...p, growth: p.growth + (watered ? 1 : 0.4), wateredDay: rain ? ctx.day : p.wateredDay };
  });
  if (rain) news.push('🌧️ Mưa đêm qua tưới hộ vườn, sáng nay khỏi tưới');
  let coop = g.coop;
  if (coop && ctx.coopFedToday) {
    let eggs = coop.eggs;
    let laid = 0;
    for (let i = 0; i < coop.chickens; i++) if (rng() < EGG_CHANCE) { eggs++; laid++; }
    if (laid) news.push(`🐔 Gà đẻ ${laid} quả, trong chuồng đang có ${Math.floor(eggs / EGG_PER_TRAY)} vỉ chờ lấy`);
    coop = { ...coop, eggs };
  } else if (coop) {
    news.push('🐔 Gà đói không đẻ trứng — nhớ cho ăn cám mỗi ngày');
  }
  return { garden: { ...g, plots, coop }, news };
}

/** Luống đã đủ lớn để thu hoạch. */
export const plotReady = (p: Plot) => !!p.crop && p.growth >= cropById(p.crop).days;

/** Mô tả luống để vẽ trong bảng vườn. */
export function plotLabel(p: Plot, day: number): string {
  if (!p.crop) return 'Đất trống';
  const def = cropById(p.crop);
  const left = Math.max(0, Math.ceil(def.days - p.growth));
  if (left === 0) return `${def.icon} ${def.name} — chờ thu hoạch`;
  const watered = p.wateredDay === day ? 'đã tưới' : 'chưa tưới';
  return `${def.icon} ${def.name} — còn ~${left} ngày (${watered})`;
}
