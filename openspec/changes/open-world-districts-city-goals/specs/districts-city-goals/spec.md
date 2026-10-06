# Spec Delta

## Purpose

Mỗi khu có bản sắc ảnh hưởng khách và cảnh; thành phố có cấp riêng tăng qua mục tiêu, mở khóa khai hoang và làm cảnh quan đông dần; các mốc phát triển được ghi nhớ.

## ADDED Requirements

### Requirement: Districts
Mọi lô SHALL thuộc một khu; khu SHALL sinh luật `modifiers` (nhóm hàng ưa chuộng, nhịp khách theo giờ) áp cho tòa trên lô của khu, và thành phần NPC nền theo `npcMix`.

#### Scenario: Office mornings
- **WHEN** mô phỏng 7 ngày cùng quán cà phê ở khu văn phòng và ở khu dân cư
- **THEN** số khách 6:30–8:30 ở khu văn phòng cao hơn

### Requirement: Proximity synergy
Hệ số khách cụm SHALL tính theo các tòa bổ trợ trong bán kính 16 ô (có trần), thay cho đếm số tòa; ở bố cục mặc định W0 SHALL cho cùng hệ số như `FOOD_CLUSTER_TRAFFIC_MULTIPLIER` cũ.

#### Scenario: Clustered beats scattered
- **WHEN** mô phỏng quán ăn vặt đặt cạnh tiệm chính và đặt ở W3 xa mọi tòa khác
- **THEN** quán đặt cạnh tiệm chính có hệ số cụm và số khách cao hơn

#### Scenario: Legacy parity
- **WHEN** bốn tòa ở vị trí mặc định W0
- **THEN** hệ số cụm của từng tòa phụ bằng giá trị cũ

### Requirement: City level from goals
Cấp thành phố SHALL chỉ tăng khi mọi mục tiêu của cấp hiện tại đạt và được nhận thưởng; mục tiêu SHALL tính từ dữ liệu sẵn có của save.

#### Scenario: Level up
- **WHEN** đạt đủ mục tiêu cấp 1 (ví dụ 40 khách/ngày, 2 loại hình; mục tiêu cấp thấp không đòi mở đợt, vì W1 lại cần cấp thành phố 2 — tránh vòng lặp điều kiện) và nhận thưởng
- **THEN** cấp thành phố thành 2, `cityTier` cập nhật theo cấp, nhật ký có mốc mới

### Requirement: Wave gate
Đợt khai hoang SHALL yêu cầu thêm cấp thành phố tối thiểu ngoài cấp người chơi và tiền.

#### Scenario: City level too low
- **WHEN** người chơi đủ cấp và tiền mở W2 nhưng cấp thành phố là 3
- **THEN** `reclaim_wave` bị từ chối với `city_level`

### Requirement: City memory
Hệ thống SHALL hiển thị biển kỷ niệm tiệm đầu tiên từ cấp thành phố 3 và ghi nhật ký mốc (mở đợt, loại hình đầu tiên, lên cấp) kèm ngày game và người thực hiện.

#### Scenario: Persisted milestones
- **WHEN** lưu và nạp lại sau khi lên cấp thành phố 3
- **THEN** biển kỷ niệm và các mốc vẫn hiển thị, giống nhau ở cả hai người chơi co-op
