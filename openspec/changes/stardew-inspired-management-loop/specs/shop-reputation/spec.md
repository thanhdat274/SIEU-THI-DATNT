# Spec Delta

## Purpose

Uy tín tiệm tăng và giảm theo chất lượng phục vụ từng khách và ảnh hưởng lượng khách.

## ADDED Requirements

### Requirement: Per-visit rating
Mỗi lượt khách kết thúc (thanh toán hoặc bỏ đi) SHALL cho một điểm 1–5 dựa vào thời gian chờ, việc có đủ hàng và tỉ lệ giá; điểm SHALL được lưu trong cửa sổ N lượt gần nhất.

#### Scenario: Served quickly with full basket
- **WHEN** khách lấy đủ hàng, chờ dưới ngưỡng ngắn, giá không cao hơn giá gợi ý
- **THEN** điểm là 5 và được thêm vào cửa sổ

#### Scenario: Leaves for lack of stock
- **WHEN** khách bỏ đi vì kệ hết món cần
- **THEN** điểm không quá 2 và lý do "hết hàng" được ghi

### Requirement: Reputation from rolling average
Trung bình rating SHALL suy ra từ cửa sổ (rỗng coi như 4); uy tín tích lũy legacy có thể tiếp tục lưu riêng để tương thích gameplay hiện có. Hệ số lượng khách SHALL nằm trong [0,8; 1,2] và dựa trên rating trung bình.

#### Scenario: High average
- **WHEN** trung bình ≥ 4,5
- **THEN** hệ số sinh khách bằng cận trên đã cấu hình

#### Scenario: Empty window
- **WHEN** chưa có lượt nào
- **THEN** trung bình là 4 và hệ số trung tính

### Requirement: Legacy migration
Save có `reputation` cũ SHALL tải được với `ratings` rỗng; không mất tiền/kho và điểm uy tín SHALL giữ trong giới hạn cũ.

#### Scenario: Load old save
- **WHEN** tải save chưa có `ratings`
- **THEN** cửa sổ rỗng, game chạy bình thường

### Requirement: Feedback visibility
Người chơi SHALL thấy sao trung bình và lý do khi khách bỏ đi.

#### Scenario: Toast on leaving
- **WHEN** khách bỏ đi vì chờ quá lâu
- **THEN** hiện thông báo với lý do "đợi lâu"
