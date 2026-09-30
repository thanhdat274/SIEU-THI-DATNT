# Tasks

Mỗi nhóm tự chơi được và tự mang test + tài liệu (`tổng hợp.md`, `TASKS.md`, `ROADMAP.md`) của nó. Xác minh chung mỗi nhóm: `yarn typecheck`, `yarn test`, `yarn build` PASS và save cũ tải được. Nhóm 4 phụ thuộc `shop-pricing` (F1) của `stardew-inspired-management-loop`.

## 1. Nền dữ liệu và lịch (market-calendar-weather, phần 1)

- [x] 1.1 Thêm kiểu `ModifierRule`, `MarketState`, `WeatherState`, `ActiveMarketEvent` và `SaveGameData.market?` trong `packages/shared`; kiểm: typecheck PASS, save không có `market` qua `validateSaveGameData`.
- [x] 1.2 Tạo `game-data/modifiers.ts` (bộ chỉnh + dải kẹp theo kênh) và `product-tags.ts` (tag theo category/productId); thêm hàm kiểm tra dữ liệu (khoảng ngày chồng lấn, hệ số ngoài dải, tham chiếu sản phẩm không có); kiểm: test dữ liệu hợp lệ PASS, dữ liệu sai báo đúng mục.
- [x] 1.3 Mở rộng `seasons.ts` thành định nghĩa mùa đầy đủ (bộ chỉnh nhu cầu theo tag, khuyến mãi, hành vi khách, trường nhà cung cấp) giữ `getSeasonForDay` cho quầy/HUD; thêm thứ trong tuần và hệ số khung giờ; kiểm: test quầy/mùa cũ vẫn PASS, thêm mùa mới bằng dữ liệu không đổi code.
- [x] 1.4 Tạo `game-core/weather.ts` (Markov theo mùa, hạt giống `worldId`/`save.id`, dự báo 2 ngày) và lưu `market.weather`; kiểm: test cùng seed cùng kết quả, dự báo khớp thực tế, lưu/tải giữ nguyên, hai lần chạy khác seed khác nhau.
- [ ] 1.5 Hiển thị thời tiết/mùa trên `HUD` và lịch mùa gọn; kiểm: smoke browser thấy thời tiết đổi sau khi sang ngày, không che bản đồ. Cập nhật `tổng hợp.md`/`TASKS.md`, đánh dấu F5-thời tiết của `stardew-inspired-management-loop` là thực hiện ở đây. (Mở dở: HUD có huy hiệu thời tiết + nút "Thị trường" (lịch mùa, dự báo 2 ngày, lý do lưu lượng) đã xem trong browser 30/09/2026; chưa quan sát thời tiết đổi sau khi sang ngày trong browser vì pane ẩn làm đồng hồ game đứng — test đơn vị đã PASS việc sang ngày dùng đúng dự báo. Chưa cập nhật F5 của change cũ ngoài ghi chú.)

## 2. Động cơ nhu cầu và lưu lượng (demand-engine)

- [x] 2.1 Tạo `game-core/demand.ts`: `buildDemandTable` (nhu cầu hiệu dụng + phân rã, lưu lượng) từ trạng thái thị trường, giờ, thứ, uy tín, sẵn hàng; kiểm: test công thức (nóng tăng đồ mát, mưa giảm lưu lượng, phân rã nhân ra đúng hệ số tổng, món không khớp bộ chỉnh = cơ bản).
- [x] 2.2 Tính lại theo khoảng (mỗi giờ game + khi đổi thời tiết/sự kiện/giá/tồn vượt ngưỡng); kiểm: test đếm số lần gọi không tăng theo số khung hình, sự kiện giữa giờ kích hoạt tính lại.
- [x] 2.3 Sửa `CustomerManager.maybeSpawnCustomer` chọn kệ theo trọng số nhu cầu (RNG xác định) và nhận hệ số lưu lượng; không có bảng → đường cũ; kiểm: test mưa → mì nhiều hơn nước đá, hàng hết không được chọn, cùng trạng thái chạy lại cho cùng chuỗi chọn, test cũ (khách tới quầy, mùa) PASS.
- [x] 2.4 Ghi nhận khách bỏ về vì thiếu hàng vào báo cáo ngày; kiểm: test số liệu và `DailyRecord` cũ không đổi khi không có dữ liệu mới.
- [x] 2.5 Thêm bộ sản phẩm tối thiểu còn thiếu cho kịch bản (kem, ô/áo mưa, đồ uống nóng, thịt/rau tươi) với tag, hạn, icon pixel, cập nhật `catalog.test.ts` và `catalog-manifest.ts`; kiểm: catalog test PASS với số món mới, icon hiện trong `WarehouseModal`. Nếu hoãn, ghi rõ trong `TASKS.md` kịch bản chạy với món hiện có.
- [ ] 2.6 Tài liệu + smoke browser: khách chọn món khác nhau giữa ngày nóng và mưa; ghi kết quả thật vào `tổng hợp.md`. (Mở dở: test mô phỏng chứng minh mì gói/nước mát đổi tỉ lệ chọn giữa mưa và nóng; chưa có smoke browser khách thật vì kệ trống trong save thử.)

## 3. Sự kiện thị trường (market-calendar-weather, phần 2)

- [x] 3.1 Tạo `game-data/market-events.ts` và `game-core/market.ts` (kích hoạt xác định, thời hạn, cảnh báo trước, lưu `market.events`); kiểm: test kích hoạt theo seed, không chồng vô hạn (`minGapDays`), lưu/tải giữ sự kiện đang chạy.
- [x] 3.2 Cài bộ sự kiện đầu: nắng nóng kéo dài, mưa to, lễ hội địa phương, sự kiện trường học, thể thao, mất điện, khan hàng nhà cung cấp, ngày lễ, tụ họp xóm — chỉ bằng dữ liệu; kiểm: test kịch bản nắng nóng làm đồ mát tăng nhu cầu/lưu lượng, không có nhánh code riêng theo tên sự kiện.
- [ ] 3.3 Thông báo sự kiện gộp/giới hạn tần suất trên hàng đợi toast; kiểm: test không quá một thông báo/loại/giờ game, smoke browser. (Mở dở: gộp/giới hạn tần suất đã có test PASS và callback nối vào toast; chưa quan sát toast sự kiện thật trong browser vì game đứng khi pane ẩn và phải chờ qua ngày.)
- [x] 3.4 Co-op: tính thị trường ở `WorldRuntime` và đưa qua snapshot; kiểm: test hai thành viên thấy cùng thời tiết/sự kiện, runtime server là nguồn duy nhất.

## 4. Phản ứng giá (price-response) — sau F1 `shop-pricing`

- [x] 4.1 Thêm độ nhạy giá theo tag/nhóm vào dữ liệu và `keepChance` dùng chung; kiểm: test giá cao → tỉ lệ lấy giảm theo độ nhạy, giá thấp không vượt trần tăng nhu cầu.
- [x] 4.2 Tạo giá tham chiếu bán lẻ trôi dần (`maxStep` mỗi ngày, target từ chi phí/khan hiếm/tồn/sự kiện) và lưu trong `market`; kiểm: test không nhảy quá bước, về nền dần khi hết sự kiện.
- [ ] 4.3 Nối giá người chơi (F1) vào xác suất lấy hàng và nhu cầu; hiển thị lý do khan hiếm; kiểm: test ba chiến lược giá (thấp/thường/cao) cho số lượng, doanh thu, lãi gộp khác nhau hợp lý, giỏ giữ giá lúc lấy. (Mở dở theo quyết định dùng giá gợi ý cố định: động cơ đã nhận giá bán qua `sellingPrice()`, khách từ chối giá cao ghi `priceWalkouts`, giỏ giữ giá lúc lấy hàng, test ba chiến lược giá 0.7/1/1.3 ở mức động cơ PASS; còn thiếu nhập giá của người chơi (`shop-pricing` F1) và giao diện đặt giá.)
- [ ] 4.4 Tài liệu + smoke browser với ba mức giá; cập nhật `tổng hợp.md`. (Mở dở: chưa có giao diện ba mức giá để smoke; tài liệu đã cập nhật phần đã làm.)

## 5. Thị trường nhà cung cấp (supplier-market)

- [x] 5.1 Mở rộng `SupplierConfig` (trường tùy chọn) và tạo `game-core/supplier-market.ts`: giá sỉ theo ngày (bước giới hạn), tồn theo ngày, ngừng cung, bậc ưu đãi số lượng lớn, lịch giao, lưu `market.suppliers`; kiểm: test giá đổi dần, tồn giảm khi đặt, giỏ vượt tồn/ngừng cung bị từ chối nguyên tử, mối không có dữ liệu = vô hạn như cũ.
- [ ] 5.2 Nối vào đặt hàng (client và `WorldRuntime`) để server kiểm tra tồn/giá; chốt giá vào đơn; kiểm: test lệnh co-op bị từ chối đúng lý do, đơn đã đặt giữ giá, save cũ đặt hàng như trước. (Mở dở: `validateSupplierCart`/`orderSupplierCart` kiểm tra tồn/ngừng cung/giá chốt nguyên tử và lệnh `order_supplier` được `WorldRuntime` kiểm bằng test; nhưng đường commit REST thật của client (`commitBusinessChange`) vẫn tin save do client gửi như mọi lệnh không phải layout, server chưa tự chạy lại đơn hàng.)
- [x] 5.3 `SupplierModal`: hiện giá hôm nay, chênh so với hôm qua + lý do, tồn còn, ngày giao dự kiến, ưu đãi bậc; kiểm: smoke browser đổi ngày thấy giá/tồn thay đổi có lý do.
- [x] 5.4 Kịch bản nhiều hệ: nắng nóng → tồn nhà cung cấp đồ mát↓ → giá sỉ↑ dần → người chơi chọn nhập/chờ/đổi mối; kiểm: test tích hợp nhiều ngày ghi Δtiền = tổng sổ cái, không số âm.

## 6. Hạn dùng theo điều kiện bảo quản (product-spoilage)

- [ ] 6.1 Thêm tiêu hao hạn theo điều kiện (tủ mát có điện, kho thường, nóng, mất điện) bằng bảng dữ liệu; phần dư lưu tùy chọn trên lô; kiểm: test mất điện làm lô lạnh mất hạn nhanh hơn, tủ mát bình thường đúng 1 ngày/ngày, món không hạn không hỏng, save cũ không đổi.
- [ ] 6.2 Hàng quá hạn còn trên kệ khi khách lấy: hủy món đó, giảm hài lòng/uy tín theo cấu hình; kiểm: test không tạo giao dịch cho món quá hạn.
- [ ] 6.3 Lệnh tiêu hủy thủ công idempotent theo ID, ghi sổ hỏng một lần, cảnh báo sắp hết hạn theo ngưỡng; kiểm: test không tính đôi sau lưu/tải, báo cáo ngày đúng.
- [ ] 6.4 Tài liệu + smoke browser với sự kiện mất điện.

## 7. Lập kế hoạch tồn kho và phản hồi (stock-planning, economy-feedback)

- [ ] 7.1 Tạo `game-core/forecast.ts` (`ProductPlan[]`: tồn, nhu cầu dự kiến, bán gần đây, xu hướng, tác động thời tiết, khuyến nghị, cờ sắp hết/chậm bán/sắp hết hạn) dùng chung bảng nhu cầu với `suggestions.ts`; kiểm: test dự báo mưa đổi nhu cầu dự kiến, khuyến nghị không vượt tồn nhà cung cấp/ngân sách, không tác dụng phụ, hai nơi dùng cùng số.
- [ ] 7.2 Bảng "Thị trường" trong UI (lịch, dự báo, xu hướng, cảnh báo kho) và chỉ báo nhu cầu có lý do từ phân rã; kiểm: smoke browser mở bảng không đổi tiền/kho, giải thích khớp phân rã.
- [ ] 7.3 Thông báo cảnh báo kho/hạn dùng gộp, nổi bật cảnh báo nghiêm trọng, đọc được khi giảm chuyển động; kiểm: test gộp, QA 5 viewport ở mức smoke.
- [ ] 7.4 Tài liệu `docs/ui` mô tả bảng và nhãn lý do.

## 8. Tích hợp, co-op và nghiệm thu

- [ ] 8.1 Test kịch bản xuyên hệ (nóng, mưa, lạnh, lễ, khan hàng): mỗi kịch bản chạy nhiều ngày, kiểm nhu cầu/lưu lượng/giá/tồn/lãi thay đổi theo chuỗi đã mô tả và tiền khớp sổ cái.
- [ ] 8.2 Hiệu năng: đo thời gian `buildDemandTable` và một ngày mô phỏng với nhiều món và khách; kiểm: báo số đo thật, bảng không tính lại mỗi khung hình.
- [ ] 8.3 Co-op hai phiên (gateway test): cùng thời tiết/giá/tồn, đặt hàng server kiểm tra, không lệch sau kết nối lại.
- [ ] 8.4 Playtest cân bằng (dải kẹp, `maxStep`, ngưỡng khan hiếm) và ghi kết quả thật; chỉ tick khi có chạy thực tế. Cập nhật `ROADMAP.md`, `TASKS.md`, `tổng hợp.md`.
