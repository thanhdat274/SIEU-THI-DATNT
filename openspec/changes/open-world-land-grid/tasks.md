# Tasks

Trạng thái 05/10/2026 (cuối ngày): nhóm 1–5 có code, golden + typecheck + test core/server unit/web + build PASS. `test:coop` PASS. Còn mở: 1.6 (không còn làm được), 6.2/6.3 (QA trình duyệt mới làm phần xem save thật trên desktop). Thứ tự bắt buộc: nhóm 1 (golden) phải xong trước mọi refactor (đã làm đúng; chưa commit git vì chủ dự án chưa yêu cầu).

## 1. Lưới an toàn golden (trên commit gốc, chưa sửa logic)

- [x] 1.1 Script sinh fixture `packages/game-core/src/__golden__/world-*.json`: bản đồ (ground/walls/collision/storeBounds/buildings) cho mọi tổ hợp đất hợp lệ theo `prerequisitePlotId`, có/không có quầy vỉa hè. (05/10/2026: `world-golden.ts` + `world-golden-gen.ts`, 192 tổ hợp × 2 = 384 bản đồ, lưu dạng sha1.)
- [x] 1.2 Fixture `buildingAt`/`buildingOfTiles` cho mọi ô vùng chơi; `findPath` từ hai mép bản đồ tới ô trong cửa từng tòa đã mở (tổ hợp không mua gì và mua đủ, 10 đường).
- [x] 1.3 Fixture hình học suy ra: `AWNING_SPANS`, `ROOF_EAVES`, `SHELTER_ZONES`, `*_DEFAULT_FIXTURES`, `INITIAL_FIXTURES`, `SHOP_FRONT`, `SHOP_AWNING_PX`, `PLAY_MAP_PX`, `WAREHOUSE_*`, `SHOPKEEPER_*`, `ONLINE_SPAWN_POINTS`, `ENTRANCE_TILE`, `BUILDINGS`, `buildingTop` mọi tổ hợp, lưới hàng rào.
- [x] 1.4 Fixture mô phỏng headless 3 ngày, hạt giống `golden-world`, từ save mặc định và save đủ bốn tòa (khách, doanh thu, lãi, bán theo món, tiền cuối, vị trí nội thất). Chỉ 2 chỗ `Math.random` trong `store-logistics.ts` (hình ảnh xe) nên kết quả lặp lại; đã chạy 2 tiến trình riêng ra cùng kết quả.
- [x] 1.5 `world-golden.test.ts` đọc fixture và so khớp tuyệt đối; thêm vào `test-runner.ts`; chạy PASS trên cây làm việc gốc 05/10/2026 (cây có 82 file sửa chưa commit của phiên trước, coi là nền).
- [ ] 1.6 (chưa làm, 05/10/2026) Chụp ảnh renderer trước refactor: Browser pane mở được trang nhưng không chọn được ô lưu trống (Ô 2) và nút "Bắt đầu tiệm mới" sẽ đặt lại Ô 1 chứa save của chủ dự án, nên dừng. Cần chủ dự án chọn ô trống hoặc cho phép dùng ô nào. (zoom 1× và 0,5×, chưa mua gì / mua đủ, ngày và đêm) bằng Browser pane, lưu vào scratchpad để so sau.

## 2. Mô hình dữ liệu `game-data/src/world/`

- [x] 2.1 `world-grid.ts`: `WORLD_BOUNDS` (x −42..77, y −36..43), `PLAY_REGION` đợt 0 (x 0..35, y −6..15); `map.ts` suy `MAP_WIDTH`/`MAP_HEIGHT`/`MAP_ORIGIN_Y` từ đây.
- [x] 2.2 `parcels.ts`: `LandParcel` (id, rect, wave, frontageRoadId) và bốn lô đợt 0 theo bảng D3.
- [x] 2.3 `building-templates.ts`: `BuildingTemplate` tương đối (kích thước, cửa, ô vào cửa, mái hiên, bố cục mặc định, hướng mở rộng, cờ tường chung, phần phụ kho của `main`).
- [x] 2.4 `placements.ts`: `BuildingPlacement`, `DEFAULT_PLACEMENTS` (thứ tự `main → xoi → drink → snack`), `placementGeometry(placement, ownedPlotIds)`, `validatePlacements`.
- [x] 2.5 `buildings.ts`/`land.ts`: hằng cũ thành giá trị suy ra từ vị trí đặt mặc định; `east-wing-*` và `*-north-*` thành `expansions` (giữ id, giá, cấp). Chạy golden 1.3.
- [x] 2.6 Test đơn vị: mỗi tòa nằm trọn lô; `validatePlacements` bắt tòa trùng, lô không tồn tại, gốc lệch.

## 3. Dựng bản đồ chung

- [x] 3.1 `GameTileMap.originTileX` (mặc định 0) trong `shared`; hàm `tileIndex(map, x, y)`; chuyển mọi `(y - MAP_ORIGIN_Y) * MAP_WIDTH + x` sang hàm này.
- [x] 3.2 `generateStarterTileMap(unlockedPlotIds, ownedStallIds, placements?)` dựng mọi tòa qua một vòng theo vị trí đặt; bỏ ba vòng riêng và nhánh `east-wing`, bỏ cửa gõ cứng 9/10. Chạy golden 1.1–1.2.

## 4. Chuyển người dùng hằng (chạy golden sau mỗi mục)

- [x] 4.1 `customers.ts`: bỏ `ENTRANCE_TILE` cứng, điểm ra theo `PLAY_REGION`, quy tắc "không vào kho" và tốc độ ngoài trời theo hình học của `main`.
- [x] 4.2 `simulation.ts`: điểm `{4*32, 13*32}`, `sideRoom` 15..23, kích thước layout; `store-layout.ts`: kiểm cửa kho, bố cục mặc định khi mua tòa.
- [x] 4.3 `street-traffic.ts`, `store-logistics.ts`: điểm sinh/biến mất theo `PLAY_REGION`.
- [x] 4.4 `neighborhood.ts`, `shelter.ts`: `SHOP_FRONT`, `SHOP_AWNING_PX`, `PLAY_MAP_PX`, `WAREHOUSE_BOUNDS_FOR_SHELTER` suy từ vị trí đặt/vùng chơi.
- [x] 4.5 Hạ tầng đợt 0 (đèn, cây, chỗ đỗ, rãnh, hàng rào, quầy vỉa hè) gom về `world/` dưới dạng dữ liệu đợt 0; `isFenceTile` đọc biên các tòa từ vị trí đặt.
- [x] 4.6 Renderer `viewport.ts` (`FACADES`, biển/đèn lồng/menu quán nước, chọn texture tường) và `shop-lighting.ts` đọc từ `placementGeometry`.
- [x] 4.7 Web: `AnalyticsModal` (khung heatmap), `StoreLayoutModal` (nhãn cửa, hàng mở rộng) đọc từ mô hình.
- [x] 4.8 Grep kiểm: không còn tọa độ tòa tuyệt đối ngoài danh sách ngoại lệ trong `design.md`; ghi kết quả grep vào `tổng hợp.md`.

## 5. Save và server

- [x] 5.1 `shared`: `storeLayout.buildingPlacements?`; chuẩn hóa khi nạp (thiếu → mặc định); kiểm hợp lệ; không nâng `schemaVersion`.
- [x] 5.2 Server `bootstrap.ts` (`mapFor`, `layout_batch`, phát lại `buy_plot`), `world-runtime.ts`, `world-migrations.ts`: truyền vị trí đặt vào `generateStarterTileMap`, từ chối vị trí đặt không hợp lệ. (Làm khác kế hoạch, xem design D5: thiếu trường = mặc định nên `world-runtime`/`world-migrations` không cần đổi; `bootstrap.ts` từ chối save client có `buildingPlacements` khác mặc định/hỏng bằng `placementsProblem`.)
- [x] 5.3 Test: save schema 1–4 không có trường; save có trường mặc định; save có trường sai (server từ chối, client dùng mặc định); `coop-commands.test.ts` phát lại `buy_plot`/`layout_batch` cho cùng kết quả local. (Phần core trong `world-model.test.ts` PASS. `yarn test:coop` PASS 05/10/2026 với MongoDB theo `.env` (gồm ca "placement-moved" bị từ chối bằng `Vị trí đặt tòa không hợp lệ`, revision không đổi, save không nhận trường).)

## 6. Kiểm chứng và tài liệu

- [x] 6.1 `yarn typecheck`, `yarn test`, `yarn build` PASS (ghi kết quả thật). 05/10/2026: typecheck 0 lỗi; `yarn test` (game-core) fail 0, gồm golden thế giới và test mô hình; `apps/server test:unit` PASS; `apps/web test` PASS; `yarn build` PASS. `test:coop` PASS (05/10/2026, MongoDB theo `.env`, gồm ca từ chối vị trí đặt).
- [>] 6.2 So ảnh renderer sau refactor với 1.6; ghi khác biệt (nếu có) và sửa hoặc ghi rõ lý do. (Chưa làm vì 1.6 chưa có ảnh nền. Đã thay mọi số pixel trang trí mặt tiền bằng biểu thức tương đối và đối chiếu bằng tay từng giá trị với số cũ; 05/10: đã nhìn bằng mắt save thật Ô 1 ở zoom 2× và 0,5× trên desktop: mặt tiền 4 tòa, mái hiên, biển, cây, đèn, xe cộ đúng chỗ, không lỗi hiển thị. Không có ảnh trước refactor nên chưa so từng pixel; golden dữ liệu mới là bằng chứng chính.)
- [>] 6.3 Browser QA thủ công: mua lần lượt bốn tòa và mảnh mở rộng, khách vào đúng cửa, nhân viên đi giữa các tòa, lưu/nạp lại. Ghi desktop; mobile và co-op hai trình duyệt ghi riêng nếu chạy được, không suy ra từ unit test.
- [x] 6.4 Cập nhật `tổng hợp.md` (mô hình 4 lớp, trường save mới, giới hạn còn lại), `TASKS.md`, `ROADMAP.md` (lộ trình Bước 2–6 trong `design.md`).

> QA trình duyệt đã chạy (05/10/2026, desktop, nạp save Ô 1 không ghi đè): save cũ nạp được, bản đồ/tòa/khách/xe chạy, giờ trong game tiến, tiền ổn định, không lỗi từ mã dự án trong console (lỗi `focus` đệ quy đến từ mã chèn ngoài, file nguồn không có dòng đó). CHƯA làm: mua mới từng tòa/mảnh mở rộng (sẽ sửa save thật), mobile, co-op 2 trình duyệt. Chủ dự án quyết định có chấp nhận nghiệm thu hay cần các ca này.
