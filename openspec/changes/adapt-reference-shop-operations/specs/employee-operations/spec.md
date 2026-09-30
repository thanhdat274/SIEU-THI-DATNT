# Spec Delta

## Purpose

Quy định hành vi employee-operations khi chuyển các quy tắc vận hành tiệm sang game hiện tại, bảo toàn tài sản và tương thích tiến trình người chơi.

## ADDED Requirements

### Requirement: Hire and assign staff
Người chơi SHALL tuyển theo slot/cấp/ngân sách và phân vai thu ngân hoặc châm kệ; nhân viên SHALL chỉ làm trong ca với target hợp lệ và có đường tới điểm tương tác.

#### Scenario: No path
- **WHEN** nhân viên châm kệ không tới được kho hoặc kệ
- **THEN** không teleport hàng, báo việc bị chặn

#### Scenario: No available slot
- **WHEN** tuyển thêm khi đủ slot
- **THEN** từ chối và không trừ phí

### Requirement: Exclusive jobs and handover
Một việc SHALL chỉ có một người nhận; trước commit SHALL kiểm tra lại target; kết thúc ca SHALL bàn giao không làm mất hàng đang mang hoặc chiếm claim vĩnh viễn.

#### Scenario: Player claims staff target
- **WHEN** người chơi và nhân viên cùng nhận việc châm một kệ
- **THEN** chỉ một người nhận, tác nhân còn lại nhận kết quả bận

#### Scenario: Shift ends carrying goods
- **WHEN** nhân viên hết ca khi mang hàng nhưng chưa bày
- **THEN** hàng được bàn giao/hoàn có theo dõi, claim được nhả và tổng hàng không đổi

### Requirement: Daily payroll
Hệ thống SHALL ghi lương theo ca một lần mỗi ngày; thiếu tiền SHALL ghi nợ và giữ tiền không âm.

#### Scenario: Payroll after reload
- **WHEN** reload ngay sau chốt lương
- **THEN** không trả lương lại

#### Scenario: Insufficient cash
- **WHEN** lương phải trả 30000 và tiền còn 10000
- **THEN** tiền còn 0, lương đã trả 10000 và nợ 20000

