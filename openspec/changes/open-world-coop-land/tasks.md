# Tasks

Trạng thái 05/10/2026: mới có kế hoạch, chưa có code. Phụ thuộc `open-world-land-reclamation` xong.

## 0. Kiểm chứng nền co-op (bắt buộc trước)

- [ ] 0.1 Chạy `test:coop`, `test:gateway`, `test:worlds` với Mongo replica set; ghi kết quả thật vào `tổng hợp.md`.
- [ ] 0.2 QA hai trình duyệt thật: vào hẻm, mua tòa, `layout_batch`, `expand_footprint`, `relocate_building`, `reclaim_wave` của Bước 2–4; ghi lỗi tìm được và sửa trước khi làm tiếp.

## 1. Giữ chỗ quy hoạch

- [ ] 1.1 Runtime: `PlanningReservation`, TTL 60 giây, xóa khi ngắt; socket `planning:reserve`/`planning:release`; snapshot mang giữ chỗ của người khác.
- [ ] 1.2 Server từ chối lệnh đất đụng giữ chỗ của người khác (`reserved_by_other`); test gateway.
- [ ] 1.3 Client: gửi/gia hạn giữ chỗ khi ở chế độ quy hoạch; renderer vẽ bóng mờ + tên người kia.

## 2. Quyền và phiếu

- [ ] 2.1 Bảng quyền D2; `world.settings.memberLandPermissions`, `ownerSkipsVote`; lệnh đổi cài đặt có receipt; UI trong bảng hẻm.
- [ ] 2.2 `land-vote` theo khuôn `time-vote`: tạo, đồng ý, từ chối, hết hạn 45 giây, người kia rời thì chạy; test.

## 3. Ghi nhận

- [ ] 3.1 Schema 8 + migration 7→8 (`builtBy`, bản ghi lô có người mua/ngày) ở `shared`, `apps/web`, server.
- [ ] 3.2 Nhật ký thành phố trong bảng "Thành phố".

## 4. Thông báo

- [ ] 4.1 Ánh xạ `reserved_by_other`, `stale_revision` (lệnh đất), `vote_rejected`, `forbidden` sang toast có tên; tự làm mới quy hoạch.

## 5. Kiểm chứng và tài liệu

- [ ] 5.1 `test:coop`, `test:gateway`, `test:worlds`, `yarn typecheck`, `yarn test`, `yarn build` PASS (ghi kết quả thật).
- [ ] 5.2 QA hai trình duyệt theo tiêu chí trong `proposal.md`; ghi riêng.
- [ ] 5.3 Cập nhật `tổng hợp.md`, `TASKS.md`, `ROADMAP.md`.
