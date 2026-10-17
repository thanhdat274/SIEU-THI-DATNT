# Proposal

## Why

"Xóm phố có sự kiện" hiện nằm rải rác và không được nối liền: `game-data/seasons.ts` khai báo 9 lễ hội (Tết, Trung thu…) với nhân tố cầu, nhóm hàng ưu tiên và mục tiêu ngày hội; `game-core/party-orders.ts` + `game-data/partyOrders.ts` có đơn tiệc xóm (đám giỗ, sinh nhật, tất niên…) nhưng chỉ hiện trong `QuestModal`, không ăn theo mùa; `game-core/holiday-balance-sim.ts` là công cụ đo cân bằng 5 lễ hội headless nhưng chưa đưa kết quả vào gameplay hay cân bằng thật. Người chơi không biết hôm nay xóm có gì, đơn nào đúng mùa, và thưởng có tương xứng hay không. Mục này nối các module có sẵn thành một loạt "sự kiện xóm phố" hiển thị và có thông báo.

## What Changes

- **Đơn hàng theo mùa:** thêm `seasonId` / nhãn mùa vào định nghĩa `PartyOrderDef` trong `game-data/partyOrders.ts`; đơn tiệc được chọn ra theo mùa đang diễn ra của ngày chơi (Tết đẩy đơn tất niên, Trung thu đẩy đơn bánh, đám giỗ/đám cưới luôn có), hết mùa đơn cũ hết hạn bình thường; vẫn giữ hồ bơi mùa chung cho ngày không lễ. Không đổi `schemaVersion` (thêm trường tùy chọn, save cũ tải được).
- **Thông báo sự kiện:** khi vào một ngày lễ mới (hoặc 2 ngày trước), khi đơn tiệc mùa xuất hiện, khi có mục tiêu ngày hội nhận được thưởng — hiện toast và/hoặc dòng trong bản tin sáng qua vòng `onToast` có sẵn; tránh trùng lặp nhắc lại cùng một sự kiện.
- **Màn "Sự kiện xóm phố":** mở từ nút trên HUD/map: liệt kê sự kiện đang diễn ra và sắp tới (mượn `SEASON_EVENTS` + `getSeasonWindow`), đơn tiệc đúng mùa đang mở, mục tiêu ngày hội và thưởng, và trạng thái hoàn thành; cảnh báo khi sắp hết hạn.
- **Phần thưởng và cân bằng:** rà phần thưởng đơn tiệc và mục tiêu ngày hội so với doanh thu kỳ vọng (dùng số liệu của `holiday-balance-sim`); điều chỉnh hằng số PROVISIONAL; thêm thưởng thành tích khi hoàn tất toàn bộ mục tiêu của một lễ hội.
- **Gắn cân bằng:** chạy/áp `holiday-balance-sim` làm nguồn bằng chứng cho việc chỉnh hằng số nhân tố cầu và thưởng; ghi kết quả vào `tổng hợp.md`/change tasks.

## Capabilities

### New Capabilities

- `neighborhood-events`: hiển thị, sinh và thông báo đơn tiệc theo mùa cùng mục tiêu lễ hội; cân bằng thưởng.

### Modified Capabilities

- Không có spec chính sửa (các capability hiện tại `party-orders`, `seasons`/`holiday` vẫn là delta trong change này).

## Non-goals

- Không tạo sự kiện thành phố mới kiểu `world-events` (hội chợ/mất điện) — chỉ nối lễ hội theo mùa + đơn tiệc có sẵn.
- Không đổi cách tính cầu, lượng khách, sao hay danh tiếng.
- Không thêm hạ tầng server/co-op cho đơn tiệc mùa (đơn tiệc vẫn là lệnh local dùng chung seed như hiện tại).
- Không mở rộng sổ đơn vượt quá danh sách đơn tiệc/ngày hội hiện có.

## Impact

`packages/shared` (`PartyOrderDef`, `SaveGameData` tùy chọn), `packages/game-data/src/partyOrders.ts` (+ `validatePartyOrders`), `packages/game-core/src/party-orders.ts` (lọc theo mùa, `partyOrdersForSeason`), `simulation.ts` (sinh đơn mùa + thông báo), `holiday-balance-sim.ts` (đo lường làm bằng chứng cân bằng), `apps/web` (`NeighborhoodEventsModal`, HUD/map + nút, `App.tsx`, toast), test (`party-orders-seasonal.test.ts`, `holiday-balance`), `tổng hợp.md`, `TASKS.md`, `ROADMAP.md`.
