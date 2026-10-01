# Spec Delta

## Purpose

Cho phép khách đủ điều kiện mua chịu có giới hạn và theo dõi khoản phải thu, đến hạn, thanh toán và nợ xấu mà không ghi nhận doanh thu hai lần.

## ADDED Requirements

### Requirement: Tín dụng có điều kiện và giới hạn
Hệ thống SHALL chỉ cấp tín dụng cho khách đủ điều kiện, SHALL kiểm tra hạn mức trước khi chấp nhận đơn chịu và SHALL ghi khoản nợ có ID cùng ngày đến hạn.

#### Scenario: Vượt hạn mức
- **WHEN** đơn mua chịu vượt số tín dụng còn khả dụng
- **THEN** đơn bị từ chối hoặc khách chọn phương thức thanh toán khác mà không tạo khoản nợ

#### Scenario: Điều kiện khách quen
- **WHEN** khách quen có ít nhất 40 điểm thân thiết và người chơi chọn bán chịu
- **THEN** simulation ghi khoản phải thu có mã tuần tự, hạn mức không vượt 100.000 VND và hạn trả sau 3 ngày

### Requirement: Thu nợ không ghi doanh thu lần nữa
Thanh toán khoản nợ SHALL giảm dư nợ và tăng tiền đúng số tiền nhận, không cộng lại doanh thu bán hàng.

#### Scenario: Thanh toán được gửi lặp
- **WHEN** command thu nợ đã áp dụng được gửi lại cùng ID
- **THEN** số dư và tiền mặt chỉ thay đổi một lần

### Requirement: Nợ quá hạn được xử lý xác định
Khi qua hạn, hệ thống SHALL áp dụng trạng thái nhắc/trễ/nợ xấu theo quy tắc đã cấu hình và lưu kết quả qua save/load.

#### Scenario: Ngày đến hạn
- **WHEN** simulation chuyển qua ngày đáo hạn của khoản nợ chưa trả
- **THEN** khoản nợ chuyển sang trạng thái đến hạn và được thông báo theo quy tắc

#### Scenario: Nợ xấu
- **WHEN** khoản nợ vẫn còn sau 7 ngày kể từ hạn trả
- **THEN** số dư được xóa một lần, trạng thái chuyển thành nợ xấu và chi phí được ghi vào ngày hiện tại

### Requirement: Co-op phát lại giao dịch tín dụng
- Checkout mua chịu và thu nợ SHALL được server replay từ command payload trên save canonical.
- Retry command cùng ID SHALL không tạo khoản phải thu hoặc thu tiền lặp lại.
