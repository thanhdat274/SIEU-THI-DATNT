# Spec Delta

## Purpose

Quy định hành vi supplier-operations khi chuyển các quy tắc vận hành tiệm sang game hiện tại, bảo toàn tài sản và tương thích tiến trình người chơi.

## ADDED Requirements

### Requirement: Atomic supplier cart
Hệ thống SHALL kiểm tra toàn giỏ theo cấp, số lượng nguyên dương, tiền, kho lạnh, đơn tối thiểu và mối; đơn giá/chiết khấu/tổng/ETA SHALL chốt tại đặt, không trừ tiền một phần khi bị từ chối.

#### Scenario: Invalid line
- **WHEN** giỏ có một dòng kho lạnh không đủ hoặc sản phẩm khóa
- **THEN** toàn giỏ bị từ chối, tiền và đơn chờ không đổi

#### Scenario: Minimum and discount
- **WHEN** giỏ hợp lệ đạt đơn tối thiểu của mối giảm giá
- **THEN** tiền trừ đúng tổng hiển thị và các dòng giữ đơn giá chốt

### Requirement: Delivery once and overflow
Hệ thống SHALL giao mỗi đơn một lần theo ETA và chuyển phần không vừa vào hàng chờ giữ hạn gốc; hàng chờ SHALL không bán/châm trước khi cất và vẫn hết hạn.

#### Scenario: Repeated due processing
- **WHEN** tick giao cùng đơn hoặc reload sau giao
- **THEN** không có thêm hàng hoặc trừ tiền lần hai

#### Scenario: Delayed stowing
- **WHEN** đơn có 10 món nhưng chỉ còn chỗ 4 rồi cất 6 món dư ngày sau
- **THEN** 4 vào kho, 6 vào hàng chờ, hạn không tăng khi cất

