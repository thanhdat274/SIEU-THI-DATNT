/**
 * Hướng dẫn chơi ngoài màn đăng nhập: chia nhóm, có phần điều khiển riêng theo thiết bị
 * (điện thoại / máy tính bảng / máy tính). Phím lấy từ HudKeys cho khỏi lệch với game thật.
 */
import { CONTROLS } from '../ui/HudKeys';

export type Device = 'phone' | 'tablet' | 'pc';
export const DEVICES: [Device, string][] = [['phone', '📱 Điện thoại'], ['tablet', '📲 Máy tính bảng'], ['pc', '💻 Máy tính']];

export interface GuideStep { icon: string; title: string; text: string }
export interface GuideSection { title: string; steps: GuideStep[] }

/** Đoán thiết bị để chọn sẵn tab. */
export function guessDevice(width: number, touch: boolean): Device {
  if (!touch) return 'pc';
  return width < 700 ? 'phone' : 'tablet';
}

const move: Record<Device, GuideStep[]> = {
  phone: [
    { icon: '🕹️', title: 'Đi lại', text: 'Kéo cần điều khiển ở góc dưới bên trái. Chạm vào chỗ muốn đến để đi tới đó.' },
    { icon: '👀', title: 'Nhìn quanh, phóng to', text: 'Kéo một ngón để xoay camera, chụm hai ngón để phóng to hoặc thu nhỏ.' },
    { icon: '👆', title: 'Tương tác', text: 'Đứng gần kệ, kho, giường, trạm nấu thì nút hành động hiện ra — chạm vào đó.' },
  ],
  tablet: [
    { icon: '🕹️', title: 'Đi lại', text: 'Dùng cần điều khiển trên màn hình, hoặc chạm vào sàn để đi tới đó.' },
    { icon: '👀', title: 'Nhìn quanh, phóng to', text: 'Kéo một ngón để xoay camera, chụm hai ngón để phóng to hoặc thu nhỏ.' },
    { icon: '👆', title: 'Tương tác', text: 'Đến gần kệ, kho, giường, trạm nấu rồi chạm nút hành động hiện ra.' },
  ],
  pc: [
    { icon: '⌨️', title: 'Đi lại', text: 'Phím W A S D, hoặc bấm chuột vào chỗ muốn đến.' },
    { icon: '🖱️', title: 'Nhìn quanh', text: 'Kéo chuột trái để nhìn quanh; chuột phải hoặc phím Q / E để xoay camera.' },
    { icon: '🔍', title: 'Phóng to, thu nhỏ', text: 'Cuộn chuột để phóng to, thu nhỏ.' },
  ],
};

export function guideFor(device: Device): GuideSection[] {
  return [
    {
      title: 'Bắt đầu',
      steps: [
        { icon: '🌐', title: 'Mở game', text: 'Dùng Chrome, Edge, Firefox hoặc Safari bản mới. Bật toàn màn hình (F11) cho đã mắt.' },
        { icon: '🏪', title: 'Vào tiệm', text: 'Bấm "Chơi không cần đăng nhập" hoặc đăng nhập Google. Đặt tên của bạn ở ô tên trước khi vào, tên đó hiện trên bảng xếp hạng.' },
        { icon: '💾', title: 'Lần sau', text: 'Game tự lưu trong trình duyệt. Quay lại bấm "Chơi tiếp trong máy".' },
      ],
    },
    { title: 'Điều khiển', steps: move[device] },
    {
      title: 'Một ngày bán hàng',
      steps: [
        { icon: '📦', title: 'Nhập hàng', text: 'Mở Nhập hàng (hoặc phím K ở kho), chọn mặt hàng và số lượng. Hàng về kho sau một lúc.' },
        { icon: '🗄️', title: 'Bày lên kệ', text: 'Đến gần kệ bấm B (hoặc mở Sơ đồ kệ). Kệ trống thì khách không có gì để mua.' },
        { icon: '🚪', title: 'Mở cửa', text: 'Bấm O (hoặc nút Mở cửa) để đón khách. Đóng cửa khi hết giờ hoặc hết hàng.' },
        { icon: '🧾', title: 'Đứng quầy', text: 'Khách tự tính tiền; đứng quầy để chốt kèo, mặc cả, nhận đặt hàng trước.' },
        { icon: '🚚', title: 'Giao hàng', text: 'Có đơn giao thì mang hàng tới cửa nhà khách, bấm G.' },
      ],
    },
    {
      title: 'Cuối ngày',
      steps: [
        { icon: '🌙', title: 'Đi ngủ', text: 'Tối về nhà, đến giường bấm N để qua ngày. Xem báo cáo thu chi rồi sang ngày mới.' },
        { icon: '🎁', title: 'Quà mỗi ngày', text: 'Vào game mỗi ngày để điểm danh, quay vòng quay; giữ chuỗi ngày để quà tốt hơn.' },
      ],
    },
    {
      title: 'Lớn dần',
      steps: [
        { icon: '📈', title: 'Lên cấp, mở hàng', text: 'Bán nhiều thì lên cấp, mở thêm mặt hàng và dịch vụ mới.' },
        { icon: '🍳', title: 'Trạm nấu', text: 'Đến trạm nấu bấm M để làm món bán, lãi hơn bán thẳng nguyên liệu.' },
        { icon: '👥', title: 'Nhân viên', text: 'Thuê người phụ bán, nhập hàng, dọn dẹp khi bạn bận.' },
        { icon: '🏘️', title: 'Cộng đồng', text: 'Đăng nhập Google để kết bạn, buôn bán ở chợ liên hẻm và chơi chung hẻm online.' },
      ],
    },
    {
      title: 'Lưu và chuyển máy',
      steps: [
        { icon: '📤', title: 'Mã chuyển máy', text: 'Cài đặt → Dữ liệu: xuất mã rồi dán sang máy khác để chơi tiếp.' },
        { icon: '☁️', title: 'Lưu cloud', text: 'Đăng nhập Google để tiến trình theo bạn sang mọi máy.' },
      ],
    },
    {
      title: 'Mẹo',
      steps: [
        { icon: '⚙️', title: 'Máy yếu', text: 'Cài đặt → Hình ảnh: giảm độ phân giải hoặc đồ họa nếu giật.' },
        { icon: '⏯️', title: 'Tốc độ & tạm dừng', text: 'Chỉnh tốc độ thời gian hoặc tạm dừng bằng nút trên thanh trên cùng.' },
        { icon: '💬', title: 'Gặp lỗi?', text: 'Mở Góp ý ở menu ngoài, chọn "Báo lỗi" và kể chuyện gì đã xảy ra.' },
      ],
    },
  ];
}

/** Bảng phím đầy đủ cho tab Máy tính. */
export const KEYS = CONTROLS;
