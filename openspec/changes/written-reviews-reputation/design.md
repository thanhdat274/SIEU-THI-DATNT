# Design

## 1. Module thuần `review-reputation.ts`

`reviewReputationContribution(review: CustomerReview): number` — hoàn toàn theo trường có sẵn, không RNG:

```
function reviewReputationContribution(r):
  if r.reason:
    switch r.reason:
      out_of_stock | unreachable => -0.6
      wait | price             => -0.5
      store_closed             => -0.5
  else if r.stars >= 4:  => +0.2     // khen
  else if r.stars <= 2:  => -0.2     // chê sao thấp không rõ lý do (vẫn nhẹ hơn lý do)
  else:                 => 0 (3★)
```

`reviewReputationDrift(reviews, day, windowDays = 7)`: tổng contribution của các lời trong `[day-windowDays+1, day]`, kẹp ngưỡng để không lạm phát (vd ±3/ngày, ±10 tích lũy). Dùng cho bản tin sáng.

`reviewSentimentSummary(reviews)`: count khen (≥4 ★, không reason), count chê (≤2 ★ hoặc có reason), tổng delta, topReason (tái dùng logic `summarizeReviews`).

## 2. Áp trong `simulation.recordCustomerRating`

Chỗ hiện cộng `reputationDeltaFromRating(stars)` (dòng ~687) — giữ nguyên — thêm:
```
const review = composeReviewFromRating(...)         // lượt soạn lời có sẵn
this.playerData.reputation = clamp(0..100, reputation + reputationDeltaFromRating(stars) + reviewReputationContribution(review))
```
Lưu ý: contribution THÊM vào delta theo sao → chê có lý do trừ sâu hơn, khen cộng nhẹ. Không đổi `ratingForVisit`, không đổi reward.

## 3. Bản tin sáng

`day-rhythm.ts` `buildMorningBrief` thêm params `yesterdayReviews?: CustomerReview[]`, thêm field `reputationDelta?: number`:
- nếu `yesterdayReviews` có lời → thêm 1 tip: tổng delta + sentiment (vd "Xóm than tiệm hết hàng: uy tín −1,2" / "Được xóm khen: uy tín +0,6") và set `reputationDelta`.
- không có lời → không thêm, `reputationDelta` undefined.
`daily-routine` khi dựng brief truyền vào reviews `day-1` qua getter mới `getReviewsOnDay(day)` (filter theo `review.day`).

## 4. Màn lời đánh giá

`ReviewsModal` thêm khối "Ảnh hưởng uy tín" dùng `reviewSentimentSummary(reviews)` (reviews = toàn bộ đang giữ của `getReviews()`): tổng delta (kèm dấu), đếm khen/chê, lý do nhiều nhất. Không cần prop mới (từ `reviews` đã có).

## 5. Tương thích save

Không thêm trường save. `SaveGameData.reputation` (0..100) vốn có; `CustomerReview` không đổi. Contribution tính lại từ lời đang giữ nên save cũ tải là chạy tiếp đúng luật. Không đổi schemaVersion.

## 6. Rủi ro / giới hạn

- **Trùng tín hiệu:** cần test rõ chê có lý do trừ *sâu hơn* chê sao thấp không lý do, tránh "phạt đúp" quá mạnh → điều chỉnh hằng số PROVISIONAL nếu playtest thấy uy tín tụt quá nhanh.
- Contribution +,− có thể túc tắc ở mức độ snapshot `recordCustomerRating` — kẹp ngưỡng drift của bản tin để mô tả không phóng đại.
- `yarn test`/`build` chuẩn có thể EPERM sandbox (như mọi giai đoạn) → kiểm qua harness tsc→node.
- Browser QA (mở màn, bản tin sáng) chờ máy thật.
