# Spec Delta

## Purpose

Lòng đường hẻm có mặt cắt nhìn thấy được, khớp hai làn xe và cửa tiệm, và mưa làm mặt đường ướt, đọng vũng gần cửa thu nước.

## ADDED Requirements

### Requirement: Road cross-section as data
Hệ thống SHALL khai báo hàng bó vỉa, biên hai làn, các cửa thu nước và vạch qua đường trong dữ liệu bản đồ, và hình vẽ SHALL chỉ đọc từ dữ liệu đó.

#### Scenario: Lanes match traffic
- **WHEN** so hàng bó vỉa và biên vạch giữa với làn xe của bộ điều khiển giao thông
- **THEN** làn trái nằm ở hàng bó vỉa và làn phải nằm ngay dưới vạch giữa

#### Scenario: Drain placement
- **WHEN** đọc danh sách cửa thu nước
- **THEN** các ô khác nhau, nằm trong bản đồ và không nằm trong vạch qua đường

### Requirement: Crosswalk in front of the shop
Vạch qua đường SHALL nằm ngay trước cửa tiệm trên mặt đường, phủ hai làn và không chồng ô đỗ xe.

#### Scenario: Crosswalk geometry
- **WHEN** đọc vị trí vạch qua đường
- **THEN** nó phủ ô x của cửa tiệm (9 và 10), các ô đó là mặt đường và không trùng ô đỗ xe

### Requirement: Visual only
Mặt cắt đường, cửa thu nước, vạch qua đường, đường ướt và vũng nước SHALL chỉ là hình ảnh: không đổi va chạm, đường đi hay giao thông.

#### Scenario: No collision change
- **WHEN** so lớp va chạm trước và sau thay đổi
- **THEN** không có ô nào đổi trạng thái

### Requirement: Road wetness follows rain
Độ ướt mặt đường 0..1 SHALL lên theo cường độ mưa, khô dần theo hàm mũ sau mưa, bằng 0 vào ngày không mưa và trước cơn mưa đầu tiên, và xác định theo hạt giống, ngày, giờ và loại thời tiết.

#### Scenario: During and after rain
- **WHEN** mưa đạt đỉnh rồi tạnh
- **THEN** độ ướt lúc đỉnh không nhỏ hơn cường độ mưa, ngay sau mưa vẫn dương và nhỏ dần theo thời gian

#### Scenario: Dry day
- **WHEN** thời tiết nắng hoặc nhiều mây
- **THEN** độ ướt bằng 0

### Requirement: Puddles near drains
Khi độ ướt vượt 0,3 SHALL xuất hiện vũng nước ở mỗi cửa thu nước, lớn dần theo độ ướt; mưa nhẹ SHALL không tạo vũng.

#### Scenario: Heavy rain
- **WHEN** độ ướt gần 1
- **THEN** mỗi cửa thu nước có một vũng lớn và mặt đường tối đi rõ

#### Scenario: Drizzle
- **WHEN** độ ướt dưới 0,3
- **THEN** không có vũng, chỉ tối mặt đường nhẹ

### Requirement: Cheap redraw
Renderer SHALL chỉ vẽ lại lớp đường ướt khi độ ướt đổi từ 0,02 trở lên hoặc về 0.

#### Scenario: Steady rain
- **WHEN** độ ướt không đổi giữa hai frame
- **THEN** không vẽ lại lớp ướt
