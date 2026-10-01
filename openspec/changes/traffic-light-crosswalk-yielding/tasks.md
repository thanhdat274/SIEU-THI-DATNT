# Tasks

Trạng thái 01/10/2026: nhóm 1–3 đã có code và test tự động (`yarn typecheck`, `yarn test` 7 suite 0 fail, `yarn build` PASS); nhóm 4 mới kiểm một phần (hình tĩnh), chưa xem được đèn đổi pha/xe dừng trong trình duyệt.

## 1. Đèn và dữ liệu

- [x] 1.1 `TRAFFIC_SIGNAL`, `STREET_PEDESTRIANS`, `STREET_VEHICLE_RULES` (`game-data/src/traffic.ts`); kiểu `StreetPedestrianState`, `TrafficSignalState`, `currentSpeed` (`shared`).
- [x] 1.2 `trafficSignalAt`, `pedestrianWalkSecondsLeft` (`game-core/src/traffic-signal.ts`).

## 2. Xe và người đi bộ

- [x] 2.1 `StreetTrafficManager`: dừng/xếp hàng/nhường, lưỡng lự lúc vàng, người đi bộ nền, bước con 0,1 s, không sinh xe chồng đuôi hàng.
- [x] 2.2 `GameSimulation.getTrafficSignal()`, `getStreetPedestrians()`.
- [x] 2.3 Test `traffic-signal.test.ts`: chu kỳ và an toàn đèn đi bộ, dừng ở đèn đỏ + giữ khoảng cách + đi khi xanh, không giảm tốc khi xanh, lưỡng lự lúc vàng, nhường người đang qua, người chờ đến pha đi và không qua khi sắp hết pha, giới hạn sinh người, mô phỏng 30 phút (0 xung đột, 0 xe chồng, có xe dừng chờ đỏ). Sửa trong lúc làm: lỗi NaN khi vượt vạch dừng nhẹ và lỗi xe "đổi ý" chạy vượt đèn đỏ do ngưỡng lưỡng lự áp cả với xe đang phanh.

## 3. Renderer

- [x] 3.1 `street-signal.ts`: hai cột đèn cạnh vạch (đèn xe + đèn người đi bộ) và sprite người đi bộ; tích hợp `viewport.ts`.

## 4. Kiểm chứng và còn lại

- [x] 4.1 `yarn typecheck`, `yarn test`, `yarn build` PASS (01/10/2026).
- [ ] 4.2 Browser QA: đã thấy trong Browser pane hai cột đèn cạnh vạch, một người đứng chờ ở mép vỉa và xe chạy qua; chưa thấy đèn đổi màu, xe dừng/xếp hàng chờ đèn đỏ hay người băng qua vì pane bị ẩn nên trang bị giảm tốc (khung hình/thời gian game gần như dừng). Cần chạy lại khi pane hiển thị, cả desktop và mobile.
- [ ] 4.3 Cảm quan: tốc độ phanh/tăng tốc, độ dài các pha, kích thước đèn và người đi bộ khi thu nhỏ camera, đèn ban đêm.
- [ ] 4.4 Đo hiệu năng bước con 0,1 s và sprite người đi bộ.
- [ ] 4.5 Quyết định sau: khách thật qua đường (đổi ô xuất hiện/ô đỗ), đồng bộ đèn giữa các client, tăng `maxConcurrent`.
- [ ] 4.6 Cập nhật `TASKS.md`/`ROADMAP.md` khi chốt nghiệm thu.
