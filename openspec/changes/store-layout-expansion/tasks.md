# Tasks: Sắp xếp nội thất và mở rộng mặt bằng

## 1. Khảo sát map và chốt quy tắc

- [x] 1.1 Audit tile map hiện tại; hai plot 4×8 phía đông trong bản đồ 26×22, giữ nguyên hẻm/cửa/kho và tạo tường mới.
- [x] 1.2 Thêm plot data `east-wing-a/b`, adjacency, giá/level đề xuất; kho fixtures là fixed, cashier không cất được. Giá chưa được balance/playtest.
- [x] 1.3 Chuẩn rotation 0/90/180/270 và footprint chia sẻ qua `getFixtureDimensions`; core, collision, customer routing, avatar interaction và renderer dùng cùng kích thước xoay.

## 2. Core layout domain và validation

- [x] 2.1 Thêm `unlockedPlotIds`/`storedFixtures`, runtime validation ID/rotation/tọa độ/bounds/overlap/ownership trong shared/core.
- [x] 2.2 Thêm `packages/game-core/src/store-layout.ts` dùng footprint chuẩn, map floor/door, occupancy và BFS access; UI/server gọi cùng operations.
- [x] 2.3 Thêm pure batch operations move/store/retrieve/buy; giữ fixture ID, hàng/lô/planogram; cất fixture giải phóng target nhân viên.
- [x] 2.4 Validate cashier, kệ có hàng, warehouse door và fixture target của staff; trả fixture IDs bị chặn.
- [x] 2.5 Apply local snapshot chỉ khi tiệm đóng, không khách đang phục vụ/worker task; batch xác nhận nguyên tử, hủy/rollback qua session snapshot.

## 3. Giao diện Sắp xếp MVP (chưa mở đất)

- [x] 3.1 Thêm nút Sắp xếp khi cửa đóng, chỉ hiện cho owner của world online.
- [x] 3.2 Thêm grid/fixture footprints/selection, preview footprint xanh/đỏ theo hover và thông báo lý do lỗi.
- [x] 3.3 Hỗ trợ kéo pointer, chọn rồi chạm ô đích, xoay 90°, cất/lấy fixture và xác nhận/hủy.
- [x] 3.4 Có undo theo từng action; confirm validate toàn layout/batch trước khi lưu.
- [x] 3.5 Đồng bộ layout với Pixi, collision, customer routing, avatar collision/interaction; active worker job chặn sửa và staff targets được revalidate.

## 4. Save schema và migration

- [x] 4.1 Bump save schema 2→3; legacy giữ footprint ban đầu, thêm mặc định mảng plot/fixtures cất rỗng, giữ tài sản cũ.
- [x] 4.2 Migration IndexedDB tạo backup trong cùng transaction, validate trước persist và giữ save gốc nếu lỗi.
- [x] 4.3 Mở rộng simulation import/export, validator IndexedDB và layout ownership mới.

## 5. Mua đất và map expansion

- [x] 5.1 Thêm hai plot phía đông cập nhật ground/wall/collision, không chiếm đường/cửa/kho; mở cạnh A rồi B.
- [x] 5.2 UI hiển thị vị trí, giá, level, footprint và prerequisite; nút mua disable khi chưa đủ điều kiện.
- [x] 5.3 Mua đất qua pure atomic operation và authoritative batch receipt/revision; retry command không trừ tiền lần hai.
- [x] 5.4 Không thêm plot kho trong MVP; fixture kho hiện hữu bất động, warehouse entrance giữ nguyên và path cửa kho được validate.

## 6. Multiplayer authoritative

- [x] 6.1 Thêm command `layout_batch` cho move/store/retrieve/buy, payload chỉ có action IDs/tiles/rotation; runtime guard shape/count.
- [x] 6.2 Server xác nhận owner/business, cửa đóng, worker/customer guards, replay thao tác lên snapshot nền server-generated, validate geometry/money, rồi commit qua transaction revision/idempotency.
- [x] 6.3 Client hiển thị nháp, apply optimistic, nhận authoritative save khi HTTP commit thành công; lỗi rollback snapshot; online save không đi qua Dexie.
- [x] 6.4 Chặn edit khi worker task đang chạy; staff target kiểm tra path, cất fixture nhả assignment, simulation reroute khách/avatar collisions cập nhật và gateway broadcast commit.

## 7. Kiểm chứng và nghiệm thu

- [x] 7.1 Unit tests: geometry/rotation/overlap/door/path, stow/retrieve identity/stock lots, save schema2→3 migration/backup/round-trip; existing planogram suite verifies planogram persistence.
- [ ] 7.2 Economy tests: level/funds/adjacency/duplicate purchase/no partial deduction đã có core regression; còn competing plot/fixture command theo DB revision/idempotency (không cần replica set; commit là `updateOne` nguyên tử).
- [ ] 7.3 `yarn typecheck`, `yarn test`, `yarn build` PASS ngày 30/09/2026; `yarn --cwd apps/server test:gateway` PASS. `yarn --cwd apps/server test:worlds` lúc đó không chạy được vì code còn dùng transaction; sau khi bỏ transaction, `test:worlds` PASS trên Mongo standalone 01/10/2026. Xem TASKS.md/ROADMAP.md cho browser scope và cảnh báo build.
- [ ] 7.4 Browser QA desktop: open editor, move/rotate, invalid placement, cancel/confirm, reload persistence đã PASS thủ công trên save cô lập ở 127.0.0.1:3001; customer/staff routing và bàn phím sau focus-trap change còn kiểm tra.
- [ ] 7.5 Browser QA mobile landscape: touch select-place, hit targets, pan/zoom/grid fit, modal/toolbar không che khu vực thao tác.
- [ ] 7.6 Hai session online QA: commit/broadcast, duplicate retry, stale revision, race fixture/plot, disconnect rollback/reconnect resync.
- [ ] 7.7 Cân bằng giá/level/diện tích plot bằng playtest; chưa nghiệm thu kinh tế chỉ dựa vào build/unit test.
