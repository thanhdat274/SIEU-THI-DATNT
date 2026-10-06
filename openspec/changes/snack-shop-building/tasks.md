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
- [ ] 3.4 Cân bằng: đã có `snack-balance-sim.ts` (hoàn vốn ≈ 2,1–2,3 ngày so với quán nước 7,2 ngày → có vẻ quá rẻ); còn lại chỉnh `SNACK_TRAFFIC_SHARE`/giá mở tòa/hệ số cụm và playtest thật.
- [ ] 3.5 Việc sau: khách chuyền tòa, khách quen Bé Na, nhân viên riêng, khung giờ bổ trợ.
