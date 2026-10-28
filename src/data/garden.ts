/**
 * Trang trại đầu ngõ (nằm nam con đường thứ hai, đi lại bằng nút 🚜): trồng rau, cây ăn trái đa giống
 * theo mùa vụ, nuôi gà/vịt/ngỗng/bò/heo/gà Đông Tảo/dê sữa.
 * Cây lớn theo ngày, tưới thì lớn nhanh, mưa tưới hộ; phân bón bón 1 lần/vụ rút ngắn 30% thời gian
 * CÒN LẠI (tối thiểu 1 ngày); cây lâu năm bón một lần lúc trồng là đủ, mỗi chu kỳ cho thu hoạch mãi mãi
 * (kiểu HappyTown); trái đúng mùa vụ sai trái gấp rưỡi — mùa tính theo ngày cây CHÍN, để chín chờ đúng
 * vụ không ăn được (vải mùa hè, bưởi cam Tết — đối chiếu lịch thật trong data/calendar).
 * Vật nuôi cho ăn bằng cám trong kho của chính tiệm (chuỗi cung ứng): gà/vịt/ngỗng đẻ trứng, bò/dê cho
 * sữa mỗi ngày, heo/gà Đông Tảo vỗ béo đủ ngày thì xuất chuồng lấy thịt.
 * Công trình trại (hệ tưới nhỏ giọt, nhà lưới, bãi thả, bù nhìn) mua bằng tiền, nâng sao bằng tiền +
 * gỗ + đá nhặt từ dọn trại mỗi sáng; bù nhìn cho cơ hội thu hoạch gấp đôi (kiểu HappyTown, tối đa 60%).
 * Đơn quán xóm đặt nông sản định kỳ giá hời. Hàng nhà trồng/nhà nuôi bán được giá hơn ở cả tiệm lẫn
 * chi nhánh 24/7 (kho chung). Trại bắt đầu nhỏ, mở rộng dần theo LAND_TIERS.
 * Chỉ có dữ liệu và hàm thuần; hành động đổi trạng thái nằm ở `core/slices/garden`.
 */
import type { Weather } from './weather';
import { dateOfDoy, YEAR_DAYS } from './calendar';

/** Mở trang trại từ cấp này. */
export const GARDEN_UNLOCK = 8;
/** Mở chuồng gà từ cấp này (loài đầu tiên). */
export const COOP_UNLOCK = 14;

/** Vật nuôi trong trại: gà/vịt/ngỗng đẻ trứng, bò/dê cho sữa hằng ngày, heo/gà Đông Tảo vỗ béo rồi xuất chuồng. */
export type AnimalKind = 'chicken' | 'duck' | 'goose' | 'pig' | 'cow' | 'goat' | 'dong_tao';

export interface AnimalDef {
  kind: AnimalKind;
  name: string;
  icon: string;
  /** Giá mua một con. */
  price: number;
  unlock: number;
  /** Cần mua đất bậc này mới nuôi được. */
  landTier: number;
  /** Sản phẩm cho ra: trứng gà/vịt/ngỗng gói vỉ, bò/dê ra lốc sữa, heo/gà Đông Tảo ra thịt lúc xuất chuồng. */
  productId: string;
  /** Xác suất đẻ một quả mỗi ngày (gà/vịt/ngỗng); bò/dê cho `outputPerDay` lốc chắc chắn. */
  layChance?: number;
  /** Số sản phẩm mỗi con mỗi ngày (bò/dê). */
  outputPerDay?: number;
  /** Vỗ béo: đủ số ngày cho ăn này thì xuất chuồng được (heo, gà Đông Tảo). */
  fattenDays?: number;
  /** Vỗ béo: số đơn vị thịt mỗi con khi xuất chuồng. */
  meatPerHead?: number;
  /** Cám loài này ăn: id sản phẩm + số kg mỗi con mỗi ngày. */
  feedProduct: string;
  feedKgPerDay: number;
  /** Khối lượng cám của một túi/bao mua ở kho (đổi cám ra kg). */
  feedBagKg: number;
  /** Mô tả ngắn dòng trạng thái trong bảng. */
  note: string;
}

/**
 * Đơn giá đối chiếu đời thật: gà giống ~130k, trứng gà ~3,3k/quả; trứng vịt đắt hơn ~30%; trứng ngỗng
 * to gấp ba ~30–40k/quả; cám heo/bò ~11–13k/kg; heo 100kg thật bỏ bớt xương lọc còn thịt bán ~30kg
 * tiền tệ game; gà Đông Tảo giống quý Hưng Yên ~700k/con, thịt đắt gấp chục lần gà thường; dê sữa
 * cho ít hơn bò nhưng lốc sữa dê đắt gấp rưỡi sữa bò (đối chiếu giá siêu thị VN).
 */
export const ANIMALS: Record<AnimalKind, AnimalDef> = {
  chicken: {
    kind: 'chicken', name: 'Gà đẻ', icon: '🐔', price: 100_000, unlock: 14, landTier: 0,
    productId: 'trung', layChance: 0.9,
    feedProduct: 'cam_ga', feedKgPerDay: 0.12, feedBagKg: 1,
    note: 'Đẻ ~0,9 quả/ngày, gói vỉ 10 quả bán như hàng nhà nuôi',
  },
  duck: {
    kind: 'duck', name: 'Vịt đẻ', icon: '🦆', price: 180_000, unlock: 16, landTier: 1,
    productId: 'trung_vit', layChance: 0.8,
    feedProduct: 'cam_ga', feedKgPerDay: 0.12, feedBagKg: 1,
    note: 'Trứng vịt to và đắt hơn trứng gà, ghé hàng chợ đầu mối là biết',
  },
  goose: {
    kind: 'goose', name: 'Ngỗng', icon: '🦢', price: 350_000, unlock: 18, landTier: 1,
    productId: 'trung_goos', layChance: 0.5,
    feedProduct: 'cam_ga', feedKgPerDay: 0.25, feedBagKg: 1,
    note: 'Đẻ thưa hơn gà nhưng trứng to gấp ba, quả nào cũng đáng tiền',
  },
  pig: {
    kind: 'pig', name: 'Heo thịt', icon: '🐖', price: 700_000, unlock: 20, landTier: 2,
    productId: 'x_thit_heo', fattenDays: 12, meatPerHead: 30,
    feedProduct: 'cam_heo', feedKgPerDay: 2, feedBagKg: 5,
    note: 'Cho ăn đủ 12 ngày thì xuất chuồng, mỗi con ra ~30 kg thịt heo',
  },
  cow: {
    kind: 'cow', name: 'Bò sữa', icon: '🐄', price: 3_200_000, unlock: 24, landTier: 2,
    productId: 'sua_tuoi', outputPerDay: 2,
    feedProduct: 'cam_bo', feedKgPerDay: 2.5, feedBagKg: 5,
    note: 'Cho 2 lốc sữa tươi mỗi ngày (ăn cỏ sẵn trong trại, cám bò là bổ sung)',
  },
  goat: {
    kind: 'goat', name: 'Dê sữa', icon: '🐐', price: 3_800_000, unlock: 27, landTier: 2,
    productId: 'sua_de', outputPerDay: 1,
    feedProduct: 'cam_de', feedKgPerDay: 1.8, feedBagKg: 5,
    note: 'Cho 1 lốc sữa dê mỗi ngày — sữa dẻ đắt gấp rưỡi sữa bò, hợp khách sành',
  },
  dong_tao: {
    kind: 'dong_tao', name: 'Gà Đông Tảo', icon: '🐓', price: 700_000, unlock: 30, landTier: 2,
    productId: 'thit_ga_dt', fattenDays: 20, meatPerHead: 3,
    feedProduct: 'cam_ga', feedKgPerDay: 0.2, feedBagKg: 1,
    note: 'Giống quý Hưng Yên lớn chậm: nuôi đủ 20 ngày thịt đắt gấp chục lần gà thường',
  },
};

export const ANIMAL_ORDER: AnimalKind[] = ['chicken', 'duck', 'goose', 'pig', 'cow', 'goat', 'dong_tao'];

/** Loài cho trứng gói vỉ / cho sữa theo lốc / vỗ béo xuất chuồng — quyết định nút trong bảng trại. */
export type AnimalMode = 'egg' | 'milk' | 'fatten';
export const animalMode = (def: AnimalDef): AnimalMode =>
  def.layChance !== undefined ? 'egg' : def.outputPerDay !== undefined ? 'milk' : 'fatten';

/**
 * Các bậc mở rộng đất trang trại: mua đất là có thêm luống và chuồng chứa được nhiều vật nuôi hơn.
 */
export interface LandTier {
  name: string;
  /** Số luống trồng sau khi mở bậc này. */
  plots: number;
  /** Mỗi loài chuồng chứa được bấy nhiêu con ở bậc này. */
  caps: Partial<Record<AnimalKind, number>>;
  cost: number;
  unlock: number;
}

export const LAND_TIERS: LandTier[] = [
  { name: 'Mảnh trại ven đường', plots: 4, caps: { chicken: 3 }, cost: 0, unlock: 0 },
  { name: 'Mua thêm đất phía sau', plots: 8, caps: { chicken: 8, duck: 4, goose: 4 }, cost: 15_000_000, unlock: 16 },
  { name: 'Trang trại đầu ngõ', plots: 12, caps: { chicken: 16, duck: 8, goose: 8, pig: 4, cow: 3, goat: 3, dong_tao: 3 }, cost: 40_000_000, unlock: 24 },
];

export const cropById = (id: string) => CROPS.find((c) => c.id === id)!;

/** Số luống đất ở bậc đất đang mở (bậc 0 là mảnh trại ban đầu). */
export const landPlots = (land: number) => LAND_TIERS[Math.max(0, Math.min(LAND_TIERS.length - 1, land))].plots;
/** Chuồng loài này chứa được bấy nhiêu con ở bậc đất đang mở. */
export const penCap = (land: number, kind: AnimalKind) => LAND_TIERS[Math.max(0, Math.min(LAND_TIERS.length - 1, land))].caps[kind] ?? 0;

export interface CropDef {
  id: string;
  /** Sản phẩm vào kho khi thu hoạch (trong PRODUCTS). */
  productId: string;
  name: string;
  icon: string;
  /** Số ngày lớn (đã tưới đầy đủ) thì thu được. */
  days: number;
  /** Cây lâu năm: thu hoạch xong chỉ cần bấy nhiêu ngày là ra trái tiếp, khỏi trồng lại. */
  regrowDays?: number;
  /** Tiền giống trả lúc trồng. */
  seedCost: number;
  /** Số món thu hoạch mỗi cây. */
  yieldQty: number;
  unlock: number;
  /** Mùa vụ (tháng thật, inclusive, được quấn năm như [11,2] = Tết): đúng vụ thì sai trái gấp rưỡi. */
  season?: [from: number, to: number];
}

/**
 * Cây ăn trái đa giống (kiểu HappyTown trồng một lần hái mãi mãi, nhưng theo mùa vụ thật của Nam Bộ /
 * đồng bằng: xoài cuối xuân, vải nhãn giữa hè, bưởi cam Tết — trùng lịch lễ trong data/calendar).
 * Thời gian đã trừu tượng hoá theo nhịp game (cây ăn trái chung 7 ngày) chứ không đếm tháng thật.
 */
export const CROPS: CropDef[] = [
  // Giống tính theo giá trị hàng mua tránh được (~50% giá nhập của cả vụ): nông trại "đỡ nhập hàng"
  // (tiết kiệm tiền nhập + hàng tươi + premium) chứ KHÔNG phải máy in tiền áp đảo doanh thu tiệm.
  { id: 'rau_cai', productId: 'rau', name: 'Rau cải', icon: '🥬', days: 3, seedCost: 40000, yieldQty: 8, unlock: 1 },
  { id: 'bap', productId: 'bap', name: 'Bắp ngô', icon: '🌽', days: 4, seedCost: 24000, yieldQty: 6, unlock: 1 },
  // Lúa: ra túi gạo (hàng khô giá cao) nên ít món/vụ hơn rau; lợi nhuận/ngày ngang mía–cây ăn trái
  { id: 'lua', productId: 'gao', name: 'Lúa', icon: '🌾', days: 5, seedCost: 90000, yieldQty: 2, unlock: 8 },
  { id: 'mia', productId: 'mia', name: 'Mía', icon: '🎋', days: 6, seedCost: 48000, yieldQty: 8, unlock: 12 },
  { id: 'traicay', productId: 'traicay', name: 'Cây ăn trái', icon: '🌳', days: 7, seedCost: 75000, yieldQty: 6, unlock: 20 },
  { id: 'traicay_nam', productId: 'traicay', name: 'Cây ăn trái lâu năm', icon: '🌴', days: 7, regrowDays: 3, seedCost: 100000, yieldQty: 8, unlock: 20 },
  { id: 'chuoi', productId: 'x_chuoi', name: 'Chuối', icon: '🍌', days: 8, regrowDays: 3, seedCost: 40000, yieldQty: 8, unlock: 22 },
  { id: 'oi', productId: 'x_oi', name: 'Ổi', icon: '🍏', days: 7, regrowDays: 3, seedCost: 45000, yieldQty: 7, unlock: 22 },
  { id: 'xoai', productId: 'x_xoai', name: 'Xoài', icon: '🥭', days: 12, regrowDays: 4, seedCost: 60000, yieldQty: 5, unlock: 26, season: [3, 6] },
  { id: 'cam', productId: 'x_cam', name: 'Cam', icon: '🍊', days: 10, regrowDays: 4, seedCost: 55000, yieldQty: 6, unlock: 28, season: [11, 2] },
  { id: 'vai', productId: 'x_vai', name: 'Vải thiều', icon: '🍒', days: 10, regrowDays: 3, seedCost: 70000, yieldQty: 6, unlock: 32, season: [5, 7] },
  { id: 'nhan', productId: 'x_nhan', name: 'Nhãn', icon: '🍇', days: 11, regrowDays: 4, seedCost: 72000, yieldQty: 6, unlock: 32, season: [7, 9] },
  { id: 'mit', productId: 'x_mit', name: 'Mít', icon: '🍍', days: 14, regrowDays: 5, seedCost: 90000, yieldQty: 3, unlock: 36 },
  { id: 'buoi', productId: 'x_buoi', name: 'Bưởi', icon: '🍐', days: 13, regrowDays: 5, seedCost: 80000, yieldQty: 4, unlock: 38, season: [12, 2] },
];

/** Tháng thật (1–12) của ngày game: ngày 1 của ván là 1/1 theo data/calendar. */
export const monthOf = (day: number) => dateOfDoy(((day - 1) % YEAR_DAYS + YEAR_DAYS) % YEAR_DAYS).month;
const monthInSeason = (m: number, [from, to]: [number, number]) => (from <= to ? m >= from && m <= to : m >= from || m <= to);
/** Cây có mùa vụ này hôm nay có đang đúng vụ không (cây không ghi mùa vụ thì quanh năm). */
export const inSeason = (def: CropDef, day: number) => !def.season || monthInSeason(monthOf(day), def.season);
/** Trái đúng mùa vụ sai trái gấp rưỡi — mùa tính theo ngày chín (`ripenDay`, thiếu thì lấy `day`). */
export const SEASON_YIELD = 1.5;
/** Số món thu được một cây (cây có mùa vụ chỉ sai gấp rưỡi khi ngày CHÍN đúng vụ — để chín chờ mùa không ăn; hàm thuần dùng cho cả chủ lẫn phụ trại). */
export const harvestYield = (def: CropDef, day: number, ripenDay?: number) =>
  Math.round(def.yieldQty * (def.season && inSeason(def, ripenDay ?? day) ? SEASON_YIELD : 1));

/** Công trình trại: mua bằng tiền, nâng sao bằng tiền + gỗ + đá nhặt từ dọn trại (kiểu HappyTown). */
export type FarmBuildingId = 'tuoi_tu_dong' | 'nha_luoi' | 'bai_tha' | 'bu_nhin';

export interface FarmBuildingDef {
  id: FarmBuildingId;
  name: string;
  icon: string;
  /** Giá mua (ra sao 1). */
  cost: number;
  unlock: number;
  /** Chi phí lên sao tiếp theo theo sao hiện tại (index 1 = lên sao 2, index 2 = lên sao 3). */
  upgrades: { money: number; wood: number; stone: number }[];
  /** Mô tả hiệu ứng cho bảng trại. */
  note: string;
}

export const FARM_BUILDINGS: Record<FarmBuildingId, FarmBuildingDef> = {
  bu_nhin: {
    id: 'bu_nhin', name: 'Bù nhìn mới + lưới chim', icon: '👕', cost: 6_000_000, unlock: 16,
    upgrades: [{ money: 4_000_000, wood: 6, stone: 4 }, { money: 6_000_000, wood: 10, stone: 6 }],
    note: 'Chim không dám mổ trộm trái: mỗi sao +6% cơ hội thu hoạch được gấp đôi (tối đa 18%)',
  },
  tuoi_tu_dong: {
    id: 'tuoi_tu_dong', name: 'Hệ tưới nhỏ giọt', icon: '💧', cost: 12_000_000, unlock: 18,
    upgrades: [{ money: 8_000_000, wood: 6, stone: 4 }, { money: 12_000_000, wood: 10, stone: 6 }],
    note: 'Máy bơm cạnh giếng tự chảy mỗi tối, cả vườn đủ nước khỏi tưới tay; sao thêm cây lớn nhanh thêm 5%',
  },
  bai_tha: {
    id: 'bai_tha', name: 'Bãi thả cỏ', icon: '🌿', cost: 9_000_000, unlock: 20,
    upgrades: [{ money: 6_000_000, wood: 6, stone: 4 }, { money: 9_000_000, wood: 10, stone: 6 }],
    note: 'Vật nuôi chạy bãi tự kiếm ăn: mỗi sao bớt 10% cám, gia cầm đẻ dễ thêm 8%, bò/dê cho thêm 5% sữa',
  },
  nha_luoi: {
    id: 'nha_luoi', name: 'Nhà lưới', icon: '🏡', cost: 30_000_000, unlock: 22,
    upgrades: [{ money: 20_000_000, wood: 10, stone: 6 }, { money: 30_000_000, wood: 16, stone: 10 }],
    note: 'Lưới chắn côn trùng, sâu bệnh và giông bão: mỗi sao cây lớn thêm nửa ngày mỗi đêm, bão không còn sập luống',
  },
};

export const FARM_BUILDING_ORDER: FarmBuildingId[] = ['bu_nhin', 'tuoi_tu_dong', 'bai_tha', 'nha_luoi'];
/** Sao tối đa của công trình. */
export const FARM_BUILDING_MAX_STAR = 3;

/** Gỗ/đá là tài nguyên dọn trại, không phải hàng bán — chỉ dùng nâng sao công trình. */
export const DEBRIS_CAP = 12;

/** Cây lớn nhanh thêm bấy nhiêu PHẦN TRĂM nhờ hệ tưới trên sao 1 (5%/sao thêm). */
export const farmGrowthPct = (g: GardenState) => 0.05 * Math.max(0, (g.buildings?.tuoi_tu_dong ?? 0) - 1);
/** Nhà lưới cộng THÊM bấy nhiêu "ngày lớn" mỗi đêm (nửa ngày/sao) — cộng thẳng để thực sự rút ngắn
 *  chu kỳ 3–5 ngày của cây lâu năm thay vì % nhỏ xíu không vượt ngưỡng ngày nguyên. */
export const farmGrowthFlat = (g: GardenState) => 0.5 * (g.buildings?.nha_luoi ?? 0);
/** Có nhà lưới thì giông bão không sập luống (lưới che giàn). */
export const farmStormSafe = (g: GardenState) => (g.buildings?.nha_luoi ?? 0) > 0;
/** Cơ hội thu hoạch gấp đôi nhờ bù nhìn (6%/sao, tối đa 18%). */
export const farmCritChance = (g: GardenState) =>
  Math.min(0.18, 0.06 * (g.buildings?.bu_nhin ?? 0));
/** Gia cầm đẻ thêm bấy nhiêu xác suất nhờ bãi thả (8%/sao). */
export const farmLayBoost = (g: GardenState) => 0.08 * (g.buildings?.bai_tha ?? 0);
/** Bãi thả cho vật nuôi tự gặm cỏ: bớt bấy nhiêu phần cám mỗi ngày (10%/sao). */
export const farmGrazeDiscount = (g: GardenState) => 0.1 * (g.buildings?.bai_tha ?? 0);
/** Bò/dê chạy bãi cho thêm sữa: bấy nhiêu phần (5%/sao). */
export const farmMilkBoost = (g: GardenState) => 0.05 * (g.buildings?.bai_tha ?? 0);

/** Một luống: đang trồng gì, đã lớn được mấy "ngày tưới", hôm nay đã tưới chưa, đã bón phân chưa (1 lần/vụ). */
export interface Plot {
  crop: string | null;
  /** Ngày game gần nhất luống được tưới (tay hoặc mưa). */
  wateredDay: number;
  /** Ngày gần nhất luống được bón phân (1 lần/vụ; cây lâu năm bón một lần lúc trồng là đủ). */
  fertilizedDay?: number;
  /** Ngày cây CHÍN — mùa vụ (×1,5) tính theo ngày này để chặn để chín chờ đúng vụ; bản lưu cũ thiếu thì lấy ngày thu. */
  ripeDay?: number;
  growth: number;
}

/** Một chuồng vật nuôi: số con, hôm nay đã cho ăn chưa, cám còn trong máng (kg) và sản phẩm chờ thu. */
export interface Pen {
  count: number;
  /** Ngày gần nhất cả đàn được cho ăn. */
  fedDay: number;
  /** Cám còn trong máng (kg của loại cám loài này ăn). */
  feedKg: number;
  /** Sản phẩm chưa thu: trứng (quả) với gà/vịt/ngỗng, lốc sữa với bò/dê. */
  pending: number;
  /** Vỗ béo (heo, gà Đông Tảo): số ngày lứa hiện tại đã được cho ăn no (đủ fattenDays là xuất chuồng được). */
  fattened?: number;
  /** Số con mua vào GIỮA kỳ vỗ béo — lứa chín không tính thịt mấy con này, chỉ nhận lại giá giống. */
  lateJoins?: number;
}

export interface GardenState {
  plots: Plot[];
  /** Chuồng theo loài (mua con đầu tiên là có chuồng). */
  pens: Partial<Record<AnimalKind, Pen>>;
  /** Số món "nhà trồng/nhà nuôi" còn trong kho (bán được giá hơn): id sản phẩm → số món. */
  homegrown: Record<string, number>;
  /** Bậc đất đang mở (index trong LAND_TIERS). */
  land: number;
  /** Đơn quán xóm đặt nông sản (null = đang trống, hết hạn/sau khi giao sẽ có đơn mới). */
  farmOrder: FarmOrder | null;
  /** Công trình đã mua: số sao (1–3), chưa có nghĩa chưa mua. */
  buildings: Partial<Record<FarmBuildingId, number>>;
  /** Gỗ/đá nhặt từ dọn trại, dành nâng sao công trình. */
  wood: number;
  stone: number;
  /** Cỏ dại cành rụng còn chưa dọn (mọc lại mỗi đêm, bão rơi nhiều). */
  debris: number;
}

/** Đơn quán xóm đặt nông sản: giao đủ đúng hạn thì được giá hời hơn giá bán thường. */
export interface FarmOrder {
  id: number;
  from: string;
  items: { productId: string; qty: number }[];
  dueDay: number;
  /** Hệ số giá hời so với giá bán thường. */
  bonus: number;
}

export const FARM_ORDER_BONUS = 1.25;
/** Đơn sống chừng này ngày rồi tới hạn. */
export const FARM_ORDER_DAYS = 2;
/** Mở đơn quán xóm từ cấp này (khi trại đã khang trang). */
export const FARM_ORDER_UNLOCK = 16;

/** Quán trong xóm hay đặt nông sản của trại. */
export const FARM_BUYERS = ['Quán Cơm Bà Ba', 'Lò Bánh Chị Hoa', 'Quán Nhậu Anh Tư', 'Tiệm Bánh Mì Chú Sáu', 'Cơm Tấm Cô Sáu', 'Quán Chè Bà Tư', 'Lẩu Dê Anh Sáu'];
/** Món quán đặt (nông sản nhà trồng/nhà nuôi). */
export const FARM_ORDER_POOL = ['trung', 'trung_vit', 'trung_goos', 'sua_tuoi', 'sua_de', 'rau', 'bap', 'mia', 'traicay', 'x_chuoi', 'x_vai', 'x_buoi', 'x_thit_heo', 'thit_ga_dt'];

let farmOrderId = 1;
/** Tạo đơn mới cho quán xóm: 2 món trong pool, số lượng 3–8, hạn 2 ngày. */
export function makeFarmOrder(day: number, rng: () => number = Math.random): FarmOrder {
  const pool = [...FARM_ORDER_POOL];
  const items: { productId: string; qty: number }[] = [];
  for (let i = 0; i < 2; i++) {
    const productId = pool.splice(Math.floor(rng() * pool.length), 1)[0];
    items.push({ productId, qty: 3 + Math.floor(rng() * 6) });
  }
  return { id: farmOrderId++, from: FARM_BUYERS[Math.floor(rng() * FARM_BUYERS.length)], items, dueDay: day + FARM_ORDER_DAYS, bonus: FARM_ORDER_BONUS };
}

export const emptyPlot = (): Plot => ({ crop: null, growth: 0, wateredDay: 0 });

export const newGarden = (): GardenState => ({
  plots: Array.from({ length: landPlots(0) }, emptyPlot),
  pens: {},
  homegrown: {},
  land: 0,
  farmOrder: null,
  buildings: {},
  wood: 0,
  stone: 0,
  debris: 0,
});

/** Khách trả thêm bấy nhiêu phần giá cho món nhà trồng (nêu ở gợi ý giá). */
export const HOMEGROWN_PREMIUM = 0.2;
/** Bón phân cộng thêm bấy nhiêu phần THỜI GIAN CÒN LẠI của vụ (tối thiểu 1 ngày). */
export const FERTILIZER_BOOST = 0.3;
/** Món phân bón (bao 5 kg, bón được một luống một vụ). */
export const FERTILIZER_PRODUCT = 'phan_bon';
/** Cấy bấy nhiêu quả gói thành một vỉ trứng (gà/vịt/ngỗng). */
export const EGG_PER_TRAY = 10;

/**
 * Một đêm trại: cây lớn theo tưới/mưa (bão có thể phá), vật nuôi được cho ăn thì cho sản phẩm
 * (gà/vịt/ngỗng đẻ theo xác suất, bò/dê cho sữa chắc chắn, heo/gà Đông Tảo thêm một ngày vỗ béo),
 * đói thì nhịn. Hệ tưới tự chảy cho cả vườn; nhà lưới/bãi thả cộng hiệu ứng theo sao. Cỏ dại
 * cành rụng mọc lại sau đêm (bão rơi nhiều) — dọn lấy gỗ đá.
 */
export function gardenNight(
  g: GardenState,
  ctx: { day: number; weather: Weather; fed: Partial<Record<AnimalKind, boolean>>; rng?: () => number },
): { garden: GardenState; news: string[] } {
  const rng = ctx.rng ?? Math.random;
  const news: string[] = [];
  const rain = ctx.weather === 'rain' || ctx.weather === 'storm';
  const pct = farmGrowthPct(g);
  const flat = farmGrowthFlat(g);
  const stormSafe = farmStormSafe(g);
  const autoWater = (g.buildings?.tuoi_tu_dong ?? 0) > 0;
  let dryLeft = 0;
  let stormSaved = false;
  const plots = g.plots.map((p) => {
    if (!p.crop) return p;
    if (ctx.weather === 'storm' && rng() < 0.4) {
      if (stormSafe) { stormSaved = true; return { ...p, wateredDay: p.wateredDay }; }
      news.push(`⛈️ Giông bão làm sập luống ${cropById(p.crop).name}, phải trồng lại`);
      return emptyPlot();
    }
    if (p.wateredDay !== ctx.day && !rain) dryLeft++;
    const watered = p.wateredDay === ctx.day || rain || autoWater;
    const grown = (watered ? 1 : 0.4) * (1 + pct) + flat;
    const wasRipe = p.growth >= cropById(p.crop).days;
    const growth = p.growth + grown;
    // Ghi ngày cây chín để tính mùa vụ (không cho để chín chờ đúng vụ ăn ×1,5)
    const ripeDay = !wasRipe && growth >= cropById(p.crop).days ? ctx.day : p.ripeDay;
    return { ...p, growth, ripeDay, wateredDay: rain || (autoWater && p.wateredDay !== ctx.day) ? ctx.day : p.wateredDay };
  });
  if (ctx.weather === 'storm' && stormSaved) news.push('🏡 Giông bão qua trại nhưng nhà lưới che giàn, vườn vẫn nguyên');
  if (rain) news.push('🌧️ Mưa đêm qua tưới hộ vườn, sáng nay khỏi tưới');
  else if (autoWater && dryLeft > 0) news.push('💧 Hệ tưới nhỏ giọt tự chảy suốt đêm, cả vườn đủ nước');
  const layBoost = farmLayBoost(g);
  const milkBoost = farmMilkBoost(g);
  const pens: GardenState['pens'] = {};
  for (const kind of ANIMAL_ORDER) {
    const pen = g.pens[kind];
    if (!pen?.count) continue;
    const def = ANIMALS[kind];
    let next: Pen = { ...pen };
    if (ctx.fed[kind]) {
      if (def.layChance !== undefined) {
        const chance = Math.min(0.95, def.layChance + layBoost);
        let laid = 0;
        for (let i = 0; i < pen.count; i++) if (rng() < chance) laid++;
        next.pending = pen.pending + laid;
        if (laid) news.push(`${def.icon} ${def.name.toLowerCase()} đẻ ${laid} quả, chuồng đang có ${next.pending} quả chờ lấy`);
      } else if (def.outputPerDay !== undefined) {
        const out = Math.round(def.outputPerDay * pen.count * (1 + milkBoost));
        next.pending = pen.pending + out;
        news.push(`${def.icon} ${def.name.toLowerCase()} cho ${out} lốc sữa, thùng vắt đang có ${next.pending} lốc`);
      } else {
        next.fattened = (pen.fattened ?? 0) + 1;
        if (next.fattened === def.fattenDays) news.push(`${def.icon} ${def.name} đã đủ ngày vỗ béo — xuất chuồng được rồi, vô bảng Trang trại mà bán`);
      }
    } else if (def.fattenDays === undefined) {
      news.push(`${def.icon} ${def.name.toLowerCase()} đói không ra sản phẩm — nhớ cho ăn cám mỗi ngày`);
    } else {
      news.push(`${def.icon} ${def.name.toLowerCase()} đói hôm nay không lớn — cho ăn đều mới mau béo`);
    }
    pens[kind] = next;
  }
  // Cỏ dại, cành rụng sau đêm (bão rơi nhiều hơn) — dọn lấy gỗ đá
  const extraDebris = ctx.weather === 'storm' ? 4 : rng() < 0.6 ? 1 : 0;
  const debris = Math.min(DEBRIS_CAP, g.debris + extraDebris);
  return { garden: { ...g, plots, pens, debris }, news };
}

/**
 * Chỗ của phụ trại lo hộ mỗi tối: tưới các luống còn khô, đổ cám từ kho cho các chuồng còn đói
 * (kho hết cám thì thôi, không mua lẻ), gom sản phẩm chờ thu (trứng đủ vỉ, sữa) và thu hoạch
 * luống đã chín (kể cơ hội gấp đôi của bù nhìn và mùa vụ sai trái). Trả về danh sách món đưa vào
 * kho — endDay sẽ putStock và dán nhãn nhà trồng.
 */
export function farmhandChores(
  g: GardenState,
  storage: Record<string, number>,
  day: number,
  opts: { crit?: number; rng?: () => number } = {},
): { garden: GardenState; picked: { productId: string; qty: number }[]; fedKinds: AnimalKind[]; feedUsed: { productId: string; bags: number }[]; news: string[] } {
  const rng = opts.rng ?? Math.random;
  const crit = opts.crit ?? 0;
  const news: string[] = [];
  const picked: { productId: string; qty: number }[] = [];
  const fedKinds: AnimalKind[] = [];
  const feedUsed: { productId: string; bags: number }[] = [];
  // Tưới hộ
  let watered = 0;
  const plots = g.plots.map((p) => {
    if (!p.crop || p.wateredDay === day) return p;
    watered++;
    return { ...p, wateredDay: day };
  });
  if (watered) news.push(`đã tưới ${watered} luống`);
  // Cho ăn hộ: máng thiếu thì đổ bao cám từ kho (bãi thả cho tự gặm cỏ bớt cám)
  const graze = 1 - farmGrazeDiscount(g);
  const pens: GardenState['pens'] = {};
  for (const kind of ANIMAL_ORDER) {
    const pen = g.pens[kind];
    if (!pen?.count) continue;
    const def = ANIMALS[kind];
    let feedKg = pen.feedKg;
    let bags = 0;
    const need = pen.count * def.feedKgPerDay * graze;
    if (pen.fedDay !== day && feedKg < need) {
      const short = need - feedKg;
      const bagsNeeded = Math.ceil(short / def.feedBagKg - 1e-9);
      const have = storage[def.feedProduct] ?? 0;
      bags = Math.min(bagsNeeded, have);
      feedKg += bags * def.feedBagKg;
      if (bags) {
        const used = feedUsed.find((f) => f.productId === def.feedProduct);
        if (used) used.bags += bags;
        else feedUsed.push({ productId: def.feedProduct, bags });
      }
    }
    const fed = pen.fedDay === day || feedKg >= need;
    pens[kind] = { ...pen, fedDay: fed ? day : pen.fedDay, feedKg: Math.max(0, feedKg - (fed ? need : 0)) };
    if (fed && pen.fedDay !== day) fedKinds.push(kind);
    else if (!fed) news.push(`kho hết cám, chuồng ${def.name.toLowerCase()} nhịn`);
  }
  // Gom trứng đủ vỉ + sữa về kho (loài vỗ béo không gom — chủ quyết lúc xuất chuồng)
  for (const kind of ANIMAL_ORDER) {
    const pen = pens[kind];
    if (!pen?.count) continue;
    const def = ANIMALS[kind];
    if (def.outputPerDay !== undefined) {
      if (pen.pending > 0) {
        picked.push({ productId: def.productId, qty: pen.pending });
        pens[kind] = { ...pen, pending: 0 };
      }
    } else if (def.layChance !== undefined) {
      const trays = Math.floor(pen.pending / EGG_PER_TRAY);
      if (trays > 0) {
        picked.push({ productId: def.productId, qty: trays });
        pens[kind] = { ...pen, pending: pen.pending - trays * EGG_PER_TRAY };
      }
    }
  }
  // Thu hoạch luống chín (bù nhìn may cho thu gấp đôi; mùa vụ tính theo ngày CHÍN của luống)
  let harvested = 0;
  let doubled = 0;
  const plots2 = plots.map((p) => {
    if (!p.crop) return p;
    const def = cropById(p.crop);
    if (p.growth < def.days) return p;
    let qty = harvestYield(def, day, p.ripeDay);
    if (rng() < crit) {
      qty *= 2;
      doubled++;
    }
    harvested += qty;
    picked.push({ productId: def.productId, qty });
    // Cây lâu năm giữ lại, chỉ hạ về đầu chu kỳ ra trái tiếp (đã bón lúc trồng thì khỏi bón lại)
    return def.regrowDays ? { ...p, growth: def.days - def.regrowDays, ripeDay: undefined } : emptyPlot();
  });
  if (harvested) news.push(`thu hoạch ${harvested} món${doubled ? ` (bù nhìn may: ${doubled} luống thu gấp đôi)` : ''}`);
  return { garden: { ...g, plots: plots2, pens }, picked, fedKinds, feedUsed, news };
}

/** Luống đã đủ lớn để thu hoạch. */
export const plotReady = (p: Plot) => !!p.crop && p.growth >= cropById(p.crop).days;
/** Loài vỗ béo đã đủ ngày cho ăn no để xuất chuồng. */
export const fattenReady = (kind: AnimalKind, pen: Pen | undefined) =>
  !!pen?.count && (pen.fattened ?? 0) >= (ANIMALS[kind].fattenDays ?? 0);

/** Mô tả luống để vẽ trong bảng trại. */
export function plotLabel(p: Plot, day: number): string {
  if (!p.crop) return 'Đất trống';
  const def = cropById(p.crop);
  const left = Math.max(0, Math.ceil(def.days - p.growth));
  if (left === 0) return `${def.icon} ${def.name} — chờ thu hoạch`;
  const watered = p.wateredDay === day ? 'đã tưới' : 'chưa tưới';
  return `${def.icon} ${def.name} — còn ~${left} ngày (${watered})`;
}
