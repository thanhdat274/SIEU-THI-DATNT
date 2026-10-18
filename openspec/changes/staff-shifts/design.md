# Design

## 0. Chia hai phase (duyệt 17/10/2026)

- **Phase A — Ca + gán tòa (KHÔNG đụng clock)**: task nhóm 1, 2, 3, 5, 6 và phần kiểm chứng tương ứng. Không sửa `clock.ts`, không đổi hành vi "22:00 sang ngày" hiện có. Cổng: `yarn typecheck` EXIT 0 + `game-core test` xanh + `apps/web test`/`renderer test` (nếu chạy được) xanh → **dừng báo cáo**.
- **Phase B — Pha đêm**: chỉ bắt đầu sau khi Phase A xanh: task nhóm 4 (clock, luật mở cửa, tốc độ đêm, quy ước ngày, kiểm kê test phụ thuộc 22:00, HUD đêm) rồi nhóm 7 kiểm chứng cuối.
- Lý do tách: phần ca/gán tòa không phụ thuộc pha đêm và có thể kiểm chứng độc lập; phần clock/đêm đụng nhiều test/sim cũ (mục 9) nên phải làm sau khi nền xanh để dễ khoanh vùng hồi quy.
- Task 7 (kiểm chứng + tài liệu) chạy một phần ở cuối Phase A (typecheck + test nhóm A) và đầy đủ ở cuối Phase B.

## 1. Bốn ca và lương theo ca

Bảng ca (`packages/shared/src/index.ts`, giữ kiểu dữ liệu như `STAFF_SHIFTS` hiện có):

| Ca | Khung giờ | Hệ số lương |
|---|---|---|
| `morning` | **07:00–14:00** (đổi từ 06:00) | 0,5 |
| `afternoon` | 14:00–22:00 | 0,5 |
| `night` (mới) | 22:00–06:00 | 0,6 (0,5 nền + 20% phụ cấp đêm) |
| `full_day` | **07:00–22:00** (đổi từ 06:00) | 1,0 |

- **Vì sao ca sáng 07:00 thay vì 06:00**: ngày game bắt đầu 07:00 (`GameClock.advanceToNextDay` đặt `hour = 7`) và cửa hàng mở 07:00 (chế độ sinh hoạt: 08:00). Ca sáng 06:00 sẽ có 1 giờ nhân viên "trực" khi ngày chưa bắt đầu/tiệm chưa mở — không làm được gì, chỉ tăng lương vô ích và làm trạng thái "đang trực" khó hiểu. Ca sáng 07:00–14:00 khớp đúng nửa đầu ngày bán. Ca cả ngày theo cùng lý do đổi 06:00 → 07:00 (07:00–22:00).
- Hệ số lương giữ nguyên cho ba ca cũ (0,5/0,5/1,0); ca đêm 0,6 là đề xuất, chưa cân bằng.
- `isShiftWithinStoreHours` **giữ nghĩa cũ** "nằm trong giờ bán" cho nơi cần luật cửa hàng; thêm `isKnownShift` cho mọi chỗ **lưu/tải/đặt ca**. `staff-manager.load`, `normalizeStaffSchedule`, `simulation.setStaffShift` chuyển sang `isKnownShift` để ca đêm không bị xoá.
- Hàm thuần mới (`packages/game-core/src/staff-shifts.ts`): `isShiftActiveAt(shift, minuteOfDay)` (ca đêm = `minute ≥ 22*60 || minute < 6*60`), `isStaffActiveAt({ hiredOnDay, shift }, day, minute)`, `shiftWage(dailyWage, shift)`, `shiftLabel`, `activeShiftOf(member, schedule)`.
- Hai bản logic ca đang trùng (`GameSimulation.isStaffOnShift`, `isActorAvailableForRestock`) gọi chung helper này; bảng lương `calculatePayroll`/`processPayroll` đã đọc `STAFF_SHIFTS[shift].wageMultiplier` nên chỉ cần thêm ca mới.

## 2. Hiện diện: chỉ vẽ trong ca

- Thêm `GameSimulation.peekVisibleStaff()` (read-only) lọc `isStaffActiveAt` theo giờ hiện tại; `packages/game-renderer/src/viewport.ts` đổi `peekStaff()` → `peekVisibleStaff()`. Không đổi sprite/atlas/vị trí.
- Vị trí nhân viên ngoài ca vẫn giữ trong save/sim (không dọn) để vào ca lại không teleport; chỉ ẩn khi vẽ.
- Hết ca giữa việc: giữ nguyên nhánh hiện có trong `updateStaffWorkers` (dừng việc, `finishStaffJob(member, true)` trả hàng, nhả claim); chỉ thay hàm xét ca. Đây là lý do `workers.test.ts` phải tiếp tục xanh.

## 3. Gán nhân viên vào tòa (BuildingPlacement)

- `StaffMember.assignedBuilding?: string` = id instance tòa (`BuildingPlacement.buildingId`), có thể là `main`/`xoi`/`drink`/`snack` hoặc tòa mở thêm (`park-1`, …). Không gán = toàn tiệm. `StaffBuilding` đổi thành alias chuỗi (khớp `BuildingId = string` của `open-world-building-types`), bỏ union cứng; **giữ tên trường** để migration/tương thích.
- Nguồn tòa hợp lệ: `resolvePlacements(storeLayout.buildingPlacements, unlockedPlotIds)` (game-data) — tòa đã mua/đang có, kể cả đang thi công (`main` luôn có). Hàm thuần `staffBuildingOptions(placements)` cho UI và `validateStaffBuilding(id, validIds)` cho sim/server.
- API mới `GameSimulation.setStaffBuilding(staffId, buildingId: string | null)`: kiểm tra nhân viên + tòa; nếu đổi tòa khi đang có việc thì `finishStaffJob(member, true)` + huỷ `diningTask` + nhả claim; ghi `assignedBuilding`; `notifyStateChanged`.
- Tuyển: `hireStaff` chỉ áp `candidate.assignedBuilding` khi id nằm trong danh sách tòa hợp lệ, ngược lại "toàn tiệm".
- Lọc việc theo tòa (nhân viên không gán = như cũ):
  - **Châm hàng**: `getRestockJobTargets()` giữ nguyên chữ ký công khai (UI người chơi dùng); thêm hàm private lọc theo nhân viên dùng ở `getNextAutoRestockTarget`, `claimRestockJob`, `assignRefillJob` — chỉ kệ có `buildingOfFixture(fix) === member.assignedBuilding`.
  - **Thu ngân**: `getCashierPost(member)` chỉ chọn quầy thuộc tòa gán; `assignNextCashierCustomer(member)` chỉ lấy khách có `cashierFixtureId` thuộc tòa gán (khách cũ thiếu `cashierFixtureId` coi như tiệm chính).
  - **Bảo vệ**: `updateSecurityPatrol` dựng điểm dừng theo tòa gán từ `entranceOf(buildingId, tileMap.buildings)` + geometry (`placementGeometry`/`DEFAULT_GEOMETRY`): điểm trước cửa → cửa → trong nhà → cửa. Tiệm chính giữ đúng mảng `stops` cũ (hành vi hiện tại). Ca đêm dùng chung lộ trình này.
  - **Dọn bàn**: `assignDiningCleanup` + nhánh chọn bàn tự động chỉ lấy bàn có `fixtureBuilding(table)` thuộc tòa gán.
- Co-op: lệnh mới `assign_staff_building { staffId, buildingId: string | null }`.

## 4. Pha đêm chơi được (Phase B)

### 4.1 Quy ước ngày cho 00:00–06:00 (chốt 17/10/2026)

- Đêm của **ngày N** = 22:00 N → 06:00 N+1. `worldTime.day` **giữ nguyên = N** suốt 00:00–06:00; ngày chỉ chốt tại 06:00 (hoặc khi người chơi ngủ/qua đêm sớm).
- Hệ quả bắt buộc:
  - `hiredOnDay`: nhân viên tuyển ngày N làm được ca đêm của ngày N (22:00 N → 06:00 N+1) vì `day` vẫn là N trong suốt ca.
  - Lương: payroll của ngày N chạy khi chốt ngày N (06:00 sang N+1, hoặc ngủ sớm); ca đêm 22:00–06:00 của ngày N trả trong bản lương ngày N, đúng một lần.
  - Trộm đêm: `runNightBurglary` chạy lúc chốt ngày (đúng một lần); như hiện tại, sự kiện/ledger của vụ đêm ghi vào ngày mới N+1 (hành vi đang có, giữ nguyên) — không ghi ngược vào ngày N.
  - Bản ghi ngày N (`DailyRecord`) bao trọn 07:00 N → 06:00 N+1 (đóng sổ khi chốt ngày N).
- Test bắt buộc: `hiredOnDay` ở 23:00 ngày N (được tính trong ca); lương ca đêm chốt ở ngày N; trộm đêm chạy đúng một lần cho đêm N và ghi ngày N+1.

### 4.2 Đồng hồ và luật cửa hàng

- Hằng số (`packages/game-data`): `BUSINESS_HOURS = { openHour: 7, closeHour: 22 }` (routine mở 08:00 theo `DAILY_SCHEDULE`), `NIGHT_START_HOUR = 22`, `NIGHT_END_HOUR = 6`, `NIGHT_TIME_SCALE_MULTIPLIER = 3` (đề xuất).
- `GameClock`:
  - `isNightPhase(time)` = `hour ≥ 22 || hour < 6`.
  - `update()` chạy khi `isStoreOpen || isNightPhase` (routine mode giữ nhánh `isNightHold` hiện có).
  - `advanceMinute()`: chạm 22:00 (chế độ thường) → `isStoreOpen = false` (vào đêm) thay vì `advanceToNextDay`; chạm 06:00 trong pha đêm → `advanceToNextDay()` (ngày +1, giờ 07:00) và mở cửa lại để ngày tự chạy như hành vi cũ.
  - Hệ số ×3 ban đêm áp **một nơi duy nhất** trong `GameClock` (đổi `timeScale` hiệu dụng khi tính `realSecPerGameMin`), **không** ghi vào save (`worldTime.timeScale` giữ nguyên), **không** áp riêng ở client hay `WorldRuntime` — xem 4.3.
- Simulation:
  - `setStoreOpen(true)` chỉ trong giờ bán → ngoài giờ trả `{ success: false, reason: 'outside_business_hours' }`; `world-runtime`/client hiện câu tiếng Việt.
  - Không sinh khách khi cửa đóng (luật sẵn có theo `isStoreOpen`); pha đêm không thêm đường sinh khách nào.
  - "Ngủ/Qua đêm": dùng `handleAdvanceDay` hiện có (đơn: `clock.advanceToNextDay`; co-op: bỏ phiếu thời gian). **Không thêm lệnh mới.**
  - Chốt ngày vẫn chỉ nằm trong `onDayChanged` của simulation (lương, hao mòn, trộm đêm, bản tin) nên đêm không tạo đường chốt ngày thứ hai.
- Co-op: `worldTime` nằm trong save chung, clock do runtime server tick nên pha đêm đồng bộ tự nhiên; không thêm trường save/lệnh. `advance_day` HTTP chỉ cho hẻm 1 người (giữ nguyên); co-op dùng time vote sẵn có.
- Routine mode (chốt 17/10/2026): 22:00 đóng cửa/kiểm kê, 23:30 nhân vật tự về nhà đi ngủ (khoá điều khiển) nhưng **không đen màn, không chốt ngày**; đồng hồ chạy tiếp ×3 tới 06:00, lúc đó mới mờ đen + chốt ngày, thức dậy 07:00 ở cửa nhà, cửa hàng chờ 08:00 mở. Nút "Ngủ" thủ công (`sleepNow`) ẩn khi đang ngủ tự động; bấm trước 23:30 thì bỏ qua đêm ngay (nhân vật về cửa nhà).

### 4.3 Tốc độ đêm đồng nhất client ↔ WorldRuntime (chốt 17/10/2026)

- Yêu cầu: cùng một lượng giây thực phải cho **cùng số phút game** qua ranh giới 22:00 và 06:00, dù chạy ở client (vòng requestAnimationFrame, `dt` thô) hay `WorldRuntime` (server tick 250 ms, `FixedStepSimulationRunner` bước 1/60 s, trần 15 bước/lượt = 0,25 s).
- Cách làm: hệ số ×3 nằm trong `GameClock.update` (nguồn duy nhất, phụ thuộc pha chứ không phụ thuộc `dt`), áp cho **cả chế độ thường và routine/coop** để thời gian ban đêm 22:00–23:30 của co-op cũng nhanh hơn; `FixedStepSimulationRunner` + `GameClock` là code dùng chung của cả hai phía, nên parity chỉ cần test chứng minh, không cần thêm mã riêng.
- Test parity (Phase B): nạp cùng một save/world, chạy cùng tổng `elapsedSeconds` qua hai kiểu tick — (a) client-like `update(1/60)` lặp, (b) server-like `WorldRuntime.tick(0.25)` lặp — vắt qua 21:59→22:00 và 05:59→06:00; assert cùng `day`, `hour`, `minute`, `isStoreOpen`, doanh thu và số nhân viên đang trực.
- Pause/checkpoint không đổi: `WorldRuntime` vẫn pause khi 0 session và checkpoint theo `checkpointIntervalSeconds`; ban đêm chỉ đổi tốc độ phút game, không đổi nhịp wall-clock (không thêm timer mới).

## 5. Schema 13 và migration

- `CURRENT_SAVE_SCHEMA_VERSION = 13`; danh sách `schemaVersion` viết tay trong `isSaveGameData` thêm `12` (nếu không, save 12 bị coi là hỏng).
- `migrateToW13(save)` (trong `packages/shared`, **không** import được `@game/data`):
  - `staff[*].shift` không thuộc bốn ca → `'full_day'`; giữ nguyên `dailyWage`, `hiredOnDay`, chuyên môn.
  - `staffSchedule`: chỉ giữ mục có nhân viên còn tồn tại và ca hợp lệ (ca đêm hợp lệ).
  - Giữ nguyên tiền, nợ lương, `processedPayrollDayIds`, các trường khác.
- **Lọc `assignedBuilding` mồ côi làm ở bước nạp của game-core** (shared không biết được tòa đã mua): `StaffManager.load`/`normalizeStaffAssignments(save)` gọi `resolvePlacements(storeLayout.buildingPlacements, storeLayout.unlockedPlotIds)` rồi xoá mọi `assignedBuilding` không nằm trong danh sách tòa đang có (coi như toàn tiệm). Chạy cùng đường migration nên save 12 mở lên là sạch; test kiểm ở `staff-shifts.test.ts` qua `new GameSimulation(...)`.
- Nhánh migration `schemaVersion === 12` gọi `migrateToW13`; các nhánh cũ gọi thêm; nhánh `schemaVersion < CURRENT` không map được vẫn trả `legacy_migrate` như hiện tại.
- Save 13 bị bản cũ từ chối (cơ chế hiện có) → phải deploy web+server cùng lúc.

## 6. Server replay / co-op

- `SERVER_REPLAYED_COMMAND_TYPES` + `ALLOWED_COMMAND_TYPES` (`bootstrap.ts`) thêm `assign_staff_building`; `WorldRuntime.executeCommand` xử lý → `simulation.setStaffBuilding`.
- `set_staff_shift` đã được replay; chỉ cần `setStaffShift` chấp nhận `night` (qua `isKnownShift`).
- `save-invariants.ts`: thêm kiểm tra nhẹ cho lệnh gán tòa (nhân viên phải tồn tại, `assignedBuilding` phải nằm trong danh sách tòa của save) — vẫn là ngưỡng rộng như triết lý hiện tại.
- Client `App.tsx`: `handleSetStaffBuilding` mô phỏng cục bộ → `commitBusinessChange({ type: 'assign_staff_building', ... })`; lỗi server → `resyncOnlineWorldAfterReject` như các lệnh nhân viên khác.

## 7. Giao diện

- `StaffModal`: thêm `onSetBuilding`, prop danh sách tòa + giờ hiện tại; mỗi dòng hiện ca + tòa + `money(dailyWage × hệ số ca)` + "Đang trực/Ngoài ca"; bộ chọn ca đủ bốn ca; bộ chọn tòa gồm "Toàn tiệm" + tòa đang có.
- **Cảnh báo ca đêm (chốt 17/10/2026)**: khi chọn ca đêm, `StaffModal` SHALL hiện ghi chú rõ "Ca đêm chưa giảm trộm — sẽ có ở theft-and-security 4.4" để người chơi không trả phụ cấp đêm mà không biết tác dụng. Ghi chú cố định (không phụ thuộc pha đêm), nằm ngay dòng chọn ca.
- `HUD` (Phase B): dấu hiệu ban đêm, khoá nút mở cửa ngoài giờ bán kèm lý do, nút "Ngủ/Qua đêm" chỉ trong pha đêm (ẩn khi routine đang tự ngủ); toast 22:00/06:00.
- **Màn đen chuyển ngày (chốt 17/10/2026)**: ở routine, hiệu ứng `daily-routine-fade` KHÔNG bật lúc đi ngủ 23:30 nữa; `App.onTimeChanged` bật khi `state === 'SLEEPING' && hour === 5 && minute >= 50`, giữ đen tới khi chốt ngày 06:00 (day-change reset routine → `AT_HOME`) thì tắt sau 300 ms; `App.onRoutineStateChanged` vẫn chỉ kiểm tra chờ người cùng hẻm ở co-op.
- Renderer: chỉ đổi nguồn danh sách nhân viên (`peekVisibleStaff`).

## 8. Rủi ro / giới hạn chấp nhận

- Nhịp đêm: 480 phút game; 1× ≈ 5,3 phút thực, ×3 ≈ 1,8 phút thực. Hệ số 3 là đề xuất, cần playtest; nút ngủ bù trường hợp thấy dài.
- **Game thật bật chế độ sinh hoạt ngày (routine) cho cả local lẫn co-op** (`App.tsx` gọi `setDailyRoutineEnabled(true)`/`setCoopMode(true)`): pha đêm 22:00–06:00 vẫn chạy, nhân vật về nhà ngủ lúc 23:30, màn đen + chốt ngày ở 06:00 (chốt 17/10/2026). Chế độ thường (routine tắt) cho người chơi tự do tới 06:00 hoặc bấm Ngủ.
- Ban ngày đóng cửa vẫn đóng băng đồng hồ như hiện tại; ban đêm đồng hồ chạy dù cửa đóng — khác biệt này cần ghi rõ cho người chơi.
- Gán tòa cho thu ngân đổi phân công phục vụ khi mở nhiều tòa (trước đây mọi thu ngân phục vụ mọi quầy); chỉ xảy ra khi người chơi chủ động gán, không gán thì như cũ.
- Lương ca đêm ×0,6 là số đề xuất, chưa cân bằng.
- Bảo vệ đêm **chưa** đuổi trộm đột nhập: `planBurglary`/`runNightBurglary` giữ nguyên, `theft-and-security` 4.4 nối sau; UI phải nói rõ (mục 7).
- Qua đêm vẫn đếm mọi nhân viên `refill` cho tự bảo trì (giữ `maintenance.test.ts`); nếu muốn chỉ ca đêm bảo trì thì là change khác.
- Không sửa `openspec/changes/open-world-districts-city-goals`.
- Chưa QA mắt: ẩn/hiện nhân viên theo giờ, pha đêm, HUD — thuộc bước code.
- **QA desktop 17/10/2026 (đã làm, PASS)**: thấy đúng HUD ban đêm + khoá mở cửa + nút Ngủ, `StaffModal` 4 ca/chọn tòa/lương theo ca/trạng thái trực + cảnh báo ca đêm, chỉ vẽ nhân viên trong ca (23:00 bảo vệ đêm, 07:19 thu ngân sáng), bấm Ngủ sang ngày mới. Phát hiện P2: nút Ngủ ở routine mode làm nhân vật đứng lại trong tiệm → thêm `GameSimulation.sleepNow()` (routine: về cửa nhà + reset lịch như ngủ 23:30). Mobile 375×812/667×375: chưa QA (browser tool không đổi viewport).

## 9. Kiểm chứng + kiểm kê test phụ thuộc "22:00 nhảy ngày"

### 9.1 Kiểm kê test phụ thuộc "22:00 nhảy ngày" (đã rà 17/10/2026, dùng cho Phase B)

Nguồn hành vi hiện tại: `packages/game-core/src/clock.ts:107-111` (`hour >= 22 && !routineMode → advanceToNextDay`) và `clock.ts:86` (đồng hồ **dừng** khi cửa đóng ở chế độ thường). **Điều kiện tiên quyết của Phase B**: pha đêm phải giữ `GameClock.update()` chạy khi cửa đóng; nếu không, mọi harness `while (day < N)` kẹt ở 22:00 (`performance.test.ts` treo vì không guard).

| Phân loại | File | Phụ thuộc / vì sao đổi | Kỳ vọng mới |
|---|---|---|---|
| MUST-CHANGE | `daily-routine.test.ts:34-42` | Test trực tiếp khẳng định `clock.update(15*60)` từ 07:00 làm `day === 2` ("22:00 sang ngày mới"); dòng 38 còn khẳng định đồng hồ dừng khi cửa đóng | 05:30 ngày kế: `day === 1`, `hour === 5`, `minute === 30`, `isStoreOpen === false`; muốn sang ngày 2 phải chạy qua 06:00 |
| MUST-CHANGE | `world-golden.test.ts:60` + `world-golden.ts:110-118` + `__golden__/world-golden.json` | `simulateDays()` 3 ngày; harness mở lại cửa khi `hour < 20` nên sau change sẽ bán cả đêm (00:00–06:00), đổi customers/revenue/netProfit/sales hash | Sinh lại golden bằng `world-golden-gen.ts` và commit JSON mới; KHÔNG sửa tay |
| LIKELY | `integration.test.ts:30-46`, `scenarios.test.ts:50-60`, `performance.test.ts:31-44`, `building-placement.test.ts:74-82`, `footprint.test.ts:91-99` | Vòng lặp 2–4 ngày kết thúc nhờ chốt ngày; ngày dài 15h→23h, cửa mở lại lúc nửa đêm thêm giờ bán; `performance.test.ts` không guard → canary cho "đồng hồ phải chạy ban đêm" | Chạy lại, cập nhật số đo/threshold nếu cần; giữ guard khi sửa |
| LIKELY | `balance-sweep.ts:63-73`, `category-revenue-sweep.ts:50-56`, `xoi-balance-sim.ts:47-53`, `drink-balance-sim.ts:51-57`, `snack-balance-sim.ts:54-60`, `economy-qa-sweep.ts:49-69`, `economy-civic-pop-sweep.ts:157-173`, `holiday-balance-sim.ts:39-97` (+ test) | Sweep 12–90 ngày dùng mốc ngày để chia trung bình; biên 22:00→06:00 làm cửa sổ ngày đổi | Chạy lại, ghi nhận số liệu nền mới; không nới assert |
| LIKELY | `xoi-customers.test.ts:92-101`, `drink-customers.test.ts:175-221`, `coop-day.test.ts:19-89`, `world-runtime.test.ts:104-121` | Mẫu khách dài giờ/qua ngày đổi thành phần; coop dùng routineMode nên nhánh 22:00 vốn tắt nhưng hợp đồng 23:30→ngày mới phải giữ | Chạy lại; chỉ sửa nếu fail, giữ hợp đồng `advanceToNextDay` |
| SAFE | `coop-routine.test.ts`, `day-rhythm.test.ts`, `persistence.test.ts`, `runner.test.ts`, `security.test.ts:125-128`, `party-orders*.test`, `suggestions.test.ts`, `stalls.test.ts`, `maintenance.test.ts`, các suite nhiều ngày dùng `advanceToNextDay()` trực tiếp, các unit chỉ truyền `hour`, các sim thuần (không có `GameClock`), `game-data/src/map.ts:431-432` + `stalls.ts:21` (chỉ comment lỗi thời) | Không chạy đồng hồ qua 22:00 hoặc dùng API chốt ngày tường minh | Không đổi logic; chỉ sửa comment "ngày 07:00–22:00" nếu thấy |

Thống kê: **2 file MUST-CHANGE, 17 file LIKELY-AFFECTED, ~18 nhóm SAFE**. File then chốt khi rà: `clock.ts` (nguồn), `daily-routine.test.ts` (assert trực tiếp), `world-golden*` (phải sinh lại), `integration.test.ts` + `performance.test.ts` (vòng lặp ngày), `holiday-balance-sim*` (số liệu cân bằng).

**Kết quả Phase B (17/10/2026) — kỳ vọng thực tế phải đổi:**
- `daily-routine.test.ts`: đổi khối clock mặc định sang kỳ vọng mới (07:00 + 605 s game → 22:00 **đóng cửa vào đêm, ngày vẫn 1**; thêm 110 s qua 06:00 → ngày 2, 07:00, mở cửa). Khối routine: giữ 23:30/ngủ như cũ; bước đi bộ về nhà phải dùng `dt` nhỏ (0,1 s) vì ban đêm ×3 làm bước 0,5 s nhảy qua mốc 23:30 (không quan sát được `RETURNING_HOME`) — chỉ đổi cách chạy test, không đổi assert nghiệp vụ.
- Golden world: `world-golden.ts#simulateDays` chỉ mở cửa khi `hour >= 7 && hour < 20` (trước đây `hour < 20` nên nửa đêm sẽ mở cửa bán); `world-golden.json` **sinh lại** bằng `yarn --cwd packages/game-core tsx src/world-golden-gen.ts`. Phải sinh lại lần 2 sau khi sửa lỗi giờ vượt 24 (lần 1 sinh khi còn bug), không sửa tay.
- 17 file LIKELY còn lại: chạy lại **PASS, không phải đổi kỳ vọng** (`performance.test.ts` không treo vì điều kiện tiên quyết "đồng hồ chạy ban đêm" đã đúng; integration/scenarios/building-placement/footprint/các sweep 12–90 ngày vẫn nằm trong ngưỡng). Không nới assert nào.
- Phát hiện khi làm: (1) `GameClock.advanceMinute` phải wrap `hour >= 24 → 0` (lần đầu quên nên giờ chạy tới 1102 và harness treo); (2) reset `accumulatedSeconds` trong `advanceToNextDay` làm **lệch parity** khi qua 06:00 (client một lần update mất phần dư, server chunk thì không) — đã bỏ reset; (3) chế độ routine/coop cũng áp ×3 ban đêm (nếu không, co-op đêm 22:00–23:30 không nhanh hơn); (4) qua 06:00 chỉ xảy ra ở chế độ thường vì routine chốt ngày lúc ngủ 23:30 — parity runtime được test ở mốc 22:00, parity clock/runner ở cả 22:00 và 06:00.

### 9.2 Kế hoạch test

- Phase A: `staff-shifts.test.ts` (ca/lương/ẩn hiện/gán tòa/migration 12→13/save-tải), `staff.test.ts` cập nhật; giữ `workers.test.ts` + `maintenance.test.ts` xanh.
- Phase B: test quy ước ngày (4.1), test parity client↔WorldRuntime vắt 22:00/06:00 (4.3), cập nhật các test MUST-CHANGE ở 9.1.
- Server/co-op: `world-runtime.test.ts` phát lại `assign_staff_building` + `set_staff_shift` ca đêm; `apps/server/src/coop-commands.test.ts` (Mongo) nếu chạy được.
- QA mắt: ẩn/hiện nhân viên theo giờ, pha đêm, HUD; desktop + mobile 375×812.
- Chạy thật `yarn typecheck`, `yarn --cwd packages/game-core test` (×3), `apps/web test`, `renderer test`, `test:unit`, `test:coop`; ghi kết quả vào `tổng hợp.md`, không tuyên bố PASS khi chưa chạy.
