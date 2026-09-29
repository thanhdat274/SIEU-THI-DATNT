# BẢNG THEO DÕI CÔNG VIỆC (TASKS PROGRESS)

## GIAI ĐOẠN 0: THIẾT LẬP NỀN TẢNG DỰ ÁN (PHASE 0)
- [x] Tạo cấu trúc Monorepo (`pnpm-workspace.yaml`, `package.json`).
- [x] Khởi tạo các packages: `shared`, `game-data`, `game-core`, `game-renderer`, `game-ui`.
- [x] Khởi tạo ứng dụng chính `apps/web` (Vite, React 18, Tailwind CSS, TypeScript).
- [x] Khởi tạo khung ứng dụng `apps/server` (NestJS structure chuẩn bị cho Phase 7).
- [x] Viết tài liệu kỹ thuật: `GAME_DESIGN.md`, `ARCHITECTURE.md`, `ROADMAP.md`, `DATABASE_SCHEMA.md`, `TASKS.md`.

---

## GIAI ĐOẠN 1: BẢN ĐỒ & NHÂN VẬT CHƠI ĐƯỢC (PHASE 1 VERTICAL SLICE)
- [x] **Hệ thống dữ liệu game (game-data & shared)**:
  - [x] Định nghĩa 5 sản phẩm Việt Nam đầu tiên (Mì Hảo Hảo, Xá xị Chương Dương, Kẹo Big Babol, Sữa đặc Ông Thọ, Bánh mì que).
  - [x] Định nghĩa cấu trúc bản đồ khởi đầu (Cửa hàng 8x8 + vỉa hè + đường hẻm).
- [x] **Bộ dựng hình PixiJS v8 pixel-art (game-renderer)**:
  - [x] Khởi tạo Canvas với Nearest-Neighbor filtering và integer scaling.
  - [x] Tải / tạo texture pixel-art chuẩn 32x32: Nền gạch bông cổ điển, vỉa hè lát đá, tường vôi vàng, kệ gỗ, quầy thu ngân, nhân vật người chơi.
  - [x] Camera pixel-perfect bám theo người chơi, hạn chế rung giật (sub-pixel jittering).
  - [x] Render theo thứ tự trục Y (Y-sort) để nhân vật hiển thị tự nhiên trước và sau kệ hàng.
- [x] **Logic lõi & ECS (game-core)**:
  - [x] Xử lý đầu vào: WASD, Phím mũi tên, Phím [E]/[Space] tương tác, Phím [I] mở túi đồ.
  - [x] Hệ thống va chạm (AABB tile collision check).
  - [x] Hệ thống tương tác (Interaction system) phát hiện kệ hàng và bàn thu ngân trong cự ly.
  - [x] Vòng lặp mô phỏng với bước thời gian cố định (Fixed timestep).
  - [x] Đồng hồ game (Game Clock) từ 06:00 đến 22:00, tua nhanh theo nhịp chơi.
- [x] **Giao diện người dùng & Điều khiển (game-ui & apps/web)**:
  - [x] HUD đầu game: Tiền (VND), Ngày, Giờ, Cấp độ, Thanh kinh nghiệm, Nút mở túi đồ, Nút lưu game.
  - [x] Bảng túi đồ / kho hàng (Inventory Modal) phong cách cổ điển, xem thông tin chi tiết từng món.
  - [x] Hộp thoại tương tác kệ hàng: Cho phép bày sản phẩm từ túi đồ lên kệ, xem số lượng tồn trên kệ.
  - [x] Hộp thoại bàn thu ngân: Quản lý đóng/mở cửa tiệm, kiểm tra tiền trong hòm.
  - [x] Virtual Joystick và nút cảm ứng trên màn hình điện thoại / máy tính bảng.
  - [x] Màn hình cảnh báo xoay ngang (Rotate Device Overlay) khi phát hiện màn hình dọc.
- [x] **Hệ thống lưu cục bộ (Dexie IndexedDB)**:
  - [x] Lưu và khôi phục trạng thái vị trí người chơi, số tiền, ngày giờ, hàng hóa trên kệ, túi đồ.
  - [x] Cơ chế tự động lưu (Autosave) kèm thông báo trực quan.
- [x] **Kiểm thử & Đóng gói sản phẩm**:
  - [x] Chạy kiểm tra kiểu TypeScript (`tsc`).
  - [x] Chạy kiểm tra bộ build sản phẩm (`pnpm build`).
  - [ ] Đo FPS và kiểm tra console trên trình duyệt desktop/mobile thật.

---

## ĐỢT RÀ SOÁT HIỆN TẠI
- [x] Sửa race khởi tạo Pixi trong React StrictMode: lượt dọn dẹp cũ không còn phá canvas của lượt mới; hiển thị lỗi khởi động và nút tải lại nếu dựng bản đồ thất bại.
- [x] Sửa đồng hồ HUD cập nhật mỗi phút và vòng mô phỏng cố định theo thời gian thực, không theo số khung hình.
- [x] Sửa lưu IndexedDB: revision chỉ tăng một lần, ghi tuần tự và từ chối bản lưu cũ.
- [x] Đặt hàng nhà phân phối bằng tiền thật; đơn chờ được lưu và giao vào kho sáng ngày kế.
- [x] Bán từng món từ tồn kệ tại quầy; cộng tiền, XP, doanh thu và lưu thống kê.
- [x] Kiểm thử nghiệp vụ đặt hàng, giao hàng, bán hàng và khôi phục dữ liệu.
- [ ] Mở rộng danh mục lên 30+ sản phẩm và đủ 10 nhóm.
- [ ] Quản lý hạn sử dụng theo lô và tủ mát. Hiện hàng chưa hỏng theo thời gian.
- [ ] Khách NPC tự đi lại, chọn hàng và xếp hàng; thao tác bán ở quầy hiện do người chơi thực hiện.
- [ ] Báo cáo tài chính theo ngày, nhiệm vụ và mở khóa cấp độ.
- [ ] Kiểm thử trực quan trên desktop và mobile, đo FPS.
- [ ] Thiết lập lint script và chạy lint; dự án hiện chưa có cấu hình lint.
