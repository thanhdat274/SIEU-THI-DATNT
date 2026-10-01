# Spec Delta

## Purpose

Một số khách lấy hàng mà không trả tiền; bảo vệ và camera giúp phát hiện.

## ADDED Requirements

### Requirement: Shoplifter assignment
Từ cấp mở khóa, mỗi khách thường SHALL có xác suất cấu hình là kẻ trộm lẻ, xác định theo ngày và mã khách; khách quen và người chơi dưới cấp mở khóa SHALL không bao giờ gặp kẻ trộm.

#### Scenario: Rate
- **WHEN** xét 20.000 khách thường ở cấp mở khóa
- **THEN** tỷ lệ kẻ trộm gần 1,5%

#### Scenario: Excluded
- **WHEN** khách là khách quen hoặc cấp dưới cấp mở khóa
- **THEN** không phải kẻ trộm

### Requirement: Detection
Xác suất phát hiện SHALL kết hợp độc lập các nguồn đang có (bảo vệ đang trực, camera, nhân viên châm hàng đang trực).

#### Scenario: Combined
- **WHEN** có bảo vệ trực và camera
- **THEN** xác suất là 0,98; không nguồn nào thì 0

### Requirement: Escape
Kẻ trộm không bị phát hiện SHALL rời quầy mà không trả tiền: tiền không đổi, không tính là khách đã phục vụ, không có đánh giá, tiệm mất hàng theo giá vốn ghi vào sổ cái và trừ vào lãi ròng; xử lý SHALL chỉ một lần.

#### Scenario: Escaped
- **WHEN** kẻ trộm cầm hàng giá vốn 3.000 đ tới quầy và không bị phát hiện
- **THEN** tiền không đổi, sổ cái có một dòng mất hàng 3.000, chi phí trộm của ngày là 3.000, lãi ròng giảm 3.000 và gọi thanh toán lại không tính lần hai

### Requirement: Caught red-handed
Kẻ trộm bị phát hiện SHALL trả lại hàng về kệ hoặc kho và nộp phạt bằng hệ số cấu hình nhân tiền hàng theo giá bán; phạt SHALL được ghi vào sổ cái là thu hồi.

#### Scenario: Caught
- **WHEN** kẻ trộm giỏ giá bán 4.500 bị bắt quả tang
- **THEN** tiền tăng 9.000, hàng trở lại, sổ cái ghi thu hồi 9.000 và không có mất hàng
