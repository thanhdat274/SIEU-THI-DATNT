# Design

## 1. Chu kỳ đèn

`TRAFFIC_SIGNAL` (`game-data/src/traffic.ts`): xanh 26 s, vàng 3 s, đỏ 15 s (chu kỳ 44 s). Đèn người đi bộ trong pha đỏ: `dont_walk` 1 s đầu, `walk` 9 s, `clearing` (nhấp nháy) phần còn lại 5 s, rồi xe xanh. Thời gian là giây mô phỏng của hẻm (cộng dồn `dt`, nhân đôi khi tăng tốc 2x), không phải giờ game; đồng hồ đèn nằm trong `StreetTrafficManager` (`signalClock`), cục bộ như xe và không lưu. `trafficSignalAt(t)` và `pedestrianWalkSecondsLeft(t)` là hàm thuần.

## 2. Xe

Mỗi xe có `speed` (tốc độ chạy thường) và `currentSpeed` tùy chọn. Mỗi bước (≤ 0,1 s) tốc độ mong muốn là:

- `speed`, nếu không bị chặn;
- khi cần dừng (đèn vàng/đỏ, hoặc có người đang qua) và đầu xe chưa chạm mép vạch: `√(2·decel·khoảng cách tới vạch dừng)` (vạch dừng cách mép vạch 6 px), nên dừng êm; vượt vạch dừng nhẹ vẫn phải dừng hẳn;
- ngoại lệ lưỡng lự: xe còn chạy tốc độ thường mà khoảng cách còn nhỏ hơn 0,6 lần quãng phanh thì đi tiếp; xe đã bắt đầu phanh thì không đổi ý;
- giữ xe trước: coi xe đi trước cùng chiều là chướng ngại đứng yên cách `followGapPx`.

Tốc độ thực tăng tối đa `accel` = 80 px/s², giảm theo tốc độ mong muốn. Xe được xử lý từ xe đi đầu để xe sau thấy vị trí đã cập nhật. Không sinh xe mới chồng lên đuôi hàng ở đầu làn (dời 2 s rồi thử lại). `maxConcurrent` vẫn 2.

## 3. Người đi bộ

Người nền (`StreetPedestrianState`) sinh với cooldown 18 đến 42 s tại một trong hai mép (x ngẫu nhiên trong bề ngang vạch), tối đa 2, không sinh ban đêm (ngoài 5h đến 22h) hoặc khi mưa > 0,6. Chờ ở mép (`waiting`), bắt đầu qua (`crossing`) khi đèn đi và thời gian còn lại ≥ thời gian qua đường (khoảng 1,9 s) + 0,5 s; đi 38 px/s tới mép bên kia rồi biến mất. Người đang qua khiến xe chưa vào vạch phải dừng nhường kể cả khi đèn xe xanh.

## 4. Renderer

`street-signal.ts`: hai cột ở x = mép vạch ∓ 10 px, chân tại y = 12,85 ô trên vỉa hè; mỗi cột có đèn xe 3 bóng và đèn người đi bộ 2 ô (đỏ trên, xanh dưới, đỏ nhấp nháy ở pha clearing), vẽ lại chỉ khi trạng thái đổi. Người đi bộ là sprite đồ họa nhỏ, nhún nhẹ khi đi. Dữ liệu qua `GameSimulation.getTrafficSignal()` và `getStreetPedestrians()`.

## 5. Rủi ro

- Khách thật vẫn không qua đường; người đi bộ chỉ là hoạt cảnh.
- Với tối đa 2 xe, xe đứng chờ làm giảm lưu lượng và có thể chặn sinh xe làn đó lâu hơn; hàng chờ dài tối đa 2 xe.
- Ngưỡng lưỡng lự 0,6 và gia tốc/giảm tốc là lựa chọn thiết kế, chưa đối chiếu cảm quan.
- Mô phỏng ở nhịp khung thấp (bước con 0,1 s) vẫn đúng, nhưng chưa đo chi phí CPU.
- Chưa xem đèn đổi pha, hàng chờ và người qua đường thực tế trong trình duyệt khi pane hiển thị.
