# Spec Delta

## Purpose

Quy định hành vi shelf-operations khi chuyển các quy tắc vận hành tiệm sang game hiện tại, bảo toàn tài sản và tương thích tiến trình người chơi.

## ADDED Requirements

### Requirement: Actual lot-preserving transfer
Hệ thống SHALL chuyển tối đa lượng yêu cầu, tồn còn hạn và sức chứa hữu hiệu; kết quả và UI SHALL phản ánh lượng thực, giữ hạn và giá vốn lô.

#### Scenario: Product capacity below fixture
- **WHEN** kệ max 24, sản phẩm capacity 10, tồn kệ 5 và yêu cầu châm 19
- **THEN** chỉ chuyển 5, kho giảm 5 và thông báo 5

#### Scenario: Concurrent refill
- **WHEN** hai tác nhân châm cùng kệ
- **THEN** tổng chuyển không vượt capacity và không nhân hàng

### Requirement: Persistent shelf plan
Người chơi SHALL lưu và áp dụng sơ đồ kệ; áp dụng SHALL không đổi món đang có hàng và SHALL báo lý do target không hợp lệ.

#### Scenario: Occupied different product
- **WHEN** áp dụng sơ đồ chỉ định A vào kệ còn B
- **THEN** B và lô giữ nguyên, kệ bị bỏ qua với lý do

#### Scenario: Reload plan
- **WHEN** lưu rồi tải lại và áp dụng sơ đồ
- **THEN** đúng fixture được châm từ kho còn hạn

