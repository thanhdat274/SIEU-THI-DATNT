# Hệ giao diện Nắng Hẻm

Token CSS nằm ở `apps/web/src/index.css`: ink,wood-dark,wood,wood-light,paper,paper-shade,teal,teal-dark,brick,sun,muted. Chữ body ≥14px; title 18–20px. Font hệ thống có đầy đủ dấu tiếng Việt. CTA dùng teal-dark/paper để đạt contrast, màu teal sáng dành progress/decor.

## Component

- PixelPanel: children, className; nền giấy, viền/shadow cứng.
- PixelButton: props HTMLButton + icon/variant paper|teal|brick|wood; min hit area 44px, aria-label cho icon-only, disabled lý do hiển thị cạnh action.
- PixelIcon: name typed, size; SVG hình chữ nhật trên grid, aria-hidden vì label ở control.
- ProductIcon/ProductSlot: productId, size hoặc quantity; dùng chung productPixels của game-data với renderer và fallback.
- PixelStat: label,value,icon; số tabular. PixelProgress: value,max,label; clamp và role progressbar.
- QuantityStepper: value,min,max,onChange,label,disabled; số nguyên có clamp, nút min/max disabled, input label có thể đọc được.
- PixelDialog: title,subtitle,icon,onClose,footer; header/footer cố định, content cuộn, role dialog, aria-modal, focus trap/Escape/restore.

Trang mẫu chỉ hiện trong Vite DEV qua `/?art-lab`. Không chạy simulation/save khi xem trang mẫu.

## State và input

Zustand giữ coordinator: mở một modal luôn đóng những modal khác. Nguồn state hàng/tiền/XP từ simulation; XP nằm trong cấp và chia experienceToNextLevel. setFixtures cập nhật bản fixture đang mở để bày/cất thay đổi ngay trên panel.

App subscribe coordinator để bật/tắt InputManager khi modal đổi. setEnabled chỉ clear keys/vector/requests khi đổi trạng thái; đồng hồ/NPC vẫn chạy. Tab dành focus browser, I mở túi, Space trên button kích hoạt button thay vì tương tác world. Blur window clear held input. Vùng game có inert trong lúc modal mở. Cửa sổ capture opener trước inert để restore focus đúng control.

## Layout

App flex HUD/main/footer; desktop dock thành cột 300px, world ResizeObserver cập nhật renderer và camera. Mobile breakpoint width<1024 hoặc height<500: kho mặc định đóng, panel overlay trong main, touch controls chỉ khi không có modal/kho mở. 667×375 vẫn để world >60% chiều cao. Safe-area tính ở shell và dialog. Viewport cho phép browser zoom; canvas có touch-action none, panel có pan-y.

## Phản hồi và persistence

Buy/restock/unstock/checkout sử dụng callbacks simulation hiện có, không fake số liệu. Toast tối đa ba mục nhìn thấy, dismiss có tên. SaveModal đợi Promise<boolean>, chỉ báo thành công và lastSavedAt sau persistence thật; reset xác nhận inline và hủy được. Lỗi reset/lưu giữ dialog với thông báo. Loading không có phần trăm giả. Không dùng thuật ngữ IndexedDB/Dexie trong luồng người chơi.

## Renderer

Texture nearest, antialias false, roundPixels, DPR tối đa 2, zoom 1/2/3. Resize observer theo vùng world; layout dock không phủ lên camera. Characters anchor chân, fixture zIndex theo cạnh dưới footprint; decor không đổi collision map. Day/night overlay tối đa alpha .25. Media query reduced-motion tắt idle/walk/decor chuyển động phụ và bubble bounce, giữ thông báo chữ. Floating gain 0.8s chỉ gọi sau transaction thành công. Product/frame textures cache theo key.
