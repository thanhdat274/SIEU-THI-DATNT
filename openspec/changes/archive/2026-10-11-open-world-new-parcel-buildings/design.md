# Design: Đặt tòa lên lô đợt mới

## Hiện trạng (đọc code 11/10/2026)

- `world/parcels.ts`: `LAND_PARCELS` = 4 lô W0 (`wave: 0`, hàng y −3..10, rộng 7/15/5/9). `PARCEL_MAP` chỉ có 4 lô đó. Lô đợt mới chỉ tồn tại trong `RECLAMATION_WAVES[*].parcels` (dạng thô, không có `wave`).
- `world/placements.ts` `validatePlacement`: tra `PARCEL_MAP`; `geo.bounds.bottom !== DEFAULT_GEOMETRY.main.bounds.bottom` → `front_row`; `rectContains(parcel.rect, maxBounds)` → `outside_parcel`; ô trước cửa không có cây (`TREE_PROPS`).
- `validatePlacements`/`placementsProblem`/`layoutBuildings` cũng tra `PARCEL_MAP`.
- `game-core/reclamation.ts` đã có resolver `parcelFromWaveParcels(parcelId)` (PARCEL_MAP rồi lô trong đợt) dùng cho mua lô.
- `game-core/store-layout.ts` `placementOptions` chỉ duyệt `LAND_PARCELS`; `relocateBuilding`/`expandFootprint` tra `PARCEL_MAP`.
- Hạ tầng đợt (`wave-infrastructure.ts`) và biển lô (`viewport.ts`) đã vẽ cho lô thô; tòa chưa được dựng trên lô này.

## Quyết định đã chốt (11/10/2026)

Chủ dự án chọn **hướng A: nới lô lên cao 8 hàng**. Khi làm với dữ liệu thật:

- **W1/W3 (đường chính): lô y 3..10**, hàng mặt tiền y=10 *đúng bằng W0* (vỉa hè y 11–12, bó vỉa y 13 nằm dưới, trong vùng đợt y 3..15). Không cần `frontRow` theo lô và không còn chồng lên vỉa hè như lô cũ y 8..12 → Q2 không cần làm cho W1/W3; `validatePlacement` giữ `front_row` cố định.
- **Kích thước lô mới (PROVISIONAL, chờ duyệt bảng):** W1 `w1-corner` x 42..51 (10×8, chứa quán nước) + `w1-east` x 52..60 (9×8); W3 `w3-1` x 61..70 (10×8) + `w3-2` x 71..76 (6×8, chỉ quán ăn vặt vừa). W1 từ 3 lô xuống 2 lô, id `w1-east-1/2` → `w1-east`.
- **Luật vừa lô:** lô W0 (cao 14 hàng) chừa chỗ cho hàng mở rộng phía bắc nên dùng `maxBounds`; lô đợt mới chỉ đòi hộp gốc `bounds` (`parcelFitBounds`), mở rộng bắc ở lô mới được kiểm riêng bằng `checkFootprintTiles`.
- **W2/W4 (đường nam) — chọn hướng 2 (11/10/2026): bỏ một hàng vỉa hè.** Giữa đường chính (lòng đường y 13–15) và đường nam (bó vỉa y 25) chỉ có y 16..24 = 9 hàng. Lô W2/W4 = **y 16..23 (8 hàng)**, chỉ còn **một hàng vỉa hè y=24** (hàng cửa), hàng mặt tiền y=23. Region W2/W4 mở rộng thành **y 16..25** (hàng 25 = bó vỉa, đồng thời là hàng biên bản đồ chặn) để hàng cửa y=24 đi được — nếu không hàng y=24 là biên bản đồ và khách không tới được cửa. Bản đồ lớn nhất giờ 77×32 (không phải 77×31).
- **Hàng mặt tiền = đáy lô:** `validatePlacement` đòi `bounds.bottom === parcel.rect.y1` (W0/W1/W3: 10; W2/W4: 23) và `placementOriginY(buildingId, parcelId)` cho gốc y; dời tòa giữa hai hàng mặt tiền dịch cả nội thất và ô sàn mở rộng theo `dy`.
- **Kích thước lô W2/W4 (PROVISIONAL):** W2 `w2-1` x0..9 (10), `w2-2` x10..17 (8), `w2-3` x18..25 (8), `w2-4` x26..35 (10); W4 `w4-corner` x42..51 (10), `w4-2` x52..59 (8), `w4-3` x60..67 (8), `w4-4` x68..76 (9).
- **Hệ quả cần biết:** tòa trên đường nam không có vỉa hè phía bắc cho đường chính (lô sát lòng đường chính y 15); W4 chỉ tới được khi W1/W3 (hoặc W2) đã mở vì khách đi bộ sinh ở hai mép bản đồ y=12.

## Quyết định cần chốt (chủ dự án) — bản gốc

### Q1. Hình học lô đợt mới

Mẫu tòa cao 8 hàng (gồm tường), rộng 6–10. Lô hiện tại cao 5. Ba hướng:

| Hướng | Nội dung | Ưu | Nhược |
|---|---|---|---|
| A (đề xuất) | Nới lô theo hướng bắc đến cao 8 (W1/W3: y 5..12; W2/W4: y 17..24), nới ngang tối thiểu bằng tòa nhỏ nhất (≥ 6) và ghi rõ lô nào chứa tòa nào | Giữ mẫu tòa và `validatePlacement` gần như nguyên, tòa trông giống W0 | Chồng lên hạ tầng/vỉa hè y 11–12 của W1/W3 (đã ghi ở 0.2 của land-reclamation), phải chỉnh `wave-infrastructure.ts` và vùng đợt |
| B | Thêm mẫu tòa "thấp" (5 hàng) riêng cho lô đợt mới | Không đổi lô | Hai bộ mẫu tòa, hai bộ tài nguyên hình ảnh; spec tòa phình ra |
| C | Cho tòa lấn lô kề phía bắc trong cùng đợt (`parcelIds`, D7b của building-relocation) | Tận dụng cơ chế sẵn có | Tòa 8 hàng vẫn vượt vùng đợt; phụ thuộc lô phía bắc là đất trống |

Đề xuất A, kèm bảng kích thước mới do chủ dự án duyệt trước khi sửa dữ liệu.

### Q2. Hàng mặt tiền

Thay `front_row` cố định bằng hàng mặt tiền **theo lô**: `LandParcel.frontRow` (W0 = 10, W1/W3 = 12 nếu nới theo A, W2/W4 = 24). `validatePlacement` đòi `geo.bounds.bottom === parcel.frontRow`. W0 giữ y=10 nên golden không đổi. `originY` của tòa = `frontRow − (height − 1)`.

### Q3. Tra cứu lô thống nhất

Một hàm `resolveParcel(id)` ở `@game/data` (PARCEL_MAP trước, rồi lô trong đợt, gắn `wave`, `frontage`, `frontRow`) thay các chỗ tra `PARCEL_MAP` trong `placements.ts`, `store-layout.ts`, `reclamation.ts`. `LAND_PARCELS` giữ nguyên là 4 lô W0 (golden); thêm `ALL_PARCELS` cho `placementOptions`.

### Q4. Tile map, hạ tầng, renderer

`generateTileMapForWaves(openedWaves)` phải đặt `BuildingInfo` (cửa, mái hiên, sàn) cho tòa trên lô mới; hạ tầng đợt (vỉa hè/đèn/cây/chỗ đỗ) phải tránh ô tòa chiếm và ô cửa. Renderer (`viewport.ts`) đang vẽ tòa phụ theo `tileMap.buildings` nên phần lớn tự chạy; kiểm biển lô ẩn khi có tòa (đã có) và tọa độ mái hiên/biển hiệu theo `originY` khác.

### Q5. Khách

Điểm sinh/đích của khách tới tòa đặt trên lô mới theo `walkEdgeWest/East` và `buildingParcelTrafficMultiplier` (đã có). Cần kiểm đường đi từ vỉa hè đợt mới tới cửa, đặc biệt lô mặt đường nam (W2/W4) có cửa quay lên hướng nào.

### Q6. Co-op/server

`buy_plot` có sẵn `placement { parcelId, originX }` và danh sách lệnh phát lại; server dùng cùng `validatePlacement`, nên chỉ cần dữ liệu lô thống nhất (Q3). Thêm test `coop-commands.test.ts` cho đặt tòa trên lô đợt mới.

## Rủi ro

- Đổi hình học lô đụng `reclamation-data.test.ts`, `reclamation-map.test.ts`, test hạ tầng đợt và biển lô — phải sửa test theo số mới (không nới lỏng kiểm tra).
- Chồng lô lên vỉa hè (Q1-A) cần chốt thứ tự ưu tiên vẽ để không che hạ tầng.
- Mô phỏng cân bằng (`drink/xoi-balance-sim.ts`) hiện dùng lô tổng hợp; chuyển sang lô thật làm đổi số — ghi rõ là provisional.
