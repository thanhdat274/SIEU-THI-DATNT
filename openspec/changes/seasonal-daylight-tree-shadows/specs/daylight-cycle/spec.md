# Spec Delta

## Purpose

Quy định giờ mặt trời mọc/lặn và vị trí mặt trời theo mùa, deterministic, dùng chung cho ánh sáng và bóng.

## ADDED Requirements

### Requirement: Seasonal sunrise and sunset
Hệ thống SHALL tính giờ mọc/lặn từ ngày game bằng bảng mốc nội suy tuần hoàn trên năm 120 ngày, chỉ phụ thuộc `day`, và giữ độ dài ngày trong khoảng 11 đến 13 giờ.

#### Scenario: Same day, same result
- **WHEN** gọi hai lần với cùng `day`
- **THEN** kết quả bằng nhau và không phụ thuộc giờ máy hay RNG

#### Scenario: Year wraps smoothly
- **WHEN** so sánh ngày 120 và ngày 121 của năm kế tiếp
- **THEN** giờ mọc/lặn chênh nhau không quá 3 phút

#### Scenario: Sunrise and sunset drift apart
- **WHEN** so sánh các mùa trong năm
- **THEN** ngày mọc sớm nhất và ngày lặn muộn nhất không trùng nhau

### Requirement: Solar position
Hệ thống SHALL cung cấp phương vị và độ cao mặt trời nhất quán với mốc mọc/lặn: độ cao bằng 0 tại giờ mọc và giờ lặn, lớn nhất lúc 12:00, và âm hoặc bị kẹp về 0 ban đêm.

#### Scenario: Noon peak
- **WHEN** đọc độ cao lúc 12:00
- **THEN** đó là giá trị lớn nhất trong ngày và `getLightingState(12).sun` vẫn bằng 1

#### Scenario: Morning east, afternoon west
- **WHEN** đọc phương vị lúc 8:00 và 17:00
- **THEN** mặt trời ở phía đông buổi sáng và phía tây buổi chiều, nên `shadowLean` âm lúc 8:00 và dương lúc 17:00

#### Scenario: Seasonal noon bias
- **WHEN** so sánh trưa giữa tháng 6 và giữa tháng 12 game
- **THEN** mặt trời lệch bắc vào tháng 6 và lệch nam vào tháng 12

### Requirement: Backward-compatible lighting state
`getLightingState(hour, minute, day)` SHALL giữ chữ ký, chuyển pha mượt (không nhảy đột ngột mỗi 15 phút) và `getLightingState(24)` bằng `getLightingState(0)`.

#### Scenario: Existing lighting tests
- **WHEN** chạy `lighting-phase.test.ts`
- **THEN** các khẳng định hiện có vẫn đúng
