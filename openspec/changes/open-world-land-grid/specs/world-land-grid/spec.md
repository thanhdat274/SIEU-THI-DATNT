# Spec Delta

## Purpose

Thế giới được mô tả bằng bốn lớp dữ liệu: lưới thế giới, lô đất, vị trí đặt tòa và nội thất. Bốn tòa hiện có được đặt theo lô với hình học suy ra từ mẫu tòa, và hành vi game không đổi so với trước refactor.

## ADDED Requirements

### Requirement: World bounds and play region
Hệ thống SHALL khai báo biên thế giới 120×80 ô trong hệ tọa độ thế giới hiện có, và một vùng chơi (đợt khai hoang 0) nằm trọn trong biên đó. Vùng chơi đợt 0 SHALL trùng bản đồ chơi hiện tại (x 0..35, y −6..15).

#### Scenario: Play region inside world
- **WHEN** đọc `WORLD_BOUNDS` và `PLAY_REGION`
- **THEN** `WORLD_BOUNDS` rộng 120 ô, cao 80 ô, chứa trọn `PLAY_REGION`, và `MAP_WIDTH`/`MAP_HEIGHT`/`MAP_ORIGIN_Y` bằng giá trị suy ra từ `PLAY_REGION` (36, 22, −6)

### Requirement: Land parcels
Hệ thống SHALL khai báo lô đất là chữ nhật ô có id, đợt khai hoang và đường giáp mặt tiền. Đợt 0 SHALL có đúng bốn lô chứa trọn biên tối đa của bốn tòa hiện có.

#### Scenario: Each building fits its parcel
- **WHEN** lấy biên tối đa của mỗi tòa từ vị trí đặt mặc định
- **THEN** biên đó nằm trọn trong rect của lô được gán

### Requirement: Building placement geometry
Biên, biên tối đa, ô cửa, ô vào cửa, mái hiên và bố cục mặc định của mỗi tòa SHALL được suy ra từ mẫu tòa (tọa độ tương đối) cộng gốc vị trí đặt. Với vị trí đặt mặc định, mọi giá trị suy ra SHALL bằng hằng số hiện tại.

#### Scenario: Default placement reproduces legacy constants
- **WHEN** suy hình học cho `main`, `xoi`, `drink`, `snack` từ vị trí đặt mặc định với mọi tổ hợp đất hợp lệ
- **THEN** kết quả bằng đúng `MAIN_STORE_BOUNDS`/`XOI_BOUNDS`/`DRINK_BOUNDS`/`SNACK_BOUNDS`, `doorTiles`, `entranceTile`, `buildingTop`, `AWNING_SPANS`, `ROOF_EAVES` và `*_DEFAULT_FIXTURES` của commit gốc

### Requirement: Unified tile map generation
`generateStarterTileMap` SHALL dựng mọi tòa qua cùng một đường theo danh sách vị trí đặt, không có nhánh riêng theo id tòa, và đầu ra SHALL khớp golden của commit gốc.

#### Scenario: Golden tile maps
- **WHEN** dựng bản đồ cho mọi tổ hợp đất hợp lệ, có và không có quầy vỉa hè
- **THEN** ground, walls, collision, storeBounds và buildings khớp tuyệt đối fixture golden

#### Scenario: Building lookup unchanged
- **WHEN** gọi `buildingAt` và `buildingOfTiles` cho mọi ô của vùng chơi
- **THEN** kết quả khớp golden, kể cả các ô tường chung x=6, 21, 26

### Requirement: No absolute building coordinates in logic
Logic khách, nhân viên, bố cục, giao thông, renderer và giao diện SHALL đọc hình học tòa từ vị trí đặt và phạm vi bản đồ từ `PLAY_REGION`, trừ các ngoại lệ liệt kê trong `design.md`.

#### Scenario: Customer entrance from placement
- **WHEN** khách chọn tòa để vào
- **THEN** ô đích là `entranceTile` suy ra từ vị trí đặt của tòa đó, không phải hằng `{9, 11}`

#### Scenario: Map edges from play region
- **WHEN** khách rời đi hoặc xe/người đi đường được sinh ra
- **THEN** điểm ra/sinh tính từ `PLAY_REGION`, không từ `MAP_WIDTH` gõ trực tiếp trong logic

### Requirement: Save normalization
Save SHALL có trường tùy chọn `storeLayout.buildingPlacements`. Khi nạp, save thiếu trường SHALL được điền vị trí đặt mặc định; `schemaVersion` SHALL không đổi trong change này.

#### Scenario: Legacy save loads unchanged
- **WHEN** nạp save schema 1–4 không có `buildingPlacements`, có hoặc không có tòa phụ và cánh đông
- **THEN** save được chuẩn hóa với vị trí đặt mặc định, bản đồ dựng ra khớp golden của cùng tổ hợp đất

#### Scenario: Invalid placements rejected by server
- **WHEN** client gửi save có `buildingPlacements` trùng tòa, lô không tồn tại hoặc gốc không khớp lô
- **THEN** server từ chối, giữ nguyên save hiện tại

### Requirement: Behaviour parity
Với cùng save và cùng chuỗi lệnh, mô phỏng headless SHALL cho cùng kết quả trước và sau refactor, ở cả chế độ local và co-op (server phát lại lệnh).

#### Scenario: Seeded multi-day simulation
- **WHEN** chạy mô phỏng 3 ngày với hạt giống cố định từ save mặc định và từ save đã mua đủ bốn tòa
- **THEN** doanh thu, số khách phục vụ, tồn kho cuối và vị trí nội thất khớp golden

#### Scenario: Co-op replay parity
- **WHEN** server phát lại `buy_plot` và `layout_batch` trên save không có `buildingPlacements`
- **THEN** save kết quả giống local, và `buildingPlacements` (nếu được ghi) là mặc định
