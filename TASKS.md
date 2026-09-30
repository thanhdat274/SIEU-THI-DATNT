# BẢNG THEO DÕI CÔNG VIỆC (TASKS PROGRESS)

## ĐỀ XUẤT THAM KHẢO GAME — 30/09/2026

- Đã tạo kế hoạch OpenSpec `adapt-reference-shop-operations`: khảo sát source game `GAME/tap-hoa-dau-hem`, snapshot 335 sản phẩm, proposal/design/7 delta specs/tasks.
- Chưa triển khai: giữ 36 món cũ và thêm 20 món được duyệt; sơ đồ kệ, nhiều mối nhập/hàng chờ, giỏ/queue/giao dịch, ledger/gợi ý, thu ngân/châm kệ, ca/lương và tự nhập opt-in.
- Thứ tự/phụ thuộc/kiểm chứng theo `openspec/changes/adapt-reference-shop-operations/tasks.md`; phối hợp command với `shared-alley-multiplayer`, không tạo backend thứ hai. Chưa chạy game/test nguồn; không coi tài liệu là chức năng đã xong.

## ĐỊNH HƯỚNG CO-OP — 30/09/2026
- [x] Tạo proposal/design/ba delta specs/tasks tại `openspec/changes/shared-alley-multiplayer`; đây là tài liệu kế hoạch, chưa là multiplayer chạy thật.
- [ ] Triển khai theo tasks của change: schema world/cơ sở → core headless/giao dịch → server/auth/persistence → client hai người → nghiệm thu reconnect/chơi lệch giờ.
- [ ] Bản đầu: một tiệm chung, tối đa hai thành viên, owner offline member vẫn chơi; tất cả offline world pause; giữ save local riêng.
- [ ] Hướng sau: nhiều cơ sở độc lập trong cùng hẻm và quyền ghé thăm/phụ việc; chuyển/gộp tiệm chưa thuộc bản đầu.
- Ưu tiên kiến trúc multiplayer trước mở rộng building/nhân viên; kiểm tra giao dịch/save và Phase 3 vẫn là nền cần hoàn thiện, không coi đã nghiệm thu.

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
- [x] Mở rộng danh mục lên 36 sản phẩm và đủ 10 nhóm; giá nhập/bán và cấp mở khóa dùng chung trong đặt hàng, kho và quầy.
- [x] Quản lý hạn sử dụng theo lô, loại hàng quá hạn qua ngày, giới hạn kho lạnh 40 món và tủ mát 12 món. Bản lưu cũ được bổ sung lô/tủ mát mà vẫn giữ số hàng.
- [x] Khách NPC đầu tiên dùng A* đi từ cửa tới kệ, quầy và rời tiệm; giao dịch trừ hàng trên kệ, cộng tiền/XP/thống kê; trạng thái khách đang đi được lưu/tải.
- [ ] Hàng đợi nhiều khách, người chơi thao tác tính tiền tại quầy và phản hồi mức hài lòng. Hiện NPC tự thanh toán sau khi tới quầy.
- [ ] Báo cáo tài chính theo ngày, nhiệm vụ và mở khóa cấp độ.
- [ ] Đo FPS trên thiết bị thật. Đã kiểm tra giao diện 960×540, 844×390 và màn hình dọc 390×844 trong trình duyệt thử nghiệm; chưa kiểm tra điện thoại thật.
- [ ] Thiết lập lint script và chạy lint; dự án hiện chưa có cấu hình lint.

## BÀN GIAO PHIÊN 2026-09-30
- Giai đoạn hiện tại: Phase 3. Phase 2 đã hoàn thành và được kiểm tra bằng typecheck, 10 nhóm test lõi, build production và lưu/tải trên trình duyệt.
- Tiếp theo: bổ sung hàng đợi nhiều NPC, để người chơi thu tiền tại quầy, phản hồi kiên nhẫn/uy tín; kiểm tra hiệu năng và thiết bị thật.
- Vấn đề còn biết: không có lint script; NestJS/MongoDB/Firebase/PWA/ECS đầy đủ vẫn thuộc các giai đoạn sau. Bản build hiện cảnh báo JS chunk chính trên 500 kB.

## THUẾ — TAX-0 VÀ MODULE NỀN
## PREMIUM VIETNAMESE PIXEL UI
- [x] Nhà kho vật lý sau tiệm đã triển khai: cửa/lối đi, art stock thật, panel kiểm kê/nhận hàng, tương thích save cũ và kiểm thử tích hợp. Bằng chứng docs/ui/WAREHOUSE.md và docs/ui/qa/warehouse-*.
- [x] Bộ giao diện mới, asset original, modal focus/input và save feedback đã triển khai.
- [x] Typecheck/test/build và smoke purchase → delivery → restock → sale → save/reload; ảnh năm viewport nằm trong docs/ui/qa.
- [ ] Hoàn thành các kiểm tra còn mở ở openspec/changes/premium-vietnamese-pixel-ui/tasks.md. Báo cáo pass/thiếu bằng chứng và hạn chế hiệu năng: docs/ui/VERIFICATION.md.

## THUẾ — TAX-0 VÀ MODULE NỀN
- [x] Đọc tài liệu và kiểm tra trạng thái repository; giữ các thay đổi đang có.
- [x] Tạo tám tài liệu docs/tax; phân biệt nguồn chính thức với quy tắc đủ điều kiện chạy.
- [x] Thêm registry bất biến và kiểm thử ngày/phiên bản/khôi phục JSON/khóa UNVERIFIED.
- [ ] Đối chiếu bản ký, sửa đổi đến 30/09/2026, điều khoản chuyển tiếp và thông tư; TAX-0 chưa hoàn tất.
- [ ] Xác minh cụ thể PIT/VAT đa hoạt động, thuế suất CIT và điều kiện miễn, NĐ 254 về hóa đơn, đăng ký, thực phẩm/BHXH.
- [ ] Thêm TAX-1 sau thẩm định điều kiện; tích hợp năm pháp lý và taxRuleVersion vào save có migration.
- [ ] Triển khai engine, kế toán, UI, trợ lý và persistence theo từng phase; không kích hoạt công thức giả định.
