# Design: Loại tòa theo dữ liệu và nhiều tòa cùng loại

## Bối cảnh

- `game-data/src/buildings.ts`: `BuildingId` 4 giá trị, `BUILDING_MAP`, `BUILDING_TRAFFIC_SHARE`, `FOOD_CLUSTER_TRAFFIC_MULTIPLIER`, `*_DEFAULT_FIXTURES`; `FIXTURE_SHOP[].allowedBuildings` giới hạn trạm theo id tòa; `SNACK_SHOP_PRODUCT_IDS`, `DRINK_SHOP_PRODUCT_IDS` giới hạn món theo kệ.
- `store-layout.ts` kiểm mỗi tòa phụ đã mở có quầy thu ngân; `buyLandPlot` chọn bố cục mặc định theo `plot.buildingId`.
- `store-types.ts`: `STORE_TYPES` (quán nước, `baseDailyDemand`, `maxBranches`) và `BRANCH_PRICE_MODES`, `BRANCH_MANAGER` cho mô hình chạy nền đã bỏ.
- Sau Bước 1–5: tòa là `BuildingPlacement` theo lô, có `floorTiles`, mua bằng lệnh có `placement`.

## Quyết định

### D1. Registry loại tòa

`BuildingTypeDef { id, name, template (Bước 1), defaultFixtures (tương đối), allowedStationIds, productFilter, trafficShare, unlockLevel, openCost, maxInstances, hasCheckout, effects? }`. Gộp `STORE_TYPES` vào đây (giữ export cũ trỏ sang registry tới khi xóa hẳn mô hình chạy nền). `FIXTURE_SHOP[].allowedBuildings` đổi thành danh sách **typeId**.

### D2. Instance thay id cố định

`BuildingInstance { instanceId, typeId }` lưu trong `buildingPlacements` (thêm `typeId`). Kiểu `BuildingId` thành `string`. Bốn instance cũ: `main`/`grocery_main`, `xoi`/`xoi_shop`, `drink`/`drink_shop`, `snack`/`snack_shop`. Instance mới có id `${typeId}-${n}`. Mọi `if (id === 'xoi')` đổi thành kiểm `typeId` hoặc thuộc tính của loại (grep danh sách trong tasks).

Id nội thất mặc định của instance mới: `${instanceId}_${fixtureKey}` để mua lặp không nhân đôi và hai chi nhánh không trùng id.

### D3. Mua tòa = chọn loại + lô

Lệnh `open_building { typeId, placement, commandId }` thay `buy_plot` cho tòa (giữ `buy_plot building-*` như bí danh cho 3 loại cũ để client cũ còn chạy). Kiểm cấp, tiền, `maxInstances`, lô đã sở hữu (Bước 4), luật đặt (Bước 3).

### D4. Bốn loại tòa mới (provisional)

| Loại | Cấp | Giá | Tối đa | Ghi chú |
|---|---|---|---|---|
| `grocery_branch` chi nhánh tạp hóa | 32 | 1.500.000 | 3 | Rộng 8×8, cùng danh mục tiệm chính trừ đồ lạnh lớn; không có kho riêng |
| `cafe` quán cà phê | 34 | 1.200.000 | 2 | Trạm pha (mới, dùng hệ sản xuất), bàn ngồi; nhịp khách cao 6–10 h |
| `parking_lot` bãi giữ xe | 24 | 600.000 | 2 | Không quầy hàng; thu phí theo xe; tòa trong bán kính 12 ô nhận +15% khách đi xe (mô hình `arrival-mode` có sẵn) |

| `com_restaurant` quán cơm/nhà hàng | 40 | 2.000.000 | 2 | Dùng lại hệ trạm bếp + bàn ăn + dọn bàn có sẵn (như xôi/ăn vặt); món cơm phần, khách đông 11–13 h và 17–20 h |

Cấp 32 cho chi nhánh khớp câu trả lời `branch-chain` (cấp 32/1.500.000 ₫/tối đa 3).

### D9. Hạng cửa hàng theo diện tích (tiệm nhỏ → siêu thị)

Mọi tòa bán lẻ (tiệm chính, chi nhánh) có **hạng** suy từ số ô sàn footprint (Bước 2), không phải chọn riêng: 

| Hạng | Ô sàn | Hệ số nhịp khách | Đạt được bằng |
|---|---|---|---|
| Tiệm tạp hóa | < 60 | ×1,0 | sàn gốc + cánh đông đầu |
| Cửa hàng tiện lợi | 60–99 | ×1,15 | mở rộng trong lô |
| Siêu thị mini | 100–159 | ×1,3 | mở rộng gần kín lô (lô tiệm chính tối đa 126 ô sàn) |
| Siêu thị | 160–239 | ×1,5 | **bắt buộc lấn sang lô trống kề bên** (Bước 3 D7b) |
| Đại siêu thị | ≥ 240 | ×1,7 | **siêu rộng**: chiếm hai lô kề trở lên hoặc đất khai hoang; nghĩa là phải dời tòa phụ đi chỗ khác hoặc xây ở đợt mới |

Chủ dự án chốt 05/10/2026: ngưỡng Siêu thị phải **lớn hơn 126** (diện tích tối đa trong lô tiệm chính) để siêu thị là mục tiêu lớn, buộc người chơi quy hoạch sang lô bên cạnh. Số khác vẫn provisional. Ngân sách ô đủ cho các hạng này nhờ bảng mở rộng tới cấp 60 (Bước 2 D2) và thưởng khai hoang (Bước 4 D6): tối đa 36 + 200 + 4×24 = 332 ô. Hạng là dữ liệu trong `BuildingTypeDef.tiers`, mỗi hạng mở:
- Tên/biển hiệu mới trên mặt tiền (renderer đổi biển theo hạng).
- Sức chứa khách đồng thời và nhịp sinh khách của tòa (hệ số theo bảng trên), để **tiệm to thì đông khách thật**, không chỉ thêm chỗ đặt kệ.
- Mở khóa nội thất theo hạng: quầy thu ngân thứ 2–3, tủ đông lớn, kệ khu gia dụng (dữ liệu `FIXTURE_SHOP` có trường `minTier`).
Hạng không bao giờ giảm do dời tòa (dời giữ nguyên footprint). Từ hạng Siêu thị mini mới mở `com_restaurant`; từ hạng Siêu thị mở quầy dịch vụ và quầy thu ngân thứ 3; Đại siêu thị mở khu đồ gia dụng lớn và cửa phụ thứ hai (điều kiện thêm cho D4, provisional).

### D5. Sổ cái và báo cáo theo tòa

Mỗi dòng sổ cái bán hàng/chi phí có `buildingInstanceId` (tùy chọn; dòng cũ thiếu coi là `main`). `DailyRecord` thêm bảng con theo tòa. `AnalyticsModal` có bộ lọc theo tòa. Thuế giữ tính trên tổng (đúng câu trả lời `branch-chain`: thuế tổng chuỗi).

### D6. Hàng cho tòa xa

Kho chung vẫn một (câu trả lời `branch-chain`: kho tổng dùng chung). Kệ ở tòa cách kho > 30 ô không được châm trực tiếp: nhân viên châm tạo **chuyến giao nội bộ** (`internal_delivery`), mất thời gian theo quãng đường, hàng ở trạng thái "đang chuyển" (tính FEFO, không bán được). Người chơi tự xách vẫn được (đi bộ thật). Tòa trong 30 ô giữ hành vi cũ.

### D7. Chương 7

`buildingsOpened` đổi thành đếm instance loại `grocery_branch` + tòa ở đợt ≥ W1 (định nghĩa chi nhánh), ghi rõ trong `story.ts`; save đang ở chương 7 được giữ tiến độ cũ (không tụt).

### D8. Save schema 9

`buildingPlacements[].typeId`; migration 8→9 điền typeId cho 4 instance cũ; sổ cái cũ không đổi.

## Rủi ro

- **Grep sót `BuildingId` cố định** gây lỗi ẩn: bật `noImplicitAny` sẵn có, đổi kiểu thành string có brand, dựa typecheck + golden.
- **Hai tòa cùng loại tranh khách**: nhịp khách theo tòa, mỗi instance có dòng khách riêng như mô hình hiện tại (thêm tòa = thêm khách); cân bằng bằng mô phỏng.
- **Chuyến giao nội bộ phức tạp**: nếu quá tải, bản đầu chỉ mô phỏng thời gian chờ, không vẽ xe.
