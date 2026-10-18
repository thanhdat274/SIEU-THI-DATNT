# Proposal

## Why

Hệ nhân viên hiện chỉ có ba ca gắn cứng trong khung bán 06:00–22:00 (`STAFF_SHIFTS`, `staff-manager.normalizeStaffSchedule`, `isShiftWithinStoreHours`), còn trường `StaffMember.assignedBuilding` chỉ được gán lúc tuyển, không có lệnh hay giao diện đổi, và không được dùng để lọc công việc. Hệ quả quan sát được trong code:

- `GameSimulation.isStaffOnShift` chỉ được mô phỏng dùng nội bộ, còn renderer vẽ mọi nhân viên (`peekStaff` trong `viewport.ts`): nhân viên ca sáng vẫn đứng trong tiệm lúc 21:00.
- Hai nơi tự tính ca (`isStaffOnShift`, `isActorAvailableForRestock`) không hiểu ca vắt qua nửa đêm; `normalizeStaffSchedule` lọc bằng `isShiftWithinStoreHours` nên sẽ xoá ca đêm ngay khi tải save.
- Đồng hồ hiện nhảy ngày ngay 22:00 (`GameClock.advanceMinute`) nên không tồn tại "ban đêm" để một bảo vệ đêm đứng trong tiệm.

Hai hạng mục đã chốt ngày 17/10/2026 đang chờ hệ này làm nền: bảo vệ đêm (`openspec/changes/theft-and-security/tasks.md` 4.4 — "có bảo vệ đêm là nhân vật đứng trong tiệm (cần hệ nhân viên theo ca + sprite trước)") và nhân viên riêng quán ăn vặt (`openspec/changes/snack-shop-building/tasks.md` 3.5 — "nhân viên riêng phụ thuộc hệ nhân viên theo ca"). Change này làm phần nền đó, không làm hai tính năng đích.

## What Changes

- **Bốn ca làm**: thêm ca đêm 22:00–06:00 vào bảng ca (sáng **07:00–14:00**, chiều 14:00–22:00, đêm 22–06, cả ngày **07:00–22:00** — khớp ngày bán bắt đầu 07:00); ca đêm vắt qua nửa đêm; mọi nơi (mô phỏng, lưu/tải, renderer, server replay) dùng chung một hàm thuần "đang trong ca".
- **Lương theo ca**: lương ngày = `dailyWage × hệ số ca` (ca đêm có phụ cấp); bảng lương dùng đúng bảng ca; giao diện hiện lương theo ca đã chọn.
- **Hiện diện và làm việc theo ca**: nhân viên ngoài ca không được vẽ trên bản đồ, không nhận/chạy việc, không di chuyển làm việc; đang làm dở khi hết ca thì dừng và hoàn hàng như hiện tại (giữ `updateStaffWorkers` + hành vi `workers.test.ts`). Giao diện ghi rõ ca đêm **chưa giảm trộm** (chờ `theft-and-security` 4.4) để không gây hiểu lầm khi trả phụ cấp đêm.
- **Gán nhân viên vào tòa**: `assignedBuilding` trở thành id instance tòa thật (`BuildingPlacement.buildingId`, ví dụ `main`, `xoi`, `drink`, `snack` hoặc tòa mở thêm); không gán = toàn tiệm; đổi tòa bằng lệnh mới `assign_staff_building` (server replay cho co-op).
- **Lọc việc theo tòa**: châm hàng chỉ nhận kệ trong tòa được gán; thu ngân chỉ đứng quầy và nhận khách của tòa đó; bảo vệ tuần tra trong tòa đó; dọn bàn chỉ bàn của tòa đó. Không gán thì giữ hành vi cũ (toàn tiệm) để save cũ và test hiện có không đổi.
- **Pha đêm chơi được**: 22:00 cửa hàng đóng, đồng hồ vẫn chạy tới 06:00 (không sinh khách, không bán), thời gian ban đêm chạy nhanh hơn (×3, áp một nguồn trong `GameClock` nên client và `WorldRuntime` cho cùng kết quả kể cả khi vắt qua 22:00/06:00) và người chơi có thể "Ngủ/Qua đêm" để chốt ngày sớm; 06:00 chốt ngày và mở cửa lại ở chế độ thường. Quy ước: **00:00–06:00 vẫn thuộc ngày N**, ngày N chỉ chốt tại 06:00 (hoặc khi ngủ) — dùng cho `hiredOnDay`, lương và trộm đêm. Chế độ sinh hoạt ngày giữ mốc 22:00 kiểm kê / 23:30 về nhà.
- **Migration save 12→13**: chuẩn hoá ca (ca lạ → cả ngày; `night` hợp lệ), bỏ lịch ca mồ côi/không hợp lệ; gán tòa mồ côi bị xoá khi nạp sim (game-core dùng `resolvePlacements`); không đổi tiền/lương đã lưu.
- **Giao diện**: `StaffModal` chọn ca + chọn tòa + hiện trạng thái đang trực/ngoài ca và lương theo ca; HUD báo pha đêm, khoá nút mở cửa ban đêm, nút "Ngủ/Qua đêm".
- **Chia 2 phase khi làm**: Phase A (ca + gán tòa, không đụng clock) phải xanh test rồi mới sang Phase B (pha đêm); dừng báo cáo giữa hai phase.

## Capabilities

### New Capabilities

- `staff-shifts`: bảng bốn ca (gồm ca đêm), lương theo ca, hiện diện/làm việc theo ca, tương thích save cũ và migration schema 13.
- `staff-building-assignment`: gán nhân viên vào tòa instance (BuildingPlacement), lọc công việc theo tòa, lệnh co-op.
- `night-cycle`: pha đêm 22:00–06:00 chơi được, luật mở/đóng cửa, nhịp thời gian ban đêm, đồng bộ co-op, tương tác với chế độ sinh hoạt ngày.

### Modified Capabilities

- Không có spec chính sửa (main `openspec/specs` còn trống; các capability trên là mới).

## Non-goals

- Luật bảo vệ đêm chặn trộm đột nhập: thuộc `theft-and-security` 4.4. Change này chỉ bảo đảm bảo vệ ca đêm được xếp ca, hiện và tuần tra trong tòa; KHÔNG đổi `planBurglary`/`runNightBurglary` (giữ hành vi "mọi bảo vệ trong biên chế đuổi trộm").
- Nhân viên riêng quán ăn vặt (role mới, sprite, tuyển riêng, khung giờ bổ trợ): thuộc `snack-shop-building` 3.5. Change này là nền (ca + gán tòa) để 3.5 dùng.
- Nhiều ca cho cùng một nhân viên trong ngày, xếp ca theo tuần, chấm công/tăng ca, nhân viên ca đêm ngủ ban ngày.
- Khách/trộm/NPC mới ban đêm; mở cửa bán hàng ban đêm.
- Cân bằng lương và nhịp đêm bằng playtest; mọi con số là đề xuất.
- Không sửa `openspec/changes/open-world-districts-city-goals`.

## Impact

- `packages/shared/src/index.ts`: `StaffShift`/`STAFF_SHIFTS`, `StaffBuilding` (alias chuỗi), `StaffMember.assignedBuilding`, `CURRENT_SAVE_SCHEMA_VERSION` 13 + validator/migration, `GameCommandPayload.assign_staff_building`, `SERVER_REPLAYED_COMMAND_TYPES`.
- `packages/game-data/src/staff.ts`: `isKnownShift` (thay `isShiftWithinStoreHours` ở chỗ lưu/tải/đặt ca); hằng giờ bán hàng/pha đêm.
- `packages/game-core`: `staff.ts`/`staff-manager.ts`/`staff-shifts.ts` (mới), `clock.ts`, `simulation.ts` (ca, gán tòa, lọc việc, lương), `world-runtime.ts` (replay lệnh mới).
- `apps/server/src/bootstrap.ts` (+ `save-invariants.ts`), `apps/web/src/components/StaffModal.tsx`, `HUD.tsx`, `App.tsx`, `packages/game-renderer/src/viewport.ts`.
- Test: `staff-shifts.test.ts` (mới), `staff.test.ts`, `workers.test.ts`, `maintenance.test.ts`, `security.test.ts`, `world-runtime.test.ts`, `apps/server/src/coop-commands.test.ts`.
- Tài liệu: `tổng hợp.md`, `TASKS.md`, `ROADMAP.md`.
