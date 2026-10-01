# Spec Delta

## Purpose

Mô phỏng rủi ro nhận tiền giả ở giao dịch tiền mặt và cho người chơi/thu ngân cơ hội phát hiện, với hậu quả minh bạch và xác định.

## ADDED Requirements

### Requirement: Tiền giả được xác định theo giao dịch
Hệ thống SHALL xác định nguy cơ tiền giả theo seed và ID giao dịch, SHALL dùng quy tắc phát hiện cấu hình theo người phục vụ và SHALL lưu kết quả để retry không đổi kết quả.

#### Scenario: Thu ngân phát hiện tiền giả
- **WHEN** giao dịch có tờ giả và người phục vụ phát hiện
- **THEN** giao dịch không ghi nhận khoản tiền giả là tiền thu hợp lệ và người chơi nhận thông báo

### Requirement: Hậu quả được phản ánh nhất quán
Tiền mặt thực nhận, ledger, kết quả checkout và đánh giá liên quan SHALL phản ánh cùng một kết quả.

#### Scenario: Retry checkout
- **WHEN** checkout đã hoàn tất được gửi lại
- **THEN** tiền/ledger không bị cập nhật lần thứ hai và kết quả phát hiện được giữ nguyên
