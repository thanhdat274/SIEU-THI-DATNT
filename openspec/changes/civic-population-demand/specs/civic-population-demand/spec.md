# Spec Delta

## ADDED Requirements

### Requirement: District population
Mỗi khu SHALL có dân số tiến về mục tiêu tính từ sức chứa và chỉ số sống, thay đổi không quá 3% mỗi ngày.

#### Scenario: Growth is gradual
- **WHEN** QoL khu tăng từ 20 lên 60 trong một ngày
- **THEN** dân số ngày kế tiếp tăng không quá 3%

#### Scenario: Old save
- **WHEN** tải save không có dữ liệu dân số
- **THEN** dân số được khởi tạo và hệ số khách bằng 1.0

### Requirement: Population drives traffic
Lưu lượng khách tiềm năng của tòa SHALL nhân với hệ số dân số khu trong [0.85, 1.25], và tích các hệ số khu, cụm, dân số SHALL không vượt trần chung.

#### Scenario: Better neighborhood, more customers
- **WHEN** mô phỏng 60 ngày cùng seed có và không có công trình công cộng gần tiệm
- **THEN** số khách khi có công trình cao hơn nhưng không quá 25%
