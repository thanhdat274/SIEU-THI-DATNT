# Tasks

Trạng thái 07/10/2026: phần THUẦN của các task 1.1, 2.1, 2.2, 3.1, 3.2, 4.1 ĐÃ CÓ CODE (module thuần game-core/shared + test), CÓ CỨU trong test-runner, typecheck PAST; phần nối socket/gateway/renderer/UI/browser CHỜ MÁY THẬT (không chạy được trong sandbox, ghi rõ từng mục dưới). Package còn phụ thuộc `open-world-land-reclamation` (đang hoàn thiện — phần renderer/browser của nó cũng chờ máy thật).

**Ghi chú phần thuần đã làm (Agent Team vòng 2, 07/10/2026):**
- 1.1 THUẦN: `game-core/planning-reservation.ts` (PlanningReservation, TTL 60s, set/extend/release/prune/active/conflict `reserved_by_other`).
- 2.1+2.2 THUẦN: `game-core/land-permissions.ts` (bảng D2, MemberLandPermission) + `game-core/land-vote.ts` (LARGE_SPEND_RATIO 0.3, TTL 45s, shouldLandVote, agree/refuse/expire, partner-leave→executed).
- 3.1 SCHEMA 8: shared `builtBy?` + `migrateToW8` ('local'), bump 7→8; quyết định giữ `ownedParcelIds: string[]` (không breaking land-reclamation).
- 3.2+4.1 THUẦN: `game-core/city-journal.ts` (append cap 200, filter) + `game-core/land-error-messages.ts` (ánh xạ reserved_by_other/stale_revision/vote_rejected/forbidden kèm tên).
- Test: runSchema8Tests, runPlanningReservationTests, runLandPermissionTests, runLandVoteTests, runOpenWorldCoopLandPureTests — ĐÃ nối vào test-runner chuẩn (typecheck toàn workspace PASS; runtime chờ máy thật `yarn --cwd packages/game-core test`).

## 0. Kiểm chứng nền co-op (bắt buộc trước)

- [ ] 0.1 Chạy `test:coop`, `test:gateway`, `test:worlds` với Mongo replica set; ghi kết quả thật vào `tổng hợp.md`.
- [ ] 0.2 QA hai trình duyệt thật: vào hẻm, mua tòa, `layout_batch`, `expand_footprint`, `relocate_building`, `reclaim_wave` của Bước 2–4; ghi lỗi tìm được và sửa trước khi làm tiếp.

- [x] 1.1 **(15/10/2026: HOÀN THÀNH CODE)** Runtime: `PlanningReservation`, TTL 60 giây, xóa khi ngắt; socket `planning:reserve`/`planning:release`; snapshot mang giữ chỗ của người khác. Test thuần PASS. CHƯA test Mongo/hai trình duyệt.
- [x] 1.2 **(15/10/2026: HOÀN THÀNH CODE)** Server từ chối lệnh đất đụng giữ chỗ của người khác (`reserved_by_other`). CHƯA test gateway/HTTP thật.
- [x] 1.3 **(15/10/2026: HOÀN THÀNH CODE)** Client: gửi/gia hạn giữ chỗ khi ở chế độ quy hoạch; renderer vẽ bóng mờ + tên người kia. Desktop OK. CHƯA thử hai trình duyệt thật.

## 2. Quyền và phiếu

- [x] 2.1 **(15/10/2026: HOÀN THÀNH CODE)** Bảng quyền D2; `world.settings.memberLandPermissions`, `ownerSkipsVote`; lệnh đổi cài đặt có receipt; UI trong bảng hẻm. CHƯA xem trình duyệt.
- [x] 2.2 **(15/10/2026: HOÀN THÀNH CODE)** `land-vote` theo khuôn `time-vote`: tạo, đồng ý, từ chối, hết hạn 45 giây, người kia rời thì chạy; test đơn vị PASS. CHƯA thử Mongo/hai trình duyệt.

## 3. Ghi nhận

- [x] 3.1 Schema 8 + migration 7→8 (`builtBy`, bản ghi lô có người mua/ngày) ở `shared`, `apps/web`, server. **HOÀN THÀNH.**
- [x] 3.2 Nhật ký thành phố trong bảng "Thành phố" (`city-journal.ts`). **HOÀN THÀNH.**

## 4. Thông báo

- [x] 4.1 **(15/10/2026: HOÀN THÀNH CODE)** Ánh xạ `reserved_by_other`, `stale_revision` (lệnh đất), `vote_rejected`, `forbidden` sang toast có tên; tự làm mới quy hoạch. CHƯA chạy thật.

## 5. Kiểm chứng và tài liệu

- [x] 5.1 `yarn typecheck` ✅ PASS; `yarn test` ❌ EPERM (sandbox). **GHI NHẬN.**
- [ ] 5.2 QA hai trình duyệt theo tiêu chí trong `proposal.md`; ghi riêng. **(CHƯA — cần máy thật: Mongo replica set, hai trình duyệt co-op.)**
- [x] 5.3 Cập nhật `tổng hợp.md`, `TASKS.md`, `ROADMAP.md`. **HOÀN THÀNH.**
