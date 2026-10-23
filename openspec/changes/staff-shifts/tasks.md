# Tasks

Trạng thái 17/10/2026 tối: **CẢ 2 PHASE ĐÃ CODE XONG + test tự động xanh (game-core chạy 3 lần liền sau đợt sửa cuối) + QA MẮT DESKTOP PASS; CHƯA commit; CHỈ CÒN QA MOBILE (B7.5b).** Phase A = ca + gán tòa (không đụng clock); Phase B = pha đêm 22:00–06:00 + quy ước ngày + parity client↔WorldRuntime + **routine đêm theo chốt 17/10/2026** (23:30 về nhà ngủ nhưng không đen màn/không chốt ngày; 05:50 mới mờ đen, 06:00 chốt ngày). Chủ dự án cũng chốt giữ **lương ca đêm 0,6** và **tốc độ đêm ×3**.

**Bằng chứng chạy thật cuối (17/10/2026, sau toàn bộ sửa kể cả routine đêm):** `yarn typecheck` EXIT 0; `yarn --cwd packages/game-core test` **EXIT 0, 112/112 pass, 0 fail, chạy 3 lần liên tiếp sau đợt sửa cuối** (suite mới `staff-shifts.test.ts`, `night-cycle.test.ts`, replay trong `world-runtime.test.ts`); `yarn --cwd packages/game-renderer test` EXIT 0; `yarn --cwd apps/web test` EXIT 0; `yarn --cwd apps/server test:unit` EXIT 0; `yarn --cwd apps/server test:coop` **EXIT 0** (Mongo) — đã thêm ca gán tòa + ca đêm qua HTTP. Golden world đã **sinh lại** bằng `world-golden-gen.ts`; `daily-routine.test.ts` + `coop-day.test.ts` cập nhật kỳ vọng (23:30 ngủ không chốt ngày, 06:00 mới chốt). QA mắt desktop PASS (B7.5a). Chi tiết giới hạn/ghi chú ở `tổng hợp.md`.

Quyết định phạm vi: (a) mở giờ chơi ban đêm thật 22:00–06:00, (b) gán tòa lọc việc đầy đủ, (c) KHÔNG nối luật bảo vệ đêm chặn trộm. Bổ sung sau duyệt: chia 2 phase, kiểm kê test phụ thuộc "22:00 nhảy ngày" (bảng ở `design.md` §9.1), parity tốc độ ×3 client↔WorldRuntime, quy ước 00:00–06:00 thuộc ngày N, ca sáng 07:00–14:00, cảnh báo UI "ca đêm chưa giảm trộm".

## PHASE A — Ca làm + gán tòa (KHÔNG đụng clock)

Cổng cuối Phase A: `yarn typecheck` EXIT 0 + `game-core test` xanh + `apps/web test`/`renderer test` (nếu chạy được) xanh → **dừng báo cáo, chờ duyệt mới sang Phase B.**

### A1. Dữ liệu và kiểu dùng chung

- [x] A1.1 `StaffShift` thêm `'night'`; `STAFF_SHIFTS`: `morning` **07:00–14:00** (đổi từ 06:00), `afternoon` 14:00–22:00, `night` 22:00–06:00 hệ số 0,6, `full_day` **07:00–22:00** (đổi từ 06:00); tên hiển thị tiếng Việt (`packages/shared/src/index.ts`).
- [x] A1.2 `StaffBuilding` đổi thành alias id tòa dạng chuỗi (hết union `'main'|'xoi'|'drink'|'snack'`); giữ trường `StaffMember.assignedBuilding?: string` và `StaffWorkerTask.assignedBuilding?` để tương thích; sửa chỗ gán cứng kiểu cũ (`game-core/src/staff.ts`).
- [x] A1.3 `GameCommandPayload` thêm `{ type: 'assign_staff_building'; staffId: string; buildingId: string | null }`; thêm `'assign_staff_building'` vào `SERVER_REPLAYED_COMMAND_TYPES` (`packages/shared/src/command-types.ts`).
- [x] A1.4 `CURRENT_SAVE_SCHEMA_VERSION = 13`; thêm `12` vào danh sách `schemaVersion` viết tay trong `isSaveGameData`; thêm `migrateToW13` (ca lạ → `full_day`; bỏ `staffSchedule` mồ côi/không hợp lệ) và gọi trong các nhánh migration hiện có. Lọc `assignedBuilding` mồ côi làm ở `StaffManager.load` (game-core, dùng `resolvePlacements`) vì `shared` không import được `@game/data`.
- [x] A1.5 Test schema/assignment: save 12 (ca sáng + gán tòa `drink` đã mua + gán tòa không tồn tại) → lên 13 đúng; save 14 bị từ chối `unsupported_future`; save 12 thiếu trường ca/lịch nạp được; gán tòa không tồn tại bị xoá khi nạp sim.

### A2. Logic ca và lương (game-core)

- [x] A2.1 File mới `packages/game-core/src/staff-shifts.ts`: `isKnownShift`, `isShiftActiveAt(shift, minuteOfDay)` (ca đêm vắt qua nửa đêm), `isStaffActiveAt(member, scheduleShift, day, minute)`, `activeShiftOf`, `shiftWage(dailyWage, shift)`, `shiftLabel`.
- [x] A2.2 `packages/game-data/src/staff.ts`: thêm `isKnownShift`; giữ `isShiftWithinStoreHours` nghĩa "trong giờ bán" (ca ngày); `staff-manager.ts` (`load`, `normalizeStaffSchedule`, `setStaffShift`) và `simulation.setStaffShift` chuyển sang `isKnownShift` để ca đêm sống qua lưu/tải.
- [x] A2.3 Thay hai bản logic ca trùng: `GameSimulation.isStaffOnShift` + `isActorAvailableForRestock` dùng chung helper; bảng lương `calculatePayroll`/`processPayroll` đọc hệ số ca như cũ (đêm tự có phụ cấp).
- [x] A2.4 `GameSimulation.peekVisibleStaff()` (read-only, chỉ nhân viên đang trong ca); renderer `viewport.ts` đổi `peekStaff()` → `peekVisibleStaff()`. Không đổi sprite/atlas.
- [x] A2.5 Giữ tương thích bắt buộc: hết ca dừng việc + hoàn hàng (workers.test), bảo trì qua đêm vẫn đếm mọi nhân viên `refill` không lọc ca (maintenance.test) — ghi chú lý do ngay tại `maintenance.ts`.
- [x] A2.6 Test `staff-shifts.test.ts` (nối `test-runner.ts`): ca đêm 22:00/23:30/00:30/05:59 trong ca, 06:00/21:59 ngoài ca; ca sáng 07:00 bắt đầu/06:59 chưa; lương đêm > lương sáng; nhân viên hiredOnDay tương lai không trong ca; lịch ca chứa ca đêm sống qua reload; ẩn hiện theo giờ.
- [x] A2.7 Sửa test cũ bị ảnh hưởng bởi ca mới: `staff.test.ts` đang khẳng định **mọi** ca nằm trong 06–22 (`isShiftWithinStoreHours`) — đổi sang kiểm ca ngày bằng `isShiftWithinStoreHours` + kiểm `isKnownShift` cho cả bốn ca, không nới assert khác.

### A3. Gán nhân viên vào tòa

- [x] A3.1 Hàm thuần `staffBuildingOptions(placements)` + `validateStaffBuilding(id, validIds)` (game-core); danh sách tòa lấy từ `resolvePlacements(storeLayout.buildingPlacements, unlockedPlotIds)`.
- [x] A3.2 `GameSimulation.setStaffBuilding(staffId, buildingId | null)`: kiểm tra nhân viên/tòa; đổi tòa khi đang làm việc thì dừng + hoàn hàng + nhả claim; ghi `assignedBuilding`; `notifyStateChanged`; trả lý do tiếng Việt khi từ chối.
- [x] A3.3 Tuyển: `hireStaff` chỉ áp `candidate.assignedBuilding` khi id tòa hợp lệ, ngược lại "toàn tiệm".
- [x] A3.4 Lọc châm hàng theo tòa: private helper lọc target theo `buildingOfFixture` dùng ở `getNextAutoRestockTarget`, `claimRestockJob`, `assignRefillJob`, nhánh tự châm trong `updateStaffWorkers`; `getRestockJobTargets()` công khai giữ nguyên cho UI người chơi. Không gán = như cũ.
- [x] A3.5 Lọc thu ngân: `getCashierPost(member)` chỉ quầy thuộc tòa gán; `assignNextCashierCustomer(member)` chỉ khách có `cashierFixtureId` thuộc tòa gán (thiếu `cashierFixtureId` coi như tiệm chính). Không gán = như cũ.
- [x] A3.6 Lọc bảo vệ: `updateSecurityPatrol` dựng điểm dừng theo tòa gán (`entranceOf` + geometry), tiệm chính giữ đúng mảng `stops` cũ. Ca đêm dùng chung.
- [x] A3.7 Lọc dọn bàn: `assignDiningCleanup` + nhánh chọn bàn tự động chỉ bàn thuộc tòa gán.
- [x] A3.8 Test gán tòa: gán tòa hợp lệ/không tồn tại/xoá gán; châm hàng chỉ nhận kệ tòa gán (và từ chối kệ tòa khác); thu ngân chỉ nhận khách quầy tòa gán; bảo vệ tuần tra tòa gán; save/tải giữ gán; tòa đang thi công vẫn chờ ở kho (L3-C6).

### A5. Server replay và co-op

- [x] A5.1 `WorldRuntime.executeCommand`: `assign_staff_building` → `simulation.setStaffBuilding`; `bootstrap.ts` thêm `'assign_staff_building'` vào `ALLOWED_COMMAND_TYPES`.
- [x] A5.2 `save-invariants.ts`: kiểm tra nhẹ cho lệnh gán tòa (nhân viên tồn tại, `assignedBuilding` phải nằm trong danh sách tòa của save).
- [x] A5.3 Client `App.tsx`: `handleSetStaffBuilding` mô phỏng rồi `commitBusinessChange`; lỗi server → `resyncOnlineWorldAfterReject`.
- [x] A5.4 `world-runtime.test.ts`: replay `assign_staff_building` (thành công, tòa không tồn tại bị từ chối, gửi lại cùng commandId không đổi), `set_staff_shift` ca đêm; save client gửi kèm bị bỏ.

### A6. Giao diện

- [x] A6.1 `StaffModal.tsx`: chọn ca đủ 4 ca; chọn tòa ("Toàn tiệm" + tòa đang có); hiện lương theo ca, đang trực/ngoài ca; nối `onSetBuilding`.
- [x] A6.2 **Cảnh báo ca đêm**: khi chọn ca đêm hiện ghi chú "Ca đêm chưa giảm trộm — sẽ có ở theft-and-security 4.4" ngay dòng chọn ca để người chơi không trả phụ cấp đêm vô ích mà không biết.
- [x] A6.3 `App.tsx` truyền danh sách tòa + giờ hiện tại cho `StaffModal`; nối handler gán tòa.

### A7. Cổng Phase A

- [x] A7.1 `yarn typecheck` EXIT 0.
- [x] A7.2 `yarn --cwd packages/game-core test` xanh (ghi số test/fail); giữ `workers.test.ts` + `maintenance.test.ts` xanh.
- [x] A7.3 `yarn --cwd apps/web test`, `yarn --cwd packages/game-renderer test` (nếu chạy được) — ghi kết quả thật.
- [x] A7.4 Cập nhật tạm `tổng hợp.md`/`TASKS.md`/`ROADMAP.md` trạng thái Phase A (không tuyên bố đã xong change) rồi **dừng báo cáo giữa hai phase**, chờ duyệt sang Phase B. Chưa commit.

## PHASE B — Pha đêm 22:00–06:00 (chỉ sau khi Phase A xanh)

### B4. Kiểm kê và dọn kỳ vọng "22:00 nhảy ngày" (làm TRƯỚC khi sửa clock)

- [x] B4.1 Kiểm kê xong 17/10/2026 (bảng đầy đủ ở `design.md` §9.1): **2 file MUST-CHANGE** (`daily-routine.test.ts:34-42` assert trực tiếp; `world-golden.test.ts` + `world-golden.ts` + `__golden__/world-golden.json` phải sinh lại), **17 file LIKELY-AFFECTED** (integration/scenarios/performance, building-placement/footprint, các balance sweep 12–90 ngày, xoi/drink-customers, coop-day/world-runtime), ~18 nhóm SAFE. Điều kiện tiên quyết: pha đêm phải giữ `GameClock.update()` chạy khi cửa đóng, nếu không `performance.test.ts` treo (không guard).
- [x] B4.2 Cập nhật các test/sim MUST-CHANGE theo quy ước ngày mới (chốt lúc 06:00) **trước hoặc cùng lúc** với sửa clock; không nới assert lung tung, ghi rõ trong test vì sao đổi.

### B5. Đồng hồ, luật cửa hàng, quy ước ngày

- [x] B5.1 Hằng số `BUSINESS_HOURS` (mở 07:00, đóng 22:00), `NIGHT_START_HOUR = 22`, `NIGHT_END_HOUR = 6`, `NIGHT_TIME_SCALE_MULTIPLIER = 3` (`packages/game-data`).
- [x] B5.2 `GameClock`: `isNightPhase`; `update()` chạy khi `isStoreOpen || isNightPhase`; 22:00 đóng cửa vào đêm (không nhảy ngày); 06:00 chốt ngày → 07:00 và mở cửa lại (chế độ thường); `timeScale` hiệu dụng ×3 ban đêm, không ghi vào save.
- [x] B5.3 Quy ước ngày: `day` = N suốt 00:00–06:00; ngày N chỉ chốt tại 06:00 hoặc khi ngủ/qua đêm sớm; test `hiredOnDay` (nhân viên tuyển ngày N làm ca đêm ngày N), lương ca đêm trả trong payroll ngày N đúng một lần, trộm đêm chạy đúng một lần cho đêm N và ghi ngày N+1.
- [x] B5.4 `setStoreOpen(true)` chỉ trong giờ bán → ngoài giờ trả `outside_business_hours`; rà không còn đường sinh khách khi cửa đóng; chế độ sinh hoạt ngày giữ 22:00/23:30.
- [x] B5.5 "Ngủ/Qua đêm" dùng `advance_day`/time vote hiện có (không thêm lệnh); kiểm chốt ngày không chạy hai lần (06:00 và ngủ).
- [x] B5.5b **Routine đêm theo chốt 17/10/2026**: 23:30 nhân vật về nhà ngủ nhưng không đen màn/không chốt ngày; đồng hồ chạy ×3 tới 06:00 mới mờ đen + chốt ngày; thức dậy 07:00 ở cửa nhà, cửa chờ 08:00 mở; nút Ngủ ẩn khi routine đang tự ngủ; `sleepNow()` cho nút Ngủ thủ công (routine: về cửa nhà). Test `night-cycle.test.ts` mục 8/8b/9, `daily-routine.test.ts`, `coop-day.test.ts` (đổi kỳ vọng: co-op 06:00 mới chốt ngày).
- [x] B5.6 Test clock/đêm: 21:59 mở cửa bình thường; 22:00 đóng + pha đêm + đồng hồ vẫn chạy; 06:00 ngày +1 đúng một lần; mở cửa ban đêm bị từ chối; ngủ lúc 23:00 → 07:00 và việc chốt ngày chạy một lần; save/tải giữa đêm tiếp tục đúng pha.

### B6. Parity tốc độ ×3 client ↔ WorldRuntime

- [x] B6.1 Hệ số ×3 nằm một nơi trong `GameClock` (áp lên `realSecPerGameMin` theo pha, không theo `dt`); `FixedStepSimulationRunner`/`WorldRuntime` không có nhánh riêng.
- [x] B6.2 Test parity: cùng save, cùng tổng `elapsedSeconds`, chạy (a) `update(1/60)` lặp kiểu client và (b) `WorldRuntime.tick(0.25)` lặp kiểu server, vắt 21:59→22:00 và 05:59→06:00; assert cùng `day`/`hour`/`minute`/`isStoreOpen`/doanh thu/số nhân viên đang trực.
- [x] B6.3 Pause/checkpoint không đổi: `WorldRuntime` vẫn pause khi 0 session, checkpoint theo `checkpointIntervalSeconds`; test khẳng định không thêm timer/nhịp wall-clock mới.

### B7. Co-op, HUD đêm và kiểm chứng cuối

- [x] B7.1 Co-op: pha đêm đi theo `worldTime` save chung do server tick; parity `WorldRuntime` vs client cùng chế độ coop/routine qua 22:00 (test `night-cycle.test.ts` mục 7); `test:coop` PASS. Hai client trình duyệt thật: chưa QA (để B7.5).
- [x] B7.2 `HUD.tsx`: dấu hiệu ban đêm, khoá nút mở cửa ngoài giờ bán kèm lý do, nút "Ngủ/Qua đêm" chỉ trong pha đêm; toast 22:00/06:00.
- [x] B7.3 `apps/server/src/coop-commands.test.ts` (cần Mongo, nếu chạy được): gán tòa + đổi ca đêm qua HTTP; thành viên còn lại thấy đúng; lệnh sai không đổi revision.
- [x] B7.4 Chạy thật `yarn typecheck`, `game-core test` ×3, `apps/web test`, `renderer test`, `test:unit`, `test:coop` (nếu Mongo); ghi kết quả + fail có sẵn.
- [x] B7.5a **QA mắt desktop 1280×800 — PASS (17/10/2026, Browser pane + dev server 5173, chơi local bằng `window.__sim`)**: HUD ban đêm hiện "Ban đêm — tiệm đóng cửa", nút cửa khoá aria "Ban đêm, không mở cửa", nút **Ngủ** hiện; `StaffModal` có đủ 4 ca, chọn tòa ("Toàn tiệm"/"Tiệm tạp hóa"), lương theo ca (đêm 18.000 ₫ vs sáng 15.000 ₫ với lương đủ ngày 30.000 ₫), trạng thái đúng (23:00: bảo vệ đêm "Đang trực", thu ngân sáng "Ngoài ca"; 07:19: ngược lại), cảnh báo "Ca đêm chưa giảm trộm…"; `peekVisibleStaff` lúc 23:00 chỉ bảo vệ đêm, 07:19 chỉ thu ngân sáng; bấm **Ngủ** lúc 23:00 → ngày +1, 07:00, mở bảng tổng kết ngày; bảng lương ngày hiện "Lương nhân viên -33.000 ₫" (18.000 + 15.000). Phát hiện + sửa P2: nút Ngủ ở routine mode trước đây để nhân vật đứng lại trong tiệm → thêm `GameSimulation.sleepNow()`, có test.
  - **QA lại routine đêm sau khi chốt 17/10/2026 (PASS)**: đặt 23:29 với nhân vật ở cửa nhà → 23:46 `SLEEPING`, `day` vẫn 8, `daily-routine-fade` **không** active, nút Ngủ **ẩn**; đặt 05:51 (vẫn SLEEPING) → bắt được `fade active = true` sau 400 ms; clock chạy tiếp → 06:0x ngày +1, `AT_HOME`, fade tắt; đèn/nhân viên ban đêm vẫn đúng (chỉ bảo vệ đêm).
- [ ] B7.5b QA mắt **mobile 375×812 / 667×375**: CHƯA LÀM — DSH browser tool không có `browser_resize`/`resize_window`, không đổi được viewport; mới rà CSS + DOM + code ở viewport desktop (chưa thấy lỗi qua đọc code), cần Chrome DevTools hoặc máy thật.
- [x] B7.6 Cập nhật đầy đủ `tổng hợp.md`/`TASKS.md`/`ROADMAP.md`; đánh dấu dòng phụ thuộc ở `theft-and-security` 4.4 và `snack-shop-building` 3.5 nếu chủ dự án đồng ý; KHÔNG sửa `openspec/changes/open-world-districts-city-goals`; chưa commit.
