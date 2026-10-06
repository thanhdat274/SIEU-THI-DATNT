# Spec Delta

## Purpose

Quán ăn vặt là tòa nhà thứ tư: mua bằng `buy_plot`, có trạm chảo, món riêng và liên kết nhẹ với các quán khác.

## ADDED Requirements

### Requirement: Building geometry
Hệ thống SHALL khai báo tòa `snack` trong khe x=21..26, chung tường x=26 với quán nước và x=21 với cánh đông tiệm chính, cửa nằm giữa hàng tường dưới và không bị hàng rào chặn.

#### Scenario: Ownership of shared walls
- **WHEN** tra `buildingAt` ở x=21, x=26 và x=23 (cùng hàng sàn)
- **THEN** kết quả lần lượt là `main`, `drink`, `snack`

### Requirement: Purchase
Mua `building-snack` SHALL cần cấp 26 và 400.000 ₫, đặt bố cục mặc định hợp lệ có thu ngân, và mua lặp SHALL không nhân đôi nội thất.

#### Scenario: Valid default layout
- **WHEN** mua tòa rồi kiểm `validateStoreLayout`
- **THEN** không có lỗi

### Requirement: Stations and products
`chao_xao` và `chao_chien` SHALL chỉ đặt được trong quán ăn vặt; kệ quán ăn vặt SHALL chỉ tự nhận món trong `SNACK_SHOP_PRODUCT_IDS`.

#### Scenario: Auto fill
- **WHEN** kho có mì gói và cá viên chiên rồi tự gán kệ quán ăn vặt
- **THEN** kệ nhận cá viên chiên

### Requirement: Cross-shop links
Khách ăn vặt ngồi bàn SHALL có thể gọi thêm trà đá hoặc nước mía; hệ số cụm ẩm thực SHALL tăng đơn điệu theo số tòa phụ đang mở và không đổi với 0–1 tòa.

#### Scenario: Cluster multiplier
- **WHEN** số tòa phụ mở tăng từ 0 đến 3
- **THEN** hệ số không giảm, bằng 1 với 0–1 tòa và lớn hơn 1 với 2–3 tòa
