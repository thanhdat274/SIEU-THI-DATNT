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
  const exp = s.expectCustomers && s.expectCustomers > 0 ? ` (dự kiến ~${s.expectCustomers})` : '';
  let out = `hôm nay ${s.customers} khách${exp} · bán ${s.itemsSold} món · thu ${formatMoney(s.revenue)}`;
  if (s.byItem && s.itemsSold > 0) {
    const profit = Object.values(s.byItem).reduce((n, l) => n + l.revenue - l.cost, 0) + (s.services ?? 0);
    if (profit !== 0) out += ` · lãi ${formatMoney(profit)}`;
  }
  return out;
}

/** GĐ1231 — neo "dự kiến hôm nay" cho dòng live: số khách CHO ĐẾN GIỜ (cộng dồn) không tự nói lên
 *  "đang ổn hay chậm" — người chơi cần mốc. Trả về số khách DỰ KIẾN cả ngày hôm nay theo đúng
 *  nguồn forecast (Nguyên tắc a: quyết định hằng ngày phải có dữ liệu phản hồi; so HÀNH ĐỘNG với
 *  DỰ BÁO, không hộp đen). Đồng bộ `trafficForecast(...).todayKhach` (deterministic theo weather/
 *  ngày/cấp/seed — không RNG, không state mới → Luật 5 an toàn). Trả 0 khi dự kiến 0. */
export function todayExpectCustomers(a: {
  weather: Weather;
  tomorrow: Weather;
  level: number;
  day: number;
  seed: number;
}): number {
  const n = Math.round(trafficForecast(a).todayKhach);
  return n > 0 ? n : 0;
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
  if (!byItem) return '';
  const entries = Object.entries(byItem).filter(([, l]) => l.qty > 0);
  if (entries.length === 0) return '';
  entries.sort((a, b) => b[1].qty - a[1].qty);
  const top = entries[0];
  const second = entries[1]?.[1]?.qty ?? 0;
  if (top[1].qty < 3 || top[1].qty < 2 * second) return '';
  return `món chạy nhất: ${productById(top[0])?.name ?? top[0]} (${top[1].qty})`;
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
