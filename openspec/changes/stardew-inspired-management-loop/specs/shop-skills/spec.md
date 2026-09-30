# Spec Delta

## Purpose

Kỹ năng lên cấp qua hành động và cho lựa chọn đặc quyền ở mốc, không phải tiêu điểm hay tài nguyên mới.

## ADDED Requirements

### Requirement: Skill XP from actions
Ba kỹ năng (bán hàng, kho vận, kết thân) SHALL nhận XP từ hành động tương ứng tại handler sẵn có và SHALL lên cấp theo ngưỡng cấu hình.

#### Scenario: Checkout grants sales XP
- **WHEN** thanh toán thành công
- **THEN** kỹ năng bán hàng nhận XP đúng một lần cho giao dịch đó

#### Scenario: Replay
- **WHEN** lệnh thanh toán bị gửi lại
- **THEN** XP không cộng lần hai

### Requirement: Perk choice at milestones
Ở cấp 5 và 10 người chơi SHALL chọn đúng một trong hai đặc quyền; lựa chọn SHALL không đổi được và chỉ hợp lệ khi đủ cấp.

#### Scenario: Choose before level
- **WHEN** chọn đặc quyền cấp 5 khi mới cấp 4
- **THEN** từ chối với lý do

#### Scenario: Second choice same milestone
- **WHEN** chọn lần hai cho cùng mốc
- **THEN** từ chối

### Requirement: Bounded modifiers
Đặc quyền SHALL chỉ tác động qua hệ số cấu hình không quá trần (đề xuất 10%) và SHALL không phá bất biến ledger.

#### Scenario: Wider price band
- **WHEN** có đặc quyền nới dải giá
- **THEN** dải mới vẫn trong trần và lãi gộp = doanh thu − giá vốn

### Requirement: Save compatibility
Save không có kỹ năng SHALL tải với XP 0 và không perk.

#### Scenario: Old save
- **WHEN** tải save cũ
- **THEN** ba kỹ năng ở cấp 1, không lỗi
