# Spec Delta

## Purpose

Quy định hành vi operations-persistence khi chuyển các quy tắc vận hành tiệm sang game hiện tại, bảo toàn tài sản và tương thích tiến trình người chơi.

## ADDED Requirements

### Requirement: Safe migration and recovery
Hệ thống SHALL validate/migrate save schema 2 với backup, giữ tài sản và ETA legacy, mặc định tính năng tự mua tắt; lỗi đọc/parse SHALL hiển thị khôi phục và không ghi default đè save.

#### Scenario: Database read failure
- **WHEN** đọc IndexedDB thất bại
- **THEN** hiển thị retry/recovery và không ghi game mới

#### Scenario: Legacy costs
- **WHEN** migrate lô không có giá vốn
- **THEN** số lượng/hạn giữ nguyên, vốn bổ sung có nhãn estimated

#### Scenario: Newer unsupported version
- **WHEN** tải save version chưa hỗ trợ
- **THEN** từ chối có thông báo, giữ nguyên dữ liệu

### Requirement: Resume committed operations
Hệ thống SHALL lưu giỏ/queue/hàng mang/holding/planogram/staff và dấu chốt đơn/lương/tự nhập; tải lại SHALL không nhân tiền/hàng và loại claim không còn hợp lệ.

#### Scenario: Mid-job reload
- **WHEN** save/reload khi worker đang mang hàng và khách đang xếp hàng
- **THEN** hàng giữ đúng location và không chuyển hay bán hai lần

#### Scenario: Legacy customer
- **WHEN** migrate khách cũ đang tới quầy chưa có giỏ
- **THEN** khách phải lấy hàng hợp lệ trước thanh toán, không suy ra một món đã sở hữu từ target kệ

