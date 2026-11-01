/**
 * GĐ158 — "🛝 Sân chơi khu phố: góp bao nhiêu, còn bao nhiêu, đáng không?"
 *
 * Thẻ soi sáng thuần ĐỌC cho LandmarkPanel: trả lời 3 câu hỏi mà panel GĐ40 chưa trả lời —
 *   1. Đã góp bao nhiêu lượt, ước tốn bao nhiêu tiền?
 *   2. Còn thiếu bao nhiêu lượt, ước còn tốn bao nhiêu nữa?
 *   3. Đáng không — sau khánh thành khách tiệm chính đông thêm 6%, hòa lại sau mấy ngày bán?
 *
 * Sự thật kinh tế đang bật nhưng không ai thấy:
 *   - `contributeLandmark` (core/slices/progress.ts) thu mỗi lượt `feedCost(stage_lúc_đó, level)`,
 *     với stage_lúc_đó = `landmarkProgress(số_lượt_đã_góp).index` TRƯỚC khi +1. Vì mốc cộng dồn
 *     là 7/14/21/28 và `landmarkProgress(c).index` nhảy giai đoạn ĐÚNG LÚC chạm mốc:
 *       lượt 1–14 trả tier 0 · lượt 15–21 trả tier 1 · lượt 22–28 trả tier 2
 *     (tier 3 không bao giờ bị thu — chạm lượt 28 là done ngay).
 *   - Level LÚC GÓP không lưu trong save (`biz.landmark` chỉ có contributions + lastContributeDay),
 *     nên tổng ĐÃ góp chỉ là ƯỚC theo level hiện tại — comment rõ ở từng trường.
 *   - Sau khánh thành `landmarkCustomerFactor` nhân khách tiệm chính ×1.06
 *     (LANDMARK_CUSTOMER_BONUS_FACTOR − 1 = +6%), áp ở src/agents/customers.ts.
 *
 * Thuần đọc 100%: KHÔNG đổi state / SAVE_VERSION / kinh tế / persist.
 */
import type { DayRecord } from '../core/gameTypes';
import { feedCost, landmarkProgress, LANDMARK_CUSTOMER_BONUS_FACTOR, LANDMARK_TARGETS } from './landmark';

/** Tổng số lượt góp để khánh thành (28 = mốc cuối). */
export const LANDMARK_TOTAL_TURNS = LANDMARK_TARGETS[LANDMARK_TARGETS.length - 1];

/** Số ngày doanh thu gần nhất dùng để ước lợi ích +6% (cửa sổ "tuần"). */
export const LANDMARK_PAYOFF_WINDOW = 7;

export interface LandmarkPayoff {
  /** Đã khánh thành (contributions ≥ 28) — qua landmarkProgress để khớp luật game. */
  done: boolean;
  /** Đã góp bao nhiêu lượt (kẹp [0..28] — game vốn chặn ở 28, kẹp để đỡ dữ liệu lạ). */
  contributedTurns: number;
  /**
   * Ước tổng ĐÃ góp (đ): cộng feedCost theo giai đoạn TỪNG LƯỢT đi qua, tính ở level HIỆN TẠI.
   * ƯỚC vì level lúc góp không lưu trong save — tiệm lớn lên thì ước sẽ nhỉnh hơn thực đã trả.
   */
  spentEst: number;
  /** Còn bao nhiêu lượt (0 nếu đã xong). */
  remainingTurns: number;
  /**
   * Ước tiền còn phải góp (đ): từng lượt còn lại đi qua đúng giai đoạn còn lại (luật charge
   * thật của contributeLandmark), tính ở level hiện tại — giả định level không đổi tới khi xong.
   */
  remainingCostEst: number;
  /**
   * Ước lợi ích/ngày SAU khánh thành (đ) = avgRevenue7 × 6% (làm tròn nguyên) —
   * doanh thu 7 ngày gần nhất của TIỆM CHÍNH (history mới nhất ở CUỐI mảng, endDay append).
   * Đây là ước theo DOANH THU (chưa trừ giá vốn hàng bán thêm), đúng bản chất "+khách".
   * null khi chưa có ít nhất 1 ngày history (chưa đủ dữ liệu để nói "đáng không").
   */
  dailyGainEst: number | null;
  /** (spentEst + remainingCostEst) / dailyGainEst, làm tròn 1 chữ số. null khi chưa đủ dữ liệu/lợi ích = 0. */
  paybackDays: number | null;
}

/** Dạng state landmark chấp nhận: state thật ({contributions, lastContributeDay}) hoặc thiếu/rỗng. */
type LandmarkStateLike = { contributions?: number } | undefined | null;
/** History chấp nhận thiếu — save cũ/gán mới đều an toàn. */
type HistoryLike = readonly DayRecord[] | undefined | null;

/**
 * Bóc tách payoff sân chơi ra số. An toàn mọi đầu vào: landmark undefined/âm → coi như 0 lượt;
 * history undefined/rỗng → dailyGainEst/paybackDays null (chưa đủ dữ liệu, không bịa số).
 */
export function landmarkPayoff(landmark: LandmarkStateLike, level: number, history?: HistoryLike): LandmarkPayoff {
  const raw = landmark && typeof landmark === 'object' ? landmark.contributions : 0;
  const contributions = typeof raw === 'number' && raw > 0 ? raw : 0; // dữ liệu xấu (âm/NaN) → 0
  const counted = Math.min(contributions, LANDMARK_TOTAL_TURNS);
  const done = landmarkProgress(contributions).done;
  const lv = Number.isFinite(level) && level > 0 ? level : 0;

  // Luật charge thật của contributeLandmark: lượt thứ (i+1) bị thu feedCost(stage của i lượt đã góp).
  const turnCost = (i: number) => feedCost(landmarkProgress(i).index, lv);

  // Ước ĐÃ góp — level hiện tại thay cho level từng lúc góp (không lưu trong save).
  let spentEst = 0;
  for (let i = 0; i < counted; i++) spentEst += turnCost(i);

  // Ước CÒN phải góp — từng lượt còn lại đi qua đúng giai đoạn còn lại (không phải
  // feedCost hiện tại × lượt còn lại: rẻ hơn thật vì 14 lượt đầu luôn ở tier rẻ nhất).
  let remainingCostEst = 0;
  for (let i = counted; i < LANDMARK_TOTAL_TURNS; i++) remainingCostEst += turnCost(i);

  // Lợi ích +6% ước theo doanh thu 7 ngày gần nhất — history append cuối mảng là mới nhất.
  const recent = (history ?? []).slice(-LANDMARK_PAYOFF_WINDOW);
  const avgRevenue7 =
    recent.length > 0 ? recent.reduce((sum, r) => sum + (r?.revenue ?? 0), 0) / recent.length : null;
  const dailyGainEst =
    avgRevenue7 !== null ? Math.round(avgRevenue7 * (LANDMARK_CUSTOMER_BONUS_FACTOR - 1)) : null;

  const totalInvest = spentEst + remainingCostEst;
  const paybackDays =
    dailyGainEst !== null && dailyGainEst > 0 && totalInvest > 0
      ? Math.round((totalInvest / dailyGainEst) * 10) / 10
      : null;

  return { done, contributedTurns: counted, spentEst, remainingTurns: done ? 0 : LANDMARK_TOTAL_TURNS - counted, remainingCostEst, dailyGainEst, paybackDays };
}
