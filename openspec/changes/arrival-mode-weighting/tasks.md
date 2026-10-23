# Tasks

Trạng thái 01/10/2026: nhóm 1–3 đã có code và test tự động (`tsc -b --force` sạch, `yarn test` 7 suite 0 fail, `yarn build` PASS); nhóm 4 chưa kiểm được bằng mắt.

## 1. Dữ liệu và hàm thuần

- [x] 1.1 `ARRIVAL_BASE_WEIGHTS`, `ARRIVAL_TIME_BANDS`, `ARRIVAL_WEEKEND`, `ARRIVAL_RAIN` (`game-data/src/arrival-modes.ts`); `CAR_PARKING_SPOTS` (`map.ts`).
- [x] 1.2 `arrivalModeWeights`, `pickArrivalMode` (`game-core/src/arrival-mode.ts`).

## 2. Tích hợp

- [x] 2.1 `CustomerManager.maybeSpawnCustomer` nhận ngữ cảnh giờ/thứ (tham số cuối tùy chọn), chọn phương thức qua tỷ trọng, gán chỗ đỗ ô tô, giữ quy tắc khách quen.
- [x] 2.2 `GameSimulation` truyền giờ và `weekdayOf(day)`.
- [x] 2.3 Test `arrival-mode.test.ts`: tỷ trọng gốc, mưa đơn điệu, khung giờ, cuối tuần, hết chỗ đỗ, thứ tự chọn theo roll, hình học chỗ đỗ ô tô, tích hợp qua `CustomerManager` (mưa giảm đi bộ và tăng ô tô, tối cuối tuần nhiều ô tô, chỗ đỗ đúng loại, không chung chỗ).

## 3. Renderer

- [x] 3.1 `viewport.ts` vẽ ô tô đỗ (`vehicle_car_right`) tại chỗ của khách ô tô, dùng chung cơ chế với xe máy đỗ.

## 4. Kiểm chứng và còn lại

- [x] 4.1 `yarn typecheck` (`tsc -b --force`), `yarn test`, `yarn build` PASS (01/10/2026, Node 24 qua PATH vì lệnh mặc định đang trỏ Node 20 không đạt engine >= 22).
- [ ] 4.2 Browser QA: chưa thấy khách ô tô đến, đỗ ở phía đông và rời đi; Browser pane bị ẩn nên game gần như đứng. Cần chạy khi pane hiển thị (đặc biệt tối cuối tuần hoặc ngày mưa), desktop và mobile.
- [ ] 4.3 Cảm quan/cân bằng: tỷ lệ ô tô, quãng đi từ chỗ đỗ, khách bỏ đi do đi xa, hệ số khung giờ.
- [x] 4.4 (17/10/2026; review 4 cập nhật 18/10/2026) Quyết định sau — khách đi bộ qua đường tại vạch đã làm trong `traffic-light-crosswalk-yielding` 4.5 (sinh phía xa, chờ đèn, băng vạch vào/rời tiệm; đèn pha thuần từ worldTime nên đồng bộ client). Không thêm chỗ đỗ ô tô, giữ chỗ đỗ phía đông (không đổi `CAR_PARKING_SPOTS`). Golden sinh lại: base doanh thu 12.650.000 → 12.879.500 (+1,8%), allBuildings 16.705.000 → 17.446.500 (+4,4%); doanh thu không giảm >5%; số liệu ghi tại `tổng hợp.md`. **Review 4:** tách `INTERSECTION_SIGNAL` ưu tiên xe (ngã tư xe xanh 26/39 ≈ 67%) trong khi vạch trước cửa giữ ưu tiên đi bộ → khách ô tô mép tây tới bãi đỗ đông nhanh hơn (tổng 53,7 s → 39,7 s, đứng đèn 26,8 s → 13,1 s); golden sinh lại sau tách **delta 0%** (vạch trước cửa không đổi).
- [x] 4.5 (17/10/2026) Cập nhật `TASKS.md`/`ROADMAP.md`/`tổng hợp.md` khi chốt nghiệm thu.
