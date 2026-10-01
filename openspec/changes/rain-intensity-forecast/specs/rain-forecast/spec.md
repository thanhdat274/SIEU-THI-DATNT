# Spec Delta

## Purpose

Cho người chơi biết mưa mạnh cỡ nào và vào giờ nào trong hôm nay và hai ngày tới, bằng dữ liệu xác định và khớp thực tế.

## ADDED Requirements

### Requirement: Rain bands
Hệ thống SHALL phân cường độ mưa 0..1 thành các dải có thứ tự (không mưa, mưa phùn, mưa vừa, mưa to, mưa giông) bằng ngưỡng khai báo trong dữ liệu.

#### Scenario: Threshold lookup
- **WHEN** tra dải cho cường độ 0,02, 0,1, 0,3, 0,6 và 0,95
- **THEN** nhận lần lượt không mưa, mưa phùn, mưa vừa, mưa to, mưa giông

### Requirement: Deterministic rain day profile
Hồ sơ mưa của ngày (đỉnh, giờ đỉnh, nửa độ dài) SHALL chỉ phụ thuộc hạt giống, ngày và loại thời tiết; ngày không mưa SHALL không có hồ sơ; cường độ tức thời SHALL giữ cách tính cũ.

#### Scenario: Same inputs, same profile
- **WHEN** gọi hai lần với cùng hạt giống, ngày và loại thời tiết
- **THEN** hai hồ sơ bằng nhau

#### Scenario: Dry day
- **WHEN** thời tiết là nắng hoặc nhiều mây
- **THEN** không có hồ sơ mưa, không có dự báo mưa và cường độ bằng 0

### Requirement: Rain forecast with window
Hệ thống SHALL dự báo cho hôm nay và hai ngày tới dải mưa theo đỉnh và khung giờ mưa làm tròn 15 phút nằm trong ngày, và dự báo SHALL khớp thực tế khi ngày đó đến.

#### Scenario: Window shape
- **WHEN** lấy dự báo của một ngày mưa
- **THEN** giờ bắt đầu nhỏ hơn giờ kết thúc, đều là bội của 15 phút và hai đầu cửa sổ mưa còn nhẹ hơn giữa cơn mưa

#### Scenario: Forecast matches reality
- **WHEN** sang ngày được dự báo
- **THEN** thời tiết và dự báo mưa của hôm nay bằng dự báo đã đưa ra từ hôm trước

#### Scenario: Band coverage
- **WHEN** xét cả năm trên nhiều hạt giống
- **THEN** mỗi dải từ mưa phùn đến mưa giông xuất hiện ít nhất một lần

### Requirement: Forecast shown to the player
Giao diện SHALL hiển thị dải và khung giờ mưa dự kiến ở Thị trường hẻm, tooltip HUD và bản tin sáng.

#### Scenario: Rainy tomorrow
- **WHEN** ngày mai có mưa
- **THEN** dòng dự báo ghi thêm dạng "Mưa vừa 14:00–16:15"

#### Scenario: Dry tomorrow
- **WHEN** ngày mai không mưa
- **THEN** dòng dự báo chỉ ghi loại thời tiết
