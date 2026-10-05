# Proposal

## Why

Hai người chơi chung một hẻm hiện chỉ phối hợp qua bản đồ và phiếu bình chọn thời gian; không có kênh nói chuyện. Chơi với người yêu/bạn bè sẽ tự nhiên hơn nếu nói chuyện trực tiếp ngay trong game, không cần mở thêm Discord/Zalo.

## What Changes

- Thêm voice chat thời gian thực giữa tối đa hai thành viên đang online cùng một hẻm, dùng WebRTC peer-to-peer (chỉ audio).
- Server WebSocket hiện có (`world.gateway.ts`) chỉ chuyển tiếp tin nhắn bắt tay (offer/answer/ICE) tới người còn lại trong cùng hẻm; không nhận hay trộn âm thanh.
- Dùng máy chủ STUN công cộng; chưa dựng TURN (để sau, nếu thực tế có cặp không kết nối được).
- UI trong game: nút bật/tắt mic của mình, nút tắt tiếng người kia, chỉ báo ai đang nói, trạng thái kết nối voice.
- Mic mặc định tắt cho đến khi người chơi chủ động bật (cần quyền trình duyệt). Voice tự đóng khi người kia rời hẻm, mất kết nối hoặc khi mình rời.

## Capabilities

### New Capabilities

- `voice-chat`: kênh âm thanh P2P giữa hai thành viên online cùng hẻm, signaling qua gateway, điều khiển mic/tắt tiếng và vòng đời kết nối.

### Modified Capabilities

Không có main spec hiện hành cần sửa.

## Impact

- `apps/server/src/world.gateway.ts`: thêm sự kiện signaling `voice:signal` và `voice:peer` (chuyển tiếp trong phòng, kiểm membership, rate limit, giới hạn kích thước).
- `apps/web`: hook `useVoiceChat` (RTCPeerConnection, getUserMedia, đo âm lượng), mở rộng `useWorldSocket` để gửi/nhận signaling, thành phần UI voice.
- Không đổi save, dữ liệu world, economy hay protocol snapshot.
- Yêu cầu HTTPS (hoặc localhost) khi deploy để dùng mic.
- Rủi ro đã biết: một phần cặp người chơi sau NAT đối xứng sẽ không nối được khi chưa có TURN.
