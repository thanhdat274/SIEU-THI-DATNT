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

- [ ] 1.1 `managerAccountId`, `nonManagerActions`; kiểm quyền ở server cho lệnh bố cục/giá/nhân viên; test gateway.
- [ ] 1.2 UI gán người phụ trách (chủ hẻm), nhãn tên trên biển tòa.

## 2. Hợp đồng

- [ ] 2.1 `SupplyContract`, lệnh đề xuất/đồng ý/từ chối/hủy; hết hạn 1 ngày; test.
- [ ] 2.2 Thực thi mỗi sáng qua `internal_delivery`, FEFO, giao thiếu, sổ `internal_transfer`; giới hạn 50% tồn.

## 3. Thành tích

- [ ] 3.1 Bảng thành tích theo tòa/người; đối soát tổng lãi; hiển thị ở bảng Thành phố và tổng kết ngày.

## 4. Save, kiểm chứng, tài liệu

- [ ] 4.1 Schema kế tiếp + migration; test.
- [ ] 4.2 `test:coop`, `yarn typecheck`, `yarn test`, `yarn build` PASS (kết quả thật); QA hai trình duyệt theo proposal.
- [ ] 4.3 Cập nhật `tổng hợp.md`, `TASKS.md`, `ROADMAP.md`.
