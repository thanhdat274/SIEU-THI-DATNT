# Design

## 1. Mặt cắt (tọa độ ô thế giới, trục y hướng nam)

| Hàng y | Nội dung |
| --- | --- |
| 11–12 | Vỉa hè (đã có), ô đỗ xe máy ở hàng 12 |
| 13 | Bó vỉa 3 px sáng + rãnh 6 px sẫm ở đầu hàng; làn bắc (xe đi sang trái, `STREET_LANE_LEFT_Y` = 13,4 ô) |
| biên 13/14 | Vạch giữa nét đứt vàng |
| 14 | Làn nam (xe đi sang phải, `STREET_LANE_RIGHT_Y` = 14,6 ô) |
| 15–18 | Nhựa đường còn lại (hàng 15 là biên bản đồ có va chạm; 16–18 là dải đệm hiển thị) |

`ROAD_PROFILE = { kerbTileY: 13, centerLineTileY: 14, laneRows: 2 }`. Test khóa liên hệ này với hằng số làn xe, nên đổi làn thì test báo.

## 2. Cửa thu nước và vạch qua đường

- `STORM_DRAINS`: các ô x {4, 12, 17, 22} ở hàng bó vỉa, tránh bề ngang cửa tiệm và vạch qua đường.
- `CROSSWALK = { tileX: 9, widthTiles: 2, firstRow: 13, rows: 2 }`: ngay trước cửa tiệm (x 9–10), phủ hai làn; thanh dài theo hướng xe, rộng 4 px, bước 8 px, bắt đầu sau rãnh.
- Ô đỗ xe (x 6, 7, 12, 13) nằm trên vỉa hè nên không chồng vạch.

## 3. Độ ướt mặt đường

`roadWetnessAt(seed, day, minuteOfDay, weatherId)`: lấy hồ sơ mưa (`rainDayProfile`), duyệt bước 5 phút từ lúc bắt đầu mưa tới hiện tại, `wet = max(cường độ(s) · exp(−(t−s)/τ))` với τ = 120 phút, rồi `min(1, max(wet, cường độ hiện tại) · 1,5)`. Ngày không mưa trả 0; không mang độ ướt sang ngày sau. Hàm thuần, cùng đầu vào cùng kết quả, chi phí ≤ ~290 bước mỗi lần gọi và renderer chỉ gọi mỗi frame một lần với kết quả cache theo ngưỡng vẽ lại.

## 4. Vẽ

`buildRoadSurface(layer, widthTiles)` thêm hai `Graphics` vào `groundLayer`: lớp cố định (bó vỉa, rãnh, vạch giữa, cửa thu nước, vạch qua đường) và lớp ướt. `setWetness(w)` vẽ lại lớp ướt chỉ khi `|w − đã vẽ| ≥ 0,02` (và khi về 0): phủ xanh sẫm alpha 0,28·w, rãnh có nước alpha 0,38·w, 46 vệt phản chiếu cố định theo chỉ số, vũng nước tại mỗi cửa thu nước khi w > 0,3 với bán trục lớn dần. Khi `debugTime.rain` được đặt, độ ướt = `min(1, rain · 1,5)` (chỉ để kiểm tra bằng mắt).

## 5. Rủi ro

- Lớp ướt chỉ phủ x từ 0 đến bề rộng bản đồ; ngoài biên bản đồ đường còn lại không ướt, thấy được khi thu nhỏ camera sát biên.
- Cửa thu nước nằm trong làn bắc nên xe chạy đè lên; chấp nhận vì chỉ hình ảnh.
- Mưa nhẹ (w < 0,3) chỉ tối mặt đường rất nhẹ, không có vũng.
- Màu và độ đậm là lựa chọn thiết kế, chưa đối chiếu cảm quan trên máy khác; chưa kiểm mobile.
- Thanh vạch qua đường 4 px có thể nhòe khi camera thu nhỏ.
