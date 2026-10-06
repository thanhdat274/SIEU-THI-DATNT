# Design: Mở rộng tiệm chính theo ô

## Bối cảnh

Đọc code ngày 05/10/2026: `buyLandPlot` (`game-core/src/store-layout.ts`) trừ tiền, thêm id vào `unlockedPlotIds` và **chỉ chạy khi tiệm đóng cửa** (`store_open`). `validateStoreLayout` kiểm nội thất nằm trên sàn (ground 3, không va chạm), nằm trọn một tòa, quầy/kệ có hàng tiếp cận được từ `entranceTile`, cửa kho đi tới được. Server phát lại `buy_plot` trong `serverReplayedCommands` (`apps/server/src/bootstrap.ts`). Cấp tối đa 60 (`MAX_PLAYER_LEVEL`), mốc theo cấp viết dạng bảng như `STAFF_SLOT_MILESTONES` (`game-data/src/progression.ts`).

Sau Bước 1: tiệm chính là `BuildingPlacement` ở lô `lot-center` (x 6..21, y −3..10), biên gốc x 6..13, y 3..10, kho sau tiệm y −3..3.

## Quyết định

### D1. Footprint = tập ô sàn

`BuildingPlacement.floorTiles?: Array<{x, y}>` (tọa độ thế giới) là **ô sàn đã xây thêm** ngoài sàn gốc của mẫu tòa. Footprint = sàn gốc ∪ `floorTiles`. Tường = mọi ô kề 8 hướng của footprint, nằm ngoài footprint và trong lô; cửa giữ theo mẫu tòa (hàng tường dưới của sàn gốc). Vì vậy mở rộng không bao giờ làm mất cửa.

Thay cho nhánh `east-wing` của Bước 1: `generateStarterTileMap` dựng sàn/tường từ footprint, không còn biên chữ nhật cho tiệm chính. `storeBounds` trong `GameTileMap` giữ là **hộp bao** của footprint (để code cũ đọc hộp bao vẫn chạy).

### D2. Ngân sách ô theo cấp (provisional)

`EXPANSION_TILE_MILESTONES` (bảng cộng dồn theo cấp, cùng kiểu `STAFF_SLOT_MILESTONES`):

| Cấp | 5 | 10 | 15 | 20 | 25 | 30 | 35 | 40 | 45 | 50 | 55 | 60 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Ô sàn cộng dồn | 24 | 48 | 60 | 72 | 84 | 90 | 110 | 130 | 150 | 170 | 185 | 200 |

Mốc cấp 5 và 10 bằng đúng số ô sàn mà `east-wing-a` (cấp 5: x 13..16 × y 4..9 = 24 ô) và `east-wing-b` (cấp 10: x 17..20 × y 4..9 = 24 ô) mở ra trước đây, để nhịp tiến độ không đổi. Trần 90 = 48 ô dải đông + 42 ô bãi cỏ phía đông kho (x 14..20 × y −2..3), là toàn bộ chỗ trống trong lô tiệm chính ở vùng đợt 0. Mốc từ cấp 35 trở đi (tới 200) **vượt sức chứa của lô** có chủ đích: phần dư chỉ dùng được khi tòa lấn sang lô trống kề bên (Bước 3 D7b) hoặc đất khai hoang (Bước 4, thưởng thêm 24 ô mỗi đợt). Đây là đường lên hạng Siêu thị (≥ 160 ô sàn) và Đại siêu thị (≥ 240) của Bước 6a. Ở Bước 2, `over_budget` vẫn kiểm theo bảng, nhưng thực tế người chơi chạm trần lô (90) trước.

### D3. Giá theo ô (provisional)

`EXPANSION_TILE_PRICE = 8_000 ₫/ô` (≈ 250.000 ₫ / 32 ô của `east-wing-a`). Bước 4 nhân thêm hệ số mặt tiền; ở Bước 2 hệ số = 1. Tổng giá hiển thị trong preview trước khi xác nhận.

### D4. Luật hợp lệ (một hàm `validateExpansion` dùng chung core/server/UI)

Với tập ô đề xuất `T` thêm vào footprint `F`:
1. `|T| ≥ 1`, không trùng `F`, không trùng nhau.
2. Mọi ô của `T` nằm trong lô của tòa, **không** nằm trên hàng vỉa hè/đường (y ≥ hàng tường dưới của mẫu tòa) và không nằm trong biên kho.
3. Mọi ô của `T` (kể cả hàng tường mới sinh ra) **không đè** biên tối đa của tòa khác đã mua hoặc lô khác. Tòa chưa mua vẫn giữ lô của nó ở Bước 2 (Bước 3 mới bỏ).
4. `F ∪ T` liên thông 4 hướng; mỗi ô của `T` nối được về `F` qua `F ∪ T` (cho phép thêm một mảng ô liền nhau, không bắt buộc từng ô kề trực tiếp `F`).
5. `|T| ≤ ngân sách còn lại`, `money ≥ giá`, tiệm đóng cửa.
6. Sau khi xây: `validateStoreLayout` vẫn hợp lệ (cửa tiệm, cửa kho, quầy/kệ tiếp cận được). Tường mới không đè nội thất: ô tường mới chỉ sinh ra ngoài footprint cũ, mà nội thất chỉ nằm trên sàn cũ, nên đây là kiểm tra phòng hờ.

Mã lỗi: `not_adjacent`, `disconnected`, `outside_parcel`, `blocked_by_building`, `over_budget`, `money`, `store_open`, `path_blocked`.

Một hệ quả: khi hai ô sàn cũ bị ngăn bởi tường cũ (ví dụ tường đông x=13), mở ô ở x=14 sẽ xóa tường x=13 ở hàng đó vì nó không còn là viền footprint. Đúng hành vi `east-wing` hiện có.

### D5. Lệnh `expand_footprint`

Payload: `{ type: 'expand_footprint', buildingId: 'main', tiles: Array<{x, y}>, commandId }`. Core thuần: `expandFootprint(save, buildingId, tiles)` trả `{ save } | { error }`. Thêm vào `serverReplayedCommands` và danh sách lệnh đổi bố cục ở server (cùng nhóm `buy_plot`). `commandId` để gửi lại là no-op, như `buy_plot`. Bước 2 chỉ chấp nhận `buildingId = 'main'`.

### D6. Chế độ quy hoạch (UI)

- Vào từ `StoreLayoutModal` (tab "Mở rộng") hoặc nút trên HUD; bản đồ Pixi bật lớp phủ: ô xanh = hợp lệ ngay, ô xám = trong lô nhưng chưa kề, ô đỏ = bị chặn (có tooltip lý do).
- Click/kéo để chọn; preview vẽ sàn + tường mới mờ ngay trên bản đồ; panel hiện "Đã dùng x/y ô, giá z ₫".
- Xác nhận gửi một lệnh; hủy không tốn gì. Preview gọi cùng `validateExpansion` ở client nên không có trạng thái "client nói được, server nói không" trừ khi save đổi giữa chừng (khi đó server trả lỗi và client làm mới).
- Mobile: chạm để bật/tắt từng ô, không bắt buộc kéo.

### D7. Save

`buildingPlacements[i].floorTiles` (tùy chọn). Migration khi nạp: save có `east-wing-a` → `floorTiles` thêm x 13..16 × y 4..9 (24 ô; cột x=13 là tường đông cũ trở thành sàn); có thêm `east-wing-b` → thêm x 17..20 × y 4..9 (24 ô). Kết quả trùng bản đồ Bước 1. Các ô này **tính vào** ngân sách đã dùng: vì mốc ngân sách trùng mốc cấp của mảnh cũ, người chơi cấp 10 có đủ hai cánh sẽ ở 48/48, không được cộng thêm. Save lỡ vượt ngân sách (sửa tay, dữ liệu lạ) không bị thu hồi ô; chỉ chặn mở thêm. Giữ `east-wing-a/b` trong `unlockedPlotIds` để ngược tương thích client cũ; `buy_plot` cho hai mảnh này bị ẩn khỏi UI và trả `plot_locked` với save mới. Golden Bước 1 phải vẫn khớp sau migration. **Nâng `schemaVersion` lên 5** ở change này vì `floorTiles` làm hình học khác mặc định; migration 4→5 thuần dữ liệu, có test ở `shared`, `apps/web` (`save-file`, `db`), server (`world-migrations`).

### D8. Renderer

Viewport hiện chọn texture tường bằng các nhánh theo `*_BOUNDS` (≈ dòng 631–660). Chuyển sang **auto-tiling** theo 4 ô kề: tường trên/trái/phải/dưới, góc trong/ngoài. Cần thêm texture góc trong (`wall_store_inner_*`) nếu chưa có; vẽ theo phong cách tường vàng hiện có (`textures.ts`). Ánh sáng (`shop-lighting.ts`) dùng footprint thay hộp chữ nhật.

## Rủi ro

- **Auto-tiling tường lộ lỗi hình** ở góc lõm: thêm trang QA so ảnh chữ L, T, U; ghi vào `tổng hợp.md`.
- **Khách/NPC đi xuyên tường mới** do cache đường đi: sau lệnh, gọi cùng đường dựng lại bản đồ như `buy_plot` (`simulation.ts` ≈ 1483) và xóa cache đường đi.
- **Nhịp tiến độ đổi** do người chơi được chọn hình: giữ mốc cấp 5/10 khớp cũ; số còn lại là provisional, ghi rõ.
- **Co-op hai người cùng quy hoạch**: Bước 2 chỉ dựa revision (lệnh sau cùng thấy save mới và có thể bị từ chối). Khóa ô thời gian thực là Bước 5.


## Điều chỉnh khi triển khai (05/10/2026)

Những chỗ làm khác bản thiết kế ở trên (đã làm và đã kiểm; lý do ngắn):

1. **`expand_footprint` là action của `layout_batch`**, không phải lệnh riêng (D5). Lý do: `layout_batch` đã được server phát lại và kiểm bằng cùng `applyStoreLayoutActions`, đã có bản nháp/hoàn tác ở `StoreLayoutModal`; thêm lệnh riêng chỉ nhân đôi đường kiểm. Hệ quả: không có tính idempotent theo `commandId` riêng; gửi lại cùng ô thì lần hai bị `invalid_tiles` (ô đã là sàn) và không trừ tiền.
2. **Migration 4→5 chỉ nâng phiên bản** (D7). Cánh đông cũ ở lại `unlockedPlotIds`; `footprintFloor`/`expansionTilesUsed` hợp nhất chúng với `floorTiles` nên bản đồ và ngân sách đúng như kế hoạch mà không phải đổi dữ liệu người chơi. `buy_plot` cánh đông chỉ bị chặn (`plot_locked`) khi tiệm chính đã có `floorTiles`; UI ẩn chúng khi chưa sở hữu. Chặn hẳn theo schema sẽ làm hỏng test/save cũ đang mua cánh đông.
3. **Vùng mở rộng**: sàn mới phải nằm trong lô tiệm chính thu vào 1 ô (hàng tường nằm trong lô), ngoài nhà kho (`inMainExpansionZone`, x 7..20, y −2..9). Sức chứa 126 ô sàn tối đa (36 gốc + 90). `buildingOfTiles`/`fixtureBuilding` nhận vùng này là tiệm chính; `buildingAt` giữ nguyên.
4. **Quy hoạch trong `StoreLayoutModal`** thay cho lớp phủ Pixi (D6): bảng tiệm chính kéo lên hàng −3 khi vào tab Mở rộng hoặc khi footprint đã lên phía bắc.
5. **Renderer** auto-tiling tường tiệm chính bằng texture có sẵn (chưa có texture góc trong riêng); đèn trần cho sàn mở rộng ở `shop-lighting.ts` và heatmap mở khung theo ô có lượt khách ở `AnalyticsModal`.
6. **Ô lõm kín**: ô không kề sàn nào (giữa các nhánh rộng ≥ 3) là cỏ không tường, khách không tới được; chưa có luật cấm hay lấp.
7. Mã lỗi thêm: `invalid_tiles` (danh sách trống/trùng/quá `MAX_FOOTPRINT_TILES` = 400).
