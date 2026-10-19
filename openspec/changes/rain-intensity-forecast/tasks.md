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
- [x] 4.3 Xem lại chữ hiển thị trùng ("Mưa to (Mưa to 13:00–15:00)") và quyết định có đổi nhãn dải. **Đã đóng 07/10/2026:** giữ nguyên nhãn dải ("Mưa to") nhưng bỏ nhãn dải ở chuỗi ghép khi trùng nhãn thời tiết — `describeRainForecast(forecast, { omitWhenMatchingWeatherLabel: label })` ở `game-core/weather.ts`; bật ở `MarketModal` (hôm nay + hai ngày), tooltip HUD và bản tin sáng (`simulation.ts`): "Mưa to (13:00–15:00)". Test `rain.test.ts` thêm 3 ca (trùng → bỏ, khác → giữ, không truyền → giữ). `yarn typecheck` toàn workspace PASS.
- [ ] 4.4 Quyết định có thêm độ bất định cho dự báo và có đổi hành vi khách/xe theo dải mưa (thuộc change sau). **ĐÃ CHỐT 17/10/2026:** dự báo có sai số (ngày xa sai nhiều hơn ngày gần); mưa to làm ít khách hơn và xe chậm (cần cân bằng lại lưu lượng).
  - **ĐÃ CODE 19/10/2026 (chưa commit; hệ số khách theo mưa ĐÃ CHỐT 19/10/2026, sai số dự báo và tốc độ xe vẫn PROVISIONAL):** (a) `forecastRainForDay(seed, day, weatherId, daysAhead)` ở `game-core/weather.ts`: lệch đỉnh ±`FORECAST_PEAK_ERROR_PER_DAY`(0,1)×số ngày và lệch giờ ±`FORECAST_TIME_ERROR_PER_DAY`(30 phút)×số ngày, deterministic theo `hashSeed(seed:rain-forecast:day:daysAhead)` + `Mulberry32Rng`; hôm nay đúng thật; `market-summary.ts` dùng cho ngày mai/ngày kia (HUD tooltip, MarketModal, bản tin sáng đều đọc từ đây). Thời tiết thật không đổi. Test `rain.test.ts`: sai số TB đỉnh 0,051 (1 ngày) < 0,147 (3 ngày), giờ 16 < 48 phút; cùng seed cùng kết quả. Giới hạn: chỉ dải/khung giờ sai, LOẠI thời tiết dự báo (nắng/mưa) vẫn đúng.
  - (b) `RAIN_BAND_CUSTOMER_FACTOR` (`game-data/weather.ts`: vừa 0,95 / to 0,6 / giông 0,5) theo dải mưa ĐỈNH của ngày, nhân vào dòng khách từng tòa (lô × hội chợ W4 × mưa). Đo cặp `rain-paired-sweep.ts`: mưa to −15% / giông −21% ở cấp 6, −7% ở cấp 20 (trần khách giữ); nhân thêm trần khách thì −38% nên đã bỏ. Xe nền chậm thêm tới −12% từ mưa ≥0,55 (`HEAVY_RAIN_EXTRA_SLOWDOWN`), xe khách rời tiệm nhân cùng hệ số. Bảng sweep ở `tổng hợp.md` — **CHỜ CHỦ DỰ ÁN DUYỆT SỐ**.
- [ ] 4.5 Cập nhật `TASKS.md`/`ROADMAP.md` khi chốt nghiệm thu. (19/10/2026: đã ghi trạng thái code; nghiệm thu chờ duyệt hằng số.)
