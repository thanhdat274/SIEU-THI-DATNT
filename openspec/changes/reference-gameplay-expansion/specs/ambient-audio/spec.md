# Spec Delta

## Purpose

Thêm âm thanh môi trường nhẹ theo thời tiết/giờ và hiệu ứng tương tác, có kiểm soát rõ ràng về mute, autoplay và trạng thái tab.

## ADDED Requirements

### Requirement: Âm thanh chỉ phát sau tương tác người dùng
Hệ thống SHALL không tự phát âm thanh trước user gesture và SHALL cho phép tắt toàn bộ âm thanh.

#### Scenario: Người chơi tắt âm thanh
- **WHEN** mute được bật
- **THEN** âm thanh môi trường và hiệu ứng đều im lặng

### Requirement: Âm thanh theo bối cảnh và trạng thái trang
Âm thanh môi trường SHALL phản ánh thời tiết/khung giờ phù hợp và SHALL giảm/tạm dừng khi tab ẩn theo cài đặt.

#### Scenario: Tab chuyển nền
- **WHEN** trang không còn hiển thị
- **THEN** âm thanh nền được tạm dừng hoặc giảm theo cấu hình, không tiếp tục gây phát nền ngoài ý muốn
