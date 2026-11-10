/**
 * GĐ2224 — LỚP NHẮC "ĐÃ N NGÀY CHƯA QUAY" (nối vào thưởng tròn năm).
 *
 * Bối cảnh: game đã có đủ vòng lặp giữ chân — streak điểm danh (claimGift), thử thách tuần
 * (weeklyChallenge/closeWeek), thưởng tròn năm (closeYear/yearReward), niên giám mùa (seasonAlmanac),
 * quà chào mừng quay lại (checkWelcomeBack/dayAway). Nhưng "quà chào mừng" chỉ bắn MỘT notify lúc vào
 * game; CHƯA có một lớp bền hiển thị "đã bao nhiêu NGÀY THẬT chưa quay" + nối vào mốc thưởng tròn năm
 * (deadline 365 ngày game). Helper này bù mảnh đó: thuần đọc, chỉ READS lastSeenAt/day/level có sẵn —
 * KHÔNG thêm state/save (không đụng SAVE_VERSION), không đổi kinh tế (chỉ nêu số tồn tại, không cấp tiền
 * mới — Luật 10), không import store, không chạy trong sim → golden giữ byte.
 *
 * Co-op: hiển thị ở MÀN ĐĂNG NHẬP (trước khi vào), dùng bản save của chủ máy nên hai chế độ hành xử
 * giống hệt (Luật 4). Real time (Date.now) là của client hiển thị, không nằm trong state đồng bộ.
 */
import { formatMoney } from './products';
import { daysAway } from './gifts';
import { yearEnd, yearOf, yearReward } from './yearReport';

/** Chỉ nhắc khi thật sự vắng ít nhất 1 NGÀY THẬT (chơi hằng ngày không bị làm phiền). */
export const RETURN_MIN_DAYS = 1;
/** Chỉ nêu thưởng tròn năm khi còn trong tầm ~2 tuần ngày game tới hết năm. */
export const RETURN_HORIZON_DAYS = 14;

export interface ReturnReminder {
  /** Số ngày THẬT chưa quay (floor nguyên ngày từ lastSeenAt). */
  daysAway: number;
  /** Số ngày GAME còn lại của năm hiện tại (0 = đúng hết năm). */
  gameDaysToYearEnd: number;
  /** Trao thưởng tròn năm khi nào: đang trong tầm nhắc hay chưa. */
  kind: 'year' | 'plain';
  line: string;
}

/** Nhắc quay lại: null khi đang chơi đều (vắng < 1 ngày thật) — không làm phiền. */
export function returnReminder(now: number, lastSeenAt: number, gameDay: number, level: number): ReturnReminder | null {
  const away = daysAway(now, lastSeenAt);
  if (away < RETURN_MIN_DAYS) return null;
  const gameDaysToYearEnd = yearEnd(yearOf(gameDay)) - gameDay;
  if (gameDaysToYearEnd >= 0 && gameDaysToYearEnd <= RETURN_HORIZON_DAYS) {
    return {
      daysAway: away,
      gameDaysToYearEnd,
      kind: 'year',
      line: `🐢 Đã ${away} ngày chưa quay — thưởng tròn năm (~${formatMoney(yearReward(level))}đ) còn ~${gameDaysToYearEnd} ngày nữa!`,
    };
  }
  return {
    daysAway: away,
    gameDaysToYearEnd,
    kind: 'plain',
    line: `🐢 Đã ${away} ngày chưa quay — hẻm nhớ tiệm nhà, ghé lại nhé!`,
  };
}
