# Spec Delta

## Purpose

Thêm thời tiết theo ngày, ngày hội có mục tiêu và đơn đặt tiệc có hạn để mỗi ngày khác nhau.

## ADDED Requirements

### Requirement: Deterministic weather with forecast
Thời tiết mỗi ngày SHALL xác định theo `(worldId, day, mùa)`; hệ thống SHALL công bố dự báo ngày kế tiếp và dự báo SHALL bằng kết quả thực.

#### Scenario: Forecast equals outcome
- **WHEN** dự báo ngày D+1 là mưa
- **THEN** thời tiết ngày D+1 là mưa

### Requirement: Bounded demand modifier
Hệ số cầu từ mùa và thời tiết SHALL nhân lên nhóm hàng và lượng khách, kẹp trong khoảng cấu hình.

#### Scenario: Stacked modifiers clamped
- **WHEN** mùa và thời tiết cùng cho hệ số cao
- **THEN** hệ số cuối không vượt cận trên

### Requirement: Party order from warehouse
Đơn tiệc SHALL yêu cầu nhiều món, có hạn ngày; người chơi SHALL chấp nhận hoặc từ chối; hoàn thành SHALL trừ hàng từ kho theo FEFO, bỏ qua lô hết hạn và ghi doanh thu/giá vốn vào ledger.

#### Scenario: Insufficient stock
- **WHEN** giao đơn thiếu hàng
- **THEN** từ chối, không trừ kho, không ghi ledger

#### Scenario: Expired lot skipped
- **WHEN** kho có lô hết hạn và lô còn hạn
- **THEN** chỉ lô còn hạn được dùng

### Requirement: No penalty for declining
Từ chối hoặc để đơn quá hạn SHALL không trừ tiền hay uy tín.

#### Scenario: Deadline passes
- **WHEN** quá hạn đơn đã chấp nhận
- **THEN** đơn kết thúc, tiền và uy tín giữ nguyên

### Requirement: Replay-safe commands
Chấp nhận/giao đơn SHALL idempotent theo `commandId`.

#### Scenario: Duplicate fulfil
- **WHEN** gửi lại lệnh giao đơn đã hoàn thành
- **THEN** không trừ kho hay thưởng lần hai

### Requirement: Seasonal daylight
Renderer SHALL điều chỉnh đường cong keyframe ánh sáng theo lịch mùa 120 ngày của game, với giờ bình minh/hoàng hôn gần khí hậu TP.HCM; các mốc được xem là ước lượng thiết kế cho tới khi có dữ liệu thiên văn kiểm chứng. Bản code đầu tiên chỉ dùng daylight range xấp xỉ và còn phải khớp bảng mùa trước nghiệm thu.

#### Scenario: Same season uses deterministic sun times
- **WHEN** hai client cùng mở một world, ngày và giờ
- **THEN** màu trời, cường độ nắng và pha sáng/tối khớp nhau

### Requirement: Dynamic tree shadow
Bóng cây SHALL dịch hướng và đổi chiều dài theo sun state; ngắn quanh trưa, dài hơn khi nắng thấp; mưa SHALL làm bóng nhạt đi.

#### Scenario: Rain dims canopy shadow
- **WHEN** cường độ mưa tăng
- **THEN** bóng cây giảm alpha mà không thay đổi collision/map path

### Requirement: Variable intraday rain
Mưa SHALL có intensity deterministic trong [0,1] theo world seed/day/time và ramp lên/xuống; renderer MAY thể hiện bằng hạt mưa nhẹ, không tạo actor gameplay.

#### Scenario: Clear to shower to clear
- **WHEN** thời tiết ngày là mưa và thời gian trôi qua cửa sổ mưa
- **THEN** intensity chuyển từ 0 lên đỉnh rồi giảm về 0; cùng seed/day/time cho cùng giá trị

### Requirement: Cosmetic alley road markings
Lane markings, curb drains, crosswalks and signal props SHALL được vẽ ngoài collision layer; chúng không chặn đường đi của nhân vật.

#### Scenario: Walkable marked street
- **WHEN** người chơi đi qua vùng có crosswalk
- **THEN** đường đi và collision hiện hữu giữ nguyên

### Requirement: Vehicle arrival is a later slice
Arrival bằng xe máy/ô tô/đi bộ SHALL còn là backlog cho tới khi có tuyến đường, điểm đỗ, rời xe rồi route NPC vào cửa; vehicle sprites ban đầu không va chạm gameplay.

#### Scenario: No implied vehicle simulation
- **WHEN** chỉ có road decals trong renderer
- **THEN** spec/documentation không được gọi đó là traffic hoặc vehicle arrival đã triển khai
