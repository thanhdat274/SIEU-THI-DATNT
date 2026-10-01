# Spec Delta

## Purpose

Người chơi đầu tư camera, bật tắt báo công an và xem các sự cố an ninh.

## ADDED Requirements

### Requirement: Camera
Hệ thống SHALL cho lắp camera một lần với giá cấu hình, chỉ từ cấp mở khóa; thiếu tiền hoặc đã có SHALL bị từ chối; lắp xong SHALL trừ tiền, ghi sổ cái chi phí thiết bị, cộng vào chi phí của ngày và trừ lãi ròng.

#### Scenario: Buy
- **WHEN** đủ tiền và chưa có camera
- **THEN** tiền giảm 250.000, camera được bật, sổ cái ghi 250.000 và lãi ròng ngày giảm 250.000

#### Scenario: Rejected
- **WHEN** dưới cấp mở khóa, thiếu tiền hoặc đã có camera
- **THEN** bị từ chối và không đổi gì

### Requirement: Police setting
Người chơi SHALL bật hoặc tắt báo công an; mặc định bật.

#### Scenario: Toggle
- **WHEN** tắt báo công an
- **THEN** trạng thái là tắt và được lưu

### Requirement: Incident log
Hệ thống SHALL giữ tối đa 20 sự cố gần nhất kèm ngày, loại, nội dung và giá trị mất hoặc thu hồi, lưu cùng save, bỏ mục hỏng khi tải; save cũ không có dữ liệu an ninh SHALL tải với giá trị mặc định.

#### Scenario: Cap and defaults
- **WHEN** thêm 27 sự cố, hoặc tải save không có trường an ninh
- **THEN** còn 20 sự cố mới nhất, hoặc trạng thái mặc định (không camera, bật báo công an, rỗng)

#### Scenario: Round trip
- **WHEN** lưu rồi tải
- **THEN** camera, báo công an, sự cố, hồ sơ và cờ kẻ trộm của khách giữ nguyên

### Requirement: Security screen
Giao diện SHALL có màn An ninh hiển thị camera, bảo vệ (có trong biên chế, đang trực), bật tắt báo công an, sự cố gần đây kèm tổng mất và thu hồi, và nút vào màn này SHALL chỉ có từ cấp mở khóa.

#### Scenario: Locked
- **WHEN** cấp dưới mở khóa
- **THEN** HUD không có nút An ninh
