# Design: Đặt và dời tòa vào lô tự chọn

## Bối cảnh

Sau Bước 1–2 (đọc code + kế hoạch 05/10/2026): bốn lô đợt 0 đều quay mặt xuống vỉa hè đường chính (hàng cửa y=10, vỉa hè y=11–12). Kích thước tính cả tường:

| Lô | x | Rộng | Mẫu tòa vừa lô (rộng tính cả tường) |
|---|---|---|---|
| `lot-west` | 0..6 | 7 | xôi (7), ăn vặt (6) |
| `lot-center` | 6..21 | 16 | tiệm chính (cố định) |
| `lot-east-1` | 21..26 | 6 | ăn vặt (6) |
| `lot-east-2` | 26..35 | 10 | quán nước (10), xôi (7), ăn vặt (6) |

Ghép `lot-east-1` + `lot-east-2` (x 21..35, rộng 15) chứa được quán nước + 5 ô thừa, hoặc xôi + ăn vặt. Vật cản cố định trên vỉa hè hàng 11: cây ở x = 5, 19, 25, 28, 34; cột đèn hàng 12 ở x = 9, 15, 21; quầy vỉa hè (`STALLS`) khi đã mở.

Hiện tại `buyLandPlot` đặt `*_DEFAULT_FIXTURES` (id cố định) khi mua tòa; tòa chưa mua vẫn có vỏ nhà, sàn và cửa bị chặn va chạm (`map.ts`).

## Quyết định

### D1. Mẫu tòa đủ bốn tường; tường trùng nhau hợp nhất

Mọi mẫu tòa phụ có đủ bốn tường riêng. Khi hai tòa kề nhau, ô tường trùng là một ô tường (va chạm như nhau); thuộc tòa nào theo thứ tự ưu tiên `PLACEMENTS`. Tiệm xôi ở vị trí mặc định có tường đông x=6 trùng tường tây tiệm chính, nên bản đồ không đổi (golden Bước 1 vẫn khớp với save mặc định đã mua xôi).

### D2. Vị trí đặt = (lô hoặc nhóm lô kề, gốc x)

Đợt 0 mọi lô có mặt tiền ở đáy, nên gốc y cố định theo hàng cửa y=10; người chơi chọn lô và trượt gốc x trong lô. `BuildingPlacement { buildingId, parcelIds: string[], originX, originY, floorTiles? }`. Nhiều lô chỉ hợp lệ khi các lô kề nhau và đều trống.

### D3. Luật đặt (`validatePlacement`, dùng chung UI/core/server)

1. Biên tòa (gồm `floorTiles` mở rộng và vòng tường) nằm trọn trong hợp các lô được chọn.
2. Không đè biên tòa khác đã mua (trừ ô tường trùng đúng viền, theo D1).
3. Hàng cửa giáp vỉa hè: ô `entranceTile` là vỉa hè đi được, không phải cây, cột đèn, quầy vỉa hè, chỗ đỗ xe.
4. Không có tòa khác đang dùng lô (một lô chỉ thuộc một tòa; tòa lớn có thể dùng nhiều lô).
5. Sau khi đặt, `validateStoreLayout` hợp lệ cho mọi tòa.

Mã lỗi: `parcel_occupied`, `outside_parcel`, `door_blocked`, `parcels_not_adjacent`, `path_blocked`, `money`, `store_open`, `level`.

### D4. Mua tòa = đặt tòa

`buy_plot` cho `building-*` nhận thêm `placement` tùy chọn; thiếu thì dùng vị trí mặc định nếu còn trống, nếu không thì `parcel_occupied`. Nội thất mặc định = mẫu tòa (tọa độ tương đối) + gốc. Id nội thất mặc định giữ nguyên (id cố định chống nhân đôi khi gửi lại).

### D5. Dời tòa (`relocate_building`)

- Payload `{ buildingId, placement, commandId }`; chỉ khi tiệm đóng cửa; không áp dụng cho `main`.
- Phí: `RELOCATION_FEE_RATE = 0.3` × (giá mở tòa + giá các ô `floorTiles`) (provisional).
- Nội thất trong tòa, `floorTiles`, ô phụ (slot children) dịch theo `(dx, dy)`; hàng trên kệ, `assignedProductId`, planogram (theo fixture id) giữ nguyên. Nội thất đang cất (`storedFixtures`) không đổi.
- Tòa vào trạng thái thi công: `placement.constructionUntilDay = day + 1`. Trong lúc thi công: cửa bị chặn, không sinh khách cho tòa, nhân viên gán ở tòa đó đứng chờ ở kho tiệm chính; bản đồ vẽ rào chắn + biển "Đang thi công". Đầu ngày `constructionUntilDay` tòa mở lại.
- Vị trí nhân viên/người chơi đang đứng trong biên cũ được đưa về `WAREHOUSE_ENTRANCE` (cùng cách `simulation.ts` đang làm khi một vùng bị đóng).

### D6. Lô trống

Tòa chưa mua không còn trên bản đồ. Lô trống: nền đất/cỏ đi được cho người chơi, hàng rào thấp ở y=10 như các đoạn không có tiệm, một biển "Đất trống" có tương tác mở chế độ quy hoạch. Khách không vào lô trống. Renderer bỏ vẽ vỏ nhà cửa cuốn.

Đây là **thay đổi hình ảnh có chủ đích** so với golden Bước 1 (save chưa mua tòa phụ). Fixture golden của các tổ hợp "chưa mua" được tạo lại có kiểm duyệt (ghi lý do vào `tổng hợp.md`); các tổ hợp "đã mua ở vị trí mặc định" phải vẫn khớp.

### D7. Mở rộng tòa phụ theo ô

Áp dụng `validateExpansion` (Bước 2) cho mọi tòa: ngân sách chung một quỹ cho tất cả tòa (đơn giản, tránh mỗi tòa một bảng). Mảnh `xoi-north-*`, `drink-north-*`, `snack-north-*` chuyển thành `floorTiles` khi nạp (3 hàng × chiều rộng sàn mỗi mảnh) và tính vào ngân sách đã dùng. Lưu ý: mảnh bắc cũ mua bằng tiền theo giá mảnh, không theo cấp, nên migration có thể làm "đã dùng" vượt ngân sách của cấp hiện tại; theo luật Bước 2, không thu hồi, chỉ chặn mở thêm. Ghi rõ trong UI ("đã vượt ngân sách do chuyển đổi đất cũ").

### D7b. Mở rộng sang lô trống kề bên

Đúng ý gốc của chủ dự án ("mở rộng hướng nào cũng được, miễn góc đó chưa bị cửa hàng khác chiếm"): khi tòa chưa mua không còn chiếm lô (D6), `validateExpansion` cho phép ô mở rộng nằm trong **lô kề đang trống** (không có tòa nào). Lô đó được gắn vào `placement.parcelIds` của tòa khi lệnh thành công, và từ đó lô thuộc tòa này (tòa khác không đặt vào được). Ví dụ: ván chưa mua quán ăn vặt, tiệm chính mở rộng sang `lot-east-1`. Muốn mua quán ăn vặt sau đó thì đặt nó ở lô trống khác. Đất ở đợt khai hoang (Bước 4) phải được sở hữu/thuê trước mới gắn được. Tiệm chính cũng áp dụng luật này (Bước 2 chỉ cho trong lô của nó vì lúc đó tòa chưa mua còn chiếm lô).

### D8. Save schema 6

Migration 5→6: tòa đã mua → `buildingPlacements` mặc định (+ `floorTiles` từ mảnh bắc); tòa chưa mua → không có placement. `unlockedPlotIds` giữ id `building-*` để biết đã mua; vị trí lấy từ placement.

## Rủi ro

- **Code còn giả định tòa ở vị trí cố định** (cốt truyện, khách quen hướng tới tiệm xôi, `STALLS` gần tòa): grep `xoi|drink|snack` có tọa độ sau Bước 1; test khách quen và chương truyện với tòa ở lô khác.
- **Dời tòa làm hỏng bố cục** (nội thất vắt ra ngoài): dời cả khối nên luôn vừa nếu biên vừa; test với `floorTiles` chữ L.
- **Hệ số khách theo vị trí** chưa có (Bước 4): ở Bước 3 vị trí không ảnh hưởng doanh thu; ghi rõ để người chơi không hiểu nhầm.
- **Co-op**: người kia đang đứng trong tòa khi dời: lệnh chỉ chạy khi đóng cửa; avatar trong biên cũ được đưa ra cửa kho; Bước 5 thêm khóa.


## Điều chỉnh khi triển khai (06/10/2026)

1. **Làm theo ba lát**: (A) hình học tòa phụ theo vị trí đặt + mua kèm vị trí + lô trống; (B) dời tòa + thi công. Lát (C) = D7/D7b (mở rộng theo ô cho tòa phụ, mảnh bắc → `floorTiles`, mở sang lô trống kề, ngân sách chung) CHƯA làm.
2. **Hình học nằm trong `GameTileMap.buildings`** (`MapBuilding`: biên, cửa, ô vào cửa, mái hiên, mép nước mưa, `open`), sinh bởi `generateStarterTileMap` từ vị trí đặt. Core/renderer/web đọc từ đó; `buildingAt`/`buildingOfTiles`/`fixtureBuilding`/`entranceOf` nhận `buildings` tùy chọn (thiếu = vị trí mặc định). Tra tĩnh mà quên truyền bản đồ sẽ sai khi tòa đã dời (có test minh họa).
3. **Tòa chưa mua không có vị trí đặt**: `resolvePlacements` chỉ trả tiệm chính + tòa đã mua; save mặc định giữ dạng cũ (không ghi `buildingPlacements`) cho tới khi có vị trí khác mặc định, ô sàn mở rộng hoặc thi công. Mua/dời chỉ ghi các tòa đang có.
4. **Một tòa một lô** (`parcelId`), gốc y cố định (mặt tiền hàng y=10). `parcelIds` nhiều lô để D7b/Bước 4.
5. **Tường chung**: không cờ `sharesEastWall` nữa; tòa dựng theo thứ tự ưu tiên và không đè ô đã có tường (tiệm chính trước), nên hai tòa kề nhau dùng chung đúng một cột tường.
6. **Thi công**: `constructionUntilDay` = ngày + 1 lưu trong vị trí đặt; có cờ là cửa bị chặn và `open: false` (không khách, không mái hiên/đèn); `GameSimulation.update` xóa cờ khi ngày ≥ giá trị. `validateStoreLayout` bỏ qua kiểm "tới được nội thất" cho tòa đang thi công.
7. **Mã lỗi thêm**: `parcel_occupied`, `door_blocked`, `invalid_placement` (cùng `outside_parcel`, `overlap` đã có).
8. **Giao diện**: chọn lô/cột bằng ô chọn ở tab "Mở đất" (không có preview tòa mờ); `placementOptions` cho danh sách hợp lệ.
9. **Lát C (06/10/2026)**: D7 (mở rộng theo ô cho tòa, mảnh bắc → `floorTiles`, ngân sách chung), D7b (mở sang lô kề trống) và 2.4 (tòa thi công không sinh khách; nhân viên gán ở tòa thi công đứng chờ ở kho) đã có code + test.
   - Ngân sách chung: `sharedExpansionBudget` = tổng ô mở rộng của MỌI tòa (cánh đông cũ + `floorTiles`) so với `expansionBudgetAtLevel`; `expandFootprint(save, buildingId, tiles)` nhận tên tòa bất kỳ. Mọi tòa mở rộng sàn được (06/10/2026): tòa phụ có sàn = sàn gốc ∪ `floorTiles`, tường = vòng ô kề (`wallRing`), vùng cấm = ô của tòa khác (`footprintBlockers`). Thực tế ở đợt 0 tòa phụ chỉ lấn được lên phía bắc vì bề rộng tòa = bề rộng lô; lấn ngang cần lô kề trống (D7b, Bước 4).
   - D7b: `adjacentParcels` + `freeParcelIds`; lô kề trống được gắn vào `placement.parcelIds`.
   - Thi công: `MapBuilding.open = false` là nguồn duy nhất cho "tòa đóng" (khách, mái hiên, đèn, cửa chặn). Nhân viên refill gán vào kệ của tòa đó: bỏ gán kệ, trả hàng đang mang, đứng chờ tại `WAREHOUSE_ENTRANCE`, không nhận việc châm kệ khác; thu ngân có quầy trong tòa thi công cũng đứng chờ ở kho. Hết thi công thì trở về nếp cũ.
   - Còn: nhìn bằng mắt trong trình duyệt (ánh sáng đêm, heatmap, mobile thật, co-op hai trình duyệt), hiệu ứng công trường chi tiết. Người chơi đứng trong biên cũ khi dời vẫn không được đưa ra kho (chỗ đó thành đất trống đi được) — chưa xử lý.
   - Dời quán nước ở đợt 0 chưa làm được: quán nước rộng đúng bằng lô đông 2 nên chỉ có một gốc x hợp lệ, `validatePlacement` báo `invalid_placement` cho mọi vị trí khác; chờ tòa nhiều lô (Bước 4).
