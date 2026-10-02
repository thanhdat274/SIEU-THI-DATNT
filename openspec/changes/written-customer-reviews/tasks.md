# Tasks

Trạng thái 01/10/2026: nhóm 1–3 đã có code và test tự động (`reviews.test.ts`, `tsc -b`, `yarn test` 7 suite 0 fail, `yarn build` PASS); nhóm 4 chưa kiểm được bằng mắt.

## 1. Dữ liệu và logic

- [x] 1.1 `CustomerReview`, `SaveGameData.reviews` (`shared`).
- [x] 1.2 Mẫu câu và `REVIEW_HISTORY_CAP` (`game-data/src/reviews.ts`).
- [x] 1.3 `composeReview`, `appendReview`, `sanitizeReviews`, `summarizeReviews` (`game-core/src/reviews.ts`).

## 2. Mô phỏng

- [x] 2.1 `recordCustomerRating` soạn và lưu lời đánh giá, callback `onCustomerRated` thêm `review`.
- [x] 2.2 Lưu/tải, `getReviews()`, `getReviewSummary()`, save cũ tải được.
- [x] 2.3 Test: xác định, đủ trường, không còn `{…}`, câu chính theo lý do, giọng khớp sao, chỉ nhắc điều đúng thực tế, đa dạng, giới hạn 60 và bỏ mục hỏng, tóm tắt, tích hợp thanh toán/bỏ về/lưu tải/save cũ. Test bắt được lỗi thật: ban đầu 1 đến 2 sao chỉ có 2 câu nên đã thêm câu.

## 3. Giao diện

- [x] 3.1 `ReviewsModal`, khối "Đánh giá khách" trên HUD thành nút, toast kèm lời khách.

## 4. Kiểm chứng và còn lại

- [x] 4.1 `tsc -b`, `yarn test`, `yarn build` PASS (01/10/2026, Node 24 qua PATH).
- [ ] 4.2 Browser QA: mở màn, thấy lời đánh giá thật, lọc, toast. Chưa làm được: ở rộng 1700 thấy nút trên HUD (đã tìm thấy bằng truy vấn trình duyệt) nhưng trang liên tục tải lại về màn tiêu đề do một phiên khác đang sửa file nên chưa tạo được lượt khách để xem.
- [x] 4.3 Lối vào cho màn hình hẹp: đo 02/10/2026, ô "Đánh giá khách" hiện và bấm được ở 760–900 px, bị đè ở ≤ 700 px; đã sửa `index.css` (≤ 860 px ẩn cấp/số khách, ≤ 720 px nút Mở cửa chỉ còn biểu tượng); kiểm lại 667/760 px bấm được, màn Đánh giá vừa khít ở 812×375.
- [x] 4.4 Thêm mẫu câu (02/10/2026: mở rộng từ ~38 lên ~80 câu chính + ~20 câu ngữ cảnh để tránh lặp).
- [ ] 4.5 Quyết định sau: lời đánh giá trong bản tin sáng/tổng kết ngày, phản hồi lời chê, lọc theo món.
- [ ] 4.6 Cập nhật `TASKS.md`/`ROADMAP.md` khi chốt nghiệm thu.
