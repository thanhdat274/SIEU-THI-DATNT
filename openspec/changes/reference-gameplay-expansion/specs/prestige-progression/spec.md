# Spec Delta

## Purpose

Tạo tiến trình meta sau cấp tối đa hiện hành, ghi nhận XP vượt cấp thành prestige mà không đặt lại cấp thường hoặc làm mất tiến trình save cũ.

## ADDED Requirements

### Requirement: Prestige chỉ bắt đầu sau level cap
Trước khi đạt cap hiện hành, XP SHALL tiếp tục theo luật level thường; sau cap, XP dư SHALL tích lũy prestige theo ngưỡng cấu hình và số sao SHALL bị giới hạn.

#### Scenario: Người chơi dưới cap
- **WHEN** người chơi nhận XP ở cấp dưới cap
- **THEN** XP chỉ tiến triển level thường và prestige không tăng

#### Scenario: XP qua nhiều mốc prestige
- **WHEN** người chơi ở cap nhận XP đủ qua nhiều ngưỡng
- **THEN** prestige tăng đúng số mốc và không vượt cap sao

### Requirement: Thưởng prestige có giới hạn
Bonus từ prestige SHALL được cấu hình có cap và SHALL không tạo vòng tăng XP/doanh thu vô hạn.

#### Scenario: Đạt cap prestige
- **WHEN** người chơi đã đạt cap sao nhận thêm XP
- **THEN** level, XP và thưởng không vượt giới hạn được công bố
