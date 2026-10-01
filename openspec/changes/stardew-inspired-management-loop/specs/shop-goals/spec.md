# Spec Delta

## Purpose

Sổ ước nguyện và nhiệm vụ tuần cho mục tiêu dài hạn với phần thưởng thật, tiến độ tính từ số liệu sẵn có.

## ADDED Requirements

### Requirement: Derived progress
Tiến độ mục tiêu SHALL tính lại từ số liệu (thống kê, bản ghi ngày, ledger, sao) và chỉ lưu thứ không suy ra được.

#### Scenario: Reload keeps progress
- **WHEN** tải lại game
- **THEN** tiến độ hiển thị giống trước khi tải

### Requirement: One-time claim
Mỗi mục tiêu hoàn thành SHALL nhận thưởng đúng một lần; nhận lại SHALL bị từ chối.

#### Scenario: Double claim
- **WHEN** gửi hai lệnh claim cùng mục tiêu
- **THEN** chỉ lần đầu cộng thưởng

### Requirement: Group rewards
Hoàn thành mọi mục trong một nhóm SHALL mở phần thưởng nhóm cấu hình (đất, mối nhập, nội thất, danh hiệu) qua hàm mở khóa sẵn có.

#### Scenario: Group complete
- **WHEN** nhận mục cuối của nhóm
- **THEN** phần thưởng nhóm được mở đúng một lần

### Requirement: Weekly quests
Hệ thống SHALL sinh nhiệm vụ tuần xác định theo tuần (7 ngày) dùng cùng engine tiến độ; chưa nhận khi hết tuần SHALL hết hiệu lực không phạt.

#### Scenario: Week rolls over
- **WHEN** sang tuần mới
- **THEN** nhiệm vụ tuần mới thay thế, mục chưa nhận bị bỏ

#### Scenario: Party order count is scoped to current week
- **WHEN** tính tiến độ tuần có điều kiện số đơn tiệc
- **THEN** chỉ đếm đơn có `completedDay` trong khoảng tuần hiện tại; đơn hoàn tất tuần trước không được tính

### Requirement: Data-driven content
Mục tiêu và thưởng SHALL nằm trong `game-data` để thêm nhóm không sửa logic.

#### Scenario: Add group
- **WHEN** thêm nhóm mới trong dữ liệu
- **THEN** hiển thị và tính tiến độ không cần đổi module logic
