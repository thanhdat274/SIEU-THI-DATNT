# Tasks: Lộ trình cấp độ rõ ràng đến cấp 35

## 1. Dữ liệu progression dùng chung

- [x] 1.1 Thêm bảng XP tích lũy cấp 1–35 và helper lấy XP từng cấp.
- [x] 1.2 Thêm helper milestone slot nhân viên, traffic và sức chứa khách; nối slot vào quy tắc tuyển dụng hiện tại. Mật độ khách được tinh chỉnh tiếp ngày 01/10/2026: baseline spawn 5.5s; sức chứa active 2/3/4/5 theo các mốc cấp 1/5/10/20; chờ xác minh typecheck/test/browser.
- [x] 1.3 Chuẩn hóa player save cũ theo tỷ lệ tiến độ, clamp level và hỗ trợ cap 35.
- [x] 1.4 Áp dụng hệ số XP bán hàng theo level, giới hạn spawn/traffic và cap khi cộng XP.

## 2. Trình bày tiến trình cho người chơi

- [x] 2.1 Mở rộng lộ trình HUD tới cấp 35, nêu XP đến mốc và từng mở khóa thực tế.
- [x] 2.2 Hiển thị nhân viên, tăng lưu lượng, sức chứa khách và trạng thái max level.
- [x] 2.3 Đồng bộ QuestModal và toast lên cấp với mốc/cap mới.

## 3. Tài liệu và kiểm chứng

- [x] 3.1 Đồng bộ `tổng hợp.md`, `TASKS.md`, `ROADMAP.md` và OpenSpec change này.
- [x] 3.2 Chạy typecheck/test/build và xử lý lỗi phát hiện (`yarn typecheck`, `yarn test`, `yarn build` PASS; đã sửa null check `simulationRef` ở ShelfModal và sửa mapping giờ daylight).
- [ ] 3.3 Browser QA: cấp kế tiếp, nhảy nhiều cấp, save legacy, cấp 35/cap, unlock toast và modal.
- [ ] 3.4 Playtest thời gian lên cấp, payroll ở slot cao, mật độ spawn và balance sau cấp 20.
