/**
 * GĐ148 — "⭐ Danh tiếng đáng bao nhiêu khách?"
 *
 * Định lượng phần thưởng KHÁCH-VÀO-CỬA của danh tiếng.
 *
 * Sự thật kinh tế đang bật nhưng không ai thấy (customers.ts:197):
 *   visit = (0.5 + min(plants*0.05, 0.25) + repVisitBonus) * traffic * priceAppeal * dirtVisitFactor * ...
 * với  repVisitBonus = (overall - 3) * 0.05   (reputation.ts:98, =0 khi chưa đủ REP_MIN_SAMPLES)
 *
 * Nền ghé của người đi đường là 0.5; danh tiếng CỘNG số học vào nền đó, nên hiệu quả
 * tương đối = repVisitBonus / (0.5 + plantBonus). Mỗi 0.5★ = +0.025 với bonus.
 *
 * Số khách đi đường mỗi ngày ≈ customersPerDay(level) (customers.ts:180 — một nửa chỉ
 * đi ngang qua, người ghé là phần chịu xác suất `visit`), nên khách THÊM mỗi ngày từ
 * một mức bonus b = absolute × customersPerDay(level).
 *
 * Thuần đọc 100%: chỉ ĐỌC rep.factors/overall/samples + customersPerDay(level) + số chậu
 * cây từ furniture. KHÔNG đổi state / SAVE_VERSION / kinh tế / persist.
 */
import { Reputation, REP_MIN_SAMPLES, repVisitBonus } from './reputation';
import { customersPerDay } from './levels';

/** Nền xác suất ghé của người đi đường khi danh tiếng trung tính (customers.ts:197). */
export const VISIT_BASE = 0.5;
/** Mỗi chậu cây +0.05 xác suất ghé (customers.ts:192). */
export const PLANT_BONUS = 0.05;
/** Trần bonus chậu cây (customers.ts:197). */
export const PLANT_BONUS_CAP = 0.25;
/** Bonus 1 nấc sao (0.5★) = 0.025 = 0.5 * 0.05 (reputation.ts:98). */
export const HALF_STAR_BONUS = 0.025;
/** Ngưỡng điểm coi là "tụt danh tiếng" (dưới điểm trung tính 3.0). */
export const REP_WEAK = 3;
/** Số mặt danh tiếng (price/stock/clean/speed/quality) — overall là trung bình 5 mặt. */
const REP_FACTORS_LEN = 5;

export interface RepPayoff {
  /** Chưa đủ 10 lượt khách để chấm thật (không lừa điểm giả 3.0). */
  insufficient: boolean;
  /** repVisitBonus thực tế đang áp (0 khi insufficient). */
  absolute: number;
  /** % tương đối trên người đi đường = absolute / (0.5 + plantBonus). */
  pct: number;
  /** Ước khách thêm/nhẹ mất mỗi ngày = absolute × customersPerDay(level). */
  extraKhach: number;
  /** % thêm nếu lên thêm 0.5★. */
  nextStarPct: number;
  /** Ước khách thêm mỗi ngày nếu lên thêm 0.5★. */
  nextStarKhach: number;
}

/**
 * Bóc tách payoff danh tiếng ra số. `plantCount` = số chậu cây trong furniture (ảnh
 * hưởng mẫu số của % tương đối). Trả mọi trường bằng 0 khi chưa đủ mẫu.
 */
export function repPayoff(rep: Reputation, level: number, plantCount = 0): RepPayoff {
  const insufficient = rep.samples < REP_MIN_SAMPLES;
  const plantBonus = Math.min(plantCount * PLANT_BONUS, PLANT_BONUS_CAP);
  const denom = VISIT_BASE + plantBonus; // ≥ 0.5, không bao giờ 0
  const absolute = insufficient ? 0 : repVisitBonus(rep);
  const cpd = customersPerDay(level);
  return {
    insufficient,
    absolute,
    pct: insufficient ? 0 : absolute / denom,
    extraKhach: Math.round(absolute * cpd),
    nextStarPct: insufficient ? 0 : HALF_STAR_BONUS / denom,
    nextStarKhach: insufficient ? 0 : Math.round(HALF_STAR_BONUS * cpd),
  };
}

export interface RepFocus {
  factor: string | null;
  /** Khách/ngày sẽ thêm nếu nhấc mặt yếu nhất lên 4.0★ (0 khi đã đủ/insufficient). */
  gainKhach: number;
}

/**
 * Mồi hành động: nhấc mặt yếu nhất lên 4.0★ thì overall tăng (4.0−x)/5, kéo theo
 * repVisitBonus tăng bao nhiêu khách/ngày. Trả null-factor khi chưa đủ mẫu hoặc không
 * có mặt < 4.
 */
export function repPayoffFocus(rep: Reputation, level: number): RepFocus {
  if (rep.samples < REP_MIN_SAMPLES || !rep.weakest) return { factor: null, gainKhach: 0 };
  const x = rep.factors[rep.weakest];
  if (x >= 4) return { factor: rep.weakest, gainKhach: 0 };
  const newOverall = rep.overall + (4 - x) / REP_FACTORS_LEN;
  // repVisitBonus nhạy với overall — nhấc đúng cả các mặt khác cũng đổi, ta chỉ ước thêm phần yếu nhất
  const gainAbsolute = ((newOverall - 3) - (rep.overall - 3)) * 0.05;
  return { factor: rep.weakest, gainKhach: Math.round(Math.max(0, gainAbsolute) * customersPerDay(level)) };
}
