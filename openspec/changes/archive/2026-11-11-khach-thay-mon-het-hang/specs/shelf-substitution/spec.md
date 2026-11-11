## ADDED Requirements

### Requirement: Thay món trên cùng kệ
Khi khách muốn món X mà không lấy được X từ kệ (`takeFromShelf` trả null), khách SHALL xem các món **trên cùng kệ đó** còn hàng (count > 0) và **giá bán không cao hơn** giá bán của X. Nếu có ứng viên và qua cổng xác suất, khách SHALL lấy đúng một món thay thế vào giỏ, tính tiền theo giá kệ của món thay thế.

#### Scenario: Hết mì lấy bánh kẹo cùng kệ
- **WHEN** khách muốn mì, kệ đang đứng hết mì nhưng còn bánh kẹo giá ≤ giá mì
- **THEN** với xác suất SUBSTITUTE_CHANCE khách cầm bánh kẹo vào giỏ, tính tiền bằng giá bánh kẹo trên kệ, không ghi `noteMiss('stock')`

#### Scenario: Món thay đắt hơn thì không thay
- **WHEN** mọi món còn hàng trên kệ đều đắt hơn món khách muốn
- **THEN** không có thay thế — khách ghi lỡ `stock` như hiện tại

### Requirement: Cổng xác suất và thứ tự ứng viên tất định
Việc có thay hay không SHALL qua một cổng xác suất cố định (`SUBSTITUTE_CHANCE`, hằng số trong `src/data/`), và ứng viên SHALL chọn tất định theo thứ tự: cùng phân loại với món muốn → món hot/hàng của dịp đang diễn ra → món đầu tiên còn hàng trên kệ. Mọi randomness SHALL dùng simRng, không Math.random.

#### Scenario: Cùng state cho cùng kết quả
- **WHEN** hai lượt mô phỏng với cùng trạng thái và cùng seed simRng
- **THEN** món được chọn (hoặc việc không thay) giống hệt nhau

#### Scenario: Không qua cổng xác suất
- **WHEN** simRng trả giá trị ≥ SUBSTITUTE_CHANCE
- **THEN** khách bỏ món muốn, ghi `noteMiss('stock', want)` như hành vi hiện tại

### Requirement: Không rơi bài học châm kệ
Việc thay món SHALL NOT áp dụng cho quy tắc giỏ lớn (giỏ lớn thiếu ≥2 món vẫn bỏ cả giỏ như hiện tại), và SHALL NOT thay khi kệ hoàn toàn trống (không món nào còn hàng) — trường hợp đó vẫn là lỡ `stock`.

#### Scenario: Giỏ lớn vẫn bỏ giỏ
- **WHEN** khách giỏ lớn thiếu ≥2 món kể cả sau lượt thay-thành-công
- **THEN** khách vẫn bỏ cả giỏ theo quy tắc `bigBasketAbandons` hiện tại

### Requirement: Đồng bộ hai chế độ và phản hồi
Toàn bộ logic SHALL nằm trong agent khách chạy trên máy chủ đò (máy chạy là nguồn chân lý) — không dựa vị trí người chơi, không có thao tác UI mới ⇒ chơi đơn và hẻm online ra kết quả giống nhau. Số lượt thay thành công SHALL đếm vào `stats.substituted` (trường lưu tuỳ chọn, save cũ thiếu trường vẫn nạp bình thường) và Sổ tổng kết SHALL hiện dòng phản hồi "🔄 Đã cứu X lượt nhờ khách nhận món thay".

#### Scenario: Save cũ nạp bình thường
- **WHEN** nạp save trước thay đổi (không có `stats.substituted`)
- **THEN** game chạy bình thường, bộ đếm bắt đầu từ 0

#### Scenario: Hẻm online nhất quán
- **WHEN** cùng chuỗi khách diễn ra ở chơi đơn và trong hẻm online (cùng seed)
- **THEN** số món bán, doanh thu và `stats.substituted` giống nhau
