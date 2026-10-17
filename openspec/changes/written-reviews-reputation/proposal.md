# Proposal

## Why

Change `written-customer-reviews` đã hoàn thiện việc *soạn + lưu + hiển thị* lời đánh giá bằng chữ (`reviews.ts`, `ReviewsModal`, toast), nhưng theo đúng non-goal ban đầu: **lời đánh giá chỉ trình bày, danh tiếng vẫn tính từ số sao như cũ** (`reputationDeltaFromRating` trong `recordCustomerRating`). Nghĩa là lời chữ — nhất là *lý do* (hết hàng, giá cao, đợi lâu) — không hề ảnh hưởng uy tín dù là tín hiệu rõ nhất về chất lượng phục vụ. Mục này "hoàn thành" đúng phần còn thiếu: **đánh giá bằng chữ ảnh hưởng uy tín** (đảo non-goal cũ), kèm đưa tác động vào bản tin sáng (item 4.5 còn hoãn) và chỉ báo trên màn lời đánh giá.

## What Changes

- **`reviewReputationContribution(review)`** (thuần, xác định — chơi lẻ = chơi chung): delta uy tín nhỏ từ *nội dung lời đánh giá vượt ngoài số sao*, không trùng với `reputationDeltaFromRating` đang dùng ở mức sao:
  - lý do `out_of_stock`/`unreachable` → −0,6; `wait`/`price` → −0,5; `store_closed` → −0,5;
  - đánh giá 4–5 sao (khen) → +0,2; sao 3 → 0.
- Áp tại `simulation.recordCustomerRating` (chỗ đã cộng `reputationDeltaFromRating`): cộng thêm `reviewReputationContribution` từ lời vừa soạn → lời chữ (lý do) thật sự làm uy tín 0..100 thay đổi. Không đổi luật tính sao, không đổi schema (`SaveGameData.reputation` và `reviews` đã có).
- **Bản tin sáng:** `buildMorningBrief` thêm dòng `reputationDrift` — tóm tắt tác động uy tín của lời đánh giá hôm qua (ví dụ "Xóm than tiệm hết hàng: uy tín −1,2 điểm hôm nay") + trường `reputationDelta`; wire từ `daily-routine`.
- **Màn lời đánh giá:** `ReviewsModal` thêm khối "Ảnh hưởng uy tín" — sentiment lời gần đây, tổng delta, lý do nhiều nhất (tái dùng `summarizeReviews`).
- Không thay đổi cách tính sao, phần thưởng, hay `reputationDeltaFromRating` cơ sở.

## Capabilities

### New Capabilities

- `review-reputation`: lời đánh giá bằng chữ đóng góp vào uy tín (theo lý do/khen), tác động vào bản tin sáng và màn đánh giá.

### Modified Capabilities

- `written-reviews` (change trước, delta mở rộng): thêm tác động uy tín + bản tin sáng + indicator.

## Non-goals

- Không đổi công thức sao (`ratingForVisit`) hay delta cơ sở theo sao.
- Không phân tích ngữ nghĩa câu văn (ML); chỉ rule theo các trường có sẵn (`reason`, `stars`, `product`, `guard`).
- Không theo dõi uy tín riêng theo từng khách quen.
- Không thêm lời vào server/co-op ngoài cơ chế seed deterministic hiện có (logic thuần chạy chung 2 phía).

## Impact

`packages/shared` (không đổi schema; tùy chọn type `MorningBrief`), `packages/game-core/src/review-reputation.ts` (mới), `reviews.ts`, `simulation.ts` (`recordCustomerRating`), `day-rhythm.ts` (`buildMorningBrief`), `daily-routine.ts` (wire), `apps/web` (`ReviewsModal.tsx`, `HUD` nếu cần), test `review-reputation.test.ts` + `reviews.test.ts` (hồi quy), `tổng hợp.md`, `TASKS.md`, `ROADMAP.md`.
