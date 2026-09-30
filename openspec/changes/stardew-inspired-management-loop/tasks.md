# Tasks

Tất cả task ở trạng thái **kế hoạch, chưa triển khai** (30/09/2026). Mỗi nhóm kết thúc bằng gate kiểm chứng; không đánh dấu `[x]` khi chưa chạy `yarn typecheck`, `yarn test`, `yarn build` và có bằng chứng cho phần UI. Số cân bằng là đề xuất chờ duyệt.

## 1. Đợt A — Nền (P0)

- [ ] 1.1 `game-data/pricing.ts`: cấu hình dải giá/bước/sàn keep/trần hút khách; `game-core/pricing.ts` thuần (`clampPrice`, `keepChance`, `cheapTrafficBonus`, `margin`) + test biên.
- [ ] 1.2 Shared: `SaveGameData.prices?`, `GameCommand set_price`, validator (`shared/index.ts`); handler trong `commands.ts` trả giá thực; test kẹp/reset/từ chối khi đang thanh toán.
- [ ] 1.3 `customers.ts`: dùng giá chốt khi lấy hàng và `keepChance` khi chọn hàng; test giỏ giữ giá, ledger `sale`/cogs khớp.
- [ ] 1.4 `ShelfModal`: ô giá, chip giá gợi ý, biên lãi, nút về giá gợi ý; kiểm ở 1366×768 và 844×390.
- [ ] 1.5 `game-core/reputation.ts` (`ratingForVisit`, `recordRating`, `averageRating`, `reputationTrafficMultiplier`); shared `player.ratings?`; migration `reputation` cũ; test cửa sổ/rỗng/sàn 0,8.
- [ ] 1.6 Gọi rating tại điểm thanh toán và bỏ đi trong `simulation.ts` (thay chỗ chỉ trừ uy tín); áp hệ số lượng khách; HUD ★ + toast lý do.
- [ ] 1.7 `day-rhythm`: mở rộng `DailyRecord` tùy chọn (khách, ★, highlights); `buildDaySummary`/`buildMorningBrief` thuần + test đối chiếu ledger; `DaySummaryModal` tự mở khi đóng ngày, khối bản tin sáng trên HUD.
- [ ] 1.8 Tích hợp: mở rộng `integration.test.ts` vòng 3 ngày có đổi giá; `persistence.test.ts` cho save cũ; `yarn typecheck && yarn test && yarn build`.
- [ ] 1.9 **Gate A:** playtest thủ công đặt giá thấp/cao vài ngày, tổng kết khớp sổ; ghi kết quả vào `tổng hợp.md`. Chưa đạt thì không sang đợt B.

## 2. Đợt B — Con người và biến thiên (P1)

- [ ] 2.1 `game-data/regulars.ts` (6–8 người, ánh xạ nhóm hàng đích từ `customers.json` của nguồn), duyệt nội dung/tên trước khi code.
- [ ] 2.2 `game-core/regulars.ts`: chọn ghé theo seed, trần tỉ lệ, cộng thân thiết + trần ngày, perk mở một lần; shared `regulars?`; test xác định/trần/migration.
- [ ] 2.3 `customers.ts`: khách quen dùng sở thích/nhạy giá; nhãn tên trong renderer; `RegularsModal`.
- [ ] 2.4 (Phần thời tiết + hệ số nhu cầu được thực hiện trong change `dynamic-economy-simulation` nhóm 1–2; `weather.ts` đã có, chỉ còn bản tin sáng và đơn tiệc ở đây.) `game-data/weather.ts` + `game-core/weather.ts` (`weatherFor`, `demandModifier` kẹp hệ số); shared `weather?`; dự báo trong bản tin sáng; test dự báo = thực tế.
- [ ] 2.5 Gợi ý nhập (`suggestions.ts`) cộng hệ số thời tiết/mùa; test không vượt giới hạn tươi sống hiện có.
- [ ] 2.6 `game-data/partyOrders.ts` (ánh xạ ID từ nguồn) + `game-core` đơn tiệc (`respond`, `fulfill` FEFO + ledger); lệnh idempotent; bảng đơn trong `QuestModal`.
- [ ] 2.7 Mở rộng `seasons.ts` có mục tiêu ngày hội; test không phá `seasons.test.ts`.
- [ ] 2.8 **Gate B:** test seed/replay/không cày; playtest 10 ngày qua ít nhất một mùa; cập nhật tài liệu.

## 3. Đợt C — Mục tiêu dài hạn (P2)

- [ ] 3.1 `game-data/goals.ts` 3 nhóm đầu; `game-core/goals.ts` `goalProgress` thuần, `claim_goal` chống nhận đôi, thưởng nhóm qua mở khóa/plot sẵn có; shared `goals?`.
- [ ] 3.2 Nhiệm vụ tuần (`weeklyQuests` kiểu nguồn) dùng engine tiến độ chung; `QuestModal` thêm tab Sổ ước nguyện/Tuần + badge chưa nhận.
- [ ] 3.3 `game-data/skills.ts`, `game-core/skills.ts` (`addSkillXp`, `choose_perk`, `getSkillModifier`); gọi tại handler sẵn có; test replay không cộng đôi; `SkillsModal`.
- [ ] 3.4 Cân bằng: mô phỏng nhiều ngày (mở rộng `runner`) kiểm không có đặc quyền phá lãi/ledger.
- [ ] 3.5 **Gate C:** test nhận thưởng một lần, save/reload, hai phiên multiplayer replay cùng state (nếu có môi trường).

## 4. Đợt D — Hoàn thiện (P3)

- [ ] 4.1 Danh hiệu theo cột mốc (`titles`), hiển thị tiêu đề/HUD.
- [ ] 4.2 Cân bằng cuối, dọn thông báo, bổ sung mục "Cách chơi" cho các hệ mới.
- [ ] 4.3 Cập nhật `tổng hợp.md`, `TASKS.md`, `ROADMAP.md`, `GAME_DESIGN.md`; ghi rõ phần đã kiểm chứng và phần còn thiếu (thiết bị thật, hiệu năng).

## Ngoài phạm vi (không làm trong change này)

Năng lượng người chơi, làm nông/mỏ/chiến đấu/câu cá, hôn nhân/quà tặng tự do, đánh giá chữ, prestige reset, nâng cấp dụng cụ có thời gian chờ, trang trí hút khách (thuộc `store-layout-expansion`), offline income, chi nhánh, thay engine hoặc dependency mới.
