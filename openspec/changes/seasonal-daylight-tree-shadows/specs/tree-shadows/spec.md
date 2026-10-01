# Spec Delta

## Purpose

Cây là dữ liệu bản đồ và bóng của chúng đổ theo hướng nắng thực tế của ngày.

## ADDED Requirements

### Requirement: Trees as map data
Hệ thống SHALL khai báo cây trong dữ liệu bản đồ (`TREE_PROPS`: ô, chiều cao, bán kính tán); sprite, ô va chạm và bóng SHALL cùng đọc từ dữ liệu đó.

#### Scenario: Add a tree by data
- **WHEN** thêm một mục vào `TREE_PROPS`
- **THEN** cây, va chạm và bóng xuất hiện mà không sửa renderer

#### Scenario: Existing tree preserved
- **WHEN** tải bản đồ mặc định
- **THEN** cây hiện có vẫn ở vị trí cũ và các lối đi/cửa/ô đỗ không bị chặn thêm

### Requirement: Sun-driven shadow direction and length
Bóng cây SHALL ngả ngược hướng mặt trời, dài khi mặt trời thấp, ngắn khi cao, có chiều dài tối đa, và đổi theo mùa.

#### Scenario: Morning versus afternoon
- **WHEN** so sánh 8:00 và 16:30
- **THEN** bóng ngả sang hai phía ngược nhau theo trục đông–tây

#### Scenario: Long near sunrise, short at noon
- **WHEN** so sánh 06:30 và 12:00
- **THEN** bóng lúc 06:30 dài hơn nhưng không vượt chiều dài tối đa

#### Scenario: Night
- **WHEN** mặt trời dưới đường chân trời
- **THEN** không vẽ bóng cây do nắng

### Requirement: Weather attenuation and cheap updates
Độ mờ bóng SHALL giảm theo mưa/mây; renderer SHALL chỉ vẽ lại bóng khi phương vị hoặc độ cao đổi ≥ 1° hoặc cường độ mưa đổi đáng kể.

#### Scenario: Heavy rain
- **WHEN** cường độ mưa gần 1
- **THEN** bóng cây gần như biến mất

#### Scenario: Static sun
- **WHEN** giờ game không đổi giữa hai frame
- **THEN** không vẽ lại đồ họa bóng
