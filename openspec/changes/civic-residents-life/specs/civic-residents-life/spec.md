# Spec Delta

## ADDED Requirements

### Requirement: Visible residents follow population
Số NPC nền hiển thị SHALL tăng theo dân số khu, có trần, và SHALL không ảnh hưởng doanh thu hay save.

#### Scenario: Bigger population, busier street
- **WHEN** dân số khu tăng gấp đôi
- **THEN** số NPC nền hiển thị trong khu tăng nhưng không vượt trần

#### Scenario: Visual only
- **WHEN** mô phỏng 30 ngày có và không có lớp cư dân
- **THEN** doanh thu và save giống hệt nhau

### Requirement: Houses grow with population
Nhà dân trên lô nhà dân SHALL đổi bậc tầng theo tỉ lệ dân số/sức chứa của khu.

#### Scenario: Floor tier up
- **WHEN** tỉ lệ dân số khu vượt ngưỡng bậc kế tiếp
- **THEN** nhà dân hiển thị thêm tầng
