# Báo cáo Review Người chơi — Đợt 7 (13/11/2026)
**Cam kết:** Đánh giá độc lập, trung thực, khó tính theo `PROMPT-REVIEW-NGUOI-CHOI-KHO-TINH.md` và 10 Luật Cứng trong `promt_game.md`. Không tự ý sửa code, không tự thêm góp ý vào backlog/`PROGRESS.md`.

---

## 1. THÔNG TIN PHIÊN REVIEW
- **Ngày review:** 13/11/2026
- **Commit git:** `55bd8443` (*GD2390: noi demand cho 3 mon chuoi san xuat - chieu che com/banh da nem chua, toi ga nuong mac khen; xac nhan bien an toan wants id >=70*)
- **Môi trường & URL:** `http://localhost:5173/?thu=1` (Kho chơi thử độc lập, tuyệt đối không đụng save thật của người dùng).
- **Trạng thái kết thúc phiên chơi:** Ngày 6 (Thứ 7) · Giờ: 10:51 · Tiền: 560.718đ · Cấp độ: Cấp 3 (11% XP) · Kho: 23 ô trống.
- **Kích thước kiểm tra:**
  - Desktop chuẩn: 1920×1080 & 1280×800.
  - Laptop nhỏ: 1366×768.
  - Điện thoại dọc: 375×812.
  - Điện thoại ngang: 812×375.
- **Kiểm thử đa luồng (Multi-agent Swarm):**
  - **Subagent 1 (Playtest Tester - Browser live automation):** Trực tiếp tương tác giao diện 3D/2D, trải nghiệm vòng lặp cốt lõi từ Ngày 1 đến Ngày 6, test responsive, test console log, reload F5 và stress-test persona "Người phá game".
  - **Subagent 2 (Persona Regression Auditor):** Kiểm tra hồi quy từ Đợt 1 đến Đợt 6, audit 30 archetype persona, kiểm tra hệ thống ngôn ngữ/thuật ngữ tiếng Việt theo persona "Người Việt lớn tuổi", và phân tích chuỗi sản xuất mới nhất (GĐ2370 - GĐ2390) đối chiếu 10 Luật Cứng.
- **Co-op (Chế độ 2 người):** Ghi nhận trạng thái: Đợt này tập trung playtest sâu vào chế độ chơi đơn nhánh mới, test parity dữ liệu công thức tĩnh `recipes.ts` và kiểm tra hồi quy popup xác nhận rời hẻm (đã mount ở App root). Phiên co-op 2 tab live qua mạng nội bộ được đánh dấu là *kế thừa xác nhận đợt 4/6, không phát sinh thay đổi code mạng ở GĐ2390*.

---

## 2. BẢNG TỔNG HỢP GÓP Ý ĐỢT 7

| Mã | Tiêu đề | Phân loại | Ưu tiên | Độ tin cậy | Nhóm bị ảnh hưởng | Khuyến nghị |
|---|---|---|---|---|---|---|
| **R1** | Banner thông báo tính năng mới bị tràn mép trên màn hình mobile ngang (812×375) | Bất tiện UX | P2 | Cao (Quan sát trực tiếp) | Người chơi mobile xoay ngang | **Đưa vào backlog** |
| **R2** | Thời gian fade-out của modal đăng nhập khi chọn "Chơi tiếp trong máy" | Bất tiện nhỏ | P3 | Vừa (Quan sát trực tiếp) | Người chơi muốn vào game nhanh | **Cần xác minh thêm trên máy thật** |
| **R3** | Kiểm tra hồi quy: Xếp hàng thông báo & popup ngày đầu | Kiểm tra hồi quy | P1 | Cao (Xác nhận ĐÃ SỬA) | Người chơi mới | **Giữ nguyên trạng thái tốt** |
| **R4** | Persona Người Việt lớn tuổi: Đánh giá độ tự nhiên của ngôn ngữ & tên món | Ngôn ngữ / Văn hóa | P2 | Cao (Audit chi tiết) | Người lớn tuổi, chuộng văn hóa Việt | **Phát huy, không đổi** |
| **R5** | Persona Hardcore Kinh tế: Audit biên an toàn chuỗi sản xuất GĐ2370–2390 | Cân bằng kinh tế | P1 | Cao (Audit test suite) | Người chơi mid/late game | **Giữ nguyên quy tắc trần** |

---

## 3. CHI TIẾT CÁC PHÁT HIỆN & ĐỐI CHIẾU

### R1 — Banner thông báo tính năng mới bị tràn mép trên mobile ngang (812×375)
- **Loại / ưu tiên / độ tin cậy:** Bất tiện giao diện / P2 / Độ tin cậy cao.
- **Persona và bối cảnh:** Người chơi trên điện thoại xoay ngang (812×375), màn hình có chiều cao thấp (375px) nhưng chiều ngang hẹp viền. Xuất hiện khi vừa lên Cấp 3 và mở khóa tính năng Bảng giá.
- **Quan sát trực tiếp:** Banner xanh lá thông báo *"Mới mở: 💲 Bảng giá — Tự điều chỉnh giá bán theo ý bạn"* trôi từ mép trên xuống. Do chiều rộng banner chưa giới hạn padding an toàn theo viewport ngang hẹp, nút `[Thử ngay]` và nút đóng `[✕]` bị cấn sát và lẹm nhẹ vào mép phải màn hình.
- **Bước tái hiện:** 
  1. Giả lập viewport 812×375.
  2. Bán hàng và nhận thưởng để đạt Cấp 3.
  3. Banner xanh lá xuất hiện ở cạnh trên màn hình.
- **Tác động tới trải nghiệm:** Người chơi chạm ngón tay vào nút `[✕]` dễ bị trượt hoặc bấm nhầm ra ngoài.
- **Đề xuất thay đổi:** Trong CSS của banner nổi (hoặc component thông báo), đặt `max-width: min(92vw, 640px)` và căn giữa `margin: 0 auto; left: 0; right: 0;` kèm `box-sizing: border-box; padding-right: 12px;`.
- **Đối chiếu luật cứng & ngân sách chống phình:** Tuân thủ Luật 6 (UI/UX đạt chuẩn) và Luật 8 (hiển thị mượt trên thiết bị di động). Không làm phình CSS hay thêm thư viện.
- **Khuyến nghị:** Đưa vào backlog xử lý trong đợt tinh chỉnh UI tiếp theo.

---

### R2 — Hiệu ứng chuyển cảnh khi vào game từ modal đăng nhập
- **Loại / ưu tiên / độ tin cậy:** Cảm giác mượt mà (Polish) / P3 / Độ tin cậy vừa.
- **Persona và bối cảnh:** Người chơi casual mở game giờ nghỉ trưa, muốn vào bấm bán ngay.
- **Quan sát trực tiếp:** Sau khi click `Chơi tiếp trong máy (ngày 6)`, modal bắt đầu mờ dần nhưng giữ overlay tối màu khoảng ~300-400ms trước khi lộ hoàn toàn khung cảnh 3D.
- **Suy luận:** Có thể do transition CSS đang để thời gian trễ kèm việc khởi tạo Three.js scene trong nền.
- **Đề xuất thay đổi:** Rút ngắn thời gian fade-out của dialog xuống 150ms hoặc bật pointer-events none ngay lập tức khi click để người chơi cảm nhận tiệm mở ra tức thì.
- **Khuyến nghị:** Cần xác minh thêm trên thiết bị điện thoại thật xem có phải do độ trễ GPU khởi tạo Three.js hay không trước khi đổi code.

---

### R3 — Kiểm tra hồi quy: Các vấn đề từ Đợt 1 đến Đợt 6 đã được vá triệt để
- **Loại / ưu tiên / độ tin cậy:** Kiểm tra hồi quy / P1 / Độ tin cậy cao.
- **Quan sát trực tiếp & Xác nhận:**
  1. *Đ6-R1:* Giờ mở cửa ở màn đăng nhập hiển thị chính xác `8h – 22h30` lấy từ `SHOP_HOURS`.
  2. *Đ6-R2 & Đ6-R6:* Dòng thông báo trước 8:00 sáng hiển thị gọn gàng: *"Chưa mở cửa (8h) — châm kệ trước"*, không bị cắt chữ "..." trên mobile.
  3. *Đ6-R3:* Toast ngày 1 không còn chồng đè lên hộp thoại Bà Năm.
  4. *Đ1-R1 / Đ4-R1:* Vốn khởi đầu 360k + gợi ý combo 3 món mì/nước/bánh (316.2k) giúp người mới ngày đầu an toàn 100%, không bao giờ âm tiền.
  5. *Đ4-R3:* Reset game từ đầu dọn sạch rác sàn bẩn.
  6. *Đ4-R6 / Đ4-R7:* Popup xác nhận rời hẻm co-op mount ở App root, không bị kẹt khi đổi scene.
- **Kết luận:** Không phát hiện bất kỳ lỗi hồi quy nghiêm trọng nào trong đợt này.

---

### R4 — Persona "Người Việt lớn tuổi": Đánh giá ngôn ngữ, văn hóa & thuật ngữ
- **Loại / ưu tiên / độ tin cậy:** Trải nghiệm cảm xúc & văn hóa / P2 / Độ tin cậy cao.
- **Quan sát trực tiếp:**
  - Tên các món ăn và nguyên liệu cực kỳ thuần Việt, mộc mạc và chân thực: *Chè cốm Làng Vòng, Bánh đa nem chua, Gà nướng mắc khén, Cá lóc nấu măng chua, Thịt đông, Thịt luộc tôm chua củ kiệu, Xôi xéo, Bánh trôi tàu, Bánh tiêu, Phở cuốn*.
  - Cách xưng hô thân mật: *Bà Năm bán xôi, Bà Tám, Chú Ba, Bé Na*.
  - Thuật ngữ buôn bán chuẩn đời sống: *Châm kệ, Ghi sổ, Điền theo gợi ý, Giờ cao điểm, Khách chê đắt, Chuyển khoản, Tiền mặt*.
  - Chi tiết tinh tế: Ở GĐ2374, game đã chuẩn hóa nhân Bánh trôi tàu dùng mè rang trắng (`hx_me_rang`), không dùng mè đen (`hx_me_den` chỉ dùng cho chè mè đen) — đúng chuẩn vị cổ truyền Hà Nội.
- **Kết luận:** Giữ chân người chơi lớn tuổi và người yêu văn hóa Việt Nam cực tốt. Không có tình trạng dịch thuật máy móc.

---

### R5 — Persona "Hardcore Kinh Tế": Audit biên an toàn & cân bằng chuỗi sản xuất
- **Loại / ưu tiên / độ tin cậy:** Cân bằng kinh tế / P1 / Độ tin cậy cao.
- **Quan sát & Phân tích:**
  - Toàn bộ 27/27 nông sản vườn và nguyên liệu bà con (`hx_*`, `rg_*`) đều đã có lối ra ở các trạm bếp (nồi nước, chảo chiên, bếp nướng).
  - Tuân thủ tuyệt đối **Luật monKhuon**: Lãi từ món nấu thành phẩm luôn cao hơn giá bán thô nguyên liệu (ví dụ: Cao lầu lãi 105.5k vs bán thô 59.5k; Bánh đa nem chua lãi 73k vs bán thô 143k tổng).
  - Biên an toàn wants (GĐ2390): Việc đặt mốc mở khóa Chè cốm, Bánh đa nem chua, Gà nướng mắc khén ở cấp 70-71 nằm ngoài cả 2 cửa sổ cân bằng `crisisBalance` (L45) và `stanceBalance` (L65), đảm bảo không làm lung lay kinh tế nền tảng.
- **Kết luận:** Kinh tế có chiều sâu vững chắc, kích thích người chơi cày cuốc mở khóa lâu dài.

---

### R6 — Persona "Người phá game": Kết quả Stress Test
- **Loại / ưu tiên / độ tin cậy:** Ổn định kỹ thuật / P1 / Độ tin cậy cao.
- **Thử nghiệm trực tiếp:**
  - Bấm đổi liên tục giữa các tốc độ thời gian (1×, 3×, 8×, Pause): Engine game và bộ đếm thời gian phản hồi tức thì, không giật lag, không lỗi console.
  - Bấm mở/đóng liên tiếp các cửa sổ modal (Nhập hàng, Nhiệm vụ, Giá bán, Sổ sách): Giao diện đóng mở dứt khoát, không kẹt backdrop hay z-index đè lên 3D canvas.
  - Mua hàng cạn kiệt tiền: Nút bấm tự động disabled và hiển thị chính xác số tiền còn thiếu.
  - Tải lại trang (F5) giữa ngày 6: Lưu trữ cục bộ (Local Save) phục hồi 100% dữ liệu (Ngày 6 10:51, 560.718đ, Cấp 3 11% XP, kho hàng 23 ô trống).

---

## 4. MỤC "ĐỪNG PHÁ" (GIỮ NGUYÊN CHO CÁC PHIÊN SAU)
1. **Không khí và cái hồn hẻm Việt Nam:** Sự xuất hiện của Bà Năm bán xôi, Bé Na, tiếng rao, thói quen thanh toán (91% tiền mặt, 9% chuyển khoản), thời tiết nhiều mây, áp lực tiền nhà và ca đêm.
2. **Hệ thống định giá theo độ nhạy cảm của khách hàng:** Cơ chế Cụ già nhạy giá (1.5 chê đắt nếu tăng giá mì gói), Học sinh thích ăn vặt, Dân văn phòng chuộng nước ngọt... mang lại chiều sâu mô phỏng kinh doanh chân thật.
3. **Biên an toàn mở khóa chuỗi sản xuất (Cấp ≥ 70):** Giữ nguyên phân tầng các công thức nấu nướng phức tạp ở late game để bảo vệ 2 mốc cân bằng L45 và L65.
4. **Quy tắc Bảng nhập hàng không dừng giờ (Đ6-R5) và Giờ cao điểm sáng 6h–9h (Đ6-R4):** Đã chốt theo yêu cầu người dùng, giữ vững tính thử thách quản lý thời gian.

---

## 5. KẾT LUẬN & ĐỀ XUẤT HÀNH ĐỘNG
- **3 vấn đề đáng xem xét:**
  1. Xử lý nhẹ padding / `max-width` của banner thông báo xanh lá để không bị tràn mép trên mobile ngang (R1).
  2. Đo đạc độ trễ chuyển cảnh của modal đăng nhập trên điện thoại thật (R2).
  3. Tiếp tục duy trì kỷ luật trần thông báo/banner đồng thời để tránh xếp chồng khi có nhiều sự kiện mùa lễ hội.
- **Câu hỏi cần playtest với người thật:**
  - Trải nghiệm vuốt chạm joystick ảo trên màn hình điện thoại có tai thỏ / thanh điều hướng hệ thống.
  - Cảm giác về giá bán bánh tiêu 10k/cái và bánh đa nem chua đối với người chơi ở các vùng miền khác nhau.
- **Giới hạn của đợt review:** Đợt này thực hiện qua trình duyệt giả lập tích hợp; chưa đo nhiệt độ/tiêu hao pin trên thiết bị phần cứng thật. Chế độ co-op kiểm tra qua kiến trúc đồng bộ và kiểm tra hồi quy code mạng, chưa chạy đồng thời 2 người chơi thật cùng lúc trên 2 máy vật lý khác nhau.

*Báo cáo được tạo tự động bởi Hội đồng Review Người chơi Khó tính (Antigravity Multi-Agent Panel).*
