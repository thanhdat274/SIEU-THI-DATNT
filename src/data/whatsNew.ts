/** "Có gì mới": nhật ký cập nhật cho người chơi (thêm mục mới LÊN ĐẦU). Chỉ nói điều người chơi thấy được. */
export interface WhatsNewEntry { date: string; title: string; lines: string[] }

export const WHATS_NEW: WhatsNewEntry[] = [
  {
    date: '2026-11-14',
    title: 'Màn đăng nhập đầy đủ hơn',
    lines: [
      'Đặt tên của bạn ngay ngoài màn đăng nhập — tên hiện trên bảng xếp hạng.',
      'Menu ngoài: Cài đặt, Hướng dẫn, Có gì mới, Xếp hạng, Góp ý, Quy định.',
      'Góp ý gửi tác giả không cần đăng nhập; bản nháp được giữ nếu mất mạng.',
      'Bảng xếp hạng: khách chưa đăng nhập cùng bảng với người đăng nhập, thêm bảng co-op theo hẻm.',
      'Hướng dẫn chi tiết hơn, chia theo thiết bị (máy tính, điện thoại, máy tính bảng).',
    ],
  },
  {
    date: '2026-11-13',
    title: 'Dữ liệu & Hòm thư',
    lines: [
      'Cài đặt → Dữ liệu: xuất mã chuyển máy, dán mã để chuyển ván sang máy khác.',
      'Hòm thư: gom quà điểm danh, vòng quay và thư từ bạn bè vào một chỗ.',
      'Mục "Có gì mới" này.',
    ],
  },
  {
    date: '2026-11-12',
    title: 'Bảng Cài đặt đầy đủ',
    lines: [
      'Hình ảnh, âm thanh, cách chơi, trợ năng — chọn độ phân giải 720p/1080p.',
      'Hiển thị tiền bằng đồng hoặc đô la, đổi tức thì ở mọi màn.',
      'Lọc màu cho người khó phân biệt màu, tắt chớp sáng khi giông.',
    ],
  },
];
