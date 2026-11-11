/**
 * Hệ 4 — CHIỀU SÂU "SOI SÁNG" XƯỞNG ĐÓNG GÓI (SPEC §4.5a, L14 GĐ2342). WorkshopTab mới chỉ hiện công suất/thợ +
 * lương + phí bao bì 8% — chưa cho người chơi biết MỘT ĐÊM GÓI HÀNG đẻ ra bao nhiêu LỜI NHÃN, để quyết "có nên
 * thuê thêm thợ không". Helper này mô phỏng đúng lượt chạy thật (mỗi dòng lấy min(nguyên liệu kho, công suất còn
 * lại), tích lời nhãn = đv × premiumPerUnit, trừ bao bì 8% + lương thợ) → ra lời ròng nếu bán hết. THUẦN, tất định
 * (không RNG): đọc BrandState + storage + brandWorkshopCapacity/WAGE/PACK_FEE; không đổi state/sim/save/kinh tế →
 * golden không đụng.
 */
import {
  brandPremium, brandWorkshopCapacity, BRAND_PACK_FEE, BRAND_WORKSHOP_WAGE,
  type BrandState,
} from './brand';
import { productById } from './products';

export interface BrandWorkshopPayoffResult {
  /** Số đơn vị đêm kế tiếp gói được (giới hạn bởi cả nguyên liệu kho lẫn công suất). */
  packed: number;
  /** Tổng công suất/đêm của xưởng. */
  capacity: number;
  /** Lời nhãn cộng dồn nếu bán hết số gói được (đv × premium/đơn vị). */
  grossPremium: number;
  /** Phí bao bì (8% giá bán của số gói được). */
  fee: number;
  /** Lương thợ đêm đó. */
  wage: number;
  /** Lời ròng = grossPremium − fee − wage. */
  net: number;
  /** Phần trăm tăng của hàng nhãn theo bậc uy tín. */
  rate: number;
  line: string;
}

export const fmt = (n: number) => n.toLocaleString('vi-VN');

export function brandWorkshopPayoff(b: BrandState, storage: Record<string, number>): BrandWorkshopPayoffResult {
  const w = b.workshop;
  const capacity = w?.open ? brandWorkshopCapacity(w) : 0;
  const rate = brandPremium(b.rep);
  const wage = (w?.staff ?? 0) * BRAND_WORKSHOP_WAGE;
  if (capacity <= 0 || b.lines.length === 0) {
    const reason = capacity <= 0 ? 'chưa thuê thợ' : 'chưa có dòng nhãn';
    return { packed: 0, capacity, grossPremium: 0, fee: 0, wage, net: -wage, rate, line: `Xưởng đứng: ${reason}.` };
  }
  let cap = capacity;
  let grossPremium = 0;
  let fee = 0;
  let packed = 0;
  for (const line of b.lines) {
    if (cap <= 0) break;
    const avail = storage[line.productId] ?? 0;
    const n = Math.min(avail, cap);
    if (n <= 0) continue;
    const sell = productById(line.productId)?.sell ?? 0;
    grossPremium += n * Math.round(sell * rate);
    fee += n * sell * BRAND_PACK_FEE;
    packed += n;
    cap -= n;
  }
  fee = Math.round(fee / 100) * 100;
  const net = grossPremium - fee - wage;
  const line =
    packed === 0
      ? `Không gói được: hết nguyên liệu kho cho các dòng nhãn.`
      : `1 đêm gói ${packed}/${capacity}đv → lời nhãn ≈ ${fmt(net)}đ nếu bán hết (gộp ${fmt(grossPremium)} − bao bì ${fmt(fee)} − lương ${fmt(wage)})`;
  return { packed, capacity, grossPremium, fee, wage, net, rate, line };
}
