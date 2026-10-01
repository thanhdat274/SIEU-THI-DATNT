# Spec Delta

## Purpose

Tạo nhịp chuẩn bị → bán → kết toán bằng bản tin sáng và tổng kết cuối ngày không đổi tiền.

## ADDED Requirements

### Requirement: End-of-day summary is a read-only view
Khi ngày đóng, hệ thống SHALL hiển thị tổng kết từ `DailyRecord` gồm doanh thu, giá vốn, lãi gộp, hàng hỏng, lương, số khách, sao trung bình; hiển thị SHALL không thay đổi tiền, kho hay ledger.

#### Scenario: Numbers match ledger
- **WHEN** đóng ngày có 3 giao dịch bán, 1 mua, 1 lương
- **THEN** tổng kết khớp ledger và Δtiền của ngày

#### Scenario: Reload after close
- **WHEN** tải lại sau khi đã đóng ngày
- **THEN** tổng kết mở lại được cho ngày đó và ledger không bị ghi lần hai

### Requirement: Highlights
Tổng kết SHALL nêu món bán chạy nhất, món biên lãi tốt nhất và món hết hàng trong ngày khi có dữ liệu.

#### Scenario: No sales
- **WHEN** ngày không có giao dịch
- **THEN** không hiện highlight bán chạy và tổng kết vẫn hợp lệ

### Requirement: Morning brief
Đầu ngày, hệ thống SHALL hiển thị bản tin gồm các mục có sẵn: hàng về hôm nay, đơn đang chờ, thời tiết/dự báo, sự kiện mùa, mục tiêu gần xong; mục thuộc hệ chưa triển khai SHALL bị ẩn.

#### Scenario: Only available sections
- **WHEN** chưa có thời tiết
- **THEN** bản tin vẫn hiện hàng về và đơn chờ

### Requirement: Compact layout
Màn tổng kết SHALL dùng được ở viewport mobile ngang, không tràn ngang và cuộn phần dư.

#### Scenario: 844×390
- **WHEN** mở tổng kết ở 844×390
- **THEN** nút Tiếp tục luôn thấy được

### Requirement: Implemented summary scope
Phần code hiện tại SHALL được mô tả là modal tổng kết mở khi ngày đổi và chỉ đọc từ `DailyRecord`; bản tin sáng, mở lại sau reload và highlights hoàn chỉnh vẫn là yêu cầu chưa triển khai.

#### Scenario: Do not claim morning brief exists
- **WHEN** người chơi bắt đầu ngày mới
- **THEN** hệ thống không được xem các toast rời rạc là bản tin sáng hoàn chỉnh
