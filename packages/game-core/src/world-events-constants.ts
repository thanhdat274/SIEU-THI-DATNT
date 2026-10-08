/**
 * Hằng số của "Sự kiện thành phố / sự cố ngẫu nhiên" (tính năng đề xuất #2, PHẦN THUẦN / PROVISIONAL).
 *
 * Tách riêng hằng số khỏi logic để dễ cân bằng playtest sau. Mọi giá trị là PROVISIONAL — cần chơi thật
 * để chốt tần suất/độ mạnh. Game-data (nếu sau này cần catalog dữ liệu) có thể re-export hoặc dùng chung.
 */

/** Nhịp lặp của hội chợ khu cà phê W4 (số ngày giữa hai "kỳ hội chợ"). */
export const W4_FAIR_PERIOD_DAYS = 8;
/** Hội chợ kéo dài đúng 3 ngày. */
export const W4_FAIR_DURATION_DAYS = 3;
/** Lượng khách khu cà phê W4 +50% trong ngày hội chợ. */
export const W4_FAIR_TRAFFIC_FACTOR = 1.5;

/** Xác suất mỗi ngày có một lần mất điện (stream 11). */
export const POWER_OUTAGE_CHANCE = 0.05;
/** Khoảng cách tối thiểu giữa hai lần mất điện (ngày) — chống dồn ngày liên tiếp. */
export const POWER_OUTAGE_MIN_GAP_DAYS = 4;
/** Tủ lạnh/hàng lạnh hỏng nhanh hơn gấp 2 trong buổi mất điện (tăng tốc hư hỏng 2×). */
export const POWER_OUTAGE_SPOILAGE_FACTOR = 2.0;
