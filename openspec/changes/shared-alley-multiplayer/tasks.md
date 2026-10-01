# Tasks

## 1. Hợp đồng dữ liệu và runtime

- [x] 1.1 ADR/runtime config và health đã có. Bỏ yêu cầu transaction/replica set (mỗi hẻm là 1 document, commit bằng một updateOne nguyên tử). `verify:runtime`, `test:worlds`, `test:gateway` PASS trên MongoDB standalone local 30/09/2026.
- [x] 1.2 Thêm types và runtime validator account/world/business/avatar/command/snapshot trong shared; test schema sai, business/world scope và round-trip; chạy yarn typecheck.
- [x] 1.3 Tạo seed world online riêng và adapter model local schema 2; test tiền/XP thuộc business và join không copy tài sản; ghi hợp đồng và giới hạn vào docs/multiplayer, tổng hợp.

## 2. Core headless và giao dịch

- [x] 2.1 Tách tick/input/callback browser trong simulation/input và local adapter; chạy core không DOM; regression clock/collision/nhập/giao/bày/cất/save giữ local hoạt động.
- [x] 2.2 Thêm avatar theo ID và input intent có sequence, giới hạn tốc độ/khoảng cách; test hai avatar độc lập, va chạm, input hết hạn và forged movement.
- [x] 2.3 Thay online bán vô điều kiện bằng checkoutId gắn khách chờ/giữ hàng; test hai người thanh toán cùng khách và tranh món cuối không âm hàng/nhân tiền.
- [x] 2.4 Tạo command handler serialize, revision check và kết quả có commandId; test validation, cross-business, ID dùng lại với payload khác; cập nhật tài liệu core và tổng hợp bằng kết quả thực.

## 3. Server, membership và lưu bền

- [ ] 3.1 HTTP bootstrap/Firebase guard/ACL; WS ticket một lần TTL 30s, origin allowlist, heartbeat 10s/timeout 15s, snapshot 500ms, movement/time-vote/cancel và session replacement đã có test gateway hai session. Còn thiếu test Firebase-authenticated ticket route thật và full browser reconnect.
- [x] 3.2 Mongo repository ACL/create/list/invite/join race/capacity=2/leave/kick/reset/revoke; gateway kick/replacement; `test:worlds` PASS trên Mongo standalone (01/10/2026).
- [ ] 3.3 `commitCommand` dùng một `updateOne` nguyên tử (không transaction); test cùng command retry, payload/revision guard, hai command cùng revision chỉ một thắng; test transaction rollback tổng quát PASS. Chưa test tiến trình server crash sau commit-trước-ACK thực tế hoặc outage đang giao dịch.
- [ ] 3.4 Core `WorldRuntime` test timeout/pause/checkpoint/vote; repo integration tái tạo runtime từ persisted save/time và chứng minh checkpoint revision cũ không overwrite commit. Gateway tuần tự hóa checkpoint, chỉ evict runtime idle sau khi flush thành công, giữ runtime nếu checkpoint lỗi, đóng socket heartbeat-timeout; gateway integration mô phỏng idle eviction rồi tạo runtime mới và xác nhận clock/avatar từ Mongo. Chưa test process restart thực, owner offline/member tiếp tục qua nhiều giờ hoặc checkpoint outage/retry.
- [x] 3.5 ProtocolVersion guard, lastSeenRevision/touchSession, không đổi lastSeen khi poll; repo test PASS.
- [x] 3.6 Phiếu ngày/tốc độ 30s + activity summary 100 event; core/repository test PASS, gateway test xác nhận hai session cùng duyệt ngày.

## 4. Client và renderer

- [ ] 4.1 UI local/my alley/create/join/invite có sẵn; màn đầu game hiện hiển thị tài khoản và nút Đăng xuất riêng sau khi đăng nhập. Local screen smoke PASS lịch sử; chưa test Google OAuth thật và UI bằng hai browser đăng nhập.
- [ ] 4.2 Hook gửi heartbeat/input/vote và nhận snapshot/kick/replaced/timeout; gateway đóng socket quá heartbeat timeout. Online adapter khóa mutation khi disconnect, không ghi/reset save online vào Dexie, rollback về snapshot gần nhất nếu HTTP commit lỗi/từ chối; các thay đổi cửa hàng, stow và planogram gửi snapshot qua commit HTTP. Chưa browser-test mất mạng/reconnect và resync revision thực tế.
- [ ] 4.3 Client gửi input 10Hz, server sửa avatar authoritative và snapshot cập nhật partner renderer; gateway integration hai socket PASS. Chưa có screenshot/video hoặc browser đôi viewport chứng minh interpolation/camera/occlusion.
- [ ] 4.4 UI time vote, session end toast và absence summary code có; gateway vote/session event test PASS. Chưa browser-test reconnect, kick, UI phiếu, activity history và lỗi lưu.
- [ ] 4.5 Kiến trúc giữ Dexie local riêng với online world; browser smoke chỉ xác nhận local game chạy, chưa regression create/join/reload và world A/B; chưa import/chuyển tiệm.

## 5. Nghiệm thu tích hợp bản hai người

- [ ] 5.1 Gateway two-session integration chứng minh movement, time vote, session replacement; repository integration chứng minh invite/ACL/order-command idempotency/race/checkpoint. Chưa có full browser flow create→invite→order→delivery→restock→checkout→leave/rejoin→server restart với hai tài khoản.
- [ ] 5.2 Chưa chạy RTT 150ms, drop ACK, heartbeat timeout scenario, DB outage khi command đang commit hoặc stale browser client; cần test harness/failure injection.
- [ ] 5.3 `yarn test` và gateway integration PASS; `yarn typecheck` PASS ở lượt thay đổi multiplayer trước. Lần typecheck mới nhất hiện fail vì `GameSimulation.updateStaffWorkers` chưa tồn tại (task nhân viên 9.2 đang triển khai), trước đó còn lỗi JSX được sửa. Build browser regression desktop/mobile viewport và thiết bị thật chưa chạy trong lượt này; bằng chứng build 736.6 kB là lịch sử.
- [x] 5.4 Đồng bộ TASKS/ROADMAP/tổng hợp/ADR/tasks theo bằng chứng; production chưa deploy, nhiều cơ sở/chuyển tiệm chưa có. 5.1–5.3 vẫn mở.
