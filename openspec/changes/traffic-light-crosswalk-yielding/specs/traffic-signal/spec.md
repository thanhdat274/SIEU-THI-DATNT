# Spec Delta

## Purpose

Đèn giao thông tại vạch qua đường trước cửa tiệm điều tiết xe và cho người đi bộ qua đường, xác định và an toàn.

## ADDED Requirements

### Requirement: Deterministic signal cycle
Đèn SHALL lặp chu kỳ xanh, vàng, đỏ cấu hình bằng dữ liệu, chỉ phụ thuộc thời gian đã trôi; cùng thời điểm cho cùng trạng thái.

#### Scenario: Order and period
- **WHEN** duyệt hai chu kỳ liên tiếp
- **THEN** xuất hiện đúng thứ tự xanh, vàng, đỏ, xanh, vàng, đỏ và trạng thái tại t bằng trạng thái tại t cộng một chu kỳ

### Requirement: Pedestrian signal safety
Người đi bộ SHALL chỉ được đi khi đèn xe đỏ; phải có khoảng đỏ dọn đường (nhấp nháy) trước khi xe xanh trở lại.

#### Scenario: Never conflicting
- **WHEN** xét mọi thời điểm trong chu kỳ
- **THEN** đèn đi bộ "đi" luôn đi cùng đèn xe đỏ, và đèn xe xanh hoặc vàng luôn đi cùng "chờ"

#### Scenario: Clearance
- **WHEN** hết pha đi
- **THEN** còn một khoảng nhấp nháy trước khi xe xanh

### Requirement: Signal heads shown
Renderer SHALL hiển thị đèn xe và đèn người đi bộ cạnh vạch qua đường, phản ánh trạng thái hiện tại.

#### Scenario: Red for vehicles
- **WHEN** đèn xe đỏ và người đi bộ được đi
- **THEN** bóng đỏ của đèn xe sáng và ô xanh của đèn người đi bộ sáng
