# Proposal: Mở rộng tiệm chính theo ô, tự chọn hướng (Bước 2 thế giới mở)

## Vì sao

Sau `open-world-land-grid` (Bước 1), tòa nhà đã là dữ liệu "đặt ở lô X" nhưng vẫn mở rộng theo kịch bản: tiệm chính chỉ có hai mảnh `east-wing-a/b` cố định 4×8 ô về phía đông. Chủ dự án muốn: **mỗi lần lên cấp được mở thêm một số ô, hướng nào cũng được, miễn ô đó chưa bị cửa hàng khác chiếm**. Đây là lát cắt dọc đầu tiên chứng minh cơ chế mở rộng tự do, làm cho tiệm chính trước.

## Mục tiêu

- Footprint tiệm chính là **tập ô sàn** (không còn bắt buộc chữ nhật), tường tự dựng theo viền footprint.
- Cấp người chơi mở **ngân sách ô mở rộng** cộng dồn; dùng dần, không ép dùng hết.
- **Chế độ quy hoạch** trên bản đồ: tô các ô hợp lệ, chọn ô, xem trước tường/chi phí miễn phí, xác nhận mới trừ tiền.
- Luật hợp lệ: ô mới kề footprint hiện có (4 hướng), footprint liền một khối, nằm trong lô của tòa, không đè tòa đã mua/lô khác, không lấn vỉa hè/đường, không bịt cửa tiệm hoặc cửa kho, không để nội thất/khách bị kẹt.
- Server kiểm tra và phát lại lệnh; local và co-op cho cùng kết quả.
- Va chạm, đường đi khách/nhân viên, renderer (tường, góc, sàn, ánh sáng) cập nhật theo footprint mới.
- Save cũ đã mua `east-wing-a/b` giữ nguyên diện tích; số ô đó tính vào ngân sách đã dùng (mốc ngân sách trùng mốc cấp của mảnh cũ nên không thiệt, không lợi).

## Ngoài phạm vi

- Mở rộng tiệm xôi, quán nước, quán ăn vặt theo ô (vẫn dùng mảnh `*-north-*` cũ; Bước 3 chuyển sang).
- Dời tòa, đặt tòa vào lô tự chọn (Bước 3); khai hoang, giá đất theo mặt tiền (Bước 4); khóa ô giữa hai người chơi khi cùng quy hoạch (Bước 5).
- Thu hẹp footprint, bán lại ô; thời gian thi công nhiều ngày; hình ảnh mới ngoài các texture tường/góc cần thêm.
- Cân bằng cuối cho giá ô và ngân sách theo cấp (số tạm, ghi provisional).

## Phụ thuộc

`open-world-land-grid` phải xong và golden PASS.

## Tiêu chí hoàn tất

- Mở rộng hình chữ L / chữ T trong lô tiệm chính, lưu/nạp lại và vào co-op đều đúng hình, đúng va chạm.
- Lệnh không hợp lệ (không kề, tách khối, vượt ngân sách, vượt lô, chặn cửa, thiếu tiền) bị từ chối ở core và server với mã lỗi rõ ràng, không trừ tiền.
- Save cũ có/không có `east-wing-a/b` nạp ra cùng diện tích như trước; golden Bước 1 của save chưa mở rộng vẫn PASS.
- `yarn typecheck`, `yarn test`, `yarn build` PASS bằng kết quả thực; Browser QA quy hoạch/xác nhận/khách đi vào phần mới ghi riêng.
