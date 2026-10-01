# Tasks

Trạng thái cập nhật 01/10/2026: một phần Đợt A đã có code trong working tree, nhưng chưa xác minh bằng typecheck/test/build hoặc browser QA. `[x]` chỉ biểu thị có code cho hạng mục; các gate nghiệm thu giữ mở. Các con số cân bằng vẫn là cấu hình thử, chưa playtest.


## 1. Đợt A — Nền (P0)

- [x] 1.1 Code trong `game-data/pricing.ts` + `game-core/price.ts`: dải 0.8–1.3, bước 100 VND, kẹp giá, xác suất giữ món và hệ số nhu cầu giá thấp. Chưa kiểm thử biên/cân bằng.
- [x] 1.2 Code trong shared/simulation/runtime: `SaveGameData.sellingPrices?`, `set_price`, validator, lưu/tải, đặt lại giá gợi ý; có chặn đổi khi khách đang cầm món tại quầy. Chưa kiểm tra multiplayer/replay.
- [x] 1.3 Code `customers.ts`/`simulation.ts`: giá khóa tại lúc lấy kệ, giá bán/COGS vào ledger; giá tác động demand và tỷ lệ khách giữ món. Chưa xác minh ledger bằng test.
- [x] 1.4 Code `ShelfModal`: ô đặt giá, dải giá, lãi ước tính và nút reset giá gợi ý. Chưa kiểm tra viewport 1366×768/844×390.
- [x] 1.5 Code `game-core/reputation.ts`, `PlayerData.ratings?`, cửa sổ tối đa 30 rating, sao trung bình và hệ số traffic 0.8–1.2. Reputation cũ vẫn được giữ làm điểm bounded riêng, không migration lại từ rating. Chưa kiểm thử/migration QA.
- [x] 1.6 Code rating ở checkout và walkout với lý do, tác động reputation/HUD/toast và traffic. Chưa hiệu chỉnh cân bằng hoặc xác minh behavior.
- [x] 1.7 Code `day-rhythm.ts`, trường DailyRecord cho sao, `DaySummaryModal` tự hiện ở callback qua ngày; chưa có bản tin sáng, highlights đầy đủ, hoặc cơ chế mở lại sau reload. Chưa xác minh số liệu với ledger.
- [ ] 1.8 Tích hợp: mở rộng `integration.test.ts` vòng 3 ngày có đổi giá; `persistence.test.ts` cho save cũ; `yarn typecheck && yarn test && yarn build`.
- [ ] 1.9 **Gate A:** playtest thủ công đặt giá thấp/cao vài ngày, tổng kết khớp sổ; ghi kết quả vào `tổng hợp.md`. Chưa đạt thì không sang đợt B.

## 2. Đợt B — Con người và biến thiên (P1)

- [x] 2.1 Code trong `game-data/regulars.ts` (6 nhân vật thuần Việt: Bà Năm, Chú Ba, Bé Na, Chị Lan, Bác Tám, Anh Tuấn với vai trò, sở thích, tính cách, câu thoại và các mốc perk).
- [x] 2.2 Code trong `game-core/regulars.ts`: ghé theo seed/ngày deterministic, giới hạn trần +2 điểm thân thiết/ngày, tính tip bonus từ perk; có unit tests (`regulars.test.ts`) kiểm chứng logic xác định và trần thân thiết PASS.
- [x] 2.3 `customers.ts`: khách quen dùng sở thích/nhạy giá; nhãn tên overhead tag trong renderer; modal `RegularsModal` hoàn tất, hiển thị tim, đặc quyền và món ưa thích. Test và build PASS.
- [x] 2.4 (Phần thời tiết theo ngày/hệ số nhu cầu đã có ở change `dynamic-economy-simulation`.) Bản tin sáng (`MorningBrief`) trong `day-rhythm.ts` + tab "Bản tin sáng nay" trong `DaySummaryModal` đã hoàn tất và kiểm chứng bằng test. Phần đơn tiệc chuyển tiếp mục 2.6.
- [x] 2.5 Gợi ý nhập (`suggestions.ts`) cộng hệ số thời tiết/mùa; test không vượt giới hạn tươi sống hiện có (test 7.4 trong `suggestions.test.ts` PASS).
- [x] 2.6 `game-data/partyOrders.ts` + `game-core/party-orders.ts` đơn tiệc (`respond`, `fulfill` FEFO + ledger); lệnh idempotent; bảng đơn trong `QuestModal`; unit test `party-orders.test.ts` PASS 100%.
- [x] 2.7 `FestivalGoal`: tiến độ từ `productSales` trong khoảng ngày ngày hội, nhận một lần/năm mùa (`GoalState.claimedFestivalGoalKeys`), lệnh co-op `claim_festival_goal`, UI trong `QuestModal`. `goals.test.ts` kiểm tiến độ đúng nhóm, hết hạn, nhận lại năm sau và save/load. Chưa browser QA/HTTP hai client (xem 6.4).
- [ ] 2.8 **Gate B:** test seed/replay/không cày; playtest 10 ngày qua ít nhất một mùa; cập nhật tài liệu.

## 3. Đợt C — Mục tiêu dài hạn (P2)

- [x] 3.1 `game-data/goals.ts` (doanh thu, khách hàng, mở rộng tiệm, uy tín); `game-core/goals.ts` `getGoalProgress` thuần, `claimGoal` chống nhận đôi, thưởng một lần; shared `goals?`; unit test `goals.test.ts` PASS.
- [x] 3.2 Nhiệm vụ tuần (`weeklyQuests`), `QuestModal` thêm tab Sổ mục tiêu & Tuần + badge đếm chưa nhận; unit test PASS.
- [x] 3.3 `game-data/skills.ts`, `game-core/skills.ts` (`addSkillXp`, `choosePerk`, `getSkillModifier`); toàn bộ 9 modifier đã nối vào các nhánh gameplay trong `simulation.ts` (gồm thu ngân, nhân viên, boa, traffic, hạn dùng, sức chứa kệ, hao hụt, giá sỉ, lương). Checkout tip và save/reload có kiểm thử; cần mở rộng kiểm thử hành vi cho từng perk và cân bằng.
- [ ] 3.4 Cân bằng: mô phỏng nhiều ngày (mở rộng `runner`) kiểm không có đặc quyền phá lãi/ledger.
- [ ] 3.5 **Gate C:** test nhận thưởng một lần, save/reload, hai phiên multiplayer replay cùng state (nếu có môi trường).

## 4. Đợt D — Hoàn thiện (P3)

- [x] 4.1 Danh hiệu theo cột mốc (`titles.ts` data + core), chọn/gỡ danh hiệu, hiển thị trên HUD / brand banner và `TitlesModal`; test `titles.test.ts` PASS.
- [x] 4.2 Cập nhật mục "Cách chơi" (`LoginScreen.tsx` tab tính năng nâng cao), bổ sung 4 sản phẩm lễ hội thuần Việt (bánh chưng, câu đối đỏ, dưa hấu khắc chữ, bánh Trung Thu), nhân viên bảo vệ xe (`security` role, tăng kiên nhẫn và rating khách đi xe máy), người bán quầy phụ vỉa hè (`buildStalls`).
- [ ] 4.3 Cập nhật `tổng hợp.md`, `TASKS.md`, `ROADMAP.md`, `GAME_DESIGN.md`; ghi rõ phần đã kiểm chứng và phần còn thiếu (thiết bị thật, hiệu năng).

## 6. Sửa phát hiện review sau backlog (01/10/2026)

- [x] 6.1 Thêm dispatch `WorldRuntime` cho `respond_party_order`, `fulfill_party_order`, `claim_goal`, `claim_weekly_quest`, `choose_perk`, `set_title`.
- [x] 6.2 `App.tsx` gửi sáu thao tác qua commit co-op; `bootstrap.ts` phát lại command trên save máy chủ và trả save chuẩn hóa; cùng actor/commandId được kiểm tra trước replay để giữ idempotency.
- [x] 6.3 Nối các modifier kỹ năng còn thiếu vào simulation; lưu `completedDay` cho đơn tiệc và chỉ đếm hoàn tất trong tuần hiện tại.
- [ ] 6.4 (một phần) Đã có `apps/server/src/coop-commands.test.ts`: hai tài khoản, Mongo thật, 7 lệnh server-replay qua `GameController.commitCommand` (retry idempotent, tranh chấp revision) PASS 01/10/2026. Còn mở: HTTP qua Firebase guard, reconnect, browser QA responsive các modal, playtest cân bằng.

## 5. Đợt E — Hẻm sống động (P1/P2, bổ sung 01/10/2026)

- [x] 5.1 Có code `getSeasonalSunTimes(day)` dùng chu kỳ 120 ngày và warp keyframe daylight; sunrise/sunset dao động theo mùa giản lược quanh các dải xấp xỉ HCMC. Cần đối chiếu dải mùa, kiểm tra thiên văn và kiểm thử chuyển pha trước nghiệm thu.
- [x] 5.2 Code mưa deterministic theo seed/ngày/giờ với envelope ramp, weather summary intensity và rain streak renderer; bóng cây di chuyển theo keyframe nắng và mờ khi mưa. Chưa có wet-road shader/puddles, cloud attenuation riêng, hoặc kiểm thử hiệu năng.
- [x] 5.3 Code decal trang trí đường phố có sọc làn, dấu rãnh, vạch qua đường và tín hiệu đơn giản; chỉ renderer, không collision/logic tín hiệu. Chưa nghiệm thu phối cảnh/đường đi.
- [x] 5.4 Xe và lượt khách đi đến bằng motorbike/car/walk (`CustomerArrivalMode`): Chú Ba đi xe ôm, khách chọn xe máy/ô tô theo thời tiết/seed; đỗ xe lề đường (`STREET_PARKING_SPOTS`), khách đi bộ vào tiệm và lên xe rời đi. Thêm lưu lượng phương tiện hẻm (`StreetTrafficManager`, `runStreetTrafficTests` PASS); texture xe máy/ô tô pixel art, giới hạn 2 actor và không va chạm gameplay.
- [x] 5.5 Cường độ mưa tức thời `rainIntensity` tích hợp vào hành vi di chuyển khách và tốc độ xe cộ đường ướt; tính xác định theo seed; không phá vỡ save hay multiplayer.
- [x] 5.6 Gate E: `yarn typecheck` PASS (0 errors), `yarn test` PASS 100% (bao gồm `runStreetTrafficTests`, `runLightingPhaseTests`, `runOutdoorPropTests`), `yarn build` PASS cả web + server. Ghi nhận chi tiết vào `tổng hợp.md`.

## Ngoài phạm vi (không làm trong change này)

Năng lượng người chơi, làm nông/mỏ/chiến đấu/câu cá, hôn nhân/quà tặng tự do, review dạng văn bản, prestige reset, nâng cấp dụng cụ có thời gian chờ, trang trí hút khách (thuộc `store-layout-expansion`), offline income, chi nhánh, thay engine hoặc dependency mới.
