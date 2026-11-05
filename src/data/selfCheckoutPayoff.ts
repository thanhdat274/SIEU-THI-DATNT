import { waitMoneyCost } from './advice';

/**
 * GĐ-D — Trục "Siêu thị hóa sâu": QUẦY TỰ THANH TOÁN (self-checkout) — phần còn lại của Khu tự chọn.
 *
 * Thẻ ⏳ "mất khách vì chờ quầy" (GĐ120/GĐ1221) đã báo LƯỢT + DOANH THU bỏ lỡ khi hàng chờ quá lâu,
 * và gợi "đứng quầy giờ đông / thuê thêm thu ngân". Nhưng còn MỘT tay quay siêu thị chưa được kể: khách
 * mua ÍT MÓN (chạy việc vặt, không cầm giỏ lớn) đáng để tự quét ở quầy tự thanh toán thay vì xếp hàng sau
 * giỏ to/đổi tiền lẻ — đỡ kẹt quầy đúng nhóm đông nhất. Đây là phần thiếu của MỀM "Khu tự chọn" (GĐ-B
 * đã cho khách giỏ lớn 5–8 món + bỏ cả giỏ; giờ bổ sung phía KHÁCH ÍT MÓN thoát nhanh đỡ tắc).
 *
 * Helper THUẦN này lượng hoá phần khách bỏ vì chờ là khách mua ít (ước theo hằng số thiết kế
 * `SCO_QUICK_SHARE` — khách không cầm giỏ trong game mua ≤ `SCO_MAX_ITEMS` món (count `1+floor(rng*maxItems)`,
 * maxItems ≤ 3 khi chưa có kỹ năng basket) nên nhóm "ít món" là thật và chiếm đa số; share chọn thận trọng).
 * Doanh thu giữ lại dùng ĐÚNG công thức `waitMoneyCost` (waitCount × avgPerVisit) như GĐ1221 — chỉ nhân số
 * có sẵn, không bịa luật kinh tế (Nguyên tắc c).
 *
 * THUẦN — không import store, không đổi state/save/kinh tế/seed; chỉ soi (Nguyên tắc a). Không tạo hệ
 * thống/nút/nội thất mới — chỉ hiển thị tay quay còn thiếu ở thẻ ⏳ sẵn có.
 */

/** Khách "ít món" (≥ SCO_MAX_ITEMS món trong giỏ) là nhóm đáng dùng quầy tự thanh toán. */
export const SCO_MAX_ITEMS = 4;
/** Ước tỉ lệ khách bỏ vì chờ là khách mua ít món — hằng số thiết kế (chọn thận trọng, đúng cổng b: chỉ khi đã mất khách vì chờ). */
export const SCO_QUICK_SHARE = 0.35;

export interface SelfCheckoutPayoff {
  /** Ước số khách bỏ vì chờ là khách mua ít món — quầy tự thanh toán giữ lại được. */
  quickRelieved: number;
  /** Doanh thu (bán lẻ) của nhóm đó giữ lại được — cùng công thức waitMoneyCost. */
  relievedRevenue: number;
  /** Dòng soi ngắn (≤90 code point) — null khi không mất khách vì chờ. */
  line: string | null;
}

/** Lượng hoá tay quay "tự thanh toán": phần khách mua ít bị mất vì chờ quầy — THUẦN. */
export function selfCheckoutPayoff(waitCount: number, avgRevenuePerBuyer: number): SelfCheckoutPayoff {
  if (waitCount <= 0 || avgRevenuePerBuyer <= 0) return { quickRelieved: 0, relievedRevenue: 0, line: null };
  const quick = Math.round(waitCount * SCO_QUICK_SHARE);
  if (quick <= 0) return { quickRelieved: 0, relievedRevenue: 0, line: null };
  const relieved = waitMoneyCost(quick, avgRevenuePerBuyer).estRevenueLost;
  return {
    quickRelieved: quick,
    relievedRevenue: relieved,
    line: `🛒 ~${quick} khách bỏ về mua ít món (≈${fmtCompact(relieved)}) — quầy tự thanh toán đỡ tắc.`,
  };
}

const fmtCompact = (v: number) =>
  v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1).replace('.', ',')}tr` : `${Math.round(v / 1_000)}k`;
