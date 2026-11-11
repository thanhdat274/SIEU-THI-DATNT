/**
 * Hệ 1 L7 (SPEC §1.7) — THẺ PAYOFF của quyết định "PHƠI · MUỐI · Ủ": tự làm so với mua ở hàng xóm.
 * Hiện CẢ HAI VẾ (định lý thiết kế R7):
 *  - Vế lời: mua nguyên liệu thô rẻ làm hơn mua thành phẩm → tiết mỗi mẻ `netSave = buyCost − rawCost`.
 *    Giá vốn một mẻ = 55–65% giá nhập thành phẩm (`marginPct`) — khoá bằng test preservePayoff.
 *  - Vế đánh đổi: tiền lẽ ra tốn ở hàng xóm làm tăng doanh mua tháng → hoàn cuối tháng (supplierRel).
 *    Tự làm thì không tốn chỗ đó → hoàn tháng ít đi chút (`rebateLost` = marginal rebate của phần
 *    netSave không chi ở mối). "Thẻ payoff phải hiện cả hai vế" (SPEC §1.7).
 * THUẦN, tất định — chỉ đọc def/giá, không đổi state/sim/RNG; tách pure data để test khoá §1.7.
 */
import { PRESERVE_DEFS, type PreserveDef } from './preserve';
import { productById } from './products';
import { monthlyRelRebate } from './supplierRel';

export interface PreservePayoffRow {
  defId: string;
  name: string;
  kind: 'phoi' | 'muoi' | 'u';
  finishDays: number;
  /** Tự làm: tổng tiền mua NGUYÊN LIỆU thô ở hàng xóm. */
  rawCost: number;
  /** Mua thành phẩm ở hàng xóm: đúng giá nhập của outputId × sản lượng mặc định. */
  buyCost: number;
  /** Giá bán nếu tự làm rồi đem bán (giá lẻ thường). */
  sellValue: number;
  /** Tiền tiết kiệm mỗi mẻ so với mua ngoài = buyCost − rawCost. */
  netSave: number;
  /** Tỉ lệ giá vốn = rawCost / buyCost (SPEC §1.7: 55–65%). */
  marginPct: number;
  /** Phần hoàn cuối tháng bỏ lỡ vì không chi phần netSave ở hàng xóm. */
  rebateLost: number;
  line: string;
}

export interface PreservePayoff {
  rows: PreservePayoffRow[];
  /** Tổng tiền tiết kiệm nếu làm một lượt mỗi mẻ đang mở. */
  totalSave: number;
  /** Tổng tiền hoàn cuối tháng bỏ lỡ (mối quen mất) tương ứng. */
  totalRebateLost: number;
  headline: string;
}

/** Số ngày một mẻ phơi/muối/ủ mới ra hàng dùng được (muối = cuối cửa sổ, ủ = need, phơi = need nắng). */
export const preserveFinishDays = (d: PreserveDef) =>
  d.kind === 'u' ? d.need : d.window ? d.window[1] : d.need;

const fmt = (n: number) => n.toLocaleString('vi-VN');

/** Bậc/mốc ủ lâu (aged) nếu có → chú thích thêm một dòng ở line. */
function agedNote(d: PreserveDef): string {
  if (!d.aged) return '';
  return `; giữ ${d.aged.day} ngày ra ${d.aged.outputQty} (vốn xấp xỉ vẫn vậy)`;
}

export function preservePayoff(opts: {
  level: number;
  /** Số mốc để gộp dòng lưu ý "mối quen" — mặc định tính bằng tier của mối hàng xóm. */
  neighborSpentLife?: number;
  neighborSpentMonth?: number;
}): PreservePayoff {
  const rows: PreservePayoffRow[] = [];
  for (const d of PRESERVE_DEFS) {
    if (d.unlock > opts.level) continue;
    const rawCost = d.inputs.reduce((n, i) => n + i.quantity * productById(i.productId).buy, 0);
    const out = productById(d.outputId);
    const qty = d.outputQty;
    const buyCost = qty * out.buy;
    const sellValue = qty * out.sell;
    if (buyCost <= 0) continue;
    const netSave = buyCost - rawCost;
    const marginPct = rawCost / buyCost;
    const f = preserveFinishDays(d);
    // Vế mối quen: nếu MUA thành phẩm ở hàng xóm thay vì tự làm, mình tốn thêm `netSave` ở mối
    // (vì vẫn phải mua nguyên liệu chỗ khác/không mua nguyên liệu đó nữa). Mốc hoàn tháng tăng theo
    // doanh mua tháng → bỏ lỡ phần marginal rebate của khoản netSave không chi.
    const life = opts.neighborSpentLife ?? 0;
    const month = opts.neighborSpentMonth ?? 0;
    const rebateLost = Math.max(0, monthlyRelRebate(life, month + netSave) - monthlyRelRebate(life, month));
    const line =
      `${out.name}: vốn ${fmt(rawCost)} / mua ngoài ${fmt(buyCost)} → tiết ${fmt(Math.max(0, netSave))}` +
      ` (~${Math.round(marginPct * 100)}% giá vốn, chờ ${f} ngày)${agedNote(d)}` +
      (rebateLost > 0 ? `; mối quen tháng giảm hoàn ~${fmt(rebateLost)}` : '');
    rows.push({ defId: d.id, name: out.name, kind: d.kind, finishDays: f, rawCost, buyCost, sellValue, netSave, marginPct, rebateLost, line });
  }
  const totalSave = rows.reduce((n, r) => n + Math.max(0, r.netSave), 0);
  const totalRebateLost = rows.reduce((n, r) => n + r.rebateLost, 0);
  const headline =
    rows.length === 0
      ? 'Chưa mở món nào của trạm phơi/muối/ủ.'
      : `🤝 Tự làm ${rows.length} món tiết ~${fmt(totalSave)} so với mua ở hàng xóm (chờ ngày + chiếm chỗ; mối quen tháng giảm hoàn ~${fmt(totalRebateLost)})`;
  return { rows, totalSave, totalRebateLost, headline };
}
