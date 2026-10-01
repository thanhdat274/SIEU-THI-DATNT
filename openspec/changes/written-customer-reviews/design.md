# Design

## 1. Mô hình

`CustomerReview { id, day, hour, minute, stars, author, text, reason?, productId?, regularId? }`. `id = "rev-<ngày>-<thứ tự đánh giá trong ngày>"` nên xác định và không trùng trong một ngày (thứ tự lấy từ `DailyRecord.ratingCount`). Lưu ở `SaveGameData.reviews`, giữ tối đa `REVIEW_HISTORY_CAP` = 60 lời mới nhất.

## 2. Soạn lời

`composeReview(ctx)` (hàm thuần): RNG `Mulberry32Rng(daySeed(day, hash("review:<thứ tự>:<sao>:<lý do>")))`.

1. Câu chính: nếu có lý do bỏ về thì chọn trong `REVIEW_BY_REASON[reason]`, ngược lại chọn trong `REVIEW_BY_STARS[sao]`. `{product}` thay bằng tên món (mặc định "món cần mua"), `{wait}` bằng số giây chờ làm tròn (tối thiểu 10).
2. Câu ngữ cảnh (tối đa một, xác suất 0,7 khi có câu phù hợp): tập điều kiện đúng gồm mưa > 0,25, bảo vệ trông xe giúp, có tên món (chỉ giọng khen), giá thấp hơn 0,97 lần giá gợi ý, giá cao hơn 1,1 lần, cuối tuần, khách quen. Mỗi câu có `tone` (khen hoặc chê): sao ≥ 4 không có lý do thì chỉ lấy câu khen; sao ≤ 2 hoặc có lý do thì chỉ lấy câu chê; 3 sao không có câu ngữ cảnh. Lý do giá thì bỏ câu "Giá nhỉnh hơn" để không lặp.
3. Tác giả: tên khách quen nếu có, ngược lại chọn trong 12 tên vãng lai.

Số sao của lời đánh giá luôn bằng số sao đã ghi vào điểm (kể cả cộng 1 sao do bảo vệ), vì lời được soạn ngay trong `recordCustomerRating` sau khi tính sao.

## 3. Tích hợp

`GameSimulation.recordCustomerRating` thêm bước soạn lời sau khi cập nhật điểm: món liên quan là món có tiền lớn nhất trong giỏ, hoặc nếu khách bỏ về thì `reservedProductId` rồi đến món đầu giỏ rồi món của kệ khách nhắm tới. Lời được thêm vào `this.reviews` và gửi qua callback `onCustomerRated({ ..., review })`. `exportSaveData`/`importSaveData`/constructor đọc ghi `reviews` qua `sanitizeReviews` (bỏ mục thiếu trường, sao ngoài 1..5, chữ rỗng hoặc dài hơn 400 ký tự). `getReviews()` và `getReviewSummary()` (đếm theo sao, trung bình, lý do bỏ về nhiều nhất) cho giao diện.

## 4. Giao diện

`ReviewsModal`: khối tóm tắt (trung bình, thanh phân bố 5 đến 1 sao, lý do bỏ về nhiều nhất), nút lọc (tất cả, khen 4 đến 5 sao không bỏ về, chê 1 đến 2 sao hoặc bỏ về), danh sách mới nhất trước với tên (♥ cho khách quen), sao, lời trong ngoặc kép, ngày giờ, lý do và tên món. HUD: khối "Đánh giá khách" thành nút khi có `onOpenReviews`. Toast hiện "Tên: “lời” N★ · lý do · trung bình".

## 5. Rủi ro

- Ở màn hình hẹp CSS HUD hiện có ẩn khối "Đánh giá khách" (thấy ở rộng 1700, không thấy ở 1280 và 800 trong lúc kiểm), nên trên máy nhỏ chưa có đường vào màn này; cần thêm lối vào khác.
- Mẫu câu là nội dung viết tay, ít (khoảng 30 câu chính và 9 câu ngữ cảnh): sau vài chục lượt người chơi sẽ thấy lặp lại.
- Tên món trong câu chưa chia từ loại (ví dụ "Kệ Nước suối trống trơn" đọc được nhưng không phải lúc nào cũng tự nhiên).
- Toast dài hơn trước (kèm lời khách), có thể che các toast khác khi đông khách.
- Chưa mở màn trong trình duyệt khi có lời đánh giá.
