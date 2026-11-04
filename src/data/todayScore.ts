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

import { formatMoney } from './products';

/** GĐ1226 — bề mặt "hôm nay bán được chưa": ba số cộng dồn trong ngày thành một dòng.
 *  Thuần đọc để HUD gắn vào chip; UI giữ nguyên không phán đoán. */
export function todayLine(s: { customers: number; itemsSold: number; revenue: number }): string {
  if (s.customers <= 0 && s.itemsSold <= 0 && s.revenue <= 0) return '';
  return `hôm nay ${s.customers} khách · bán ${s.itemsSold} món · thu ${formatMoney(s.revenue)}`;
}
