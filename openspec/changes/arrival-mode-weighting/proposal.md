# Proposal

## Why

Khách chọn cách đến tiệm bằng bảng cố định trong `customers.ts`: trời khô 45% xe máy, 7% ô tô, 48% đi bộ; mưa trên 0,4 thì 40/25/35, không phụ thuộc giờ hay ngày trong tuần. Ngoài ra ô tô chỉ là một nhãn: khách "ô tô" không có chỗ đỗ, không có sprite xe và đi bộ vào từ cửa tiệm như người đi bộ. Đây là hạng mục thứ 5 trong thứ tự đề xuất của `tổng hợp.md` sau các change thời tiết, đường và đèn giao thông.

## What Changes

- Tỷ trọng đến tiệm tính theo ngữ cảnh (`arrivalModeWeights`, hàm thuần): giờ (cao điểm sáng và chiều nhiều xe máy, buổi tối nhiều ô tô, giờ trưa nhiều người đi bộ), cuối tuần (nhiều ô tô), mưa liên tục theo cường độ (người đi bộ giảm mạnh, ô tô tăng, xe máy giảm nhẹ) thay cho ngưỡng 0,4, và chỗ đỗ còn trống.
- Dữ liệu cấu hình ở `game-data/src/arrival-modes.ts`; tỷ trọng gốc trời khô, ngày thường, ngoài khung giờ đặc biệt giữ như cũ.
- Khách ô tô có chỗ đỗ riêng (`CAR_PARKING_SPOTS`, hai chỗ rộng trên vỉa hè phía đông, chồng không lên cột đèn, ô đỗ xe máy, vạch qua đường hay cửa tiệm), đi ra xe để rời như khách xe máy, và renderer vẽ ô tô đỗ.
- Hết chỗ đỗ cho một loại xe thì loại đó không được chọn (chia lại cho các loại còn lại) thay vì dồn hết sang đi bộ.
- Khách quen giữ quy tắc riêng (Chú Ba luôn xe máy, v.v.); riêng "Anh Tuấn" đi ô tô nay có chỗ đỗ thật, hết chỗ thì đi bộ.

## Capabilities

### New Capabilities

- `arrival-mode-weighting`: tỷ trọng phương thức đến theo giờ, thứ, mưa và chỗ đỗ.
- `car-parking`: chỗ đỗ ô tô của khách và hiển thị xe đỗ.

### Modified Capabilities

- Không có spec chính sửa.

## Non-goals

- Khách đi bộ qua đường qua vạch (xuất hiện ở phía nam bản đồ): cần đổi bản đồ và dò đường, change riêng.
- Tỷ lệ xe nền chạy trên đường (`street-traffic.ts`) theo giờ/mưa; vẫn giữ quy tắc riêng.
- Cân bằng kinh tế: phương thức đến chưa ảnh hưởng số tiền tiêu hay độ kiên nhẫn trừ phần bảo vệ xe máy sẵn có.
- Xe ô tô lái vào/ra, âm thanh, nhiều kiểu dáng ô tô.

## Impact

`packages/game-data/src/arrival-modes.ts`, `map.ts` (`CAR_PARKING_SPOTS`), `packages/game-core/src/arrival-mode.ts`, `customers.ts`, `simulation.ts`, `packages/game-renderer/src/viewport.ts`, test `arrival-mode.test.ts`, `tổng hợp.md`.
