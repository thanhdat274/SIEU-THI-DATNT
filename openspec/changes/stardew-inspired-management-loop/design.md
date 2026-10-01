# Design

## Context

Đích: React + PixiJS + Dexie, monorepo `shared / game-data / game-core / game-renderer / apps/web / apps/server`. `Simulation` (2 000+ dòng) điều phối; các module thuần (`stock`, `customers`, `staff`, `quests`, `stalls`) có test. Lệnh nghiệp vụ đi qua `GameCommand` có ID để chạy local hoặc server authoritative. Xem `research.md` cho bằng chứng và bảng quyết định.

## Goals / Non-Goals

**Goals:** thêm lý do quay lại mỗi ngày (tổng kết, dự báo), quyết định quản lý có ý nghĩa (giá, danh tiếng), quan hệ với khách, mục tiêu dài hạn và lựa chọn build — bằng các module thuần nhỏ, có test, phát hành từng đợt.

**Non-Goals:** đổi engine/kiến trúc; refactor `simulation.ts`; thêm dependency; nội dung Stardew (nông, mỏ, hôn nhân…); prestige reset; đánh giá chữ; tạo mạng/server mới.

## Nguyên tắc chung

1. **Hàm thuần trong `game-core`**, `Simulation` chỉ gọi (không thêm logic nội tuyến dài). Mỗi module có test độc lập + một test tích hợp vào `integration.test.ts`.
2. **Dữ liệu cân bằng ở `game-data`**, không rải hằng số trong logic. Mọi số trong tài liệu này là **đề xuất chờ duyệt**.
3. **Save**: trường mới đều tùy chọn; migration cho save cũ = giá trị rỗng/mặc định; tăng `schemaVersion` một lần mỗi đợt ship, backup như `store-layout-expansion`.
4. **Command**: mọi hành động người chơi làm đổi state = `GameCommand` có `commandId`, kết quả có `reason`. Nhân viên/NPC dùng cùng handler. Không tính tài sản ngoài handler.
5. **Xác định**: ngẫu nhiên dựa seed `(worldId, day, kênh)` để server và local cho kết quả như nhau và test lặp được. Không dùng `Math.random`/`Date.now` trong module mới.
6. **Không phá vòng chơi cũ**: tiệm chưa dùng tính năng mới chạy như trước (giá = giá gợi ý, không thời tiết, không khách quen).

## Thứ tự phát hành (mỗi đợt tự chơi được)

| Đợt | Nội dung | Kỳ vọng gameplay | Gate |
| --- | --- | --- | --- |
| A (P0) | `shop-pricing`, `shop-reputation`, `day-rhythm` | Đặt giá → khách phản ứng → sao → uy tín; cuối ngày thấy kết quả | test lãi gộp/ledger, save cũ tải được, tổng kết đúng số |
| B (P1) | `regular-customers`, `town-events` | Mỗi ngày khác nhau, có người quen để chiều | test seed xác định, không cày điểm |
| C (P2) | `shop-goals`, `shop-skills` | Mục tiêu dài hạn + lựa chọn build | test thưởng nhận một lần, save/replay |
| D (P3) | danh hiệu, nối phần thưởng với mở đất/mối, cân bằng cuối | Khép vòng dài hạn | playtest nhiều ngày |

Đợt sau chỉ bắt đầu khi đợt trước qua gate. Không tuyên bố PASS nếu chưa chạy.

## Phụ thuộc ngoài change

- `adapt-reference-shop-operations` (khách/giỏ/ledger/nhân viên) là nền: `shop-pricing` cần `StockLot.unitCost` và `CheckoutResult`; `regular-customers` cần khách có `id` và giỏ; `day-rhythm` cần `DailyRecord`. Change đó còn task mở 9.4/11.x; không chặn đợt A nếu invariants ledger đang xanh.
- `store-layout-expansion`: phần thưởng mở đất (đợt C) chỉ gọi hàm mở plot sẵn có.
- `shared-alley-multiplayer`: thời tiết/ngày hội/khách quen là dữ liệu chung của thế giới (seed theo `worldId`); giá và kỹ năng thuộc `businessId`. Xung đột nhiều người xử lý bằng "command có ID + server quyết", không thêm cơ chế mới.

---

## Thẻ tính năng

Mỗi thẻ: mục đích · vì sao · xây trên · tương tác · dữ liệu · logic · UI · phụ thuộc · độ phức tạp · rủi ro · ưu tiên. Nguồn cảm hứng: (Ref) game tham khảo, (SDV) Stardew.

### F1. `shop-pricing` — Đặt giá bán (Ref) — P0, độ phức tạp thấp–vừa

- **Mục đích:** biến "bán bao nhiêu" thành quyết định: giá cao lãi nhiều nhưng khách bỏ hàng, giá thấp hút khách.
- **Vì sao:** giá đang cố định nên không có tối ưu; đây là đòn bẩy quản lý rẻ và rõ nhất.
- **Xây trên:** catalog (giá bán, `demandProfile.basePopularity`), `customers.ts` (chọn hàng), `CheckoutResult`, `ShelfModal`.
- **Tương tác:** giá chốt tại lúc khách lấy hàng (giỏ giữ giá); ledger dùng doanh thu thực; gợi ý nhập đọc vận tốc bán thực; uy tín (giá quá cao → sao thấp); khách quen có độ nhạy giá; kỹ năng bán hàng nới dải.
- **Dữ liệu:** `SaveGameData.prices?: Record<productId, number>` (không có = giá gợi ý). Balance đề xuất: `priceBand {min: 0.8, max: 1.3, step: 500}`.
- **Logic:** `clampPrice(productId, value)`; `keepChance(ratio, priceSensitivity)`: ≤1 → 1, >1 → `max(minKeep, 1 − k·(ratio−1))`; hút khách thêm tối đa +10% khi giá trung bình dưới gợi ý; biên lãi hiển thị = giá − giá vốn lô. Chỉ đổi giá khi tiệm đóng hoặc không có khách đang cầm giỏ món đó.
- **UI:** ô giá trên `ShelfModal` (± bước, chip "giá gợi ý", biên lãi %, màu xanh/vàng/đỏ), nút "về giá gợi ý".
- **Phụ thuộc:** không cần đợt khác. **Rủi ro:** phá cân bằng; giá lệch giữa kệ/giỏ; nhiều người cùng sửa giá. Giảm: dải hẹp, giá gắn vào giỏ khi lấy, last-writer-wins theo `commandId`.

### F2. `shop-reputation` — Uy tín hai chiều (Ref) — P0, thấp

- **Mục đích:** phản hồi tích lũy về chất lượng phục vụ (đủ hàng, đợi ngắn, giá hợp lý).
- **Vì sao:** `reputation` hiện chỉ giảm và gần như vô nghĩa; cần vòng "phục vụ tốt → khách đông".
- **Xây trên:** `player.reputation`, chỗ mất kiên nhẫn trong `simulation.ts`, `stalls.ts` (đã đọc reputation).
- **Tương tác:** sao mỗi khách ← thời gian chờ + có hàng khách cần + tỉ lệ giá (F1) → cửa sổ N khách gần nhất → hệ số lượng khách 0.8–1.2 (Ref); mốc uy tín gợi ý mở mối/nhiệm vụ (F6); kỹ năng quan hệ cộng điểm.
- **Dữ liệu:** `player.ratings?: number[]` (cửa sổ 30, đề xuất); uy tín suy ra từ trung bình để không lưu đôi và lệch.
- **Logic:** `ratingForVisit({waitFrac, gotAll, priceRatio})` → 1–5; `recordRating`; `averageRating` (rỗng = 4); `reputationTrafficMultiplier(avg)` áp vào tốc độ sinh khách; migration: `reputation` cũ làm điểm khởi đầu, `ratings` rỗng.
- **UI:** HUD hiện ★ trung bình; toast khi khách bỏ đi kèm lý do ("hết hàng", "đợi lâu", "giá cao"); tổng kết ngày có sao trung bình.
- **Phụ thuộc:** F1 cho lý do giá; thiếu F1 vẫn chạy bằng chờ/hàng. **Rủi ro:** vòng xoáy đi xuống; giảm bằng hệ số sàn 0.8 và không âm.

### F3. `day-rhythm` — Bản tin sáng và tổng kết cuối ngày (SDV + Ref) — P0, thấp–vừa

- **Mục đích:** nhịp "chuẩn bị → bán → kết toán" với phần thưởng tâm lý cuối ngày.
- **Vì sao:** `DailyRecord` đã đủ dữ liệu nhưng người chơi không thấy; đây là màn tăng giữ chân rẻ nhất.
- **Xây trên:** `DailyRecord`, `closedDayIds`, `LedgerEntry`, `AutoBuyReport`, HUD/`ToastContainer`, `SaveModal`.
- **Tương tác:** đọc mọi hệ (doanh thu, cogs, hàng hỏng, lương, sao, khách quen, nhiệm vụ xong, thời tiết); đóng ngày vẫn ghi ledger một lần — tổng kết chỉ là **view**, không đổi tiền.
- **Dữ liệu:** dùng `dailyRecords`; thêm tùy chọn `DailyRecord.customersServed`, `averageStars`, `highlights`. Không thêm state quan trọng.
- **Logic:** `buildDaySummary(record, extras)`; `buildMorningBrief({weather, season, pendingOrders, arrivals, goals})` → danh sách dòng; highlight: món bán chạy nhất, biên lãi tốt nhất, món hết hàng.
- **UI:** `DaySummaryModal` (tự mở khi đóng ngày, nút Tiếp tục), khối bản tin sáng thu gọn trên HUD; tái dùng primitive pixel; mobile ngang hiện 5 dòng đầu, còn lại cuộn.
- **Phụ thuộc:** không; phần thời tiết/khách quen hiện dần khi F4/F5 ship. **Rủi ro:** số lệch ledger → test đối chiếu Δtiền = tổng ledger (đã có ở `integration.test.ts`).

### F4. `regular-customers` — Khách quen (SDV redesign + Ref) — P1, vừa

- **Mục đích:** đưa nhân vật vào tiệm: chiều đúng món → thân thiết → thưởng.
- **Vì sao:** khách vô danh đơn điệu; quan hệ cư dân là chất kết dính dài hạn của Stardew.
- **Xây trên:** `CustomerState`, `customers.ts`, catalog, `data/customers.json` (Ref, tên/sở thích), `avatars.ts`, `quests.ts`.
- **Tương tác:** khách quen có sở thích theo nhóm/sản phẩm, độ nhạy giá (F1), kiên nhẫn; ghé theo lịch vài ngày/lần với nhu cầu cụ thể ("cô Sáu hôm nay cần mì gói"); phục vụ đúng món → điểm thân thiết → mở phần thưởng (đơn tiệc F5, nhiệm vụ riêng, giảm giá nhập nhỏ); sao (F2) tính bình thường.
- **Dữ liệu:** `game-data/regulars.ts` (6–8 người); `save.regulars?: Record<id, {friendship, lastVisitDay, lastFriendshipDay, perks[]}>`.
- **Logic:** `pickRegularVisit(worldId, day)`; ở checkout của khách quen: cộng điểm nếu giỏ có món ưa thích/khách hài lòng, trần +2/ngày/người; 5 mốc thân thiết (đề xuất mỗi mốc 100 điểm); perk mở theo mốc (data). Khách quen ≤ 1/3 lượng khách ngày.
- **UI:** nhãn tên trên đầu NPC; `RegularsModal` (danh sách, tim, món ưa thích đã biết/chưa biết); toast cảm ơn.
- **Phụ thuộc:** F1/F2 khuyến nghị; nền khách/giỏ từ `adapt-reference-shop-operations`. **Rủi ro:** state theo khách; art/hội thoại. Giảm: dùng avatar preset, ≤ 3 câu thoại mỗi người, không cây hội thoại.

### F5. `town-events` — Thời tiết, ngày hội, đơn tiệc (SDV + Ref) — P1, vừa

- **Mục đích:** mỗi ngày khác nhau và có thứ để lên kế hoạch trước.
- **Vì sao:** mùa hiện chỉ là hệ số; dự báo + đơn tiệc thêm quyết định nhập hàng có mục đích.
- **Xây trên:** `seasons.ts`, `stalls.ts`, `suggestions.ts`, kho/giỏ nhập.
- **Tương tác:** thời tiết (nắng/mưa/nóng theo mùa) nhân nhu cầu theo nhóm + lượng khách; dự báo 1 ngày trên bản tin sáng (F3); gợi ý nhập cộng hệ số sự kiện; đơn tiệc (nhiều món, hạn 1–2 ngày) lấy hàng từ **kho** qua command, đủ thì thưởng; khách quen (F4) có thể là chủ đơn.
- **Dữ liệu:** `game-data/weather.ts` (xác suất theo mùa, hệ số theo nhóm), mở rộng `SeasonEvent` (mục tiêu ngày hội + thưởng), `game-data/partyOrders.ts` (từ Ref, ID đã ánh xạ); `save.weather?: {day, today, tomorrow}`, `save.partyOrder?: {id, acceptedDay, deadlineDay}`.
- **Logic:** `weatherFor(worldId, day)` xác định; `demandModifier(weather, season, category)` kẹp [0.5, 2.0]; `respondPartyOrder`, `fulfillPartyOrder` trừ lô FEFO, ghi ledger `sale` với cogs từ lô. Từ chối/hết hạn không phạt tiền.
- **UI:** biểu tượng thời tiết + dự báo trên HUD/bản tin; bảng đơn tiệc trong `QuestModal`; chưa làm hiệu ứng mưa trên bản đồ đến khi lõi ổn.
- **Phụ thuộc:** F3 để hiển thị dự báo. **Rủi ro:** hai nguồn hệ số khó cân bằng (kẹp hệ số tích); đơn tiệc cần lô đủ hạn (FEFO có kiểm tra).

### F6. `shop-goals` — Sổ ước nguyện đầu hẻm + nhiệm vụ tuần (SDV redesign + Ref) — P2, vừa

- **Mục đích:** mục tiêu dài hạn nhìn thấy tiến độ; hoàn thành nhóm mở phần thưởng thật.
- **Vì sao:** đích có XP/level và nhiệm vụ ngày nhưng thiếu mục tiêu sưu tập cho nhiều giờ chơi.
- **Xây trên:** `quests.ts` (`QuestContext`, `claim_quest`, `getLevelUnlocks`), catalog nhóm, `QuestModal`, `store-layout-expansion` (mở plot), `suppliers.ts`.
- **Tương tác:** tiến độ tính từ số liệu sẵn có (`statistics`, `dailyRecords`, ledger, sao); nhóm xong → mở đất/mối/nội thất/danh hiệu; nhiệm vụ tuần (Ref `weeklyQuests.ts`) dùng cùng engine tiến độ.
- **Dữ liệu:** `game-data/goals.ts` (≈3 nhóm ban đầu × 4–6 ô: "Bán đủ 5 món đồ uống", "Đạt ★4,5 trong 10 ngày", "Doanh thu một ngày 1 triệu"…); `save.goals?: {claimed: string[], soldOnce?: string[]}` (chỉ lưu thứ không suy ra được); `quests` mở rộng `claimedWeekly`.
- **Logic:** `goalProgress(ctx)` thuần; `claim_goal` chống nhận đôi (id đã claimed); thưởng qua handler chung (tiền/XP/mở khóa). `soldOnce` cập nhật tại checkout.
- **UI:** trang "Sổ ước nguyện" trong `QuestModal` (lưới ô, nhóm gấp), badge số mục xong chưa nhận.
- **Phụ thuộc:** F2 (mục tiêu sao), F5 (tuần). **Rủi ro:** nội dung/cân bằng lớn; tranh phần thưởng với mở đất. Giảm: bắt đầu 3 nhóm, dữ liệu tách file để thêm dần.

### F7. `shop-skills` — Kỹ năng qua hành động (SDV redesign) — P2, vừa

- **Mục đích:** lên cấp theo cách chơi, chọn build ở mốc 5/10.
- **Vì sao:** thêm chiều tiến bộ ngoài cấp tiệm mà không thêm tài nguyên phải quản lý.
- **Xây trên:** `addExperience`, `commands.ts`, `staff.ts` (kỹ năng nhân viên riêng), F1, F4, kho/nhập.
- **Tương tác:** 3 kỹ năng — **Bán hàng** (từ checkout; đặc quyền: nới dải giá / tăng tiền boa), **Kho vận** (từ nhận hàng/châm kệ; giảm hao hụt / nhận hàng nhanh), **Kết thân** (từ phục vụ khách quen; thân thiết lên nhanh / thêm khách quen). Mỗi kỹ năng 10 cấp, mốc 5 và 10 chọn 1 trong 2 đặc quyền.
- **Dữ liệu:** `game-data/skills.ts`; `player.skills?: Record<skillId, {xp, perks[]}>`.
- **Logic:** `addSkillXp` gọi tại handler sẵn có (không thêm vòng lặp); `choose_perk` command (một lần mỗi mốc, kiểm tra cấp); đặc quyền là hệ số qua `getSkillModifier(state, key)`.
- **UI:** `SkillsModal` nhỏ (3 hàng, thanh XP, chọn đặc quyền); toast lên cấp.
- **Phụ thuộc:** F1, F4. **Rủi ro:** đặc quyền phá cân bằng. Giảm: mỗi mốc đúng 2 lựa chọn, hệ số ≤ 10%, test giá trị biên.

### F8. Danh hiệu (Ref) — P3, thấp

Danh hiệu theo cột mốc (doanh thu tích lũy/số ngày/sao) từ `titles.json`, hiện ở màn tiêu đề/HUD. Không prestige, không reset. Dữ liệu: `player.title?`. Chỉ làm sau F6.

---

## Ma trận tương tác

| Hệ → | Giá | Uy tín | Tổng kết | Khách quen | Sự kiện | Mục tiêu | Kỹ năng |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **Giá** | — | giá cao làm sao giảm | biên lãi | độ nhạy giá | hệ số cầu | ô doanh thu | nới dải |
| **Uy tín** | — | — | ★ trung bình | sao khách quen | — | ô ★ | — |
| **Khách quen** | sở thích/nhạy giá | sao | tim mới | — | chủ đơn tiệc | nhiệm vụ riêng | XP Kết thân |
| **Sự kiện** | hệ số | — | dự báo | lịch ghé | — | tuần/ngày hội | — |

## Rủi ro chung và cách kiểm

- **Save/migration:** mở rộng `persistence.test.ts`: save hiện tại → mặc định rỗng, không mất tiền/kho; version tương lai bị từ chối như cũ.
- **Kinh tế:** test bất biến `Σ ledger = Δ tiền`, `lãi gộp = doanh thu − cogs` sau khi đổi giá; mô phỏng nhiều ngày (mở rộng `runner`) kiểm lãi không tăng vô hạn khi đặt giá tối đa.
- **Multiplayer:** hàm mới không đọc `Math.random`/`Date.now`; command idempotent theo `commandId`; replay tái tạo cùng state.
- **Hiệu năng:** khách quen/thời tiết tính theo ngày, không theo tick; UI tổng kết không tạo vòng lặp render.

## E. Lát cắt daylight, mưa và đường (bổ sung 01/10/2026)

- `getSeasonalSunTimes(day)` maps calendar 120-day cycle to a small daylight envelope around noon, then warps existing light keyframes. This first pass is not yet fitted to the month/season ranges in research; requires calibration and astronomy/playtest review.
- `rainIntensityAt(worldSeed, day, hour, minute, weatherId)` produces a deterministic triangular/smooth envelope with weather-specific peak and duration. Renderer uses the value for rain streaks and tree-shadow opacity. No gameplay modifier is added, avoiding double application to existing market weather factors.
- Tree shadow is a cosmetic ellipse based on existing keyframe lean/length; update in renderer only. Current decal road treatment adds lane dashes, drain marks, crosswalk and one signal prop without touching collision/pathfinding.
- Vehicle arrivals (walk/motorbike/car), parking, animated signal phases, realistic stormwater simulation, puddle surface and morning brief remain unimplemented tasks. Keep arrivals cosmetic/non-colliding initially and bound sprite count.
- Code in the working tree is not verified in this change session. Keep all integration/browser/balance gates open until actually run and recorded.