# Tasks: civic-buildings-qol

## 1. Dữ liệu
- [ ] 1.1 `game-data/world/civic.ts` + `CIVIC_DEFS` + `validateCivicDefs()`; export qua index.
- [ ] 1.2 Thêm 4 `BuildingTypeId` + `BuildingTypeDef` (`category: 'civic'`, không station/nhân viên); footprint vừa lô có thật.

## 2. Core
- [ ] 2.1 `game-core/civic-qol.ts`: `computeCivicQol` thuần + test (trong [0,100], giảm theo khoảng cách, chống trùng, trần, tất định).
- [ ] 2.2 `open_building` nhận loại civic; chặn khi chưa đủ cấp / thiếu tiền; test lệnh + replay server.
- [ ] 2.3 Nối `ward_police` vào `security.ts` qua tham số; test xác suất có trần.
- [ ] 2.4 Golden: save không công trình → kết quả mô phỏng 30 ngày không đổi.

## 3. Hình + UI
- [ ] 3.1 Mặt tiền 4 công trình (ưu tiên asset Kenney/LimeZu).
- [ ] 3.2 Tab "Xóm phố" (QoL theo khu, công trình) — audit P0/P1/P2, QA 7 viewport.

## 4. Kiểm tra
- [ ] 4.1 `yarn typecheck`, `yarn test`; ghi kết quả thật vào `tổng hợp.md`.
- [ ] 4.2 QA trình duyệt: xây công viên, QoL khu tăng; co-op 2 client thấy cùng QoL.

- [ ] 5.1 Co-op: thêm civic vào bảng quyền, phiếu chi lớn khi > 30% quỹ, khóa giữ chỗ; test replay + QA 2 client.
