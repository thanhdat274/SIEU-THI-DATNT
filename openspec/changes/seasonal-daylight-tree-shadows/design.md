# Design

## 1. Bảng mốc mọc/lặn

Năm game 120 ngày (`SEASON_YEAR_DAYS`) ánh xạ `yearFraction = getDayOfYear(day) / 120`, tương ứng ngày thực `yearFraction * 365`. Bảng 12 mốc (giữa tháng, giờ địa phương, xấp xỉ thiết kế TP.HCM, cần xác nhận cảm quan, không phải thiên văn):

| Giữa tháng | Mọc | Lặn |
| --- | --- | --- |
| 1 | 06:17 | 17:45 |
| 2 | 06:14 | 18:00 |
| 3 | 06:02 | 18:05 |
| 4 | 05:47 | 18:05 |
| 5 | 05:34 | 18:05 |
| 6 | 05:32 | 18:14 |
| 7 | 05:40 | 18:16 |
| 8 | 05:46 | 18:08 |
| 9 | 05:48 | 17:55 |
| 10 | 05:50 | 17:36 |
| 11 | 05:59 | 17:28 |
| 12 | 06:12 | 17:33 |

Nội suy tuyến theo phút giữa hai mốc kề nhau, tuần hoàn (tháng 12 → tháng 1). Mọc/lặn lệch pha nhau nên không dùng một sin duy nhất. Giữ `getSeasonalSunTimes(day)` làm API (đổi thân hàm), nên `getLightingState` không phải đổi chữ ký.

## 2. Vị trí mặt trời

Giữ phép "warp" hiện có: `rawHour` được ánh xạ để mọc→6, 12:00→12, lặn→18 trên keyframe; 12:00 vẫn là trưa cho `lighting-phase.test.ts`. Từ độ dài ngày `L = sunset − sunrise`:

- góc giờ nửa ngày `H0 = π·L/24`;
- vĩ độ `φ = 10,8°`; độ lệch hiệu dụng `tanδ = −cos(H0)/tanφ` (nhất quán với mốc mọc/lặn, nên không cần lịch thiên văn riêng);
- góc giờ hiện tại `H` chạy tuyến tính từ `−H0` (lúc mọc) đến `+H0` (lúc lặn), 0 lúc 12:00 warp;
- độ cao `sin(el) = sinφ·sinδ + cosφ·cosδ·cosH`; phương vị từ `atan2` chuẩn. Bắc = trục −y bản đồ, đông = +x.

Hệ quả thực tế ở vĩ độ thấp: tháng 5–7 mặt trời lệch bắc nên bóng trưa ngả nam; tháng 11–1 mặt trời lệch nam nên bóng trưa ngả bắc. Mọi hàm thuần, không dùng RNG hay thời gian thực, nên multiplayer/save giữ deterministic.

`LightingState` thêm `sunAzimuth`, `sunElevation` và `shadowDir {x, y}` (đơn vị, hướng bóng, ngược mặt trời). `shadowLean`/`shadowLength` được giữ và suy ra từ `shadowDir`/độ cao để các bóng nội thất, bóng actor hiện có không đổi hành vi; test `shadowLean < 0 lúc 8h, > 0 lúc 17h` vẫn phải đúng.

## 3. Cây là dữ liệu bản đồ

`TREE_PROPS` trong `game-data/src/map.ts`: `{ id, tileX, tileY, height (ô), crownRadius (ô) }`. Cây duy nhất hiện có ở ô (3, 11) cho va chạm (`wallData = 7`) và sprite ở (2, 9) trong `viewport.ts`; chuyển cả hai nguồn đọc từ `TREE_PROPS` để tránh lệch. Bổ sung thêm cây chỉ là thêm một dòng dữ liệu (cần kiểm không chặn cửa, bãi đỗ, lối đi).

## 4. Vẽ bóng

Mỗi cây: tâm bóng = gốc cây + `shadowDir · height · k / tan(el)`, độ dài kẹp tối đa (ví dụ ≤ 3,5 ô) để không bóng vô hạn lúc gần mọc/lặn; elip dài theo hướng bóng, bán kính ngang bằng `crownRadius`. Độ mờ = `sun · baseAlpha · (1 − 0,88·rain) · (1 − cloud)`; ban đêm (`sun = 0`) không vẽ. Bóng ở `shadowLayer` (đã có), không che sprite. Chỉ vẽ lại khi phương vị hoặc độ cao đổi ≥ 1° hoặc mưa đổi đáng kể (ngưỡng/cache trong renderer), không vẽ lại mỗi frame.

## 5. Rủi ro

- Test hiện dùng `day = 1` mặc định: mốc ngày 1 (đầu tháng 1) ≈ 06:17/17:45, lệch ~25 phút so với đường sin cũ; cần kiểm lại các khoảng mượt của `lighting-phase.test.ts`.
- Mốc là xấp xỉ; cần so sánh cảm quan trong game và có thể chỉnh bảng không đổi cấu trúc.
- Ngày ngắn nhất ~11,2 h, dài nhất ~12,7 h: kiểm giờ mở cửa/bắt đầu ngày không bị ảnh hưởng (chỉ ánh sáng đổi, không đổi logic ngày).
- Chưa đo hiệu năng; chưa có browser QA (môi trường hiện chặn dev server).
