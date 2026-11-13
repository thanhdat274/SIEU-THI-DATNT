/** "Có gì mới": nhật ký cập nhật cho người chơi (thêm mục mới LÊN ĐẦU). Chỉ nói điều người chơi thấy được. */
export interface WhatsNewEntry { date: string; title: string; lines: string[] }

export const WHATS_NEW: WhatsNewEntry[] = [
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
