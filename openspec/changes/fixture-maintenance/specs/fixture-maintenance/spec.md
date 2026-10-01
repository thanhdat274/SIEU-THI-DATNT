# Spec Delta

## Purpose

Người chơi bỏ tiền để bảo trì, sửa hoặc mua mới kệ và tủ mát, có ghi sổ rõ ràng.

## ADDED Requirements

### Requirement: Maintenance actions
Hệ thống SHALL cho bảo trì đồ chưa hỏng khi đã mòn đủ, sửa đồ hỏng nhẹ và mua mới đồ hỏng; hỏng nặng SHALL không sửa được; thiếu tiền hoặc điều kiện không đúng SHALL bị từ chối và không đổi gì.

#### Scenario: Valid actions
- **WHEN** bảo trì đồ mòn đủ, sửa đồ hỏng nhẹ, mua mới đồ hỏng nặng
- **THEN** mỗi hành động thành công với đúng chi phí cấu hình

#### Scenario: Rejected actions
- **WHEN** bảo trì đồ còn tốt, sửa đồ không hỏng, sửa đồ hỏng nặng, hoặc thiếu tiền
- **THEN** bị từ chối với lý do tương ứng và nội thất không đổi

### Requirement: Effects of maintenance
Sửa hoặc bảo trì SHALL đưa độ mòn về mức sửa (hoặc giữ nếu thấp hơn) và hết hỏng; mua mới SHALL đưa độ mòn về 0, hết hỏng và giữ nguyên chỗ đặt, loại hàng và hàng đang bày.

#### Scenario: Replace keeps stock
- **WHEN** mua mới một kệ đang bày 6 chai
- **THEN** kệ hết hỏng, mòn bằng 0, vẫn bày đúng loại hàng và 6 chai

### Requirement: Costs recorded
Mỗi hành động thành công SHALL trừ tiền, ghi một dòng sổ cái loại bảo trì, cộng vào chi phí bảo trì của ngày và trừ vào lãi ròng của ngày.

#### Scenario: Ledger and net profit
- **WHEN** sửa một kệ tốn 20.000 đ
- **THEN** tiền giảm 20.000, sổ cái có một dòng bảo trì 20.000, chi phí ngày là 20.000 và lãi ròng giảm 20.000

### Requirement: Locked at low level
Dưới cấp mở khóa mọi hành động bảo trì SHALL bị từ chối.

#### Scenario: Level 1
- **WHEN** người chơi cấp 1 bảo trì một đồ
- **THEN** bị từ chối vì chưa mở khóa

### Requirement: Maintenance is reachable and visible
Giao diện SHALL có màn liệt kê đồ kèm độ mòn và hành động; nút vào màn này trên HUD SHALL chỉ hiện khi có đồ mòn hoặc hỏng; kệ hỏng SHALL nhìn thấy được trên sàn; tổng kết ngày SHALL ghi chi phí bảo trì khi có.

#### Scenario: HUD button
- **WHEN** không có đồ nào mòn hay hỏng
- **THEN** HUD không hiện nút Sửa chữa

#### Scenario: Broken shelf on the floor
- **WHEN** một kệ hỏng
- **THEN** kệ tối màu và hiện nhãn hỏng thay cho số hàng
