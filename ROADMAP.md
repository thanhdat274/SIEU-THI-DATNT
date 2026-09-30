# LỘ TRÌNH PHÁT TRIỂN (DEVELOPMENT ROADMAP)

## KẾ HOẠCH CHỌN LỌC GAME THAM KHẢO — 30/09/2026

OpenSpec `adapt-reference-shop-operations` là đề xuất chưa triển khai. Thứ tự: A bảo vệ save/châm thực chuyển và giỏ/queue/thu ngân hợp lệ → B 20 sản phẩm mới, mối sỉ/holding/sơ đồ kệ → C giá vốn/sổ ngày/gợi ý nhập → D thu ngân/châm kệ có ca/lương → E tự nhập opt-in và nghiệm thu tích hợp. Nhân viên MVP dùng layout hiện tại, không bắt buộc chờ mua đất; building đầy đủ vẫn là giai đoạn riêng. World/auth/realtime theo change `shared-alley-multiplayer`.

Khảo sát source 335 sản phẩm và modules kho/nhân viên; chưa chạy UI/test nguồn. Kế hoạch không đổi trạng thái nghiệm thu các phase bên dưới. Chi tiết: `openspec/changes/adapt-reference-shop-operations/research.md`, `design.md`, `tasks.md`.

## 📌 GIAI ĐOẠN HIỆN TẠI: PHASE 3 (KHÁCH HÀNG NPC & TÍNH TIỀN)

## Ưu tiên mới: con hẻm chơi chung — 30/09/2026

Đã tạo kế hoạch `openspec/changes/shared-alley-multiplayer` (proposal/design/specs/tasks), chưa triển khai online. Không còn để toàn bộ multiplayer tới cuối Phase 10: đưa nền world/cơ sở, headless core và backend/auth/persistence lên trước building/nhân viên. Phase 3 về checkout/save vẫn là phụ thuộc; không đánh dấu hoàn thành giai đoạn vì có kế hoạch.

1. Schema tài khoản/world/cơ sở và adapter local; giao dịch gắn khách, chống xử lý trùng.
2. Server authoritative, login/membership/mã mời, lưu bền và pause/resume.
3. Bản hai người chung một tiệm/quỹ/kho, chơi lệch giờ, reconnect và bảo toàn save riêng.
4. Nghiệm thu hai client, network loss, DB failure và restart trước phát hành.
5. Sau đó phát triển nhiều cơ sở trong cùng hẻm, sở hữu riêng/chung và nhân viên. Chuyển/gộp tiệm từ world khác cần change riêng.

Phase 7 giữ định hướng Firebase/NestJS/MongoDB, triển khai phần cần cho co-op trong change mới. PWA và các phase nội dung chưa được nghiệm thu hay tự triển khai theo thay đổi ưu tiên này.

---

### [X] GIAI ĐOẠN 0: KHỞI TẠO NỀN TẢNG (REPOSITORY FOUNDATION)
- [x] Thiết lập cấu trúc Monorepo (`pnpm-workspace.yaml`).
- [x] Cấu hình TypeScript cho toàn bộ packages và apps.
- [x] Thiết lập tài liệu thiết kế (GAME_DESIGN, ARCHITECTURE, ROADMAP, DATABASE_SCHEMA, TASKS).
- [x] Khởi tạo dự án Web (Vite + React + Tailwind CSS + PixiJS v8).
- [x] Cấu hình cơ sở dữ liệu lưu trữ cục bộ Dexie (IndexedDB) với schema versioning.

---

### [>] GIAI ĐOẠN 1: BẢN ĐỒ & NHÂN VẬT CHƠI ĐƯỢC (PLAYABLE MAP & CHARACTER)
- [x] Xây dựng Renderer PixiJS v8 pixel-perfect (Nearest-neighbor filtering, 32x32 tiles, integer scaling).
- [x] Tạo bản đồ tiệm tạp hóa Việt Nam thập niên 90s (Cửa hàng 8x8 + vỉa hè + đường hẻm).
- [x] Điều khiển nhân vật mượt mà 4 hướng (WASD / Mũi tên trên Desktop, Virtual Joystick trên Mobile).
- [x] Hệ thống Camera Pixel bám theo nhân vật kèm giới hạn biên bản đồ.
- [x] Hệ thống va chạm (Collision) cho tường, quầy, kệ và chướng ngại vật.
- [x] Bố trí 2 kệ hàng gỗ tương tác và 1 bàn thu ngân cổ điển.
- [x] Định nghĩa danh mục 5 sản phẩm Việt Nam khởi đầu (Mì Hảo Hảo, Xá xị Chương Dương, Kẹo Big Babol, Sữa Ông Thọ, Bánh mì que).
- [x] Giao diện túi đồ / kho hàng (Inventory UI) hiển thị sức chứa, số lượng và thông tin chi tiết.
- [x] Hệ thống đồng hồ thời gian trong game (Game Clock) và chu kỳ ngày.
- [x] Chức năng Lưu / Tải game cục bộ qua IndexedDB (Dexie) kèm thông báo Autosave.
- [x] Hỗ trợ Responsive đa nền tảng (Desktop & Mobile) kèm màn hình nhắc xoay ngang khi ở chế độ dọc.

---

### [X] GIAI ĐOẠN 2: HỆ THỐNG SẢN PHẨM & KHO HÀNG NÂNG CAO (PRODUCT & INVENTORY)
- [x] Mở rộng danh mục lên 30+ sản phẩm đặc trưng Việt Nam theo 10 phân loại.
- [x] Đặt hàng nhà phân phối, trừ tiền và giao hàng vào kho sáng hôm sau; đơn chờ được lưu/tải.
- [x] Cơ chế hạn sử dụng theo lô và bảo quản tủ mát, gồm sức chứa kho lạnh và giới hạn loại kệ.

---

### [ ] GIAI ĐOẠN 3: KHÁCH HÀNG NPC & TÍNH TIỀN (CUSTOMER NPC & CHECKOUT)
- [x] Thuật toán tìm đường A* (A-Star Pathfinding) dùng cùng vùng va chạm với người chơi.
- [ ] Máy trạng thái khách hàng: đã có đi vào -> đến kệ -> đến quầy -> thanh toán -> rời tiệm; cần hàng đợi nhiều khách và tương tác thu ngân của người chơi.
- [ ] Cơ chế kiên nhẫn: đã có giới hạn chờ và trừ uy tín khi bỏ về; cần cân bằng độ hài lòng và hiển thị phản hồi.
- [x] Bán hàng thủ công tại quầy từ tồn kệ; cập nhật tiền, XP và doanh thu.

---

### [ ] GIAI ĐOẠN 4: KINH TẾ, NHIỆM VỤ & LÊN CẤP (ECONOMY & QUESTS)
- [ ] Báo cáo tài chính cuối ngày (Doanh thu, tiền vốn, lợi nhuận ròng).
- [ ] Hệ thống nhiệm vụ hàng ngày và chuỗi cốt truyện xóm nhỏ.
- [ ] Cột mốc cấp độ mở khóa vật phẩm mới.

---

### [ ] GIAI ĐOẠN 5: MỞ RỘNG MẶT BẰNG & XÂY DỰNG (LAND EXPANSION & BUILDING)
- [ ] Chế độ xây dựng (Building Mode): Đặt, xoay, cất đồ đạc theo ô lưới.
- [ ] Mua thêm diện tích đất lân cận và xây kho sau tiệm.

---

### [ ] GIAI ĐOẠN 6: TỰ ĐỘNG HÓA & THUÊ NHÂN VIÊN (EMPLOYEE AUTOMATION)
- [ ] Thuê người phụ việc: Thu ngân, người xếp hàng lên kệ, bảo vệ dắt xe.

---

### [ ] GIAI ĐOẠN 7: XÁC THỰC FIREBASE & CLOUD SAVE MONGODB
- [ ] Đăng nhập Google qua Firebase Authentication.
- [ ] NestJS REST API đồng bộ cloud save an toàn với MongoDB Atlas.

---

### [ ] GIAI ĐOẠN 8: TỐI ƯU HÓA MOBILE & PWA
- [ ] Cài đặt PWA offline hoàn chỉnh trên iOS/Android.

---

### [ ] GIAI ĐOẠN 9: SỰ KIỆN MÙA VIỆT NAM (SEASONAL EVENTS)
- [ ] Sự kiện Tết Nguyên Đán (Bánh chưng, câu đối đỏ, dưa hấu).
- [ ] Trung Thu, Mùa tựu trường, Mùa mưa Sài Gòn.

---

### [ ] GIAI ĐOẠN 10: QUẦY ĂN UỐNG & ĐỊNH HƯỚNG MULTIPLAYER
- [ ] Mở quầy cà phê vợt, quầy bánh mì nướng muối ớt trước cửa tiệm.

## GIAO DIỆN PIXEL VIỆT — 30/09/2026
- [x] Nhà kho vật lý liền phía trên tiệm: phòng đi vào được, giá khô/góc lạnh/khu nhận, WarehouseModal và migration save cũ. Unit/browser tests, năm viewport và joystick đã pass; xem docs/ui/WAREHOUSE.md.
- [x] Triển khai palette Nắng Hẻm, component pixel, HUD/kho/modal, original procedural art và integer camera.
- [x] Smoke giao dịch/lưu lại, lỗi revision, responsive năm viewport và kiểm tra build/test.
- [ ] Nghiệm thu chuyển động/occlusion, night/reduced motion, toàn bộ tổ hợp lỗi và hiệu năng thiết bị thật. Theo dõi OpenSpec premium-vietnamese-pixel-ui và docs/ui/VERIFICATION.md; chưa archive.

## HỆ THỐNG THUẾ — ĐỢT ĐẦU 30/09/2026
- [>] TAX-0: Có hồ sơ nguồn, ma trận và danh sách chưa xác minh tại docs/tax; thẩm định toàn bộ pháp luật chưa hoàn tất.
- [x] Module nền TaxRuleRegistry: phiên bản bất biến, chọn theo ngày/chủ thể/hoạt động, khóa UNVERIFIED, snapshot JSON và kiểm thử.
- [ ] TAX-1: Hồ sơ chủ thể và đăng ký/chuyển đổi độc lập cấp độ.
- [ ] TAX-2–4: Hoàn tất thẩm định, engine xác định, VAT/PIT hộ và CIT có điều kiện.
- [ ] TAX-5–8: Kế toán, hóa đơn, UI/nhiệm vụ, backend cố vấn, MongoDB và kiểm thử tích hợp.
- Quy tắc nghiên cứu 1 tỷ chưa hoạt động; chưa thu thuế hoặc đổi save của người chơi.
