/**
 * GĐ2224 + GĐ2225 — LỚP NHẮC "ĐÃ N NGÀY CHƯA QUAY" ở màn đăng nhập, nối vào các mốc thưởng sắp hết hạn.
 *
 * Bối cảnh: game đã có đủ vòng lặp giữ chân — streak điểm danh (claimGift), thử thách tuần/tháng
 * (weeklyChallenge/closeWeek), thưởng tròn năm (closeYear/yearReward), sự kiện mùa (seasonEvent +
 * SEASON_REWARD_PER_STAR), niên giám mùa (seasonAlmanac), quà chào mừng quay lại (checkWelcomeBack).
 * Nhưng quà chào mừng chỉ bắn MỘT notify lúc vào game; CHƯA có lớp bền hiển thị "đã N NGÀY THẬT chưa
 * quay" + liệt kê những mốc thưởng sắp hết hạn nếu không quay (đích rõ ràng có deadline). Helper này
 * bù mảnh đó: GĐ2224 = nối thưởng tròn năm; GĐ2225 = mở rộng thêm mùa (sự kiện mùa đang diễn ra) và
 * mốc niên giám mùa — mỗi số từ ĐÚNG công thức có sẵn (yearReward / SEASON_REWARD_PER_STAR /
 * almanacMilestoneReward), KHÔNG bịa.
 *
 * THUẦN đọc: chỉ READS lastSeenAt/day/level/almanac có sẵn — không import store, không đổi state/save
 * (không đụng SAVE_VERSION), không cấp tiền mới (Luật 10), không chạy trong sim → golden giữ byte.
 * Co-op: hiển thị ở MÀN ĐĂNG NHẬP (trước khi vào), dùng save của chủ máy nên hai chế độ hành xử giống
 * hệt (Luật 4). Real time (Date.now) là của client hiển thị, không nằm trong state đồng bộ.
 */
import { formatMoney } from './products';
import { daysAway } from './gifts';
import { yearEnd, yearOf, yearReward } from './yearReport';
import { dayOfYear } from './calendar';
import { SEASON_REWARD_PER_STAR, seasonEvent, seasonEventName, seasonWindow } from './seasonEvent';
import { almanacMilestoneReward, nextAlmanacMilestone } from './seasonAlmanac';
import { WEEK_DAYS, weeklyChallenge, type WeekTally } from './bizWeeks';

/** Chỉ nhắc khi thật sự vắng ít nhất 1 NGÀY THẬT (chơi hằng ngày không bị làm phiền). */
export const RETURN_MIN_DAYS = 1;
/** Chỉ nêu mốc thưởng khi deadline còn trong tầm ~2 tuần ngày game (năm/mùa). */
export const RETURN_HORIZON_DAYS = 14;
/** Niên giám chỉ nhắc khi mốc kế tiếp cách ≤ chừng này sao (mục tiêu gần, không nhắc xa vời). */
export const ALMANAC_HINT_SAO = 3;

export type ReturnAnchor = 'year' | 'season' | 'almanac' | 'plain';

export interface ReturnNudgeItem {
  key: ReturnAnchor;
  icon: string;
  text: string;
}

export interface ReturnReminder {
  daysAway: number;
  gameDaysToYearEnd: number;
  kind: ReturnAnchor;
  line: string;
}

/** Liệt kê các mốc thưởng sắp hết hạn nếu không quay (ưu tiên năm > mùa > niên giám, tối đa 3). */
export function returnNudge(
  now: number,
  lastSeenAt: number,
  gameDay: number,
  level: number,
  almanacTotal = 0,
  almanacClaimed: number[] = [],
): ReturnNudgeItem[] {
  const away = daysAway(now, lastSeenAt);
  if (away < RETURN_MIN_DAYS) return [];
  const items: ReturnNudgeItem[] = [];

  // Năm — thưởng tròn năm (yearReward) khi còn gần hết năm.
  const gameDaysToYearEnd = yearEnd(yearOf(gameDay)) - gameDay;
  if (gameDaysToYearEnd >= 0 && gameDaysToYearEnd <= RETURN_HORIZON_DAYS) {
    items.push({
      key: 'year',
      icon: '🎆',
      text: `Đã ${away} ngày chưa quay — thưởng tròn năm (~${formatMoney(yearReward(level))}đ) còn ~${gameDaysToYearEnd} ngày nữa!`,
    });
  }

  // Mùa — sự kiện mùa (5 ngày, mỗi ngày xong mục tiêu +25.000đ/sao) đang diễn ra.
  const se = seasonEvent(gameDay);
  if (se) {
    const daysLeft = seasonWindow(se.season).end - dayOfYear(gameDay);
    items.push({
      key: 'season',
      icon: '🌾',
      text: `Đã ${away} ngày chưa quay — sự kiện ${seasonEventName(se.season)} còn ~${Math.max(0, daysLeft)} ngày, về kịp gom ⭐ mùa (mỗi sao ≈${formatMoney(SEASON_REWARD_PER_STAR)})!`,
    });
  }

  // Niên giám — mốc tổng sao mọi mùa còn gần.
  const nm = almanacTotal > 0 ? nextAlmanacMilestone(almanacTotal, almanacClaimed) : null;
  if (nm && nm.remaining <= ALMANAC_HINT_SAO) {
    items.push({
      key: 'almanac',
      icon: '📖',
      text: `Đã ${away} ngày chưa quay — mốc niên giám ${nm.at} sao còn cách ${nm.remaining} sao (thưởng ~${formatMoney(almanacMilestoneReward(nm.at, level))}đ)!`,
    });
  }

  if (items.length === 0) {
    items.push({ key: 'plain', icon: '🐢', text: `Đã ${away} ngày chưa quay — hẻm nhớ tiệm nhà, ghé lại nhé!` });
  }
  return items.slice(0, 3);
}

/**
 * Dòng chính của lớp nhắc (dùng cho chỗ chỉ đủ chỗ 1 dòng): ưu tiên năm, rồi mùa, rồi niên giám,
 * rồi nhắc cơ bản; null khi đang chơi đều. Giữ tương thích GĐ2224 (wrapper của returnNudge).
 */
export function returnReminder(now: number, lastSeenAt: number, gameDay: number, level: number): ReturnReminder | null {
  const away = daysAway(now, lastSeenAt);
  if (away < RETURN_MIN_DAYS) return null;
  const gameDaysToYearEnd = yearEnd(yearOf(gameDay)) - gameDay;
  const item = returnNudge(now, lastSeenAt, gameDay, level)[0] ?? { key: 'plain' as ReturnAnchor, icon: '🐢', text: `Đã ${away} ngày chưa quay — hẻm nhớ tiệm nhà, ghé lại nhé!` };
  return { daysAway: away, gameDaysToYearEnd, kind: item.key, line: item.text };
}

/**
 * GĐ2226 — NHẮC DEADLINE THỬ THÁCH TUẦN ở màn đăng nhập (mốc quay lại ngắn hạn nhất).
 *
 * Thử thách tuần (weeklyChallenge/closeWeek) vốn chỉ hiện trong PeriodTabs lúc đang chơi; chưa có lớp
 * nhắc bền "đang hụt mục tiêu tuần này, còn mấy ngày" ở màn đăng nhập. Helper này bù mảnh đó, THUẦN đọc
 * từ biz.week (WeekTally) + weeklyChallenge + cấp: đang hụt thì mách "còn ~N ngày · thiếu ~M đơn/đ...".
 * Không đụng state/save/kinh tế (chỉ đọc), không chạy sim. Null khi: chơi đều (vắng <1 ngày), chưa có
 * sổ tuần, đã đạt mục tiêu, hoặc hết tuần.
 */
export interface ReturnWeekNudge {
  icon: string;
  text: string;
}
export function returnNudgeWeek(
  now: number,
  lastSeenAt: number,
  gameDay: number,
  level: number,
  week: WeekTally | null,
  owned: string[] = [],
): ReturnWeekNudge | null {
  if (daysAway(now, lastSeenAt) < RETURN_MIN_DAYS) return null;
  if (!week) return null;
  const weekNum = Math.ceil(gameDay / WEEK_DAYS);
  const ch = weeklyChallenge(weekNum, level);
  const current = ch.measure === 'revenue' ? (week.revenue ?? 0) : (week[ch.measure] ?? 0);
  const target = ch.target(level, owned);
  const remaining = WEEK_DAYS - ((gameDay - 1) % WEEK_DAYS);
  if (remaining < 1 || target <= 0 || current >= target) return null;
  const missing = Math.max(0, target - current);
  return {
    icon: ch.icon,
    text: `Tuần này còn ~${remaining} ngày — thiếu ~${missing.toLocaleString('vi-VN')} ${ch.unit} nữa đạt "${ch.title}" (thưởng ~${formatMoney(ch.reward(level))}đ)!`,
  };
}
