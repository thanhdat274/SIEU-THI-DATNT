# Proposal: Chọn lọc mở rộng vòng chơi từ game tham khảo

## Vì sao

Đối chiếu `C:\Users\Admin\Desktop\GAME\tap-hoa-dau-hem` cho thấy một số vòng chơi chưa có trong dự án: chế biến theo công thức, prestige sau cấp tối đa, tín dụng khách quen, nhận biết tiền giả và phục vụ ăn tại bàn. Dự án cũng còn các tiện ích vận hành đã ghi trong `THONG-KE.md`: biểu đồ giá/doanh số, âm thanh môi trường, bản đồ nhiệt, hướng dẫn theo checklist và replay ngày chơi. Engine thuế thật là hạng mục riêng, cần chờ thẩm định quy định trước khi tác động tiền người chơi.

Change đã chuyển từ lập kế hoạch sang triển khai theo wave, ưu tiên code chức năng và gom test/verification về cuối theo yêu cầu chủ dự án. Wave A đang được triển khai trên nền khách quen, checkout, ledger và save hiện có; các tham số kinh tế còn provisional. Chỉ chuyển các ý tưởng phù hợp với mô hình một tiệm trên một khu đất.

## Phạm vi kế hoạch

1. **Phục vụ ăn tại bàn:** biến một phần nhu cầu quầy hiện tại thành khách gọi món/ngồi ăn, bàn có trạng thái trống/đang dùng/bẩn, người chơi hoặc nhân viên phục vụ và dọn bàn; giữ chế độ bán suất tổng hợp cho quầy hiện có đến khi có thiết kế migration rõ.
2. **Tín dụng khách quen:** cho khách đủ điều kiện mua chịu với hạn mức và hạn trả, ghi công nợ riêng; nhắc nợ, trả đúng/trễ/không trả và tác động phù hợp lên uy tín. Không cho mọi khách thường xuyên mua chịu mặc định.
3. **Phát hiện tiền giả:** giao dịch tiền mặt có thể nhận tờ giả; người chơi/thu ngân có xác suất phát hiện theo kỹ năng; xử lý, ledger, toast và đánh giá khách phải nhất quán, xác định theo seed.
4. **Sản xuất theo công thức:** dữ liệu công thức, nguyên liệu FEFO có hạn, trạm chế biến, tiến độ/mẻ/đầu ra, công suất và nhân viên bếp; đầu ra phải đi vào tồn kho/shelf/quầy và ledger. Tách với `processStalls` hiện là mô phỏng suất bán tổng hợp.
5. **Prestige:** sau level cap hiện hành, chuyển XP dư thành sao prestige qua từng mốc; có giới hạn và lợi ích nhỏ có cap, không làm thay đổi save cũ hoặc mở lại cấp thường.
6. **Quan sát vận hành:** biểu đồ giá/doanh số từ lịch sử ngày sẵn có; bản đồ nhiệt tích lũy theo ô không lưu từng tọa độ khách; hướng dẫn checklist theo mở khóa, có thể bỏ qua.
7. **Âm thanh môi trường:** âm mưa/giờ/chuông với mute, tôn trọng autoplay và tùy chọn giảm chuyển động; ưu tiên Web Audio hoặc asset nhẹ.
8. **Replay ngày:** ghi command/event xác định cần thiết để dựng lại ngày, so snapshot và hỗ trợ debug; không lưu stream từng frame hay phát lại animation.
9. **Thuế:** tiếp tục registry và nghiên cứu; chỉ lập engine tính/nộp sau TAX-0 (xác minh nguồn, phạm vi chủ thể/loại doanh thu/ngày hiệu lực và duyệt pháp lý). Trước điều kiện này, tuyệt đối không tự trừ tiền thuế.
10. **Replay ngày:** lưu và tái dựng chuỗi lệnh/ngày để debug, không ghi hình từng frame.

## Capabilities

### New Capabilities

- `dine-in-service`
- `customer-credit`
- `counterfeit-detection`
- `recipe-production`
- `prestige-progression`
- `operations-analytics`
- `tutorial-checklist`
- `ambient-audio`
- `day-replay`
- `tax-engine`

## Ngoài phạm vi hiện tại — để plan sau

- **Chuỗi nhiều chi nhánh, loại hình cửa hàng và luân chuyển hàng nội bộ.** Game tham khảo có `branches`, loại tiệm tạp hóa/xôi và internal supply. Dự án này trước hết mở rộng gameplay trong **cùng một khu đất/tiệm**; chỉ lập change triển khai chuỗi sau khi có quyết định sản phẩm riêng về nhiều cơ sở, ranh giới khu đất, chuyển đổi loại tiệm, save/co-op và mô hình chuỗi.
- Không port nguyên dữ liệu, mã nguồn, giá/balance, nghệ thuật hoặc luật thuế của game tham khảo.
- Không chạy hay sửa game tham khảo; nó chỉ là nguồn đọc để đối chiếu ý tưởng.

## Thứ tự đề xuất

- **Wave A — vòng dịch vụ trong cùng tiệm:** ăn tại bàn/dọn bàn; tín dụng khách quen; tiền giả. Tái dùng customer, staff, reviews, ledger và save; mỗi feature có test economy/idempotency.
- **Wave B — sản xuất:** công thức và trạm bếp, sau đó mới nối đầu ra với quầy ăn tại bàn. Chốt catalog món/định lượng/nguyên liệu, spoilage và UX trước implementation.
- **Wave C — progression/meta:** prestige sau level cap, lợi ích giới hạn và migration; balance headless rồi playtest.
- **Wave D — công cụ người chơi:** biểu đồ, bản đồ nhiệt, checklist tutorial và âm thanh, mỗi mục là change/UI riêng.
- **Wave E — tính thuế thật:** chỉ sau TAX-0 được chủ dự án chấp thuận và kiểm chứng nguồn/phạm vi. Không chặn các wave khác.
- **Plan sau:** chuỗi nhiều tiệm trên thiết kế mở rộng khu đất; không nằm trong các wave trên.

## Tiêu chí hoàn tất change kế hoạch

- Từng hạng mục có phạm vi, phụ thuộc, rủi ro save/co-op/economy và tiêu chí test trong `design.md`/`tasks.md`.
- Danh sách đối chiếu phân biệt rõ đã có, có phiên bản đơn giản và chưa có.
- `TASKS.md`, `ROADMAP.md`, `THONG-KE.md` và `tổng hợp.md` cùng nêu chuỗi chi nhánh là plan sau gắn với mở rộng cùng khu đất.
- Chưa có gameplay code hoặc claim kiểm thử phát sinh từ proposal này.
