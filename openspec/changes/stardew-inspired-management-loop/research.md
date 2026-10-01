# Khảo sát — 30/09/2026

## 0. Nguồn và độ tin cậy

| Nguồn | Cách khảo sát | Giới hạn |
| --- | --- | --- |
| Dự án đích `SIEU-THI-DATNT` | Đọc `tổng hợp.md`, `shared/src/index.ts`, `game-core` (`quests.ts`, `stalls.ts`, `customers.ts`), `game-data/seasons.ts`, OpenSpec hiện có | Chưa chạy lại test/build trong đợt này |
| `tap-hoa-dau-hem` (tham khảo) | Đọc `src/core/*` (pricing, progression, reviews, quests, weeklyQuests, story, partyOrders, prestige, calendar…) và `src/data/*.json`, `openspec/STATUS.md` | Không chạy game hay test nguồn; test pass trong STATUS là ghi nhận của nguồn, không phải kiểm chứng của đợt này |
| Stardew Valley | Kiến thức thiết kế đã biết về vòng chơi/hệ thống; **không tra cứu trực tiếp hay chơi lại trong đợt này** | Chỉ dùng cấu trúc hệ thống, không sao chép nội dung/số liệu; mọi con số của game đích là đề xuất cân bằng cần duyệt |

Tìm thấy code hoặc tài liệu không đồng nghĩa gameplay đã nghiệm thu.

## 1. Hiện trạng dự án đích (những gì KHÔNG đổi)

Đã có: bản đồ 26×22 + camera; đồng hồ 1 giây = 1 phút, mở/đóng cửa; 56 sản phẩm/10 nhóm; kho, lô FEFO, hạn dùng, hàng chờ; 3 mối nhập, giỏ nguyên tử; khách nhiều, giỏ, hàng đợi, thu ngân người/NPC; nhân viên cashier/refill, ca, lương; ledger + DailyRecord + gợi ý/tự nhập; XP/cấp/mở khóa; nhiệm vụ ngày + cốt truyện (`quests.ts`); 4 mùa lễ (`seasons.ts`) và quầy ăn (`stalls.ts`); bố cục tiệm/mở đất; đăng nhập Firebase; lõi multiplayer; thuế đang ở giai đoạn thẩm định.

**Khoảng trống xác nhận trong code:**
1. Giá bán = giá catalog cố định (không có `set_price`); `demandProfile.basePopularity` chưa dùng.
2. `player.reputation` chỉ giảm (`simulation.ts` ~dòng 1015: mất uy tín khi khách hết kiên nhẫn), chưa có đường tăng; ảnh hưởng duy nhất là `stallDemand`.
3. Khách vô danh (`CustomerState` không có danh tính/loại), không có sở thích theo nhóm khách.
4. Mùa chỉ có `demandMultiplier`, `preferredCategories`, `stallMultiplier`; không có thời tiết, ngày hội có mục tiêu, đơn đặt tiệc.
5. `DailyRecord` có đủ số liệu nhưng không có màn tổng kết/bản tin sáng cho người chơi.
6. Mục tiêu dài hạn: chỉ có nhiệm vụ ngày và chuỗi cốt truyện; chưa có gói sưu tập, nhiệm vụ tuần, danh hiệu.
7. Tiến bộ người chơi chỉ là cấp/XP; không có kỹ năng hay lựa chọn build.

## 2. Hệ thống của game tham khảo đáng dùng

| Hệ thống | Bằng chứng | Nhận xét cho đích |
| --- | --- | --- |
| Đặt giá trong dải | `core/pricing.ts` (`priceRange/clampPrice/setPrice/keepChance/cheapSpawnMultiplier`), `balance.json.pricing` | Logic nhỏ, thuần; xác suất giữ hàng theo độ nhạy giá từng loại khách. Dùng ý, viết lại theo `StockLot`/catalog đích |
| Rating → lượng khách | `progression.ts` (`recordRating/averageRating/ratingSpawnMultiplier`), cửa sổ N khách, hệ số 0.8–1.2 | Dùng khái niệm cho `shop-reputation`; đích cần cửa sổ trong save |
| Loại khách có sở thích | `data/customers.json` 13 loại (học sinh, bà nội trợ, xe ôm…) với `prefs` theo nhóm, `patience`, `priceSensitivity`, `tipMul` | Nguồn nội dung tốt cho khách quen; tên nhóm hàng khác đích nên cần bảng ánh xạ |
| Đánh giá chữ | `core/reviews.ts` | Nặng UI → hoãn, chỉ lấy sao |
| Nhiệm vụ tuần / cốt truyện / danh hiệu | `weeklyQuests.ts`, `story.ts`, `prestige.ts`, `data/titles.json` | Lấy nhiệm vụ tuần và danh hiệu; đích đã có story/daily |
| Đơn tiệc | `partyOrders.ts` + `partyOrders.json` (đơn nhiều món, hạn 1–2 ngày, thưởng) | Dùng làm sự kiện đặt món có hạn |
| Lịch/sự kiện | `calendar.ts`, `eventScheduler.ts`, `events.json` | Đích đã có bản mỏng; mở rộng có chọn lọc |
| Trang trí hút khách | `data/decor.json` (`attraction`, slot) | Hợp hơn ở `store-layout-expansion`, để sau |
| Offline income, chi nhánh, thuế, bảo trì, bếp, tiệm xôi | nhiều file | Đã hoãn/ngoài phạm vi ở các change trước |

## 3. Phân tích Stardew Valley (theo hệ thống, không theo nội dung)

| Hệ thống Stardew | Cơ chế nền (vì sao hiệu quả) | Tương tác với hệ khác |
| --- | --- | --- |
| Vòng lặp ngày | Sáng chuẩn bị → ngày làm việc có giới hạn → tối kết toán → **màn tổng kết** → sáng hôm sau có điều để mong chờ | Mọi hệ tiêu thụ thời gian trong ngày; kết toán là điểm thưởng tâm lý |
| Lịch mùa/thời tiết/lễ hội | Đồng hồ dài (mùa) + biến thiên ngắn (mưa, lễ hội) làm mỗi ngày khác nhau; dự báo báo trước để lên kế hoạch | Quyết định trồng/bán gì; lễ hội là mốc cộng đồng |
| Quan hệ cư dân | Thân thiết tăng qua tương tác lặp lại và món ưa thích, mở sự kiện/công thức/dịch vụ; giới hạn tần suất chống cày | Dữ liệu sở thích buộc người chơi để ý từng người |
| Bảng yêu cầu/nhiệm vụ | Việc nhỏ có hạn, thưởng vừa, song song mục tiêu lớn | Đẩy người chơi thử món/cơ chế mới |
| Gói mục tiêu (Community Center) | Danh sách sưu tập; hoàn thành nhóm mở phần thưởng thật; tiến độ nhìn thấy nhiều giờ chơi | Gắn mọi nhánh nội dung |
| Kinh tế | Chi phí thấp lúc đầu, giá trị tăng theo chất lượng/chế biến, có thời gian chờ → biên lãi gắn quyết định; lặp một món sẽ kém hiệu quả | Khuyến khích đa dạng |
| Kỹ năng/nghề | Lên cấp qua **làm** (không tiêu điểm), mốc chọn nghề; mỗi lựa chọn đổi cách chơi | Tăng năng suất nhánh hay dùng |
| Nâng cấp dụng cụ/nhà | Tiền + chờ vài ngày → đổi giới hạn năng lực | Nhịp mục tiêu tiền vừa tầm |
| Người bán không chỉnh giá | Người chơi là người bán; cửa hàng NPC có giá cố định | Đối lập với đích: đích LÀ chủ tiệm nên phải có đặt giá |
| Lưu qua đêm | Điểm lưu sạch giữa các ngày | Tổng kết ngày gắn vào điểm đóng ngày an toàn |

## 4. Bảng quyết định (Reuse / Adapt / Redesign / Not use)

Nhãn: **R** dùng trực tiếp · **A** điều chỉnh · **D** thiết kế lại theo cùng khái niệm · **N** không dùng. "Đợt" = ưu tiên (P0 trước).

| Hệ thống | Nguồn | Quyết định | Vì sao | Đợt |
| --- | --- | --- | --- | --- |
| Catalog/nhóm hàng | tham khảo | Đã xử lý ở `adapt-reference-shop-operations` | Không lặp lại | — |
| Kho/lô/hạn, nhà cung cấp, giỏ nhập, nhân viên, khách giỏ/hàng đợi, ledger, gợi ý nhập | tham khảo | **Giữ nguyên** | Đã có; chỉ đọc số liệu để cấp cho hệ mới | — |
| Bố cục tiệm, mở đất | tham khảo | **Giữ** (`store-layout-expansion`), dùng làm phần thưởng | Tránh trùng | — |
| Đặt giá bán trong dải | tham khảo | **A** | Logic thuần, cân bằng nhanh; thêm hiển thị biên lãi | P0 |
| Rating → lượng khách | tham khảo | **A** | Đích có `reputation` một chiều; thêm sao 1–5 mỗi khách | P0 |
| Tổng kết cuối ngày + bản tin sáng | Stardew + tham khảo (`SummaryScene`, `MorningScene`) | **A** | `DailyRecord` sẵn dữ liệu, thiếu UI | P0 |
| Loại khách có sở thích | tham khảo | **A** | Nền cho khách quen và nhu cầu theo nhóm | P1 |
| Khách quen / độ thân thiết | Stardew | **D** | Cùng khái niệm "cư dân ưa món"; bỏ quà/tình cảm; thân thiết tăng bằng phục vụ đúng món | P1 |
| Lịch mùa mở rộng + ngày hội | tham khảo/Stardew | **A** | `seasons.ts` đã có 4 mùa; thêm ngày hội có mục tiêu | P1 |
| Thời tiết theo ngày | Stardew | **D** | Xác suất theo mùa; ảnh hưởng nhóm hàng/lượng khách; dự báo 1 ngày | P1 |
| Đơn đặt tiệc có hạn | tham khảo | **A** | Dùng `partyOrders.json` với id sản phẩm đích | P1 |
| Nhiệm vụ tuần | tham khảo | **A** | Mở rộng `quests.ts` | P1 |
| Gói mục tiêu sưu tập | Stardew | **D** | Bản tạp hóa "Sổ ước nguyện": bán đủ món của nhóm, đạt sao, đạt doanh thu; thưởng mở đất/mối | P2 |
| Kỹ năng + nghề mốc 5/10 | Stardew | **D** | 3 kỹ năng theo hành động của game (bán, kho vận, quan hệ) | P2 |
| Danh hiệu | tham khảo | **A** | Chỉ danh hiệu theo cột mốc; bỏ prestige reset | P3 |
| Nâng cấp dụng cụ có thời gian chờ | Stardew | **N** | Đích có mở đất/nội thất; tránh trùng và trạng thái chờ | — |
| Trang trí hút khách | tham khảo | **N** trong change này | Hợp hơn ở `store-layout-expansion` | — |
| Đánh giá chữ, trả lời | tham khảo | **N** | Nặng UI, giá trị thấp so với sao | — |
| Offline income, chi nhánh, bảo trì, bếp/tiệm xôi | tham khảo | **N** | Ngoài phạm vi, đã ghi hoãn | — |
| Làm nông, mỏ/chiến đấu, câu cá, hôn nhân, năng lượng, độ bền dụng cụ, nhiều bản đồ, gia súc | Stardew | **N** | Khác định danh quản lý tiệm, tăng phạm vi cực lớn | — |
| Lưu qua đêm | Stardew | **R** (đã có tự lưu + `closedDayIds`) | Gắn tổng kết vào điểm đóng ngày | P0 |

## 5. Không làm và lý do

- **Năng lượng/sức bền người chơi:** đích đã có đồng hồ, nhân viên, đóng cửa; thêm năng lượng làm phức tạp multiplayer (mỗi người một thanh) mà không thêm quyết định quản lý mới.
- **Tặng quà tự do/hôn nhân:** ngoài cung bậc game; quan hệ khách quen chỉ qua phục vụ đúng món.
- **Chuỗi nuôi trồng/chế tạo sâu:** quầy ăn đã có; chuỗi sản xuất là change riêng.
- **Prestige reset:** xung đột save/multiplayer và chưa cần khi chưa hết nội dung.

## 6. Rủi ro tổng thể

| Rủi ro | Giảm thiểu |
| --- | --- |
| Đặt giá phá cân bằng (giá vốn lô đã có) | Dải giá hẹp quanh giá gợi ý (đề xuất 80–130%), test bất biến lãi gộp = doanh thu − cogs; số cân bằng ở file dữ liệu |
| Trạng thái mới vào save/multiplayer | Trường tùy chọn + migration mặc định; thay đổi qua `GameCommand` có ID, server dùng cùng hàm thuần |
| Quá nhiều hệ cùng lúc | 4 đợt, mỗi đợt tự đủ; P0 trước |
| Cày quan hệ/khách quen | Trần điểm thân thiết theo ngày |

## 6. Implementation snapshot — 01/10/2026

- Working tree now contains first-pass price overrides, customer star/reputation signals, end-of-day modal, seasonal keyframe warp, deterministic intraday rain intensity/VFX, moving tree shadow, and cosmetic lane/drain/crosswalk/signal decals.
- These are code-presence observations only: no typecheck, tests, build, browser QA or balance playtest were run for this implementation session. OpenSpec task gates remain unchecked.
- Not implemented: persistent regular-customer profiles/history, morning brief, customer arrivals by motorbike/car/on foot, parking/routing, traffic phases, functional storm drains/puddles, full review history, plus balance and compatibility verification.