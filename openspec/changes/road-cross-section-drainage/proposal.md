# Proposal

## Why

Lòng đường hẻm hiện chỉ là một dải nhựa phẳng. Phần "vạch làn, cống, vạch qua đường" trong `viewport.ts` thực tế không hiển thị: đoạn mã dùng biến `length` không khai báo (nên lấy `window.length` bằng 0), danh sách hàng đường rỗng và không có gì được vẽ; cột đèn tín hiệu trong đoạn đó cũng chưa từng xuất hiện. Hai làn xe đã có thật ở `street-traffic.ts` nhưng không có hình đường tương ứng. Mưa đã có cường độ và dự báo (change `rain-intensity-forecast`) nhưng mặt đường không phản ứng. Đây là hạng mục thứ 3 trong thứ tự đề xuất của `tổng hợp.md`.

## What Changes

- Mặt cắt lòng đường dạng dữ liệu (`ROAD_PROFILE`, `STORM_DRAINS`, `CROSSWALK` trong `game-data/src/map.ts`), khớp hai làn xe: bó vỉa và rãnh thoát nước sát vỉa hè, làn bắc, vạch giữa nét đứt, làn nam.
- Cửa thu nước (song chắn) trong rãnh tại các ô khai báo; vạch qua đường (zebra) ngay trước cửa tiệm, các thanh song song hướng xe chạy.
- Độ ướt mặt đường `roadWetnessAt` (lên theo mưa, khô dần theo hàm mũ sau mưa, ngày khô thì khô) và `GameSimulation.getRoadWetness()`.
- Renderer `road-surface.ts`: lớp đường ướt (tối đi, rãnh có nước, vệt phản chiếu) và vũng nước ở mỗi cửa thu nước, lớn dần khi mưa nặng; chỉ vẽ lại khi độ ướt đổi ≥ 0,02.
- Chỉ hình ảnh: không đổi va chạm, đường đi, giao thông hay cân bằng. Bỏ đoạn mã trang trí cũ không chạy được, kể cả cột tín hiệu tĩnh.

## Capabilities

### New Capabilities

- `road-surface`: mặt cắt lòng đường, cửa thu nước, vạch qua đường.
- `wet-road`: độ ướt mặt đường và vũng nước theo mưa.

### Modified Capabilities

- Không có spec chính sửa.

## Non-goals

- Đèn giao thông có chu kỳ, xe nhường người qua đường, đi bộ băng qua vạch (change sau).
- Ngập thật, thoát nước chậm có tác động gameplay; vũng nước chỉ là hình ảnh.
- Giọt mái hiên, sóng nước động quanh vũng, bóng cột đèn đêm.
- Làn xe thêm, dải phân cách rộng, dải trồng cây.
- Mưa nhiều ngày liên tiếp mang độ ướt sang ngày sau (hiện đường khô qua đêm).

## Impact

`packages/game-data/src/map.ts`, `packages/game-core/src/weather.ts` và `simulation.ts`, `packages/game-renderer/src/road-surface.ts` và `viewport.ts`, test `road.test.ts`, `tổng hợp.md`.
