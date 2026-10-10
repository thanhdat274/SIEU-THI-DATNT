/**
 * Hạng cửa hàng theo diện tích sàn (OpenSpec `open-world-building-types`, task 2.2b / D9 — phần THUẦN + PROVISIONAL).
 *
 * Hạng tiệm bán lẻ suy từ số Ô SÀN footprint của mọi tòa bán lẻ (tiệm chính + chi nhánh). Bảng D9:
 *
 *   | Hạng              | Ô sàn    | Hệ số nhịp khách |
 *   | Tiệm tạp hóa      | < 60     | ×1.0             |
 *   | Cửa hàng tiện lợi | 60–99    | ×1.15            |
 *   | Siêu thị mini     | 100–159  | ×1.3             |
 *   | Siêu thị          | 160–239  | ×1.5             |
 *   | Đại siêu thị      | >= 240   | ×1.7             |
 *
 * Chủ dự án chốt: ngưỡng Siêu thị phải > 126 (lô tiệm chính tối đa 126 ô) để buộc lấn sang lô kề.
 * Hạng KHÔNG bao giờ giảm do dời tòa (dời giữ nguyên footprint) → mọi hàm ở đây nhận SỐ Ô đã có
 * (không đụng cơ chế dời). `maxTier` cho phép khóa cứng / giữ hạng khi dời / mở theo cấp.
 *
 * GHÉP CHÚ: PHẦN THUẦN + PROVISIONAL — nối hạng vào nhịp sinh khách / sức chứa / renderer biển hiệu và
 * `FIXTURE_SHOP.minTier` là việc SAU (chờ refactor 1.2 + máy thật). `minTierShop` là SỐ (provisional)
 * đại diện món nội thất (FIXTURE_SHOP) nhỏ nhất mở được cho hạng này; chưa nối vào FIXTURE_SHOP.
 */

export interface StoreTier {
  /** Định danh hạng. */
  id: string;
  /** Tên hiển thị hạng. */
  name: string;
  /** Số ô sàn tối thiểu để thuộc hạng này (đầu mút dưới, đóng). */
  minFloor: number;
  /** Số ô sàn tối đa để thuộc hạng này (đầu mút trên, đóng); `null` = mở trên (đại siêu thị, không kẹp trên). */
  maxFloor: number | null;
  /** Hệ số nhịp khách (traffic multiplier) của hạng (bảng D9). */
  trafficMultiplier: number;
  /** Số lớn (provisional) của nội thất FIXTURE_SHOP nhỏ nhất mở được cho hạng này. Chưa nối FIXTURE_SHOP.minTier. */
  minTierShop: number;
}

/**
 * Bảng hạng tiệm bán lẻ theo diện tích sàn (D9). Được sắp theo thứ tự tăng dần `minFloor`;
 * `maxFloor` của hạng trước = `minFloor - 1` của hạng sau (các mút không chồng, không hở).
 * `maxFloor: null` chỉ ở hạng cuối (≥ 240).
 *
 * `minTierShop` là PROVISIONAL, đề xuất theo thứ tự mở nội thất (số thứ tự 1..5) — đọc là "hạng càng cao
 * thì nội thất mở càng xuất hiện nhiều hơn ở FIXTURE_SHOP". Sẽ nối/đồng bộ với `FIXTURE_SHOP.minTier` sau.
 */
export const STORE_TIERS: readonly StoreTier[] = [
  { id: 'mart',           name: 'Tiệm tạp hóa',      minFloor: 0,   maxFloor: 59,  trafficMultiplier: 1.0,  minTierShop: 1 },
  { id: 'convenience',    name: 'Cửa hàng tiện lợi', minFloor: 60,  maxFloor: 99,  trafficMultiplier: 1.15, minTierShop: 2 },
  { id: 'mini_market',    name: 'Siêu thị mini',     minFloor: 100, maxFloor: 159, trafficMultiplier: 1.3,  minTierShop: 3 },
  { id: 'supermarket',    name: 'Siêu thị',          minFloor: 160, maxFloor: 239, trafficMultiplier: 1.5,  minTierShop: 4 },
  { id: 'hypermarket',    name: 'Đại siêu thị',      minFloor: 240, maxFloor: null, trafficMultiplier: 1.7, minTierShop: 5 },
];

const STORE_TIER_MAP: Readonly<Record<string, StoreTier>> = Object.fromEntries(
  STORE_TIERS.map((tier) => [tier.id, tier]),
) as Readonly<Record<string, StoreTier>>;

/**
 * Hạng cửa hàng theo số ô sàn đang dùng.
 *
 * - `floorTilesInUse < 60` → Tiệm tạp hóa; `60–99` → Tiện lợi; `100–159` → Mini; `160–239` → Siêu thị; `>= 240` → Đại siêu thị.
 * - Nếu `opts.maxTier` cho trước (khóa cứng / giữ hạng khi dời / mở theo cấp), kết quả được clamp không vượt
 *   `maxTier` (theo thứ tự trong `STORE_TIERS`). Nhờ đó D9 "không giảm khi dời" và các điều kiện mở theo cấp được giữ.
 *
 * `floorTilesInUse` âm được coi như 0 (không có diện tích).
 */
export function storeTierFromFloorTiles(
  floorTilesInUse: number,
  opts?: { maxTier?: StoreTier['id'] },
): StoreTier {
  const tiles = Math.max(0, Math.floor(floorTilesInUse));
  let tier = STORE_TIERS[0];
  for (const candidate of STORE_TIERS) {
    if (tiles >= candidate.minFloor && (candidate.maxFloor === null || tiles <= candidate.maxFloor)) {
      tier = candidate;
      break;
    }
  }
  if (opts?.maxTier) {
    const capTier = STORE_TIER_MAP[opts.maxTier];
    if (capTier) {
      // Clamp: nếu hạng tính được cao hơn maxTier thì gán xuống maxTier (chỉ giảm khi vượt trần).
      const capIndex = STORE_TIERS.indexOf(capTier);
      const tierIndex = STORE_TIERS.indexOf(tier);
      if (tierIndex > capIndex) tier = capTier;
    }
  }
  return tier;
}

/**
 * Hệ số nhịp khách (traffic multiplier) theo số ô sàn đang dùng — tra thẳng bảng D9.
 * Tương đương `storeTierFromFloorTiles(floorTiles).trafficMultiplier`.
 */
export function storeTierTrafficMultiplier(floorTiles: number): number {
  return storeTierFromFloorTiles(floorTiles).trafficMultiplier;
}
