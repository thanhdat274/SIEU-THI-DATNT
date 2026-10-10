# Tasks

## 1. Signaling phía server

- [x] 1.1 Thêm handler `voice:signal` trong `apps/server/src/world.gateway.ts`: kiểm session/membership, `allowSocketMessage`, `kind` hợp lệ, giới hạn kích thước payload, chuyển cho socket thành viên khác kèm `from` do server gán.
- [x] 1.2 Phát `voice:peer` `{ accountId, present }` khi thành viên vào/ra hẻm (handleConnection/handleDisconnect/replaced/kick) và gửi danh sách người đang có mặt cho socket mới vào.
- [x] 1.3 Test gateway: chuyển tiếp đúng người, không chuyển chéo hẻm, `from` giả bị ghi đè, payload quá lớn/kind lạ bị bỏ, rate limit; chạy `yarn --cwd apps/server test:unit` (và `test:gateway` nếu có Mongo).

## 2. Client voice

- [x] 2.1 Mở rộng `useWorldSocket` để gửi `voice:signal` và nhận `voice:signal`/`voice:peer` qua callback, giữ nguyên hành vi hiện có.
- [x] 2.2 Tạo hook `useVoiceChat` trong `apps/web/src/hooks`: RTCPeerConnection, quy tắc offerer theo accountId, transceiver sendrecv sẵn, `getUserMedia` khi bật mic lần đầu, `track.enabled` để tắt/bật, `iceServers` mặc định STUN và ghi đè bằng `VITE_ICE_SERVERS`.
- [x] 2.3 Phát âm thanh nhận qua `<audio>`; xử lý autoplay bị chặn; tắt tiếng người kia cục bộ.
- [x] 2.4 Chỉ báo đang nói bằng AnalyserNode cho cả hai phía; trạng thái kết nối (chờ/đang kết nối/đã kết nối/thất bại) và thử lại.
- [x] 2.5 Dọn dẹp: đóng peer, dừng track, đóng AudioContext khi partner rời, socket đóng, session replaced/kicked, unmount; tự dựng lại khi partner vào lại.

## 3. Giao diện và test logic

- [x] 3.1 Thành phần UI voice trong màn chơi online: nút mic, nút tắt tiếng người kia, chỉ báo nói, thông báo lỗi quyền/thiết bị/kết nối; chỉ hiện ở hẻm chung. Theo phong cách UI hiện có, dùng được trên mobile.
- [x] 3.2 Test thuần (vitest) cho logic tách được: chọn offerer, parse `iceServers`, ngưỡng nói và độ trễ tắt.

## 4. Kiểm chứng và tài liệu

- [x] 4.1 `yarn typecheck`, `yarn test:all` PASS.
- [ ] 4.2 Thử thật hai client (hai trình duyệt/hai máy, dùng tai nghe): bật mic, nghe nhau, tắt tiếng, rời/vào lại, từ chối quyền. Ghi đúng kết quả; nếu chỉ thử được một máy thì ghi là chưa kiểm chứng qua hai mạng khác nhau. **Điều kiện để chạy:** phải có TURN server + set `VITE_ICE_SERVERS` (JSON) khi build web + chạy qua HTTPS/localhost — hướng dẫn ở `docs/deploy.md` (mục "Voice chat"). Chỉ STUN (mặc định) sẽ fail với nhiều cặp sau NAT đối xứng.
- [x] 4.3 Cập nhật `tổng hợp.md` (chức năng, giới hạn: không TURN/cần HTTPS/lộ IP, bằng chứng kiểm tra thật, lịch sử) và đồng bộ `TASKS.md`, `ROADMAP.md` nếu liên quan.
