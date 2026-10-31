import type { Festival } from './calendar';
import { upcomingFestival } from './calendar';
import { PREP_MIN_QTY, PREP_NOTICE, prepBonus, prepReadiness } from './festivalPrep';

// ───── GĐ247: trữ lễ một chạm — biến nhắc trữ hàng (GĐ70) thành HÀNH ĐỘNG trong Nhập hàng ─────
// Sổ đầu ngày đã nhắc "trữ sẵn" nhưng người chơi phải tự tìm từng món trong bảng nhập. Bản này đưa
// phiếu trữ lễ thẳng vào OrderPanel (tiền lệ fillBranchSheet GĐ205 / fillQuanNuocDrinks GĐ209):
// liệt kê món thiếu (kho < PREP_MIN_QTY), quy ra thùng, lọc món mối hiện tại không bán. THUẦN ĐỌC —
// giỏ chỉ được điền bởi UI qua maxFit nên vẫn tôn trọng ngân sách (chừa lương) + chỗ nhà kho.

export interface FestivalRestockLine {
  id: string;
  /** Số thùng cần đặt để kho đạt PREP_MIN_QTY (làm tròn lên). */
  cases: number;
  /** Số đơn vị còn thiếu (PREP_MIN_QTY − kho). */
  units: number;
}

export interface FestivalRestockPlan {
  festival: Festival;
  /** Còn mấy ngày tới lễ. */
  inDays: number;
  lines: FestivalRestockLine[];
  /** Món thiếu nhưng mối hiện tại không bán — UI nói rõ để người chơi đổi mối. */
  skipped: string[];
  /** Thưởng đón lễ nếu trữ đủ trước khi lễ bắt đầu (GĐ70). */
  bonus: number;
}

/** Phiếu trữ lễ cho Nhập hàng: null khi không có lễ sắp tới trong PREP_NOTICE ngày hoặc đã trữ đủ
 *  (hoặc món thiếu đều nằm ngoài mối hiện tại). Lễ ĐANG diễn ra không trả phiếu — thưởng cần trữ TRƯỚC lễ. */
export function festivalRestockPlan(opts: {
  day: number;
  level: number;
  storage: Record<string, number>;
  /** Mối hiện tại có bán món này không (OrderPanel: rows.some((r) => r.p.id === id)). */
  sells: (id: string) => boolean;
  caseSizeOf: (id: string) => number;
}): FestivalRestockPlan | null {
  const { day, level, storage, sells, caseSizeOf } = opts;
  const soon = upcomingFestival(day, PREP_NOTICE);
  if (!soon) return null;
  const missing = prepReadiness(storage, soon.festival, level).missing;
  if (!missing.length) return null;
  const lines: FestivalRestockLine[] = [];
  const skipped: string[] = [];
  for (const id of missing) {
    if (!sells(id)) {
      skipped.push(id);
      continue;
    }
    const units = PREP_MIN_QTY - (storage[id] ?? 0);
    const cases = Math.ceil(units / caseSizeOf(id));
    if (cases > 0) lines.push({ id, cases, units });
  }
  if (!lines.length) return null;
  return { festival: soon.festival, inDays: soon.inDays, lines, skipped, bonus: prepBonus(soon.festival, level) };
}

// ───── GĐ249: trữ lễ thành "việc sáng" ─────
// Phiếu trữ lễ chỉ hiện trong Nhập hàng thì người chơi phải tự mở bảng mới thấy. Sổ đầu ngày có danh
// sách "việc hôm nay" (planDay, GĐ76) — biến phiếu thành một việc ở đó (mẫu GĐ189 quán nước thành
// việc sáng): đáng làm TRƯỚC khi mở cửa, càng gần lễ càng nguy cấp.

/** Một mục "việc hôm nay" trên Sổ đầu ngày (khớp DayAction trong MorningPanel). */
export interface FestivalPrepAction {
  icon: string;
  text: string;
  panel: 'order';
  /** Còn ≤1 ngày là nguy cấp (đỏ) — trễ là mất luôn thưởng đón lễ. */
  danger: boolean;
  priority: number;
}

/** Biến phiếu trữ lễ thành việc sáng: null khi không có phiếu. */
export function festivalPrepAction(plan: FestivalRestockPlan | null, formatMoneyFn: (n: number) => string): FestivalPrepAction | null {
  if (!plan || !plan.lines.length) return null;
  const urgent = plan.inDays <= 1;
  return {
    icon: plan.festival.icon,
    text: `Trữ lễ ${plan.festival.name} (còn ${plan.inDays} ngày): thiếu ${plan.lines.length} món → đón lễ +${formatMoneyFn(plan.bonus)}`,
    panel: 'order',
    danger: urgent,
    priority: urgent ? 1 : 2,
  };
}
