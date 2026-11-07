// GĐ1552 — "Bạn có biết?" (tham khảo Xóm B10): dải mẹo xoay vòng, lọc theo cấp để chỉ nhắc
// thứ người chơi đã mở. Đổi mẹo mỗi 30 phút game; có nút Ẩn (chỉ trong phiên, không vào save).

export interface Tip { from: number; text: string }

export const TIPS: readonly Tip[] = [
  { from: 1, text: 'Kệ đầy hàng thì khách mua nhiều hơn — nhập hàng trước giờ mở cửa.' },
  { from: 1, text: 'Đứng gần quầy thu ngân để tính tiền nhanh cho khách.' },
  { from: 5, text: 'Khách quen nhớ món hay mua — giữ món đó luôn có trên kệ.' },
  { from: 18, text: 'Sàn bẩn dễ bị đoàn kiểm tra vệ sinh phạt — quét dọn thường xuyên.' },
  { from: 25, text: 'Máy cân sức khỏe tự thu tiền, không cần nhân viên đứng.' },
  { from: 30, text: 'Máy gắp thú đông khách nhất vào thứ 7, chủ nhật.' },
  { from: 31, text: 'Bày đủ món nấu theo thực đơn tối thiểu để khách ăn tại chỗ tip nhiều hơn.' },
  { from: 35, text: 'Sau 18h, máy bán nước và ghế mát-xa thu phí cao hơn.' },
  { from: 35, text: 'Nộp phạt đầy đủ khi bị kiểm tra được thêm chút kinh nghiệm.' },
  { from: 36, text: 'Bán một món đủ 200/1.000/4.000 lần là tiệm thông thạo món đó (Đồng/Bạc/Vàng).' },
  { from: 37, text: 'Quà điểm danh thứ 7, chủ nhật được thêm 25% tiền.' },
  { from: 38, text: 'Mỗi ngày tặng mỗi khách quen 1 món họ thích để +3 thân thiết — đúng sinh nhật +6.' },
  { from: 40, text: 'Khách chơi máy xong thường mua thêm một món.' },
  { from: 45, text: 'Phục vụ kịp món nhà phê bình gọi sẽ có thêm đánh giá 5★.' },
];

export const TIP_EVERY_MINUTES = 30;

/** Mẹo đang hiện: xoay theo khung 30 phút trong số mẹo đã mở ở cấp hiện tại. */
export function tipAt(level: number, day: number, minutes: number): string {
  const pool = TIPS.filter((t) => t.from <= level);
  const slot = (day * 48 + Math.floor(minutes / TIP_EVERY_MINUTES)) % pool.length;
  return pool[slot].text;
}
