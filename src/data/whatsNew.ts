/** "Có gì mới": nhật ký cập nhật cho người chơi (thêm mục mới LÊN ĐẦU). Chỉ nói điều người chơi thấy được.
 *  Quy ước chống quá tải (học Coffee Sữa Ơi): 1 mục = 1 ĐỢT cập nhật (thường gom theo ngày),
 *  KHÔNG tạo mục riêng cho từng tính năng nhỏ — gom nhiều thay đổi vào cùng mục theo chủ đề,
 *  mỗi dòng 1 gạch đầu dòng bắt đầu bằng 1 emoji, chủ đề in đậm bằng "**Chủ đề**: mô tả".
 *  UI (WhatsNewList) chỉ mở sẵn 2 mục mới nhất, các bản cũ gom sau nút "Xem bản cũ hơn". */
export interface WhatsNewEntry { date: string; title: string; lines: string[] }

export const WHATS_NEW: WhatsNewEntry[] = [
  {
    date: '2026-11-14',
    title: 'Dạo phố & nghỉ phép',
    lines: [
      '🚶 **Dạo phố** (menu Thêm, từ cấp 3): vé số, chùa xin quẻ, ngân hàng, tài xỉu, vay nóng chú Tư — mỗi điểm có trần mỗi ngày.',
      '💰 **Nợ chú Tư** hiện trong Sổ đầu ngày và dải việc; quá hạn bị tính lãi chồng.',
      '🍀 **Quẻ đại cát/cát** làm khách đông hơn trong ngày, xem ở bảng Điểm danh.',
      '🏖️ **Nghỉ phép**: cho nhân viên nghỉ một ngày (vẫn nhận lương, cộng chút kinh nghiệm).',
      '🧋 **Quán nước** có dải trạng thái hôm nay: khách, kho, nhân viên, giá, dự kiến lời.',
    ],
  },
  {
    date: '2026-11-14',
    title: 'Màn đăng nhập đầy đủ hơn',
    lines: [
      '📝 **Đặt tên** ngay ngoài màn đăng nhập — tên hiện trên bảng xếp hạng.',
      '🧭 **Menu ngoài**: Cài đặt, Hướng dẫn, Có gì mới, Xếp hạng, Góp ý, Quy định.',
      '💬 **Góp ý** gửi tác giả không cần đăng nhập; bản nháp được giữ nếu mất mạng.',
      '🏆 **Bảng xếp hạng**: khách chưa đăng nhập cùng bảng với người đăng nhập, thêm bảng co-op theo hẻm.',
      '📖 **Hướng dẫn** chi tiết hơn, chia theo thiết bị (máy tính, điện thoại, máy tính bảng).',
    ],
  },
  {
    date: '2026-11-13',
    title: 'Dữ liệu & Hòm thư',
    lines: [
      '📤 **Cài đặt → Dữ liệu**: xuất mã chuyển máy, dán mã để chuyển ván sang máy khác.',
      '📬 **Hòm thư**: gom quà điểm danh, vòng quay và thư từ bạn bè vào một chỗ.',
      '🆕 Mục "Có gì mới" này.',
    ],
  },
  {
    date: '2026-11-12',
    title: 'Bảng Cài đặt đầy đủ',
    lines: [
      '🖼️ **Hình ảnh, âm thanh, cách chơi, trợ năng** — chọn độ phân giải 720p/1080p.',
      '💵 **Hiển thị tiền** bằng đồng hoặc đô la, đổi tức thì ở mọi màn.',
      '🎨 **Lọc màu** cho người khó phân biệt màu, tắt chớp sáng khi giông.',
    ],
  },
];

const SEEN_KEY = 'th3d_whatsnew_seen';
const latestStamp = () => (WHATS_NEW[0] ? `${WHATS_NEW[0].date}|${WHATS_NEW[0].title}` : '');

/** Còn bản cập nhật mới chưa đọc (so với lần mở "Có gì mới" gần nhất trên máy này)? */
export function whatsNewUnseen(): boolean {
  try { return WHATS_NEW.length > 0 && localStorage.getItem(SEEN_KEY) !== latestStamp(); }
  catch { return false; }
}
/** Gọi khi người chơi mở bảng "Có gì mới" — tắt chấm đỏ trên nút menu. */
export function whatsNewMarkSeen(): void {
  try { localStorage.setItem(SEEN_KEY, latestStamp()); } catch { /* lưu không được thì bỏ qua */ }
}
