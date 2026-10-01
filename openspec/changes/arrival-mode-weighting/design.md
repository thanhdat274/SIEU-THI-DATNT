# Design

## 1. Tỷ trọng

`arrivalModeWeights({ hour, weekday, rainIntensity, freeMotorbikeSpot, freeCarSpot })` bắt đầu từ `ARRIVAL_BASE_WEIGHTS` (đi bộ 0,48, xe máy 0,45, ô tô 0,07), nhân lần lượt:

| Yếu tố | Đi bộ | Xe máy | Ô tô |
| --- | --- | --- | --- |
| 7 đến 9 giờ (cao điểm sáng) | 0,9 | 1,25 | 0,8 |
| 11 đến 13 giờ | 1,15 | 1 | 1 |
| 17 đến 19 giờ (cao điểm chiều) | 0,8 | 1,3 | 1,4 |
| 19 đến 22 giờ (tối) | 0,8 | 0,85 | 1,8 |
| Thứ Bảy, Chủ Nhật (chỉ số 5, 6) | 1,1 | 0,9 | 1,8 |
| Mưa r (0..1) | 1 − 0,75 r | 1 − 0,1 r | 1 + 2,5 r |

Hệ số khung giờ nhân với hệ số cuối tuần, rồi với mưa. Loại hết chỗ đỗ có tỷ trọng 0; chuẩn hóa tổng về 1; nếu cả ba bằng 0 thì đi bộ. Thiếu `hour`/`weekday` thì bỏ hệ số tương ứng (các test cũ gọi `maybeSpawnCustomer` không có ngữ cảnh vẫn chạy). `pickArrivalMode(weights, roll)` chọn theo thứ tự xe máy, ô tô, đi bộ, dùng cùng `roll` xác định như trước nên cùng hạt giống cho cùng kết quả.

## 2. Chỗ đỗ ô tô

`CAR_PARKING_SPOTS`: hai điểm (x = 560 và 736 px, y = 12·32 + 14) trên vỉa hè phía đông, giữa cột đèn x = 15, 20 và mép bản đồ; ô tô neo giữa-đáy, sprite 68x36 (tái dùng `vehicle_car_right`). Ô tô đỗ trên mép vỉa hè gần bó vỉa như ở hẻm thật. Khách ô tô xuất phát tại điểm đỗ và rời bằng cách đi lại ô đó, đúng cơ chế khách xe máy (`vehicleSpot`). Chỗ đã có khách dùng bị loại khỏi danh sách trống, nên không hai khách chung một chỗ.

## 3. Đổi hành vi so với bản cũ

- Mưa nhẹ nay đã ảnh hưởng (trước đây chỉ khi > 0,4); mưa lớn 0,9 cho khoảng 52% xe máy, 29% ô tô và 20% đi bộ (trước đây mưa > 0,4 luôn 40%, 25%, 35%); trời khô, ngày thường, giờ thường giữ 45%, 7%, 48%.
- Ô tô nay chiếm chỗ đỗ riêng thật, tối đa 2 khách ô tô cùng lúc; các lượt vượt quá thành người đi bộ hoặc xe máy (qua tỷ trọng, không dồn hết sang đi bộ).
- Khách "ô tô" trước đây đi bộ ra từ cửa; nay đi từ chỗ đỗ phía đông qua vỉa hè (đi xa hơn một chút trước khi tới kệ).

## 4. Rủi ro

- Hệ số là lựa chọn thiết kế, chưa cân bằng bằng chơi thử; chưa có dữ liệu xem phương thức đến ảnh hưởng doanh thu.
- Ô tô đỗ trên vỉa hè có thể chắn đường đi của người chơi dọc vỉa hè phía đông (ô tô không có va chạm, chỉ hình ảnh; người chơi đi xuyên qua xe).
- Khách ô tô đi xa hơn có thể làm tăng thời gian chờ/bỏ đi so với trước; chưa đo.
