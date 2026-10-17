# Spec Delta

## Purpose

Lời đánh giá bằng chữ (và lý do kèm theo) thật sự ảnh hưởng uy tín 0..100 của tiệm, hiện trong bản tin sáng và màn lời đánh giá — đảo non-goal "chỉ trình bày" của change trước, xác định và giống nhau giữa chơi lẻ và chơi chung.

## ADDED Requirements

### Requirement: Review content drives reputation
Mỗi lời đánh giá SHALL đóng góp một delta uy tín xác định theo nội dung vượt ngoài số sao (theo `reason`, theo mức sao khen), không đổi luật tính sao, và `playerData.reputation` SHALL được cập nhật bởi cả `reputationDeltaFromRating` (cơ sở, giữ nguyên) lẫn contribution từ lời đánh giá.

#### Scenario: Walkout complaint hurts more
- **WHEN** một khách bỏ về vì hết hàng, tạo lời đánh giá ≤2 sao có `reason: 'out_of_stock'`
- **THEN** uy tín giảm thêm một lượng xác định từ `reviewReputationContribution` (ngoài mức −1 của số sao thấp cơ sở)

#### Scenario: Praise gives a little boost
- **WHEN** một khách thanh toán 5 sao không lý do
- **THEN** `reviewReputationContribution` là giá trị dương nhỏ và được cộng vào uy tín

#### Scenario: Neutral no effect
- **WHEN** một khách chấm 3 sao không lý do
- **THEN** contribution bằng 0

#### Scenario: Deterministic equal
- **WHEN** cùng lời đánh giá (cùng reason, stars)
- **THEN** contribution như nhau; logic thuần nên chơi lẻ = chơi chung

### Requirement: Morning brief reports the effect
Bản tin sáng SHALL gồm một dòng tóm tắt tác động uy tín của lời đánh giá gần đây (hôm qua) kèm tổng delta, chỉ khi có lời đánh giá trong cửa sổ đó.

#### Scenario: Brief line present
- **WHEN** hôm qua có lời đánh giá khen hoặc chê
- **THEN** bản tin sáng hôm nay có dòng sentiment uy tín nêu tổng delta

#### Scenario: Brief line absent
- **WHEN** những ngày gần đây không có lời đánh giá
- **THEN** bản tin sáng không thêm dòng uy tín lời đánh giá

### Requirement: Review screen shows the influence
Màn lời đánh giá SHALL hiển thị ảnh hưởng uy tín: tổng delta các lời đang giữ (mới nhất trước), sentiment và lý do nhiều nhất.

#### Scenario: Influence block
- **WHEN** có các lời đánh giá trong danh sách đang giữ (cap 60)
- **THEN** màn hiện tổng delta ảnh hưởng uy tín, sentiment và lý do nhiều nhất

### Requirement: Save compatibility
Save cũ không có contribution (chỉ có `reviews` và `reputation`) SHALL tải và chơi bình thường; không đổi `schemaVersion`; để chơi qua save, contribution được tính lại từ lời có sẵn cùng luật.

#### Scenario: Old save loads and applies
- **WHEN** tải một save trước change này
- **THEN** mọi lời đánh giá có sẵn đều tính được contribution theo cùng luật, uy tín tiếp tục hoạt động bình thường
