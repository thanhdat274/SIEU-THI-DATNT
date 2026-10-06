# Tasks

Trạng thái 05/10/2026: mới có kế hoạch, chưa có code. Phụ thuộc `open-world-land-reclamation` xong.

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
