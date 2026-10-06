# Design: Nền móng thế giới mở — lưới lô đất và tòa đặt theo lô

## Bối cảnh

Tầm nhìn chủ dự án chốt ngày 05/10/2026 (tham khảo thêm phân tích ChatGPT do chủ dự án chia sẻ): game là mô phỏng kinh doanh/đời sống thế giới mở, có yếu tố xây thành phố nhẹ. Người chơi kiểm soát đất, tòa nhà và nội thất của mình; thế giới tự kiểm soát đường, nhà dân, NPC và giao thông. **Không** biến thành city-builder thuần.

Change này là Bước 0 + Bước 1 của lộ trình bên dưới: khảo sát và dựng mô hình dữ liệu, **không đổi gameplay**.

## Khảo sát hiện trạng (05/10/2026, đọc code, chưa chạy)

Hệ tọa độ thế giới: ô 32 px, ô (0,−6) là góc trên-trái bản đồ chơi; vỉa hè hàng 11–12; đường chính hàng 13–15. Bản đồ chơi 36×22 (x 0..35, y −6..15). Khu phố trang trí (`neighborhood.ts`, `NEIGHBORHOOD_TILES`) đã trải x −44..80, y −38..44 (≈124×82 ô), chỉ để vẽ và cho NPC nền đi, không có va chạm và không nằm trong save.

Nhóm A, **gắn với tòa nhà** (phải đọc từ vị trí đặt):

| File | Chỗ gõ cứng |
|---|---|
| `game-data/src/buildings.ts` | `MAIN_STORE_BOUNDS`, `MAIN_STORE_MAX_RIGHT`, `XOI_/DRINK_/SNACK_BOUNDS`, `doorTiles`/`entranceTile` trong `BUILDINGS`, `AWNING_SPANS`, `ROOF_EAVES`, `*_DEFAULT_FIXTURES` (tọa độ tuyệt đối), `WAREHOUSE_BOUNDS_FOR_SHELTER` |
| `game-data/src/map.ts` | `SHOPKEEPER_TILE`, `STORE_BOUNDS`, `isFenceTile`, `WAREHOUSE_*` (kho gắn sau tiệm chính), `INITIAL_FIXTURES`, cửa `x !== 9 && x !== 10`, cánh đông `17`/`21`, bốn vòng dựng tòa riêng, `DEFAULT_INITIAL_SAVE.player.position`, `ONLINE_SPAWN_POINTS` |
| `game-data/src/land.ts` | `east-wing-a/b` có `tiles` tuyệt đối; `*-north-a/b` gắn hướng bắc qua `buildingTop` |
| `game-data/src/neighborhood.ts`, `shelter.ts` | `SHOP_FRONT`, `SHOP_AWNING_PX`, `PLAY_MAP_PX` |
| `game-core/src/customers.ts` | `ENTRANCE_TILE {9,11}`, quy tắc `y > STORE_BOUNDS.top`, tốc độ ngoài trời theo `STORE_BOUNDS.bottom` |
| `game-core/src/simulation.ts` | `{x: 4*32, y: 13*32}` (≈ dòng 2232), `sideRoom` 15..23 (≈ 3497), kích thước layout theo `STORE_BOUNDS` (≈ 5272) |
| `game-core/src/store-layout.ts` | kiểm cửa kho theo `STORE_BOUNDS.top` (≈ 150–155), mặc định bố cục khi mua tòa |
| `game-renderer/src/viewport.ts` | `FACADES`, biển/đèn lồng/menu quán nước theo `DRINK_BOUNDS` và số `28`, chọn texture tường theo từng `*_BOUNDS` (≈ 631–660) |
| `game-renderer/src/shop-lighting.ts` | ~36 chỗ dùng biên tòa cho vùng sáng |
| `apps/web` | `AnalyticsModal` (khung heatmap), `StoreLayoutModal` (nhãn cửa, `NORTH_EXPANSION_ROWS`) |

Nhóm B, **hạ tầng thế giới cố định** (đường cố định theo đợt khai hoang, nên vẫn là tọa độ tuyệt đối, chỉ gom về dữ liệu của đợt 0): `STREET_LAMP_TILES`, `TREE_PROPS`, `STREET_PARKING_SPOTS`, `CAR_PARKING_SPOTS`, `ROAD_PROFILE`, `STORM_DRAINS`, `STALLS`, đường/ngã tư/khu phố trong `neighborhood.ts`.

Nhóm C, **phạm vi bản đồ** (phải đọc từ vùng đang chơi): `MAP_WIDTH` dùng làm điểm ra của khách (`customers.ts` ≈ 328, 424), điểm sinh xe/người (`street-traffic.ts` ≈ 146, 224, 361, 396), điểm xuất phát xe giao hàng (`store-logistics.ts` ≈ 76).

Phía server: `apps/server/src/bootstrap.ts` dựng bản đồ bằng `generateStarterTileMap(unlockedPlotIds)` (`mapFor`), kiểm `layout_batch` bằng `validateStoreLayout`, phát lại `buy_plot`. `world-runtime.ts` cũng dựng bản đồ từ `unlockedPlotIds`. Nghĩa là **toàn bộ hình học hiện được suy ra từ `unlockedPlotIds`**. Đây là điểm thuận lợi: chỉ cần thêm vị trí đặt vào đầu vào của hàm dựng bản đồ.

## Mục tiêu / Không mục tiêu

Xem `proposal.md`. Tóm tắt: dựng mô hình 4 lớp, chuyển nhóm A và C sang đọc mô hình, gom nhóm B thành dữ liệu đợt 0, chuẩn hóa save, giữ hành vi y hệt.

## Quyết định

### D1. Mô hình 4 lớp

```
World Grid      WORLD_BOUNDS (120×80) ⊃ playRegion (vùng đã khai hoang, đợt 0 = 36×22 hiện tại)
   │            + hạ tầng theo đợt (đường, vỉa hè, đèn, cây, chỗ đỗ)
Land Parcel     id, rect ô, wave (đợt khai hoang), frontage (đường giáp mặt), trạng thái mở/sở hữu
   │
Building        BuildingTemplate (kích thước, cửa, mái hiên, bố cục mặc định — TỌA ĐỘ TƯƠNG ĐỐI)
Placement       + BuildingPlacement { buildingId, parcelId, origin: {x, y}, expansions }
   │
Interior        storeLayout.fixtures (giữ nguyên, tọa độ thế giới tuyệt đối)
```

Đặt ở `packages/game-data/src/world/` (mới): `world-grid.ts`, `parcels.ts`, `building-templates.ts`, `placements.ts`. `buildings.ts` và `map.ts` giữ export cũ (đường cũ vẫn import được) nhưng giá trị được **suy ra** từ mô hình mới, để giảm số file phải sửa trong một đợt.

### D2. Giữ hệ tọa độ thế giới hiện tại

Không dịch gốc tọa độ. `WORLD_BOUNDS = { x0: -42, x1: 77, y0: -36, y1: 43 }` (120×80 ô), chứa trọn bản đồ chơi hiện tại (x 0..35, y −6..15) và gần trùng khu phố trang trí. Lý do: nội thất, vị trí người chơi/NPC trong save là tọa độ tuyệt đối; dịch gốc sẽ phải migrate mọi tọa độ, rủi ro cao mà không có lợi.

Hệ quả: ô có thể có tọa độ âm. Mọi mảng ô (`groundData`, `collisionLayer`) vẫn đánh chỉ số theo `playRegion` (gốc `x0`, `originTileY`), không theo `WORLD_BOUNDS`. Đợt 1 chỉ có `playRegion.x0 = 0`, nên **`GameTileMap` cần thêm `originTileX`** (mặc định 0) để các đợt sau mở rộng sang tây được. Bước 1 chỉ thêm trường và dùng ở các hàm chỉ số; giá trị luôn 0.

### D3. Lô đất (parcel) là chữ nhật dữ liệu, không phải lưới đều

Bốn tòa hiện có kích thước khác nhau (7, 16, 6, 10 ô ngang) và dùng chung tường. Lưới lô đều (ví dụ 8×8) không khớp hình hiện tại mà không đổi gameplay. Vì vậy lô đất là **chữ nhật ô khai báo trong dữ liệu**, có thể khác kích thước. Bước 2 sẽ thêm "ô mở rộng" ở mức từng ô bên trong/kề lô.

Lô đợt 0 (khớp hiện trạng, tính cả tường):

| Lô | Rect (x, y) | Tòa mặc định |
|---|---|---|
| `lot-west` | x 0..6, y −3..10 | `xoi` (gốc theo `XOI_BOUNDS`, chừa 2 mảnh bắc) |
| `lot-center` | x 6..21, y −3..10 | `main` (gồm cánh đông; kho phía sau y −3..3 thuộc lô này) |
| `lot-east-1` | x 21..26, y −3..10 | `snack` |
| `lot-east-2` | x 26..35, y −3..10 | `drink` |

Tường chung (x=6, 21, 26) thuộc về **cả hai lô** ở mức hình học; quy tắc ưu tiên của `buildingAt` hiện có (thứ tự `main → xoi → drink → snack`) được giữ nguyên bằng thứ tự trong `PLACEMENTS`. Golden test khóa hành vi này.

### D4. Mẫu tòa dùng tọa độ tương đối

`BuildingTemplate` khai báo theo gốc = góc trên-trái của biên **gốc** (chưa mở rộng): kích thước, ô cửa, ô vào cửa, khoảng mái hiên, bố cục mặc định, các hướng mở rộng hiện có (`north` × 3 hàng/mảnh; `east` cho tiệm chính). `placementGeometry(placement, ownedPlotIds)` trả về biên hiện tại, biên tối đa, cửa, ô vào cửa, mái hiên, tất cả bằng tọa độ thế giới. Các hằng cũ (`XOI_BOUNDS`, `BUILDING_MAP.xoi.doorTiles`, `AWNING_SPANS.xoi`, `XOI_DEFAULT_FIXTURES`…) trở thành giá trị suy ra từ vị trí đặt mặc định, nên **trùng số với hiện tại**.

Mảnh mở rộng cũ (`east-wing-a/b`, `*-north-a/b`) giữ id và giá, chuyển thành `expansions` của vị trí đặt (hướng + số ô), không còn `tiles` tuyệt đối. Tên mảnh và điều kiện cấp không đổi.

### D5. Save: thêm trường tùy chọn, chuẩn hóa khi nạp, chưa nâng schema

- Thêm `storeLayout.buildingPlacements?: Array<{ buildingId; parcelId; originX; originY }>` (`BuildingPlacementRecord` ở `shared`, kiểm hình dạng trong `isSaveGameData`).
- **Đã làm khác lúc lập kế hoạch (05/10/2026, khi triển khai):** thiếu trường = vị trí đặt mặc định, nên KHÔNG ghi trường vào save và không cần migration ở `world-migrations`. Ở bước này chỉ vị trí đặt **mặc định** được chấp nhận (`placementsProblem` trong `world/placements.ts`): logic khách/nhân viên vẫn đọc hình học mặc định, nên một save sửa tay đổi chỗ tòa sang lô khác (ví dụ quán ăn vặt rộng 6 ô vừa lô tây 7 ô) sẽ làm bản đồ lệch hành vi. Client: `normalizePlacements` bỏ vị trí khác/hỏng và dùng mặc định. Server (`bootstrap.ts`, nhánh save do client gửi): từ chối với "Vị trí đặt tòa không hợp lệ". Bước 3 mới cho vị trí khác mặc định.
- **Không nâng `schemaVersion`** trong change này (giống cách tiệm xôi thêm `unlockedPlotIds` tùy chọn). Lý do: vị trí đặt luôn là mặc định nên save cũ và mới tương đương; nâng schema làm vỡ tương thích ngược với client cũ đang chạy co-op mà không có lợi. Bước 2 (`open-world-main-expansion`, thêm `floorTiles`) là lúc hình học đầu tiên có thể khác mặc định → nâng schema lên 5 ở đó; Bước 3 (dời tòa) nâng lên 6.
- Sở hữu: vẫn là `unlockedPlotIds` (một doanh nghiệp chung trong co-op, đúng mô hình hiện có). Trường `ownerId` theo người chơi để dành cho Bước 5, không thêm bây giờ.

### D6. Dựng bản đồ bằng một đường chung

`generateStarterTileMap(unlockedPlotIds, ownedStallIds, placements = DEFAULT_PLACEMENTS)`:
1. Nền + hạ tầng đợt 0 (vỉa hè, đường, hàng rào, cây) — như cũ.
2. Với mỗi vị trí đặt theo thứ tự ưu tiên: dựng sàn/tường/cửa từ hình học suy ra; chưa mở thì chặn sàn và cửa (như hiện tại).
3. Kho sau tiệm chính: kho thuộc mẫu tòa `main` (phần phụ phía bắc), suy ra từ vị trí đặt của `main`.
4. Quầy vỉa hè (stalls) — như cũ.

Ba vòng riêng cho xôi/quán nước/ăn vặt và nhánh `east-wing` gộp vào bước 2. Đặc thù hiện có phải giữ đúng: tiệm xôi không có tường đông riêng (vòng tiệm xôi dùng `x < right`, dùng tường x=6 của tiệm chính), các tòa khác dùng `x <= right`; ở renderer (`viewport.ts` ≈ 639), quán ăn vặt không vẽ texture tường trái khi tiệm chính đã mua đủ cánh đông. Mẫu tòa khai báo các khác biệt này bằng cờ (`sharedWalls`) thay vì `if` theo id.

### D7. Lưới an toàn golden

Trước khi sửa bất kỳ dòng nào, thêm `packages/game-core/src/world-golden.test.ts` cùng fixture JSON sinh từ code hiện tại:
- Bản đồ (ground/walls/collision/storeBounds/buildings) cho **mọi tổ hợp đất hợp lệ** (tôn trọng `prerequisitePlotId`), kèm 0 và đủ quầy vỉa hè.
- `buildingAt(x, y)` và `buildingOfTiles` cho mọi ô của bản đồ.
- `findPath` từ điểm ra hai mép bản đồ tới `entranceTile` của từng tòa đã mở.
- Mô phỏng headless 3 ngày với hạt giống cố định (dùng runner của `*-balance-sim.ts`): doanh thu, số khách, tồn kho cuối, vị trí nội thất.
- Tham số hình học suy ra (`AWNING_SPANS`, `ROOF_EAVES`, `*_DEFAULT_FIXTURES`, `SHOP_FRONT`, `WAREHOUSE_*`).

Sinh fixture bằng một script riêng chạy trên commit gốc; test sau refactor phải khớp tuyệt đối. Nếu phải đổi fixture thì đó là thay đổi gameplay và nằm ngoài phạm vi.

### D8. Vùng chơi (playRegion) thay `MAP_WIDTH` ở logic

Nhóm C đọc `PLAY_REGION` (x0, x1, y0, y1) thay vì `MAP_WIDTH`. `MAP_WIDTH`/`MAP_HEIGHT`/`MAP_ORIGIN_Y` vẫn export, suy ra từ `PLAY_REGION`, để test cũ không phải sửa hàng loạt.

## Lộ trình sau change này (định hướng, chưa làm)

| Bước | Nội dung chính | Phụ thuộc |
|---|---|---|
| 2 | Ngân sách ô mở rộng theo cấp, tự chọn hướng; ô mới kề footprint, liền khối, không đè lô/tòa khác, không băng qua đường; chế độ quy hoạch (preview miễn phí); footprint không chữ nhật cho tiệm chính trước | change này |
| 3 | Đặt/dời tòa vào lô tự chọn (mặt tiền phải giáp vỉa hè); dời = tái quy hoạch có phí + 1 ngày thi công, tòa đóng cửa; nội thất dời theo; nâng schema 6 (Bước 2 nâng 5) | 2 |
| 4 | Khai hoang theo đợt: mở thêm vùng chơi trong 120×80 cùng đường của đợt; tự sinh cây/đèn/vỉa hè/NPC theo số lô; hệ số giá đất và khách theo mặt tiền/ngã tư; kiểm hiệu năng renderer/pathfinding | 3 |
| 5 | Co-op: sở hữu theo người chơi trên cùng thành phố, khóa ô khi xác nhận, server xử lý theo thứ tự lệnh; đất chung | 4 |
| 6a–6d | `open-world-building-types`, `open-world-land-lease`, `open-world-coop-contracts`, `open-world-districts-city-goals` | 4–5 |

## Rủi ro và giảm thiểu

- **Refactor lớn làm lệch hành vi tinh vi** (thứ tự `buildingAt`, tường chung, `x < right` của tiệm xôi): golden D7 trước khi sửa; chuyển từng nhóm, chạy golden sau mỗi nhóm.
- **Renderer không có unit test hình ảnh**: chụp ảnh trước/sau ở cùng giờ game, cùng save cho bốn trạng thái (chưa mua gì / mua đủ) ở zoom 1× và 0,5×; so bằng mắt và so pixel nếu làm được. Ghi kết quả vào `tổng hợp.md`.
- **Co-op lệch phiên bản**: không nâng schema, trường mới tùy chọn; server luôn chuẩn hóa trước khi dựng bản đồ; thêm test `coop-commands` cho save không có/ có `buildingPlacements`.
- **Phạm vi phình**: mọi thứ thuộc Bước 2+ bị từ chối trong change này, kể cả "tiện tay".
- **`originTileX` tác động nhiều chỗ chỉ số mảng**: chỉ thêm và dùng qua một hàm `tileIndex(map, x, y)`; grep mọi `* MAP_WIDTH + x` và `(y - MAP_ORIGIN_Y) * MAP_WIDTH` để chuyển.

## Ngoại lệ được phép giữ tọa độ tuyệt đối sau refactor

- Dữ liệu hạ tầng đợt 0 (nhóm B) trong `game-data/src/world/`.
- Vị trí đặt mặc định (`DEFAULT_PLACEMENTS`) và rect lô đợt 0.
- Fixture golden và test cũ đang khẳng định tọa độ cụ thể.
- `INITIAL_FIXTURES` của save mặc định (là nội thất, tọa độ thế giới).
- Điểm xuất hiện nhân viên bảo vệ `{4×32, 13×32}` trong `simulation.ts` (`hireStaff`): nằm trên vỉa hè/đường của hạ tầng đợt 0, không thuộc tòa nào.
- Kiểm tra "phòng kho bên hông" x 15..23 trong `simulation.ts` (`hydrateStock`): chỉ để chuyển save rất cũ có kho đặt ở cánh đông, không phải hình học hiện tại.
- Hàng vỉa hè y=12 nơi khách đi bộ xuất hiện/rời đi (`customers.ts`): hạ tầng đường cố định theo đợt.
- Bãi bốc dỡ hàng trên vỉa hè (`LOADING_DOCK_CONFIG` ở `logistics.ts`, vạch sơn x 16.5..20 trong `viewport.ts` `buildLoadingDock`) và quầy vỉa hè (`STALLS` ở `stalls.ts`): hạ tầng vỉa hè đợt 0.
- `game-data/src/east-decor.ts`: không được export hay import ở đâu (code chết), không ảnh hưởng game.

Kết quả grep 05/10/2026 (mẫu `left/right/top/bottom: số`, `{x: số*32}`, `tileX/tileY: số`, `x === 9|10|13|17|21`, `x !== 9|10` trên `game-core`, `game-data`, `game-renderer`, `apps/web`, `apps/server`, bỏ test, `world/`, golden, mô phỏng cân bằng): chỉ còn các mục trong danh sách ngoại lệ này.

## Câu hỏi mở

Không có câu hỏi chặn. Giả định đã ghi: kích thước lô bằng biên tòa hiện tại, không nâng schema, sở hữu vẫn theo doanh nghiệp chung.
