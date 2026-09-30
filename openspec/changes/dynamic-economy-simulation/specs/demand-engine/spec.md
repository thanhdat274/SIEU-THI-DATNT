# Spec Delta

## Purpose

Tính nhu cầu hiệu dụng của từng sản phẩm và lưu lượng khách từ trạng thái thị trường, để khách chọn món và đến tiệm một cách có lý do.

## ADDED Requirements

### Requirement: Effective demand per product
Hệ thống SHALL tính nhu cầu hiệu dụng mỗi sản phẩm bằng nhu cầu cơ bản nhân các bộ chỉnh mùa, thời tiết, khung giờ, sự kiện và giá, trong đó mỗi bộ chỉnh lấy từ dữ liệu theo nhóm/thẻ/sản phẩm. Kết quả SHALL được kẹp vào dải cấu hình và SHALL kèm bảng phân rã từng bộ chỉnh đã áp dụng.

#### Scenario: Weather boosts matching products
- **WHEN** trời nóng
- **THEN** nhu cầu hiệu dụng của đồ uống mát cao hơn lúc trời mát và nhu cầu đồ nóng thấp hơn, theo dữ liệu

#### Scenario: Breakdown available
- **WHEN** giao diện hỏi lý do nhu cầu của một món
- **THEN** nhận danh sách bộ chỉnh gồm nguồn, hệ số và nhãn đọc được, tích của chúng bằng hệ số tổng trước khi kẹp

#### Scenario: Unknown product tags
- **WHEN** sản phẩm không khớp bộ chỉnh nào
- **THEN** nhu cầu bằng nhu cầu cơ bản, không lỗi

### Requirement: Demand-weighted customer choice
Khi khách chọn món cần mua, hệ thống SHALL chọn trong các kệ đang có hàng theo xác suất tỉ lệ với nhu cầu hiệu dụng của món trên kệ (xác định theo hạt giống để tái lập được). Khi không có dữ liệu thị trường hợp lệ, hệ thống SHALL dùng cách chọn hiện tại.

#### Scenario: Rainy day noodles
- **WHEN** trời mưa và hai kệ có mì gói và nước đá mát với nhu cầu cơ bản bằng nhau
- **THEN** trong nhiều khách mì gói được chọn thường xuyên hơn nước đá mát theo tỉ lệ nhu cầu

#### Scenario: Out of stock not chosen
- **WHEN** món có nhu cầu cao nhưng kệ trống
- **THEN** khách không chọn món đó và lượng khách bỏ về vì thiếu hàng được ghi nhận

#### Scenario: Deterministic replay
- **WHEN** cùng trạng thái và cùng thứ tự khách được chạy lại
- **THEN** các lựa chọn giống nhau

### Requirement: Customer traffic
Tốc độ khách vào tiệm SHALL phụ thuộc giờ, thứ, mùa, thời tiết, uy tín, khuyến mãi, sự kiện và mức sẵn hàng (tỉ lệ nhu cầu có thể đáp ứng bởi hàng đang bày), kẹp vào dải cấu hình. Mưa SHALL giảm khách ghé qua nhưng không làm giảm nhu cầu các món tiện lợi ngoài dữ liệu quy định.

#### Scenario: Rain lowers visits
- **WHEN** trời mưa to
- **THEN** khoảng cách trung bình giữa hai khách dài hơn ngày nắng cùng giờ theo dữ liệu

#### Scenario: Empty shelves
- **WHEN** hầu hết kệ trống
- **THEN** lưu lượng giảm theo hệ số sẵn hàng và không sinh khách khi không có món nào để bán

### Requirement: Interval-based recalculation
Bảng nhu cầu SHALL được tính lại theo khoảng thời gian game (mặc định mỗi giờ game) và khi thời tiết, sự kiện, giá hoặc tồn kho thay đổi đáng kể, không mỗi khung hình. Khách mới SHALL dùng bảng đã lưu đệm.

#### Scenario: No per-frame recompute
- **WHEN** chạy mô phỏng nhiều khung hình trong cùng một giờ game không có thay đổi
- **THEN** bảng nhu cầu không bị tính lại

#### Scenario: Event triggers recompute
- **WHEN** một sự kiện bắt đầu giữa giờ
- **THEN** bảng nhu cầu được tính lại trước khi khách kế tiếp chọn món
