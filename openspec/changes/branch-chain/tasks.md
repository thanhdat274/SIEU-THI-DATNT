# Tasks: Chuỗi chi nhánh

Quy ước: chỉ đánh `[x]` khi code và kiểm chứng tương ứng đã chạy thật; ghi kết quả (lệnh, ngày) vào `tổng hợp.md`. Build/test PASS không thay cho browser QA. Không bắt đầu mục 2 trở đi khi các câu hỏi mở ở `design.md` chưa được chủ dự án trả lời.

## 1. Khảo sát và chốt quyết định

- [ ] 1.1 Chủ dự án trả lời 5 câu hỏi mở ở `design.md` (thuế theo chuỗi, chi phí chuyển kho, co-op, giá/cấp/số chi nhánh, đóng chi nhánh); ghi lại vào `design.md`.
- [ ] 1.2 Spike: dựng hai `GameSimulation` từ hai save khác nhau trong một test, chạy luân phiên; đo thời gian dựng và kích thước save một chi nhánh. Xác nhận ngân sách D8 (mỗi chi nhánh < 150 KB; hub + 3 chi nhánh < 1,5 MB). Nếu vượt, quay lại D2.
- [ ] 1.3 Kiểm kê chỗ gắn cứng (`design.md` mục kiểm kê): lập bảng "chỗ nào, xử lý thế nào" cho `playerData.money`, `warehouse`, `recordLedger`, `goals/quests/story`, `App.tsx` `simulationRef`.

## 2. Dữ liệu loại hình và mô hình chuỗi

- [ ] 2.1 `game-data/src/store-types.ts`: `StoreTypeDef`, `STORE_TYPES` với `drink_shop` (mẫu bản đồ, bố cục mặc định, fixture cho phép, danh mục bán); export; mở rộng `tools/content-editor/validate.ts` kiểm tra loại hình.
- [ ] 2.2 `shared`: `ChainState`, `BranchSave`, `LedgerEntry.branchId?`, `SaveGameData.chain?` (tùy chọn, không nâng schema bắt buộc); `validateSaveGameData`/`normalize` chấp nhận thiếu; giới hạn `maxBranches`.
- [ ] 2.3 `game-core/src/chain.ts`: hàm thuần `createChain`, `openBranch`, `switchBranch`, bất biến ví = số dư đầu + tổng sổ cái. Test: save cũ nạp thành chuỗi một cơ sở; mở chi nhánh trừ tiền một lần; idempotent; từ chối thiếu cấp/tiền/quá giới hạn/loại lạ.

## 3. Kho tổng và chuyển kho

- [ ] 3.1 `chain.ts`: `transferStock`/`returnStock` dùng `takeLots`/`mergeLots`; giữ lô, hạn, giá vốn; tất cả hoặc không; kiểm sức chứa chi nhánh. Test: bảo toàn đơn vị và giá trị, FEFO, thiếu hàng/chỗ, idempotent, không âm.
- [ ] 3.2 Nhà cung cấp luôn vào kho tổng khi đang điều khiển chi nhánh; chặn đặt hàng trực tiếp từ chi nhánh.
- [ ] 3.3 Hết hạn/hao hụt áp dụng cho kho chi nhánh, ghi chi phí hao hụt đúng chi nhánh.

## 4. Chạy nền

- [ ] 4.1 `game-core/src/branch-ops.ts`: `runBranchDay` thuần, xác định theo (seed, ngày), theo D5: cầu, bán theo FEFO, giá vốn lô, hao hụt, lương (không âm ví), bán hụt; hệ số nền cấu hình (đề xuất 0,7).
- [ ] 4.2 Nối vào qua ngày của hub; `lastBackgroundDay`/`closedDayIds` chống tính trùng; bắt kịp khi quay lại và bản tóm tắt ngày vắng.
- [ ] 4.3 Test: xác định, idempotent qua lưu/nạp, không bán quá tồn/cầu/công suất, hết hàng ghi bán hụt, ví không âm, chế độ điều hành thắng nền theo hệ số (kiểm thống kê trên nhiều hạt giống), không tự chuyển kho.

## 5. Lệnh, lưu trữ, co-op

- [ ] 5.1 `GameCommandPayload`: `open_branch`, `switch_branch`, `transfer_stock`, `return_stock`; `isGameCommand`, `world-runtime.ts`, `ALLOWED_COMMAND_TYPES` và `serverReplayedCommands` ở `bootstrap.ts`; bất biến ví ở `save-invariants.ts`. Test `coop-commands.test.ts`: lệnh hợp lệ, tiền giả, trùng id.
- [ ] 5.2 Lưu local/cloud/file: save hub chứa chuỗi; kiểm `db.test.ts`, `save-file.test.ts` cho save có chuỗi và kích thước thực tế.
- [ ] 5.3 Co-op: giới hạn chi nhánh ở hẻm một thành viên (hoặc theo quyết định 1.1); test từ chối khi hai thành viên.

## 6. Giao diện

- [ ] 6.1 Bộ chọn chi nhánh (HUD/`BottomBar`), dựng lại simulation khi chuyển, màn tải ngắn.
- [ ] 6.2 Màn tổng quan chuỗi: ví chung, kho tổng, từng chi nhánh (doanh thu hôm qua, hàng sắp hết, bán hụt).
- [ ] 6.3 Hộp thoại chuyển/trả kho nhiều món (hiện hạn dùng, kiểm sức chứa); hộp thoại mở chi nhánh.
- [ ] 6.4 Chế độ ghé qua: mở công cụ bố cục/mua đất cho chi nhánh (tái dùng `StoreLayoutModal`); báo cáo ngày có lọc theo chi nhánh.
- [ ] 6.5 Renderer: bản đồ và biển theo loại hình (tái dùng texture, chỉ thêm biển "QUÁN NƯỚC").

## 7. Tích hợp, thuế, cốt truyện

- [ ] 7.1 Thuế theo quyết định 1.1 (mặc định tổng chuỗi): doanh thu chạy nền cộng vào bản ghi ngày hub có `branchId`; test `taxDueOnClose` với nhiều chi nhánh.
- [ ] 7.2 Chương 7 đo số chi nhánh thật (`buildingsOpened` → `branchesOpened` hoặc mục tiêu mới); save đã nhận chương 7 vẫn giữ trạng thái đã nhận.
- [ ] 7.3 Nhiệm vụ/goals đọc chỉ số chuỗi (định nghĩa rõ: doanh thu tổng chuỗi, khách tổng chuỗi, danh tiếng hub).

## 8. Kiểm chứng và tài liệu

- [ ] 8.1 `yarn typecheck`, `yarn test`, `yarn test:all:db`, `yarn build` PASS bằng kết quả thực tế; ghi lệnh/ngày vào `tổng hợp.md`.
- [ ] 8.2 Browser QA desktop và mobile: mở chi nhánh, chuyển kho, ghé qua sắp xếp, chạy nền qua nhiều ngày, nạp lại; ghi riêng.
- [ ] 8.3 Mô phỏng cân bằng nhiều ngày (giống `xoi-balance-sim.ts`): thu nhập chi nhánh nền so với điều hành, thời gian hoàn vốn, ảnh hưởng của giới hạn số chi nhánh.
- [ ] 8.4 Cập nhật `tổng hợp.md`, `TASKS.md`, `ROADMAP.md`; ghi giới hạn còn lại (loại hình khác, đóng chi nhánh, co-op nhiều người).
