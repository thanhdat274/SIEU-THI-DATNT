# Spec Delta

## Purpose

Khách để lại lời đánh giá bằng chữ gắn với trải nghiệm thật, người chơi đọc lại được và biết vì sao điểm cao hoặc thấp.

## ADDED Requirements

### Requirement: A written review per visit
Mỗi lượt khách được chấm sao (mua xong hoặc bỏ về) SHALL sinh đúng một lời đánh giá có cùng số sao, kèm tên người viết, ngày giờ và lý do bỏ về nếu có.

#### Scenario: Checkout
- **WHEN** một khách thanh toán xong
- **THEN** có một lời đánh giá mới với số sao bằng điểm vừa ghi và không có lý do bỏ về

#### Scenario: Walkout
- **WHEN** một khách bỏ về vì hết hàng
- **THEN** có một lời đánh giá từ 2 sao trở xuống, mang lý do hết hàng và món khách định mua

### Requirement: Deterministic, context-aware text
Lời SHALL xác định theo ngữ cảnh và thứ tự đánh giá; câu chính SHALL theo lý do bỏ về nếu có, ngược lại theo số sao; câu thêm SHALL chỉ nhắc điều đúng thực tế (mưa, bảo vệ trông xe, giá, cuối tuần, khách quen, món) và giọng khen hoặc chê SHALL khớp số sao; văn bản SHALL không còn chỗ trống thay thế.

#### Scenario: Same input
- **WHEN** soạn hai lần với cùng ngữ cảnh
- **THEN** hai lời giống nhau

#### Scenario: Tone matches stars
- **WHEN** khách chấm 5 sao hoặc bỏ về
- **THEN** 5 sao không có câu chê và lời bỏ về không có câu khen

#### Scenario: Facts only
- **WHEN** trời khô và không có bảo vệ
- **THEN** lời không nhắc mưa hay bảo vệ

#### Scenario: Regulars
- **WHEN** khách là khách quen
- **THEN** người viết là tên riêng của họ

### Requirement: Variety
Mỗi mức sao SHALL có ít nhất ba lời khác nhau trong cùng điều kiện.

#### Scenario: Pool size
- **WHEN** soạn 60 lời cùng một số sao
- **THEN** có ít nhất ba nội dung khác nhau

### Requirement: Bounded, safe history
Hệ thống SHALL giữ tối đa 60 lời mới nhất, lưu cùng save, và khi tải SHALL bỏ mục hỏng; save cũ không có lời đánh giá SHALL tải bình thường.

#### Scenario: Cap
- **WHEN** thêm 75 lời
- **THEN** còn 60 lời mới nhất

#### Scenario: Corrupt entries
- **WHEN** tải danh sách có mục thiếu trường, sao ngoài 1..5 hoặc chữ rỗng
- **THEN** các mục đó bị bỏ

#### Scenario: Round trip
- **WHEN** lưu rồi tải
- **THEN** danh sách lời đánh giá giữ nguyên

### Requirement: Summary and screen
Giao diện SHALL có màn liệt kê lời đánh giá mới nhất trước với tóm tắt (trung bình, phân bố sao, lý do bỏ về nhiều nhất) và bộ lọc khen/chê, mở từ điểm "Đánh giá khách" trên HUD; toast mỗi lượt SHALL kèm lời khách.

#### Scenario: Summary
- **WHEN** có 2 lời 5 sao và 3 lời thấp, trong đó 2 vì giá
- **THEN** phân bố sao đúng, trung bình bằng điểm trung bình và lý do nhiều nhất là giá
