// ============================================================================
// Data: Dòng "Hôm nay bán được chưa?" (GĐ1226)
// ----------------------------------------------------------------------------
// Audit 04/11: giữa ngày người chơi chỉ thấy VÍ (💰 + pop tiền mỗi lần bán) —
// KHÔNG có bề mặt nào cho biết doanh thu / số món / số khách CỘNG DỒN hôm nay;
// "hôm nay thu được bao nhiêu" chỉ hiện ở Sổ tổng kết CUỐI ngày. Nguyên tắc (a)
// "mọi quyết định hằng ngày phải có dữ liệu phản hồi" — đang bán dở không biết
// hôm nay ổn hay dở là hộp đen giữa chừng ngày.
//
// Helper THUẦN: dựng một dòng ngắn cho chip trạng thái từ BA con số đã có sẵn
// trong DayStats (customers, itemsSold, revenue) — không đổi công thức kinh tế,
// không thêm state, không RNG → không SAVE_VERSION (Luật 5 an toàn), deterministic
// theo seed/ngày như mọi nguồn còn lại. Nhận kiểu STRUCTURAL (không import DayStats
// để khỏi kéo core vào data) nên test thuần dễ.
// Trả '' khi cả ba số đều 0 — đầu ngày chưa mở cửa thì đừng ồn.
// ============================================================================

import { formatMoney, productById } from './products';
import { peakHours } from './advice';
import { trafficForecast } from './trafficForecast';
import { demandForecast } from './counterDemand';
import type { Weather } from './weather';

/** GĐ1226 — bề mặt "hôm nay bán được chưa": ba số cộng dồn trong ngày thành một dòng.
 *  GĐ1230 — nếu có `byItem`/`services` (structural, KHÔNG import core để giữ data sạch) thì nối thêm
 *  "lãi W" — đúng `daySalesProfit` (Σ thu−vốn theo món + lời dịch vụ): lãi bán THẬT hôm nay (Luật 10),
 *  cộng dồn khi byItem slice cập nhật mỗi lượt bán. Thuần đọc để HUD gắn vào chip; UI giữ nguyên. */
export function todayLine(s: {
  customers: number;
  itemsSold: number;
  revenue: number;
  byItem?: Record<string, { qty: number; revenue: number; cost: number }>;
  services?: number;
  expectCustomers?: number;
}): string {
  if (s.customers <= 0 && s.itemsSold <= 0 && s.revenue <= 0) return '';
  const exp = s.expectCustomers && s.expectCustomers > 0 ? ` (dự kiến ~${s.expectCustomers} đến giờ)` : '';
  let out = `hôm nay ${s.customers} khách${exp} · bán ${s.itemsSold} món · thu ${formatMoney(s.revenue)}`;
  if (s.byItem && s.itemsSold > 0) {
    const profit = Object.values(s.byItem).reduce((n, l) => n + l.revenue - l.cost, 0) + (s.services ?? 0);
    if (profit !== 0) out += ` · lãi ${formatMoney(profit)}`;
  }
  return out;
}

/** GĐ1233 — mốc "dự kiến ĐẾN GIỜ" cho dòng live (sửa GĐ1231/1229 cho trung thực): so khách ĐÃ VÀO
 *  (cộng dồn) với khách DỰ KIẾN TỚI giờ này — KHÔNG phải dự kiến cả ngày (khách đến dồn theo khung
 *  giờ, so với tổng cả ngày buổi sáng nào cũng "chậm" gây hiểu nhầm, phản lại chính nguyên tắc
 *  trung thực). Dùng CHÍNH đường cong theo giờ của mô phỏng: `demandForecast` (counterDemand.ts) cho
 *  phần khách dồn tích tới phút `minutes` (khung qua hết + khung đang chạy chia theo phút), nhân với
 *  `trafficForecast(...).todayKhach` (cùng mốc cả ngày dòng Sổ đầu ngày GĐ1229) để giữ đồng bộ. THUẦN —
 *  không RNG/state mới → Luật 5 an toàn. Trả 0 khi chưa mở cửa (minutes≤0) hoặc dự kiến 0. */
export function todayExpectSoFar(a: {
  weather: Weather;
  tomorrow: Weather;
  level: number;
  day: number;
  seed: number;
  minutes: number;
  localLegend?: boolean;
  happy?: { from: number; off: number } | null;
}): number {
  if (a.minutes <= 0) return 0;
  const total = trafficForecast({ weather: a.weather, tomorrow: a.tomorrow, level: a.level, day: a.day, seed: a.seed }).todayKhach;
  if (total <= 0) return 0;
  const df = demandForecast({ level: a.level, day: a.day, weatherSeed: a.seed, localLegend: a.localLegend, happy: a.happy });
  let exp = 0;
  for (const b of df.bands) {
    if (b.to <= a.minutes) exp += b.expected;
    else if (b.from < a.minutes) exp += b.expected * ((a.minutes - b.from) / (b.to - b.from));
  }
  const frac = df.expectedTotal > 0 ? exp / df.expectedTotal : 0;
  return Math.round(total * frac);
}

/** GĐ1232 — bề mặt "món chạy nhất HÔM NAY" giữa ngày: `stats.byItem` slice cập nhật MỖI lượt bán
 *  (sales.ts) nhưng chỉ lên bề mặt ở Tổng kết CUỐI ngày — giữa ngày người chơi biết bán được mấy món
 *  (GĐ1226) nhưng KHÔNG biết đang chạy MÓN nào để CHÂM KỆ NGAY (hộp đen giữa chừng ngày, Nguyên tắc a).
 *  Chỉ báo khi có người dẫn RÕ: món chạy nhất bán ≥ 3 và gấp ≥ 2 món nhì — chưa rõ ai dẫn thì đừng ồn
 *  (tránh nhiễu, cùng tinh thần ngưỡng của `todayPeakLine`). THUẦN — chỉ ghép chuỗi từ byItem live,
 *  không đổi kinh tế/save/seed/state (Luật 5 an toàn). */
export function todayTopSeller(
  byItem: Record<string, { qty: number; revenue: number; cost: number }> | undefined,
): string {
  const top = topSellerCandidate(byItem);
  if (!top) return '';
  return `món chạy nhất: ${productById(top.id)?.name ?? top.id} (${top.qty})`;
}

/** GĐ1238 — lõi thuần đã guarded của "món chạy nhất": trả {id, qty} khi có người dẫn RÕ (≥3 và gấp ≥2
 *  món nhì), còn lại null. `todayTopSeller` dùng nó để ghép chuỗi; Sơ đồ kệ dùng để dựng thẻ 🔥 hành động
 *  (biết MÓN nào để châm kệ), không lặp lại ngưỡng. */
export function topSellerCandidate(
  byItem: Record<string, { qty: number; revenue: number; cost: number }> | undefined,
): { id: string; qty: number } | null {
  if (!byItem) return null;
  const entries = Object.entries(byItem).filter(([, l]) => l.qty > 0);
  if (entries.length === 0) return null;
  entries.sort((a, b) => b[1].qty - a[1].qty);
  const top = entries[0];
  const second = entries[1]?.[1]?.qty ?? 0;
  if (top[1].qty < 3 || top[1].qty < 2 * second) return null;
  return { id: top[0], qty: top[1].qty };
}

/** GĐ1227 — bề mặt "giờ cao điểm ĐẾN GIỜ trong hôm nay": `peakHours` đã tính giờ đông khách nhất
 *  nhưng chỉ lên bề mặt CUỐI ngày (Tổng kết) / lời khuyên lỡ chờ — giữa ngày không ai biết khung
 *  nào đang đông để trực quầy/châm kệ. Đọc lại đúng `peakHours` (mô hình đang dùng, bằng số khách)
 *  từ `byHour` live (slices cập nhật mỗi lượt bán/khách). Chuỗi rỗng khi chưa đủ đông (trùng ngưỡng
 *  nhiễu `peakAdvice` <4) — đầu ngày đừng ồn. THUẦN — chỉ ghép chuỗi, không đổi kinh tế/save/seed. */
export function todayPeakLine(
  byHour: Record<number, { customers: number; revenue: number }> | undefined,
): string {
  const { peak } = peakHours(byHour);
  if (!peak || peak.customers < 4) return '';
  return `cao điểm đến giờ: ${peak.hour}h–${peak.hour + 1}h · ${peak.customers} khách`;
}

/** GĐ1228 — bề mặt "khách bỏ về HÔM NAY" giữa ngày: `stats.missed` slice cập nhật MỖI lượt khách
 *  không mua (sales.ts) nhưng chỉ lên bề mặt CUỐI ngày (Tổng kết / tư vấn) — đang ngày khách chờ lâu
 *  hay hết hàng liên tục mà không ai báo để xử lý NGAY (trực quầy / châm kệ). Dòng ngắn khi đã có
 *  lượt bỏ vì chờ (wait — xếp ca/ra trực) hoặc không mua vì hết hàng (stock — châm kệ); hai lý do
 *  HÀNH ĐỘNG NGAY, còn "chê đắt" là đòn giá chiến thuật đã có dòng cuối ngày (GĐ1222) nên không nhắc
 *  giữa ngày cho đỡ nhiễu. THUẦN — chỉ đếm số có sẵn, không đổi kinh tế/save/seed. */
export function todayMissedLine(missed: { wait?: number; stock?: number } | undefined): string {
  const wait = missed?.wait ?? 0;
  const stock = missed?.stock ?? 0;
  if (wait <= 0 && stock <= 0) return '';
  const parts: string[] = [];
  if (wait > 0) parts.push(`${wait} khách bỏ về vì chờ quầy`);
  if (stock > 0) parts.push(`${stock} khách không mua vì hết hàng`);
  return `⚠ ${parts.join(' · ')}`;
}
