# Design

## Context

Đối chiếu source ngày 30/09/2026: `GameSimulation` giữ một `PlayerData` gồm tiền/XP và nhận `InputManager`; `viewport.ts` gọi update trong Pixi ticker. `App.tsx` gọi thẳng nghiệp vụ và export vào một slot Dexie. `apps/server/src/main.ts` chỉ có class catalog/validateSave, chưa bootstrap hoặc persistence. Không có main specs. Xem proposal.md về mục đích.

## Goals / Non-Goals

**Goals:** core chạy headless và local qua adapter; một server chịu trách nhiệm world; trạng thái riêng biệt theo tài khoản/world/cơ sở; có bằng chứng chạy hai client và khôi phục sau restart.

**Non-Goals:** MMO, simulation chạy khi tất cả offline, nhân viên, nhiều ngành hàng, gộp/chuyển tài sản giữa world, thương mại giữa người chơi, chat, visitor/helper và nội dung quan hệ NPC. Không ép người chơi chuyển save local để tiếp tục chơi.

## Decisions

Chỉ đạo bổ sung 30/09/2026: chưa dùng Docker; tham khảo QUANLYCHITIEU cho kết nối MongoDB và GAME/tap-hoa-dau-hem cho Firebase Google login. Dùng cluster chung nhưng database riêng `sieu_thi_datnt_dev`, chờ chủ dự án chỉ file cấu hình trước khi dùng credentials. Emulator là tùy chọn khi chuẩn bị integration auth, không là yêu cầu khởi động bước runtime. Không sao chép Firestore hoặc JWT session của reference thay cho thiết kế Firebase Auth.

### 1. Mô hình sở hữu

Account chứa ID, tên, ngoại hình; World chứa ID, schemaVersion, revision, clock, map, memberships và businesses; Business chứa ID, owner IDs, quỹ, kho, fixture, đơn, khách, XP/cấp/uy tín/thống kê; Avatar chứa accountId/worldId, vị trí/hướng. Không tạo số dư tài khoản toàn cục. Solo online dùng cùng model nhưng một thành viên. Bản đầu có một business, owner và tối đa một member (hai thành viên tổng); chưa có UI thêm cơ sở.

Giữ tiền trong PlayerData sẽ khó phân biệt tiền tiệm với tiền cá nhân. Hai save độc lập được chép vào phòng cũng dễ nhân tài sản, nên world B không gửi save sang A khi join. Avatar dùng điểm vào hợp lệ của world đích, không copy tọa độ từ world khác.

### 2. Headless authority và adapter

Tách browser input/callback mở modal khỏi state nghiệp vụ; input online là intent theo account/session, core kiểm tra movement/collision và khoảng cách tương tác. Server tick cố định, renderer chỉ đọc snapshot ở online; local adapter giữ đường chơi cũ. Tick 30Hz, broadcast 10Hz là thông số khởi đầu cần đo; renderer nội suy nhân vật từ snapshot, chưa yêu cầu prediction trong bản đầu. Không spawn một simulation toàn tiệm cho mỗi người vì sẽ nhân clock/NPC/giao dịch.

Giao dịch mua, châm, cất và checkout đi qua một command handler. Checkout phải có khách đang chờ và món đã giữ; nút bán vô điều kiện hiện tại không dùng trong online. Chưa cần queue nhiều NPC: giữ một NPC để giới hạn phạm vi nhưng cùng một checkoutId không được bán hai lần.

### 3. HTTP + WebSocket và nhận dạng

HTTP cho login/world list/create/invite/join; WebSocket cho session/input/commands/snapshots. Firebase Auth theo định hướng Phase 7, server xác minh token và membership trước khi đọc world hoặc mở socket; emulator cho integration, không hardcode tài khoản production. NestJS + MongoDB theo roadmap được dùng cho bootstrap và repository; ghi ADR và kiểm tra khả năng runtime/transaction trong bước đầu apply trước khi cài. Không thay đổi provider ngoài phạm vi nếu chưa có lý do cụ thể. HTTPS/WSS ở production; token không nằm trong URL/log.

Owner tạo mã mời ngẫu nhiên một lần, hết hạn sau 24 giờ, revoke được; server kiểm tra hạn/capacity trong giao dịch join. Member được nhập hàng, bày/cất và checkout; không quản lý invite/member/reset. Owner kick làm session mất quyền ngay. Mã mời không thay thế login. Một account chỉ có một session đang hoạt động trên toàn hệ thống; kết nối mới thay kết nối cũ để tránh nhân đôi avatar/cày nhiều world đồng thời.

### 4. Thứ tự và lưu giao dịch

Command envelope gồm protocolVersion/worldId/businessId/commandId/expectedRevision/payload; actor lấy từ session, không tin actor hoặc số dư client. Server validate runtime, quyền, khoảng cách và revision, serialize theo world. Commit business state + revision + receipt(commandId, actor, result) + activity event nguyên tử trong DB trước ACK thành công. Retry commandId cùng actor trả receipt cũ; payload khác bị từ chối. Stale revision trả lỗi và snapshot để người chơi thử lại, không tự chạy lại thao tác với ID mới.

Một runtime active cho mỗi world trên một server process là giới hạn bản đầu; chưa scale nhiều worker. DB transaction cần MongoDB replica set kể cả local. Movement lưu định kỳ tối đa 5 giây, kinh tế lưu mỗi command; clock/NPC lưu định kỳ và khi last disconnect. Checkpoint phải đi cùng hàng đợi mutation để không đè commit mới bằng snapshot cũ. Crash có thể mất tối đa 5 giây vị trí/clock, không mất giao dịch đã ACK. DB lỗi thì ngừng nhận mutation, hiển thị lỗi, không ACK thành công hoặc tạo world trắng.

### 5. Presence và điều khiển thời gian

Heartbeat xác định ngắt kết nối trong tối đa 15 giây; xóa avatar và input held. Không còn session thì checkpoint/pause, không catch-up thời gian thực lúc resume. Một người online vẫn tiếp tục simulation dù owner vắng. Giữ cơ chế clock khi đóng cửa hiện tại; mở modal online chỉ khóa input của người mở.

Một người online có thể đổi tốc độ/qua ngày. Hai người cần cả hai xác nhận trong 30 giây; thiếu phiếu hoặc đổi thành phần session thì hủy yêu cầu. Chuyển ngày tự động khi tới 22:00 vẫn chạy theo clock như hiện tại, UI cảnh báo trước; phiếu áp dụng cho nút qua ngày và đổi tốc độ. Không có nhiệm vụ/cutscene mới trong đợt này.

### 6. Reconnect và nhật ký

Socket ngắt: hiển thị mất kết nối, khóa mutation, không mô phỏng kinh tế local. Reconnect xác thực lại, nhận snapshot đầy đủ theo revision/protocol và receipts cho command chưa ACK; không replay mù. Membership bị revoke thì quay về world list. lastSeenRevision của mỗi thành viên làm mốc bảng 'Trong lúc bạn vắng'; event gồm actor, khoản thu/chi, ngày, transactionId; không ghi nội dung nhạy cảm. Tóm tắt 100 event gần nhất và báo rõ nếu còn lịch sử cũ.

## Risks / Trade-offs

- [Refactor ảnh hưởng local] → adapter và regression nhập/giao/bày/cất/bán/save trước khi nối network; bản local giữ schema 2 trong đợt này.
- [Mạng chậm và tranh món cuối] → interpolation và receipt nguyên tử; thử RTT 150ms, mất mạng giữa commit/ACK và hai command đồng thời.
- [Member dùng hết quỹ khi owner vắng] → bản đầu ghi rõ quyền vận hành/quỹ chung khi nhận mời, activity log và revoke; hạn mức chi là mở rộng sau.
- [Một người tiến xa khi người kia vắng] → báo cáo vắng; không hứa progression cá nhân hoặc nhiệm vụ chung chưa triển khai.
- [Hosting realtime có chi phí và cần process chạy lâu] → nghiệm thu local/staging trước, không deploy production hoặc tạo dịch vụ trả phí trong đợt planning.
- [Nhiều cơ sở sau này cần scope quỹ/permission] → mọi command mang businessId nhưng server kiểm tra business thuộc world; chưa nghiệm thu nhiều cơ sở bằng model đơn thuần.

## Migration Plan

1. Thêm schema online và feature flag; giữ local save nguyên bản. Login lỗi không chặn local.
2. Tạo world online mới với seed độc lập. Không tự import/copy save local; import và chuyển tiệm không thuộc bản đầu.
3. Chạy emulator/server/database local với hai browser context, thử restart, permission và network loss.
4. Chỉ bật staging sau kiểm thử; production cần cấu hình auth/DB/hosting thực. Rollback tắt online flag, giữ dữ liệu online và local, không downgrade schema hoặc ghi save mặc định khi load lỗi.

## Open Questions

- Tên miền và nhà cung cấp hosting production quyết định sau nghiệm thu local; không ảnh hưởng hợp đồng dữ liệu hoặc tiêu chí bản đầu.
