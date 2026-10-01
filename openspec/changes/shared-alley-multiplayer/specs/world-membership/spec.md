## Purpose

Quản lý danh tính và quyền tham gia con hẻm riêng, cho phép người chơi có tiến trình riêng và tham gia tiệm chung mà không gộp tài sản.

## ADDED Requirements

### Requirement: Independent worlds and business ownership
The system SHALL lưu tài sản kinh doanh theo cơ sở trong world, tách khỏi danh tính/ngoại hình tài khoản; solo online SHALL dùng cùng mô hình world với một thành viên.

#### Scenario: Join without merging money
- **WHEN** B có world riêng với 5 triệu và tham gia world A có tiệm 2 triệu
- **THEN** quỹ A vẫn 2 triệu, quỹ world B vẫn 5 triệu; kiếm 300 nghìn tại A chỉ tăng quỹ A

#### Scenario: Return to a private world
- **WHEN** B rời A và tải world riêng
- **THEN** hệ thống tải tiến trình đã lưu của world riêng, không dùng kho/ngày/nâng cấp của A

### Requirement: Authenticated private invitations
The system SHALL chỉ cho tài khoản đã xác thực và có membership truy cập world; owner SHALL được tạo/revoke mã mời một lần có hạn 24 giờ; bản đầu SHALL giới hạn hai thành viên tổng và hai người online.

#### Scenario: Valid invitation
- **WHEN** tài khoản đăng nhập dùng mã còn hạn vào world còn một chỗ
- **THEN** hệ thống cấp membership, tiêu thụ mã và cho vào world

#### Scenario: Invalid or concurrent join
- **WHEN** mã hết hạn/revoke/đã dùng hoặc hai tài khoản tranh chỗ cuối
- **THEN** chỉ join hợp lệ đầu tiên được commit, các yêu cầu còn lại bị từ chối và không thay đổi tài sản

#### Scenario: Unauthenticated access
- **WHEN** client chưa xác thực hoặc không là thành viên yêu cầu snapshot theo worldId
- **THEN** hệ thống từ chối và không tiết lộ nội dung world

### Requirement: Owner and member permissions
The system SHALL cho owner/member vận hành tiệm chung; chỉ owner SHALL quản lý lời mời, loại thành viên và reset có xác nhận. Loại thành viên SHALL thu hồi session ngay.

#### Scenario: Member plays without owner
- **WHEN** member vào world khi owner offline và nhập/bày/bán hợp lệ
- **THEN** giao dịch được xử lý bằng quỹ/kho chung, không yêu cầu máy owner hoạt động

#### Scenario: Member rearranges the shop and buys plots
- **WHEN** member gửi lệnh bố cục (`layout_batch`) hợp lệ, gồm cả mua đất, khi cửa hàng đóng
- **THEN** server chấp nhận và trừ quỹ chung; mua đất và sắp xếp KHÔNG phải quyền riêng của owner

#### Scenario: Forbidden management
- **WHEN** member yêu cầu reset hoặc tạo lời mời
- **THEN** server từ chối, world giữ nguyên

#### Scenario: Membership revoked
- **WHEN** owner loại member đang online
- **THEN** member mất quyền đọc/ghi world và quay về danh sách world

### Requirement: Single active account session
The system SHALL cho mỗi tài khoản tối đa một session game active, và SHALL loại bỏ input/avatar của session cũ khi thay session.

#### Scenario: Open a second device
- **WHEN** cùng tài khoản vào game trên thiết bị thứ hai
- **THEN** thiết bị đầu nhận thông báo session bị thay và không thể tiếp tục giao dịch
