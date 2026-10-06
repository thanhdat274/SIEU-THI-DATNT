# Design: Thuê đất và giá đất động

## Bối cảnh

Sau Bước 4: `storeLayout.ownedParcelIds`, `buy_parcel`, giá = `PARCEL_BASE_PRICE × số ô × landValueMultiplier`, `cityTier` 0..5 chỉ đổi cảnh quan. Sau Bước 5: bản ghi lô có `boughtBy`, lệnh lớn có phiếu co-op. Đã có cơ chế nợ lương (`wageDebt`, `pay_wage_debt`, `processedPayrollDayIds`) và trừ tiền đầu ngày, có thể dùng làm khuôn cho tiền thuê.

## Quyết định

### D1. Trạng thái lô

`ParcelTenure = { kind: 'owned', boughtBy, day } | { kind: 'leased', leasedBy, sinceDay, paidTotal, debtDays }`. Lô W0 luôn `owned`. `validatePlacement` chấp nhận `owned` hoặc `leased`.

### D2. Giá thuê

`dailyRent = parcelPrice × LEASE_DAILY_RATE` (0,02/ngày, provisional, tức hòa vốn mua sau ~50 ngày). Thu đầu ngày cùng chỗ trả lương; sổ cái loại `rent` có `buildingInstanceId` nếu lô có tòa. Mỗi ngày chỉ thu một lần (`processedRentDayIds`, giống `processedPayrollDayIds`).

### D3. Nợ tiền thuê

Không đủ tiền: `debtDays += 1`, cộng vào `rentDebt`. `debtDays ≥ 3`: tòa trên lô vào trạng thái `closedForRent` (cửa chặn, không sinh khách, nhân viên chờ ở kho, giống trạng thái thi công Bước 3). Trả nợ (`pay_rent_debt`) mở lại ngay. Không bao giờ tự phá tòa hay thu hồi nội thất.

### D4. Mua lô đang thuê

Giá mua thực = giá hiện tại − `min(paidTotal × LEASE_CREDIT_RATE, 50% giá)` (`LEASE_CREDIT_RATE` 0,5, provisional). Chuyển `leased` → `owned`.

### D5. Trả lại lô

`end_lease { parcelId }`: chỉ khi không có tòa trên lô và không nợ. Có tòa thì UI gợi ý dời tòa (Bước 3) trước.

### D6. Giá đất động

`parcelPrice(day) = base × số ô × landValueMultiplier × tierFactor[cityTier] × (1 + NEARBY_BONUS × số tòa đang mở trong 16 ô)`, với `tierFactor = [1, 1.1, 1.25, 1.45, 1.7, 2]`, `NEARBY_BONUS = 0,05`, trần ×2,5 (provisional). Giá tính tại thời điểm lệnh; server dùng cùng hàm, client hiển thị giá hiện tại và xu hướng (mũi tên).

### D7. Co-op

Thuê và mua lô dùng quyền/phiếu của Bước 5 (thuê coi như chi nhỏ, không cần phiếu; mua theo ngưỡng). `leasedBy` ghi người thuê. Tiền thuê trừ từ quỹ chung.

### D8. Save schema 10

`ownedParcelIds` thành bản ghi `ParcelTenure`; `rentDebt`, `processedRentDayIds`. Migration 9→10: mọi lô đã sở hữu thành `owned`. Số schema 9/10 giả định `open-world-building-types` merge trước; nếu change này merge trước thì đổi chỗ số, migration giữ độc lập (mỗi bên chỉ đụng trường của mình).

## Rủi ro

- **Vòng xoáy nợ** làm người chơi mất hứng: đóng tòa chứ không phá; cảnh báo trước 1 ngày; tiền thuê hiển thị trong bản tin sáng.
- **Giá tăng quá nhanh** khóa người chơi khỏi đợt sau: trần ×2,5 và mô phỏng tiến độ 60 ngày trước khi chốt.
