# Tasks

Trạng thái 01/10/2026: nhóm 1–3 đã có code và test tự động (`yarn typecheck`, `yarn test` 7 suite 0 fail, `yarn build` PASS); nhóm 4 mới kiểm một phần trên desktop.

## 1. Dữ liệu

- [x] 1.1 `ROAD_PROFILE`, `STORM_DRAINS`, `CROSSWALK` trong `game-data/src/map.ts`.
- [x] 1.2 Test hình học khớp làn xe, cửa thu nước, vạch qua đường trước cửa tiệm, không chồng ô đỗ (`road.test.ts`).

## 2. Độ ướt mặt đường

- [x] 2.1 `roadWetnessAt` và `ROAD_DRY_TAU_MINUTES` trong `game-core/src/weather.ts`; `GameSimulation.getRoadWetness()`.
- [x] 2.2 Test: ngày khô bằng 0, trước mưa bằng 0, đỉnh ≥ cường độ, khô dần đơn điệu sau mưa, xác định.

## 3. Renderer

- [x] 3.1 `road-surface.ts`: bó vỉa, rãnh, vạch giữa, cửa thu nước, vạch qua đường.
- [x] 3.2 Lớp đường ướt + vũng nước, vẽ lại theo ngưỡng 0,02; thay đoạn trang trí cũ (lỗi `length`) trong `viewport.ts`.

## 4. Kiểm chứng và còn lại

- [x] 4.1 `yarn typecheck`, `yarn test`, `yarn build` PASS (01/10/2026).
- [x] 4.2 Browser QA một phần (desktop, Browser pane, `?debugTime=…`): đường khô thấy bó vỉa, 4 cửa thu nước, vạch giữa, vạch qua đường trước cửa; mưa 0,9 mặt đường tối và có 4 vũng; mưa 0,15 chỉ tối nhẹ, không vũng; không lỗi console.
- [ ] 4.3 Chưa kiểm: mobile, ban đêm/đèn đường trên đường ướt, khi thu nhỏ camera sát biên bản đồ, mưa thực trong ngày chơi (độ ướt khô dần theo thời gian), hiệu năng.
- [ ] 4.4 Quyết định sau: giọt/sóng nước động quanh vũng, mang độ ướt qua đêm, màu và độ đậm.
- [ ] 4.5 Cập nhật `TASKS.md`/`ROADMAP.md` khi chốt nghiệm thu.
