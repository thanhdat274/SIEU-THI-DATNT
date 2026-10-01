# Spec Delta

## Purpose

Quản lý quy tắc thuế có phiên bản và tính nghĩa vụ theo kỳ chỉ sau khi nguồn, phạm vi chủ thể và chính sách đã được xác minh/duyệt.

## ADDED Requirements

### Requirement: Chỉ quy tắc đã xác minh mới được tính nghĩa vụ
Engine SHALL refuse to calculate or debit tax when the applicable rule is unverified, expired, or outside its declared taxpayer/revenue scope.

#### Scenario: Registry chưa xác minh
- **WHEN** kỳ tính thuế chỉ có rule trạng thái UNVERIFIED
- **THEN** engine không tạo nghĩa vụ hoặc trừ tiền và giải thích trạng thái cần xác minh

### Requirement: Nghĩa vụ dùng snapshot quy tắc theo kỳ
Mỗi nghĩa vụ đã tính SHALL lưu kỳ, nguồn doanh thu, rule version và snapshot để kết quả lịch sử không đổi khi registry cập nhật.

#### Scenario: Quy tắc được cập nhật
- **WHEN** rule mới có hiệu lực sau kỳ đã chốt
- **THEN** nghĩa vụ kỳ cũ tiếp tục dùng snapshot rule cũ
