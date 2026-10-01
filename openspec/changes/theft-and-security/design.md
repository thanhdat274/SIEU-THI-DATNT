# Design

## 1. Quy tắc

`SECURITY_RULES` (`game-data/src/security.ts`): mở khóa cấp 5; kẻ trộm lẻ 1,5%; phát hiện bảo vệ 0,9, camera 0,8, nhân viên châm hàng 0,3; phạt gấp 2; camera 250.000 đ; trộm đêm 0,06 (nhân 0,5 khi có camera); tiền két 50% với 30 đến 60% doanh thu hôm trước, ngược lại hàng 8 đến 20% (tối đa 20 món); công an bắt được 0,35 (+0,25 camera), kết quả sau 2 đến 5 ngày; giữ 20 sự cố. Tất cả cấu hình bằng dữ liệu.

## 2. Hàm thuần (`game-core/src/security.ts`)

- `rollShoplifter(day, customerId, level, isRegular)`: RNG theo (ngày, mã khách); khách quen và dưới cấp 5 luôn không.
- `shopliftDetectChance({guard, camera, refill})`: `1 − Π(1 − p)`; `shopliftCaught(day, id, chance)`.
- `planBurglary(day, level, {camera, hasGuard})`: cùng RNG xác định có kẻ lạ tới hay không (bảo vệ không đổi điều đó, chỉ đổi kết cục thành `repelled`), rồi loại `cash` hoặc `goods` kèm tỷ lệ và hạt giống chọn món.
- `openPoliceCase`, `appendIncident`, `sanitizeSecurity`, `emptySecurityState`.

## 3. Trộm lẻ

Khi sinh khách (`GameSimulation.update`), kẻ trộm được đánh dấu `customer.thief` trên khách thật (hàm `maybeSpawnCustomer` trả về đối tượng trong danh sách). Tới quầy, mọi đường thanh toán đều qua `completeCustomerCheckout`, nơi khách có cờ này và có giỏ được chuyển sang `resolveShoplifter` thay vì thu tiền. `CustomerManager.finishShoplifter` thao tác trên khách thật (vì `getCustomers()` trả bản sao): bị bắt thì `abandonBasket` trả hàng về kệ hoặc kho, không thì giỏ bị bỏ; khách chuyển sang `leaving` và tự đi ra. Kẻ trộm không tính là khách đã phục vụ, không có doanh thu, XP, đánh giá hay lời đánh giá.

Bị bắt: tiền phạt = giá bán giỏ × 2 (làm tròn 1.000), ghi `recovery`. Thoát: ghi `theft` bằng giá vốn các lô trong giỏ (thiếu giá vốn thì dùng giá nhập), không đổi tiền.

## 4. Trộm đột nhập

Trong lệnh gọi sang ngày mới, sau `initDailyRecord`: giải quyết hồ sơ công an tới hạn rồi `runNightBurglary(day, doanh thu hôm trước)`. Doanh thu hôm trước được lấy trước khi đóng sổ ngày. Mất tiền: lấy `min(tiền, doanh thu hôm trước) × tỷ lệ` (≥ 1.000, ≤ tiền), ghi `theft_cash`, trừ tiền. Mất hàng: chọn ngẫu nhiên (theo hạt giống) từng món từ các kệ còn hàng bằng `takeLots`, giá trị theo giá vốn lô, ghi `theft`, không đổi tiền. Mất mát vào bản ghi của ngày mới. Báo công an (nếu bật) mở hồ sơ cho giá trị vụ mất.

## 5. Sổ cái và lãi ròng

`theft` (hàng, không đổi tiền như `spoilage`), `theft_cash` (tiền ra như chi phí), `recovery` (tiền vào). Công thức đối chiếu tiền với sổ cái trong `scenarios.test.ts` và `integration.test.ts` được cập nhật: `sale`, `recovery` cộng; `spoilage`, `theft` bằng 0; còn lại trừ. Công thức `netProfit` ở 9 chỗ nay trừ `theftCost` và cộng `theftRecovered`; lắp camera cộng vào `maintenanceCost`.

## 6. Giao diện

`SecurityModal` hiển thị camera (nút lắp), bảo vệ (có trong biên chế, đang trực ca hiện tại không), nút bật/tắt báo công an kèm số hồ sơ đang mở, tổng mất và thu hồi của các sự cố đang giữ, danh sách mới nhất trước. Nút "An ninh" trên HUD chỉ truyền khi cấp ≥ 5. Toast cho mỗi sự cố qua callback `onSecurityNotice`.

## 7. Rủi ro

- Chưa cân bằng: tần suất (6% mỗi đêm, 1,5% mỗi khách), mức mất và giá camera là số thiết kế; chưa biết so với doanh thu thật.
- Nhìn từ người chơi, trộm lẻ chỉ phát hiện qua toast và màn An ninh, không có dấu hiệu trên khách.
- Bảo vệ ngoài ca không phát hiện trộm lẻ nhưng vẫn đuổi trộm đêm; có thể gây khó hiểu.
- Khi tìm hiểu mã phát hiện một lỗi có sẵn: `getCustomers()` trả bản sao, nhưng đoạn xử lý đổi ngày (`abandonBasket`, `routeCustomer`) lặp trên bản sao, nên giỏ của khách còn lại không bị xóa thật; không sửa ở đây.
- Chưa mở được màn An ninh trong trình duyệt (cần cấp 5).
