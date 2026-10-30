import type { DayAction } from './dayPlan';
import { dateOfDoy, dayOfYear, monthOf } from './calendar';
import { productById, unlockedProducts } from './products';
import { COOKED_PRODUCT_IDS } from './recipes';

// ───── Chợ phiên nhà cung cấp đặc biệt (GĐ68) ─────
// đầu mỗi tháng (ngày 1–FAIR_DAYS) xuất hiện một thương lái bán cả "lô" hàng
// với giá rẻ hơn mua lẻ từng thứ. Lô được xáo xác định theo (tháng, cấp) để
// mỗi lần chợ phiên khác nhau nhưng ai hỏi cùng ngày cũng thấy y hệt nhau.

export const FAIR_DAYS = 2; // ngày 1-2 đầu tháng
export const FAIR_DISCOUNT = 0.84; // giá lô = 84% giá mua lẻ gộp lại
export const FAIR_QTY_MIN = 6;
export const FAIR_QTY_MAX = 22;
export const FAIR_ITEMS = 3; // số món trong một lô

/** RNG xác định từ chuỗi: cùng (tháng, cấp) → cùng lô chợ phiên. */
function hashSeed(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface FairLine { id: string; qty: number }
export interface FairOffer {
  /** Số hiệu phiên chợ (tháng) để biết lô này là của tháng nào */
  month: number;
  lines: FairLine[];
  totalBuy: number;   // tổng giá mua lẻ từng thứ
  dealPrice: number;  // giá lô thực trả (đã chiết khấu, làm tròn tới nghìn)
}

/** Hôm nay có phiên chợ không (ngày 1–FAIR_DAYS của tháng). */
export const isFairOpen = (day: number) => dateOfDoy(dayOfYear(day)).day <= FAIR_DAYS;

/** Lô chợ phiên của tháng này (không phụ thuộc ngày trong tháng, chỉ tháng+cấp). */
export function makeFairOffer(level: number, day: number): FairOffer | undefined {
  if (!isFairOpen(day)) return undefined;
  const month = monthOf(day);
  const rng = mulberry32(hashSeed(`fair-${month}-${level}`));
  // lấy hàng nhập được (bỏ món nhà làm) đã mở khóa ở cấp này
  const pool = unlockedProducts(level).filter((p) => !COOKED_PRODUCT_IDS.has(p.id));
  if (pool.length === 0) return undefined;
  // xáo xác định
  const arr = [...pool];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  const lines: FairLine[] = arr.slice(0, FAIR_ITEMS).map((p) => ({
    id: p.id,
    qty: FAIR_QTY_MIN + Math.floor(rng() * (FAIR_QTY_MAX - FAIR_QTY_MIN + 1)),
  }));
  const totalBuy = lines.reduce((n, l) => n + productById(l.id).buy * l.qty, 0);
  const dealPrice = Math.floor((totalBuy * FAIR_DISCOUNT) / 1000) * 1000; // làm tròn xuống nghìn
  return { month, lines, totalBuy, dealPrice };
}

/** GĐ293: Nhắc việc sáng khi có phiên chợ thương lái đầu tháng và người chơi chưa lấy lô tháng này. */
export function fairMerchantAction(day: number, fairTaken?: number): DayAction | null {
  if (!isFairOpen(day)) return null;
  const m = monthOf(day);
  if (fairTaken === m) return null;
  return {
    icon: '🛒',
    text: 'Thương lái ghé đầu ngõ (ngày 1–2): xem lô hàng sỉ chiết khấu trong Nhập hàng',
    panel: 'order',
    danger: false,
    priority: 3,
  };
}
