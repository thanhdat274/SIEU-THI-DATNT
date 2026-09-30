# Proposal

## Why

Hẻm đã có mùa (`game-data/seasons.ts`), quầy ăn uống, kho theo lô FEFO, nhà cung cấp, gợi ý nhập theo vận tốc bán và hạn dùng. Nhưng các hệ thống này **chưa nói chuyện với nhau**: mùa chỉ nhân tốc độ sinh khách và nghiêng chọn kệ theo nhóm hàng; không có thời tiết, giờ trong ngày hay thứ trong tuần; khách chọn kệ theo vòng xoay chứ không theo nhu cầu từng món; giá bán và giá nhập cố định; nhà cung cấp luôn đủ hàng với chiết khấu cố định; người chơi không biết vì sao hôm nay đông hay vắng. Kết quả là quyết định nhập/giữ/đặt giá chưa có hậu quả thật. Mục tiêu của change này là dựng vòng lặp **Mùa → Thời tiết → Lưu lượng khách → Nhu cầu món → Nguồn cung → Giá → Tồn kho → Doanh thu → Lợi nhuận** bằng dữ liệu cấu hình, có giải thích được.

## What Changes

Phát hành tăng dần theo 8 đợt (xem `tasks.md`), mỗi đợt tự chơi được; tiệm không dùng tính năng mới phải chạy như hiện tại (không có bảng thị trường → hành vi cũ).

- **Lịch và thời tiết**: mở rộng `SeasonEvent` thành định nghĩa mùa có dữ liệu (sản phẩm theo mùa, hệ số nhu cầu theo nhóm, nhà cung cấp/giá/tần suất nhập, khuyến mãi, hành vi khách); thêm thời tiết xác định theo hạt giống thế giới (nắng, nhiều mây, mưa, mưa to, nóng, lạnh, bão, sự kiện đặc biệt) với dự báo 2 ngày; thêm thứ trong tuần và đường cong theo giờ.
- **Sự kiện thị trường**: sự kiện tạm thời (lễ hội, trường học, thể thao, nắng nóng kéo dài, mưa to, mất điện, khan hàng nhà cung cấp) cùng một cơ chế bộ chỉnh dữ liệu.
- **Động cơ nhu cầu**: nhu cầu hiệu dụng mỗi món = cơ bản × mùa × thời tiết × giờ × sự kiện × giá, có phân rã để giải thích; khách chọn món theo trọng số nhu cầu thay cho vòng xoay; lưu lượng khách suy ra từ cùng nguồn.
- **Phản ứng giá**: độ nhạy giá từng nhóm quyết định khách chấp nhận giá bán; giá tham chiếu thị trường trôi dần (không nhảy tức thì) theo khan hiếm, tồn kho và sự kiện. Việc người chơi tự đặt giá thuộc `shop-pricing` của change `stardew-inspired-management-loop` và được tái dùng, không làm lại.
- **Thị trường nhà cung cấp**: giá sỉ theo ngày, tồn của nhà cung cấp, ngừng cung tạm thời, ưu đãi số lượng lớn, lịch giao khác nhau; đơn hàng kiểm tra theo tồn nhà cung cấp.
- **Hạn dùng mở rộng**: tốc độ hỏng phụ thuộc điều kiện bảo quản (mất điện làm hỏng hàng lạnh nhanh hơn), hàng hết hạn không bán được, bị phát hiện thì mất hài lòng, phải tiêu hủy ghi sổ.
- **Lập kế hoạch tồn kho**: bảng thông tin (không tự quyết định) gồm nhu cầu dự kiến/ngày, bán gần đây, xu hướng mùa, tác động thời tiết, số lượng nên nhập, hàng sắp hết, hàng chậm bán, hàng sắp hết hạn.
- **Phản hồi người chơi**: dự báo thời tiết, lịch mùa, chỉ báo nhu cầu, cảnh báo kho, đổi giá nhà cung cấp, sự kiện, cảnh báo hạn dùng; mỗi thay đổi có lý do đọc được.
- **Dữ liệu trước, code sau**: mùa, thời tiết, sự kiện, bộ chỉnh, nhóm thẻ sản phẩm, nhà cung cấp, quy tắc giá đều là file dữ liệu có kiểm tra schema; thêm mục mới không sửa lõi.
- Không có thay đổi **BREAKING**: mọi trường save mới là tùy chọn, có migration rỗng.

## Capabilities

### New Capabilities
- `market-calendar-weather`: mùa, thứ, giờ, thời tiết xác định + dự báo, sự kiện thị trường, tất cả từ dữ liệu bộ chỉnh.
- `demand-engine`: nhu cầu hiệu dụng theo món, chọn món theo nhu cầu, lưu lượng khách, cập nhật theo khoảng thời gian.
- `price-response`: độ nhạy giá, chấp nhận giá, giá tham chiếu thị trường trôi dần theo khan hiếm/tồn kho/sự kiện.
- `supplier-market`: giá sỉ động, tồn nhà cung cấp, ngừng cung, ưu đãi số lượng lớn, lịch giao.
- `stock-planning`: bảng dự báo và khuyến nghị nhập, cảnh báo, không tự quyết định.
- `product-spoilage`: hỏng theo điều kiện bảo quản, hàng hết hạn, tiêu hủy, hài lòng.
- `economy-feedback`: giải thích nguyên nhân đổi nhu cầu/giá và hiển thị không gây phiền.

### Modified Capabilities
Không có (`openspec/specs` rỗng). Hành vi của `seasons.ts`, `customers.ts`, `suggestions.ts`, `SupplierConfig`, hạn dùng trong `stock.ts` được mở rộng bằng mã nhưng chưa có main spec để sửa.

### Quan hệ với change đang mở
- `stardew-inspired-management-loop`: đã lên kế hoạch `shop-pricing` (F1), `town-events` thời tiết/ngày hội (F5), `day-rhythm` bản tin sáng (F3). Change này **chồng chéo có chủ ý** ở F5 và dùng F1/F3; thứ tự đề xuất: F1 trước, sau đó đợt 1–2 ở đây **thay thế** phần thời tiết của F5 (F5 còn lại là đơn tiệc và ngày hội thưởng). Hai change không được cùng sinh `weather.ts`; xem `design.md` mục "Hòa giải".
- `adapt-reference-shop-operations`, `store-layout-expansion`, `shared-alley-multiplayer`: phụ thuộc, không sửa.

## Impact

- `packages/shared/src/index.ts`: kiểu `MarketState`, `WeatherState`, `ActiveMarketEvent`, mở rộng `SupplierConfig` (trường tùy chọn), `SaveGameData.market?`.
- `packages/game-data/src`: `modifiers.ts`, `weather.ts`, `market-events.ts`, `product-tags.ts`, mở rộng `seasons.ts` và `suppliers.ts`; bổ sung sản phẩm còn thiếu (xem design).
- `packages/game-core/src`: module thuần mới `weather.ts`, `demand.ts`, `market.ts`, `supplier-market.ts`, `forecast.ts`; sửa có giới hạn `customers.ts` (chọn món/lưu lượng), `simulation.ts` (gọi module, cập nhật theo khoảng), `stock.ts` (hỏng theo điều kiện), `suggestions.ts` (đọc nhu cầu dự kiến).
- `apps/web/src/components`: `HUD` (thời tiết/mùa), `SupplierModal` (giá/tồn động), modal mới `MarketModal`/tab dự báo, tái dùng primitive `components/pixel`.
- Không thêm dependency. Server authoritative qua runtime hiện có; không tạo kênh mạng mới.
