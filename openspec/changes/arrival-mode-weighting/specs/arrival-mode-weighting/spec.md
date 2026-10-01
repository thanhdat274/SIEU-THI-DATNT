# Spec Delta

## Purpose

Cách khách đến tiệm (đi bộ, xe máy, ô tô) phản ánh giờ trong ngày, ngày trong tuần, thời tiết và chỗ đỗ còn trống.

## ADDED Requirements

### Requirement: Contextual arrival weights
Hệ thống SHALL tính tỷ trọng ba phương thức đến từ tỷ trọng gốc, hệ số khung giờ, hệ số cuối tuần và mưa liên tục theo cường độ; tổng tỷ trọng SHALL bằng 1.

#### Scenario: Neutral context
- **WHEN** không có ngữ cảnh, hoặc giờ thường, ngày thường, trời khô
- **THEN** tỷ trọng bằng tỷ trọng gốc

#### Scenario: Rain
- **WHEN** cường độ mưa tăng từ 0 đến 1
- **THEN** tỷ trọng đi bộ giảm đơn điệu và ô tô tăng đơn điệu

#### Scenario: Time of day
- **WHEN** so cao điểm, giờ trưa và buổi tối
- **THEN** cao điểm có nhiều xe máy hơn giờ trưa, buổi tối có nhiều ô tô nhất, giờ trưa có nhiều người đi bộ hơn cao điểm sáng

#### Scenario: Weekend
- **WHEN** là Thứ Bảy hoặc Chủ Nhật
- **THEN** tỷ trọng ô tô cao hơn ngày thường cùng giờ

### Requirement: Parking availability
Phương thức không còn chỗ đỗ SHALL có tỷ trọng 0 và phần còn lại được chuẩn hóa; hết chỗ cả hai loại xe thì đi bộ.

#### Scenario: No car bay
- **WHEN** hết chỗ đỗ ô tô
- **THEN** tỷ trọng ô tô bằng 0 và tổng vẫn bằng 1

### Requirement: Deterministic choice
Chọn phương thức SHALL xác định theo `roll` (xe máy, ô tô, đi bộ theo thứ tự) và cùng đầu vào cho cùng phân bố.

#### Scenario: Roll order
- **WHEN** roll nhỏ hơn tỷ trọng xe máy, hoặc trong khoảng ô tô, hoặc lớn hơn
- **THEN** chọn lần lượt xe máy, ô tô, đi bộ
