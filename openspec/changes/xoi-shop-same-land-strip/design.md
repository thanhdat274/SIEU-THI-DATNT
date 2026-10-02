# Design: Tiệm xôi riêng trên cùng dải đất

## Hiện trạng đã kiểm tra

- `packages/game-data/src/map.ts`: bản đồ 26×22, `MAP_ORIGIN_Y = -6`; tiệm chính `STORE_BOUNDS = {left:6,right:13,top:3,bottom:10}`, mở rộng sang đông tới x=17/21 khi mua `east-wing-a/b`; kho `WAREHOUSE_BOUNDS` ngay phía bắc (y=-3..3, x=6..13). Cửa chính ở x=9..10 trên hàng y=10. Cột x=0 và hàng/cột mép bản đồ đã là vật cản. **Dải phía tây x=1..5, y=3..10 đang là đất trống** (sân/cỏ); `isFenceTile` đặt hàng rào ở y=10 cho x≤4, cây `alley_shade_tree` ở (3,11), cột đèn (4,12), cống thoát nước x=4, vạch qua đường `CROSSWALK.tileX=1, widthTiles=2` ở hàng 13–14.
- `generateStarterTileMap(unlockedPlotIds, ownedStallIds)` dựng tường/nền từ hằng số, không có khái niệm nhiều tòa nhà; `tileMap.storeBounds` đã tồn tại nhưng chỉ có một khối.
- `packages/game-core/src/customers.ts`: `ENTRANCE_TILE = {9,11}` cố định; `cashierCounters(fixtures)` trả mọi quầy toàn sàn; khách chọn kệ trên toàn bộ `fixtures` (`pickShelfByDemand`), bản đồ riêng của khách chặn mọi ô có `y ≤ STORE_BOUNDS.top`, lối thoát ra x=1 hoặc x=24 ở y=12; `queueTilesForCounter` đã hỗ trợ nhiều quầy (làn thanh toán). Bàn ăn: `availableDiningTableId` chọn bàn trống bất kỳ.
- `packages/game-core/src/store-layout.ts`: validate đặt nội thất dựa `STORE_BOUNDS`, điểm vào `{x:9, y:bottom+1}`, kiểm tra cửa kho; có `unlockedPlotIds`, `storedFixtures`. `FIXTURE_SHOP[*].requiresPlot` (khu `D/E/F` của game gốc) **chưa được áp dụng**.
- `packages/game-renderer/src/viewport.ts`, `shop-lighting.ts`: tường, cửa, bóng, biển và đèn đều dùng hằng `STORE_BOUNDS` (nhiều chỗ, kể cả vị trí đèn mặt tiền); đã có một vùng sáng ở phía tây tiệm `(STORE_BOUNDS.left - 1.4)`.
- `packages/shared/src/index.ts`: `StoreFixture` không có trường tòa nhà; `CustomerState` không biết đang ở tòa nào; `SaveGameData.landPlots` kiểu `unlockedPlotIds`.
- Các trạm xôi và bàn đã port ở change trước nằm trong `FIXTURE_SHOP` (cấp 29), `RECIPES`, `DINING_ADD_ON_RULES`; chưa gắn với tòa nhà nào.
- Game gốc: `branches.ts` (mở chi nhánh = `addStoreSnapshot` + `activateStore`) và `internalSupply.ts`. Chỉ dùng làm tham chiếu số liệu (cấp 29, 700.000 ₫, bố cục mặc định); **không dùng mô hình hoán đổi cửa hàng**.

## Quyết định thiết kế đề xuất

### D1. Vị trí: dải phía tây, không đổi kích thước bản đồ

Tiệm xôi chiếm `XOI_BOUNDS = {left:0, right:6, top:3, bottom:10}`: tường đông x=6 **dùng chung** với tường tây của tiệm chính, tường tây x=0 là mép bản đồ, nội thất x=1..5 (5 ô) × y=4..9 (6 ô) = 30 ô, nhỏ hơn tiệm chính 36 ô nhưng đủ cho bố cục mặc định của game gốc (quầy, thùng ngâm, xửng hấp, quầy xôi, một bàn) và thêm vài bàn. Cửa 2 ô ở hàng y=10, **x=1..2**, để tránh cây (3,11); hàng rào y=10 phải loại trừ ô cửa. Cửa nằm sát vạch qua đường (x=1..2), nên người đi bộ qua đường sẽ hướng vào cửa tiệm xôi.

Lý do: không đổi `MAP_WIDTH`/`MAP_HEIGHT` nên tọa độ save, vị trí đỗ xe, làn xe, camera và bóng cây không đổi; cách khác (mở rộng bản đồ sang đông/tây) chạm bounds camera, spawn xe, đèn đường, `STORM_DRAINS`, `CAR_PARKING_SPOTS`, test `road`/`street-traffic`. Đánh đổi: tiệm nhỏ và sát mép bản đồ; phần trên x=0..5, y<3 vẫn trống để mở rộng sau. Hằng số vị trí gom ở `BUILDINGS`, nên đổi vị trí chỉ sửa dữ liệu.

### D2. Mô hình tòa nhà theo dữ liệu, suy ra từ tọa độ

`game-data/src/buildings.ts`: `BuildingDef { id: 'main' | 'xoi'; name; bounds; doorTiles; entranceTile; unlock?: { level; cost } }`. `buildingAt(tileX, tileY)` trả tòa chứa ô (kể cả phần mở rộng đông của tiệm chính). Fixture/khách/nhân viên thuộc tòa nào được **tính từ vị trí**, không thêm trường vào `StoreFixture` nên không migration fixture. `STORE_BOUNDS` giữ nguyên là bounds tiệm chính để mọi nơi còn dùng nó không đổi; mã mới đọc qua `BUILDINGS`.

### D3. Sở hữu và mở khóa

`SaveGameData.ownedBuildingIds?: string[]` (tùy chọn, mặc định `['main']`, không nâng schema, `normalize` loại id lạ). `buyBuilding(save, 'xoi')` (thuần, ở `store-layout.ts` hoặc `buildings.ts` của game-core): cần cấp ≥ 29 và đủ 700.000 ₫ (số của game gốc, **chưa cân bằng**), idempotent theo id, trừ tiền đúng một lần, đặt `defaultLayout` quy đổi sang tile (`counter`, `thung_ngam`, `xung_hap`, `quay_xoi`, `food_table_2`). `generateStarterTileMap` nhận thêm tập tòa đã sở hữu: chưa mua thì vẽ vỏ nhà đóng cửa (tường, cửa kéo, biển "CHO THUÊ"), đã mua thì mở cửa, nền sàn như tiệm chính. Lệnh mới `buy_building` vào `GameCommandPayload`, `ALLOWED_COMMAND_TYPES`, danh sách replay và `REWARD_COMMANDS` không áp dụng (chi tiêu, không thưởng) nhưng phải qua kiểm tra bất biến "tiền chỉ giảm đúng giá".

### D4. Khách chọn tòa nhà

Khi sinh khách, chọn tòa theo nhu cầu: tập kệ ứng viên chỉ gồm kệ trong **tòa đang mở**; `CustomerState.buildingId` (tùy chọn, mặc định `main` khi nạp save cũ) ghi tòa đã chọn. Kệ, quầy thu ngân, bàn ăn và ô xếp hàng đều lọc theo `buildingId`; ô vào cửa lấy từ `BUILDINGS[buildingId].entranceTile` thay cho `ENTRANCE_TILE`. Món xôi chỉ có thể nằm ở tiệm xôi vì trạm xôi chỉ đặt được ở đó (D6) và đầu ra bày ở kệ/quầy trong tòa đó. Khách đi xe đỗ ở `STREET_PARKING_SPOTS` rồi đi bộ tới cửa đúng tòa; điểm đỗ có thể tính khoảng cách tới cửa để chọn bãi gần hơn (có thể hoãn, ghi rõ).

Bản đồ riêng của khách (`customerMap`) hiện chặn `y ≤ STORE_BOUNDS.top`; vẫn đúng cho cả hai tòa vì cùng `top=3`. Khách quen (`regulars`) và tín dụng không phụ thuộc tòa. Thống kê "khách phục vụ" và danh tiếng tính chung.

### D5. Quầy thu ngân, nhân viên, kho

- Mỗi tòa có quầy thu ngân riêng; checkout giữ nguyên luật hiện có (người chơi đứng ở quầy hoặc nhân viên thu ngân). **Chốt cần xác nhận với chủ dự án:** người chơi không thể ở hai quầy cùng lúc, nên tiệm xôi cần một nhân viên thu ngân (đã có vai trò `cashier`) hoặc người chơi chạy qua lại, khách chờ có `patience`. Đề xuất: không thêm vai trò mới; nhân viên thu ngân được gán theo quầy (`cashierStaffId` trên quầy đã có) nên chỉ cần cho phép gán sang quầy tiệm xôi.
- Kho chung duy nhất ở phía bắc tiệm chính; nhân viên bổ sung hàng và người chơi đi bộ từ kho ra vỉa hè rồi vào cửa tiệm xôi (pathfinding đã có; cần kiểm tra thời gian đi và `workerTask` route qua cửa mới). Không có `internalSupply` hay kho phụ.
- Một chủ, một tiền, một sổ cái, một thuế khoán (cùng hộ kinh doanh). Báo cáo ngày không tách theo tiệm trong change này.

### D6. Quy tắc đặt nội thất theo tòa nhà

`FIXTURE_SHOP[*]` thêm `allowedBuildings?: BuildingId[]` thay cho `requiresPlot` chưa dùng: `thung_ngam`, `xung_hap`, `quay_xoi` chỉ `['xoi']`; bàn `food_table_*` cho cả hai; còn lại mặc định `['main']`. `store-layout.ts` kiểm tra `buildingAt` của footprint đầy đủ nằm trọn trong một tòa đã mở và được phép; điểm vào và kiểm tra tiếp cận (BFS) chạy theo `entranceTile` của tòa đó. **Di cư:** save đã lỡ đặt trạm xôi trong tiệm chính (tính năng mới ra cùng ngày, chưa phát hành nên hiếm) được chuyển vào `storedFixtures` khi nạp, giữ nguyên dữ liệu, không mất đồ, có thông báo một lần.

### D7. Renderer

Tổng quát hóa vòng dựng tường/cửa/bóng của `viewport.ts` từ một khối `STORE_BOUNDS` sang lặp qua tòa đã vẽ; tường dùng chung x=6 chỉ vẽ một lần; thêm biển "TIỆM XÔI" (chữ trên cửa, tái dùng kiểu biển kho) và đèn mặt tiền trong `shop-lighting.ts` theo tòa; cây (3,11) và hàng rào y=10 giữ nguyên, trừ ô cửa. Sprite nội thất xôi đã có trong `ref-pixelart.ts`. Không thêm texture mới ngoài biển.

### D8. Co-op / server

Vị trí tòa là dữ liệu tĩnh dùng chung client/server (`game-data`), nên `world-runtime`/`save-invariants` dùng cùng quy tắc. `ownedBuildingIds` đi theo snapshot thế giới; `buy_building` là lệnh có revision/idempotency, thêm vào `serverReplayedCommands`. Chủ hẻm là người duy nhất mua tòa, như mua đất hiện nay.

## Rủi ro và điểm chưa chắc

- **Tiệm nhỏ (30 ô) và sát mép:** có thể chật khi thêm quầy xếp hàng. Kiểm bằng tác vụ khảo sát/ playtest sớm (task 1.2); nếu chật, đổi sang mở rộng bản đồ (D1 phương án B) là quyết định riêng.
- **Hằng số một cửa nằm rải rác:** `ENTRANCE_TILE`, `store-layout.ts:80`, nhiều chỗ trong `viewport.ts`/`shop-lighting.ts`, `AnalyticsModal` (heatmap theo `STORE_BOUNDS`), `simulation.ts:3662`. Cần grep đủ và kiểm từng chỗ; sót một chỗ gây lỗi âm thầm (khách xuyên tường, heatmap lệch).
- **Làn xe/đi bộ gần cửa:** vạch qua đường và người đi bộ ambient tới x=1..2; kiểm không chặn cửa, không chồng ô đỗ xe, và hình ảnh không tạo kỳ vọng sai (người đi bộ ambient không phải khách).
- **Cân bằng:** 700.000 ₫, cấp 29, 30 ô là số của game gốc/ước lượng; thu nhập xôi ở kinh tế hiện tại (xem `balance-audit.ts`) chưa mô phỏng.
- **Nhân viên thu ngân giữa hai quầy:** chưa có thiết kế chi tiết cho AI thu ngân chọn quầy; nếu tăng phạm vi cần task riêng.

## Câu hỏi mở cần chủ dự án xác nhận trước khi apply

1. Chấp nhận vị trí dải phía tây (D1), hay muốn mở rộng bản đồ để tiệm xôi rộng hơn?
2. Tiệm xôi cần nhân viên thu ngân riêng hay người chơi tự chạy qua lại (D5)?
3. Giá 700.000 ₫ và cấp 29 giữ theo game gốc?
4. Có cần hiện vỏ nhà "CHO THUÊ" trước khi mua, hay chỉ hiện tiệm sau khi mua?

Các mặc định nếu chưa trả lời: D1 phương án A, nhân viên thu ngân gán quầy, giữ 700.000 ₫/cấp 29, hiện vỏ nhà đóng cửa.

## Điều chỉnh trong lúc triển khai (02/10/2026)

Đã chọn mặc định cho 4 câu hỏi mở (dải phía tây, thu ngân theo cách hiện có, 700.000 ₫/cấp 29, hiện vỏ nhà đóng cửa). Các điểm khác thiết kế ban đầu:

- **D3 sửa đổi — sở hữu tòa nhà là một "mảnh đất kiểu tòa nhà".** Thay `ownedBuildingIds` và lệnh `buy_building` mới bằng một mục `LAND_PLOTS` (`building-xoi`, `tiles: []`, `buildingId: 'xoi'`) nằm trong `storeLayout.unlockedPlotIds` sẵn có. Lý do: mọi chỗ gọi `generateStarterTileMap` (client, server, replay, editor) đã nhận danh sách id đất; lệnh `buy_plot` đã idempotent, đã nằm trong danh sách server replay và có UI mua đất. Không đổi schema save, không thêm lệnh, không thêm trường save. `buyLandPlot` đặt bố cục mặc định khi mua tòa nhà.
- **D5 sửa đổi — thu ngân.** Nhân viên thu ngân (`assignNextCashierCustomer`) vốn không đứng ở quầy nào: phục vụ khách bất kỳ ở bước thanh toán. Một người phục vụ được cả hai tòa nên không thêm "gán theo quầy". Hệ quả cần biết: một nhân viên thu ngân tự động phục vụ cả hai hàng đợi cùng lúc (người chơi thì vẫn phải đứng ở quầy nào đó).
- **Vỏ nhà luôn có trong bản đồ.** Chưa mua thì sàn trong và ô cửa là vật cản (không đi vào hay đặt nội thất được), renderer vẽ cửa cuốn và biển "CHO THUÊ".
- **Dời cây `alley_shade_tree` từ (3,11) sang (5,11).** Tán cây (sprite lệch −1 ô) che khuất cửa tiệm xôi ở x=1..2. Biển và mái hiên tiệm xôi chỉ rộng 3,5 ô (x 0,5..4) để tán cây ở x=5 không che. Test `integration.test.ts` cập nhật vị trí sprite cây.
- **Hàng rào phía tây bỏ.** `isFenceTile` không còn ô nào ở x ≤ 6 vì dải đó thành tường tiệm xôi.
- **Đèn:** bỏ vùng sáng "cửa sổ trái rọi ra cỏ" của tiệm chính (phía đó giờ là sàn tiệm xôi); đèn tiệm xôi chỉ dựng khi tiệm mở và trạng thái mở nằm trong khóa dựng lại của `ShopLighting`.
- **Heatmap** (`AnalyticsModal`) gộp cả hai tòa.
- **Lỗi server có từ trước, đã sửa:** lệnh được server phát lại (như `buy_plot`) bị từ chối "phải dùng layout_batch" vì save chuẩn do server tạo bị so bố cục với save đang lưu; điều kiện nay chỉ áp dụng cho save do client gửi.

### Kiểm kê chỗ gắn cứng một tòa nhà (task 1.3)

| Chỗ | Xử lý |
|---|---|
| `customers.ts` `ENTRANCE_TILE`, `CASHIER_QUEUE_TILES` | Ô vào cửa lấy từ `BUILDING_MAP[buildingId].entranceTile`; hàng đợi mặc định chỉ dùng cho tiệm chính; tòa không có quầy thì khách bỏ về |
| `customers.ts` `cashierCounters` | Lọc theo tòa của khách (`fixtureBuilding`) |
| `customers.ts` bản đồ riêng của khách (`y ≤ STORE_BOUNDS.top`) | Giữ nguyên: cả hai tòa cùng `top = 3` |
| `simulation.ts` `availableDiningTableId`/`canDineIn` | Lọc bàn theo tòa của khách |
| `simulation.ts:3662` kích thước `storeLayout` khi export | Giữ nguyên (chỉ là kích thước hiển thị của tiệm chính, không dùng để kiểm tra) |
| `store-layout.ts` điểm vào và cửa kho | BFS theo `entranceTile` từng tòa; kiểm tra cửa kho chỉ cho tiệm chính |
| `map.ts` `isFenceTile`, tường/nền | Dựng vỏ tiệm xôi; bỏ hàng rào phía tây |
| `viewport.ts` tường, bóng, biển | Chọn texture tường cho x < `STORE_BOUNDS.left`; thêm `buildXoiFacade` |
| `shop-lighting.ts` | Thêm đèn tiệm xôi; khóa dựng lại có trạng thái mở |
| `AnalyticsModal.tsx` heatmap | Mở rộng khung sang x=0 |
| `SHOPKEEPER_TILE`, `SHOPKEEPER_POSITION` | Giữ nguyên: chủ tiệm là NPC của quầy tiệm chính; tiệm xôi không có NPC chủ tiệm |
| Điểm bảo vệ `(4*32, 13*32)` | Giữ nguyên: nằm trên lòng đường, không chạm tòa mới |
