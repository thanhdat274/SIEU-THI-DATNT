/**
 * GĐ1310 — "Tủ mát/đông tiết kiệm điện (2,5tr, giảm 35% hóa đơn) có đáng? ~hoàn vốn theo hóa đơn hôm nay".
 * BranchNightTab cho biết giá lắp `u.price` + hóa đơn điện hôm nay (`branchPowerBill`) + mô tả "giảm 35%",
 * nhưng CHƯA cho con số HOÀN VỐN — người chơi bỏ 2,5tr (POWER_UPGRADES 'efficient') một lần mà không biết
 * lấy lại vốn bao lâu (hộp đen, Nguyên tắc a). Helper này THUẦN: lãi/ngày = hóa đơn hiện tại × (1 − EFFICIENT_MUL)
 * — CHỈ nhân với số ghi sẵn `branchPowerBill` (chính là hóa đơn bảng đang hiện, chưa trừ vì chưa lắp) →
 * hoàn vốn = ceil(price / lãi/ngày). Trung thực (Nguyên tắc c): chỉ soi bậc 'efficient' DETERMINISTIC;
 * bậc 'generator' phụ thuộc mất điện ngẫu nhiên (0.07/đêm) + giá trị hàng mát đang bày (không biết tĩnh) nên
 * KHÔNG bịa hoàn vốn. KHÔNG import store (co-op an toàn), không đổi kinh tế/save/seed/state (Luật 5).
 */
import { EFFICIENT_MUL, POWER_UPGRADES, branchPowerBill, hasPower, type BranchState } from './branches';

export interface BranchPowerEfficientPayoff {
  /** Giá lắp 'efficient'. */
  price: number;
  /** Tiền tiết kiệm/ngày = hóa đơn hiện tại × (1 − EFFICIENT_MUL), làm tròn. */
  savingPerDay: number;
  /** Số ngày hoàn vốn ≈ ceil(price / savingPerDay). */
  payback: number;
}

export interface BranchPowerPayoff {
  /** Kết quả bậc 'efficient' (null khi đã lắp / không tiết kiệm được). */
  efficient: BranchPowerEfficientPayoff | null;
  /** Dòng soi ngắn (≤90 code point) — null khi không có gì đáng nói. */
  line: string | null;
}

/**
 * Hoàn vốn cho bậc nâng cấp điện 'efficient' (tiết kiệm điện) theo hóa đơn điện HÔM NAY.
 * `branchPowerBill` đã áp dụng EFFICIENT_MUL nếu đã lắp — nên chỉ tính khi CHƯA lắp (hóa đơn hiện tại là
 * mức đầy đủ, đúng con số bảng đang hiện). THUẦN — không đổi state.
 */
export function branchPowerPayoff(b: BranchState): BranchPowerPayoff {
  if (hasPower(b, 'efficient')) return { efficient: null, line: null }; // đã lắp — không lải nhải
  const eff = POWER_UPGRADES.find((u) => u.id === 'efficient');
  if (!eff) return { efficient: null, line: null };
  const bill = branchPowerBill(b); // hóa đơn hiện tại (chưa có efficient) — số bảng đang hiện
  const savingPerDay = Math.round(bill * (1 - EFFICIENT_MUL));
  if (savingPerDay <= 0) return { efficient: null, line: null };
  const payback = Math.ceil(eff.price / savingPerDay);
  const pct = Math.round((1 - EFFICIENT_MUL) * 100); // 35%
  const line = `🌱 ${eff.name}: ~${fmtMoney(savingPerDay)}đ/ngày (${pct}% hóa đơn ${fmtMoney(bill)}) → hoàn ${payback} ngày.`;
  return { efficient: { price: eff.price, savingPerDay, payback }, line };
}

const fmtMoney = (v: number) => `${Math.round(v).toLocaleString('vi-VN')}đ`;
