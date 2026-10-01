# Spec Delta

## Purpose

Hướng dẫn người chơi theo các hành động/mốc tiến trình thực tế, cho phép bỏ qua hoặc tắt hướng dẫn mà không chặn gameplay.

## ADDED Requirements

### Requirement: Checklist phản ánh trạng thái thật
Mỗi mục SHALL hoàn thành từ trạng thái hoặc hành động đã xác nhận trong game, không đánh dấu xong chỉ vì hiển thị hướng dẫn.

#### Scenario: Người chơi hoàn thành bước
- **WHEN** điều kiện gameplay của mục được thỏa mãn
- **THEN** checklist đánh dấu hoàn tất và tiến tới mục đủ điều kiện tiếp theo

### Requirement: Hướng dẫn có thể bỏ qua
Người chơi SHALL có thể đóng hoặc tắt checklist; việc đó SHALL NOT khóa mở khóa hoặc phần thưởng gameplay.

#### Scenario: Người chơi cũ bỏ qua
- **WHEN** người chơi chọn ẩn checklist
- **THEN** checklist ẩn và các hệ thống/gameplay khác tiếp tục hoạt động
