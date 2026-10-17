# Spec Delta

## ADDED Requirements

### Requirement: Civic upkeep
Mỗi công trình công cộng SHALL trừ phí duy trì mỗi ngày từ quỹ chung và ghi sổ cái loại `civic_upkeep` gắn tòa.

#### Scenario: Daily upkeep
- **WHEN** qua một ngày với một công viên
- **THEN** tiền giảm đúng `upkeepPerDay` và có một dòng `civic_upkeep` cho tòa đó

### Requirement: Neighborhood fee without double taxation
Phí xóm SHALL chỉ tính trên ô lô sở hữu và giảm theo chỉ số sống khu; lô thuê và doanh thu SHALL không bị thu thêm phí mới.

#### Scenario: Leased parcel only
- **WHEN** người chơi chỉ có lô thuê
- **THEN** phí xóm bằng 0 và tiền thuê vẫn thu như cũ

#### Scenario: High QoL discount
- **WHEN** cùng số ô sở hữu, so khu QoL 80 với khu QoL 20
- **THEN** phí ở khu QoL 80 thấp hơn
