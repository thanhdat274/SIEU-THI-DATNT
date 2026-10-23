# Spec Delta

## Purpose

Mở nhiều cơ sở trên lô đất thuê/sở hữu của bản đồ chung, mỗi cơ sở có kho đệm luôn nối kho tổng, kệ gắn lô, mọi thành viên co-op đều quản lý.

## ADDED Requirements

### Requirement: Open site on parcel
`open_site` SHALL tạo một cơ sở trên lô đang thuê hoặc sở hữu chưa có cơ sở; một lô SHALL có tối đa một cơ sở.

#### Scenario: Open on leased parcel
- **WHEN** thuê lô W1 rồi `open_site` loại quán nước
- **THEN** cơ sở tạo với `siteId = instanceId`, gắn `parcelId`, kho đệm rỗng, tiền trừ đúng một lần

#### Scenario: Replay idempotent
- **WHEN** server replay cùng `opId` hai lần
- **THEN** chỉ có một cơ sở và một lần trừ tiền

#### Scenario: Parcel closed for rent
- **WHEN** `open_site` trên lô `closedForRent`
- **THEN** lệnh bị từ chối

### Requirement: Site buffer always linked
Mỗi cơ sở ngoài lô tiệm chính SHALL có kho đệm luôn nối kho tổng; kệ của cơ sở SHALL chỉ châm từ kho đệm của nó.

#### Scenario: Transfer in
- **WHEN** chuyển 20 chai nước kho tổng → kho đệm
- **THEN** tạo `internal_delivery`; khi tới nơi kho đệm có 20 chai cùng hạn dùng và giá vốn; kho tổng giảm 20; tổng số không đổi

#### Scenario: Capacity
- **WHEN** chuyển vượt `bufferCapacity` (tính cả hàng đang chuyển tới)
- **THEN** lệnh bị từ chối, không đổi kho

#### Scenario: No cross restock
- **WHEN** nhân viên châm kệ cơ sở A khi kho đệm A hết nhưng kho đệm B còn
- **THEN** kệ A không được châm từ B

### Requirement: Fixtures bound to parcel
Nội thất của cơ sở SHALL nằm trọn trong lô của cơ sở.

#### Scenario: Place outside parcel
- **WHEN** đặt kệ có một ô ngoài lô
- **THEN** lệnh bị từ chối

### Requirement: Clear before ending lease
`end_lease` SHALL bị từ chối khi lô còn nội thất, hàng trong kho đệm, hoặc chuyến `internal_delivery` đang chạy liên quan cơ sở.

#### Scenario: Refused with checklist
- **WHEN** `end_lease` trên lô còn 1 kệ và 5 món trong kho đệm
- **THEN** từ chối, lỗi liệt kê kệ và hàng cần dọn

#### Scenario: Rescue stock while closed
- **WHEN** lô `closedForRent`
- **THEN** chuyển kho đệm → kho tổng vẫn được; chuyển vào bị từ chối

### Requirement: Co-op open authority
Mọi thành viên trong phòng SHALL ra được mọi lệnh cơ sở, kể cả khi chủ phòng không có mặt; mỗi lệnh SHALL ghi `actorAccountId` vào nhật ký cơ sở.

#### Scenario: Host away
- **WHEN** chủ phòng rời phòng, thành viên B chuyển hết kho đệm về kho tổng rồi `end_lease`
- **THEN** các lệnh thành công; nhật ký cơ sở ghi B là người thực hiện

#### Scenario: Default settings
- **WHEN** tạo thế giới mới
- **THEN** `nonManagerActions` cho phép tất cả; `managerAccountId` chỉ hiện làm nhãn

### Requirement: Legacy save
Save không có `sites` SHALL nạp như cũ: 4 tòa hiện có là cơ sở trên lô tiệm chính và dùng thẳng kho tổng.

#### Scenario: Old save
- **WHEN** nạp save trước change này
- **THEN** golden các bước trước PASS, không có kho đệm nào được tạo
