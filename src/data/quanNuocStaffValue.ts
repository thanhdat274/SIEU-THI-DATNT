import { QUAN_NUOC_MAX_STAFF, QUAN_NUOC_WAGE, QUAN_PRICE_OPTIONS, quanNuocAvgSell, quanNuocDrinkIds, type QuanNuocPrice } from './quanNuoc';

/**
 * GĐ188 — Quán nước: "người thứ N đáng đồng lương không?" (chiều xuống)
 * GĐ127 đã trả lời chiều LÊN ("thuê thêm 1 người đáng không" — hire projection). Nhưng bộ GĐ141–153
 * "giá trị vs chi phí" đã soi từng nhân viên ca ngày / ca đêm / chi nhánh / trại / bếp — DUY NHẤT quán
 * nước chưa có lời phán về người đang GIỮ: người thứ N (tính từ 1) còn đáng đồng lương 150k/ngày hay
 * nên sa thải bớt để tiết lương. Đây là quyết định tiền LẶP HẰNG NGÀY của quán (lương trả đủ mỗi ngày).
 *
 * Helper THUẦN ĐỌC: tái dựng cùng công thức `quanNuocProjection` (đã tách khỏi state), tính GIÁ TRỊ BIÊN
 * của người thứ N = chênh lợi nhuận ròng khi tăng từ N−1 lên N nhân viên (cùng kho `drinkUnits` hiện tại).
 * Đáng giữ khi marginNet ≥ 0 (thêm người đem về ≥ lương); chưa đáng khi ≤ 0. Không đổi SAVE_VERSION/kinh
 * tế/sim — chỉ soi hộp đen bằng con số, đúng tinh thần "mọi quyết định hằng ngày phải có dữ liệu phản hồi".
 */

export type QuanNuocStaffVerdict = 'ok' | 'warn' | 'low';

export interface QuanNuocStaffValue {
  /** Số thứ tự nhân viên đang xét (1..staff hiện tại). */
  index: number;
  /** Lương ngày của người này (không đổi, QUAN_NUOC_WAGE). */
  wage: number;
  /** Giá trị biên: chênh lợi nhuận ròng/ngày so với khi chỉ có index−1 người (đã trừ lương của NHỮNG
   * NGƯỜI KHÁC = không trừ người này); tức phần doanh thu thô người này mang thêm (bị chặn bởi kho). */
  marginalValue: number;
  /** marginalValue − wage: người này thực lãi/ngày cho chủ (dương = đáng giữ). */
  marginNet: number;
  /** Tỷ lệ thu hồi lương (marginalValue / wage). */
  ratio: number;
  verdict: QuanNuocStaffVerdict;
}

/**
 * Doanh thu thô và lương của mốc staff (dùng chung công thức quanNuocProjection — tách rời để tính
 * giá trị biên của riêng một người).
 */
function revAndWage(price: QuanNuocPrice, level: number, staff: number, drinkUnits: number): { revenue: number; wages: number } {
  const opt = QUAN_PRICE_OPTIONS[price];
  const avgPrice = quanNuocAvgSell(level);
  const customers = Math.round(45 * opt.traffic * (1 + 0.15 * staff));
  const wanted = Math.ceil(customers * 1.5);
  const served = Math.min(wanted, Math.max(0, drinkUnits));
  const revenue = Math.round(served * avgPrice * opt.mul);
  return { revenue, wages: staff * QUAN_NUOC_WAGE };
}

/**
 * Bảng giá trị biên từng nhân viên quán nước đang giữ (1..staff). Giá trị biên của người thứ N = doanh thu
 * thô N − doanh thu thô N−1 (bị chặn bởi kho `drinkUnits`); marginNet = biên đó − lương 150k. Nếu kho chỉ
 * đủ cho ít người, các người cuối có marginNet ≤ 0 → verdict 'low'/'warn' → gợi nên sa thải bớt để tiết lương.
 * Trả mảng rỗng khi khó hiểu (chưa mở / chưa có món / staff 0).
 */
export function quanNuocStaffValues(price: QuanNuocPrice, level: number, staff: number, drinkUnits: number): QuanNuocStaffValue[] {
  if (staff <= 0 || staff > QUAN_NUOC_MAX_STAFF) return [];
  // Chưa có món đồ uống nào mở thì không phán (avgPrice 0 → mọi thứ vô nghĩa).
  if (quanNuocDrinkIds(level).length === 0) return [];

  const out: QuanNuocStaffValue[] = [];
  let prev = revAndWage(price, level, 0, drinkUnits).revenue; // doanh thu với 0 nhân viên
  for (let i = 1; i <= staff; i++) {
    const cur = revAndWage(price, level, i, drinkUnits).revenue;
    const marginalValue = cur - prev; // doanh thu thô người thứ i mang thêm
    const marginNet = marginalValue - QUAN_NUOC_WAGE;
    const ratio = QUAN_NUOC_WAGE > 0 ? marginalValue / QUAN_NUOC_WAGE : 0;
    const verdict: QuanNuocStaffVerdict = marginNet >= 0 ? 'ok' : ratio >= 0.5 ? 'warn' : 'low';
    out.push({ index: i, wage: QUAN_NUOC_WAGE, marginalValue, marginNet, ratio, verdict });
    prev = cur;
  }
  return out;
}

/** "Người tiếp theo có đáng tuyển thêm không" — chiều LÊN, bổ sung cho chiều xuống (tái dùng GĐ127). */
export function quanNuocNextStaffVerdict(price: QuanNuocPrice, level: number, staff: number, drinkUnits: number): 'worth' | 'notworth' | 'full' {
  if (staff >= QUAN_NUOC_MAX_STAFF) return 'full';
  const cur = revAndWage(price, level, staff, drinkUnits).revenue;
  const next = revAndWage(price, level, staff + 1, drinkUnits).revenue;
  return next - cur >= QUAN_NUOC_WAGE ? 'worth' : 'notworth';
}
