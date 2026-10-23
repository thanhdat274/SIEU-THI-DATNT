# Tasks

Trạng thái 19/10/2026: core + save + co-op/server + UI 3.2 + 1.2 xong (chưa commit); `yarn build` chưa chạy.
Trước đó (17/10/2026): mới có spec, chưa code. Chờ `open-world-land-lease` 2.1/2.2/3.1 và `open-world-building-types` 1.2/2.1/D6 (`internal_delivery`, phiên khác đang làm).

## 1. Dữ liệu

- [x] 1.1 `Site`, `SiteLogEntry`, `bufferCapacity` trong `BuildingTypeDef` (số tạm); trường tùy chọn trong save (D7).
- [x] 1.2 `FixturePlacement.parcelId` + kiểm nằm trong lô.

## 2. Core

- [x] 2.1 `open_site` / `close_site` gọi `open_building`; idempotent theo `opId`.
- [x] 2.2 Kho đệm: chuyển hai chiều qua `internal_delivery` (ĐÃ CHỐT 17/10/2026: `toTarget?: 'shelf' | 'site_buffer' | 'central'`, thiếu = hành vi cũ; làm cùng đợt coop-contracts 4.1), FEFO, giá vốn, sức chứa tính hàng đang chuyển.
- [x] 2.3 Kệ cơ sở châm chỉ từ kho đệm của nó.
- [x] 2.4 `end_lease` kiểm điều kiện dọn trước; `closedForRent` chỉ cho chuyển ra.
- [x] 2.5 Nhật ký cơ sở (200 dòng); mặc định `nonManagerActions` = tất cả.

## 3. Server / UI

- [x] 3.1 Server replay các lệnh cơ sở; không kiểm vai trò, không khóa khi chủ vắng.
- [x] 3.2 Bảng cơ sở: kho đệm, nút chuyển hàng, danh sách việc cần dọn khi trả lô, nhật ký.

## 4. Kiểm chứng

- [ ] 4.1 Test theo các scenario trong `specs/multi-site/spec.md`, golden save cũ.
- [ ] 4.2 `yarn typecheck`, `yarn test`, `yarn build` PASS (kết quả thật); QA co-op 2 người (chủ rời phòng); Browser QA ghi riêng.

## Ghi chú thực hiện (19/10/2026)

- 1.1: `Site`, `SiteLogEntry` trong `@game/shared`; save schema 17 (`migrateToW17`, không sửa W7–W16): `sites`, `siteBuffers`, `siteLogs`, `internalDeliverySeq` tùy chọn. `bufferCapacity` chưa theo từng `BuildingTypeDef`: dùng một hằng `SITE_BUFFER_CAPACITY = 60` và `MAX_SITES = 3` (PROVISIONAL, `game-core/src/multi-site.ts`).
- 2.1: `openSite` = kiểm lô (không W0, đang thuê/sở hữu, chưa có cơ sở, không nợ đóng cửa, trần cơ sở) rồi gọi `openBuilding`; `closeSite` gỡ tòa, không hoàn tiền. Lệnh `open_building` cũ giữ nguyên (tòa mở bằng lệnh đó KHÔNG có kho đệm, dùng kho tổng như trước).
- 2.2: `siteTransfer(siteId, productId, qty, 'in'|'out')` qua `startInternalDelivery`; `toTarget: 'site_buffer'` giờ vào `siteBuffers` (thùng coi như mở tại chỗ). Sổ `internal_transfer` amount 0. Id chuyến dùng bộ đếm `internalDeliverySeq` (cả chuyến châm kệ xa của nhân viên).
- 2.3: `transferToShelf`, mục tiêu châm của nhân viên, `autoFillCandidates`, `autoRestockShelves` đọc kho đệm cho kệ cơ sở. Nhân viên châm kệ cơ sở tại chỗ từ kho đệm (không đi bộ về kho tổng) — đơn giản hóa, chưa có test riêng cho nhánh nhân viên.
- 2.4: `endLease` lô có cơ sở → `site_not_cleared` + `todo` (`buffer:n`, `deliveries:n`, `fixtures:n`, `close_site`). Lô `closedForRent`: `in` bị từ chối, `out` được.
- 2.5: nhật ký 200 dòng theo `buildActorId`. `DEFAULT_NON_MANAGER_ACTIONS` đã là `'allow'` (manager-permission.ts), không đổi; lệnh cơ sở không đi qua land-policy nên không bị chặn/phiếu.
- 3.1: `open_site`/`close_site`/`site_transfer` trong `SERVER_REPLAYED_COMMAND_TYPES`, `ALLOWED_COMMAND_TYPES`, `WorldRuntime`; `open_site` khóa lô qua `landCommandTargets`. Lý do từ chối mang danh sách việc.
- 3.2: `SiteModal` (một cột, PixelDialog): kho đệm + "Rút về", chuyển từ kho tổng (chọn món + số), danh sách việc trước khi trả lô, nút Đóng cơ sở / Trả lô, nhật ký thu gọn. Vào từ hộp lô đất ("Quản lý cơ sở"); mở cơ sở mới trên lô W1+ (loại không phải civic) giờ gửi `open_site` rồi mở bảng. Bảng vẽ lại mỗi giây khi mở. Hook QA `?qa`: `__openModal('site' | 'parcel')`.
- Browser QA 19/10/2026 (dev server 5173, Chơi Thử Local, dựng cơ sở bằng `__sim`): chuyển vào, chuyến tới nơi bảng tự cập nhật, Rút về, danh sách việc, nhật ký, nút trong hộp lô đất — nhìn bằng mắt. 7 viewport 568×320, 667×375, 740×360, 812×375, 844×390, 852×393, 932×430: hộp vừa màn, không tràn ngang, control ≥44 px. CHƯA QA: co-op 2 trình duyệt thật, luồng chọn lô trên bản đồ bằng tay, cất kệ thật trong Bố cục rồi trả lô.
- 1.2: KHÔNG thêm trường `parcelId` vào nội thất (save không có kiểu `FixturePlacement`; thêm trường = đổi schema mà không cần): lô của kệ suy từ `sites[].parcelId`. `validateStoreLayout` từ chối kệ có ô trong lô cơ sở và ô ngoài lô đó (`outside_parcel` + `blockedFixtureIds`), báo lỗi tiếng Việt ở Bố cục. Luật cũ "kệ nằm trọn trong một tòa" vẫn chạy; tòa nằm trong lô nên hai luật trùng nhau ở phần lớn trường hợp. Test: dời kệ cơ sở vắt qua ranh lô → từ chối, bố cục không đổi.
- Chưa làm: 4.2 `yarn build`; QA co-op 2 trình duyệt thật.
