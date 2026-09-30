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
