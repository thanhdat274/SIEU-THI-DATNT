/**
 * Kinh tế trang trại đầu ngõ (GĐ146): trồng giống nào, nuôi con nào đáng?
 * Thuần đọc từ state + hằng số sẵn có — không action mới, không trường save mới.
 * Chuẩn giá trị dùng nhất quán: 1 món "nhà trồng/nhà nuôi" bán lẻ ở quầy được
 * cộng 20% nhãn nhà trồng (HOMEGROWN_PREMIUM). Đơn quán xóm trả ×1,25 so giá
 * bán thường (FARM_ORDER_BONUS) — so với bán lẻ nhà trồng là ×1,25/1,2 ≈ +4,2%.
 * (Giá trị nấu thành món là mảnh ghép "homegrown vs bếp" — làm sau, xem BACKUP3
 * giai đoạn GĐ145; helper này chỉ đóng trục giá-trị-vs-chi-phí của NGOÀI trồng/nuôi.)
 */
import type { AnimalDef, AnimalKind, AnimalMode, CropDef, FarmBuildingId, GardenState } from './garden';
import {
  ANIMALS, CROPS, FARM_BUILDINGS, FARM_ORDER_BONUS, HOMEGROWN_PREMIUM, animalMode,
  farmCritChance, farmGrazeDiscount, farmGrowthFlat, farmGrowthPct, harvestYield, inSeason, LAND_TIERS,
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
export function cropPerDay(crop: CropDef, opts: { day: number; ripeDay?: number; /** GĐ1104: giá trị/1 đơn vị cao hơn bán lẻ (pha nước ở quán) — override doanh thu. */ valuePerUnit?: number }): CropDayValue {
  const harvestDay = opts.ripeDay ?? opts.day;
  const qty = harvestYield(crop, opts.day, harvestDay);
  const revenue = qty * Math.max(homegrownSell(crop.productId), opts.valuePerUnit ?? 0);
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
export function animalPerDay(kind: AnimalKind, g: GardenState, opts: { /** GĐ1105: giá trị/1 đơn vị cao hơn bán lẻ (pha nước ở quán) — override doanh thu. */ valuePerUnit?: number } = {}): AnimalDayValue {
  const def = ANIMALS[kind];
  const mode = animalMode(def) as AnimalMode;
  const graze = 1 - 0.1 * (g.buildings?.bai_tha ?? 0);
  const feedPerDay = def.feedKgPerDay * feedPerKg(kind) * graze;

  if (mode === 'egg') {
    const eggsPerDay = def.layChance! * (1 + 0.08 * (g.buildings?.bai_tha ?? 0));
    const traysPerDay = eggsPerDay / 10; // EGG_PER_TRAY
    const revenuePerDay = traysPerDay * Math.max(homegrownSell(def.productId), opts.valuePerUnit ?? 0);
    return { kind, def, mode, revenuePerDay, feedPerDay, perDay: revenuePerDay - feedPerDay, fattenRemaining: 0 };
  }
  if (mode === 'milk') {
    const outPerDay = def.outputPerDay! * (1 + 0.05 * (g.buildings?.bai_tha ?? 0));
    const revenuePerDay = outPerDay * Math.max(homegrownSell(def.productId), opts.valuePerUnit ?? 0);
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

// ───────────────────────── Mở rộng đất trại (GĐ1248) ─────────────────────────

export type FarmExpandVerdict = 'worth' | 'slow' | 'nodata';
export interface FarmExpandPayback {
  /** Tên lô đất sắp mua. */
  tierName: string;
  /** Giá mua (đ). */
  cost: number;
  /** Số luống mới được thêm. */
  extraPlots: number;
  /** Lợi nhuận bình quân/ngày của mỗi luống mới (trồng giống đáng nhất trong tầm cấp — bestCrop). */
  perPlotPerDay: number;
  /** Thu nhập thêm mỗi ngày = extraPlots × perPlotPerDay. */
  netPerDay: number;
  /** Số ngày hồi vốn (null khi không dự toán được). */
  paybackDays: number | null;
  verdict: FarmExpandVerdict;
}

/**
 * Ước hồi vốn khi mua lô đất trại tiếp theo (LAND_TIERS[land+1]) — soi quyết định
 * "Mở rộng đất" giống như `tiemXoiExpandPayback` (GĐ1247) cho tiệm xôi và
 * `branchBuildPayback` (GĐ193-family) cho chi nhánh.
 *
 * Giá trị thêm = số luống mới × giá trị/ngày của GIỐNG ĐÁNG NHẤT trong tầm cấp
 * (bestCrop — đã trừ chi phí giống, đúng mùa ×1,5): đây là giá trị cơ hội trung
 * thực của đất nếu chủ trồng giống khôn ngoan; ĐƠN GIẢN và có chủ ý KHÔNG cộng
 * chuồng mới (chỉ có giá trị khi chủ thực sự nuôi con mới — sẽ khuyến khích cày
 * giả rồi bị phình). Thuần đọc — không đổi save/seed/kinh tế.
 *
 * - 'worth':  hồi ≤60 ngày.
 * - 'slow':   hồi >60 ngày (hoặc không có giống nào để dự toán → vẫn tính bằng món hời nhất).
 * - 'nodata': không mở thêm được (đã rộng nhất) hoặc chưa có giống nào trong tầm cấp.
 */
export function farmExpandPayback(g: Pick<GardenState, 'land' | 'plots'>, level: number, day: number): FarmExpandPayback | null {
  const tier = LAND_TIERS[g.land + 1];
  if (!tier) return null; // đã rộng nhất
  const extraPlots = Math.max(0, tier.plots - g.plots.length);
  const best = bestCrop(level, day);
  const perPlotPerDay = best ? Math.round(best.perDay) : 0;
  const netPerDay = extraPlots * perPlotPerDay;
  if (netPerDay <= 0 || perPlotPerDay <= 0) {
    return { tierName: tier.name, cost: tier.cost, extraPlots, perPlotPerDay, netPerDay: 0, paybackDays: null, verdict: 'nodata' };
  }
  const paybackDays = Math.ceil(tier.cost / netPerDay);
  return {
    tierName: tier.name, cost: tier.cost, extraPlots, perPlotPerDay, netPerDay,
    paybackDays, verdict: paybackDays <= 60 ? 'worth' : 'slow',
  };
}

// ───────────────────────── Mua vật nuôi (GĐ1250) ─────────────────────────

export type AnimalBuyVerdict = 'worth' | 'slow' | 'loss';
export interface AnimalBuyPayback {
  /** Lợi nhuận ròng/con/ngày (animalPerDay — đã trừ cám, đã tính bãi thả, đã cộng nhãn nhà nuôi +20%). */
  perDay: number;
  /** Số ngày hồi vốn: trứng/sữa chia đều mỗi ngày; vỗ béo thu về một lần khi xuất chuồng (= fattenDays). null khi nuôi lỗ. */
  paybackDays: number | null;
  verdict: AnimalBuyVerdict;
  /** Một dòng tiếng Việt trung thực đặt cạnh nút mua. */
  line: string;
}

/**
 * "Mua con vật đầu tiên N tr để làm gì?" — soi quyết định MUA VẬT NUÔI (hộp đen còn lại
 * của trại sau GĐ1248 đất / GĐ1249 công trình). `animalPerDay` chỉ hiện khi chuồng ĐÃ có
 * con, còn nút "Mua con đầu tiên" lại chỉ cho giá. Helper tính đúng giá trị biên của CON
 * TIẾP THEO (một con mới ăn thêm cám, đẻ thêm trứng — cùng công thức animalPerDay) rồi
 * quy đổi ra số ngày hồi vốn. THUẦN ĐỌC — không đổi state/save/kinh tế (Luật 5/10).
 *
 * - 'worth': hồi ≤60 ngày (cùng ngưỡng GĐ1247/1248).
 * - 'slow':  hồi >60 ngày (hoặc không lỗ nhưng lãi mỏng).
 * - 'loss':  perDay ≤ 0 — cám ăn nhiều hơn tiền sản phẩm cho ra.
 */
export function animalBuyPayback(kind: AnimalKind, g: GardenState): AnimalBuyPayback {
  const av = animalPerDay(kind, g);
  const perDay = Math.round(av.perDay);
  const def = av.def;
  if (perDay <= 0) {
    return {
      perDay, paybackDays: null, verdict: 'loss',
      line: `Chưa đáng: mỗi con lỗ ~${Math.abs(perDay).toLocaleString('vi-VN')}đ/ngày sau trừ cám — cần bãi thả hoặc cám rẻ hơn`,
    };
  }
  const paybackDays = av.mode === 'fatten' ? def.fattenDays! : Math.ceil(def.price / av.perDay);
  const verdict: AnimalBuyVerdict = paybackDays <= 60 ? 'worth' : 'slow';
  const tail = av.mode === 'fatten'
    ? `lãi dồn về khi xuất chuồng sau ${paybackDays} ngày cho ăn`
    : `hồi vốn ~${paybackDays} ngày`;
  return {
    perDay, paybackDays, verdict,
    line: `Lãi ~${perDay.toLocaleString('vi-VN')}đ/con/ngày (đã trừ cám) — ${tail} (${verdict === 'worth' ? 'đáng' : 'chậm'})`,
  };
}

/** Giá cám phải mua MỖI NGÀY cho toàn bộ vật nuôi hiện có, TÍNH TRƯỚC khi trừ bãi thả giảm giá. */
export const dailyFeedCost = (g: GardenState): number => {
  let total = 0;
  for (const kind in ANIMALS) {
    const pen = g.pens?.[kind as AnimalKind];
    if (!pen || pen.count <= 0) continue;
    const def = ANIMALS[kind as AnimalKind];
    total += pen.count * def.feedKgPerDay * feedPerKg(kind as AnimalKind);
  }
  return Math.round(total);
};

export interface FarmBuildingValue {
  id: FarmBuildingId;
  /** Đã xây chưa (star = cấp xây, 0 = chưa). */
  owned: boolean;
  /** Giá cấp hiện tại (0 = giá cấp 1 để xây mới). */
  cost: number;
  /** Một dòng tiếng Việt trung thực: công trình này GIÁ TRỊ gì với nông trại HIỆN TẠI của mình. */
  line: string;
  /** True = dòng có con số tiền (đ/ngày) ước đáng tin; false = dòng định tính (%, QoL). */
  hasMoney: boolean;
}

/**
 * "Công trình trại {tưới/nhà lưới/bãi thả/bù nhìn} mua 6–30tr để làm gì cho MÌNH?" — soi quyết
 * định ĐẦU TƯ CÔNG TRÌNH (hộp đen còn lại của trại sau GĐ1248 đất). Mỗi công trình có phần
 * lợi ích DỰA VÀO nông trại hiện có: có vật nuôi mới đáng giá bãi thả, có trồng mới đáng bù nhìn...
 * THUẦN ĐỌC — không đổi state/save/kinh tế (Luật 5/10 an toàn). Bãi thả cho con số đ/ngày chắc
 * (giảm cám × số cám đang phải mua); tưới/nhà lưới/bù nhìn chỉ bậc định tính (%) vì lợi thật của
 * chúng phụ thuộc hoạt động trồng/nuôi dao động (tránh cày số mơ hồ, Luật 3).
 */
export const farmBuildingValue = (g: GardenState): FarmBuildingValue[] => {
  const out: FarmBuildingValue[] = [];
  for (const id of Object.keys(FARM_BUILDINGS) as FarmBuildingId[]) {
    const def = FARM_BUILDINGS[id];
    const star = g.buildings?.[id] ?? 0;
    // Chi phí để HÀNH ĐỘNG ngay: chưa có thì giá mua cấp 1, có rồi thì tiền lên sao tiếp theo.
    const cost = star === 0 ? def.cost : (def.upgrades[star - 1]?.money ?? 0);
    let line: string;
    let hasMoney = false;
    if (id === 'bai_tha') {
      const saved = Math.round(dailyFeedCost(g) * farmGrazeDiscount(g));
      const care = saved > 0
        ? `giảm ~${saved.toLocaleString('vi-VN')}đ cám/ngày (cho ${g.pens ? Object.values(g.pens).filter(p => p && p.count > 0).length : 0} chuồng đang nuôi)`
        : 'chưa có vật nuôi nào nên hôm nay chưa giảm được đồng cám nào';
      line = star > 0 ? `Bãi thả cấp ${star}: ${care}` : `Chưa xây (${cost.toLocaleString('vi-VN')}đ): ${care}`;
      hasMoney = saved > 0;
    } else if (id === 'bu_nhin') {
      const pct = Math.round(farmCritChance(g) * 100);
      line = star > 0
        ? `Bù nhìn cấp ${star}: thu hoạch có ${pct}% cơ hội gấp đôi trái (càng nhiều rau đang trồng càng lời)`
        : `Chưa xây (${cost.toLocaleString('vi-VN')}đ): thu hoạch có cơ hội gấp đôi trái — chỉ đáng khi bạn trồng nhiều`;
      hasMoney = false;
    } else if (id === 'tuoi_tu_dong') {
      const gPct = Math.round(farmGrowthPct(g) * 100);
      line = star > 0
        ? (gPct > 0
            ? `Tưới tự động cấp ${star}: tự tưới cả vườn + cây lớn nhanh thêm ${gPct}%/sao`
            : `Tưới tự động cấp 1: tự tưới cả vườn mỗi sáng (khỏi thao tác); lên cấp 2–3 để cây lớn nhanh hơn`)
        : `Chưa xây (${cost.toLocaleString('vi-VN')}đ): tự tưới cả vườn mỗi sáng, khỏi thao tác`;
      hasMoney = false;
    } else { // nha_luoi
      const flat = farmGrowthFlat(g);
      line = star > 0
        ? `Nhà lưới cấp ${star}: mưa giông không sập luống + cây lớn thêm ${flat} ngày mỗi đêm`
        : `Chưa xây (${cost.toLocaleString('vi-VN')}đ): mưa giông không sập luống + cây lớn nhanh hơn`;
      hasMoney = false;
    }
    out.push({ id, owned: star > 0, cost, line, hasMoney });
  }
  return out;
};
