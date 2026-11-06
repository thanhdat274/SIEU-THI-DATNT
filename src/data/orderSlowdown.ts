/**
 * Playtest P2 T8: mở Nhập hàng lúc đang tua nhanh (chơi đơn) → hạ về 1× để đọc kỹ không bị "phạt".
 * Hẻm online đồng hồ chung → không đụng. Trả về tốc độ mới hoặc null nếu giữ nguyên.
 */
export function orderSlowdown(speed: number, online: boolean): number | null {
  return !online && speed > 1 ? 1 : null;
}
