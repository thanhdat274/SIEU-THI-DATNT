# TIỆM TẠP HÓA ĐẦU HẺM - TÀI LIỆU THIẾT KẾ GAME (GAME DESIGN DOCUMENT)

## 1. TỔNG QUAN DỰ ÁN (OVERVIEW)
- **Tên trò chơi**: Tiệm Tạp Hóa Đầu Hẻm (Vietnamese Nostalgic Grocery Store Simulation)
- **Thể loại**: Quản lý kinh doanh (Tycoon) + Mô phỏng cuộc sống (Life Simulation) + Cozy Pixel Art 2D
- **Bối cảnh**: Con hẻm nhỏ Việt Nam thập niên 1990s - 2000s, ngập tràn ký ức tuổi thơ, tường vôi vàng, nền gạch bông cổ điển, quạt trần quay đều, tiếng xe máy xịch xịch ngoài đầu ngõ.
- **Phong cách đồ họa**: 2D Pixel Art 2.5D (Top-down), ô lưới 32x32 pixel, lọc texture Nearest-Neighbor, màu sắc ấm áp, bảng màu hoài niệm (nâu gỗ mộc, vàng ấm, xanh ngọc, đỏ gạch).
- **Độ phân giải chuẩn**: 960x540 (Tỷ lệ 16:9 Landscape), hỗ trợ co giãn pixel-perfect, thích ứng đa thiết bị (Desktop + Mobile).

---

## 2. VÒNG LẶP CỐT LÕI (CORE GAMEPLAY LOOP)
1. **Mở cửa tiệm (Open Store)**: Đón những vị khách đầu tiên trong xóm (cô Ba, bé Bo, bác Năm hưu trí).
2. **Nhập hàng & Bày kệ (Restock)**: Đặt hàng từ đại lý, xếp hàng từ kho/túi đồ lên kệ quầy.
3. **Phục vụ khách (Customer Interaction)**: Khách dạo quanh tiệm, chọn món yêu thích, xếp hàng tại quầy thu ngân.
4. **Tính tiền & Thu tiền (Checkout)**: Thu ngân tính tiền (xu/đồng VND nguyên số), nhận tiền mặt, cộng điểm kinh nghiệm (XP).
5. **Đóng cửa & Báo cáo tài chính (End of Day)**: Tổng kết doanh thu, giá vốn hàng bán, tiền lãi, hao hụt, thưởng hoàn thành nhiệm vụ ngày.
6. **Mở rộng & Nâng cấp (Progression)**: Mở thêm mặt bằng, mua thêm tủ kính/tủ mát, thuê phụ tá, mở quầy cà phê/bánh mì.

---

## 3. THẾ GIỚI GAME & BẢN ĐỒ (WORLD & MAP)
- **Kích thước ban đầu**: Cửa hàng 8x8 ô (256x256 px) nằm liền kề vỉa hè con hẻm ngoài trời.
- **Lưới chuẩn**: 32x32 pixel / tile.
- **Các vùng chức năng**:
  - *Khu vực bán lẻ*: Kệ gỗ tạp hóa, tủ kính đựng kẹo thuốc, quầy thu ngân với máy tính bấm nút hoặc hòm gỗ đựng tiền lẻ.
  - *Khu vực kho*: Góc chứa thùng các-tông mì tôm, két nước ngọt thủy tinh.
  - *Khu vực vỉa hè*: Cây bàng, cột điện dây chằng chịt, bảng hiệu vẽ tay "TIỆM TẠP HÓA CÔ NĂM", khách bộ hành qua lại.
- **Hệ thống va chạm (Collision)**: Ngăn người chơi và NPC đi xuyên kệ hàng, tường nhà, quầy thu ngân.
- **Tương tác (Interaction Trigger)**: Khi lại gần kệ hàng hoặc quầy trong cự ly 1.5 tile, hiển thị nút/phím tương tác (phím [E] hoặc chạm nút "Tương tác").

---

## 4. HỆ THỐNG SẢN PHẨM KHỞI ĐẦU (PHASE 1 STARTER PRODUCTS)
1. **Mì tôm Hảo Hảo tôm chua cay**:
   - Giá nhập: 3,000 đ | Giá bán: 4,500 đ
   - Sức chứa kệ: 24 gói
   - Danh mục: Mì ăn liền
2. **Nước ngọt Xá xị Chương Dương (Chai thủy tinh)**:
   - Giá nhập: 5,000 đ | Giá bán: 8,000 đ
   - Sức chứa kệ: 16 chai
   - Danh mục: Nước giải khát
3. **Kẹo cao su Big Babol dưa hấu**:
   - Giá nhập: 1,000 đ | Giá bán: 2,000 đ
   - Sức chứa kệ: 30 phong
   - Danh mục: Bánh kẹo tuổi thơ
4. **Sữa đặc có đường Ông Thọ đỏ**:
   - Giá nhập: 18,000 đ | Giá bán: 24,000 đ
   - Sức chứa kệ: 12 lon
   - Danh mục: Nguyên liệu & Bổ dưỡng
5. **Bánh mì que giòn tan**:
   - Giá nhập: 6,000 đ | Giá bán: 10,000 đ
   - Sức chứa kệ: 10 ổ
   - Danh mục: Bánh mì & Đồ ăn nhanh

---

## 5. NHÂN VẬT & ĐIỀU KHIỂN (CHARACTER & CONTROLS)
- **Nhân vật người chơi**: Chủ quán cần cù, áo sơ mi ngắn tay hoặc áo thun giản dị thập niên 90s.
- **Tốc độ di chuyển**: 120 pixels/giây, chuyển động 4 hướng mượt mà, chuyển sprite theo hướng nhìn (Up, Down, Left, Right).
- **Hệ thống điều khiển**:
  - *Desktop*: Phím W/A/S/D hoặc Mũi tên để di chuyển. Phím [E] hoặc [Space] tương tác. Phím [I] mở túi đồ. Phím [Esc] đóng menu.
  - *Mobile*: Virtual Joystick mượt mà góc trái dưới màn hình, nút bấm ảo to bản "Tương tác" góc phải, thanh HUD trên cùng với icon túi đồ.
- **Hỗ trợ xoay màn hình**: Cảnh báo yêu cầu xoay ngang màn hình (Landscape mode) khi người chơi cầm dọc điện thoại.

---

## 6. HỆ THỐNG LƯU TRỮ (SAVE SYSTEM)
- **Lưu cục bộ (Offline-first)**: Sử dụng Dexie.js (IndexedDB) lưu trữ toàn bộ trạng thái game:
  - Thông tin người chơi (tên, tiền xu, kinh nghiệm, cấp độ).
  - Trạng thái kệ hàng (vị trí, sản phẩm trên kệ, số lượng hiện có, sức chứa tối đa).
  - Túi đồ / Kho hàng (danh sách vật phẩm, số lượng).
  - Thời gian game (Ngày thứ mấy, giờ trong ngày từ 06:00 đến 22:00).
- **Cơ chế Autosave**: Tự động lưu ngầm mỗi 30 giây và khi đóng cửa tiệm / chuyển ngày.

---

## 7. CÁC HỆ THỐNG QUẢN LÝ MỞ RỘNG (EXPANDED MANAGEMENT SYSTEMS)
- **Khách quen hẻm (Regular Customers)**: 6 cư dân đại diện với sở thích, độ nhạy giá và độ kiên nhẫn riêng. Tích lũy điểm thân thiết (+2/ngày) mở khóa đặc quyền boa thêm tiền và mua thêm hàng.
- **Đơn tiệc (Party Orders)**: Nhận đơn đặt hàng lớn từ cư dân xóm, xuất kho theo nguyên tắc FEFO (hạn dùng gần nhất xuất trước) để nhận thưởng tiền mặt và danh tiếng.
- **Mục tiêu dài hạn & Nhiệm vụ tuần (Goals & Weekly Quests)**: Sổ ước nguyện theo dõi các cột mốc buôn bán, thưởng một lần cùng nhiệm vụ tuần định kỳ.
- **Kỹ năng & Đặc quyền (Skills & Perks)**: 3 nhánh kỹ năng (Quản lý tiệm, Buôn bán & Ngoại giao, Kho bãi & Bảo quản). Lựa chọn đặc quyền tại các mốc cấp 5 và 10.
- **Danh hiệu chủ tiệm (Milestone Titles)**: Hệ thống danh hiệu ghi nhận các thành tựu nổi bật (Tập sự, Chủ tiệm cần mẫn, Vua đơn tiệc, Đại gia tạp hóa, Huyền thoại đầu hẻm), hiển thị trên HUD.
- **Bảo vệ trông xe (Bike Guard)**: Vai trò nhân viên an ninh trông giữ xe máy tại bãi đỗ vỉa hè, giúp khách đi xe máy yên tâm mua hàng lâu hơn (+15s kiên nhẫn) và tăng độ hài lòng.
- **Quầy phụ vỉa hè (Side Stalls)**: Quầy cà phê vợt và bánh mì muối ớt trước hiên nhà, có người bán đứng quầy và phục vụ khách bộ hành.

---

## 8. MÙA LỄ HỘI & SẢN PHẨM TRUYỀN THỐNG (SEASONS & FESTIVAL PRODUCTS)
- **4 Mùa trong năm (Chu kỳ 120 ngày)**:
  - *Tết Nguyên Đán*: Bánh chưng xanh, Liễn câu đối đỏ, Dưa hấu khắc chữ Tài Lộc, Thịt heo tươi, Rau cải xanh.
  - *Mùa mưa Sài Gòn*: Ô gấp che mưa, Áo mưa bộ, Cà phê hòa tan, Trà gừng ấm bụng.
  - *Mùa tựu trường*: Bánh mì, sữa tươi, bánh kẹo, đồ ăn sáng.
  - *Rằm Trung Thu*: Bánh Trung Thu thập cẩm, bánh kẹo phá cỗ đêm trăng.
- **Mục tiêu ngày hội (Festival Goals)**: Thử thách buôn bán các nhóm mặt hàng chủ đạo theo từng mùa lễ hội để nhận thưởng uy tín và tiền mặt.

