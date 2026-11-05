// ============================================================================
// Data: Phản công "Đối đầu giá" — bề mặt điều kiện kích hoạt (GĐ1270)
// ----------------------------------------------------------------------------
// Màn Cạnh tranh (MarketTab) đã quy "bớt N sức mạnh đối thủ" ra khách & tiền (counterPayoff,
// GĐ159) cho cả ba đòn phản công. RIÊNG đòn "Đối đầu giá" (💸, miễn phí vì trả bằng lãi mỏng
// −10% cả ngày) có thêm một điều kiện gây hộp đen (Nguyên tắc a): "đêm nay đối thủ mất 9 sức mạnh
// CHỈ NẾU hôm nay bán được ít nhất 30 món" (PRICE_WAR_MIN_SALES=30). Người chơi cam kết cả ngày
// lãi mỏng mà KHÔNG biết hôm nay mình có chạm nổi mốc 30 không — có thể phí công đòn (tooltip của
// MarketTab thừa nhận "đòn giá chỉ tính nếu bán đủ 30 món" nhưng không cho con số tiến độ).
//
// Helper này THUẦN — đọc hai con số THẬT từ caller (là số liệu có sẵn, không đổi state/kinh tế):
//   - `soldNow`       : số món đã bán HÔM NAY (stats.itemsSold, cộng dồn).
//   - `avgItemsPerDay`: nhu cầu ngày thường (Σ `sales` — trung bình trượt món/ngày của từng món).
// So với mốc `PRICE_WAR_MIN_SALES`:
//   - đã bán ≥ 30      → sự thật: đòn chắc chắn kích hoạt.
//   - ngày thường ≥ 30 → mốc "dễ đạt" theo nhịp tự nhiên.
//   - ngày thường < 30 → mốc "khó đạt" — đối đầu giá dễ phí công, gợi cân nhắc đòn khác.
// KHÔNG so soldNow (cộng dồn giữa ngày) với avgItems (CẢ ngày) trực tiếp — rơi lại bẫy "sáng nào
// cũng chậm" (GĐ1233). So mốc 30 với avgItems (cùng chiều cả-ngày) là trung thực. Trả line rỗng khi
// không có dữ liệu (soldNow 0 và chưa có nhu cầu đo).
// ============================================================================

import { PRICE_WAR_MIN_SALES } from './bizFinance';

export interface PriceCounterViability {
  /** Đã bán ≥ 30 món hôm nay — đòn chắc kích hoạt. */
  reached: boolean;
  /** Một dòng ngắn tiếng Việt (≤90 ký tự). */
  line: string;
}

const fmt = (n: number) => Math.round(n).toLocaleString('vi-VN');

/** GĐ1270 — điều kiện kích hoạt đòn Đối đầu giá so với mốc 30 món + nhịp ngày thường. THUẦN. */
export function priceCounterViability(soldNow: number, avgItemsPerDay: number): PriceCounterViability {
  if (soldNow >= PRICE_WAR_MIN_SALES) {
    return {
      reached: true,
      line: `💡 Hôm nay đã bán ${soldNow} món ≥ ${PRICE_WAR_MIN_SALES} — đối đầu giá chắc kích hoạt đòn.`,
    };
  }
  if (avgItemsPerDay >= PRICE_WAR_MIN_SALES) {
    return {
      reached: false,
      line: `💡 Đã bán ${soldNow}/${PRICE_WAR_MIN_SALES} món hôm nay — ngày thường ~${fmt(avgItemsPerDay)} món, dễ đạt mốc đòn.`,
    };
  }
  return {
    reached: false,
    line: `💡 Đã bán ${soldNow}/${PRICE_WAR_MIN_SALES} món — ngày thường ~${fmt(avgItemsPerDay)} < ${PRICE_WAR_MIN_SALES}, đối đầu giá e khó kích hoạt đòn.`,
  };
}
