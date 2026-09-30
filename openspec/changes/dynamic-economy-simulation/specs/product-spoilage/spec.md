# Spec Delta

## Purpose

Mở rộng hạn dùng theo lô hiện có: hỏng phụ thuộc điều kiện bảo quản, hàng hết hạn có hậu quả tài chính và hài lòng, chỉ áp dụng cho loại hàng hợp lý.

## ADDED Requirements

### Requirement: Perishability by product kind
Chỉ sản phẩm có hạn dùng cấu hình (thực phẩm tươi, sữa, thịt, rau, đồ ăn chế biến) SHALL hỏng; sản phẩm không hạn (đồ gia dụng, hàng khô lâu) SHALL NOT hỏng vì thời gian. Dữ liệu hạn dùng của sản phẩm hiện có SHALL được giữ.

#### Scenario: Non-perishable
- **WHEN** nhiều ngày trôi qua
- **THEN** đồ gia dụng không bị trừ vì hỏng

### Requirement: Storage condition affects spoilage speed
Tốc độ hỏng SHALL phụ thuộc điều kiện bảo quản (tủ mát có điện, kho thường, mất điện, nóng) theo bảng hệ số cấu hình, tính vào số ngày hạn còn lại của lô. Hàng lạnh để ngoài tủ mát hoặc khi mất điện SHALL hỏng nhanh hơn.

#### Scenario: Power outage
- **WHEN** mất điện một ngày
- **THEN** lô hàng lạnh mất số ngày hạn nhiều hơn một ngày bình thường theo hệ số dữ liệu

#### Scenario: Normal cold storage
- **WHEN** hàng lạnh trong tủ mát có điện
- **THEN** hạn giảm đúng một ngày mỗi ngày

### Requirement: Expired goods consequences
Hàng hết hạn SHALL không bán được, SHALL bị loại khỏi kệ/kho kèm khoản lỗ vào sổ cái theo giá vốn lô, và nếu khách lấy/phát hiện hàng hết hạn trước khi được loại thì SHALL giảm hài lòng/uy tín theo cấu hình. Người chơi SHALL được báo trước hạn theo ngưỡng cảnh báo.

#### Scenario: Loss recorded
- **WHEN** lô hết hạn bị loại
- **THEN** sổ cái ghi khoản hỏng bằng số lượng nhân giá vốn lô và báo cáo ngày cộng khoản đó một lần

#### Scenario: Customer discovers expired item
- **WHEN** một món quá hạn còn trên kệ khi khách lấy
- **THEN** giao dịch không xảy ra cho món đó và hài lòng bị trừ theo cấu hình

### Requirement: Disposal
Người chơi SHALL có thể tiêu hủy thủ công hàng sắp/đã hết hạn; khoản tiêu hủy SHALL ghi vào sổ như hàng hỏng và SHALL không được tính hai lần.

#### Scenario: Manual disposal
- **WHEN** tiêu hủy một lô
- **THEN** tồn giảm, khoản lỗ ghi một lần và lô không xuất hiện lại sau khi lưu/tải
