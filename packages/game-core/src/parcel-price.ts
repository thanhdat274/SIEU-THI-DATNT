/**
 * Giá đất động (open-world-land-lease 6b — task 1.2, phần THUẦN / PROVISIONAL).
 *
 * Công thức thiết kế D6:
 *   parcelPrice = base × tileCount × landValueMultiplier × tierFactor[cityTier]
 *                 × (1 + NEARBY_BONUS × nearbyOpenBuildings)
 *
 * Trần ×2.5 (PRICE_CAP) áp lên HỆ SỐ KHUẾCH ĐẠI (tier × bonus), KHÔNG nhân lên
 * toàn bộ base. Nghĩa là:
 *   amplification = tierFactor[cityTier] × (1 + NEARBY_BONUS × nearbyOpenBuildings)
 *   amplification = min(amplification, PRICE_CAP)
 *   price = (basePrice × tileCount × landValueMultiplier) × amplification
 *
 * Hàm THẦN: cùng một hàm được cả server (tính tiền thuê / giá mua) và client
 * (hiển thị giá hiện tại + mũi tên xu hướng) dùng chung. Xu hướng được suy ra
 * bằng cách so giá ở hai mốc khác nhau qua `priceTrend`.
 *
 * GHÉP CHÚ (PROVISIONAL): phần nối sổ cái / lease_parcel / UI là SAU (chờ máy
 * thật — schema 10 đổi ownedParcelIds là refactor toàn hệ). File này CHỈ chứa
 * hàm thuần.
 *
 * CÁC HẰNG SỐ dưới đây là LOCAL PROVISIONAL theo đúng thiết kế D6. Khi sibling
 * `packages/game-data/src/world/land-lease.ts` được tạo (LEASE_DAILY_RATE,
 * LEASE_CREDIT_RATE, TIER_FACTOR, NEARBY_BONUS, PRICE_CAP), nên thay các hằng
 * local này bằng import từ `@game/data/src/world/land-lease` để tránh trùng lặp.
 * Thời điểm viết task này file sibling CHƯA tồn tại, nên import chéo sẽ gây
 * typecheck fail tạm — do đó dùng local constant như được phép.
 */

/** Hệ số theo cấp đô thị (cityTier ∈ 0..5). 5 cấp... thực tế 6 cấp (0..5). */
export const TIER_FACTOR: readonly number[] = [1, 1.1, 1.25, 1.45, 1.7, 2];

/** Thưởng mỗi tòa đang mở trong bán kính 16 ô. */
export const NEARBY_BONUS = 0.05;

/** Trần hệ số khuếch đại (×2.5). */
export const PRICE_CAP = 2.5;

/** Số cấp đô thị hợp lệ (cityTier ∈ 0..5). */
export const MAX_CITY_TIER = 5;
export const MIN_CITY_TIER = 0;

/** Số tòa giới hạn để tính trần khuếch đại trong kiểm thử (upper bound bằng 2×trần đã có sẵn). */
export const MAX_NEARBY_BUILDINGS = 32;

export interface ParcelPriceParams {
  /** Id lô (tùy chọn, hiện chưa dùng trong công thức thuần; giữ để sau này tra cứu). */
  parcelId?: string;
  /** Giá gốc mỗi ô (PARCEL_BASE_PRICE bước 4). */
  basePrice: number;
  /** Số ô của lô. */
  tileCount: number;
  /** Hệ số giá trị đất của lô. */
  landValueMultiplier: number;
  /** Cấp đô thị, 0..5. */
  cityTier: number;
  /** Số tòa đang mở trong bán kính 16 ô (mặc định 0). */
  nearbyOpenBuildings?: number;
  /** Ngày (tùy chọn; giá tính tại thời điểm lệnh). */
  day?: number;
}

/**
 * Hệ số khuếch đại = tierFactor × bonus lân cận, kẹp ở PRICE_CAP.
 * Tách riêng để kiểm thử đơn vị và giữ rõ ràng trần áp lên hệ số chứ không lên toàn base.
 */
export function amplificationFactor(cityTier: number, nearbyOpenBuildings = 0): number {
  const tier = clampTier(cityTier);
  const bonus = Math.max(0, nearbyOpenBuildings);
  const raw = TIER_FACTOR[tier] * (1 + NEARBY_BONUS * bonus);
  return Math.min(raw, PRICE_CAP);
}

/** Kẹp cityTier vào dải 0..5 để tránh index ngoài mảng. */
function clampTier(cityTier: number): number {
  if (!Number.isFinite(cityTier) || cityTier < MIN_CITY_TIER) return MIN_CITY_TIER;
  return Math.min(MAX_CITY_TIER, Math.floor(cityTier));
}

/**
 * Giá đất động theo D6, THẦN (không phụ thuộc state toàn cục).
 * - amplification (tier × bonus) kẹp ở PRICE_CAP (×2.5).
 * - Giá luôn ≥ 0; base/ô/multiplier âm bị coi là 0.
 */
export function parcelPrice(params: ParcelPriceParams): number {
  const base = Math.max(0, params.basePrice ?? 0) * Math.max(0, params.tileCount ?? 0) * Math.max(0, params.landValueMultiplier ?? 0);
  const amp = amplificationFactor(params.cityTier, params.nearbyOpenBuildings ?? 0);
  return base * amp;
}

/**
 * Xu hướng giá giữa hai mốc, cho UI mũi tên.
 * - prev < next  → 'up'
 * - prev > next  → 'down'
 * - bằng nhau    → 'flat'
 */
export function priceTrend(prev: number | undefined, next: number | undefined): 'up' | 'down' | 'flat' {
  const a = Number.isFinite(prev) ? (prev as number) : 0;
  const b = Number.isFinite(next) ? (next as number) : 0;
  if (b > a + 1e-9) return 'up';
  if (b < a - 1e-9) return 'down';
  return 'flat';
}
