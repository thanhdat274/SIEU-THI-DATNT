## Purpose

Lưu và khôi phục world chung để các thành viên chơi lệch giờ, đồng thời giữ nguyên save riêng và không mô phỏng kinh tế khi không có ai online.

## ADDED Requirements

### Requirement: Durable world state and safe failure
The system MUST persist giao dịch kinh tế và kết quả chống trùng trước ACK thành công; SHALL khôi phục sau restart, không tạo save trắng khi DB/load lỗi. Vị trí/clock SHALL có checkpoint tối đa mỗi 5 giây.

#### Scenario: Restart after confirmed sale
- **WHEN** server restart sau khi client nhận bán hàng thành công
- **THEN** quỹ, hàng và receipt khôi phục đúng, không mất giao dịch đã xác nhận

#### Scenario: Storage unavailable
- **WHEN** DB lỗi lúc load hoặc commit
- **THEN** hệ thống báo lỗi/retry, không ACK thành công, không ghi seed đè world cũ

### Requirement: Presence controlled pause and resume
The system SHALL tiếp tục khi có ít nhất một session active; SHALL xác định mất kết nối trong tối đa 15 giây, checkpoint và pause khi không còn session. Resume SHALL không catch-up khoảng offline.

#### Scenario: Owner leaves
- **WHEN** owner thoát nhưng member còn online
- **THEN** khách, clock và bán hàng tiếp tục theo quy tắc mở/đóng tiệm

#### Scenario: Everyone offline
- **WHEN** session cuối rời hoặc hết heartbeat và world được mở lại sau một ngày thật
- **THEN** world khôi phục ở checkpoint, không cộng doanh thu/chi phí/hàng hỏng theo thời gian thật đã vắng

### Requirement: Reconnect reconciles authoritative state
The system SHALL xác thực lại membership, tải snapshot và giải quyết command chưa ACK bằng receipt khi reconnect; protocol không tương thích SHALL yêu cầu cập nhật thay vì nhận mutation.

#### Scenario: Rejoin after another member works
- **WHEN** A quay lại sau khi B đã bán và nhập hàng
- **THEN** A nhận revision/quỹ/kho/ngày mới nhất, không upload snapshot cũ ghi đè

#### Scenario: Old client version
- **WHEN** client dùng protocol không được hỗ trợ
- **THEN** client nhận thông báo cập nhật và không được thay đổi world

### Requirement: Preserve local progress
The system SHALL giữ save local hiện tại độc lập, không tự chuyển/copy tài sản vào online world; lỗi đăng nhập SHALL không ngăn tiếp tục solo local.

#### Scenario: Create online world from existing local player
- **WHEN** người chơi có local save rồi tạo/tham gia world online
- **THEN** local save không bị sửa, world online dùng seed hoặc trạng thái server riêng

### Requirement: Absence activity summary
The system SHALL hiển thị tóm tắt thu/chi và hoạt động kinh doanh từ lần xem trước, gắn actor và giao dịch; SHALL hiển thị tối đa 100 event gần nhất và báo rõ lịch sử bị giới hạn.

#### Scenario: Return after partner works
- **WHEN** thành viên quay lại sau các giao dịch của người còn online
- **THEN** bảng Trong lúc bạn vắng phản ánh các sự kiện đã commit, không suy đoán từ chênh lệch số dư
