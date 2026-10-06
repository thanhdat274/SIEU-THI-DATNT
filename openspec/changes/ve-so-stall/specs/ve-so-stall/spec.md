# Spec Delta

## Purpose

Quầy vé số vỉa hè: bán lấy hoa hồng, không dùng nguyên liệu kho, ngừng bán theo giờ và hiện biển HẾT.

## ADDED Requirements

### Requirement: Stall without ingredients
Hệ thống SHALL cho phép quầy không có nguyên liệu kho; quầy đó SHALL bán đủ nhu cầu ngày, không báo thiếu nguyên liệu, và vốn mỗi suất SHALL tính vào giá vốn.

#### Scenario: Full demand
- **WHEN** lập kế hoạch ngày cho `ve_so` với kho trống
- **THEN** số suất bằng nhu cầu và không có `limitedBy`

### Requirement: Selling window
Quầy có `sellUntilHour` SHALL ngừng bán từ giờ đó; quầy không có SHALL bán tới 22:00 như trước.

#### Scenario: Stops selling
- **WHEN** đồng hồ qua 17:00 trong ngày có quầy `ve_so`
- **THEN** quầy đã bán đủ nhu cầu ngày và không bán thêm

#### Scenario: Old stalls unchanged
- **WHEN** tính bán theo giờ cho `cafe_vot`
- **THEN** kết quả giống trước khi có `sellUntilHour`

### Requirement: Sold-out sign
Renderer SHALL hiện biển HẾT trên quầy có `sellUntilHour` từ giờ ngừng bán trở đi và ẩn khi sang ngày mới trước giờ mở.

#### Scenario: Sign toggles
- **WHEN** quầy `ve_so` đã mở và đồng hồ chạy qua 17:00, rồi sang ngày sau
- **THEN** `getSoldOutStalls()` chứa `ve_so` từ 17:00 đến hết ngày và không chứa khi ngày mới trước 17:00

### Requirement: Stall placement
Ô quầy SHALL nằm trong bản đồ, trên vỉa hè và không chồng quầy khác.

#### Scenario: Geometry
- **WHEN** đọc `STALLS`
- **THEN** các quầy không chồng nhau theo cột và nằm trong bản đồ
