# Spec Delta

## ADDED Requirements

### Requirement: Civic building types
Hệ SHALL có 4 loại tòa công cộng khai báo bằng dữ liệu (`park`, `clinic`, `ward_police`, `primary_school`), đặt qua `open_building` trên lô người chơi sở hữu hoặc thuê, có cấp mở khóa và giá xây; tòa công cộng SHALL không bán hàng.

#### Scenario: Build a park
- **WHEN** người chơi đủ cấp và đủ tiền gửi `open_building` loại `park` trên lô hợp lệ
- **THEN** tòa được tạo, tiền giảm đúng `buildCost`, server replay ra cùng trạng thái

#### Scenario: Locked type
- **WHEN** cấp chưa đạt `minCityLevel`
- **THEN** lệnh bị từ chối với thông báo tiếng Việt, không trừ tiền

### Requirement: District quality of life
Chỉ số sống mỗi khu SHALL dẫn xuất từ công trình công cộng trong bán kính, nằm trong [0,100], giảm theo khoảng cách, và công trình cùng dịch vụ thứ ba trở đi SHALL không cộng thêm.

#### Scenario: Distance matters
- **WHEN** đặt cùng một công viên ở tâm khu và ở mép bán kính
- **THEN** QoL khu khi đặt ở tâm cao hơn

#### Scenario: No spam
- **WHEN** có 3 công viên ở tâm khu
- **THEN** QoL bằng QoL khi có 2 công viên

#### Scenario: Legacy save
- **WHEN** tải save không có công trình công cộng
- **THEN** mọi khu có QoL cơ bản và kết quả mô phỏng 30 ngày giống trước khi có change

### Requirement: Police reduces theft
Tòa trong bán kính `ward_police` SHALL có xác suất bắt trộm cao hơn và xác suất đột nhập thấp hơn, không vượt trần hiện có.

#### Scenario: Police nearby
- **WHEN** mô phỏng cùng seed có và không có đồn công an gần tiệm
- **THEN** số vụ trộm thành công khi có đồn không cao hơn

### Requirement: Co-op civic building
Trong co-op, lệnh xây công trình SHALL theo bảng quyền đất và SHALL cần phiếu khi giá xây vượt 30% quỹ chung.

#### Scenario: Large civic spend needs vote
- **WHEN** thành viên xây trạm y tế có giá > 30% quỹ
- **THEN** tạo phiếu; chỉ xây và trừ tiền sau khi phiếu được đồng ý
