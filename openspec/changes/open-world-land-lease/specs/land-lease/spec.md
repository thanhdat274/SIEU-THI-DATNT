# Spec Delta

## Purpose

Lô đất có thể thuê theo ngày, chuyển sang mua có khấu trừ, và giá đất thay đổi theo độ phát triển của thành phố.

## ADDED Requirements

### Requirement: Leasing
Lô chưa sở hữu SHALL thuê được bằng `lease_parcel`; lô thuê SHALL dùng được để đặt tòa như lô sở hữu.

#### Scenario: Place on leased parcel
- **WHEN** thuê lô góc W1 rồi đặt quán nước
- **THEN** lệnh đặt hợp lệ, lô ghi `leasedBy` và ngày bắt đầu

### Requirement: Daily rent
Tiền thuê SHALL thu một lần mỗi sáng bằng `parcelPrice × LEASE_DAILY_RATE`, ghi sổ cái loại `rent`.

#### Scenario: No double charge
- **WHEN** nạp lại save giữa buổi sáng đã thu tiền thuê
- **THEN** ngày đó không thu lần hai

### Requirement: Rent debt
Thiếu tiền thuê SHALL cộng nợ; nợ từ 3 ngày SHALL đóng tòa trên lô cho tới khi trả nợ, không phá tòa hay mất nội thất.

#### Scenario: Closed for rent
- **WHEN** không đủ tiền thuê 3 ngày liên tiếp
- **THEN** sáng ngày thứ 3 tòa đóng cửa; trả nợ xong tòa mở lại với nội thất và hàng còn nguyên

### Requirement: Buy out lease
Mua lô đang thuê SHALL khấu trừ `min(paidTotal × LEASE_CREDIT_RATE, 50% giá)`.

#### Scenario: Credit applied
- **WHEN** đã trả 200.000 ₫ tiền thuê và giá lô hiện 1.000.000 ₫
- **THEN** giá mua thực là 900.000 ₫

### Requirement: Dynamic land price
Giá lô SHALL tăng đơn điệu theo `cityTier` và số tòa đang mở trong 16 ô, có trần ×2,5; client và server SHALL dùng cùng hàm.

#### Scenario: Price rises with city
- **WHEN** `cityTier` từ 1 lên 3, cùng lô, cùng số tòa lân cận
- **THEN** giá lô tăng và không vượt 2,5 lần giá gốc
