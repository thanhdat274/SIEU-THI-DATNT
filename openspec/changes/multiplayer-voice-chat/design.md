# Design

## Context

Đối chiếu source ngày 05/10/2026: `apps/server/src/world.gateway.ts` xác thực ticket một lần, giữ `entry.sockets` theo hẻm (tối đa hai người), có `allowSocketMessage` (rate limit) và `broadcastToWorld`. `apps/web/src/hooks/useWorldSocket.ts` mở socket, xử lý các event `world:snapshot`, `avatars:update`, `time-vote:update`, `session:*`. Chưa có WebRTC hay voice.

## Goals / Non-Goals

**Goals:** hai người online cùng hẻm nói chuyện được bằng mic; không thêm hạ tầng server âm thanh; tắt/bật mic và tắt tiếng người kia; dọn kết nối đúng lúc.

**Non-Goals:** TURN/relay, ghi âm, chat chữ, voice nhiều hơn hai người, push-to-talk, lọc ồn nâng cao ngoài mặc định của trình duyệt, voice khi solo, lưu cài đặt mic vào save.

## Decisions

### 1. WebRTC P2P, chỉ audio
Mỗi client tạo một `RTCPeerConnection` tới người còn lại. Cấu hình `iceServers` mặc định gồm STUN công cộng (`stun:stun.l.google.com:19302`), cho phép ghi đè bằng biến môi trường `VITE_ICE_SERVERS` (JSON) để sau này thêm TURN không phải sửa code.

### 2. Signaling qua gateway có sẵn
Event `voice:signal` với body `{ kind: 'offer' | 'answer' | 'candidate', payload }`. Server kiểm: socket đã `_sessionOk`, qua `allowSocketMessage`, `kind` hợp lệ, payload là object và nhỏ (giới hạn khoảng 8 KB), rồi chuyển tiếp tới socket của thành viên khác trong cùng hẻm kèm `from` = accountId do server gán (không tin client). Server không lưu và không diễn giải payload.

Event `voice:peer` `{ accountId, present }` do server phát khi socket vào/ra hẻm, và gửi danh sách người đang có mặt cho socket mới vào, để client biết khi nào bắt đầu/đóng kết nối.

### 3. Bên gọi (offerer)
Tránh hai bên cùng gửi offer: bên có accountId nhỏ hơn (so sánh chuỗi) là offerer. Khi cả hai có mặt, offerer tạo offer, bên kia trả answer. Một cặp, một track nên không cần perfect negotiation.

### 4. Vòng đời mic
- Mặc định chưa xin quyền mic. Lần đầu bấm "Bật mic" mới gọi `getUserMedia` với `echoCancellation`, `noiseSuppression`, `autoGainControl`.
- Transceiver audio `sendrecv` tạo sẵn từ đầu để nghe được người kia dù mình chưa bật mic; khi bật mic dùng `replaceTrack`, không cần đàm phán lại.
- Tắt mic = `track.enabled = false` (giữ kết nối, không xin lại quyền).
- Tắt tiếng người kia = tắt phía người nghe (`muted`), trạng thái cục bộ, không gửi sang người kia.
- Đóng: `voice:peer present=false`, socket đóng, session replaced/kicked, unmount → đóng `RTCPeerConnection`, dừng track, đóng `AudioContext`.

### 5. Chỉ báo đang nói
`AudioContext` + `AnalyserNode` trên stream cục bộ và stream nhận được; ngưỡng RMS đơn giản có độ trễ tắt ngắn để tránh nhấp nháy, lấy mẫu khoảng 100 ms. Logic ngưỡng tách thành hàm thuần để test.

### 6. Autoplay và quyền
Âm thanh nhận được phát qua `<audio autoplay>` ẩn. Nếu `play()` bị từ chối, UI hiện nút "bấm để nghe". Từ chối quyền mic hoặc không có thiết bị phải hiện thông báo rõ và không làm hỏng game.

### 7. Bảo mật/quyền riêng tư
Signaling chỉ trong phòng đã xác thực. Không log nội dung SDP/ICE. Địa chỉ IP của hai người lộ cho nhau qua ICE candidate (đặc tính P2P); ghi rõ trong tài liệu.

## Risks / Trade-offs

- Không có TURN: một phần cặp sau NAT đối xứng không nối được → hiển thị "không kết nối được voice" thay vì treo; mở change sau để thêm TURN.
- Deploy http thường không bật được mic → ghi yêu cầu HTTPS.
- Thử hai tab cùng máy sẽ bị vọng âm → dùng tai nghe khi kiểm thử.
- Chưa kiểm chứng qua hai mạng khác nhau cho đến khi thử thật (task 4.2).
