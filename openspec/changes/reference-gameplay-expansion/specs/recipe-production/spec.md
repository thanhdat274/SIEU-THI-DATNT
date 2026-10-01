# Spec Delta

## Purpose

Cho phép sản xuất hàng theo công thức trong cùng cửa tiệm, dùng nguyên liệu có giá vốn/hạn dùng, trạm chế biến và năng lực nhân viên.

## ADDED Requirements

### Requirement: Công thức khai báo đầu vào và đầu ra
Mỗi công thức SHALL xác định nguyên liệu, định lượng, sản phẩm đầu ra, thời gian, trạm và điều kiện mở khóa.

#### Scenario: Thiếu nguyên liệu
- **WHEN** không đủ một trong các nguyên liệu theo lô FEFO
- **THEN** mẻ không tiêu thụ một phần nguyên liệu và báo phần còn thiếu

### Requirement: Mẻ sản xuất bảo toàn hàng và giá vốn
Mẻ SHALL dùng ID ổn định, trừ đầu vào đúng một lần, tính giá vốn từ lô thực và đưa đầu ra vào kho với hạn dùng/lot phù hợp.

#### Scenario: Mẻ hoàn tất
- **WHEN** mẻ hoàn tất tại trạm hợp lệ
- **THEN** nguyên liệu được trừ chính xác, hàng đầu ra được thêm vào kho và giá vốn được truy vết

### Requirement: Sản xuất không đòi hỏi chuỗi cửa hàng
Trạm và quy trình chế biến SHALL hoạt động trong khu đất/cửa tiệm hiện tại và SHALL NOT yêu cầu mở chi nhánh.

#### Scenario: Tiệm đơn
- **WHEN** người chơi đặt trạm trong mặt bằng hiện tại và có nguyên liệu
- **THEN** có thể sản xuất và bán đầu ra theo quy tắc sản phẩm hiện có
