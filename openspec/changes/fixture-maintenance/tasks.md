# Tasks

Trạng thái 01/10/2026: nhóm 1–4 đã có code; test tự động (`maintenance.test.ts`) PASS cùng `tsc -b` và `yarn test` (7 suite, 0 fail), `yarn build` PASS. Giao diện mới chỉ kiểm được là trang tải không lỗi do thay đổi này; chưa mở được màn Sửa chữa hay thấy kệ hỏng trong trình duyệt.

## 1. Dữ liệu và logic

- [x] 1.1 `StoreFixture.wear/broken`, `isUsableSalesFixture`, loại sổ cái `maintenance`, `DailyRecord.maintenanceCost`, kết quả `fixture_broken` (`shared`).
- [x] 1.2 `MAINTENANCE_RULES`, `fixtureReplacementCost`, `fixtureRepairCost` (`game-data/src/maintenance.ts`).
- [x] 1.3 `wearOvernight`, `listMaintenance`, `maintainFixture`, trạng thái (`game-core/src/maintenance.ts`).

## 2. Mô phỏng

- [x] 2.1 Hao mòn qua đêm trong lệnh sang ngày mới, callback `onMaintenanceNotice`.
- [x] 2.2 `GameSimulation.getMaintenanceList()`, `maintainFixture()`: trừ tiền, sổ cái, chi phí ngày, lãi ròng (cập nhật 8 chỗ tính `netProfit`).
- [x] 2.3 Kệ hỏng: khách không chọn, không châm (`transferToShelf`, `applyPlanogramEntry`, `getRestockJobTargets`), không tính còn hàng.
- [x] 2.4 Lệnh `maintain_fixture` trong giao thức và danh sách lệnh được phép của server.
- [x] 2.5 Test: giá và phí, tính xác định, mở khóa theo cấp, không hỏng dưới ngưỡng, có cả hỏng nhẹ/nặng sau 120 đêm, trạng thái, bảng hành động và từ chối, kệ hỏng với khách/châm hàng, trừ tiền + sổ cái + lãi ròng, mua mới giữ hàng, lưu/tải, qua đêm thật có thông báo, cấp 1 không hao mòn.

## 3. Giao diện

- [x] 3.1 `MaintenanceModal`, nút HUD có điều kiện, toast khi hỏng, dòng sửa chữa ở tổng kết ngày, tint + nhãn kệ hỏng trong renderer.

## 4. Kiểm chứng và còn lại

- [x] 4.1 `tsc -b`, `yarn test`, `yarn build` PASS (01/10/2026, Node 24 qua PATH).
- [ ] 4.2 Browser QA: mở màn Sửa chữa, thấy kệ hỏng tối màu/nhãn, bấm sửa/mua mới/bảo trì, HUD nút xuất hiện/biến mất, desktop và mobile. Chưa làm được vì chưa có kệ hỏng trong save thử và game chưa có công cụ dev ép hỏng (cần thêm).
- [ ] 4.3 Cân bằng: chi phí bảo trì so với doanh thu, ngưỡng và xác suất hỏng, phí sửa.
- [x] 4.4a (02/10/2026) Chỉ báo "đã mòn" ngay trên kệ (vạch hổ phách, `viewport.ts`) và tủ mát hỏng làm hàng lạnh nhanh hỏng (+1 ngày hạn mỗi đêm, test `maintenance.test.ts`).
- [x] 4.4b (02/10/2026) Server phát lại `maintain_fixture` (`world-runtime.test.ts`).
- [ ] 4.4 Còn lại: đưa chi phí vào mô-đun thuế (chờ TAX-0, mô-đun thuế chưa có quy tắc chi phí); bảo trì nhân viên/thợ: 02/10/2026 đã làm bản gộp qua đêm cho nhân viên châm hàng (không hoạt ảnh, không theo ca, chưa có thợ riêng; test `maintenance.test.ts`), chưa kiểm trình duyệt.
- [ ] 4.5 Cập nhật `TASKS.md`/`ROADMAP.md` khi chốt nghiệm thu.
