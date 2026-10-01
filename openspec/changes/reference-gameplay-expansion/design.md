# Design: Kế hoạch mở rộng gameplay tham khảo

## Nguyên tắc chung

- Tách từng wave thành OpenSpec change triển khai riêng; plan này không sửa schema/gameplay.
- Mọi tác động tài nguyên cần command ID/replay co-op hoặc ghi rõ chưa hỗ trợ online trước khi mở UI.
- Dùng RNG xác định theo ngày/ID để simulation có thể kiểm thử và replay.
- Tiền/hàng luôn đối chiếu được qua ledger hoặc subledger có định nghĩa rõ; thao tác retry không gây cộng/trừ hai lần.
- Mọi hệ thống mới có sanitize và tương thích save cũ; schema migration chỉ làm trong change cụ thể.
- Không mặc định chép số liệu game mẫu. Số cân bằng ban đầu phải là hằng số có test miền giá trị và được đánh dấu chưa playtest.

## Wave A — Dịch vụ và giao dịch

### Ăn tại bàn

- Giữ `StallState`/`processStalls` làm fallback quầy bán tổng hợp. Bàn ăn là fixture trên mặt bằng hiện tại, không tạo cơ sở riêng.
- MVP đã chọn NPC đi đường thực từ quầy đến bàn sau khi người chơi chọn ăn tại chỗ; dùng hàng ăn đóng gói đã mua từ kệ (bánh mì, mì gói, snack, trứng), không giả lập chế biến. NPC ngồi 60 giây game, bàn thành bẩn sau khi rời đi.
- Bàn 2/4 chỗ mở ở cấp 23 và đặt trong tiệm/khu đất đang chơi; bàn bẩn khóa chỗ. Người chơi dọn tức thì tại tương tác; nhân viên bổ sung hàng có thể nhận job dọn bàn, đi theo route và mất 3 giây game để hoàn tất. Đây là thời lượng/cấu hình ban đầu, chưa playtest.
- Nếu bật bếp, đơn ăn tại bàn tiêu thụ đầu ra đã sản xuất; nếu chưa có bếp, chỉ dùng mặt hàng/quầy được cấu hình, không giả vờ chế biến.
- Test sức chứa, bàn bẩn chặn khách, dọn, đóng ngày, save/load và sổ cái.

### Tín dụng khách quen

- Tín dụng là khoản phải thu riêng có ID/khách/ngày gốc/số dư/ngày đến hạn/trạng thái; không coi khoản nợ là doanh thu tiền mặt lần nữa.
- Chỉ cho vay khách quen/điều kiện rõ ràng; hạn mức theo tiến độ/uy tín có cap. Trả nợ tăng tiền nhưng không ghi doanh thu mới; tổn thất nợ xấu ghi chi phí.
- Chống thu nợ hai lần qua command receipt và test ngày đến hạn, quá hạn, save/load.
- Quyết định triển khai đầu tiên: người chơi chủ động chọn "Bán chịu" ở checkout; khách quen cần ít nhất 40 điểm thân thiết. Hạn mức là `min(100.000, 20.000 + (friendship - 40) × 1.000)` VND, kỳ hạn 3 ngày; khoản quá hạn hơn 7 ngày bị xóa thành nợ xấu. Đây là tham số provisional, chưa playtest.
- Save cũ thiếu `customerCredits`/sequence được xem như danh sách rỗng; mã `credit-N` tăng tuần tự. Co-op server-replay cả checkout mua chịu và `repay_customer_credit`; retry dựa trên receipt command, trả nợ chỉ chấp nhận tài khoản còn dư nợ.

### Tiền giả

- Chọn giai đoạn chỉ áp dụng giao dịch thanh toán tại quầy; tỷ lệ và mệnh giá cấu hình data, seed xác định theo transaction/customer.
- Thu ngân có chỉ số phát hiện; người chơi trực tiếp có rule riêng. Phát hiện/không phát hiện phải thể hiện rõ tác động tiền, ledger, khách và đánh giá.
- Test replay checkout, hoàn/hủy và co-op không nhân đôi kết quả.

## Wave B — Sản xuất công thức

- Recipe khai báo đầu vào/định lượng, output, station, thời gian, cấp mở khóa và hạn dùng đầu ra.
- Lấy nguyên liệu FEFO từ kho; không tiêu thụ một phần nếu transaction không thể hoàn tất, trừ khi design cho phép job dở dang có save.
- Job có ID xác định, tiến độ và trạng thái; quyết định đồng bộ thời gian game, ca nhân viên, mất điện và khi đổi ngày.
- Sản phẩm đầu ra đi vào tồn kho có lot/cost và có thể bán trên fixture phù hợp. COGS lấy từ lô nguyên liệu; ledger đối chiếu.
- Trạm bếp là fixture của cùng cửa tiệm/khu đất. Không mở shop type/chi nhánh trong wave này.

## Wave C — Prestige

- Chỉ kích hoạt ở cap level đang cấu hình; tránh hardcode 35 vì cap có thể đổi.
- XP dư đổi thành sao ở mốc explicit, cap số sao và lợi ích. Bonus revenue/traffic phải bị cap và không làm vòng XP lặp vô hạn.
- Save cũ giữ nguyên level/XP; test sát ngưỡng, nhiều mốc, cap sao, save/load và ledger.

## Wave D — Công cụ quản lý

- Biểu đồ dùng `DailyRecord.productSales` và lịch sử giá nếu thực sự được lưu; nêu khoảng ngày/thiếu dữ liệu, không suy diễn giá lịch sử từ giá hiện tại.
- Heatmap dùng bộ đếm ô theo ngày hoặc cửa sổ ngắn; không ghi vị trí cá nhân/stream frame vào save.
- Checklist tutorial suy ra trạng thái mục tiêu từ save khi có thể, lưu dismiss/completion tối thiểu và cho phép tắt.
- Âm thanh có mute mặc định dễ tìm, không tự phát trước user gesture; test logic cài đặt/tắt và tránh audio khi tab ẩn.

## Wave E — Thuế

- TAX-0 là gate bắt buộc: chủ dự án duyệt nguồn chính thức, ngày hiệu lực, nhóm chủ thể và cách phân loại nguồn doanh thu/khấu trừ.
- Registry `UNVERIFIED` không được engine dùng để thu tiền. Khi đủ điều kiện, engine versioned, có snapshot quy tắc theo kỳ và test biên ngày/ngưỡng/đơn vị tiền.
- Không suy luận tư vấn pháp lý hoặc lấy rule trong game tham khảo làm căn cứ.

## Plan sau — chuỗi chi nhánh

- Đợi quyết định mở rộng trên cùng khu đất: diện tích/phân khu, ranh giới shop, định danh fixture, vận hành đồng thời, kho chung hay riêng, quyền co-op và migration.
- Sau quyết định đó mới lập change riêng cho nhiều cửa hàng/loại tiệm, internal supply, UI bản đồ/đổi khu và replay/server. Không đưa vào các wave hiện tại.

## Rủi ro và phụ thuộc

- Ăn tại bàn có thể cần một phần sản xuất; xác định ranh giới MVP để không chặn Wave A bởi Wave B.
- Nợ, tiền giả, prestige thay đổi kinh tế: cần simulation nhiều ngày và playtest, không chỉ unit test.
- Công thức/lot/đầu ra ảnh hưởng stock, spoilage, save schema, co-op và catalog.
- Biểu đồ phụ thuộc độ dài lịch sử. Nếu `DailyRecord` bị giới hạn, plan cần retention/aggregation trước khi vẽ chart.
- Thuế phụ thuộc thẩm định bên ngoài; chỉ triển khai code sau gate.
