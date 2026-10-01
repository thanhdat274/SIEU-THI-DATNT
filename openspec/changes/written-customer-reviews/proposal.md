# Proposal

## Why

Khách chỉ để lại số sao (1 đến 5) và một lý do ngắn trong toast ("Khách đánh giá 5★ · trung bình 4.8★"); không có lời nào để đọc, không có lịch sử và không có chỗ xem vì sao điểm thấp. Game tham khảo `tap-hoa-dau-hem` có màn đánh giá (`reviews.ts`, `ReviewsScene`). Đây là phần còn lại trong hạng mục thứ 6 của `tổng hợp.md`, gắn với các lý do bỏ về đã có (`out_of_stock`, `price`, `wait`, `store_closed`, `unreachable`).

## What Changes

- Mỗi lượt khách (mua xong hoặc bỏ về) sinh thêm một lời đánh giá bằng chữ tiếng Việt, ghép từ mẫu theo ngữ cảnh thật: số sao, lý do bỏ về, món liên quan (món đắt nhất trong giỏ, hoặc món khách định mua), thời gian chờ, tỷ lệ giá so với giá gợi ý, mưa, có bảo vệ trông xe, cuối tuần, khách quen (dùng tên riêng).
- Mẫu nằm trong dữ liệu (`game-data/src/reviews.ts`): câu chính theo sao hoặc theo lý do, cộng tối đa một câu ngữ cảnh có giọng khen hoặc chê khớp với sao.
- Lưu `SaveGameData.reviews` (tối đa 60, mới nhất ở cuối), bỏ mục hỏng khi tải; save cũ không có trường vẫn tải được. Không đổi `schemaVersion`.
- Giao diện: bấm vào điểm "Đánh giá khách" trên HUD mở `ReviewsModal` (điểm trung bình, phân bố sao, lý do bỏ về nhiều nhất, danh sách mới nhất trước, lọc tất cả/khen/chê); toast mỗi lượt đánh giá giờ kèm lời khách.
- Không đổi cách tính sao, danh tiếng, lượng khách hay tiền.

## Capabilities

### New Capabilities

- `written-reviews`: sinh, lưu và hiển thị lời đánh giá bằng chữ của khách.

### Modified Capabilities

- Không có spec chính sửa.

## Non-goals

- Lời đánh giá ảnh hưởng gameplay (chỉ trình bày; danh tiếng vẫn tính từ số sao như cũ).
- Phản hồi lời đánh giá, thưởng khi xử lý lời chê.
- Mô hình ngôn ngữ sinh câu; chỉ ghép mẫu.
- Lịch sử dài hơn 60 lời, xuất lời, lọc theo ngày hoặc theo món.
- Lời đánh giá xuất hiện trong bản tin sáng hoặc tổng kết ngày.

## Impact

`packages/shared/src/index.ts` (`CustomerReview`, `SaveGameData.reviews`), `packages/game-data/src/reviews.ts`, `packages/game-core/src/reviews.ts`, `simulation.ts` (`recordCustomerRating`, lưu/tải, `getReviews`, `getReviewSummary`, callback `onCustomerRated` thêm `review`), `apps/web` (`ReviewsModal.tsx`, `HUD.tsx`, `App.tsx`), test `reviews.test.ts`, `tổng hợp.md`.
