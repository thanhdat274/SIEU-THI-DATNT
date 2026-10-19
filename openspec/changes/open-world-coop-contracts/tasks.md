# Tasks

Trạng thái 07/10/2026: phần THUẦN AN TOÀN của 1.1 (quyền manager), 2.1 (SupplyContract lifecycle), 2.2 (thực thi FEFO/internal_transfer) ĐÃ CÓ CODE (module + test), CÓ NỐI trong test-runner, typecheck workspace PASS; phần đụng shared/server/UI (gán `managerAccountId` lên BuildingPlacement + `nonManagerActions` settings, server gateway, schema kế tiếp D6, UI gán người phụ trách + bảng thành tích D4, `internal_delivery` thật cần 6a D6, test/build/browser) CHỜ MÁY THẬT. Phụ thuộc `open-world-building-types` (6a) + `open-world-coop-land` + `open-world-land-lease` (schema kế tiếp).

**Ghi chú phần thuần vòng 5 đã làm (3 subagent, 07/10/2026):**
- 1.1 THUẦN: `game-core/manager-permission.ts` — `NonManagerActionSetting` allow/vote/deny, `managerDecision` theo D2 (người phụ trách/chủ hẻm luôn được; không người phụ trách như cũ; account khác theo setting), `canSelfAssignManager` (người mở tòa tự thành người phụ trách nếu chưa ai). Test `runManagerPermissionTests` (14/14).
- 2.1 THUẦN: `game-core/supply-contract.ts` — `SupplyContract` + status, `createSupplyContract`/`proposeSupplyContract`/`acceptSupplyContract`/`refuseSupplyContract`/`cancelSupplyContract` (1 bên hủy→ended endDay=day+1, 2 bên→cancelled ngay), `isSupplyContractExpired` (1 ngày game), `dailySupplyCap` (floor 50%), `validateQuantityPerDay`, `resolvedDelivery` (shortfall), `internalTransferLedger` (KHÔNG đổi quỹ). Test `runSupplyContractTests`.
- 2.2 THUẦN: `game-core/supply-execution.ts` — `fefoSelect` (FEFO theo expiryDay, immutable), `dailySupplyExecution` (contract active startDay..endDay, cap 50%, tạo `InternalDelivery`, giảm stock, shortfall reports), `enforceDailyCap`, `applyInternalTransfer` (cộng doanh thu tòa giao / trừ giá vốn tòa nhận, KHÔNG đổi quỹ). Test `runSupplyExecutionTests` (14/14).
- Wire: test-runner nối 3 test (`runSupplyContractTests`/`runSupplyExecutionTests`/`runManagerPermissionTests`). `yarn typecheck` toàn workspace PASS (9.54s); `git diff --check` sạch. Runtime chờ máy thật (`spawn EPERM`; subagent verify bằng node CJS — assert PASS, KHÔNG qua suite chuẩn).
- LƯU Ý nối thật: `acceptSupplyContract` kiểm `by !== proposedBy` mặc định; `acceptingFrom/acceptingTo` là tham số tùy chọn (chưa có `managerAccountId`/BuildingPlacement, D2 — ngoài scope 2.1); cap 50% cần tồn trung bình 3 ngày thật từ kho/save (để server); `supply-contract` và `supply-execution` độc lập PROVISIONAL (chưa import chéo).
- CHỜ MÁY THẬT (chưa làm — ngoài phạm vi sandbox): 1.1 gán `managerAccountId?` lên BuildingPlacement (shared/schema + validatePlacement) + `world.settings.nonManagerActions`; 1.2 UI gán người phụ trách + nhãn tên biển tòa; 2.1 socket đề xuất/đồng ý/từ chối/hủy + receipt + `ending null`; 2.2 nối `internal_delivery` thật (6a D6) + sổ `internal_transfer` lên save + server; 3.1 bảng thành tích D4 (bảng Thành phố + DaySummaryModal); 4.1 schema kế tiếp + migration; 4.2 `test:coop`/`yarn test`/`build`/QA hai trình duyệt; 4.3 docs tổng hợp.

## 0. Quyết định

- [x] 0.1 Chủ dự án chọn D1 (05/10/2026): A, giữ quỹ chung.

## 1. Người phụ trách

- [x] 1.1 **(15/10/2026: HOÀN THÀNH CODE THUẦN)** `managerAccountId`, `nonManagerActions`; kiểm quyền ở server cho lệnh bố cục/giá/nhân viên. Test `runManagerPermissionTests` PASS. CHƯA gán `managerAccountId` lên BuildingPlacement (shared/schema + validatePlacement) + `world.settings.nonManagerActions`.
- [x] 1.2 **(15/10/2026: CÓ CODE)** UI gán người phụ trách (chủ hẻm), nhãn tên trên biển tòa. **CÓ CODE nhưng CHƯA kiểm trình duyệt.**

## 2. Hợp đồng

- [x] 2.1 **(15/10/2026: HOÀN THÀNH CODE THUẦN)** `SupplyContract`, lệnh đề xuất/đồng ý/từ chối/hủy; hết hạn 1 ngày; test `runSupplyContractTests` PASS. CHƯA socket đề xuất/đồng ý/từ chối/hủy + receipt + `ending null`.
- [x] 2.2 **(15/10/2026: HOÀN THÀNH CODE THUẦN)** Thực thi mỗi sáng qua `internal_delivery`, FEFO, giao thiếu, sổ `internal_transfer`; giới hạn 50% tồn. Test `runSupplyExecutionTests` PASS. CHƯA nối `internal_delivery` thật (6a D6) + sổ `internal_transfer` lên save + server.

## 3. Thành tích

- [x] 3.1 Bảng thành tích theo tòa/người; đối soát tổng lãi; hiển thị ở bảng Thành phố và tổng kết ngày. **17/10/2026:** `game-core/building-scoreboard.ts` (`buildingScores`/`managerScores`/`ledgerProfit`) tính từ sổ cái, `internal_transfer` cộng doanh thu tòa giao + giá vốn tòa nhận; tòa chưa gán vào nhóm `chung`. Hợp đồng chạy mỗi sáng giờ lấy lô FEFO thật thành chuyến đang chuyển (trước đây hàng rời kho rồi biến mất) và ghi sổ `internal_transfer` (không đổi quỹ). Co-op: người mở tòa tự thành người phụ trách (`managerAccountId`). UI: mục "Thành tích" trong bảng Thành phố (đã nhìn ở 812×375) + "Thành tích theo người phụ trách" trong tổng kết ngày (khi ≥ 2 nhóm; chưa nhìn bằng mắt). Test `runBuildingScoreboardTests` (đối soát trên sổ mẫu 5 ngày + simulation thật 5 ngày).

## 4. Save, kiểm chứng, tài liệu

- [x] 4.1 Schema kế tiếp + migration; test. **17/10/2026:** schema 12: `supplyContracts[]`, `internalDeliveries[]` (hàng đang chuyển), `BuildingPlacementRecord.managerAccountId?`, sổ `internal_transfer` + `toBuildingInstanceId`; kiểu `SupplyContract`/`InternalDelivery` chuyển sang shared. Migration 11→12 chỉ nâng số (mọi trường tùy chọn); server tự nâng qua `world-migrations`. Test lưu/nạp + migration 11→12; sửa 3 test cũ cứng số 11. **19/10/2026 schema 16 (chưa commit):** `migrateToW16` (không sửa W7–W15) chuẩn hoá hàng đang chuyển: bỏ phần tử hỏng, `totalQty` = tổng `lots`, bỏ `toTarget` lạ; không gộp hàng vào kho nên nạp lại không nhân đôi. Server replay: `WorldRuntime` chạy chuyến như client, snapshot mang chuyến, khởi động lại từ checkpoint giữa chuyến không mất hàng (`world-runtime.test`). Sửa 2 test cứng số 15 (`staff-shifts.test`, `road.test`).
- [ ] 4.2 `test:coop`, `yarn typecheck`, `yarn test`, `yarn build` PASS (kết quả thật); QA hai trình duyệt theo proposal. **CHƯA (sandbox EPERM).**
- [x] 4.3 Cập nhật `tổng hợp.md`, `TASKS.md`, `ROADMAP.md`. **HOÀN THÀNH.**
