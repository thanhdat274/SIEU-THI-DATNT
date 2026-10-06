# Spec Delta

## Purpose

Tiệm chính mở rộng theo từng ô sàn, hướng do người chơi chọn, trong ngân sách theo cấp và trong lô đất của tòa.

## ADDED Requirements

### Requirement: Footprint as tile set
Footprint tiệm chính SHALL là sàn gốc của mẫu tòa hợp với `floorTiles` của vị trí đặt; tường SHALL được sinh tự động trên viền footprint và cửa tiệm SHALL giữ nguyên.

#### Scenario: L-shaped expansion
- **WHEN** mở các ô x 13..16 × y 4..9 rồi x 14..16 × y −2..3
- **THEN** bản đồ có sàn hình chữ L, tường bao kín viền, cửa tiệm ở x 9..10 không đổi, cột x=13 hàng 4..9 không còn tường

### Requirement: Expansion budget by level
Số ô sàn mở rộng SHALL không vượt tổng ngân sách cộng dồn theo `EXPANSION_TILE_MILESTONES` của cấp hiện tại; ô đã dùng gồm cả ô từ mảnh `east-wing` cũ.

#### Scenario: Budget exceeded
- **WHEN** người chơi cấp 5 (ngân sách 24) đã dùng 20 ô và đề xuất thêm 5 ô
- **THEN** lệnh bị từ chối với `over_budget`, tiền và save không đổi

### Requirement: Expansion validity
`validateExpansion` SHALL từ chối tập ô không nằm trong lô, nằm trên vỉa hè/đường hoặc trong kho, đè biên tòa khác, làm footprint không liên thông, hoặc làm bố cục mất đường tới quầy/kệ/cửa kho; cùng một hàm SHALL được dùng ở UI, core và server.

#### Scenario: Disconnected island
- **WHEN** đề xuất một ô cách footprint 2 ô mà không có ô nối
- **THEN** lệnh bị từ chối với `disconnected`

#### Scenario: Touching another building
- **WHEN** tiệm ăn vặt đã mua và đề xuất ô làm tường mới chồng lên biên quán ăn vặt
- **THEN** lệnh bị từ chối với `blocked_by_building`

### Requirement: Paid, closed-store command
Lệnh `expand_footprint` SHALL chỉ chạy khi tiệm đóng cửa, trừ đúng `số ô × EXPANSION_TILE_PRICE`, idempotent theo `commandId`, và được server phát lại cho cùng kết quả với local.

#### Scenario: Retry is no-op
- **WHEN** gửi lại cùng `commandId` sau khi lệnh đã thành công
- **THEN** tiền chỉ bị trừ một lần và footprint không đổi thêm

### Requirement: Planning preview
Chế độ quy hoạch SHALL hiển thị ô hợp lệ/không hợp lệ kèm lý do, xem trước sàn/tường/giá mà không đổi save cho tới khi xác nhận.

#### Scenario: Cancel planning
- **WHEN** chọn ô rồi bấm hủy
- **THEN** tiền, save và bản đồ không đổi

### Requirement: Legacy east wings migrate
Save có `east-wing-a`/`east-wing-b` SHALL được chuyển sang `floorTiles` tương ứng khi nạp (schema 4→5), cho bản đồ khớp golden Bước 1.

#### Scenario: Both wings
- **WHEN** nạp save schema 4 có cả hai cánh đông
- **THEN** `floorTiles` gồm x 13..20 × y 4..9, ngân sách đã dùng 48, bản đồ khớp golden tương ứng
