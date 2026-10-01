# Spec Delta

## Purpose

Ban đêm tiệm có thể bị trộm đột nhập; bảo vệ đuổi được, camera giảm tần suất, công an có thể đòi lại.

## ADDED Requirements

### Requirement: Nightly burglary
Từ cấp mở khóa, mỗi đêm SHALL có xác suất cấu hình bị trộm đột nhập (nhân hệ số khi có camera), xác định theo ngày; dưới cấp mở khóa SHALL không có.

#### Scenario: Frequency
- **WHEN** xét 6.000 đêm không camera
- **THEN** tần suất gần xác suất cấu hình và có camera thì thấp hơn rõ rệt

### Requirement: Guard repels
Có nhân viên bảo vệ trong biên chế SHALL đuổi được trộm đột nhập: không đổi việc có kẻ lạ tới hay không, nhưng không mất gì và không mở hồ sơ công an.

#### Scenario: Repelled
- **WHEN** có bảo vệ và đêm có kẻ lạ
- **THEN** sự cố ghi đuổi được, sổ cái không có mất mát, tiền không bị lấy

### Requirement: Losses
Không có bảo vệ SHALL mất tiền két (tỷ lệ cấu hình của doanh thu hôm trước, không vượt tiền hiện có) hoặc hàng trên kệ (tỷ lệ và tối đa số món cấu hình, theo giá vốn); mất tiền ghi sổ cái là tiền ra, mất hàng ghi sổ cái không đổi tiền; cả hai SHALL cộng vào chi phí trộm của ngày mới và trừ vào lãi ròng; két trống hoặc kệ trống SHALL không mất gì.

#### Scenario: Cash
- **WHEN** đêm trộm lấy tiền với doanh thu hôm trước 100.000
- **THEN** mất từ 30% đến 60% (làm tròn 1.000), sổ cái ghi đúng số tiền và tiền giảm bằng số đó

#### Scenario: Goods
- **WHEN** đêm trộm lấy hàng
- **THEN** số món trên kệ giảm không quá mức tối đa, sổ cái ghi giá vốn và số món, tiền không đổi

### Requirement: Police cases
Khi bật báo công an và có mất mát, hệ thống SHALL mở hồ sơ có ngày có kết quả sau 2 đến 5 ngày; tới hạn, bắt được SHALL trả lại giá trị vụ mất vào tiền và sổ cái thu hồi, không bắt được SHALL đóng hồ sơ; tắt báo công an SHALL không mở hồ sơ; camera SHALL tăng khả năng bắt được.

#### Scenario: Caught
- **WHEN** hồ sơ 40.000 đ tới hạn và bắt được
- **THEN** tiền tăng 40.000, sổ cái thu hồi 40.000 và hồ sơ được xóa

#### Scenario: Not caught
- **WHEN** hồ sơ tới hạn và không bắt được
- **THEN** sự cố ghi đóng hồ sơ và không có thu hồi
