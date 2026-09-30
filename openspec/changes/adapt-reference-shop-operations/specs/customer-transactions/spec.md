# Spec Delta

## Purpose

Quy định hành vi customer-transactions khi chuyển các quy tắc vận hành tiệm sang game hiện tại, bảo toàn tài sản và tương thích tiến trình người chơi.

## ADDED Requirements

### Requirement: Basket ownership and queued checkout
Hệ thống SHALL lấy hàng còn hạn khỏi kệ vào giỏ khách, giữ giá lúc lấy và chỉ thanh toán giỏ hợp lệ ở đầu hàng đợi; người chơi và thu ngân SHALL dùng cùng quy tắc.

#### Scenario: No waiting customer
- **WHEN** người chơi bấm bán khi không có khách hợp lệ
- **THEN** tiền, XP và thống kê khách không tăng

#### Scenario: Competing last item
- **WHEN** hai khách lấy món cuối cùng
- **THEN** chỉ một giỏ nhận món, không có tồn âm

#### Scenario: Repeated payment
- **WHEN** hai tác nhân thanh toán cùng khách hoặc gửi lại lệnh
- **THEN** chỉ một giao dịch cộng tiền/XP và số khách tăng một

### Requirement: Abandoned basket conservation
Hệ thống SHALL trả lô còn hạn của khách bỏ đi về vị trí hợp lệ hoặc ghi hàng hỏng khi quá hạn.

#### Scenario: Patience expires
- **WHEN** khách mang giỏ hết kiên nhẫn trước thanh toán
- **THEN** không ghi doanh thu, toàn bộ hàng được hoàn hoặc ghi hỏng có đối chiếu

