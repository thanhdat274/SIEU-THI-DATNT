## Purpose

Cho hai thành viên đang online cùng một hẻm nói chuyện trực tiếp bằng mic ngay trong game, không cần ứng dụng ngoài.

## ADDED Requirements

### Requirement: Peer-to-peer audio between room members
The system SHALL cho phép hai thành viên online cùng hẻm thiết lập kênh âm thanh WebRTC trực tiếp; server SHALL chỉ chuyển tiếp tin nhắn bắt tay và SHALL NOT nhận hoặc xử lý dữ liệu âm thanh.

#### Scenario: Both players online
- **WHEN** cả hai thành viên đã kết nối WebSocket vào cùng hẻm và một bên bật mic
- **THEN** hai client thiết lập kết nối P2P và bên kia nghe được tiếng

#### Scenario: Only one player online
- **WHEN** chỉ một thành viên online trong hẻm
- **THEN** không tạo kết nối voice và giao diện hiển thị trạng thái chờ người kia

### Requirement: Authenticated and scoped signaling
The system SHALL chỉ chuyển tiếp tin nhắn `voice:signal` từ socket đã xác thực tới thành viên khác trong cùng hẻm; server SHALL gán danh tính người gửi, và SHALL bỏ qua loại tin nhắn lạ, payload quá lớn hoặc vượt giới hạn tần suất.

#### Scenario: Unauthenticated sender
- **WHEN** một socket chưa xác thực phiên gửi `voice:signal`
- **THEN** server bỏ qua tin nhắn và không chuyển cho ai

#### Scenario: Forged sender
- **WHEN** client gửi kèm trường `from` giả
- **THEN** người nhận chỉ thấy `from` do server gán theo tài khoản của socket gửi

#### Scenario: Oversized or invalid payload
- **WHEN** `kind` không thuộc offer/answer/candidate hoặc payload vượt giới hạn kích thước
- **THEN** server bỏ qua tin nhắn

### Requirement: Microphone control and consent
The system SHALL giữ mic tắt mặc định, chỉ xin quyền mic khi người chơi chủ động bật, cho phép tắt/bật lại mà không xin lại quyền, và SHALL báo lỗi rõ khi quyền bị từ chối hoặc không có thiết bị mic mà không làm gián đoạn game.

#### Scenario: First enable
- **WHEN** người chơi bấm bật mic lần đầu
- **THEN** trình duyệt xin quyền; nếu được cấp thì âm thanh bắt đầu gửi

#### Scenario: Permission denied
- **WHEN** người chơi từ chối quyền mic
- **THEN** giao diện báo lỗi và game tiếp tục bình thường; người chơi vẫn nghe được người kia

#### Scenario: Mute and unmute
- **WHEN** người chơi tắt rồi bật lại mic
- **THEN** tiếng ngừng/phát lại ngay mà không cần xin quyền hay dựng lại kết nối

### Requirement: Local mute of the other player
The system SHALL cho phép người nghe tắt tiếng người kia cục bộ; thao tác này SHALL NOT ảnh hưởng tiếng của chính họ hay trạng thái bên kia.

#### Scenario: Mute remote
- **WHEN** người chơi bấm tắt tiếng người kia
- **THEN** họ không nghe được người kia nữa, người kia vẫn nghe được họ

### Requirement: Speaking indicator and connection status
The system SHALL hiển thị ai đang nói và trạng thái voice (chờ, đang kết nối, đã kết nối, không kết nối được).

#### Scenario: Remote speaking
- **WHEN** người kia nói vượt ngưỡng âm lượng
- **THEN** chỉ báo của người kia sáng lên và tắt sau một khoảng im lặng ngắn

#### Scenario: Connection failure
- **WHEN** kết nối P2P không thiết lập được hoặc bị ngắt
- **THEN** trạng thái chuyển sang "không kết nối được" và người chơi có thể thử lại

### Requirement: Clean teardown
The system SHALL đóng kết nối voice, dừng track mic và giải phóng tài nguyên khi người kia rời hẻm, WebSocket đóng, phiên bị thay thế/kick hoặc người chơi rời màn chơi; khi người kia vào lại SHALL tự thiết lập lại.

#### Scenario: Partner leaves
- **WHEN** người kia ngắt kết nối
- **THEN** kết nối voice đóng, trạng thái bật/tắt mic của mình được giữ, giao diện về trạng thái chờ

#### Scenario: Partner rejoins
- **WHEN** người kia vào lại hẻm
- **THEN** voice tự kết nối lại mà không cần thao tác thêm (ngoài quyền mic đã được cấp)
