# Tasks

Trạng thái 01/10/2026: mới soạn đặc tả, chưa có code nào của change này; chưa chạy typecheck/test/build/browser.

## 1. Mốc mọc/lặn theo mùa

- [ ] 1.1 Thay `getSeasonalSunTimes` bằng bảng 12 mốc nội suy tuần hoàn (`lighting-phase.ts`); giữ API.
- [ ] 1.2 Test: xác định theo `day`, nối năm mượt (≤3 phút), độ dài ngày 11–13 h, mọc sớm nhất ≠ lặn muộn nhất.
- [ ] 1.3 Chạy lại `lighting-phase.test.ts` với mốc ngày 1 mới; chỉnh ngưỡng chỉ khi lý do chính đáng và ghi lại.

## 2. Vị trí mặt trời

- [ ] 2.1 Thêm `getSolarPosition` và `sunAzimuth`/`sunElevation`/`shadowDir` vào `LightingState`; suy `shadowLean`/`shadowLength` từ chúng.
- [ ] 2.2 Test: độ cao = 0 lúc mọc/lặn, đỉnh lúc 12:00, đông–tây sáng/chiều, lệch bắc tháng 6 và lệch nam tháng 12, 24h nối 0h.

## 3. Cây là dữ liệu bản đồ

- [ ] 3.1 Thêm `TREE_PROPS` (`game-data/src/map.ts`); `map.ts` (va chạm ô 3,11) và `viewport.ts` (sprite ô 2,9) cùng đọc từ đó, giữ vị trí cũ.
- [ ] 3.2 Test dữ liệu: cây không trùng cửa, ô đỗ, cột đèn.

## 4. Bóng cây trong renderer

- [ ] 4.1 Thay elip cố định trong `viewport.ts` bằng bóng mỗi cây theo `shadowDir`/độ cao, kẹp độ dài, mờ theo mưa (+ mây nếu có dữ liệu).
- [ ] 4.2 Cache theo ngưỡng 1° và mưa; không `clear()/draw` mỗi frame khi không đổi.
- [ ] 4.3 Đo/ghi hiệu năng với số cây hiện tại; chưa tăng số cây nếu chưa đo.

## 5. Kiểm chứng và tài liệu

- [ ] 5.1 `yarn typecheck`, `yarn test`, `yarn build`; ghi kết quả thực.
- [ ] 5.2 Browser QA: bóng đổi hướng trong ngày, đổi theo mùa, biến mất khi mưa/đêm; desktop và mobile (cần môi trường cho phép dev server).
- [ ] 5.3 Cập nhật `tổng hợp.md`, `TASKS.md`, `ROADMAP.md`; không đánh dấu nghiệm thu nếu chưa có browser QA.
