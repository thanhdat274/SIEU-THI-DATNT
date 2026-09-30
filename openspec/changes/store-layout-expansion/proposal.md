# Proposal: Sắp xếp nội thất và mở rộng mặt bằng

## Vì sao

Người chơi hiện có thể gán sản phẩm vào fixture bằng planogram, nhưng vị trí và kích thước cửa hàng còn cố định trong dữ liệu khởi tạo. Game thiếu công cụ để tự thiết kế lối đi, di chuyển/kê thêm nội thất và mua thêm diện tích. Đây là vòng gameplay xây dựng cửa hàng, bổ trợ trực tiếp cho quản lý hàng hóa đã có.

Repo tham khảo `C:/Users/Admin/Desktop/GAME/tap-hoa-dau-hem` có lưới 10×10, màn BuildScene, mua đất có điều kiện level/tiền, đặt/xoay/di chuyển/cất/bán fixture, kiểm tra chồng lấn/cửa/lối khách đi tới quầy và kệ. Đây là bằng chứng tham khảo source/test, không phải UX đã được nghiệm thu trên thiết bị. Dự án đích dùng React/PixiJS, map 26×22 với bounds cửa hàng x=6..13, y=3..10, `StoreFixture` trong `SaveGameData.storeLayout`, planogram theo fixture ID và world/server command; cần thiết kế riêng, không bê nguyên lưới, giá hay schema nguồn.

## Mục tiêu

- Cho phép vào chế độ Sắp xếp khi cửa hàng đóng, xem mặt bằng theo ô và chỉnh layout trước khi mở cửa.
- Cho phép chọn fixture, xem footprint/preview, di chuyển và xoay 90 độ; hỗ trợ hủy thay đổi.
- Bảo toàn identity fixture và hàng đang gắn với fixture khi di chuyển; planogram vẫn gắn fixture ID.
- Cho phép mở các mảnh đất được cấu hình bằng điều kiện level/giá; save/load giữ phần đất đã mua.
- Ngăn bố cục không hợp lệ: ngoài mặt bằng sở hữu, chồng lấn, che cửa/đường bắt buộc, hoặc khiến fixture tương tác không thể tiếp cận.
- Hỗ trợ cùng một quy tắc trên local save và multiplayer command authoritative, không để client tự ghi đè layout online.

## Ngoài phạm vi

- Tầng/lầu, chi nhánh, nền/tường tùy biến, vật trang trí, copy/paste bố cục.
- Hiệu ứng kinh tế như kệ gần cửa bán chạy hơn, mật độ khách, cross-selling hoặc mô phỏng tắc nghẽn.
- Tự tạo map editor/content editor hoặc thay renderer/engine.
- Định giá cuối cùng cho đất/nội thất; balance cần quyết định từ dữ liệu game sau khi có proposal gameplay.

## Cách tiếp cận

Triển khai theo lát cắt: trước tiên mô hình vùng sở hữu và validate/di chuyển fixture trên mặt bằng ban đầu; tiếp đến UI sắp xếp và lưu local; sau khi luồng cơ bản ổn định mới thêm mua đất, migrate save và tích hợp multiplayer authoritative. Kế hoạch ghi rõ điểm cần kiểm chứng riêng, không coi unit test là nghiệm thu UI hoặc co-op.

## Tiêu chí hoàn tất

- Layout hợp lệ được lưu/tải và giữ nguyên ID, sản phẩm gán, tồn kho/lô, planogram.
- Thao tác vị trí/xoay có preview và phản hồi lỗi; hủy không làm thay đổi save.
- Mua đất trừ tiền và cấp quyền sở hữu đúng một lần; save cũ được nâng cấp an toàn với mặt bằng ban đầu tương đương hiện trạng.
- Khách và nhân viên có đường tới mọi fixture bắt buộc; trường hợp thất bại nêu rõ fixture/lý do.
- Local và multiplayer áp dụng cùng invariant; thao tác online đi qua commit có revision/idempotency.
- Typecheck, unit tests, build và browser QA được ghi riêng bằng kết quả thực tế trước khi đánh dấu nghiệm thu.
