# Spec Delta

## Purpose
Tăng độ sống động cho không gian hẻm phố và tiệm tạp hóa bằng ánh sáng tự nhiên theo mùa, vệt mưa biến thiên theo giờ và vạch sơn trang trí đường phố.

## ADDED Requirements

### Requirement: Seasonal daylight envelope
Hệ thống SHALL xác định thời gian bình minh (`sunrise`) và hoàng hôn (`sunset`) theo chu kỳ 120 ngày của năm game, đồng thời ánh xạ liên tục các pha chiếu sáng (đêm, bình minh, sáng, trưa, xế chiều, hoàng hôn, tối) bảo đảm đỉnh nắng tại 12:00 trưa và không giật pha đột ngột.

#### Scenario: Midday solar peak
- **WHEN** thời gian game đạt 12:00 ở bất kỳ ngày nào trong chu kỳ
- **THEN** cường độ nắng (`sun`) đạt giá trị tối đa 1.0, đèn nhân tạo bằng 0 và độ nghiêng bóng đổ bằng 0

#### Scenario: Sunrise and sunset transitions
- **WHEN** thời gian đồng hồ đạt mốc `sunrise` hoặc `sunset` theo mùa của ngày
- **THEN** hệ thống kích hoạt chính xác keyframe bình minh (dawn) hoặc hoàng hôn (sunset) tương ứng

### Requirement: Deterministic intraday rain intensity
Hệ thống SHALL tính toán cường độ mưa (`rainIntensity`) nội suy xác định từ `weatherSeed`, số ngày, giờ, phút và loại thời tiết (`rainy`, `heavy_rain`, `storm`), tạo hiệu ứng chuyển tiếp tăng dần rồi giảm dần thay vì giữ nguyên một cường độ suốt ngày.

#### Scenario: Dry weather
- **WHEN** thời tiết là nắng hoặc nhiều mây (không mưa)
- **THEN** cường độ mưa luôn trả về 0

#### Scenario: Rain streak overlay and shadow dampening
- **WHEN** cường độ mưa lớn hơn 0
- **THEN** renderer hiển thị vệt mưa bao phủ tầm nhìn camera hiện tại và làm mờ bóng cây tương ứng với độ lớn của mưa

### Requirement: Cosmetic street decals
Hệ thống SHALL vẽ các chi tiết vạch sơn phân làn, rãnh mép đường, vạch kẻ qua đường và cột tín hiệu trang trí ngoài mặt đường mà KHÔNG làm thay đổi bản đồ va chạm hay đường dẫn nhân vật.

#### Scenario: Pedestrian crossing and road marks
- **WHEN** bản đồ được dựng trên viewport
- **THEN** các vệt trang trí đường hiển thị đúng phối cảnh 2.5D và không cản trở lối đi của người chơi hay khách NPC
