# Spec Delta

## Purpose

Tòa nhà là instance của một loại tòa khai báo bằng dữ liệu; một loại có thể có nhiều tòa (chi nhánh) trên cùng thành phố.

## ADDED Requirements

### Requirement: Building type registry
Mọi loại tòa SHALL được khai báo trong một registry dữ liệu (mẫu hình học, bố cục mặc định, trạm/món được phép, nhịp khách, cấp, giá, số tòa tối đa); logic SHALL đọc thuộc tính loại thay vì so id tòa cố định.

#### Scenario: Station restriction by type
- **WHEN** đặt trạm pha cà phê vào quán nước
- **THEN** bị từ chối với `wrong_building`; đặt vào quán cà phê thì hợp lệ

### Requirement: Multiple instances
Hệ thống SHALL cho mở nhiều tòa cùng loại tới `maxInstances`, mỗi tòa có id riêng, nội thất mặc định id riêng, quầy thu ngân và hàng đợi riêng.

#### Scenario: Two drink shops
- **WHEN** đã có quán nước ở W0 và mở thêm một quán nước ở W1
- **THEN** khách quán nước chia theo dòng khách riêng từng tòa, mỗi tòa thanh toán ở quầy của mình, không trùng id nội thất

#### Scenario: Instance cap
- **WHEN** mở chi nhánh tạp hóa thứ 4
- **THEN** bị từ chối với `max_instances`

### Requirement: Legacy buildings preserved
Bốn tòa cũ SHALL giữ id `main`, `xoi`, `drink`, `snack` và nạp từ save cũ với `typeId` tương ứng; golden các bước trước SHALL PASS.

#### Scenario: Old save
- **WHEN** nạp save schema 8 có tiệm xôi
- **THEN** có instance `xoi` loại `xoi_shop`, bố cục và vị trí không đổi

### Requirement: Per-building ledger
Dòng sổ cái bán hàng/chi phí SHALL mang id tòa; báo cáo SHALL lọc được theo tòa; thuế SHALL tính trên tổng.

#### Scenario: Revenue by building
- **WHEN** một ngày bán ở tiệm chính và chi nhánh
- **THEN** tổng doanh thu theo tòa bằng tổng doanh thu ngày

### Requirement: Distant restocking
Kệ ở tòa cách kho quá 30 ô SHALL được châm qua chuyến giao nội bộ có thời gian; hàng đang chuyển SHALL không bán được và vẫn tính hạn dùng.

#### Scenario: Far branch restock
- **WHEN** nhân viên châm kệ chi nhánh cách kho 50 ô
- **THEN** hàng rời kho ngay, tới kệ sau thời gian giao theo quãng đường, trong lúc chuyển không bán được

### Requirement: Store tier by floor area
Tòa bán lẻ SHALL có hạng suy từ số ô sàn footprint; hạng SHALL quyết định biển hiệu, hệ số nhịp khách, sức chứa khách và nội thất được mở (`minTier`); hạng SHALL không giảm khi dời tòa.

#### Scenario: Becoming a mini supermarket
- **WHEN** tiệm chính mở rộng từ 99 lên 100 ô sàn
- **THEN** hạng thành Siêu thị mini, biển đổi, nhịp khách nhân ×1,3, quầy thu ngân thứ 2 mua được

#### Scenario: Supermarket needs a neighbour parcel
- **WHEN** tiệm chính đã lấp kín lô của mình (126 ô sàn, dưới ngưỡng Siêu thị 160)
- **THEN** hạng vẫn là Siêu thị mini; chỉ khi lấn sang lô trống kề bên và đạt 160 ô sàn thì mới thành Siêu thị

#### Scenario: Locked fixture
- **WHEN** tiệm hạng Tiệm tạp hóa mua tủ đông lớn có `minTier` Siêu thị mini
- **THEN** bị từ chối với `tier`

### Requirement: Parking effect
Bãi giữ xe SHALL thu phí theo xe và tăng tỉ lệ khách đi xe cho tòa trong bán kính 12 ô.

#### Scenario: Parking nearby
- **WHEN** mô phỏng 7 ngày quán nước có và không có bãi giữ xe cách 8 ô
- **THEN** số khách đi xe của quán nước khi có bãi giữ xe cao hơn
