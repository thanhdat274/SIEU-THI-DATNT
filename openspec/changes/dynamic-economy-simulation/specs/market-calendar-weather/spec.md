# Spec Delta

## Purpose

Cung cấp lịch (mùa, thứ, giờ), thời tiết và sự kiện thị trường xác định, cấu hình bằng dữ liệu, làm nguồn chung cho nhu cầu, giá, nguồn cung và hạn dùng.

## ADDED Requirements

### Requirement: Data-defined seasons
Hệ thống SHALL định nghĩa mỗi mùa/sự kiện theo mùa bằng dữ liệu gồm khoảng ngày, sản phẩm theo mùa, bộ chỉnh nhu cầu theo nhóm/thẻ, bộ chỉnh nhà cung cấp (giá, tồn, tần suất giao), khuyến mãi và hệ số hành vi khách. Hệ thống SHALL NOT làm sản phẩm biến mất khi hết mùa; sản phẩm ngoài mùa SHALL còn bán được với nhu cầu/giá/nguồn cung khác.

#### Scenario: Add a season without code change
- **WHEN** một mùa mới được thêm vào dữ liệu hợp lệ
- **THEN** lịch, nhu cầu, nhà cung cấp và giao diện dùng nó mà không cần đổi logic lõi

#### Scenario: Out-of-season product
- **WHEN** một mùa kết thúc
- **THEN** sản phẩm của mùa đó vẫn đặt mua và bán được, với bộ chỉnh ngoài mùa thay cho bộ chỉnh trong mùa

#### Scenario: Invalid data rejected
- **WHEN** dữ liệu mùa có khoảng ngày chồng lấn không hợp lệ, hệ số ngoài dải cho phép hoặc tham chiếu sản phẩm không tồn tại
- **THEN** kiểm tra dữ liệu báo lỗi nêu đúng mục và trò chơi không khởi động với dữ liệu đó

### Requirement: Deterministic weather with forecast
Thời tiết mỗi ngày SHALL nằm trong tập cấu hình (nắng, nhiều mây, mưa, mưa to, nóng, lạnh, bão, sự kiện đặc biệt), được sinh xác định từ hạt giống của thế giới/save và ngày, chịu ảnh hưởng của mùa và của thời tiết hôm trước. Hệ thống SHALL công bố dự báo cho ít nhất hai ngày tới và dự báo SHALL khớp thời tiết thực tế của ngày đó trừ khi sự kiện làm thay đổi được nêu rõ.

#### Scenario: Same seed same weather
- **WHEN** hai máy/phiên cùng hạt giống và cùng ngày tính thời tiết
- **THEN** cả hai có kết quả giống nhau

#### Scenario: Forecast matches outcome
- **WHEN** ngày dự báo đến
- **THEN** thời tiết của ngày đó bằng dự báo đã công bố, hoặc giao diện hiện lý do thay đổi do sự kiện

#### Scenario: Save and reload
- **WHEN** lưu và tải lại giữa ngày
- **THEN** thời tiết hôm nay và dự báo giữ nguyên

### Requirement: Weekday and time-of-day
Hệ thống SHALL suy ra thứ trong tuần từ số ngày và SHALL cung cấp hệ số theo khung giờ (sáng, trưa, chiều, tối) lấy từ dữ liệu; hai yếu tố này SHALL tham gia vào lưu lượng và nhu cầu như bộ chỉnh dữ liệu khác.

#### Scenario: Morning breakfast bias
- **WHEN** đang khung sáng
- **THEN** nhóm hàng sáng (bánh mì, cà phê, đồ ăn nhanh) có hệ số nhu cầu cao hơn khung chiều theo dữ liệu

### Requirement: Market events
Hệ thống SHALL hỗ trợ sự kiện tạm thời (lễ hội địa phương, sự kiện trường học, thể thao, ngày lễ, tụ họp xóm, nắng nóng kéo dài, mưa to, mất điện, khan hàng nhà cung cấp) có thời gian bắt đầu/kết thúc, xác suất hoặc điều kiện kích hoạt, và danh sách bộ chỉnh cho lưu lượng, nhu cầu, nguồn cung, giá và hạn dùng. Sự kiện SHALL được thông báo trước khi có thể (cảnh báo) hoặc ngay khi bắt đầu.

#### Scenario: Heat wave
- **WHEN** nắng nóng kéo dài bắt đầu trong mùa nóng
- **THEN** lưu lượng và nhu cầu đồ uống mát tăng, tồn nhà cung cấp đồ mát giảm, giá sỉ đồ mát tăng dần và người chơi nhận thông báo kèm nguyên nhân

#### Scenario: Power outage
- **WHEN** mất điện trong thời gian sự kiện
- **THEN** tủ mát hoạt động như không có điện và hàng lạnh hỏng nhanh hơn theo quy tắc bảo quản

### Requirement: Multiplayer consistency
Lịch, thời tiết và sự kiện SHALL là dữ liệu chung của thế giới và được server quyết định trong thế giới co-op; mọi thành viên SHALL thấy cùng giá trị.

#### Scenario: Two members
- **WHEN** hai thành viên cùng trong một hẻm
- **THEN** cả hai thấy cùng thời tiết, dự báo và sự kiện đang chạy
