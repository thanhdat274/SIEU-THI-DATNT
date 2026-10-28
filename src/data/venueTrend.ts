/** Xu hướng cơ sở kinh doanh: nhật ký doanh thu/lãi/khách từng ngày của chi nhánh 24/7 và quán nước —
 *  thuần đọc từ state đã lưu, để trả lời "thuê thêm ca / đặt giá nước có đang đỡ hơn theo ngày không". */

/** Một ngày ghi nhận của hai cơ sở (thêm ở lúc tổng kết cuối ngày, giữ cửa sổ lăn). */
export interface VenueDay {
  day: number;
  branchRevenue: number;
  branchProfit: number;
  branchCustomers: number;
  quanRevenue: number;
  quanProfit: number;
}

/** Số ngày gần nhất giữ để vẽ xu hướng. */
export const VENUE_TREND_DAYS = 14;

export type TrendDirection = 'up' | 'down' | 'flat';

export interface VenueTrendLine {
  icon: string;
  label: string;
  /** Giá trị ngày gần nhất (có số liệu cuối cùng). */
  last: number;
  /** Trung bình nửa gần (mới nhất) của cửa sổ. */
  recent: number;
  /** Trung bình nửa trước (cũ hơn) của cửa sổ. */
  earlier: number;
  /** Chênh lệch recent − earlier (biết dấu để hiện ↓/↑). */
  delta: number;
  /** % thay đổi so với nửa trước (tránh chia 0). */
  pct: number;
  direction: TrendDirection;
  /** Ngày đỉnh cao nhất trong cửa sổ. */
  best: { day: number; value: number } | null;
  /** Số ngày có dữ liệu. */
  days: number;
}

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

function buildLine(icon: string, label: string, vt: VenueDay[], pick: (d: VenueDay) => number): VenueTrendLine {
  const seg = vt.map((d) => ({ day: d.day, value: pick(d) }));
  const n = seg.length;
  const mid = Math.floor(n / 2);
  const recent = avg(seg.slice(mid).map((s) => s.value));
  const earlier = avg(seg.slice(0, mid).map((s) => s.value));
  const delta = recent - earlier;
  const base = earlier === 0 ? recent : earlier; // tránh chia 0 khi nửa trước bằng 0
  const pct = base === 0 ? 0 : Math.round((recent / base - 1) * 100);
  // >3% coi là rõ xu hướng, dưới là "đều" (nhiễu ngày không nên đánh lừa)
  const direction: TrendDirection = recent > earlier * 1.03 ? 'up' : recent < earlier * 0.97 ? 'down' : 'flat';
  let best: VenueTrendLine['best'] = null;
  for (const s of seg) if (s.value > 0 && (!best || s.value > best.value)) best = { day: s.day, value: s.value };
  return { icon, label, last: seg.length ? seg[seg.length - 1].value : 0, recent, earlier, delta, pct, direction, best, days: n };
}

/** Tóm tắt xu hướng 14 ngày của chi nhánh và quán nước (mỗi cơ sở một dòng). */
export function venueTrendSummary(vt: VenueDay[]): VenueTrendLine[] {
  const lines = [
    buildLine('🏪', 'Chi nhánh 24/7 (lãi thô)', vt, (d) => d.branchProfit),
    buildLine('🏪', 'Chi nhánh 24/7 (doanh thu)', vt, (d) => d.branchRevenue),
    buildLine('🍹', 'Quán nước (lãi)', vt, (d) => d.quanProfit),
  ];
  // Ẩn dòng chưa có hoạt động (toàn 0); vẫn hiện chuỗi toàn âm để lỗ không biến mất.
  const active = [
    vt.some((d) => d.branchProfit !== 0),
    vt.some((d) => d.branchRevenue !== 0),
    vt.some((d) => d.quanProfit !== 0),
  ];
  return lines.filter((l, i) => l.days > 0 && active[i]);
}
