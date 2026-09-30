# Spec Delta

## Purpose

Quy định hành vi catalog-adaptation khi chuyển các quy tắc vận hành tiệm sang game hiện tại, bảo toàn tài sản và tương thích tiến trình người chơi.

## ADDED Requirements

### Requirement: Compatible curated catalog
Hệ thống SHALL giữ nguyên ID và dữ liệu của 36 sản phẩm legacy, bổ sung 20 sản phẩm đã đối chiếu trùng nghĩa và có đủ category, giá nguyên VND, capacity, storage, unlock, hạn và sprite/fallback tương thích.

#### Scenario: Legacy inventory
- **WHEN** tải save chứa món cũ sau cập nhật catalog
- **THEN** mọi món cũ vẫn được nhận diện và giữ số lượng

#### Scenario: Unsupported source item
- **WHEN** món nguồn cần freezer, bếp, event hoặc quầy chưa hỗ trợ
- **THEN** món đó không được đưa vào danh mục mua của bản này

