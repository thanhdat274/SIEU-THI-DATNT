# Spec Delta

## Purpose

Làm giá bán phản ứng với khách và thị trường: độ nhạy giá quyết định khách có chấp nhận giá, và giá tham chiếu trôi dần theo khan hiếm, tồn kho, sự kiện.

## ADDED Requirements

### Requirement: Price sensitivity
Mỗi nhóm/thẻ sản phẩm SHALL có độ nhạy giá cấu hình. Khi giá người chơi đặt cao hơn giá tham chiếu, xác suất khách lấy hàng SHALL giảm theo độ nhạy; khi bằng hoặc thấp hơn, xác suất SHALL không giảm và MAY tăng nhẹ nhu cầu trong dải cấu hình. Việc người chơi chọn giá thuộc capability `shop-pricing` của change `stardew-inspired-management-loop`; capability này chỉ dùng giá đó.

#### Scenario: High price lowers purchases
- **WHEN** giá một món đặt cao hơn giá tham chiếu và món có độ nhạy giá cao
- **THEN** trong nhiều khách tỉ lệ lấy món giảm nhiều hơn món có độ nhạy thấp

#### Scenario: Low price volume strategy
- **WHEN** giá đặt thấp hơn giá tham chiếu
- **THEN** nhu cầu món tăng không vượt trần cấu hình và biên lãi trên mỗi đơn vị giảm tương ứng

#### Scenario: Three strategies distinguishable
- **WHEN** cùng một ngày mô phỏng với giá thấp, bình thường và cao cho cùng một món
- **THEN** số lượng bán, doanh thu và lãi gộp khác nhau theo thứ tự hợp lý và người chơi thấy số liệu đó trong báo cáo

### Requirement: Gradual reference price
Giá tham chiếu bán lẻ mỗi nhóm SHALL thay đổi từng bước theo ngày dựa trên chi phí nhập, mức khan hiếm, tồn kho của tiệm, sự kiện và nhu cầu, với mức đổi tối đa mỗi ngày cấu hình. Hệ thống SHALL NOT thay đổi giá tham chiếu tức thì theo một sự kiện.

#### Scenario: Step limit
- **WHEN** sự kiện làm mục tiêu giá tăng 40%
- **THEN** giá tham chiếu tăng không quá mức tối đa mỗi ngày và tiến dần tới mục tiêu qua nhiều ngày

#### Scenario: Return to baseline
- **WHEN** sự kiện kết thúc
- **THEN** giá tham chiếu giảm dần về mức nền, không nhảy ngay

### Requirement: Scarcity and inventory influence
Khi tồn kho tiệm của món dưới ngưỡng cấu hình và nhu cầu cao, khan hiếm SHALL làm tăng giá mà khách sẵn sàng trả trong dải cấu hình; khi tồn vượt ngưỡng và bán chậm, SHALL giảm. Người chơi vẫn tự quyết giá bán cuối cùng trong dải cho phép.

#### Scenario: Scarce hot item
- **WHEN** món đắt khách gần hết hàng
- **THEN** giá tham chiếu hiển thị tăng nhẹ và người chơi thấy lý do khan hiếm

#### Scenario: Player price still bounded
- **WHEN** người chơi đặt giá ngoài dải
- **THEN** giá bị kẹp vào dải và giá áp dụng được trả về
