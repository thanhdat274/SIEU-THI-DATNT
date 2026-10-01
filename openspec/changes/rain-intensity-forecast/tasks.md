# Tasks

Trạng thái 01/10/2026: nhóm 1–3 đã có code và test tự động (`yarn typecheck`, `yarn test` 7 suite 0 fail, `yarn build` PASS); nhóm 4 mới kiểm một phần.

## 1. Dải và hồ sơ mưa

- [x] 1.1 `RAIN_BANDS`/`rainBandOf` trong `game-data/src/weather.ts`.
- [x] 1.2 Tách `rainDayProfile` khỏi `rainIntensityAt` (cùng thứ tự RNG, kết quả cũ giữ nguyên).
- [x] 1.3 Test dải, tính xác định, ngày khô không có hồ sơ (`rain.test.ts`).

## 2. Dự báo mưa

- [x] 2.1 `rainForecastForDay`, `describeRainForecast`, `formatMinuteOfDay` (cửa sổ ±0,75 nửa độ dài, làm tròn 15 phút).
- [x] 2.2 `getMarketSummary` trả `weather.rain` và `forecast[i].rain`; bản tin sáng ghi khung giờ mưa ngày mai.
- [x] 2.3 Test khung giờ hợp lệ, phủ đủ các dải trong năm, dự báo hôm trước khớp thực tế hôm sau qua `GameSimulation`.

## 3. Giao diện

- [x] 3.1 `MarketModal` hiển thị khung giờ mưa hôm nay và hai ngày tới.
- [x] 3.2 Tooltip thời tiết trên `HUD` ghi hôm nay và dự báo kèm khung giờ.

## 4. Kiểm chứng và còn lại

- [x] 4.1 `yarn typecheck`, `yarn test`, `yarn build` PASS (01/10/2026).
- [ ] 4.2 Browser QA: mới xem tooltip HUD với ngày nắng (không có dòng mưa, đúng); chưa thấy được một ngày mưa trong UI vì save hiện tại ở ngày 1 nắng và hai ngày tới không mưa. Cần mở Thị trường hẻm, DaySummary/bản tin sáng khi có dự báo mưa, desktop và mobile.
- [ ] 4.3 Xem lại chữ hiển thị trùng ("Mưa to (Mưa to 13:00–15:00)") và quyết định có đổi nhãn dải.
- [ ] 4.4 Quyết định có thêm độ bất định cho dự báo và có đổi hành vi khách/xe theo dải mưa (thuộc change sau).
- [ ] 4.5 Cập nhật `TASKS.md`/`ROADMAP.md` khi chốt nghiệm thu.
