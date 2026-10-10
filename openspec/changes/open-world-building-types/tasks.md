# Tasks

Trạng thái 07/10/2026: phần THUẦN AN TOÀN của các task 1.1, 2.2b(D9), 2.3, 5.1(D8)/schema9 ĐÃ CÓ CODE (module + test), CÓ CỨU trong test-runner, typecheck workspace PASS; phần refactor 1.2 `BuildingId→string` + 2.1 pipeline + 2.2 renderer + D5/D6/D7 + build/browser QA CHỜ MÁY THẬT (không an toàn trong sandbox vì không chạy được renderer/browser/golden test). Phụ thuộc `open-world-land-reclamation` (mở đang làm, renderer/browser của nó cũng chờ máy thật).

**Ghi chú phần thuần vòng 3 đã làm (4 subagent, 07/10/2026):**
- 1.1 THUẦN: `game-data/world/building-types.ts` — `BuildingTypeDef` registry + 4 loại cũ + 4 loại mới (grocery_branch/cafe/parking_lot/com_restaurant, PROVISIONAL theo D4); KHÔNG đổi kiểu `BuildingId` hiện tại (refactor 1.2 để sau). Test `runBuildingTypesTests`.
- 2.2b/D9 THUẦN: `game-data/world/store-tiers.ts` — 5 hạng theo diện tích sàn (<60 ×1.0 … ≥240 ×1.7, ngưỡng Siêu thị >160, chốt >126), `storeTierFromFloorTiles` (clamp maxTier), `storeTierTrafficMultiplier`. Test `runStoreTiersTests`.
- 2.3 THUẦN: `game-core/building-types-balance-sim.ts` — mô phỏng PROVISIONAL 4 loại mới + hạng D9 (peak giờ theo D4, parking không khách quầy nhưng doanh thu xe >0). Test `runBuildingTypesBalanceSimTests`.
- 5.1/D8 THUẦN: shared `typeId?: string` optional + validator + `migrateToW9` (map main→grocery_main…, không ghi đè custom, buildingId lạ giữ nguyên); bump `CURRENT_SAVE_SCHEMA_VERSION` 8→9; gọi migrateToW9 sau W8; `isSaveGameData` nhận 1–9 (thêm `!== 8`). Đã sửa `schema8.test.ts` (assert 8→9 để không fail runtime). Test `runSchema9Tests`.
- Wire: game-data index export building-types + store-tiers (module + test); test-runner nối 4 test (runBuildingTypesTests/runStoreTiersTests/runSchema9Tests/runBuildingTypesBalanceSimTests). `yarn typecheck` toàn workspace PASS; `git diff --check` sạch. Runtime chờ máy thật `yarn --cwd packages/game-core test` (sandbox spawn EPERM; các subagent verify logic bằng node strip-types/CJS — assert PASS, KHÔNG qua suite chuẩn).
- CHỜ MÁY THẬT (chưa làm — ngoài phạm vi sandbox): 1.2 refactor `BuildingId→string` + `buildingPlacements[].typeId` (đụng buildings/sim/customers/staff/viewport/shop-lighting/UI modal/renderer ~20+ file); nối `FIXTURE_SHOP.allowedBuildings` theo typeId + `FIXTURE_SHOP.minTier` (tiers); 2.1 `open_building` pipeline + server replay; 2.2 hình ảnh/renderer 4 loại; D5 sổ cái/báo cáo theo tòa (`buildingInstanceId`); D6 giao hàng nội bộ (`internal_delivery`); D7 cốt truyện ch7 (`buildingsOpened` → đếm grocery_branch + tòa W1+); `yarn test`/`build`/browser QA (2 quán nước + 3 loại mới) + co-op.

## 1. Registry và instance

- [ ] 1.1 `BuildingTypeDef` + registry (gộp `STORE_TYPES`); 4 loại cũ khai báo lại, golden PASS.
- [ ] 1.2 `BuildingId` → string; `buildingPlacements[].typeId`; grep và thay mọi so sánh id cố định (`buildings.ts`, `store-layout.ts`, `simulation.ts`, `customers.ts`, `staff*.ts`, `viewport.ts`, `shop-lighting.ts`, `StoreLayoutModal`, `StorePlanogramModal`, `App.tsx`).
- [ ] 1.3 `FIXTURE_SHOP[].allowedBuildings` theo typeId; lọc món kệ theo `productFilter` của loại.

## 2. Mở tòa và loại mới

- [ ] 2.1 Lệnh `open_building` (+ bí danh `buy_plot building-*`); id nội thất `${instanceId}_${key}`; server phát lại; test.
- [ ] 2.2 `grocery_branch`, `cafe` (trạm pha + công thức), `parking_lot` (phí xe, hiệu ứng bán kính qua `arrival-mode`), `com_restaurant` (bếp + bàn ăn có sẵn, món cơm); hình ảnh tối thiểu (biển, mái hiên, màu).
- [ ] 2.2b Hạng cửa hàng theo diện tích (D9): `tiers` trong loại tòa, biển theo hạng, hệ số khách/sức chứa, `FIXTURE_SHOP[].minTier`; test ngưỡng và không giảm khi dời.
- [ ] 2.3 Mô phỏng cân bằng bốn loại mới và các hạng (`*-balance-sim.ts`), ghi số provisional.

## 3. Sổ cái, báo cáo, cốt truyện

- [ ] 3.1 `buildingInstanceId` trên sổ cái và `DailyRecord`; `AnalyticsModal` lọc theo tòa.
- [ ] 3.2 Chương 7 đếm chi nhánh theo D7, không tụt tiến độ save cũ.

## 4. Giao hàng nội bộ

- [ ] 4.1 `internal_delivery`: thời gian theo quãng đường, trạng thái đang chuyển, FEFO; nhân viên châm dùng cho tòa > 30 ô.

## 5. Save, kiểm chứng, tài liệu

- [ ] 5.1 Schema 9 + migration 8→9 ở `shared`, `apps/web`, server; test.
- [ ] 5.2 Viết lại `branch-chain` (đánh dấu phần đã chuyển vào đây, đóng phần bản đồ riêng).
- [ ] 5.3 `yarn typecheck`, `yarn test`, `yarn build` PASS (kết quả thật); Browser QA hai quán nước, ba loại mới; co-op.
- [ ] 5.4 Cập nhật `tổng hợp.md`, `TASKS.md`, `ROADMAP.md`.
