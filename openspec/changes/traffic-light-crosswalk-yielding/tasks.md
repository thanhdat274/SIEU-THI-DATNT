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
- [x] 4.2 (một phần, 02/10/2026: đèn đổi màu, xe xếp hàng chờ đỏ, 0 xe vi phạm vạch, đã sửa lỗi xe qua vạch bị kẹt; còn mobile) Browser QA: đã thấy trong Browser pane hai cột đèn cạnh vạch, một người đứng chờ ở mép vỉa và xe chạy qua; chưa thấy đèn đổi màu, xe dừng/xếp hàng chờ đèn đỏ hay người băng qua vì pane bị ẩn nên trang bị giảm tốc (khung hình/thời gian game gần như dừng). Cần chạy lại khi pane hiển thị, cả desktop và mobile.
- [x] 4.3 (17/10/2026, review 4 cập nhật 18/10/2026) Cảm quan pha đèn: pha giờ là hàm thuần suy từ `worldTime` (ngày + phút) qua `trafficSignalPhaseFromWorldClock`, áp dụng như nhau ở client và WorldRuntime nên không còn lệch giữa các client (xem 4.5 đồng bộ). **Review 4 — tách chu kỳ:** hai tín hiệu dùng chung hàm pha (chu kỳ `TRAFFIC_SIGNAL_CYCLE_SEC = 39` phút game) nhưng khác bản đồ pha→trạng thái qua `signalStateAt(elapsedSec, config)`: `STORE_FRONT_SIGNAL` (vạch trước cửa, ưu tiên người đi bộ) **green 7, yellow 2, red 30, pedLead 1, pedWalk 22** (đi bộ 22/39 ≈ 56%); `INTERSECTION_SIGNAL` (ngã tư, ưu tiên xe) **green 26, yellow 3, red 10, pedLead 1, pedWalk 5** (xe xanh 26/39 ≈ **67% ≥ 50%**, khôi phục chu kỳ cũ; trước review mọi nơi ưu tiên đi bộ nên ngã tư xe chỉ 18%). Đèn ban đêm ×3: pha suy từ giờ game nên giữ đúng cả khi ×3 và catch-up, không giật (xác nhận ở `tổng hợp.md`).
- [x] 4.4 (17/10/2026) Đo hiệu năng bước con với N khách đang chờ ở vạch (sau) so với N khách đang đi (trước), `sim.update(0.25)` / tick: chờ ở vạch là O(1) không pathfind mỗi khung nên chi phí gần như không đổi (N=0: 0,86 ms; N=10: 0,46; N=20: 0,44; N=40: 0,42; N=60: 0,41; N=80: 0,44 ms/tick); trước khi làm crosswalk với khách đang đi: 0,815 / 0,503 / 0,370 / 0,346 / 0,395 / 0,366. Không có mức tăng theo N đáng kể. Chi tiết tại `tổng hợp.md` (mục hiệu năng).
- [x] 4.5 (17/10/2026) Quyết định sau — khách thật qua đường: khách đi bộ giờ sinh ở phía bên kia đường, đi bộ tới vạch trước cửa tiệm, chờ đèn người đi bộ xanh rồi băng qua `STORE_FRONT_CROSSWALK` vào tiệm; khi rời tiệm cũng băng qua vạch về phía xa rồi biến mất. Đèn trước cửa là pha thuần từ `worldTime` → đồng bộ giữa các client/WorldRuntime (không gửi mỗi khung qua mạng); xe trên đường main dừng trước vạch khi đèn đi bộ xanh. Không thêm chỗ đỗ ô tô, giữ phía đông (arrival-mode 4.4). Test: `crosswalk.test.ts` (chờ đèn đỏ không vào vạch, qua khi xanh, vào tiệm + rời qua vạch, save/load giữa chừng khi đang chờ); `traffic-signal.test.ts` thêm pha thuần theo ngày+phút và hai manager cùng giờ cho cùng pha. `yarn typecheck` EXIT 0; `yarn --cwd packages/game-core test` EXIT 0, 112/112 pass ×3. Golden world sinh lại (base +1,8%, allBuildings +4,4% doanh thu, ghi tại `tổng hợp.md`). Renderer vẽ vạch trước cửa + trụ đèn đi bộ (`buildFrontCrosswalk`, `viewport.ts`). **Review 4 (18/10):** vạch trước cửa (`STORE_FRONT_SIGNAL`) KHÔNG đổi; tách riêng `INTERSECTION_SIGNAL` ưu tiên xe → khách ô tô mép tây tới bãi đỗ đông nhanh hơn: tổng 53,7 s → 39,7 s, thời gian đứng đèn 26,8 s → 13,1 s (số liệu `tổng hợp.md` + `.qa/review-traffic-cycle.md`).
- [x] 4.6 (17/10/2026) Cập nhật `TASKS.md`/`ROADMAP.md`/`tổng hợp.md` khi chốt nghiệm thu. Browser QA: CHƯA QA (cần máy thật/login/co-op; hành vi đã phủ bằng test tự động).
