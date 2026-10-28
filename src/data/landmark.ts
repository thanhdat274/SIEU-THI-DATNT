/**
 * Công trình khu phố (GĐ40) — "Sân Chơi Trẻ Em": một mục tiêu dài hạn (nhiều tuần)
 * có nhịp "mỗi ngày góp một lần", kéo dài cảm giác tiến bộ chậm rãi và kết thúc bằng
 * một phần thưởng lớn khi khánh thành.
 *
 * File CHỈ có dữ liệu + hàm thuần (không đụng three/React). Góp/trả thưởng nằm ở
 * `core/slices/progress.ts` (`contributeLandmark`); trạng thái lưu trong `biz.landmark`.
 *
 * Tổng cộng 28 lượt góp ≈ 28 ngày (mỗi ngày 1 lần). 4 giai đoạn (móng → khung → đồ chơi
 * → khánh thành) với mốc cộng dồn 7/14/21/28. Không đổi theo cấp/thời tiết — là nghiệp vụ
 * độc lập, không phải một vòng lặp ngày mới.
 */

/** Mốc cộng dồn để hoàn thành từng giai đoạn: 7, 14, 21, 28 (28 ngày × 1 lượt/ngày). */
export const LANDMARK_TARGETS = [7, 14, 21, 28] as const;

/** Một giai đoạn của sân chơi. */
export interface LandmarkStage {
  id: string;
  icon: string;
  title: string;
  desc: string;
  /** Thưởng tiền cộng vào két khi hoàn thành giai đoạn này. */
  bonusMoney: number;
  /** Thưởng XP khi hoàn thành giai đoạn này. */
  bonusXp: number;
}

/** 4 giai đoạn (tầng 0..3): móng, khung, lắp đồ chơi, khánh thành. */
export const LANDMARK_STAGES: readonly LandmarkStage[] = [
  { id: 'mo', icon: '🏗️', title: 'Đặt móng', desc: 'San nền, đổ móng sân chơi', bonusMoney: 50_000, bonusXp: 150 },
  { id: 'khung', icon: '🪜', title: 'Dựng khung', desc: 'Dựng khung sân chơi cho trẻ con trong hẻm', bonusMoney: 150_000, bonusXp: 300 },
  { id: 'mai', icon: '🎠', title: 'Lắp đồ chơi', desc: 'Cầu trượt, xích đu, bập bênh, hàng rào', bonusMoney: 300_000, bonusXp: 500 },
  { id: 'khanh', icon: '🏟️', title: 'Khánh thành', desc: 'Sân chơi đầu hẻm hoàn thành — trẻ con reo hò!', bonusMoney: 1_000_000, bonusXp: 1000 },
] as const;

/** Trần chi phí một lượt góp vật liệu (đ) — chặn lạm phát khi tiệm lớn. */
export const LANDMARK_FEED_CAP = 100_000;

/** Lượng khách chính quy hôm nay nhân thêm sau khi sân chơi KHÁN THÀNH (×1.06 = +6%). */
export const LANDMARK_CUSTOMER_BONUS_FACTOR = 1.06;

/** Làm tròn tới 1.000đ cho gọn mắt. */
const roundThousand = (v: number) => Math.round(v / 1000) * 1000;

/**
 * Tiến độ tích luỹ từ số lượt góp `contributions` (chỉ đọc, thuần).
 *  - done: đủ 28 lượt trở lên (khánh thành).
 *  - index: giai đoạn cao nhất đang ở (highest stage có mốc ≤ contributions, kẹp 0..3).
 *  - into: số lượt đã góp bên trong giai đoạn hiện tại (so với mốc giai đoạn trước),
 *          kẹp trong bề ngang của giai đoạn; ở contributions=7 (mốc giai đoạn 0) → 7.
 *  - pct: contributions/28 kẹp [0,1], làm tròn 3 chữ số để tránh trôi số thập phân.
 * `contributions < 0` (dữ liệu xấu) → mọi giá trị về 0.
 */
export function landmarkProgress(contributions: number): { index: number; into: number; pct: number; done: boolean } {
  if (!(contributions >= 0)) return { index: 0, into: 0, pct: 0, done: false };
  const total = LANDMARK_TARGETS[LANDMARK_TARGETS.length - 1];
  const done = contributions >= total;
  let index = 0;
  for (let i = 0; i < LANDMARK_STAGES.length; i++) {
    if (contributions >= LANDMARK_TARGETS[i]) index = i;
  }
  const prev = index > 0 ? LANDMARK_TARGETS[index - 1] : 0;
  const width = LANDMARK_TARGETS[index] - prev;
  const into = Math.min(contributions - prev, width);
  const pct = Math.min(1, contributions / total);
  const rounded = Math.round(pct * 1000) / 1000;
  return { index, into, pct: rounded, done };
}

/**
 * Chi phí một lượt góp vật liệu hôm nay (đ): nguyên dương, làm tròn 1.000đ,
 * không giảm theo cả `tier` lẫn `level`, có trần cứng LANDMARK_FEED_CAP và sàn 1.000đ.
 * Mỗi giai đoạn sau đắt hơn (thêm 4.000đ), tiệm càng lớn chi phí càng nhích (thêm 150đ/cấp).
 */
export function feedCost(tier: number, level: number): number {
  const raw = 8000 + tier * 4000 + level * 150;
  const rounded = roundThousand(raw);
  return Math.min(Math.max(rounded, 1000), LANDMARK_FEED_CAP);
}

/**
 * Hệ số khách ghé tiệm chính hôm nay từ sân chơi: 1 cho tới khi KHÁN THÀNH
 * (contributions ≥ 28), rồi ×1.06 như một thứ "làm ăn tốt nhờ sân chơi đầu hẻm".
 * Ván mới (0 lượt) → 1 nên không đổi hành vi nền kinh tế.
 */
export function landmarkCustomerFactor(contributions: number): number {
  return contributions >= LANDMARK_TARGETS[LANDMARK_TARGETS.length - 1] ? LANDMARK_CUSTOMER_BONUS_FACTOR : 1;
}
