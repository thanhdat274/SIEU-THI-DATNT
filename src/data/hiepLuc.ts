import type { BranchState } from './branches';
import type { QuanNuocState } from './quanNuoc';
import { QUAN_NUOC_UNLOCK } from './quanNuoc';

// ───── Đối tác Hiệp lực: chi nhánh × quán nước (GĐ74) ─────
// Chi nhánh 24/7 (~45% doanh thu) và quán nước (cơ sở thứ hai) cùng dùng một kho nhưng chưa bao giờ
// "nói chuyện" với nhau. Giai đoạn này biến chúng thành một CAM KẾT định kỳ tháng: đầu tháng người chơi
// "lập đối tác" (đặt cọc hoàn lại, không phạt — ethos GĐ55), cả tháng tích lũy doanh thu chung 2 cơ sở,
// cuối tháng đủ ngưỡng thì thưởng hiệp lực + chuỗi tháng liên tiếp. THƯỞNG LÀ PHỤ GIA tách rời (additive
// qua biến `money` trong bizEndOfDay — mẫu GĐ67/69/70), không đổi giá/công thức hằng ngày.

export const HIEPLUC_COC = 200_000;
export const HIEPLUC_MIN = 5_000_000;
export const HIEPLUC_RATE = 0.04;
export const HIEPLUC_CAP = 3_000_000;
export const HIEPLUC_STREAK_PCT = 0.05;
export const HIEPLUC_STREAK_MAX = 0.8;

/** Trạng thái đối tác lưu trong biz (optional, save-safe qua MERGE_DEEP). */
export interface HiepLucState {
  /** Tháng (game) đối tác đang cam kết. */
  m: number;
  active: boolean;
  /** Tiền cọc đã đặt (hoàn lại cuối tháng). */
  coc: number;
}

export const newHiepLuc = (): HiepLucState => ({ m: 0, active: false, coc: 0 });

/** Đủ điều kiện lập đối tác: cấp mở quán nước (và chi nhánh mở sẵn ở cấp thấp hơn) + cả hai cơ sở đang mở. */
export const hiepLucEligible = (branch: BranchState | null, quanNuoc: QuanNuocState, level: number): boolean =>
  level >= QUAN_NUOC_UNLOCK && !!branch?.open && !!quanNuoc.open;

/** Tiền thưởng hiệp lực cho một tháng (chưa tính chuỗi). */
export const hiepLucBonus = (combined: number): number =>
  combined >= HIEPLUC_MIN ? Math.min(combined * HIEPLUC_RATE, HIEPLUC_CAP) : 0;

/** Thưởng nhân chuỗi tháng liên tiếp (mỗi tháng +5%, trần +80%). */
export const hiepLucStreakMul = (streak: number): number => {
  const bonus = Math.min(streak * HIEPLUC_STREAK_PCT, HIEPLUC_STREAK_MAX);
  return 1 + bonus;
};

/** Tổng thưởng (đã nhân chuỗi) — dùng ở payoff. */
export const hiepLucPayoff = (combined: number, streak: number): number =>
  Math.round(hiepLucBonus(combined) * hiepLucStreakMul(streak));
