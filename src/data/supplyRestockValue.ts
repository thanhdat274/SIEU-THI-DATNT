/**
 * Hệ chuỗi cung — CHIỀU SÂU "SOI SÁNG" PHIẾU NẠP KHO (GĐ202, L16 GĐ2345). Phiếu nạp kho chung chỉ liệt kê
 * SỐ ĐƠN VỊ cần bổ sung cho từng điểm bán ("thêm N, kho chung có M") — chưa cho người chơi biết SO TIỀN AT
 * STAKE: những đơn vị hụt đó nếu không nạp thì bỏ lỡ bao nhiêu doanh thu. Helper này quy ĐƠN VỊ → ĐỒNG theo
 * giá bán lẻ (referenceSell) — giá trị doanh thu tiềm năng của phần thiếu, để xếp ưu tiên bổ sung điểm nào
 * trước theo ĐỒNG chứ không theo %. Chi nhánh: theo mã món có sẵn; quán nước: theo bình quân giá món nước mở.
 * THUẦN, tất định (không RNG): đọc RestockLine + productById + quanNuocDrinkIds; không đổi state/sim/save/kinh
 * tế → golden không đụng.
 */
import type { RestockLine } from './supplyChain';
import { productById } from './products';
import { quanNuocDrinkIds } from './quanNuoc';
import { fmtNum } from '../core/format';

export interface RestockValueRow {
  /** == line.id nếu là món cụ thể, else '' (nhóm). */
  id: string;
  label: string;
  outlet: string;
  need: number;
  /** Giá bán lẻ quy đổi mỗi đơn vị (món cụ thể hoặc bình quân nhóm nước). */
  perUnit: number;
  /** Giá trị doanh thu tiềm năng của phần hụt (need × perUnit). */
  worth: number;
}

export const fmt = (n: number) => fmtNum(n);

export function supplyRestockValue(lines: RestockLine[], level: number): {
  rows: RestockValueRow[];
  total: number;
  headline: string;
} {
  const drinkAvg = (() => {
    const ids = quanNuocDrinkIds(level);
    if (ids.length === 0) return 0;
    return Math.round(ids.reduce((s, id) => s + (productById(id)?.sell ?? 0), 0) / ids.length);
  })();
  const rows: RestockValueRow[] = lines.map((l) => {
    const perUnit = l.id ? (productById(l.id)?.sell ?? 0) : drinkAvg;
    const worth = l.need * perUnit;
    return { id: l.id ?? '', label: l.label, outlet: l.outlet, need: l.need, perUnit, worth };
  });
  const total = rows.reduce((n, r) => n + r.worth, 0);
  const headline =
    rows.length === 0
      ? 'Không có món nào cần nạp.'
      : `Giá trị doanh thu đang "treo": ~${fmt(total)}đ/${rows.length} dòng cần bổ sung.`;
  return { rows, total, headline };
}
