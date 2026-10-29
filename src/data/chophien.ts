import { WEEK_DAYS } from './biz';
import { productById } from './products';
import { needsCold } from './freshness';
import { scarcityMul } from './market';
import type { ItemHealth } from './analytics';

// ───── GĐ135: 🧺 "Chợ phiên cuối ngõ" — bản đánh giá thuần-đọc hàng DƯ đáng gánh ra bán ─────
// Slice 1 (pure-read) của mở rộng đã duyệt (audit deleg_057f5794 verdict EXPAND):
// điểm bán dư hàng định kỳ do NGƯỜI CHƠI chủ động — giải pháp DƯƠNG cho bài toán thừa-hàng
// mà GĐ131/133/134 suốt 3 giai đoạn chỉ cảnh báo (thiếu/đã hỏng/tủ lạnh đầy).
// Giai đoạn này CHỈ đánh giá + preview — KHÔNG bán/đổi tiền/SAVE_VERSION. Bán thật ở GĐ136.
// Khác vendor hệ cũ (wholesale: người bán rong INBOUND ghé lấy sỉ — khởi xướng bởi cơ chế);
// đây là chợ OUTBOUND định kỳ người chơi chủ động. Khác market.ts (chỉ giá tham chiếu, không bán).

export const MARKET_EVERY = WEEK_DAYS;      // mỗi tuần một phiên chợ
export const FIRST_MARKET = 7;              // phiên đầu tiên ngày 7
export const MAX_CLEAR_ITEMS = 4;           // tối đa số món gánh ra mỗi phiên
export const MAX_CLEAR_UNITS = 15;          // tối đa tổng số món mỗi phiên
export const CLEAR_DISCOUNT = 0.75;         // chợ trả ~75% giá bán lẻ (thấp hơn kệ — không lấn lợi nhuận chính)
export const CLEAR_DAYS_LEFT = 2;           // món tồn bán > 2 ngày mới gọi là DƯ đáng gánh

/** Ngày phiên chợ đầu ngõ (định kỳ tuần, bắt đầu từ ngày 7). */
export function isMarketDay(day: number): boolean {
  return day >= FIRST_MARKET && day % MARKET_EVERY === 0;
}

/** Khách ra đường ngày chợ đông hơn ngày thường (GĐ182: phiên chợ thành nhịp gameplay). */
export const MARKET_TRAFFIC = 1.15;

/** Hệ số giờ đông khách của một ngày: 1.15 khi phiên chợ, 1 ngày thường — thuần đọc, test được. */
export function marketTrafficFactor(day: number): number {
  return isMarketDay(day) ? MARKET_TRAFFIC : 1;
}

export interface MarketClearRow {
  id: string;
  name: string;
  /** Số món gánh ra bán phiên này (đã chặn trần). */
  qty: number;
  /** Ước giá chợ nhận: qty × giá bán lẻ × chiết khấu chợ × hệ khan hiếm (dấu "~"). */
  est: number;
  /** Vì sao là DƯ: bán chậm (tồn lâu) hay là hàng cần lạnh vượt sức giữ. */
  reason: 'slow' | 'cold';
}

export interface MarketClearValue {
  day: number;
  rows: MarketClearRow[];
  /** Tổng ước nhận được phiên này. */
  total: number;
  /** Đơn vị gánh ra (đã chặn trần). */
  units: number;
}

export interface MarketClearInput {
  day: number;
  /** Hàng còn trong kho. */
  storage: Record<string, number>;
  /** Hàng đang bày kệ (shelfCount). */
  shelved: Record<string, number>;
  /** Sức khoẻ từng món (itemHealthList) — để biết tốc độ bán / còn vài ngày hàng. */
  health: ItemHealth[];
}

/**
 * Định giá hàng DƯ đáng gánh ra chợ phiên hôm nay. THUẦN đọc state có sẵn.
 * null khi không phải ngày chợ hoặc không có món dư đáng gánh.
 */
export function marketClearValue(input: MarketClearInput): MarketClearValue | null {
  if (!isMarketDay(input.day)) return null;
  const onHand: Record<string, number> = {};
  for (const [id, q] of Object.entries(input.storage)) onHand[id] = (onHand[id] ?? 0) + (q > 0 ? q : 0);
  for (const [id, q] of Object.entries(input.shelved)) onHand[id] = (onHand[id] ?? 0) + (q > 0 ? q : 0);

  const rows: MarketClearRow[] = [];
  for (const h of input.health) {
    const p = productById(h.id);
    const total = onHand[h.id] ?? 0;
    if (!p || total <= 0) continue;
    // Lý do "DƯ":
    let reason: MarketClearRow['reason'] | null = null;
    const daysLeft = h.daysLeft; // null = không bán
    if (daysLeft === null || daysLeft > CLEAR_DAYS_LEFT) reason = 'slow';     // tồn bán > 2 ngày → dư chậm
    else if (needsCold(h.id) && total > 4) reason = 'cold';                     // cần lạnh nắm nhiều → dư giữ lạnh
    if (!reason) continue;
    // Ước giá chợ (chiết khấu thấp hơn bán lẻ + hệ khan hiếm của lượng trước khi gánh, trung thực "~")
    const factor = CLEAR_DISCOUNT * scarcityMul(total);
    rows.push({ id: h.id, name: p.name, qty: total, est: Math.round(total * p.sell * factor), reason });
  }
  if (!rows.length) return null;

  // Chọn món đáng gánh nhất (theo ước giá), chặn số món + tổng đơn vị
  rows.sort((a, b) => b.est - a.est);
  const picked = rows.slice(0, MAX_CLEAR_ITEMS);
  let units = 0;
  const final: MarketClearRow[] = [];
  for (const r of picked) {
    const take = Math.min(r.qty, MAX_CLEAR_UNITS - units);
    if (take <= 0) continue;
    const p = productById(r.id);
    // giá giữ nguyên hệ khan hiếm của lượng trước khi gánh; chỉ giảm số món
    const est = Math.round(take * p.sell * CLEAR_DISCOUNT * scarcityMul(onHand[r.id] ?? 0));
    final.push({ id: r.id, name: r.name, qty: take, est, reason: r.reason });
    units += take;
  }
  if (!final.length) return null;
  return {
    day: input.day,
    rows: final,
    total: final.reduce((n, r) => n + r.est, 0),
    units,
  };
}
