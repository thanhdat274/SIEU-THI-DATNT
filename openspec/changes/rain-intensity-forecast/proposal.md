# Proposal

## Why

Mưa đã có cường độ thay đổi trong ngày (`rainIntensityAt`, `packages/game-core/src/weather.ts`) và hiệu ứng hạt mưa theo cường độ, nhưng người chơi chỉ thấy loại thời tiết ("Mưa", "Mưa to"). Dự báo hai ngày không nói cơn mưa mạnh cỡ nào hay vào giờ nào, nên không lập kế hoạch nhập hàng, mở cửa hay giờ cao điểm xe máy được. Đây là hạng mục thứ 2 trong thứ tự đề xuất của `tổng hợp.md` sau change `seasonal-daylight-tree-shadows`.

## What Changes

- Dải mưa theo cường độ: không mưa, mưa phùn, mưa vừa, mưa to, mưa giông (`RAIN_BANDS`, `rainBandOf` trong `game-data/src/weather.ts`).
- Tách hồ sơ mưa trong ngày (`rainDayProfile`: đỉnh, giờ đỉnh, nửa độ dài) khỏi hàm cường độ tức thời; `rainIntensityAt` giữ nguyên kết quả cũ.
- Dự báo mưa theo ngày (`rainForecastForDay`): dải theo đỉnh và khung giờ mưa làm tròn 15 phút, khớp thực tế vì dùng cùng hồ sơ.
- Giao diện: dòng thời tiết ở Thị trường hẻm, tooltip thời tiết trên HUD và bản tin sáng hiển thị "Mưa vừa 14:00–16:15" cho hôm nay và hai ngày tới.
- Không đổi save/schema, không đổi lượng mưa hay cân bằng kinh tế.

## Capabilities

### New Capabilities

- `rain-forecast`: dải mưa, hồ sơ mưa trong ngày và dự báo cường độ + khung giờ.

### Modified Capabilities

- Không có spec chính sửa; hiệu ứng mưa và tác động thị trường theo loại thời tiết giữ nguyên.

## Non-goals

- Đường ướt, vũng nước, giọt mái hiên, cống thoát (thuộc change mặt cắt đường).
- Đổi hành vi khách/xe theo mưa; hành vi hiện có (tỷ lệ đến bằng xe và giảm tốc xe khi mưa > 0,4) giữ nguyên, chỉ ghi nhận để rà soát sau.
- Xác suất mưa nền theo mùa: trọng số `CLIMATE_SEASONS` đã làm mùa mưa dày hơn, không đổi ở đây.
- Mây (chưa có dữ liệu mây).

## Impact

`packages/game-data/src/weather.ts`, `packages/game-core/src/weather.ts` và `simulation.ts` (`getMarketSummary`, bản tin sáng), `apps/web` `MarketModal.tsx`/`HUD.tsx`, test `rain.test.ts`, `tổng hợp.md`.
