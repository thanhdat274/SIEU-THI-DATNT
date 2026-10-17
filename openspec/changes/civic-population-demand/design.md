# Design: civic-population-demand

## D1. Sức chứa
`districtCapacity(khu)` = Σ ô lô nhà dân đã mở của khu × `RESIDENTS_PER_TILE` (dữ liệu). Khu chưa khai hoang = 0.
`targetPopulation = capacity × (0.6 + 0.6 × qol/100)`.

## D2. Cập nhật ngày
Đầu ngày (`advanceToNextDay`): `pop += clamp(target − pop, −3% pop, +3% pop)`, làm tròn tất định.
Migration: thiếu `civic` → khởi tạo `pop = target` ứng với QoL cơ bản (20), để ngày đầu sau cập nhật lưu lượng không nhảy.

## D3. Nối cầu
`populationTrafficFactor = clamp(pop / baselinePop, 0.85, 1.25)`, `baselinePop` = giá trị khởi tạo ở D2 ⇒ save cũ có factor = 1.0.
Truyền qua `DemandInput` dưới dạng tham số; tích hệ số khu × cụm × dân số dùng chung một trần khai báo rõ (mở rộng `DISTRICT_MULTIPLIER_CAP` hoặc trần mới, ghi vào `tổng hợp.md`).

## D4. Cân bằng
Sweep 90 ngày: không công trình / mỗi loại một cái / spam. Tiêu chí: doanh thu tăng có trần (≤ +25%), hoàn vốn công trình 20–60 ngày, không có vòng lặp dương mất kiểm soát.

## D5. Tất định
Thuần số học trên save; server replay giống client.

## Co-op (bổ sung 16/10/2026)
- Bước dân số chạy một lần ở server đầu ngày; snapshot chứa `populationByDistrict`. Hệ số khách dùng giá trị từ snapshot, không tính lại ở client.
- Không có lệnh mới, không cần quyền/phiếu.
