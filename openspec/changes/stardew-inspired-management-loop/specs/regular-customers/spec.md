# Spec Delta

## Purpose

Khách quen có tên, sở thích và mức thân thiết tăng bằng phục vụ đúng món, không cần tặng quà hay tình cảm.

## ADDED Requirements

### Requirement: Regular roster and visits
Hệ thống SHALL có danh sách khách quen cấu hình; mỗi ngày SHALL chọn xác định theo `(worldId, day)` ai ghé; khách quen SHALL không vượt tỉ lệ cấu hình trong tổng khách ngày.

#### Scenario: Deterministic visit
- **WHEN** hai lần mô phỏng cùng world và ngày
- **THEN** cùng danh sách khách quen ghé

#### Scenario: Cap on regulars
- **WHEN** danh sách ghé vượt trần
- **THEN** chỉ giữ số trong trần

### Requirement: Preference-driven basket
Khách quen SHALL ưu tiên món/nhóm ưa thích khi chọn hàng và SHALL phản ứng với giá theo độ nhạy riêng.

#### Scenario: Favorite in stock
- **WHEN** món ưa thích có trên kệ
- **THEN** giỏ khách chứa món đó với xác suất cao hơn khách thường

### Requirement: Friendship gain with daily cap
Phục vụ khách quen thỏa mãn (giỏ có món ưa thích hoặc sao ≥ 4) SHALL cộng điểm thân thiết, tối đa theo trần mỗi ngày mỗi người; điểm SHALL không giảm khi không ghé.

#### Scenario: Repeated serve same day
- **WHEN** phục vụ cùng người vượt trần điểm/ngày
- **THEN** điểm không tăng thêm trong ngày đó

### Requirement: Perks at friendship levels
Đạt mốc thân thiết SHALL mở perk cấu hình đúng một lần và lưu vào save.

#### Scenario: Reach level 2
- **WHEN** điểm chạm mốc 2
- **THEN** perk mốc 2 mở và không mở lại sau tải

### Requirement: Save compatibility
Save không có dữ liệu khách quen SHALL tải với mọi quan hệ ở mức 0.

#### Scenario: Old save
- **WHEN** tải save cũ
- **THEN** danh sách khách quen mặc định rỗng điểm, không lỗi
