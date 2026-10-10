/**
 * Khu phố mở rộng quanh tiệm tạp hóa (chỉ môi trường + sinh hoạt nền, không đổi bản đồ chơi, va chạm hay save).
 * Mọi tọa độ `*Tile*`/`x0..y1` ở đây tính theo ô 32 px trong HỆ TỌA ĐỘ THẾ GIỚI sẵn có (ô (0,-6) là góc trên-trái bản đồ chơi,
 * đường chính nằm ở hàng 13..15). Dữ liệu thuần: renderer và game-core cùng đọc, không import Pixi.
 */
import { AWNING_SPANS, MAIN_STORE_BOUNDS, awningShelterBand } from './buildings';
import { PLAY_REGION } from './world/world-grid';
import { RECLAMATION_WAVES } from './world/waves';
import { MAP_HEIGHT, MAP_ORIGIN_Y, MAP_WIDTH } from './map';

const T = 32;

// ---------------------------------------------------------------------------------------------------------------------
// Zoom và mức chi tiết (LOD)
// ---------------------------------------------------------------------------------------------------------------------

/**
 * Các mức zoom mốc (nút +/− nhảy theo đây; cuộn chuột/pinch zoom liên tục trong [ZOOM_MIN, ZOOM_MAX]). Ở mốc 0,5 / 1 / 2 / 3
 * mỗi điểm ảnh sprite thành 1/2, 1, 2 hoặc 3 điểm ảnh màn hình đều nhau. Mức 0,5 là "xa": thấy cả khu phố.
 */
export const ZOOM_LEVELS: readonly number[] = [0.5, 1, 2, 3];
export const ZOOM_MIN = ZOOM_LEVELS[0];
export const ZOOM_MAX = ZOOM_LEVELS[ZOOM_LEVELS.length - 1];

/** Mức zoom hợp lệ gần nhất (lấy theo tỉ lệ log để 0,75 → 0,5 hoặc 1 đều hợp lý). Giá trị không hữu hạn trả về 1. */
export function snapZoom(zoom: number): number {
  if (!Number.isFinite(zoom) || zoom <= 0) return 1;
  let best = ZOOM_LEVELS[0];
  let bestD = Infinity;
  for (const level of ZOOM_LEVELS) {
    const d = Math.abs(Math.log(zoom / level));
    if (d < bestD) { best = level; bestD = d; }
  }
  return best;
}

export type DetailLevel = 'near' | 'mid' | 'far';

/** Gần (≥2×): đầy đủ chi tiết. Vừa (1×): hẻm + đường. Xa (≤0,5×): cả khu phố, bớt chi tiết. */
export function detailForZoom(zoom: number): DetailLevel {
  return zoom >= 2 ? 'near' : zoom >= 1 ? 'mid' : 'far';
}

/** Tần số cập nhật hành vi NPC nền (Hz) theo mức chi tiết; NPC ngoài khung hình luôn chạy ở tần số thấp nhất. */
export const NEIGHBORHOOD_LOD = {
  behaviorHz: { near: 60, mid: 30, far: 12, offscreen: 4 } as Record<DetailLevel | 'offscreen', number>,
  /** Đi quá khung hình bao nhiêu px thế giới vẫn coi là "trong tầm nhìn" (đệm tránh bật/tắt đột ngột). */
  viewMarginPx: 96,
} as const;

// ---------------------------------------------------------------------------------------------------------------------
// Phạm vi khu phố và chất lượng
// ---------------------------------------------------------------------------------------------------------------------

/** Vùng khu phố vẽ chi tiết (ô). Ngoài vùng này chỉ còn nền cây xanh/đồi để không lộ mép bản đồ. */
export const NEIGHBORHOOD_TILES = { x0: -44, x1: 80, y0: -38, y1: 44 } as const;
export const NEIGHBORHOOD_PX = {
  x0: NEIGHBORHOOD_TILES.x0 * T, x1: NEIGHBORHOOD_TILES.x1 * T, y0: NEIGHBORHOOD_TILES.y0 * T, y1: NEIGHBORHOOD_TILES.y1 * T,
} as const;
/** Bản đồ chơi (px) để nơi khác loại trừ. */
export const PLAY_MAP_PX = { x0: PLAY_REGION.x0 * T, y0: MAP_ORIGIN_Y * T, x1: (PLAY_REGION.x0 + MAP_WIDTH) * T, y1: (MAP_ORIGIN_Y + MAP_HEIGHT) * T } as const;

export type NeighborhoodQuality = 'low' | 'medium' | 'high';

/** Ngân sách theo chất lượng: số NPC, số xe, chim, và có vẽ chi tiết xa (cửa sổ, dây điện, vật nhỏ) không. */
export const NEIGHBORHOOD_QUALITY = {
  low: { npc: 0.35, vehicles: 0.45, birds: 0.25, farDetail: false, bubbles: 2 },
  medium: { npc: 0.65, vehicles: 0.7, birds: 0.6, farDetail: true, bubbles: 3 },
  high: { npc: 1, vehicles: 1, birds: 1, farDetail: true, bubbles: 5 },
} as const satisfies Record<NeighborhoodQuality, { npc: number; vehicles: number; birds: number; farDetail: boolean; bubbles: number }>;

/** Số NPC nền tối đa (chất lượng cao) theo vòng khoảng cách tới cửa tiệm; xa cửa tiệm càng nhiều NPC nền đơn giản. */
export const NPC_BUDGET = { near: 10, middle: 22, far: 30 } as const;
export type NpcRing = keyof typeof NPC_BUDGET;
export const NPC_RING_RADIUS_PX = { near: 640, middle: 1500 } as const;
/** Số xe tối đa cùng lúc trên toàn bộ đường (chất lượng cao). */
export const VEHICLE_BUDGET = 24;

// ---------------------------------------------------------------------------------------------------------------------
// Thành phố lớn dần theo đợt khai hoang (open-world-land-reclamation D7, PROVISIONAL)
// ---------------------------------------------------------------------------------------------------------------------

/** Cấp thành phố tối đa 0..5. */
export const CITY_TIER_MAX = 5;

/**
 * Cấp thành phố 0..5 theo tiến độ "mở thế giới" = số đợt đã mở (ngoài đợt 0) + số tòa đã mở.
 * ĐƠN ĐIỆU tăng theo cả hai biến: thêm đợt hoặc thêm tòa không bao giờ làm tier giảm.
 * D7: tier CHỈ đổi cảnh quan (NPC/xe/tầng nhà trang trí), KHÔNG đổi kinh tế.
 */
export function cityTierFrom(openedWaves: readonly string[], buildingCount: number): number {
  const openedCount = openedWaves.filter((id) => /^w\d+$/.test(id) && id !== 'w0').length;
  const buildingScore = buildingCount >= 16 ? 2 : buildingCount >= 8 ? 1 : 0;
  return Math.min(CITY_TIER_MAX, openedCount + buildingScore);
}

const CITY_GROWTH_MIN = 0.6;
const CITY_GROWTH_MAX = 1.4;

const cityTierClamped = (tier: number): number => Math.max(0, Math.min(CITY_TIER_MAX, Number.isFinite(tier) ? tier : 0));

/** Trần NC/xe dưới (tier 0) 0,6 ×, trên (tier 5) 1,4 ×; nội suy tuyến tính theo tier (D7, PROVISIONAL — chốt sau playtest). */
export function cityGrowthFactor(tier: number): number {
  const t = cityTierClamped(tier);
  return CITY_GROWTH_MIN + (CITY_GROWTH_MAX - CITY_GROWTH_MIN) * (t / CITY_TIER_MAX);
}

/**
 * Số tầng tối thiểu tăng thêm cho nhà trang trí theo tier (D7, PROVISIONAL): tier <3 → +0, tier 3–4 → +1, tier 5 → +2.
 * Bản thân tầng nền vẫn deterministic theo seed; hệ số này cộng thêm, biến nhà 1 tầng thành 2–3 tầng.
 */
export function cityFloorBonus(tier: number): number {
  const t = cityTierClamped(tier);
  return t >= 5 ? 2 : t >= 3 ? 1 : 0;
}

/** Ngân sách NPC nền theo tier: bản nhân độc lập của `NPC_BUDGET` (KHÔNG sửa hằng số gốc, vốn có hiệu lực toàn cục). */
export function scaledNpcBudget(tier: number): { near: number; middle: number; far: number } {
  const f = cityGrowthFactor(tier);
  return {
    near: Math.round(NPC_BUDGET.near * f),
    middle: Math.round(NPC_BUDGET.middle * f),
    far: Math.round(NPC_BUDGET.far * f),
  };
}

/** Ngân sách xe theo tier: bản nhân của `VEHICLE_BUDGET` (KHÔNG sửa hằng số gốc). */
export function scaledVehicleBudget(tier: number): number {
  return Math.round(VEHICLE_BUDGET * cityGrowthFactor(tier));
}

/** Điểm trước cửa tiệm chính (vỉa hè phía bắc đường chính), nơi NPC ghé mua đồ. */
export const SHOP_FRONT = { x: ((MAIN_STORE_BOUNDS.left + MAIN_STORE_BOUNDS.right + 1) / 2) * T - 16, y: 12 * T - 6 } as const;

export const npcRingOf = (x: number, y: number): NpcRing => {
  const d = Math.hypot(x - SHOP_FRONT.x, y - SHOP_FRONT.y);
  return d < NPC_RING_RADIUS_PX.near ? 'near' : d < NPC_RING_RADIUS_PX.middle ? 'middle' : 'far';
};

// ---------------------------------------------------------------------------------------------------------------------
// Đường
// ---------------------------------------------------------------------------------------------------------------------

export type RoadKind = 'main' | 'collector' | 'residential';

/** Đường ngang (đông–tây), 3 hàng ô: hàng đầu = làn trái (đi sang tây), hàng giữa = vạch, hàng cuối = làn phải (đi sang đông). */
export interface RoadDef {
  id: string;
  kind: RoadKind;
  /** Hàng ô trên cùng của lòng đường (đường chính = 13). */
  topRow: number;
  /** Mật độ giao thông tương đối so với đường chính. */
  density: number;
  /** Hệ số tốc độ cho phép (nhân tốc độ cơ bản của xe). */
  speedMul: number;
  /** Trục xe chạy: thiếu = 'x' (đường ngang); 'y' = đường dọc, khi đó `topRow` là cột ô trái của lòng đường (3 cột). */
  axis?: 'x' | 'y';
  /** Đường dọc: đoạn xe chạy (px theo trục y) từ chỗ sinh xe phía bắc tới chỗ biến mất phía nam. */
  span?: { min: number; max: number };
}

export const TRAFFIC_ROADS: readonly RoadDef[] = [
  { id: 'main', kind: 'main', topRow: 13, density: 1, speedMul: 1 },
  { id: 'school', kind: 'collector', topRow: -20, density: 0.45, speedMul: 0.9 },
  { id: 'south', kind: 'residential', topRow: 25, density: 0.22, speedMul: 0.75 },
];
export const ROAD_MAP: Readonly<Record<string, RoadDef>> = Object.fromEntries(TRAFFIC_ROADS.map((r) => [r.id, r]));

/** Tọa độ y (px) của làn xe trên đường: làn trái đi sang tây, làn phải đi sang đông (đường chính khớp 428/467). */
export const roadLaneY = (road: RoadDef, direction: 'left' | 'right'): number => (road.topRow + (direction === 'left' ? 0.4 : 1.6)) * T;

/** Đường dọc nối các đường ngang (chỉ hình ảnh; người đi bộ đi dọc vỉa hè của chúng). */
export interface AvenueDef { id: string; x0: number; x1: number; y0: number; y1: number }
export const AVENUES: readonly AvenueDef[] = [
  { id: 'west', x0: -7, x1: -4, y0: -20, y1: 44 },
  { id: 'east', x0: 38, x1: 41, y0: -20, y1: 44 },
];

/** Đường dọc cho xe chạy (xe đi bên phải: chiều 'right' = xuôi nam chạy nửa tây, 'left' = ngược bắc chạy nửa đông). */
export const AVENUE_ROADS: readonly RoadDef[] = AVENUES.map((a) => ({
  id: `avenue-${a.id}`, kind: 'collector', topRow: a.x0, density: 0.35, speedMul: 0.85,
  axis: 'y', span: { min: a.y0 * T + 24, max: a.y1 * T },
}));

/** Mọi đường xe chạy được: đường ngang và đường dọc. */
export const VEHICLE_ROADS: readonly RoadDef[] = [...TRAFFIC_ROADS, ...AVENUE_ROADS];
export const VEHICLE_ROAD_MAP: Readonly<Record<string, RoadDef>> = Object.fromEntries(VEHICLE_ROADS.map((r) => [r.id, r]));

/** Tọa độ vuông góc với chiều chạy của làn: y (px) với đường ngang, x (px) với đường dọc (nửa tây xuôi nam, nửa đông ngược bắc). */
export const roadLaneCoord = (road: RoadDef, direction: 'left' | 'right'): number =>
  road.axis === 'y' ? (road.topRow + (direction === 'right' ? 0.75 : 2.25)) * T : roadLaneY(road, direction);

/**
 * Ngã tư có đèn: nơi đường dọc cắt hẳn đường ngang (đường dọc kéo dài cả hai phía; ngã ba đường trường không tính).
 * Hộp giao lộ gồm 3 cột lòng đường dọc + 2 cột vỉa hè hai bên (`crossLeft..crossRight`, px) × 3 hàng lòng đường ngang.
 * Vạch đi bộ qua đường ngang nằm ở hai cột vỉa hè; xe dừng trước vạch dừng cách mép hộp `STREET_VEHICLE_RULES.stopMarginPx`.
 */
export interface IntersectionDef {
  id: string;
  roadId: string;
  avenueId: string;
  /** Id đường xe chạy của đường dọc (trong `VEHICLE_ROADS`). */
  avenueRoadId: string;
  /** Mép trái/phải hộp giao lộ (px), đã gồm cột vỉa hè hai bên. */
  crossLeft: number;
  crossRight: number;
  /** Mép trên/dưới hộp giao lộ (px), đã gồm hàng vỉa hè bắc và nam của đường ngang. */
  crossTop: number;
  crossBottom: number;
  /** Mép trái/phải lòng đường dọc (px), không gồm vỉa hè. */
  avenueLeft: number;
  avenueRight: number;
  /** Mép trên lòng đường ngang (px) và mép dưới (px, hết 3 hàng). */
  roadTop: number;
  roadBottom: number;
  /** Lệch pha đèn (giây) so với đồng hồ chung, để các ngã tư không đổi đèn cùng lúc. */
  signalOffsetSec: number;
}

export const INTERSECTIONS: readonly IntersectionDef[] = TRAFFIC_ROADS.flatMap((road, ri) => AVENUES
  .filter((a) => road.topRow - 1 >= a.y0 && road.topRow + 4 <= a.y1)
  .map((a, ai): IntersectionDef => ({
    id: `${road.id}-${a.id}`,
    roadId: road.id,
    avenueId: a.id,
    avenueRoadId: `avenue-${a.id}`,
    crossLeft: (a.x0 - 1) * T,
    crossRight: (a.x1 + 1) * T,
    crossTop: (road.topRow - 1) * T,
    crossBottom: (road.topRow + 4) * T,
    avenueLeft: a.x0 * T,
    avenueRight: a.x1 * T,
    roadTop: road.topRow * T,
    roadBottom: (road.topRow + 3) * T,
    signalOffsetSec: 17 * ai + 11 * ri,
  })));

/** Biên spawn/despawn của xe trên đường (px): ngoài hẳn vùng nhìn thấy khi zoom xa nhất. */
export const TRAFFIC_ENTRY_MARGIN_PX = 140;
export const TRAFFIC_X_RANGE = { min: NEIGHBORHOOD_PX.x0 - TRAFFIC_ENTRY_MARGIN_PX, max: NEIGHBORHOOD_PX.x1 + TRAFFIC_ENTRY_MARGIN_PX } as const;

// ---------------------------------------------------------------------------------------------------------------------
// Mật độ giao thông theo giờ / thứ / thời tiết / loại đường
// ---------------------------------------------------------------------------------------------------------------------

/** Mật độ nền (0..1) theo giờ thập phân, nội suy tuyến tính. Đỉnh sáng 06:30–08:30, đỉnh chiều 17:00–19:30, đêm rất thưa. */
export const TRAFFIC_HOURLY: ReadonlyArray<readonly [number, number]> = [
  [0, 0.015], [5, 0.025], [5.5, 0.12], [6, 0.4], [6.5, 0.85], [7.5, 1], [8.5, 0.9], [9, 0.62], [10, 0.5],
  [16, 0.5], [16.75, 0.82], [17.25, 1], [19.5, 1], [20, 0.62], [21, 0.4], [22, 0.2], [24, 0.015],
];

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
function interpolate(table: ReadonlyArray<readonly [number, number]>, x: number): number {
  if (!Number.isFinite(x)) return table[0][1];
  if (x <= table[0][0]) return table[0][1];
  for (let i = 1; i < table.length; i++) {
    if (x <= table[i][0]) {
      const [x0, y0] = table[i - 1];
      const [x1, y1] = table[i];
      return lerp(y0, y1, (x - x0) / (x1 - x0));
    }
  }
  return table[table.length - 1][1];
}

/** Hệ số giao thông theo cường độ mưa 0..1: mưa nhẹ giảm ít, mưa to giảm nhiều, giông giảm mạnh. */
export const TRAFFIC_RAIN_FACTOR: ReadonlyArray<readonly [number, number]> = [[0, 1], [0.03, 0.97], [0.3, 0.88], [0.55, 0.65], [0.8, 0.38], [1, 0.28]];
export const clampUnit = (v: number): number => (Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0);
export const trafficRainFactor = (rain: number): number => interpolate(TRAFFIC_RAIN_FACTOR, clampUnit(rain));
/** Tốc độ xe giảm nhẹ khi mưa (đường ướt): nhân với tốc độ chạy. */
export const trafficRainSpeedFactor = (rain: number): number => 1 - 0.28 * clampUnit(rain);

/**
 * Mật độ giao thông 0..1 (>1 không có): giờ × thứ × thời tiết × loại đường.
 * `weekday` theo `weekdayOf` (5,6 = cuối tuần): đỉnh giờ đi làm xẹp lại, Chủ nhật thưa hơn.
 */
export function trafficDensity(hour: number, minute: number, weekday: number, rain: number, road: Pick<RoadDef, 'density'> = { density: 1 }): number {
  const h = (Number.isFinite(hour) ? hour : 12) + (Number.isFinite(minute) ? minute : 0) / 60;
  let base = interpolate(TRAFFIC_HOURLY, ((h % 24) + 24) % 24);
  if (weekday === 5) base = base > 0.8 ? 0.8 + (base - 0.8) * 0.5 : base * 0.95;
  else if (weekday === 6) base = (base > 0.8 ? 0.8 + (base - 0.8) * 0.3 : base) * 0.78;
  return clampUnit(base * trafficRainFactor(rain) * road.density);
}

export type StreetVehicleKind = 'motorbike' | 'car' | 'truck' | 'bicycle' | 'minibus';

/** Tỉ trọng loại xe theo giờ và loại đường (chưa chuẩn hóa). Xe tải/xe giao hàng nhiều ban ngày, xe đạp (học sinh) giờ đi học. */
export function vehicleMix(hour: number, kind: RoadKind, rain = 0): Record<StreetVehicleKind, number> {
  const h = ((Number.isFinite(hour) ? hour : 12) % 24 + 24) % 24;
  let w: Record<StreetVehicleKind, number>;
  if (h >= 6 && h < 9) w = { motorbike: 0.55, car: 0.17, truck: 0.1, bicycle: 0.1, minibus: 0.08 };
  else if (h >= 9 && h < 16.5) w = { motorbike: 0.4, car: 0.25, truck: 0.2, bicycle: 0.07, minibus: 0.08 };
  else if (h >= 16.5 && h < 20) w = { motorbike: 0.55, car: 0.25, truck: 0.07, bicycle: 0.07, minibus: 0.06 };
  else w = { motorbike: 0.45, car: 0.35, truck: 0.12, bicycle: 0.02, minibus: 0.06 };
  if (kind === 'residential') { w.minibus = 0; w.truck *= 0.5; w.bicycle *= 1.5; }
  else if (kind === 'collector') w.minibus *= 0.6;
  w.bicycle *= 1 - 0.8 * clampUnit(rain);
  return w;
}

/** Biến thể xe tải: dùng sprite xe giao hàng có sẵn (`truck_<kind>_<hướng>`). */
export const TRUCK_KINDS = ['dry_goods', 'beverage_sweets', 'refrigerated', 'fresh_produce'] as const;
/** Số kiểu ô tô (taxi vàng giữ làm kiểu 0): sedan/hatchback/SUV theo màu và dáng. */
export const CAR_VARIANTS = 6;

// ---------------------------------------------------------------------------------------------------------------------
// Bố cục: công trình, công viên, trường, chung cư
// ---------------------------------------------------------------------------------------------------------------------

export type LotKind = 'house' | 'shophouse' | 'apartment';

/** Một công trình dựng sẵn: `frontY` là hàng ô mép dưới mặt tiền (neo giữa-đáy), `x` là ô trái. */
export interface NeighborhoodLot {
  id: string;
  kind: LotKind;
  x: number;
  frontY: number;
  w: number;
  floors: number;
  /** 0.. : chọn màu tường, kiểu mái, chi tiết (xem renderer). */
  variant: number;
  /** Có sân/hàng rào trước nhà. */
  yard: boolean;
  /** Cửa chính (px thế giới), nơi NPC vào/ra khỏi nhà. */
  door: { x: number; y: number };
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Số biến thể nhà đã dựng sẵn (renderer có đúng ngần này khóa texture mỗi kiểu). */
export const HOUSE_VARIANTS = 28;
export const APARTMENT_VARIANTS = 3;

interface Band { id: string; frontY: number; x0: number; x1: number; kind: LotKind; minFloors: number; maxFloors: number; seed: number; skip?: ReadonlyArray<readonly [number, number]> }

const avenueSkips = AVENUES.map((a) => [a.x0 - 2, a.x1 + 2] as const);
const SCHOOL_X = { x0: 8, x1: 36 };

/** Các dải nhà: mỗi dải là một hàng nhà quay mặt xuống phía nam (nhìn thấy mặt tiền), nối ngang theo x. */
const BANDS: readonly Band[] = [
  { id: 'n1w', frontY: -22, x0: -42, x1: SCHOOL_X.x0 - 1, kind: 'house', minFloors: 1, maxFloors: 3, seed: 11, skip: avenueSkips },
  { id: 'n1e', frontY: -22, x0: SCHOOL_X.x1 + 1, x1: 78, kind: 'house', minFloors: 1, maxFloors: 3, seed: 12, skip: avenueSkips },
  // Hàng nhà ngay phía bắc bản đồ chơi, quay mặt xuống bãi cỏ sau tiệm.
  { id: 'n2', frontY: -7, x0: -42, x1: 78, kind: 'house', minFloors: 1, maxFloors: 3, seed: 21, skip: avenueSkips },
  { id: 's2', frontY: 24, x0: -42, x1: 78, kind: 'shophouse', minFloors: 2, maxFloors: 3, seed: 31, skip: [...avenueSkips, [10, 15]] },
  { id: 's3', frontY: 38, x0: -42, x1: 78, kind: 'house', minFloors: 1, maxFloors: 3, seed: 41, skip: avenueSkips },
];

function generateBand(band: Band): NeighborhoodLot[] {
  const rng = mulberry32(band.seed * 7919);
  const lots: NeighborhoodLot[] = [];
  let x = band.x0;
  let lastVariant = -1;
  let n = 0;
  while (x < band.x1 - 4) {
    const hit = band.skip?.find(([a, b]) => x + 5 > a && x < b);
    if (hit) { x = hit[1]; continue; }
    const w = 5 + Math.floor(rng() * 4); // 5..8 ô
    if (x + w > band.x1 + 1) break;
    if (band.skip?.some(([a, b]) => x + w > a && x < b)) { x += 1; continue; }
    let variant = Math.floor(rng() * HOUSE_VARIANTS);
    if (variant === lastVariant) variant = (variant + 7) % HOUSE_VARIANTS;
    lastVariant = variant;
    const floors = band.minFloors + Math.floor(rng() * (band.maxFloors - band.minFloors + 1));
    const yard = band.kind === 'house' && rng() < 0.45;
    lots.push({
      id: `${band.id}-${n++}`, kind: band.kind, x, frontY: band.frontY, w, floors, variant, yard,
      door: { x: (x + w / 2) * T, y: band.frontY * T + 6 },
    });
    x += w + (rng() < 0.3 ? 1 : 0);
  }
  return lots;
}

/** Ba khối chung cư ở phía đông, quay mặt xuống bãi đỗ xe. */
const APARTMENT_LOTS: readonly NeighborhoodLot[] = [42, 53, 64].map((x, i) => ({
  id: `apt-${i}`, kind: 'apartment' as const, x, frontY: 2, w: 10, floors: 6 - (i % 2), variant: i, yard: false,
  door: { x: (x + 5) * T, y: 2 * T + 8 },
}));

export const NEIGHBORHOOD_LOTS: readonly NeighborhoodLot[] = [...BANDS.flatMap(generateBand), ...APARTMENT_LOTS];

/**
 * (OpenSpec `open-world-land-reclamation` 1.3) Nhà trang trí còn lại khi các đợt `openedWaves` đã khai hoang:
 * bỏ nhà có hàng nền mặt tiền (`frontY`, các ô x..x+w−1) nằm trong vùng của một đợt đã mở. W0 là bản đồ chơi
 * (không trùng nhà nào) nên `['w0']`/rỗng giữ nguyên toàn bộ. Thuần; chưa nối renderer/va chạm (task 2.1/4.x).
 */
export function decorLotsOutsideWaves(openedWaves: readonly string[]): readonly NeighborhoodLot[] {
  const regions = RECLAMATION_WAVES.filter((w) => openedWaves.includes(w.id)).map((w) => w.region);
  if (regions.length === 0) return NEIGHBORHOOD_LOTS;
  return NEIGHBORHOOD_LOTS.filter((lot) => !regions.some((r) => lot.x <= r.x1 && lot.x + lot.w - 1 >= r.x0 && lot.frontY >= r.y0 && lot.frontY <= r.y1));
}

/** Id các nhà trang trí bị ẩn (nằm trong vùng đợt đã mở) — dùng cho va chạm/đồ vật trước nhà. */
export function hiddenDecorLotIds(openedWaves: readonly string[]): ReadonlySet<string> {
  const visible = new Set(decorLotsOutsideWaves(openedWaves).map((l) => l.id));
  return new Set(NEIGHBORHOOD_LOTS.filter((l) => !visible.has(l.id)).map((l) => l.id));
}

/** Hình chữ nhật (ô). */
export interface TileRect { x0: number; y0: number; x1: number; y1: number }

export const PARK = {
  /** Toàn bộ công viên (ngay phía tây bản đồ chơi, cách đường dọc phía tây một dải hàng rào). */
  area: { x0: -30, y0: -6, x1: -8, y1: 10 } as TileRect,
  garden: { x0: -30, y0: -6, x1: -22, y1: 1 } as TileRect,
  pond: { x0: -18, y0: -3, x1: -12, y1: 2 } as TileRect,
  playground: { x0: -21, y0: -6, x1: -16, y1: -3 } as TileRect,
  /** Chòi nghỉ (mái che, trú mưa). */
  pavilion: { x: -13, y: 5 },
  /** Cổng phía nam ra vỉa hè đường chính, cổng phía đông ra đường dọc phía tây. */
  gateSouth: { x: -19, y: 10 },
  gateEast: { x: -8, y: 3 },
} as const;

/** Ghế đá (ô, neo giữa-đáy). */
export const PARK_BENCHES: ReadonlyArray<{ x: number; y: number }> = [
  { x: -27, y: 6 }, { x: -24, y: 6 }, { x: -16, y: 6 }, { x: -10, y: 8 }, { x: -22, y: 4 }, { x: -14, y: 1 }, { x: -26, y: 9 },
];
export const PARK_LAMPS: ReadonlyArray<{ x: number; y: number }> = [{ x: -28, y: 5 }, { x: -22, y: 5 }, { x: -15, y: 5 }, { x: -9, y: 1 }, { x: -25, y: 9 }];
/** Đường dạo trong công viên (ô): dải lát đá. Phần tử thứ hai là đường ngang chính (hàng 5..7). */
export const PARK_PATHS: readonly TileRect[] = [
  { x0: -20, y0: 4, x1: -18, y1: 11 }, { x0: -29, y0: 5, x1: -9, y1: 7 }, { x0: -9, y0: 2, x1: -8, y1: 5 }, { x0: -23, y0: 0, x1: -22, y1: 6 }, { x0: -14, y0: 0, x1: -13, y1: 6 },
];

export const SCHOOL = {
  /** Toàn khu trường: dãy nhà phía bắc, sân phía nam, hàng rào ở rìa, cổng quay xuống đường trường. */
  area: { x0: SCHOOL_X.x0, y0: -31, x1: SCHOOL_X.x1, y1: -22 } as TileRect,
  building: { x: 10, w: 24, frontY: -26 },
  gate: { x: 20, w: 4, y: -22 },
  yard: { x0: 9, y0: -26, x1: 35, y1: -22 } as TileRect,
  /** Điểm đứng trong sân (px) cho học sinh. */
  yardSpots: Array.from({ length: 12 }, (_, i) => ({ x: (11 + (i % 6) * 4.4) * T, y: (-25 + Math.floor(i / 6) * 1.5) * T })),
  flagpole: { x: 18, y: -24 },
} as const;
export const SCHOOL_GATE_PX = { x: (SCHOOL.gate.x + SCHOOL.gate.w / 2) * T, y: (SCHOOL.gate.y + 0.5) * T };

export const APARTMENT_PARKING: TileRect = { x0: 41, y0: 3, x1: 76, y1: 10 };

// ---------------------------------------------------------------------------------------------------------------------
// Chỗ trú mưa và vỉa hè đi bộ
// ---------------------------------------------------------------------------------------------------------------------

export interface NeighborhoodShelter { id: string; x0: number; y0: number; x1: number; y1: number }
const px = (r: TileRect): Omit<NeighborhoodShelter, 'id'> => ({ x0: r.x0 * T, y0: r.y0 * T, x1: r.x1 * T, y1: r.y1 * T });
export const NEIGHBORHOOD_SHELTERS: readonly NeighborhoodShelter[] = [
  { id: 'park-pavilion', ...px({ x0: PARK.pavilion.x - 2, y0: PARK.pavilion.y - 2, x1: PARK.pavilion.x + 2, y1: PARK.pavilion.y + 1 }) },
  { id: 'school-gate', ...px({ x0: SCHOOL.gate.x - 1, y0: SCHOOL.gate.y - 1, x1: SCHOOL.gate.x + SCHOOL.gate.w + 1, y1: SCHOOL.gate.y + 1 }) },
  ...APARTMENT_LOTS.map((l) => ({ id: `${l.id}-lobby`, ...px({ x0: l.x + 3, y0: l.frontY, x1: l.x + 7, y1: l.frontY + 2 }) })),
  { id: 'bus-stop-east', ...px({ x0: 48, y0: 11, x1: 52, y1: 13 }) },
  { id: 'bus-stop-west', ...px({ x0: -38, y0: 11, x1: -34, y1: 13 }) },
];

/** Hàng "vỉa hè đi bộ" (px) của từng dải: NPC đi dọc theo y này giữa các cửa nhà/điểm đến. */
export const WALK_LINES = {
  /** Vỉa hè phía bắc đường trường: cổng trường và các nhà dãy n1. */
  schoolNorth: -21.5 * T,
  /** Dải ngay phía bắc bản đồ chơi, trước các nhà dãy n2. */
  northFront: -6.7 * T,
  mainNorth: 11.85 * T,
  /** Vỉa hè trước các nhà dãy s2 (phía bắc đường phía nam) và trước dãy s3. */
  southNorth: 24.5 * T,
  southFront: 38.8 * T,
} as const;
/** Vỉa hè dọc (px x) của hai đường dọc. */
export const AVENUE_WALK_X = { west: -7.5 * T, westInner: -3.5 * T, east: 37.5 * T, eastInner: 41.5 * T } as const;

/** Chỗ cho cổng rời bản đồ (NPC "đi làm" biến mất ở đây): hai đầu vỉa hè đường chính. */
export const WORK_PORTALS = { west: NEIGHBORHOOD_PX.x0 + 40, east: NEIGHBORHOOD_PX.x1 - 40 } as const;

/** Mái hiên cửa tiệm chính (px): dùng chung với hệ trú mưa sẵn có, NPC nền có thể trú dưới đây. */
export const SHOP_AWNING_PX = { x0: AWNING_SPANS.main.x0, x1: AWNING_SPANS.main.x1, ...awningShelterBand('main') } as const;

// ---------------------------------------------------------------------------------------------------------------------
// Loại NPC và lịch sinh hoạt (hàm theo giờ game hiện có)
// ---------------------------------------------------------------------------------------------------------------------

export type NeighborNpcType =
  | 'office_worker' | 'student' | 'university_student' | 'elder' | 'parent' | 'courier' | 'vendor' | 'walker' | 'jogger' | 'child' | 'shopper';

export type NeighborPlace = 'home' | 'shop' | 'school' | 'park' | 'work' | 'street';

export interface NpcTypeDef {
  id: NeighborNpcType;
  label: string;
  /** Tỉ trọng khi sinh dân cư. */
  weight: number;
  /** Tốc độ đi bộ px/s. */
  speed: number;
  /** Nhân kích thước (trẻ em nhỏ hơn). */
  scale: number;
  /** Màu nhân (tint) để khác ngoại hình khi dùng chung 3 sprite NPC. */
  tints: readonly number[];
  /** Phụ kiện vẽ thêm. */
  accessory: 'none' | 'backpack' | 'briefcase' | 'bag' | 'box' | 'cart' | 'cap' | 'band';
}

export const NPC_TYPES: readonly NpcTypeDef[] = [
  { id: 'office_worker', label: 'Người đi làm', weight: 20, speed: 36, scale: 1, tints: [0xffffff, 0xc9d6ee, 0xe6d9c4], accessory: 'briefcase' },
  { id: 'student', label: 'Học sinh', weight: 18, speed: 34, scale: 0.875, tints: [0xdfe9ff, 0xffffff, 0xe9f2ff], accessory: 'backpack' },
  { id: 'university_student', label: 'Sinh viên', weight: 7, speed: 38, scale: 1, tints: [0xffe0c9, 0xd9f0d6, 0xffffff], accessory: 'backpack' },
  { id: 'elder', label: 'Người lớn tuổi', weight: 9, speed: 22, scale: 1, tints: [0xd8d2c4, 0xc9c0b0, 0xe6dfd0], accessory: 'cap' },
  { id: 'parent', label: 'Phụ huynh', weight: 8, speed: 33, scale: 1, tints: [0xffffff, 0xf2d8d8, 0xd8e8f2], accessory: 'bag' },
  { id: 'courier', label: 'Nhân viên giao hàng', weight: 5, speed: 46, scale: 1, tints: [0xffd08a, 0xffb36b, 0xffe0a8], accessory: 'box' },
  { id: 'vendor', label: 'Người bán hàng rong', weight: 4, speed: 20, scale: 1, tints: [0xe6d3a8, 0xd9c28f, 0xf0e2bd], accessory: 'cart' },
  { id: 'walker', label: 'Người đi bộ', weight: 12, speed: 30, scale: 1, tints: [0xffffff, 0xf0d9ec, 0xd9f0f0], accessory: 'none' },
  { id: 'jogger', label: 'Người chạy bộ', weight: 5, speed: 54, scale: 1, tints: [0xffa9a9, 0xa9d1ff, 0xb9f0b9], accessory: 'band' },
  { id: 'child', label: 'Trẻ em', weight: 6, speed: 30, scale: 0.75, tints: [0xffe08a, 0xffc9e0, 0xc9e8ff], accessory: 'none' },
  { id: 'shopper', label: 'Khách mua hàng', weight: 6, speed: 31, scale: 1, tints: [0xffffff, 0xe9d9ff, 0xd9ffe6], accessory: 'bag' },
];
export const NPC_TYPE_MAP: Readonly<Record<string, NpcTypeDef>> = Object.fromEntries(NPC_TYPES.map((t) => [t.id, t]));

/** Giờ học trường (theo giờ game): vào học 06:45–07:30 (sáng), tan 16:30–17:15 (chiều). Tận dụng TimeSystem, không hard-code theo khung hình. */
export const SCHOOL_HOURS = { arriveFrom: 6.5, arriveTo: 7.5, lunchFrom: 11.5, lunchTo: 13, leaveFrom: 16.5, leaveTo: 17.5 } as const;

/** Mức hấp dẫn của công viên theo thời tiết: nắng nhiều người, mưa vắng dần, giông gần như trống. */
export function parkAppeal(rain: number, weatherId: string): number {
  const r = clampUnit(rain);
  let a = r < 0.03 ? 1 : r < 0.3 ? 0.55 : r < 0.55 ? 0.22 : r < 0.8 ? 0.06 : 0;
  if (weatherId === 'storm') a = 0;
  else if (weatherId === 'cloudy' || weatherId === 'cold') a *= 0.85;
  else if (weatherId === 'hot') a *= 0.7;
  return a;
}
