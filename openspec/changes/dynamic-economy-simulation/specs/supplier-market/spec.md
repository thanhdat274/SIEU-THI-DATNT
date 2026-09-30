# Spec Delta

## Purpose

Cho nhà cung cấp phản ứng với mùa và sự kiện để người chơi phải quyết định nhập sớm, chờ giá tốt hoặc đổi mối.

## ADDED Requirements

### Requirement: Dynamic wholesale price
Giá sỉ mỗi sản phẩm tại mỗi nhà cung cấp SHALL thay đổi theo ngày dựa trên giá nền, chiết khấu của mối, bộ chỉnh mùa, sự kiện và khan hiếm, với biên độ đổi tối đa mỗi ngày cấu hình. Giá SHALL được chốt vào đơn tại thời điểm đặt và không đổi sau đó.

#### Scenario: Gradual increase
- **WHEN** nắng nóng làm tăng giá sỉ đồ uống mát
- **THEN** giá tăng từng bước qua nhiều ngày và đơn đã đặt trước đó giữ giá cũ

#### Scenario: Price visible with reason
- **WHEN** người chơi mở danh sách nhập
- **THEN** mỗi món hiện giá hôm nay, chênh so với hôm qua và lý do chính (mùa, sự kiện, khan hiếm)

### Requirement: Supplier stock and availability
Mỗi nhà cung cấp SHALL có tồn theo sản phẩm/nhóm mỗi ngày, có thể tăng hoặc giảm theo mùa và sự kiện, và có thể tạm ngừng cung một số sản phẩm. Đơn vượt tồn hoặc chứa sản phẩm ngừng cung SHALL bị từ chối nguyên giỏ (nguyên tử) kèm lý do; hệ thống SHALL NOT giao một phần âm thầm.

#### Scenario: Shortage event
- **WHEN** sự kiện khan hàng làm nhà cung cấp ngừng cung một nhóm
- **THEN** đặt món thuộc nhóm đó bị từ chối với lý do "nhà cung cấp tạm ngừng" và nhà cung cấp khác vẫn đặt được nếu còn hàng

#### Scenario: Stock decreases as bought
- **WHEN** người chơi đặt một số lượng
- **THEN** tồn nhà cung cấp trong ngày giảm đúng số lượng đó

### Requirement: Seasonal and bulk offers
Nhà cung cấp SHALL có thể chào sản phẩm theo mùa (chỉ có hoặc rẻ hơn trong mùa, vẫn đặt được ngoài mùa với giá/tồn khác) và ưu đãi số lượng lớn (mức chiết khấu theo ngưỡng) cấu hình bằng dữ liệu.

#### Scenario: Bulk discount
- **WHEN** số lượng một món đạt ngưỡng ưu đãi
- **THEN** đơn giá giảm theo bậc và tổng tiền hiển thị trước khi xác nhận

### Requirement: Restock schedules
Mỗi nhà cung cấp SHALL có lịch nhập hàng riêng (ngày giao, ngày nhận đặt, thời gian giao) cấu hình; đơn đặt ngoài lịch SHALL được dời sang lần giao kế tiếp và giao diện SHALL hiện ngày giao dự kiến.

#### Scenario: Next delivery shown
- **WHEN** đặt đơn vào ngày nhà cung cấp không giao
- **THEN** ngày giao dự kiến là lần giao kế tiếp theo lịch

### Requirement: Backward compatible suppliers
Nhà cung cấp hiện có SHALL tiếp tục chạy khi không có dữ liệu thị trường: giá và tồn vô hạn như cũ, chiết khấu/đơn tối thiểu giữ nguyên.

#### Scenario: Old save
- **WHEN** tải save không có trạng thái thị trường
- **THEN** đặt hàng hoạt động như trước và trạng thái thị trường khởi tạo rỗng
