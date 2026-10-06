# Tasks

Trạng thái 05/10/2026 (cuối ngày): nhóm 1–4 có code, test và đã nhìn/thao tác trên desktop; Browser QA (5.2) còn thiếu mobile và co-op hai trình duyệt. `yarn typecheck`, `yarn test`, `apps/server test:unit`, `apps/web test`, `yarn build`, `yarn --cwd apps/server test:coop` PASS. Chưa commit git. Làm khác kế hoạch: xem mục "Điều chỉnh khi triển khai" ở cuối `design.md`.

## 1. Dữ liệu và luật

- [x] 1.1 `world/footprint.ts`: `EXPANSION_TILE_MILESTONES`, `expansionBudgetAtLevel`, `EXPANSION_TILE_PRICE` = 8.000 ₫/ô (provisional). Test mốc cấp 4/5/10/29/35/60 trong `footprint.test.ts`.
- [x] 1.2 `BuildingPlacement.floorTiles`; `footprintFloor` (sàn gốc ∪ cánh đông cũ ∪ `floorTiles`), `wallRing` (ô kề 8 hướng), `tileBox`, `expansionTilesUsed`.
- [x] 1.3 `checkFootprintTiles` (hình học: `empty`/`duplicate`/`outside_parcel`/`blocked_by_building`/`not_adjacent`/`disconnected`) + `expandFootprint` (thêm `over_budget`, `money`, `store_open`, `path_blocked`, `invalid_tiles`). Test từng mã lỗi và hình L; `path_blocked` có ca test (bố cục đã hỏng sẵn → lệnh bị từ chối, không trừ tiền).

## 2. Bản đồ và core

- [x] 2.1 `generateStarterTileMap` dựng tiệm chính từ footprint (một vòng, bỏ nhánh `east`/cánh đông riêng); `storeBounds` = hộp bao sàn + tường. Golden Bước 1: 384 bản đồ, 10 đường đi, hình học, mô phỏng 3 ngày khớp tuyệt đối; riêng lưới `buildingOfTiles` đổi có chủ đích ở vùng mở rộng (test so đúng "chỉ ô trong `inMainExpansionZone` đổi từ '.' thành 'm'").
- [x] 2.2 `expandFootprint` (`store-layout.ts`), `GameSimulation.expandMainFootprint`/`getBuildingPlacements`/`buildTileMap`; map/collision dựng lại qua `applyStoreLayout`; mọi chỗ gọi `generateStarterTileMap` truyền `buildingPlacements`.
- [x] 2.3 `customers.ts`: ô sàn mở rộng phía bắc đi được (luật "không vào kho" nhường ô ground 3 trong `inMainExpansionZone`); đường đi A* từ cửa tới ô mới (đông và bắc), đặt kệ vào đó, và mô phỏng headless: chỉ kệ ở phần mở rộng phía bắc có hàng thì khách vẫn mua được (`customersServed > 0`). Nhân viên đi tới phần mới chưa có test riêng.

## 3. Save và server

- [x] 3.1 Schema 5 (`CURRENT_SAVE_SCHEMA_VERSION`), v1–v4 nạp được. Làm khác kế hoạch: migration chỉ nâng phiên bản; cánh đông `east-wing-a/b` vẫn ở `unlockedPlotIds` và được bản đồ/ngân sách đọc như ô sàn mở rộng đã dùng (không đổi thành `floorTiles`). Test: `persistence.test.ts` (schema 3 và 4 lên 5, tương lai = 6 bị từ chối), `save-file`/`db` ở web, `world-migrations` ở server (PASS).
- [>] 3.2 Cánh đông ẩn khỏi tab "Mở đất" (trừ khi đã sở hữu). `buy_plot` cho chúng trả `plot_locked` CHỈ khi tiệm chính đã có ô sàn mở rộng (không theo schema như kế hoạch) để test/save cũ vẫn mua được; chưa chặn hẳn.
- [x] 3.3 Làm khác kế hoạch: `expand_footprint` là một action của `layout_batch` (đã được server phát lại và kiểm bằng `applyStoreLayoutActions`), không phải lệnh riêng. `coop-commands.test.ts`: thành viên mở rộng 6 ô qua layout_batch (trừ 48.000 ₫, owner thấy), ô ngoài lô bị từ chối, lệnh khác kèm ô sàn giả bị từ chối, revision không đổi; `placementsProblem` kiểm ô sàn đã lưu.

## 4. Giao diện và renderer

- [>] 4.1 Quy hoạch nằm trong `StoreLayoutModal` (tab "📐 Mở rộng": ô xanh = chọn được, `+` = sẽ thành sàn, `▒` = tường mới, ngân sách/giá/lỗi, Xây/Bỏ chọn), KHÔNG phải lớp phủ Pixi như kế hoạch. Desktop: chọn 20 ô hình T, Xây, Áp dụng → tiền trừ đúng 160.000 ₫, "Đã lưu bố cục cửa hàng", IndexedDB có `floorTiles` 20 ô schema 5, tải lại vẫn đúng (`storeBounds` 6..17 × −2..10). Mobile (B2-1, 06/10/2026): chạm/kéo để bật/tắt ô (`onTouchStart`/`onTouchMove` + `touch-action: none` khi quy hoạch; `click` phát lại sau khi chạm bị bỏ qua bằng mốc thời gian). CHƯA thử trên thiết bị chạm thật và co-op hai trình duyệt.
- [x] 4.2 Auto-tiling tường tiệm chính trong `viewport.ts` (`mainWallTexture`, theo ô sàn kề), dùng texture có sẵn (không thêm texture góc trong). Đã nhìn hình L (bản đồ dựng tạm) và hình T (Xây thật) trên desktop; chưa xem U và đủ ngày/đêm.
- [x] 4.3 `shop-lighting.ts`: thêm đèn trần mỗi ô lưới 3×3 trên sàn mở rộng (`mainExtraLights`, khóa dựng lại gồm số đèn); `AnalyticsModal` heatmap mở khung theo vị trí đặt tòa + mọi ô có lượt khách (`heatmapFrame` rút ra thành hàm thuần, test ở `analytics.test.ts`). Đã typecheck/build/test; còn phải NHÌN bằng mắt ánh sáng đêm của phần mới và heatmap trong trình duyệt (B2-3/B2-4).

## 5. Kiểm chứng và tài liệu

- [x] 5.1 05/10/2026: `yarn typecheck` 0 lỗi; `yarn test` (game-core) fail 0, gồm `footprint.test.ts` mới, golden thế giới, `world-model.test.ts`; `apps/server test:unit` PASS; `apps/web test` PASS; `yarn build` PASS; `yarn --cwd apps/server test:coop` PASS (Mongo theo `.env`).
- [>] 5.2 Browser QA desktop: hình L (dựng tạm), Xây thật hình T + Áp dụng + lưu + tải lại. 06/10/2026: tab "📐 Mở rộng" có chạm/kéo cho điện thoại (B2-1) và khung heatmap tính theo vị trí đặt tòa (B2-4, có test thuần `heatmapFrame`). CHƯA làm: nhìn bằng mắt ánh sáng đêm (B2-3) và heatmap trong trình duyệt, thiết bị chạm thật, co-op hai trình duyệt, save cũ có hai cánh trong trình duyệt (chỉ có test dữ liệu).
- [x] 5.3 Cập nhật `tổng hợp.md`, `TASKS.md`, `ROADMAP.md`.
