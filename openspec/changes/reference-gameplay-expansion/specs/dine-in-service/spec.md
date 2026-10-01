# Spec Delta

## Purpose

Cho khách dùng dịch vụ ăn tại bàn trong cùng cửa tiệm, theo dõi bàn trống/đang dùng/bẩn và để người chơi hoặc nhân viên phục vụ, dọn dẹp. Chế độ quầy bán suất tổng hợp hiện có tiếp tục hoạt động.

## ADDED Requirements

### Requirement: Bàn ăn có vòng đời rõ ràng
Mỗi bàn SHALL ở trạng thái trống, có khách hoặc cần dọn; bàn bẩn không nhận lượt khách mới cho đến khi được dọn.

#### Scenario: Khách dùng bàn
- **WHEN** khách được xếp bàn trống và gọi món hợp lệ
- **THEN** bàn chuyển sang có khách và chỉ trở lại trống sau khi khách rời đi và bàn được dọn

#### Scenario: Khách chọn ăn tại chỗ
- **WHEN** người chơi thanh toán giỏ có món ăn hợp lệ và chọn ăn tại bàn
- **THEN** khách đi tới bàn còn chỗ, dùng bàn trong thời gian mô phỏng rồi đánh dấu bàn cần dọn

### Requirement: Phục vụ và dọn bàn có ghi nhận
Phục vụ SHALL tiêu thụ món/nguyên liệu theo đơn đã xác định; dọn bàn SHALL giải phóng bàn đúng một lần và có thể do người chơi hoặc nhân viên được giao việc thực hiện.

#### Scenario: Lặp lại lệnh dọn bàn
- **WHEN** cùng một command dọn bàn được gửi lại
- **THEN** bàn không bị giải phóng hoặc thưởng hai lần

#### Scenario: Nhân viên dọn bàn
- **WHEN** nhân viên bổ sung hàng đang trong ca được giao dọn bàn bẩn
- **THEN** nhân viên đi đến bàn, hoàn tất job sau thời gian làm việc và bàn chỉ được mở lại một lần

### Requirement: Quầy tổng hợp vẫn tương thích
Các quầy hiện có SHALL tiếp tục xử lý suất tổng hợp trong khi chế độ bàn ăn được bật hoặc tắt.

#### Scenario: Tiệm chưa mở phục vụ tại bàn
- **WHEN** không có bàn hoặc tính năng bàn ăn bị tắt
- **THEN** quầy hiện có tiếp tục bán theo luật hiện tại
