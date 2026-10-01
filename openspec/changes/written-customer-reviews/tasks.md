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
- [ ] 4.3 Lối vào cho màn hình hẹp (khối "Đánh giá khách" bị CSS hiện có ẩn ở rộng 1280 trở xuống).
- [ ] 4.4 Thêm mẫu câu (hiện khoảng 30 câu chính và 9 câu ngữ cảnh), kiểm cách đọc tên món trong câu.
- [ ] 4.5 Quyết định sau: lời đánh giá trong bản tin sáng/tổng kết ngày, phản hồi lời chê, lọc theo món.
- [ ] 4.6 Cập nhật `TASKS.md`/`ROADMAP.md` khi chốt nghiệm thu.
