# Spec Delta

## Purpose

Tòa phụ được đặt vào lô trống do người chơi chọn khi mua, và dời được sang lô khác có phí và thời gian thi công.

## ADDED Requirements

### Requirement: Empty parcels
Tòa chưa mua SHALL không xuất hiện trên bản đồ; lô không có tòa SHALL hiển thị là đất trống, người chơi đi qua được, khách không vào.

#### Scenario: New game
- **WHEN** bắt đầu ván mới
- **THEN** `lot-west`, `lot-east-1`, `lot-east-2` là đất trống, không có vỏ nhà cửa cuốn

### Requirement: Placement validity
`validatePlacement` SHALL từ chối vị trí làm tòa vượt lô, đè tòa khác (trừ tường trùng viền), dùng lô đã có tòa, dùng nhiều lô không kề nhau, hoặc có ô vào cửa bị cây/cột đèn/quầy vỉa hè/chỗ đỗ chặn.

#### Scenario: Door blocked by tree
- **WHEN** đặt tiệm xôi ở `lot-east-2` gốc x=26 (cửa x 27..28, ô vào cửa (27,11) và (28,11), cây ở (28,11))
- **THEN** bị từ chối với `door_blocked`; gốc x=27 trở đi được chấp nhận

#### Scenario: Building too wide
- **WHEN** đặt quán nước (rộng 10) vào `lot-west` (rộng 7)
- **THEN** bị từ chối với `outside_parcel`

### Requirement: Buy with placement
Mua tòa SHALL đặt tòa và nội thất mặc định theo vị trí đã chọn (mặc định = vị trí cũ nếu còn trống), trừ tiền một lần, idempotent theo `commandId`.

#### Scenario: Snack in the west parcel
- **WHEN** đủ cấp và tiền, mua quán ăn vặt đặt ở `lot-west`
- **THEN** quán có tường, cửa, quầy thu ngân ở `lot-west`; khách món ăn vặt vào đúng cửa đó

### Requirement: Relocation
Dời tòa SHALL chỉ chạy khi tiệm đóng cửa, trừ `RELOCATION_FEE_RATE` × giá trị tòa, dịch nguyên khối nội thất và `floorTiles`, giữ hàng/gán sản phẩm, và đóng tòa đến đầu ngày hôm sau.

#### Scenario: Relocate stocked building
- **WHEN** quán ăn vặt chưa mua, dời quán nước có 3 kệ đầy hàng từ gốc x=26 sang gốc x=21 trên lô ghép `lot-east-1`+`lot-east-2`
- **THEN** sau lệnh, ba kệ ở vị trí tương đối như cũ với cùng số hàng; tòa đóng cửa tới sáng hôm sau rồi mở lại; tiền trừ đúng một lần

#### Scenario: Main store cannot move
- **WHEN** gửi `relocate_building` cho `main`
- **THEN** bị từ chối, save không đổi

### Requirement: Expansion for all buildings
Mọi tòa SHALL mở rộng theo ô bằng luật Bước 2 trên một ngân sách chung; mảnh bắc cũ SHALL được chuyển thành `floorTiles` khi nạp và tính vào ngân sách đã dùng.

#### Scenario: Legacy north plots
- **WHEN** nạp save schema 5 có `xoi-north-a`
- **THEN** tiệm xôi có thêm 3 hàng sàn phía bắc như trước, ngân sách đã dùng tăng tương ứng

### Requirement: Expand into empty adjacent parcel
Mở rộng theo ô SHALL được phép vào lô kề đang trống; lô đó SHALL gắn vào vị trí đặt của tòa khi lệnh thành công và không dùng được cho tòa khác.

#### Scenario: Main store takes the east parcel
- **WHEN** quán ăn vặt chưa mua và tiệm chính mở rộng các ô x 21..23 × y 4..9
- **THEN** lệnh hợp lệ, `lot-east-1` gắn vào tiệm chính; đặt quán ăn vặt vào `lot-east-1` sau đó bị từ chối với `parcel_occupied`

### Requirement: Save schema 6
Save SHALL được nâng lên schema 6; tòa đã mua có vị trí đặt, tòa chưa mua không có.

#### Scenario: Migrate 5 to 6
- **WHEN** nạp save schema 5 đã mua tiệm xôi và chưa mua quán nước
- **THEN** có placement mặc định cho xôi, không có cho quán nước, bản đồ phần tiệm xôi khớp golden
