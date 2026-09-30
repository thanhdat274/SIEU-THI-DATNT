## Purpose

Cho hai người vận hành cùng một tiệm và nhìn thấy cùng thế giới, với server quyết định giao dịch để bảo toàn tiền và hàng khi thao tác đồng thời.

## ADDED Requirements

### Requirement: Shared authoritative simulation
The system SHALL đồng bộ vị trí/hướng của hai avatar cùng clock, NPC, quỹ, kho, đơn, kệ và XP kinh doanh; client SHALL không được quyết định số dư, tốc độ đi hoặc trạng thái NPC.

#### Scenario: Two players in one shop
- **WHEN** A di chuyển và B châm kệ hợp lệ
- **THEN** hai client thấy avatar A và lượng tồn mới giống server, camera/input của mỗi người hoạt động riêng

#### Scenario: Invalid movement or interaction
- **WHEN** client yêu cầu xuyên tường, tốc độ vượt giới hạn hoặc châm kệ ngoài tầm tương tác
- **THEN** server từ chối/correct vị trí và không chuyển hàng

### Requirement: Atomic idempotent business commands
The system MUST xử lý nhập/bày/cất/checkout nguyên tử, validate payload/quyền/world/cơ sở/revision, và mỗi commandId chỉ có một kết quả bền; checkout MUST gắn khách đang chờ và hàng được giữ.

#### Scenario: Two players checkout the same customer
- **WHEN** hai người cùng gửi thanh toán một checkoutId
- **THEN** chỉ một giao dịch thành công, tiền/XP chỉ cộng một lần, hàng không âm

#### Scenario: Compete for the last stock
- **WHEN** hai người cùng chuyển món cuối trong kho
- **THEN** tổng hàng được bảo toàn và chỉ một yêu cầu được chuyển món đó

#### Scenario: Retry after missing acknowledgement
- **WHEN** command đã commit được gửi lại cùng ID và payload sau reconnect hoặc restart
- **THEN** server trả kết quả đã lưu, không cộng/trừ tiền hay hàng lần nữa

#### Scenario: Forged or stale command
- **WHEN** client gửi số lượng sai, business của world khác, ID cũ với payload khác hoặc revision lỗi thời
- **THEN** không có mutation; lỗi trả rõ nguyên nhân và stale client nhận trạng thái mới

### Requirement: Shared time controls
The system SHALL cho một người online đổi tốc độ/qua ngày; với hai người SHALL yêu cầu cả hai đồng ý trong 30 giây, hủy nếu hết hạn hoặc danh sách session đổi. Chuyển ngày tự động theo clock SHALL giữ hành vi hiện tại.

#### Scenario: Both players approve
- **WHEN** hai người đồng ý cùng yêu cầu qua ngày trước timeout
- **THEN** world qua ngày đúng một lần, giao hàng/hết hạn xử lý đúng một lần

#### Scenario: Missing approval or participant disconnect
- **WHEN** thiếu phiếu sau 30 giây hoặc một session rời trong lúc chờ
- **THEN** yêu cầu hủy và không tự thực thi

### Requirement: Online disconnect and modal behavior
The system SHALL khóa mutation ở client mất kết nối; mở modal SHALL chỉ khóa input người mở, không pause world cho người khác.

#### Scenario: Player reads inventory
- **WHEN** A mở modal còn B đứng quầy
- **THEN** B tiếp tục chơi, clock/NPC cập nhật và modal A nhận tồn mới

#### Scenario: Connection lost
- **WHEN** kết nối A ngắt
- **THEN** A thấy trạng thái mất mạng và không bán/nhập offline vào world chung
