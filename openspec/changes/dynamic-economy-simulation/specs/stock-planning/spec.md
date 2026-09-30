# Spec Delta

## Purpose

Cho người chơi thông tin dự báo để tự quyết định nhập/giữ hàng, không tự quyết định thay họ.

## ADDED Requirements

### Requirement: Per-product planning information
Hệ thống SHALL cung cấp cho mỗi sản phẩm: tồn hiện tại (kệ + kho + hàng chờ), nhu cầu dự kiến mỗi ngày, số bán gần đây, xu hướng nhu cầu theo mùa, tác động thời tiết hiện tại/dự báo, số lượng nên nhập, và các cờ: sắp hết, chậm bán, sắp hết hạn.

#### Scenario: Expected demand reflects forecast
- **WHEN** dự báo ngày mai mưa to
- **THEN** nhu cầu dự kiến của món nhạy mưa cho ngày mai khác nhu cầu hôm nay theo bộ chỉnh dữ liệu và bảng thông tin nêu nguyên nhân

#### Scenario: At-risk product
- **WHEN** tồn dùng được của món ít hơn nhu cầu dự kiến trong thời gian giao của nhà cung cấp
- **THEN** món có cờ "sắp hết" và khuyến nghị số lượng nhập để đủ cho khoảng dự báo cấu hình

#### Scenario: Slow-moving
- **WHEN** món bán dưới ngưỡng cấu hình trong số ngày cấu hình trong khi còn tồn
- **THEN** món có cờ "chậm bán"

#### Scenario: Expiring
- **WHEN** lô còn hạn nhỏ hơn số ngày cảnh báo
- **THEN** món có cờ "sắp hết hạn" kèm số lượng và ngày hết hạn sớm nhất

### Requirement: Advice only
Hệ thống SHALL NOT tự đặt hàng, đổi giá hay chuyển hàng khi hiển thị thông tin lập kế hoạch; người chơi thực hiện bằng thao tác hiện có. Khuyến nghị SHALL tôn trọng ngân sách, sức chứa kho mát, tồn nhà cung cấp và mức giá hôm nay.

#### Scenario: No side effects
- **WHEN** mở bảng lập kế hoạch
- **THEN** tiền, kho, đơn chờ và giá không đổi

#### Scenario: Recommendation capped by supplier
- **WHEN** nhu cầu cần nhiều hơn tồn nhà cung cấp
- **THEN** khuyến nghị không vượt tồn đó và ghi chú thiếu hụt

### Requirement: Auto-buy consistency
Gợi ý nhập hiện có SHALL dùng cùng nhu cầu dự kiến khi dữ liệu thị trường có sẵn, và SHALL giữ hành vi theo vận tốc bán khi không có.

#### Scenario: Same number both places
- **WHEN** gợi ý nhập và bảng lập kế hoạch cùng tính cho một món
- **THEN** hai nơi dùng cùng nhu cầu dự kiến
