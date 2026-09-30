# Spec Delta

## Purpose

Cho người chơi đặt giá bán trong dải quanh giá gợi ý, với hậu quả rõ lên khách, biên lãi và sổ sách.

## ADDED Requirements

### Requirement: Player-set price within band
Hệ thống SHALL cho đặt giá từng sản phẩm trong dải cấu hình quanh giá gợi ý, làm tròn theo bước giá; giá ngoài dải SHALL bị kẹp vào dải và kết quả trả về giá thực áp dụng.

#### Scenario: Price clamped
- **WHEN** đặt giá bằng 3 lần giá gợi ý
- **THEN** giá áp dụng bằng cận trên của dải và lệnh trả về giá đó

#### Scenario: Reset to suggested
- **WHEN** đặt giá đúng bằng giá gợi ý
- **THEN** ghi đè bị xóa và save không lưu giá cho sản phẩm

### Requirement: Price locked on pickup
Giá SHALL được chốt vào giỏ khi khách lấy hàng; đổi giá sau đó SHALL không đổi tổng của giỏ đã lấy.

#### Scenario: Change price while customer holds basket
- **WHEN** giá món đổi trong lúc khách đang cầm giỏ chứa món đó
- **THEN** khách thanh toán theo giá lúc lấy hàng

### Requirement: Price affects demand
Giá cao hơn giá gợi ý SHALL giảm xác suất khách lấy hàng theo độ nhạy giá của khách, không dưới sàn cấu hình; giá thấp hơn SHALL không làm giảm xác suất và MAY tăng lượng khách trong trần cấu hình.

#### Scenario: Overpriced item
- **WHEN** giá 130% giá gợi ý và khách có độ nhạy 1,8
- **THEN** xác suất lấy hàng thấp hơn 1 và không thấp hơn sàn

### Requirement: Ledger integrity under custom price
Doanh thu SHALL ghi theo giá thực trả và giá vốn theo lô đã xuất; lãi gộp SHALL bằng doanh thu trừ giá vốn.

#### Scenario: Sale at custom price
- **WHEN** bán một món giá 120% giá gợi ý
- **THEN** ledger `sale` ghi giá thực, cogs là giá lô xuất, tổng thay đổi tiền khớp ledger

### Requirement: Price change window
Hệ thống SHALL từ chối đổi giá khi việc đó làm sai một giao dịch đang diễn ra; lý do SHALL được trả về.

#### Scenario: Reject during checkout
- **WHEN** đổi giá món đang nằm trong giỏ khách ở bước thanh toán
- **THEN** từ chối với lý do và giá không đổi
