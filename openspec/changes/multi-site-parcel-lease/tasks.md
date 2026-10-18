# Tasks

Trạng thái 17/10/2026: mới có spec, chưa code. Chờ `open-world-land-lease` 2.1/2.2/3.1 và `open-world-building-types` 1.2/2.1/D6 (`internal_delivery`, phiên khác đang làm).

## 1. Dữ liệu

- [ ] 1.1 `Site`, `SiteLogEntry`, `bufferCapacity` trong `BuildingTypeDef` (số tạm); trường tùy chọn trong save (D7).
- [ ] 1.2 `FixturePlacement.parcelId` + kiểm nằm trong lô.

## 2. Core

- [ ] 2.1 `open_site` / `close_site` gọi `open_building`; idempotent theo `opId`.
- [ ] 2.2 Kho đệm: chuyển hai chiều qua `internal_delivery` (ĐÃ CHỐT 17/10/2026: `toTarget?: 'shelf' | 'site_buffer' | 'central'`, thiếu = hành vi cũ; làm cùng đợt coop-contracts 4.1), FEFO, giá vốn, sức chứa tính hàng đang chuyển.
- [ ] 2.3 Kệ cơ sở châm chỉ từ kho đệm của nó.
- [ ] 2.4 `end_lease` kiểm điều kiện dọn trước; `closedForRent` chỉ cho chuyển ra.
- [ ] 2.5 Nhật ký cơ sở (200 dòng); mặc định `nonManagerActions` = tất cả.

## 3. Server / UI

- [ ] 3.1 Server replay các lệnh cơ sở; không kiểm vai trò, không khóa khi chủ vắng.
- [ ] 3.2 Bảng cơ sở: kho đệm, nút chuyển hàng, danh sách việc cần dọn khi trả lô, nhật ký.

## 4. Kiểm chứng

- [ ] 4.1 Test theo các scenario trong `specs/multi-site/spec.md`, golden save cũ.
- [ ] 4.2 `yarn typecheck`, `yarn test`, `yarn build` PASS (kết quả thật); QA co-op 2 người (chủ rời phòng); Browser QA ghi riêng.
