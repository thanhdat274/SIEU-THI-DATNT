# LỘ TRÌNH PHÁT TRIỂN (DEVELOPMENT ROADMAP)

## 📌 GIAI ĐOẠN HIỆN TẠI: PHASE 0 & PHASE 1 (VERTICAL SLICE)

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

### [ ] GIAI ĐOẠN 2: HỆ THỐNG SẢN PHẨM & KHO HÀNG NÂNG CAO (PRODUCT & INVENTORY)
- [ ] Mở rộng danh mục lên 30+ sản phẩm đặc trưng Việt Nam theo 10 phân loại.
- [ ] Hệ thống đặt hàng nhà phân phối (Supplier Purchasing) và thời gian giao hàng.
- [ ] Cơ chế hạn sử dụng và bảo quản tủ mát.

---

### [ ] GIAI ĐOẠN 3: KHÁCH HÀNG NPC & TÍNH TIỀN (CUSTOMER NPC & CHECKOUT)
- [ ] Thuật toán tìm đường A* (A-Star Pathfinding) cho NPC.
- [ ] Máy trạng thái khách hàng: Đi vào -> Chọn hàng -> Xếp hàng thanh toán -> Rời tiệm.
- [ ] Cơ chế kiên nhẫn và độ hài lòng của khách trong xóm.

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
