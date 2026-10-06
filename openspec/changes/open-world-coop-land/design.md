# Design: Co-op cùng quy hoạch

## Bối cảnh (đọc code 05/10/2026)

- World có `memberships[]` với `accountId`, `role` (`owner`/`member`), `lastSeenRevision` (`apps/server/src/world.repository.ts`). Mô hình doanh nghiệp: một business chung, một quỹ (`shared-alley-multiplayer/design.md` mục 1).
- Lệnh đi qua envelope có `commandId`, `expectedRevision`; server tuần tự hóa theo world, ghi receipt; lệnh đổi bố cục được server phát lại (`apps/server/src/bootstrap.ts`, `serverReplayedCommands`).
- Đã có cơ chế phiếu thời gian: socket `time-vote`, `time-vote:cancel`, broadcast `time-vote:update`, `runtime.getActiveTimeVote()` (`apps/server/src/world.gateway.ts`); phiếu tự thực hiện khi người kia rời (commit 5dc6a50).
- Snapshot sống broadcast định kỳ, có báo hiện diện (commit 3773400).

## Quyết định

### D1. Giữ chỗ quy hoạch là trạng thái tạm của runtime

`PlanningReservation { accountId, kind: 'tiles' | 'parcels' | 'placement' | 'wave', targets, expiresAt }` lưu trong bộ nhớ runtime world, **không lưu save**. Socket mới: `planning:reserve` (thay thế giữ chỗ cũ của cùng người), `planning:release`. Hết hạn sau 60 giây không gia hạn; client đang mở quy hoạch gia hạn mỗi 20 giây; ngắt kết nối thì xóa. Snapshot mang danh sách giữ chỗ của người khác để renderer vẽ bóng mờ + tên.

Giữ chỗ không cấp quyền gì: lệnh thật vẫn kiểm đủ luật Bước 2–4. Server từ chối mọi lệnh đất đụng ô/lô/đợt đang được **người khác** giữ: `reserved_by_other` kèm tên.

Chơi một mình: không gửi giữ chỗ (một người không thể tự xung đột). Cùng mô hình, chỉ là danh sách rỗng.

### D2. Bảng quyền

| Lệnh | owner | member (mặc định) |
|---|---|---|
| `expand_footprint`, `buy_parcel` | ✔ | ✔ |
| mua tòa (`buy_plot` building) | ✔ | ✔ |
| `relocate_building` | ✔ | cần phiếu (D3) |
| `reclaim_wave` | ✔ | cần phiếu (D3) |

`world.settings.memberLandPermissions` (owner chỉnh trong UI hẻm): `full` / `vote` (mặc định) / `none`. Lưu vào world document cùng revision; thay đổi là một lệnh có receipt.

### D3. Phiếu cho khoản chi lớn

Áp dụng khi: lệnh là dời tòa hoặc khai hoang, **hoặc** giá > `LARGE_SPEND_RATIO` (0,3) × quỹ hiện tại, **và** người kia đang online. Tái dùng khuôn `time-vote`: `land-vote` với payload là lệnh gốc đã được validate; người kia đồng ý → server chạy lệnh với `commandId` gốc; từ chối/hết 45 giây → hủy, không trừ tiền; người kia rời trong lúc chờ → chạy ngay (giống phiếu tốc độ). Chủ hẻm gửi lệnh khi thành viên online cũng tạo phiếu (tôn trọng quỹ chung), trừ khi chủ đặt `ownerSkipsVote = true`.

### D4. Ghi nhận và nhật ký

`builtBy: accountId` trên `BuildingPlacement`, từng nhóm `floorTiles` (lưu theo lệnh), `ownedParcelIds` (thành bản ghi `{ id, boughtBy, day }`), `openedWaves`. Nhật ký thành phố (hiển thị trong bảng "Thành phố" của Bước 4) liệt kê sự kiện đất kèm tên. Save chơi một mình ghi `builtBy = 'local'`. Schema 8, migration 7→8 điền `builtBy` = chủ hẻm hoặc `'local'`.

### D5. Thông báo xung đột

Client ánh xạ `reserved_by_other`, `stale_revision` (khi lệnh đất bị từ chối vì người kia vừa đổi đất) và `vote_rejected` sang toast có tên người kia; tự làm mới chế độ quy hoạch theo snapshot mới.

## Rủi ro

- **Hạ tầng co-op chưa kiểm chứng**: nhóm 0 trong tasks bắt buộc chạy test cần Mongo replica set và hai trình duyệt thật trước.
- **Giữ chỗ bị treo** do client lỗi: TTL 60 giây phía server, không phụ thuộc client.
- **Phiếu làm chậm**: chỉ áp cho lệnh lớn; chủ có thể tắt cho mình.
- **Gian lận/spam giữ chỗ**: tối đa một giữ chỗ mỗi người, giới hạn số ô bằng ngân sách còn lại.
