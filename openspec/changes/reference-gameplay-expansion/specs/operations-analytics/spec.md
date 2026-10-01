# Spec Delta

## Purpose

Giúp người chơi hiểu biến động giá, doanh số và luồng di chuyển trong cửa tiệm bằng dữ liệu lịch sử và tổng hợp có giới hạn.

## ADDED Requirements

### Requirement: Biểu đồ dùng dữ liệu lịch sử thật
Biểu đồ SHALL dùng bản ghi doanh số và lịch sử giá thực được lưu, SHALL thể hiện khoảng thời gian và khoảng trống dữ liệu, không suy ra lịch sử từ giá hiện tại.

#### Scenario: Không có lịch sử giá
- **WHEN** mặt hàng chưa có điểm giá được lưu trong khoảng xem
- **THEN** UI biểu thị thiếu dữ liệu thay vì vẽ giá hiện tại thành dữ liệu quá khứ

### Requirement: Heatmap chỉ lưu tổng hợp
Heatmap SHALL tổng hợp lượt khách theo ô/khung thời gian và SHALL NOT lưu luồng tọa độ cá nhân từng frame.

#### Scenario: Tắt heatmap
- **WHEN** người chơi tắt lớp phủ
- **THEN** bản đồ cửa tiệm hiển thị bình thường và dữ liệu tổng hợp không làm thay đổi simulation

### Requirement: Phân tích không làm đổi kinh tế
Xem biểu đồ hoặc heatmap SHALL không làm thay đổi tiền, hàng, khách hoặc kết quả mô phỏng.

#### Scenario: Mở và đóng phân tích
- **WHEN** người chơi mở/đóng công cụ phân tích
- **THEN** snapshot gameplay và sổ cái không đổi
