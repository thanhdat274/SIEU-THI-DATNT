# Tasks

## Lõi thuần (PURE)

- [x] 1.1 `game-core/review-reputation.ts` (mới): `reviewReputationContribution(review)` thuần xác định theo rule (reason −0.6/−0.5; khen ≥4★ +0.2; chê ≤2★ −0.2; 3★ = 0); `reviewReputationDrift(reviews, day, windowDays=7)` (tổng + kẹp ngưỡng); `reviewSentimentSummary(reviews)` (khen/chê/tổng delta/topReason).
- [x] 1.2 `review-reputation.test.ts`: contribution từng reason; khen/chê/3 sao; drift cửa sổ + kẹp; sentiment summary; deterministic; save cũ. **PASS qua harness.**

## Nối simulation (logic + save)

- [x] 2.1 `simulation.recordCustomerRating`: giữ `reputationDeltaFromRating` cơ sở; cộng thêm `reviewReputationContribution` từ lời vừa soạn; kẹp 0..100; không đổi `ratingForVisit`/reward.
- [x] 2.2 Test hồi quy: chê có lý do trừ sâu hơn chê sao thấp không lý do; save cũ tải áp đúng luật (không đổi schemaVersion). **PASS.**

## Bản tin sáng + UI

- [x] 3.1 `day-rhythm.buildMorningBrief`: thêm param `yesterdayReviews?` + field `reputationDelta?`; thêm tip uy tín chỉ khi có lời đánh giá.
- [x] 3.2 wire `simulation.getMorningBrief`: `yesterdayReviews: this.reviewsManager.getReviewsOnDay(day - 1)`.
- [x] 3.3 `ReviewsModal`: khối "Ảnh hưởng uy tín" (`ReputationInfluence`) — tổng delta, sentiment, topReason từ `reviewSentimentSummary(reviews)`; export `review-reputation` qua game-core index.
- [x] 3.4 Test day-rhythm hồi quy. **PASS.**

## Kiểm chứng & tài liệu

- [x] 4.1 `yarn typecheck` PASS; harness tsc→node `review-reputation` + hồi quy `reviews`, `day-rhythm` PASS; hồi quy rộng `verify-seasonal-regression` REGRESSION OK + word-of-mouth PASS.
- [x] 4.2 eslint 0 errors (22 warnings pre-existing simulation.ts, không do change này).
- [x] 4.3 Cân bằng (`review-reputation-balance.mjs`): tiệm tốt +3.5 điểm/ngày, tiệm khá −1.6, tiệm chậm −8.8 (40 lượt/ngày) — drift từ từ, tương xứng; giữ hằng số.
- [x] 4.4 Cập nhật `tổng hợp.md`, `TASKS.md`, `ROADMAP.md`; đánh dấu tiến độ tasks.
- [ ] 4.5 **Chờ máy thật:** Browser QA — khối "Ảnh hưởng uy tín" trong ReviewsModal, bản tin sáng, viewport hẹp 568–740 px.
