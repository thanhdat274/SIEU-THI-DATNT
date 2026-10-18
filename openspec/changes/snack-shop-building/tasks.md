# Tasks

Trạng thái 05/10/2026: nhóm 1–3.2 có code; typecheck, `yarn test` game-core, `apps/server test:unit`, `yarn --cwd apps/web build` PASS; đã xem desktop trong Browser pane; các mục còn lại ghi bên dưới.

## 1. Dữ liệu và lõi

- [x] 1.1 `SNACK_BOUNDS`, `SNACK_PLOT_ID`, `SNACK_DEFAULT_FIXTURES`, mái hiên, mảnh bắc (`buildings.ts`, `land.ts`).
- [x] 1.2 Bản đồ, hàng rào, khu trú mưa (`map.ts`, `shelter.ts`); mua tòa (`store-layout.ts`).
- [x] 1.3 Trạm `chao_xao`/`chao_chien`, 2 món, 3 công thức, `SNACK_SHOP_PRODUCT_IDS`; tự bày kệ (`simulation.ts`).
- [x] 1.4 Gọi thêm `snack` (`dining.ts`), cụm ẩm thực (`foodClusterMultiplier`, `customers.ts`), kiểu `StaffBuilding`.

## 2. Giao diện và hình ảnh

- [x] 2.1 Tường, biển `sign_snack`, mặt tiền, đèn (`viewport.ts`, `textures.ts`, `shop-lighting.ts`), `StoreLayoutModal`, `StorePlanogramModal`/`App.tsx`.
- [x] 2.2 Icon 16×16 cho `bap_xao_tp`, `ca_vien_chien_tp` (`pixel-art.ts`).

## 3. Kiểm chứng

- [x] 3.1 `snack-shop.test.ts`; sửa `buildings.test.ts`, `shelter.test.ts`, `drink-customers.test.ts`.
- [x] 3.2 Browser QA desktop: mua tòa, tường, biển, mái hiên, cửa, thu ngân.
- [x] 3.3 (một phần, 05/10/2026) Đã sửa và xem lại bàn (dời lên y=6) và sprite chảo riêng ở zoom 2×, khách thật vào mua. Chưa xem: khách ngồi bàn, mưa/đêm, mobile, co-op.
- [x] 3.4 Cân bằng: đã có `snack-balance-sim.ts` (hoàn vốn ≈ 2,1–2,3 ngày so với quán nước 7,2 ngày → có vẻ quá rẻ); **ĐÃ SỬA 17/10/2026 UPDATE 3:** SNACK_PLOT_ID = **1.200.000** (SNACK_TRAFFIC_SHARE giữ 0,03) → hoàn vốn ≈ **11,2 ngày** (60 ngày, 1.200.000 ÷ ~107k/ngày). Đề xuất: giữ 1.200k (11,2 ngày) hoặc hạ 800k (~7,5 ngày) để gần quán nước.
- [x] 3.5 Việc sau: khách chuyền tòa, khách quen Bé Na, nhân viên riêng, khung giờ bổ trợ. **ĐÃ CHỐT 17/10/2026:** làm cả bốn: khách chuyền tòa, khách quen Bé Na, nhân viên riêng, khung giờ bổ trợ (nhân viên riêng phụ thuộc hệ nhân viên theo ca).

## 3.5 Đã làm UPDATE 3 (17/10/2026 tối)

### (a) Khách chuyền tòa — `CROSS_SELL_RULES`
- Thêm `CrossSellRule` + `CROSS_SELL_RULES` trong `customers.ts`: 4 quy tắc main↔snack (15%/10%), main↔xoi (8%/5%).
- Hàm `shouldCrossSell(customerId, from, to)`: dùng `hashSeed` + `Mulberry32Rng` (giống hệ deterministic khác).
- **Nối vào luồng khách thật:** trong `completeCheckout()` sau khi thanh toán xong, trước khi `stage='leaving'`, check cross-sell. Nếu match → set `pendingCrossSellTo`, `stage='leaving'` (**KHÔNG teleport**).
- Trường `crossSellApplied?: string[]` + `pendingCrossSellTo?: string` trong `CustomerState` (shared) để tránh lặp và chờ chuyển tòa.
- **Trong `update()` tick tiếp theo:** khi customer đến cửa ra (`stage='leaving'`), kiểm `pendingCrossSellTo`. Nếu tòa đích mở + còn hàng → chuyển `buildingId`, xuất hiện ở cửa tòa đích, `stage='to_shelf'`. Nếu không → xóa pending, tiếp tục rời đi.
- Test: `snack-extended.test.ts` kiểm 4 quy tắc, ~15% ±5% tỉ lệ true trên 200 customer + kiểm không teleport.

### (b) Khách quen Bé Na ghé quán ăn vặt
- Thêm `RegularPickResult { regular, preferredBuilding }` thay `RegularCustomerDefinition` trong `pickAvailableRegular()`.
- Nếu `snackShopVisitHours` và giờ hiện tại trong khung → `preferredBuilding='snack'`.
- `maybeSpawnCustomer()` có tham số `regularPreferredBuilding`: nếu có → spawn regular ở preferredBuilding thay vì main.
- Bé Na: thích bap_xao_tp/ca_vien_chien_tp/banh_trang_tron_tp, ghé 16:00–18:00 (giờ tan trường).
- `RegularCustomerDefinition` thêm 3 trường optional: `snackShopProductIds`, `snackShopVisitHours`, `snackShopDialogues`.

### (c) Nhân viên riêng quán ăn vặt — BỎ ROLE `snack_staff`
- **Bỏ `'snack_staff'**` khỏi `StaffRole` type. Dùng `assignedBuilding='snack'` của staff-shifts cho cashier/refill.
- `generateCandidatesForDay()`: không còn 'snack_staff' trong roles pool, buildings pool vẫn có 'snack'.
- Gán tòa 'snack' cho cashier/refill làm qua UI (`assign_staff_building` command).

### (d) Khung giờ bổ trợ — snack đông giờ chiều tối
- `SNACK_SUPPLEMENTARY_HOURS`: 14:00–16:00 ×1.3, 16:00–18:00 ×1.5 (giờ tan học Bé Na).
- `snackSupplementaryMultiplier(hour)` → hệ số áp vào stream factor cho 'snack' trong `maybeSpawnCustomer()`.
- Test: 13→1, 14→1.3, 16→1.5, 18→1, undefined→1.

### Cân bằng: SNACK_PLOT_ID = 1.200.000₫ (giá mới, hoàn vốn ~11,2 ngày)
- SNACK_TRAFFIC_SHARE giữ 0,03.
- snack-balance-sim 12 ngày: lãi ròng tăng +123.471/ngày → hoàn vốn 9,7 ngày.
- snack-balance-sim 60 ngày: lãi ròng tăng +106.699/ngày → hoàn vốn 11,2 ngày.
- Đề xuất: giữ 1.200k (11,2 ngày) hoặc hạ 800k (~7,5 ngày) để gần quán nước.

### Migration + isSaveGameData
- `crossSellApplied?: string[]` + `pendingCrossSellTo?: string` trong CustomerState → optional, save cũ không có vẫn hoạt động.
- `snackShopProductIds/VisitHours/Dialogues` trong RegularCustomerDefinition → optional, không cần migration.
- Không nâng schema.

### Test kết quả
- File mới: `packages/game-core/src/snack-extended.test.ts` (5 nhóm test: rules, Bé Na, no-teleport, snack_staff removed, hourly multiplier).
- Nối `test-runner.ts`: import + call `runSnackExtendedTests()`.
- Sửa `snack-shop.test.ts`: plot cost 400.000→1.200.000.
- **game-core test ×3:** 102/102 pass, 0 fail.
- **server test:unit:** 2/2 pass.
- **server test:coop:** PASS.
- **apps/web test:** PASS.
- **Typecheck:** ✅ EXIT 0 (tsc -b).
- **Golden world:** đã sinh lại `world-golden.json` (384 bản đồ, 10 đường đi) — lần 2 sau SNACK_PLOT_ID = 1.200.000.
- **CHƯA QA:** cross-sell, Bé Na snack shop, snack_staff assignment, supplementary hours — cần playtest.
