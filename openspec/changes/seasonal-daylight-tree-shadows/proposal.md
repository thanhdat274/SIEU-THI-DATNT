# Proposal

## Why

Ánh sáng ngoài trời hiện chỉ có một đường sin cho giờ mọc/lặn (`getSeasonalSunTimes`, `packages/game-core/src/lighting-phase.ts`: mọc 5,88 ± 0,22 h, lặn 17,91 ± 0,16 h), không bám khí hậu TP.HCM và không liên hệ với `CLIMATE_SEASONS`. Bóng cây là một hình elip cố định tại ô (2, 9) trong `viewport.ts` (~dòng 1054), chỉ dùng `shadowLean`/`shadowLength` chung của ánh sáng; cây không phải dữ liệu bản đồ nên không thêm/bớt được và bóng không đổi theo mùa. Nghiên cứu đối chiếu (xem `tổng hợp.md`) xếp việc này đầu tiên vì là logic thuần ở core + renderer, deterministic và dễ kiểm thử.

## What Changes

- Thay đường sin bằng bảng mốc mặt trời mọc/lặn theo ngày trong năm 120 ngày của game (ánh xạ sang năm 365 ngày), nội suy tuần hoàn, mượt. Mốc là xấp xỉ thiết kế cho TP.HCM, không phải dữ liệu thiên văn.
- Thêm hàm thuần `getSolarPosition(hour, minute, day)` trả phương vị và độ cao mặt trời, nhất quán với mốc mọc/lặn; `getLightingState` giữ nguyên hợp đồng hiện có (12:00 vẫn là đỉnh nắng) và thêm vector bóng.
- Cây trở thành dữ liệu bản đồ (`TREE_PROPS`: vị trí ô, chiều cao, bán kính tán); renderer vẽ bóng mỗi cây theo vector mặt trời, mờ dần theo mưa/mây, chỉ vẽ lại khi góc mặt trời đổi đáng kể.
- Không thêm cơ chế gameplay, không đổi save/schema, không đổi giờ chạy ngày game.

## Capabilities

### New Capabilities

- `daylight-cycle`: mốc mọc/lặn theo mùa và vị trí mặt trời.
- `tree-shadows`: cây là dữ liệu bản đồ và bóng đổ theo hướng nắng.

### Modified Capabilities

- Không (các spec mùa/thời tiết hiện có giữ nguyên; mưa có cường độ thuộc change riêng sau).

## Non-goals

- Mưa/dự báo cường độ, đường/cống/đèn giao thông, chế độ đến tiệm: các change sau theo thứ tự trong `tổng hợp.md`.
- Bóng cột đèn đêm, bóng động theo mây, bóng nhà đối diện.
- Độ chính xác thiên văn.

## Impact

`packages/game-core/src/lighting-phase.ts` (+ test), `packages/game-data/src/map.ts` (TREE_PROPS), `packages/game-renderer/src/viewport.ts` và `shop-lighting.ts`, `tổng hợp.md`/TASKS/ROADMAP.
