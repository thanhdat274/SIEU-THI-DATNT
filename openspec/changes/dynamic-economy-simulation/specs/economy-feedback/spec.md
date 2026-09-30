# Spec Delta

## Purpose

Giúp người chơi hiểu vì sao nhu cầu và giá thay đổi, bằng thông tin rõ nhưng không gây phiền.

## ADDED Requirements

### Requirement: Always-visible context
Giao diện SHALL hiện gọn thời tiết hôm nay, mùa/sự kiện đang chạy và dự báo ngày mai, và SHALL cho mở chi tiết (lịch mùa, dự báo nhiều ngày) mà không chặn thao tác chơi.

#### Scenario: Glanceable
- **WHEN** đang chơi bình thường
- **THEN** thời tiết và sự kiện hiển thị trên thanh trạng thái không che bản đồ

#### Scenario: Calendar detail
- **WHEN** người chơi mở lịch
- **THEN** thấy mùa hiện tại, sự kiện sắp tới và dự báo

### Requirement: Explained changes
Mọi thay đổi đáng kể về nhu cầu, giá tham chiếu, giá sỉ, tồn nhà cung cấp hoặc lưu lượng SHALL có lý do đọc được (mùa, thời tiết, sự kiện, khan hiếm, giá người chơi) truy được đến bộ chỉnh dữ liệu.

#### Scenario: Demand indicator with reason
- **WHEN** người chơi xem chỉ báo nhu cầu của một món
- **THEN** thấy mũi tên tăng/giảm/ổn định và danh sách nguyên nhân chính kèm hệ số

#### Scenario: Supplier price change
- **WHEN** giá sỉ đổi giữa hai ngày
- **THEN** danh sách nhập hiện mức đổi và nguyên nhân chính

### Requirement: Non-intrusive notifications
Thông báo sự kiện, cảnh báo kho và cảnh báo hạn dùng SHALL dùng kênh thông báo nhẹ hiện có, gộp theo loại, giới hạn tần suất và không chặn thao tác; cảnh báo nghiêm trọng (ví dụ mất điện khi có hàng lạnh) SHALL nổi bật hơn cảnh báo thường.

#### Scenario: Batched
- **WHEN** nhiều món cùng sắp hết hàng
- **THEN** hiện một thông báo gộp với số lượng, chi tiết trong bảng lập kế hoạch

#### Scenario: Accessible
- **WHEN** bật giảm chuyển động hoặc dùng màn nhỏ
- **THEN** thông tin vẫn đọc được bằng chữ không chỉ bằng màu hay hiệu ứng

### Requirement: Popular product trends
Giao diện SHALL hiện các món đang được ưa chuộng hiện tại (theo nhu cầu hiệu dụng và doanh số gần đây) để người chơi quyết định bày hàng.

#### Scenario: Trending list
- **WHEN** trời nóng
- **THEN** danh sách xu hướng ưu tiên đồ uống mát có tồn hoặc có thể nhập
