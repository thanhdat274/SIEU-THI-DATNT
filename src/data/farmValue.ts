/**
 * Kinh tế trang trại đầu ngõ (GĐ146): trồng giống nào, nuôi con nào đáng?
 * Thuần đọc từ state + hằng số sẵn có — không action mới, không trường save mới.
 * Chuẩn giá trị dùng nhất quán: 1 món "nhà trồng/nhà nuôi" bán lẻ ở quầy được
 * cộng 20% nhãn nhà trồng (HOMEGROWN_PREMIUM). Đơn quán xóm trả ×1,25 so giá
 * bán thường (FARM_ORDER_BONUS) — so với bán lẻ nhà trồng là ×1,25/1,2 ≈ +4,2%.
 * (Giá trị nấu thành món là mảnh ghép "homegrown vs bếp" — làm sau, xem BACKUP3
 * giai đoạn GĐ145; helper này chỉ đóng trục giá-trị-vs-chi-phí của NGOÀI trồng/nuôi.)
 */
import type { AnimalDef, AnimalKind, AnimalMode, CropDef, GardenState } from './garden';
import {
  ANIMALS, CROPS, FARM_ORDER_BONUS, HOMEGROWN_PREMIUM, animalMode, harvestYield, inSeason,
} from './garden';
import { productById } from './products';

/** Giá bán lẻ 1 món nhà trồng/nhà nuôi ở quầy (đã cộng 20% nhãn nhà trồng). */
export const homegrownSell = (productId: string) =>
  Math.round(productById(productId).sell * (1 + HOMEGROWN_PREMIUM));

export interface CropDayValue {
  crop: CropDef;
  /** Doanh thu một lần thu hoạch (homegrown retail, đã tính mùa vụ ×1,5 nếu đúng mùa). */
  revenue: number;
  /** Tiền giống bỏ ra mỗi vụ (lâu năm chỉ bỏ 1 lần lúc trồng). */
  seedCost: number;
  /** Lợi nhuận bình quân / luống / ngày. Lâu năm chia theo chu kỳ ra trái (không trừ giống). */
  perDay: number;
  isPerennial: boolean;
  /** Ngày chín (hoặc ngày hiện tại) đang đúng mùa vụ → trái sai gấp rưỡi. */
  inSeasonNow: boolean;
}

/**
 * Giá trị trồng 1 luống giống này bình quân mỗi ngày.
 * Ngày chín mượn `ripeDay` (thiếu lấy `day`) để quyết mùa vụ ×1,5 — giống hệt
 * harvestYield: để chín chờ đúng vụ không ăn được.
 */
export function cropPerDay(crop: CropDef, opts: { day: number; ripeDay?: number }): CropDayValue {
  const harvestDay = opts.ripeDay ?? opts.day;
  const qty = harvestYield(crop, opts.day, harvestDay);
  const revenue = qty * homegrownSell(crop.productId);
  const isPerennial = !!crop.regrowDays;
  const seedCost = crop.seedCost;
  const perDay = isPerennial
    ? (revenue - seedCost) / Math.max(1, crop.regrowDays!)  // phân bổ cả tiền giống vào chu kỳ đầu
    : (revenue - seedCost) / Math.max(1, crop.days);
  return { crop, revenue, seedCost, perDay, isPerennial, inSeasonNow: inSeason(crop, harvestDay) };
}

export interface AnimalDayValue {
  kind: AnimalKind;
  def: AnimalDef;
  mode: AnimalMode;
  /** Doanh thu/ngày/con (bình quân cả kỳ cho vỗ béo). */
  revenuePerDay: number;
  /** Chi phí cám/ngày/con (đã trừ giảm cám bãi thả). */
  feedPerDay: number;
  /** Lợi nhuận ròng / con / ngày (âm nếu nuôi lỗ vì cám). */
  perDay: number;
  /** Vỗ béo còn phải nuôi bấy nhiêu ngày nữa mới xuất chuồng được (0 = đủ ngày). */
  fattenRemaining: number;
}

/** Giá một kg cám của loài (theo túi/bao mua ở kho). */
const feedPerKg = (kind: AnimalKind) => {
  const def = ANIMALS[kind];
  return productById(def.feedProduct).buy / def.feedBagKg;
};

/**
 * Giá trị nuôi 1 con loài này bình quân mỗi ngày (đã trừ tiền cám hàng ngày và,
 * với vỗ béo, cả giá giống + cám cả kỳ phân bổ theo ngày vỗ).
 * `g.buildings.bai_tha` cho tự gặm cỏ bớt cám (farmGrazeDiscount).
 */
export function animalPerDay(kind: AnimalKind, g: GardenState): AnimalDayValue {
  const def = ANIMALS[kind];
  const mode = animalMode(def) as AnimalMode;
  const graze = 1 - 0.1 * (g.buildings?.bai_tha ?? 0);
  const feedPerDay = def.feedKgPerDay * feedPerKg(kind) * graze;

  if (mode === 'egg') {
    const eggsPerDay = def.layChance! * (1 + 0.08 * (g.buildings?.bai_tha ?? 0));
    const traysPerDay = eggsPerDay / 10; // EGG_PER_TRAY
    const revenuePerDay = traysPerDay * homegrownSell(def.productId);
    return { kind, def, mode, revenuePerDay, feedPerDay, perDay: revenuePerDay - feedPerDay, fattenRemaining: 0 };
  }
  if (mode === 'milk') {
    const outPerDay = def.outputPerDay! * (1 + 0.05 * (g.buildings?.bai_tha ?? 0));
    const revenuePerDay = outPerDay * homegrownSell(def.productId);
    return { kind, def, mode, revenuePerDay, feedPerDay, perDay: revenuePerDay - feedPerDay, fattenRemaining: 0 };
  }
  // fatten: thu thịt 1 lần cuối kỳ
  const days = def.fattenDays!;
  const revenue = def.meatPerHead! * homegrownSell(def.productId);
  const cost = def.price + feedPerDay * days;
  return {
    kind, def, mode, revenuePerDay: revenue / days, feedPerDay,
    perDay: (revenue - cost) / days,
    fattenRemaining: Math.max(0, days - (g.pens[kind]?.fattened ?? 0)),
  };
}

/** Giống đang mở theo cấp (unlock ≤ level), sắp theo lợi nhuận/luống/ngày giảm dần. */
export function cropRank(level: number, day: number, opts: { ripeDay?: number } = {}): CropDayValue[] {
  const list = CROPS.filter((c) => c.unlock <= level);
  const vals = list.map((c) => cropPerDay(c, { day, ripeDay: opts.ripeDay }));
  return vals.sort((a, b) => b.perDay - a.perDay);
}

/** Loài đang nuôi (chuồng có con) sắp theo lợi nhuận/con/ngày giảm dần. */
export function animalRank(g: GardenState): AnimalDayValue[] {
  const out: AnimalDayValue[] = [];
  for (const kind of ['chicken', 'duck', 'goose', 'pig', 'cow', 'goat', 'dong_tao'] as AnimalKind[]) {
    if ((g.pens?.[kind]?.count ?? 0) > 0) out.push(animalPerDay(kind, g));
  }
  return out.sort((a, b) => b.perDay - a.perDay);
}

/** Giống đáng trồng nhất hôm nay trong các giống đang mở (null nếu chưa đủ cấp). */
export function bestCrop(level: number, day: number): CropDayValue | null {
  return cropRank(level, day)[0] ?? null;
}

/** Loài đang nuôi đáng nhất (null nếu không nuôi con nào). */
export function bestAnimal(g: GardenState): AnimalDayValue | null {
  return animalRank(g)[0] ?? null;
}

/** So bán lẻ nhà trồng (×1,2) với giao đơn quán xóm (×1,25) cho 1 món — đơn được +4.2% so bán lẻ. */
export function orderVsShelf(productId: string): { shelf: number; order: number; percent: number } {
  const base = productById(productId).sell;
  const shelf = Math.round(base * (1 + HOMEGROWN_PREMIUM));
  const order = Math.round(base * FARM_ORDER_BONUS);
  return { shelf, order, percent: Math.round((order / shelf - 1) * 1000) / 10 };
}
