# Màn hình đăng nhập và menu chính

Menu khởi đầu trình bày như màn hình title của game cozy shop-management: tranh tiệm tạp hóa lớn ở hero với nền hoàng hôn, mái hiên, cửa sổ và cửa tiệm; tên game/giới thiệu ở trái, tiện ích âm thanh/tài khoản phía trên. Bên dưới là thẻ tiến trình với nút bắt đầu/tiếp tục và lưới điều hướng. Trên màn hình nhỏ hero thu gọn và khu điều hướng xếp lại. Chơi mới chỉ hiện khi có save; luồng xác nhận reset vẫn giữ nguyên. Footer phiên bản xuất hiện một lần.

Tiến trình được lưu tự động ở thiết bị; không còn nút tải lại hay nút thông báo lưu nhanh. Minh họa mới dựng bằng CSS riêng, không dùng asset lấy từ game khác.

## Sổ tay hướng dẫn

Nút **Cách chơi** mở một bảng hướng dẫn có tiêu đề, phần đọc cuộn được và nút quay lại menu. Nội dung hiện có gồm:

- Vòng chơi: đặt hàng, nhận hàng vào kho, bày lên kệ, mở tiệm, phục vụ tại quầy và chốt ngày.
- Điều khiển: WASD/phím mũi tên, E/Space, I, Escape; joystick và nút tương tác trên điện thoại ngang.
- Quản lý hàng khô/lạnh, sức chứa kệ, hàng chờ và điều kiện thanh toán có khách tại quầy.
- Thời gian, tự lưu trên thiết bị, Chơi mới, và yêu cầu tài khoản cho chế độ Hẻm Chơi Cùng.

Nội dung mô tả chức năng đã có; không khẳng định những cơ chế chưa triển khai. Hướng dẫn dùng layout responsive một cột trên màn hình nhỏ và hai cột cho phần điều khiển/quản lý trên màn hình rộng.

## Tham khảo thiết kế

- [Winkeltje: The Little Shop](https://store.steampowered.com/app/949290/Winkeltje_The_Little_Shop/) và [ảnh chụp cộng đồng](https://steamcommunity.com/app/949290/screenshots/): tham khảo bối cảnh cửa tiệm và chất liệu gỗ/đồ hàng.
- [Tiny Bookshop](https://store.steampowered.com/app/2133760/Tiny_Bookshop/) và [thư viện ảnh](https://steamdb.info/app/2133760/screenshots/): tham khảo mood cozy, minh họa cửa tiệm làm trọng tâm và phối cảnh màu dịu.
- [Stardew Valley Options](https://wiki.stardewvalley.net/Options): tham khảo tách mục tùy chọn khỏi hành động bắt đầu/chơi tiếp.
- [Microsoft Xbox Accessibility Guideline 112](https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/112): giữ tiêu đề/đường điều hướng nhất quán giữa các màn.

Đây là tham khảo cấu trúc và phân cấp thông tin, không sao chép art hoặc asset.

## Xác minh

Trong phiên cập nhật ngày 30/09/2026, chưa chạy được typecheck/build hoặc browser QA: Node không có quyền `lstat C:\Users\Admin` trong sandbox (`EPERM`). Cần kiểm tra menu desktop/mobile, footer chỉ xuất hiện một lần, điều kiện ẩn hiện Chơi mới, và cuộn bảng hướng dẫn sau khi chạy được ứng dụng.
