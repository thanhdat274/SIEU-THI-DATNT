# Bảng Thị trường: kế hoạch tồn kho và nhãn lý do

Mở bằng nút thời tiết trên HUD (`MarketModal.tsx`). Bảng chỉ đọc: không đặt hàng, không đổi giá, không đổi kho.

## Các phần

| Phần | Nguồn dữ liệu | Ý nghĩa |
| --- | --- | --- |
| Thời tiết, Sự kiện, Mùa | `getMarketSummary()` | Hôm nay, dự báo 2 ngày, sự kiện đang chạy/sắp tới, mùa kế tiếp |
| Giá thị trường theo nhóm | `getPriceMarket()` | Chỉ số giá tham chiếu và lý do (nhu cầu, khan hiếm, chi phí) |
| Món đang được ưa chuộng | `getTrendingProducts()` | Tối đa 5 món có nhu cầu hiệu dụng > +5%; món có tồn hoặc nhập được xếp trước |
| Kế hoạch tồn kho | `getProductPlans()` | Tối đa 12 món cần chú ý (có tồn, đang bán hoặc đang về mà bị gắn cờ) |
| Lượng khách | `getMarketSummary().traffic` | Hệ số lưu lượng và các yếu tố |

## Một dòng trong "Kế hoạch tồn kho"

`Tên món: tồn N (+M đang về), cần ~X/ngày <xu hướng> · <cờ> · <ghi chú> · <lý do>`

- **Cần ~X/ngày**: nhu cầu dự kiến cho ngày mai (đơn vị/ngày). Có doanh số gần đây thì bằng vận tốc bán × (hệ số nhu cầu ngày mai ÷ hôm nay); chưa có doanh số thì dùng độ phổ biến × `trialUnitsPerPopularity`. Gợi ý nhập dùng đúng số này.
- **Xu hướng**: `↑ tăng` / `↓ giảm` / `→ ổn định`, ngưỡng ±5% (`FORECAST_RULES.trendThreshold`). Luôn có chữ, không chỉ mũi tên hay màu.
- **Cờ**: `Sắp hết` (tồn + đang về < nhu cầu trong thời gian giao, kèm số nên nhập), `Chậm bán` (còn ≥ 3 món mà bán dưới 0,2/ngày trong 5 ngày), `Sắp hết hạn` (số món và ngày hết hạn sớm nhất).
- **Ghi chú**: khuyến nghị bị chặn bởi tồn nhà cung cấp (kèm số thiếu), ngừng cung, chỗ trống kho mát hoặc ngân sách.
- **Lý do**: tối đa 2 bộ chỉnh dữ liệu ảnh hưởng mạnh nhất tới nhu cầu ngày mai, dạng `nhãn (+x%)`, lấy từ cùng bảng phân rã với nhu cầu thật.

## Thông báo

Sang ngày mới, `onStockWarning` hiện một toast gộp (số món sắp hết + chậm bán, tối đa 3 tên) cho các món đang bán hoặc có tồn; `onExpiringSoon` gộp các món sắp hết hạn. Chi tiết xem ở bảng này. Cảnh báo nghiêm trọng (mất điện) đi qua `onMarketNotice` với mức `severe`.

## Cấu hình

`packages/game-data/src/forecast.ts` (`FORECAST_RULES`: số ngày phủ, ngưỡng chậm bán, hệ số nhu cầu thử, ngưỡng xu hướng, số dòng hiển thị).
