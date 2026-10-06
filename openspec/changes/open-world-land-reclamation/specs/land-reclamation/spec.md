# Spec Delta

## Purpose

Vùng chơi lớn dần theo các đợt khai hoang định sẵn; lô mới được mua theo giá vị trí; vị trí ảnh hưởng lượng khách; khu phố đông dần theo tiến độ.

## ADDED Requirements

### Requirement: Reclamation waves as data
Mỗi đợt SHALL khai báo vùng ô, hạ tầng, lô, điều kiện cấp/tiền và thời gian thi công; mọi vùng đợt SHALL nằm trong `WORLD_BOUNDS` và không chồng nhau.

#### Scenario: Waves fit the world
- **WHEN** kiểm dữ liệu `RECLAMATION_WAVES`
- **THEN** mọi vùng nằm trong 120×80, không chồng nhau, mọi lô có mặt tiền phía bắc một đường có sẵn

### Requirement: Reclaim command
`reclaim_wave` SHALL kiểm cấp và tiền, trừ tiền một lần, đưa đợt vào thi công 2 ngày game và mở vùng chơi vào đầu ngày hoàn thành; idempotent theo `commandId`.

#### Scenario: Wave opens after construction
- **WHEN** mở W1 ở ngày 10
- **THEN** ngày 10–11 có công trường, vùng chưa đi vào được; đầu ngày 12 vùng W1 đi được và có 3 lô rao bán

### Requirement: Parcel purchase
Lô của đợt mới SHALL phải mua bằng `buy_parcel` với giá `PARCEL_BASE_PRICE × số ô × landValueMultiplier` trước khi đặt tòa; lô W0 SHALL coi như đã sở hữu.

#### Scenario: Place on unowned parcel
- **WHEN** đặt tòa vào lô W1 chưa mua
- **THEN** bị từ chối với `parcel_not_owned`

### Requirement: Location value
Nhịp sinh khách của tòa phụ SHALL nhân với hệ số khách của lô tòa đứng; tòa ở W0 SHALL có hệ số 1.

#### Scenario: Corner beats side street
- **WHEN** mô phỏng 7 ngày cùng quán nước ở lô góc W1, lô mặt đường chính và lô mặt đường nam
- **THEN** số khách góc > mặt đường chính > đường nam

### Requirement: City growth
`cityTier` SHALL tăng đơn điệu theo số đợt và tòa đã mở, và SHALL chỉ đổi cảnh quan (ngân sách NPC/xe, số tầng nhà trang trí), không đổi kinh tế.

#### Scenario: Denser city
- **WHEN** từ tier 0 lên tier 3
- **THEN** trần NPC nền và xe ở cùng chất lượng tăng, doanh thu mô phỏng có hạt giống cố định không đổi vì tier

### Requirement: Performance budget
Renderer SHALL chỉ dựng ô của các khối giao khung nhìn; FPS đo ở zoom xa nhất với W0–W2 SHALL không thấp hơn 80% mức trước change.

#### Scenario: Large map frame rate
- **WHEN** mở W0–W2 và zoom 0,5× trên máy dev
- **THEN** FPS đo được ghi vào `tổng hợp.md` và đạt ngưỡng
