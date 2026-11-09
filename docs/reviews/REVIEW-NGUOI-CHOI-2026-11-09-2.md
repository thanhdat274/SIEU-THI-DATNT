# Review người chơi — đợt 6 (09/11/2026) — PHẠM VI VỪA (không đủ 20–30 persona)

- Bản: http://localhost:5173/?thu=1 (kho chơi thử riêng, KHÔNG đụng save thật), commit 31aa21e9 + 2 sửa nhỏ chưa commit lúc review. Thiết bị: pane trong app (khung mặc định + giả lập 375×812, 812×375).
- Cách làm: 1 người chơi mới (ngày 1, 360.000đ) đi từ màn đăng nhập → HUD → hội thoại Bà Năm. **Chưa chơi:** vòng bán hàng/ngủ, 1920×1080, 1366×768, xoay màn hình giữa chừng, F5 giữa ngày, co-op `?dev=a/b`, persona "phá game"/"người lớn tuổi". Đây KHÔNG phải đợt đủ persona; ghi rõ để khỏi hiểu nhầm.

## Quan sát trực tiếp
- R1 (P2, ĐÃ SỬA): màn đăng nhập ghi "Mở cửa 6h – 22h" trong khi tạp hóa mở 8h–22h30 → nay lấy từ `SHOP_HOURS`.
- R2 (P2, ĐÃ SỬA): 06:00 ngày 1 HUD nói "Đang giờ vàng — sẵn sàng đón khách!" lúc tiệm còn đóng → nay hiện "Chưa tới giờ mở cửa (8h) — châm kệ trước cao điểm sáng".
- R3 (P3): dọc 375×812, toast "Ngày 1 · chúc buôn may bán đắt!" đè lên hộp thoại Bà Năm, che chữ. Ngang 812×375, hộp thoại chiếm ~nửa màn nhưng đọc được, thanh nút dưới vừa khít.
- R4 (P3, suy luận): cao điểm sáng đặt 6h–9h nhưng tiệm mở 8h nên thực tế chỉ còn 1 giờ cao điểm (8–9h). Đúng yêu cầu người dùng nhưng khung này gần như mất ý nghĩa; cân nhắc cao điểm 8h–10h nếu muốn khách đông thật.
- Console: lỗi đỏ duy nhất là `shopHoursLabel is not defined` do HMR bắt file lúc sửa dở (trước khi thêm import); tải lại thì hết.

## Bổ sung (đi sâu hơn, cùng kho ?thu=1)
- Đã chơi: mở Nhập hàng → +1 thùng ×3 → Nhập ngay (360k → 63.8k) → đóng bảng. F5 giữa buổi sáng: tiền 63.800đ giữ nguyên, giờ lùi 4 phút (07:23→07:19, do lưu định kỳ) — chấp nhận được.
- R5 (P2, quan sát): bảng "Đang mở…" mất ~4s trong pane dev, và UI phản hồi bấm chậm hàng chục giây (đồng hồ game chạy 06:00→07:05 trong lúc thao tác). Người mới mất gần 2 giờ chuẩn bị trước giờ mở 8h. Cần xác minh trên máy thật/bản build; nếu thật, cân nhắc tạm dừng đồng hồ khi mở bảng Nhập hàng trong ngày đầu.
- R6 (P3): dòng dự báo trên HUD bị cắt "…" ở khung 800×600 ("châm kệ trước c…").
- Vẫn chưa: ra tiệm bán hàng, ngủ, 1920×1080/1366×768, co-op a/b.

## Chưa xác minh (kế thừa)
- Cảnh đen + tiền âm ngày 3 (đợt 5 R1), FPS máy thật, WebGL warn loop.

## Đề xuất
1. Làm đợt review đầy đủ thật sự (≥8 persona, đủ cỡ màn, co-op).
2. Xếp hàng toast chồng hộp thoại ở màn dọc (R3).
3. Quyết khung cao điểm sáng (R4).

## Xử lý (GĐ sau review)
- R3 ĐÃ SỬA: ngày 1 không còn toast "chúc buôn may" đè hộp thoại Bà Năm (từ ngày 2 vẫn hiện).
- R6 ĐÃ SỬA: dòng dự báo trước giờ mở rút còn "Chưa mở cửa (8h) — châm kệ trước".
- R5 KHÔNG ĐỔI: bảng Nhập hàng cố ý không dừng giờ (có test `effectiveSpeed` khóa); độ trễ nhiều khả năng do pane dev. Cần đo trên bản build/máy thật.
- R4 KHÔNG ĐỔI: cao điểm 6h–9h là quyết định của người dùng; dời sang 8h–10h cần re-baseline và chờ người dùng chốt.
