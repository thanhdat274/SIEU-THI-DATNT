# Spec Delta

## Purpose

Cho phép dựng lại và so sánh một ngày mô phỏng từ seed, trạng thái đầu ngày và các command/event xác định nhằm hỗ trợ gỡ lỗi.

## ADDED Requirements

### Requirement: Replay tái lập cùng trạng thái
Replay SHALL lưu đủ seed, snapshot đầu ngày và lệnh/event xác định để phát lại ra cùng trạng thái kết thúc trong cùng phiên bản simulation.

#### Scenario: Phát lại cùng ngày
- **WHEN** cùng snapshot, phiên bản và danh sách lệnh được replay
- **THEN** snapshot kết thúc và kết quả ledger khớp

### Requirement: Replay phát hiện sai lệch phiên bản
Replay SHALL lưu định danh phiên bản schema/simulation và SHALL báo không tương thích thay vì âm thầm phát lại bằng luật khác.

#### Scenario: Phiên bản khác
- **WHEN** replay được mở bởi simulation version không tương thích
- **THEN** hệ thống báo không thể xác minh replay và giữ nguyên save đang chơi
