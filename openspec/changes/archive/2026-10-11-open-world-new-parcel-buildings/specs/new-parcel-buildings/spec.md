# Spec Delta

## Purpose

Tòa phụ được mở, đặt và dời trên lô của đợt khai hoang mới (W1–W4) đã mua, với hình học và mặt tiền đúng lô.

## ADDED Requirements

### Requirement: Unified parcel lookup
Mọi kiểm tra vị trí tòa SHALL tra lô qua một hàm thống nhất trả cả lô W0 lẫn lô đợt mới; lô đợt mới chưa mua hoặc thuộc đợt chưa mở SHALL không đặt tòa được.

#### Scenario: Unowned new parcel
- **WHEN** đặt quán nước lên `w1-corner` khi chưa mua lô
- **THEN** bị từ chối với `parcel_not_owned`

#### Scenario: Unknown parcel
- **WHEN** đặt tòa lên id lô không tồn tại
- **THEN** bị từ chối với `unknown_parcel`

### Requirement: Per-parcel frontage row
`validatePlacement` SHALL đòi hàng mặt tiền của tòa bằng hàng mặt tiền của lô; lô W0 SHALL giữ hàng y=10 để kết quả cũ không đổi.

#### Scenario: W0 unchanged
- **WHEN** đặt tiệm xôi ở `lot-west` gốc (0,3)
- **THEN** hợp lệ như trước, golden không đổi

#### Scenario: New parcel front row
- **WHEN** đặt tòa lên lô đợt mới với hàng mặt tiền khác hàng mặt tiền của lô
- **THEN** bị từ chối với `front_row`

### Requirement: Parcels fit buildings
Mỗi lô đợt mới SHALL đủ chứa ít nhất một mẫu tòa phụ (rộng và cao theo bảng kích thước được chủ dự án duyệt); test dữ liệu SHALL kiểm điều này.

#### Scenario: Data check
- **WHEN** chạy test dữ liệu đợt khai hoang
- **THEN** mỗi lô đợt mới chứa vừa ít nhất một tòa phụ và không chồng lô khác

### Requirement: Placement UI for new parcels
Màn "Mở đất" SHALL liệt kê lô đợt mới đã mua và còn trống làm lựa chọn đặt tòa, local và co-op cho cùng kết quả.

#### Scenario: Open drink shop on w1-corner
- **WHEN** đã mua `w1-corner` và chọn mở quán nước ở đó
- **THEN** tòa xuất hiện trên bản đồ tại lô, cửa hàng hoạt động, khách tới theo hệ số vị trí của lô
