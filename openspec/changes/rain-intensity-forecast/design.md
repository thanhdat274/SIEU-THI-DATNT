# Design

## 1. Hồ sơ mưa

`rainDayProfile(seed, day, weatherId)` trả `{ peak, centerMinute, halfDuration }` hoặc `null` nếu thời tiết không phải `rainy`/`heavy_rain`/`storm`. Thứ tự gọi RNG (`hashSeed("seed:rain:day")` → giờ tâm, nửa độ dài, đỉnh) giữ y nguyên bản cũ nên `rainIntensityAt` cho đúng kết quả cũ và save/đồng bộ nhiều người không đổi.

Đỉnh theo loại: `rainy` 0,20–0,52; `heavy_rain` 0,55–0,90; `storm` 0,78–1,00. Cường độ tức thời = `peak · smoothstep(1 − |t − center| / half)`.

## 2. Dải mưa

| Dải | Từ cường độ |
| --- | --- |
| Không mưa | 0 |
| Mưa phùn | 0,03 |
| Mưa vừa | 0,30 |
| Mưa to | 0,55 |
| Mưa giông | 0,80 |

Dải của một ngày dựa trên đỉnh mưa, nên `rainy` cho phùn hoặc vừa, `heavy_rain` cho to hoặc giông, `storm` cho to hoặc giông. `rainBandOf(intensity)` dùng được cho cường độ tức thời.

## 3. Dự báo

`rainForecastForDay` lấy cửa sổ `centerMinute ± 0,75·halfDuration` (tại mép, cường độ ~16% đỉnh), làm tròn 15 phút, kẹp trong 0–1440. Vì cùng hồ sơ nên dự báo hôm trước đúng với thực tế hôm sau; nếu sau này thêm sai số dự báo thì phải đổi ở đây và ghi rõ.

`getMarketSummary()` thêm `weather.rain` (hôm nay) và `forecast[i].rain`; thời tiết "hiệu lực" lấy qua `effectiveWeatherId` nên sự kiện thị trường đổi thời tiết cũng đổi dự báo mưa.

## 4. Giao diện

Chuỗi `describeRainForecast`: "Mưa vừa 14:00–16:15". Thị trường hẻm và tooltip HUD hiển thị cho hôm nay và hai ngày tới; bản tin sáng ghi dòng "Dự báo ngày mai: Mưa (Mưa vừa 14:00–16:15)".

## 5. Rủi ro

- Nhãn trùng: loại "Mưa to" và dải "Mưa to" cùng chữ; chuỗi hiển thị ghép dải trong ngoặc cùng khung giờ nên có thể đọc lặp. Có thể đổi nhãn dải sau khi xem trên giao diện.
- Cửa sổ 0,75 là lựa chọn thiết kế, chưa đối chiếu cảm quan; mưa nhẹ ở mép vẫn xảy ra ngoài cửa sổ.
- Dự báo luôn đúng; cần quyết định sau có thêm độ bất định hay không.
- Chưa đổi hành vi khách/xe theo dải mưa.
