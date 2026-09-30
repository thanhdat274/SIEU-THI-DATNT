# Spec Delta

## Purpose

Quy định hành vi daily-stock-planning khi chuyển các quy tắc vận hành tiệm sang game hiện tại, bảo toàn tài sản và tương thích tiến trình người chơi.

## ADDED Requirements

### Requirement: Costed daily report
Hệ thống SHALL lưu giá vốn từng lô và báo doanh thu, COGS, mua hàng, lương, hàng hỏng và lợi nhuận riêng; lô legacy SHALL đánh dấu vốn ước tính.

#### Scenario: Cashflow versus profit
- **WHEN** mua 10 món vốn 3000 rồi bán 2 món giá 5000 không có chi phí khác
- **THEN** cashflow mua là 30000, doanh thu 10000, COGS 6000, lợi nhuận 4000

#### Scenario: Two purchase costs
- **WHEN** bán từ hai lô có vốn khác nhau theo FEFO
- **THEN** COGS theo đúng lô thực bán, không lấy giá catalog hiện tại

### Requirement: Explainable stock suggestions
Hệ thống SHALL gợi ý theo lịch sử 3/7 ngày, tồn còn dùng được và incoming theo ETA, giới hạn ngân sách/cold capacity/hạn; SHALL hiển thị lý do và cho sửa trước đặt.

#### Scenario: Enough incoming stock
- **WHEN** tồn kho cộng incoming đúng hạn đủ target
- **THEN** không gợi ý mua lặp lượng đã chờ

#### Scenario: No sales history
- **WHEN** tiệm chưa có lịch sử bán
- **THEN** gợi ý lượng thử nhỏ có nhãn fallback, không khẳng định là nhu cầu thực

### Requirement: Opt-in automatic purchasing
Tự nhập SHALL mặc định tắt và chỉ chạy một lần mỗi sáng khi bật, qua các kiểm tra giỏ hàng và ngân sách; SHALL báo mua hoặc lý do bỏ qua.

#### Scenario: Reload same morning
- **WHEN** đã chạy tự nhập rồi reload cùng sáng
- **THEN** không tạo đơn hoặc trừ tiền lần nữa

#### Scenario: Budget exhausted
- **WHEN** quy tắc ưu tiên trước dùng hết ngân sách
- **THEN** quy tắc sau bị bỏ qua và có báo cáo thiếu ngân sách

