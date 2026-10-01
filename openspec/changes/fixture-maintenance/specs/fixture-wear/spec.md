# Spec Delta

## Purpose

Kệ và tủ mát xuống cấp theo thời gian và có thể hỏng, tạo chi phí và tình huống cần xử lý.

## ADDED Requirements

### Requirement: Overnight wear
Từ cấp mở khóa, mỗi đêm mỗi kệ/tủ mát chưa hỏng SHALL mòn thêm một lượng trong khoảng cấu hình; kết quả SHALL xác định theo ngày và mã nội thất; đồ đã hỏng SHALL không mòn thêm; quầy thu ngân và nội thất kho SHALL không hao mòn.

#### Scenario: Deterministic wear
- **WHEN** chạy qua đêm hai lần với cùng ngày và cùng danh sách nội thất
- **THEN** độ mòn và trạng thái hỏng giống nhau

#### Scenario: Below the unlock level
- **WHEN** cấp người chơi dưới cấp mở khóa
- **THEN** không đồ nào mòn hoặc hỏng

### Requirement: Breakage
Đồ SHALL chỉ hỏng khi mòn từ ngưỡng trở lên, hỏng nặng nếu mòn từ mức nặng hoặc theo xác suất cấu hình, và qua nhiều đêm không bảo trì SHALL xuất hiện cả hỏng nhẹ lẫn hỏng nặng.

#### Scenario: Threshold
- **WHEN** một đồ chuyển sang hỏng
- **THEN** độ mòn của nó từ ngưỡng hỏng trở lên

#### Scenario: Long run
- **WHEN** nhiều đồ qua 120 đêm không bảo trì
- **THEN** có đồ hỏng nhẹ và có đồ hỏng nặng

### Requirement: Broken fixtures are unusable
Kệ hỏng SHALL không được khách chọn, không nhận hàng châm hay bố trí, không tính là còn hàng với khách và không bị nhân viên hay tự châm hàng chọn; vẫn lấy được hàng ra.

#### Scenario: Customers
- **WHEN** có kệ hỏng còn hàng và kệ lành còn hàng
- **THEN** không khách nào chọn kệ hỏng

#### Scenario: Restocking
- **WHEN** châm hàng hoặc áp bố trí vào kệ hỏng
- **THEN** bị từ chối với lý do kệ hỏng

### Requirement: Wear persists
Độ mòn và trạng thái hỏng SHALL được lưu và tải cùng bố cục.

#### Scenario: Save and load
- **WHEN** lưu rồi tải một kệ mòn 77 và hỏng nhẹ
- **THEN** sau khi tải vẫn mòn 77 và hỏng nhẹ

### Requirement: Breakage is announced
Khi có đồ hỏng qua đêm, hệ thống SHALL thông báo danh sách đồ vừa hỏng và mức hỏng.

#### Scenario: Overnight notice
- **WHEN** một kệ mòn nặng hỏng qua đêm
- **THEN** callback thông báo được gọi với kệ đó
