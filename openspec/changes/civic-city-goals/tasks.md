# Tasks: civic-city-goals (Mục tiêu thành phố + Sổ góp xóm)

## 0. Chốt với chủ dự án
- [x] 0.1 Mỗi ô hàng có ≥ 2 loại thay thế. **Đã chốt 16/10/2026.**
- [x] 0.2 Hàng góp phải còn hạn ≥ 1 ngày (`BUNDLE_MIN_SHELF_DAYS = 1`). **Đã chốt 16/10/2026.**
- [x] 0.3 Tiền chỉ vào ô "Quỹ xây dựng", không mua thẳng ô hàng. **Đã chốt 16/10/2026.**

## 1. Mục tiêu thành phố
- [ ] 1.1 Loại điều kiện `civic_building_count`, `district_qol_at_least`, `total_population_at_least` + evaluator thuần; test.
- [ ] 1.2 Mục tiêu xóm phố cấp 4–10, thưởng `revealBundleId`; validate catalog.
- [ ] 1.3 Không hồi tố với cấp đã qua; test tải save.

## 2. Sổ góp xóm — dữ liệu + core
- [ ] 2.1 `game-data/world/civic-bundles.ts` (4 trang cho 4 công trình) + `validateCivicBundles()`; export.
- [ ] 2.2 `game-core/civic-bundles.ts`: kiểm tra hợp lệ, nhận phần thiếu, trừ kho FIFO, hoàn thành; test thuần.
- [ ] 2.3 Lệnh `donate_to_bundle` + server replay; test từ chối (chưa hiện, sai hàng, thiếu kho, sắp hết hạn, đã xong).
- [ ] 2.4 `LedgerEntryType` `civic_donation` (giá vốn) + báo cáo; test sổ cái.
- [ ] 2.5 Schema kế tiếp + migration `civic.bundles`; test `isSaveGameData`.
- [ ] 2.6 Hoàn thành sổ → mở loại công trình + giảm phí xây; đổi điều kiện mở ở change 1; nhật ký mốc.

## 3. UI
- [ ] 3.1 Tab "Sổ góp xóm": danh sách trang, trang chi tiết, bảng góp; hiển thị người góp.
- [ ] 3.2 Thông báo khánh thành. Audit P0/P1/P2, QA 7 viewport.

## 4. Kiểm tra
- [ ] 4.1 Sweep giá trị trang ≈ 1–2 ngày lãi; `city-goals-sim` cấp 10 chậm ≤ 20%; ghi số thật vào `tổng hợp.md`.
- [ ] 4.2 `yarn typecheck`, `yarn test`.
- [ ] 4.3 QA trình duyệt: góp đủ một trang → mở công trình; co-op 2 client góp chung một trang.

- [ ] 4.4 Co-op: quyền góp hàng/tiền, phiếu chi lớn ô quỹ, hai người góp cùng ô một lúc, ghi công từ phiên server; test replay + QA 2 client.
