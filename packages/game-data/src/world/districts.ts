/**
 * Khu của thế giới mở theo đợt khai hoang (OpenSpec `open-world-districts-city-goals`, task 1.1 + 1.2 — phần THUẦN).
 *
 * THUẦN + PROVISIONAL: chỉ đăng ký định nghĩa khu và LUẬT NHÂN HỆ SỐ của khu (cầu nhóm hàng ưa chuộng × nhịp khách
 * theo khung giờ cao điểm). KHÔNG gán `parcel.districtId` lên `Parcel`, KHÔNG sửa `modifiers.ts`, KHÔNG nối NPC nền
 * /renderer — đó là việc SAU (chờ máy thật) của LEAD. Registry + luật thuần để Lead gọi khi nối.
 *
 * D1/D2 (provisional): lô góc ngã tư có thể thuộc hai khu — khi đó lấy khu của đường giáp mặt. Việc gán lô→khu theo
 * wave/zone (mapping id → districtId) thuộc phạm vi sau; ở đây chỉ cung cấp `districtForWave` + registry đủ để LEAD
 * nối mapping theo từng lô.
 *
 * LUẬT HỆ SỐ (chốt provisional, ghi rõ để dễ chỉnh sau playtest):
 *   - Mỗi khu nhân CẦU cho nhóm hàng ưa chuộng của mình (`preferredMultiplier`, dải 1.2–1.4) — ghi trong từng district.
 *   - Mỗi khu nhân NHỊP KHÁCH theo khung giờ cao điểm (`peakHours`, mỗi khung `{fromHour, toHour, multiplier}`).
 *     Nhiều khung cùng lúc thì lấy MAX (không nhân chồng) để tránh hệ số cộng dồn quá mức.
 *   - `applyDistrictModifiers` = preferredMultiplier × peakMultiplier, kẹp trần không vượt `DISTRICT_MULTIPLIER_CAP`
 *     (= 1.4 × 1.3, hệ số cao nhất có thể có của một khu).
 */
import type { ProductCategory } from '@game/shared';

// ---------------------------------------------------------------------------------------------------------------------
// Kiểu khu
// ---------------------------------------------------------------------------------------------------------------------

/** 5 khu của thế giới mở theo đợt khai hoang (D1). */
export type DistrictId =
  | 'hem_dan_cu'           // W0 – hẻm dân cư (bản đồ ban đầu)
  | 'thuong_mai_nga_tu'    // W1 – gần chung cư, thương mại (ngã tư Đông)
  | 'dan_cu_nam'           // W2 – dân cư phía Nam
  | 'van_phong_logistics'  // W3 – văn phòng/logistics (Đông xa)
  | 'am_thuc_nam';         // W4 – ẩm thực phía Nam

/** Phân loại khu — dùng sau cho renderer chủ đề / NPC nền. */
export type DistrictKind = 'residential' | 'commercial' | 'office' | 'food';

/** Một khung giờ cao điểm: `[fromHour, toHour)` — `hour` nằm trong [from, to) thì kích hoạt. */
export interface DistrictPeakHour {
  fromHour: number;
  toHour: number;
  /** Hệ số nhịp khách của khung. */
  multiplier: number;
}

/** Định nghĩa một khu (D1/D2). */
export interface DistrictDef {
  id: DistrictId;
  name: string;
  kind: DistrictKind;
  /** NPC nền đặc trưng của khu (id tham chiếu gợi ý từ `NPC_TYPES` trong neighborhood.ts, dùng tên mô tả mảng). */
  npcMix: string[];
  /** Khung giờ cao điểm (nhịp khách nhân theo khung; nhiều khung lấy max). */
  peakHours: DistrictPeakHour[];
  /** Nhóm hàng khu ưa chuộng (nhân cầu). */
  preferredCategories: ProductCategory[];
  /** Hệ số CẦU cho nhóm hàng ưa chuộng (dải 1.2–1.4, PROVISIONAL). */
  preferredMultiplier: number;
  /** Khóa chủ đề hình ảnh cho khu (renderer dùng sau). */
  visualTheme: string;
}

// ---------------------------------------------------------------------------------------------------------------------
// Registry (D1, PROVISIONAL theo design)
// ---------------------------------------------------------------------------------------------------------------------

/** Trần tích hệ số của một khu = 1.4 (cầu ưa chuộng tối đa) × 1.3 (khung giờ tối đa). */
export const DISTRICT_MULTIPLIER_CAP = 1.4 * 1.3;

/** Dải hệ số cầu ưa chuộng hợp lệ của một khu. */
export const DISTRICT_PREFERRED_RANGE = { min: 1.2, max: 1.4 } as const;
/** Dải hệ số khung giờ hợp lệ. */
export const DISTRICT_PEAK_RANGE = { min: 1.05, max: 1.4 } as const;

export const DISTRICTS: Record<DistrictId, DistrictDef> = {
  // W0 – bản đồ ban đầu: hẻm dân cư quen thuộc.
  hem_dan_cu: {
    id: 'hem_dan_cu',
    name: 'Hẻm dân cư',
    kind: 'residential',
    npcMix: ['elder', 'parent', 'child', 'walker', 'shopper'],
    peakHours: [
      { fromHour: 6.5, toHour: 9, multiplier: 1.15 },   // giờ đi chợ / con đi học
      { fromHour: 17, toHour: 20, multiplier: 1.25 },   // tan làm ghé mua
    ],
    preferredCategories: ['cooking_ingredients', 'snacks', 'bottled_water', 'bread', 'milk'],
    preferredMultiplier: 1.3,
    visualTheme: 'hem',
  },
  // W1 – gần chung cư, thương mại ngã tư Đông.
  thuong_mai_nga_tu: {
    id: 'thuong_mai_nga_tu',
    name: 'Thương mại ngã tư',
    kind: 'commercial',
    npcMix: ['office_worker', 'university_student', 'shopper', 'courier'],
    peakHours: [
      { fromHour: 6.5, toHour: 8.5, multiplier: 1.3 },  // đi làm / đi học
      { fromHour: 11.5, toHour: 13.5, multiplier: 1.2 },// giờ trưa
      { fromHour: 17, toHour: 19, multiplier: 1.25 },   // tan làm
    ],
    preferredCategories: ['soft_drinks', 'snacks', 'household', 'personal_care', 'instant_noodles'],
    preferredMultiplier: 1.35,
    visualTheme: 'commercial',
  },
  // W2 – dân cư phía Nam (thay dãy nhà s2, đông hộ gia đình).
  dan_cu_nam: {
    id: 'dan_cu_nam',
    name: 'Dân cư phía Nam',
    kind: 'residential',
    npcMix: ['elder', 'parent', 'child', 'walker', 'student'],
    peakHours: [
      { fromHour: 6, toHour: 8, multiplier: 1.15 },     // đi học / đi làm sớm
      { fromHour: 17, toHour: 20, multiplier: 1.3 },    // tan làm về nhà, nấu cơm
    ],
    preferredCategories: ['cooking_ingredients', 'fresh_produce', 'milk', 'bread', 'household'],
    preferredMultiplier: 1.25,
    visualTheme: 'suburb',
  },
  // W3 – Đông xa: gần bãi đỗ chung cư, khu văn phòng / logistics.
  van_phong_logistics: {
    id: 'van_phong_logistics',
    name: 'Văn phòng & logistics',
    kind: 'office',
    npcMix: ['office_worker', 'courier', 'walker', 'shopper'],
    peakHours: [
      { fromHour: 6.5, toHour: 8.5, multiplier: 1.4 },  // giờ vào văn phòng
      { fromHour: 11.5, toHour: 13, multiplier: 1.3 },  // giờ nghỉ trưa
      { fromHour: 16.5, toHour: 19, multiplier: 1.3 },  // tan ca / giao hàng
    ],
    preferredCategories: ['instant_noodles', 'soft_drinks', 'snacks', 'candy', 'bottled_water'],
    preferredMultiplier: 1.4,
    visualTheme: 'modern_office',
  },
  // W4 – Nam Đông: khu ẩm thực (lô góc ngã tư đường nam).
  am_thuc_nam: {
    id: 'am_thuc_nam',
    name: 'Khu ẩm thực phía Nam',
    kind: 'food',
    npcMix: ['vendor', 'shopper', 'walker', 'university_student'],
    peakHours: [
      { fromHour: 10.5, toHour: 14, multiplier: 1.3 },  // giờ ăn trưa
      { fromHour: 17, toHour: 21, multiplier: 1.4 },    // giờ ăn tối
    ],
    preferredCategories: ['fresh_produce', 'instant_noodles', 'bread', 'cooking_ingredients', 'eggs'],
    preferredMultiplier: 1.4,
    visualTheme: 'food_street',
  },
} as const;

// ---------------------------------------------------------------------------------------------------------------------
// Mapping wave → khu (D1)
// ---------------------------------------------------------------------------------------------------------------------

export type WaveId = 'w0' | 'w1' | 'w2' | 'w3' | 'w4';

/** Khu của từng đợt khai hoang theo D1 (provisional). */
const WAVE_TO_DISTRICT: Record<WaveId, DistrictId> = {
  w0: 'hem_dan_cu',
  w1: 'thuong_mai_nga_tu',
  w2: 'dan_cu_nam',
  w3: 'van_phong_logistics',
  w4: 'am_thuc_nam',
};

/** Khu mặc định của một đợt khai hoang (D1). Lead dùng khi nối mapping gán lô→khu. */
export function districtForWave(waveId: WaveId): DistrictId {
  return WAVE_TO_DISTRICT[waveId];
}

// ---------------------------------------------------------------------------------------------------------------------
// Luật hệ số (THUẦN)
// ---------------------------------------------------------------------------------------------------------------------

const inPeakHour = (peak: DistrictPeakHour, hour: number): boolean => {
  const h = Number.isFinite(hour) ? hour : 12;
  return h >= peak.fromHour && h < peak.toHour;
};

/** Hệ số CẦU nhóm hàng của khu: 1 nếu category không ưa chuộng, `preferredMultiplier` (1.2–1.4) nếu ưa chuộng. */
export function districtPreferredMultiplier(districtId: DistrictId, category: string): number {
  const district = DISTRICTS[districtId];
  if (!district) return 1;
  return (district.preferredCategories as readonly string[]).includes(category)
    ? district.preferredMultiplier
    : 1;
}

/**
 * Hệ số NHỊP KHÁCH theo khung giờ cao điểm của khu (giờ thập phân, 0..24). Ngoài mọi khung → 1.
 * Nếu `hour` rơi vào NHIỀU khung cùng lúc, trả MAX (không nhân chồng) để tránh tích hệ số quá mức.
 */
export function districtPeakMultiplier(districtId: DistrictId, hour: number): number {
  const district = DISTRICTS[districtId];
  if (!district) return 1;
  let max = 1;
  for (const peak of district.peakHours) {
    if (inPeakHour(peak, hour) && peak.multiplier > max) max = peak.multiplier;
  }
  return max;
}

/**
 * Hệ số tổng hợp của khu = CẦU ưa chuộng × NHỊP theo khung giờ, kẹp trần `DISTRICT_MULTIPLIER_CAP` (= 1.4 × 1.3).
 * Dùng như nhân tổng nhu cầu/nhịp khi áp dụng modifier khu (Lead nối với `source:'district'` + `when.districtId` sau).
 */
export function applyDistrictModifiers(districtId: DistrictId, category: string, hour: number): number {
  if (!DISTRICTS[districtId]) return 1;
  const combined = districtPreferredMultiplier(districtId, category) * districtPeakMultiplier(districtId, hour);
  return Math.min(DISTRICT_MULTIPLIER_CAP, combined);
}
