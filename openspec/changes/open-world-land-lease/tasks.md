# Tasks

Trạng thái 05/10/2026: mới có kế hoạch, chưa có code. Phụ thuộc `open-world-land-reclamation` xong; có thể song song `open-world-building-types`.

## 1. Dữ liệu và luật

- [ ] 1.1 `ParcelTenure`, `LEASE_DAILY_RATE`, `LEASE_CREDIT_RATE`, `tierFactor`, `NEARBY_BONUS`, trần (provisional).
- [ ] 1.2 `parcelPrice(save, parcelId)` dùng chung client/server; test đơn điệu và trần.

## 2. Core

- [ ] 2.1 Lệnh `lease_parcel`, `end_lease`, `pay_rent_debt`; mua lô đang thuê có khấu trừ.
- [ ] 2.2 Thu tiền thuê đầu ngày (`processedRentDayIds`), nợ, `closedForRent` (dùng lại trạng thái đóng của thi công).
- [ ] 2.3 Mô phỏng tiến độ 60 ngày với giá động; chỉnh số provisional.

## 3. Save, server, giao diện

- [ ] 3.1 Schema 10 + migration 9→10; test.
- [ ] 3.2 Server phát lại các lệnh mới; quyền/phiếu theo Bước 5.
- [ ] 3.3 UI quy hoạch: nút Thuê/Mua, giá hiện tại + xu hướng; bản tin sáng có tiền thuê/nợ; cảnh báo trước khi đóng tòa.

## 4. Kiểm chứng và tài liệu

- [ ] 4.1 `yarn typecheck`, `yarn test`, `yarn build` PASS (kết quả thật); Browser QA theo tiêu chí proposal.
- [ ] 4.2 Cập nhật `tổng hợp.md`, `TASKS.md`, `ROADMAP.md`.
