/**
 * GĐ-B — Trục "Siêu thị hóa sâu": KHÁCH GIỎ LỚN.
 *
 * Ngành "Khu tự chọn (giỏ lớn)" (xem `departments.ts`) có MỀM thực sự: khi kích hoạt đủ
 * (bậc tiệm ≥ BIG_BASKET_TIER và ĐÃ đặt cả cartStation + bigShelf), một tỷ lệ sim khách là
 * "khách giỏ lớn" — mua NHIỀU món trải các ngành (giỏ 5–8), nhưng nếu THIẾU ≥2 món mong muốn
 * thì BỎ CẢ GIỎ (ràng buộc "trữ kệ đủ theo ngành", không chỉ món hot).
 *
 * THUẦN — không import store, không đổi state/save/kinh tế/seed; chỉ cung cấp cổng + độ lớn + rule
 * bỏ giỏ cho `agents/customers.ts` dùng và một dòng soi (Nguyên tắc a, đúng hằng số đã cân bằng).
 */

/** Bậc tiệm từ đó ngành "Khu tự chọn" khả dụng (Mini mart — SHOP_TIERS[3].name). */
export const BIG_BASKET_TIER = 3;
/** Tỷ lệ khách là "giỏ lớn" khi ngành kích hoạt. */
export const BIG_BASKET_SHARE = 0.15;
/** Số món tối thiểu của giỏ lớn. */
export const BIG_BASKET_MIN = 5;
/** Độ dãn thêm số món giỏ lớn (0..RANGE-1) → giỏ 5..8 món. */
export const BIG_BASKET_RANGE = 4;
/** Bỏ cả giỏ khi lỡ ≥ ngưỡng này món (kệ trống/chê giá/cận hạn). */
export const BIG_BASKET_ABANDON_MISSES = 2;

/** Đã kích hoạt đủ ngành "Khu tự chọn": đủ bậc + đặt cartStation + đặt bigShelf (theo departmentStatus GĐ-A). */
export function bigBasketEligible(shopTier: number, hasCartStation: boolean, hasBigShelf: boolean): boolean {
  return shopTier >= BIG_BASKET_TIER && hasCartStation && hasBigShelf;
}

/** Xác suất một khách cụ thể là "giỏ lớn" — 0 nếu ngành chưa kích hoạt. */
export function bigBasketChance(shopTier: number, hasCartStation: boolean, hasBigShelf: boolean): number {
  return bigBasketEligible(shopTier, hasCartStation, hasBigShelf) ? BIG_BASKET_SHARE : 0;
}

/**
 * Quyết định (theo rng truyền vào) khách có là "giỏ lớn" không.
 * Khi ngành CHƯA kích hoạt thì KHÔNG tiêu simRng — giữ nguyên chuỗi rng của sim (không lệch kinh tế
 * tất định, mốc simGolden vẫn đứng); chỉ tiêu rng khi ngành thật sự bật.
 */
export function isBigBasket(rng: () => number, shopTier: number, hasCartStation: boolean, hasBigShelf: boolean): boolean {
  if (!bigBasketEligible(shopTier, hasCartStation, hasBigShelf)) return false;
  return rng() < BIG_BASKET_SHARE;
}

/** Số món mong muốn của khách giỏ lớn. */
export function bigBasketCount(rng: () => number): number {
  return BIG_BASKET_MIN + Math.floor(rng() * BIG_BASKET_RANGE);
}

/** Khách giỏ lớn có bỏ cả giỏ không (lỡ ≥ ngưỡng món). */
export function bigBasketAbandons(missing: number): boolean {
  return missing >= BIG_BASKET_ABANDON_MISSES;
}

export interface BigBasketInsight {
  active: boolean;
  /** Dòng soi ngắn (≤90 code point — Luật 9) để hiện ở UI. */
  line: string | null;
}

/** Dòng soi cho thẻ Mở rộng / nơi bày kệ: ngành chưa/đã sẵn sàng + luật chơi (THUẦN). */
export function bigBasketInsight(shopTier: number, hasCartStation: boolean, hasBigShelf: boolean): BigBasketInsight {
  if (bigBasketEligible(shopTier, hasCartStation, hasBigShelf)) {
    return {
      active: true,
      line: '🛒 Khách giỏ lớn đang ghé (~15%): giỏ 5–8 món trải nhiều ngành — thiếu ≥2 món là bỏ cả giỏ.',
    };
  }
  const missing = [hasCartStation ? '' : 'Bãi xe đẩy', hasBigShelf ? '' : 'Kệ siêu thị'].filter(Boolean).join(' + ');
  if (shopTier < BIG_BASKET_TIER) {
    return { active: false, line: `🛒 Khách giỏ lớn cần bậc ${BIG_BASKET_TIER} (Mini mart) — chưa mở.` };
  }
  return { active: false, line: `🛒 Khách giỏ lớn chưa ghé: đặt ${missing} để kích hoạt ngành Khu tự chọn.` };
}
