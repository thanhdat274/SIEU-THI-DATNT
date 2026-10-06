# Spec Delta

## Purpose

Trong co-op, mỗi tòa có người phụ trách, hai tòa ký được hợp đồng cung ứng nội bộ, và thành tích được tính theo người.

## ADDED Requirements

### Requirement: Building manager
Tòa SHALL có người phụ trách tùy chọn; lệnh bố cục/giá/nhân viên của tòa từ người không phụ trách SHALL theo cài đặt `nonManagerActions`.

#### Scenario: Deny non-manager
- **WHEN** `nonManagerActions = deny` và B đổi bố cục tiệm chính do A phụ trách
- **THEN** bị từ chối với `forbidden`

### Requirement: Supply contract lifecycle
Hợp đồng SHALL chỉ có hiệu lực khi bên còn lại đồng ý; hủy đơn phương SHALL có hiệu lực từ ngày hôm sau.

#### Scenario: Proposal expires
- **WHEN** A đề xuất hợp đồng và B không trả lời trong 1 ngày game
- **THEN** đề xuất hết hạn, không có hàng chuyển

### Requirement: Daily internal delivery
Mỗi sáng, hợp đồng đang hiệu lực SHALL chuyển tối đa `quantityPerDay` từ kho (FEFO) tới tòa nhận qua giao hàng nội bộ; thiếu hàng SHALL giao phần có và báo hai bên; quỹ chung SHALL không đổi.

#### Scenario: Partial delivery
- **WHEN** hợp đồng 10 trứng/ngày nhưng kho còn 6
- **THEN** giao 6, báo thiếu 4, quỹ chung không đổi

### Requirement: Per-player scoreboard
Bảng thành tích SHALL cộng giá nội bộ vào doanh thu tòa giao và giá vốn tòa nhận, gom theo người phụ trách; tổng lãi các người SHALL bằng lãi doanh nghiệp.

#### Scenario: Totals reconcile
- **WHEN** chạy 5 ngày có hợp đồng
- **THEN** tổng lãi theo người bằng lãi trong sổ cái doanh nghiệp
