# Spec Delta

## Purpose

Hai người chơi cùng quy hoạch đất trên một thành phố mà không giành ô của nhau, có quyền theo vai trò và đồng ý cho khoản chi lớn.

## ADDED Requirements

### Requirement: Planning reservations
Server SHALL giữ chỗ quy hoạch tạm (không lưu save) theo người chơi, hết hạn sau 60 giây không gia hạn hoặc khi ngắt kết nối, phát trong snapshot cho người khác, và từ chối lệnh đất của người khác đụng chỗ đang giữ với `reserved_by_other`.

#### Scenario: Conflicting selection
- **WHEN** A giữ 6 ô quanh tiệm chính và B gửi `expand_footprint` trùng một ô
- **THEN** lệnh của B bị từ chối với `reserved_by_other` kèm tên A, tiền không đổi

#### Scenario: Reservation expires
- **WHEN** A đóng tab giữa lúc giữ chỗ
- **THEN** giữ chỗ biến mất ngay khi socket ngắt (hoặc chậm nhất 60 giây) và B chọn được các ô đó

### Requirement: Role permissions
Lệnh đất SHALL kiểm vai trò theo bảng quyền và `memberLandPermissions` do chủ hẻm đặt.

#### Scenario: Member without permission
- **WHEN** `memberLandPermissions = none` và thành viên gửi `reclaim_wave`
- **THEN** bị từ chối với `forbidden`, không tạo phiếu

### Requirement: Large-spend vote
Dời tòa, khai hoang hoặc khoản chi vượt ngưỡng khi người kia online SHALL tạo phiếu; chỉ thực hiện khi người kia đồng ý hoặc rời đi; từ chối/hết hạn SHALL không trừ tiền.

#### Scenario: Partner declines
- **WHEN** thành viên gửi dời quán nước và chủ hẻm từ chối phiếu
- **THEN** quán nước giữ nguyên vị trí, tiền không đổi, thành viên nhận thông báo có tên chủ hẻm

#### Scenario: Partner offline
- **WHEN** chủ hẻm gửi khai hoang khi thành viên offline
- **THEN** lệnh chạy ngay không cần phiếu

### Requirement: Attribution
Mọi thay đổi đất SHALL ghi `builtBy` và một dòng nhật ký thành phố; save chơi một mình ghi `'local'`.

#### Scenario: City log
- **WHEN** B mua lô góc W1
- **THEN** nhật ký có dòng mua lô kèm tên B và ngày game
