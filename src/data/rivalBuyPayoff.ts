/**
 * GĐ1308 — "Mua lại mặt bằng đối thủ (12tr): khách cũ của họ ghé đông bao lâu, thực thu được bao nhiêu?"
 * MarketTab chào bán mặt bằng rival vừa đóng cửa nhưng chỉ nói ĐỊNH TÍNH "khách cũ ghé đông hơn 7 ngày" —
 * CHƯA ai lượng hóa phần này là bao nhiêu TIỀN so với 12tr (hộp đen, Nguyên tắc a). Helper THUẦN: sau khi
 * mua (đã có chi nhánh), `bizTraffic` nhân thêm RIVAL_BUY_TRAFFIC(1.15) trong RIVAL_BUY_DAYS(7) ngày → phần
 * tăng khách-cũ = doanh thu chi nhánh hôm nay × (1.15−1), suy cả đợt 7 ngày. CHỈ nhân/gộp số ghi sẵn
 * (Nguyên tắc c); TRUNG THỰC — không bịa phần chuyển hàng lên kệ (tuỳ kho) hay chi nhánh (vốn đã có), chỉ
 * soi phần khách-cũ đông vốn là tác động deterministic của 12tr. KHÔNG import store (co-op an toàn), không
 * đổi kinh tế/save/seed (Luật 5). Mua khi CHƯA có chi nhánh = mở chi nhánh (đã soi GĐ194) → line null, không ồn.
 */
import { RIVAL_BUY_DAYS, RIVAL_BUY_TRAFFIC, RIVAL_SHOP_PRICE } from './rivals';
import type { BranchState } from './branches';
import { fmtNum } from '../core/format';

export interface RivalBuyPayoff {
  /** Giá mua lại mặt bằng (mặc định RIVAL_SHOP_PRICE). */
  price: number;
  /** Số ngày khách cũ ghé đông thêm. */
  days: number;
  /** % khách ghé đông thêm mỗi ngày (15 — từ hằng số). */
  boostPct: number;
  /** Thu thêm ước mỗi ngày (doanh thu chi nhánh hôm nay × boost, làm tròn 1000). */
  extraPerDay: number;
  /** Thu thêm ước cả đợt. */
  totalBoost: number;
  /** Dòng soi ngắn (≤90 code point) — đặt trên nút Mua lại; null khi chưa chào bán / chưa có chi nhánh / chưa có doanh thu. */
  line: string | null;
}

/**
 * Ước phần khách cũ của rival quay sang ghé đông sau khi mua lại mặt bằng (khi đã có chi nhánh).
 * Trả null khi chưa có chào bán, khi chưa có chi nhánh (mua = mở chi nhánh, không phải phần này),
 * hoặc khi chi nhánh chưa có doanh thu hôm nay (tránh bịa con số 0). THUẦN deterministic.
 */
export function rivalBuyPayoff(
  offer: { price: number } | null | undefined,
  branch: BranchState | null | undefined,
): RivalBuyPayoff {
  const price = offer?.price ?? RIVAL_SHOP_PRICE;
  const days = RIVAL_BUY_DAYS;
  const boostPct = Math.round((RIVAL_BUY_TRAFFIC - 1) * 100);
  const base: RivalBuyPayoff = { price, days, boostPct, extraPerDay: 0, totalBoost: 0, line: null };
  if (!offer || !branch) return base;
  const revenue = branch.revenueToday + (branch.vendingRevenueToday ?? 0);
  if (revenue <= 0) return base;
  const extraPerDay = Math.round((revenue * (RIVAL_BUY_TRAFFIC - 1)) / 1000) * 1000;
  const totalBoost = extraPerDay * days;
  const line = `🏢 Khách cũ ghé đông ${days} ngày: +~${fmt(extraPerDay)}/ngày, cả đợt ~${fmt(totalBoost)} — nhỏ hơn ${compact(price)} tiền mua.`;
  return { price, days, boostPct, extraPerDay, totalBoost, line };
}

const fmt = (v: number) => `${fmtNum(Math.round(v))}đ`;
const compact = (v: number) => (v % 1000000 === 0 ? `${v / 1000000}tr` : v % 1000 === 0 ? `${v / 1000}k` : `${v}`);
