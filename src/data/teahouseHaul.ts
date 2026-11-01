import { quanNuocProjection, quanNuocDrinkIds, type QuanNuocState } from './quanNuoc';

/**
 * GĐ208 — "Quán nước soi độ đủ đồ uống theo đêm" (áp cơ chế chở sang quán nước, vế THUẦN đọc).
 *
 * Quán nước không có kho riêng: nó rút ĐỒ UỐNG từ kho chung (cùng ly với kệ tiệm chính), nên "kệ
 * quán nước vơi" tức là kho chung đang bị quán ăn khô. `quanNuocRestockTip` mới kể CHUYỆN TỐI NAY
 * (thiếu đơn vị bán hụt tối nay là bao); đây kể CHUYỆN VỀ SAU — còn mấy đêm đồ uống, có nên chở thêm
 * không — là bản "quán nước" của autoHaulDue (GĐ206) ở chi nhánh. THUẦN: chỉ đọc drinkUnits + quan
 * để dự phóng, KHÔNG đổi state. Dùng để hiện thẻ "🥤 Sắp ăn khô kho" + mách "nên chở" sớm vài đêm.
 */

/** Còn ≥ 3 đêm đồ uống → sướng, không cần đụng kho. */
export const TEAHOUSE_HAUL_DAYS_OK = 3;
/** Còn ≤ 2 đêm → bắt đầu lo, nên chở thêm sớm (cửa sổ vài đêm để nhập chứ không chờ cạn một đêm). */
export const TEAHOUSE_HAUL_DAYS_WARN = 2;
/** Còn ≤ 1 đêm → coi như sắp ăn khô kho, chở gấp. */
export const TEAHOUSE_HAUL_DAYS_DANGER = 1;

export interface TeahouseHaulRead {
  /** Số ly đồ uống quán tiêu mỗi đêm nếu mở (theo nhân viên/giá hiện tại). 0 khi đóng cửa. */
  needPerNight: number;
  /** Tổng ly đồ uống hiện có trong kho chung. */
  haveNow: number;
  /** Còn đủ bao nhiêu đêm (`Infinity` khi quán đóng / không có nhu cầu). */
  daysLeft: number;
  verdict: 'ok' | 'warn' | 'danger';
  /** GĐ208: có nên chở thêm đồ uống về kho không (quán mở + còn ≤ 2 đêm). */
  haulNow: boolean;
}

export function teahouseHaulRead(drinkUnits: number, q: QuanNuocState | undefined, level: number, day?: number): TeahouseHaulRead {
  const need = q?.open ? quanNuocProjection(q, level, Infinity, undefined, day).wanted : 0;
  const haveNow = Math.max(0, drinkUnits);
  const daysLeft = need > 0 ? haveNow / need : Infinity;
  const verdict = daysLeft <= TEAHOUSE_HAUL_DAYS_DANGER ? 'danger' : daysLeft <= TEAHOUSE_HAUL_DAYS_WARN ? 'warn' : 'ok';
  return { needPerNight: need, haveNow, daysLeft, verdict, haulNow: q?.open === true && daysLeft <= TEAHOUSE_HAUL_DAYS_WARN };
}

export interface TeahouseFillLine { id: string; cases: number; units: number }

/**
 * GĐ209 — "Nạp đồ uống quán nước": CƠ CHẾ CHỞ thật cho quán nước. Quán nước rút ĐỒ UỐNG từ kho CHUNG
 * nên không có kệ riêng để "chở vào"; cách trung thực là CHỞ = đặt đồ uống về kho (giỏ đặt đơn) đủ cho
 * tối nay. Helper THUẦN phân bổ phần thiếu (wanted − drinkUnits) vào các món đồ uống quán bán mà nhà
 * cung cấp hiện có (qua `supplierCase(id)` — trả caseSize nếu bán, 0 nếu không), quy theo thùng. OrderPanel
 * dùng để một-chạm nhét vào giỏ (như fillBranchSheet GĐ205) — không tự sửa storage/cart ở đây.
 */
export function teahouseFillPlan(
  q: QuanNuocState | undefined,
  level: number,
  drinkUnits: number,
  supplierCase: (id: string) => number,
  day?: number,
): { lines: TeahouseFillLine[]; topup: number } {
  const topup = q?.open ? Math.max(0, quanNuocProjection(q, level, Infinity, undefined, day).wanted - Math.max(0, drinkUnits)) : 0;
  if (topup <= 0) return { lines: [], topup };
  const add: Record<string, number> = {};
  let remaining = topup;
  for (const id of quanNuocDrinkIds(level)) {
    if (remaining <= 0) break;
    const cs = supplierCase(id);
    if (cs < 1) continue;
    const cases = Math.ceil(remaining / cs);
    add[id] = cases;
    remaining -= cases * cs;
  }
  const lines = Object.entries(add).map(([id, cases]) => ({ id, cases, units: cases * Math.max(1, supplierCase(id)) }));
  return { lines, topup };
}
