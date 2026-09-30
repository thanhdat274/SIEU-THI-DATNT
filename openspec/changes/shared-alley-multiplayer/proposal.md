# Proposal

## Why

Người chơi muốn cùng người yêu hoặc bạn bè xây dựng sự nghiệp trong một con hẻm, kể cả chơi lệch giờ. Hiện game chỉ có một nhân vật và save local; cần chốt quyền sở hữu, giao dịch và persistence trước khi thêm nhiều cơ sở hoặc nhân viên.

## What Changes

- Bản đầu: world riêng có tối đa hai người online, một tiệm chung, quỹ/kho/XP kinh doanh chung; chủ world offline không ngăn thành viên chơi tiếp.
- Tài khoản, nhân vật, world và cơ sở có ID độc lập. Solo online là world một thành viên; save solo local hiện tại vẫn được giữ.
- Đăng nhập, danh sách world, mã mời có thời hạn và quyền owner/member. Chỉ owner quản lý thành viên; member được vận hành tiệm.
- Server mô phỏng và quyết định giao dịch, đồng bộ nhân vật, tồn kho, khách, giờ và tiền qua kết nối realtime.
- Lưu bền, reconnect, chống xử lý trùng; world tạm dừng khi không còn người kết nối, không tính thu nhập/chi phí khi tất cả offline.
- Đồng thuận qua ngày/tốc độ khi hai người online; nhật ký thay đổi trong lúc vắng.
- Dữ liệu chuẩn bị nhiều cơ sở độc lập trong cùng hẻm, nhưng chưa triển khai quán mới, khách ghé thăm hay chuyển/gộp tiệm.

## Capabilities

### New Capabilities

- `world-membership`: danh tính, world riêng, lời mời, quyền và tách tài sản giữa world.
- `authoritative-coop`: mô phỏng hai người, giao dịch nguyên tử, đồng thuận thời gian và đồng bộ realtime.
- `world-persistence`: save bền, chơi lệch giờ, pause/resume, reconnect và bảo toàn save local.

### Modified Capabilities

Không có main spec hiện hành (`openspec list --specs` trả No specs found).

## Impact

- `packages/shared/src/index.ts`: tách tiền/XP kinh doanh khỏi nhân vật; thêm world/business/session/command/snapshot và schema online riêng.
- `packages/game-core/src/simulation.ts`, `input.ts`, `clock.ts`: tách input và tick khỏi browser; giao dịch có ID và trạng thái khách hợp lệ.
- `packages/game-renderer/src/viewport.ts`: bỏ quyền tick nghiệp vụ ở chế độ online, vẽ nhiều nhân vật.
- `apps/web/src/App.tsx`, store/components/db: luồng chọn world, realtime, reconnect; local save không bị online ghi đè.
- `apps/server`: bootstrap HTTP/realtime, xác thực, runtime world, repository bền và kiểm thử tích hợp. Framework/auth/database là dependency cần quyết định và ghi ADR trước khi cài, không coi khung class hiện tại là server chạy thật.
- TASKS/ROADMAP/tổng hợp cập nhật thứ tự ưu tiên; không triển khai gameplay hoặc dependency trong đợt proposal.
