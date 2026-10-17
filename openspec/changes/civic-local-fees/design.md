# Design: civic-local-fees

## D1. Thời điểm
Trừ trong cùng bước đầu ngày với tiền thuê lô (giữ thứ tự cố định để replay ổn định): thuê lô → duy trì → phí xóm.
Phí xóm chạy SAU `initDailyRecord(day)` để `civicUpkeep`/`civicFee` nằm trong bản ghi của đúng ngày bị trừ (khớp `day` của ledger, bản tin sáng đọc được). Tiền thuê lô vẫn chạy trước khi chốt ngày cũ nên `rentCost` đang rơi vào bản ghi hôm trước — lỗi có sẵn từ `open-world-land-lease`, chưa sửa ở change này.

## D2. Công thức
`civicFee = OWNED_TILE_FEE × ownedTiles × (1 − 0,3 × qol/100)`, làm tròn **100 ₫** (đổi từ nghìn: phí mỗi lô chỉ ~1–3 nghìn, làm tròn nghìn xóa mất phần giảm theo QoL); QoL lấy theo khu của từng lô.
`civicUpkeep = Σ CIVIC_DEFS[type].upkeepPerDay`.

## D3. Sổ cái
`LedgerEntryType` thêm `'civic_upkeep' | 'civic_fee'`; `DailyRecord` thêm `civicUpkeep?`, `civicFee?` (tùy chọn ⇒ save cũ hợp lệ); `netProfit` trừ cả hai.
Không cần mảng `taxRecords[]` riêng như plan cũ — dữ liệu đã nằm trong `DailyRecord` và ledger.

## D4. Nợ (cập nhật 16/10/2026 — review)
Tách riêng nợ phí xóm (`civicDebt` + `civicDebtDays`) khỏi nợ thuê (`debtDays`).

- **`debtDays`**: CHỈ tăng khi thiếu tiền thuê lô (luật cũ, không đổi).
- **`civicDebt`** (số tiền, cộng đúng một lần mỗi khoản trượt) + **`civicDebtDays`** (tối đa +1 mỗi lô mỗi ngày dù trượt nhiều khoản; ngày trả đủ thì −1).
- **KHÔNG đóng cửa tiệm chính (lot-center) hoặc bất kỳ tòa nào vì nợ phí xóm** — tránh chết spiral: đóng cửa → hết doanh thu → không trả được phí. Thay thế hiện tại: chỉ cảnh báo (toast). Phạt QoL khi nợ kéo dài CHƯA làm — để Bước 4/5 nếu cần.
- **`payRentDebt`**: tiền thuê = `debtDays × dailyRent` (chỉ lô thuê) + `civicDebt`; không được tính ngày nợ phí xóm thành ngày nợ thuê. Khi trả đủ, nợ giảm theo đúng luật của từng loại.

## D5. Cân bằng
Mục tiêu: hoàn vốn (b) 20–60 ngày, phí + duy trì ≤ ~5% doanh thu ngày. Chốt bộ E (16/10/2026): park 2,5M / 10k; clinic 4M / 15k; ward_police 1,8M / 12,5k; primary_school 3M / 20k. Sweep 3 seed × 90 ngày: hoàn vốn 20 ngày (cấp 15), 50 ngày (cấp 25), phí ≤ 2,8% doanh thu. Chi tiết: `tổng hợp.md` khối BƯỚC 3.

### Co-op (bổ sung 16/10/2026)
- Phí/duy trì chỉ trừ ở server đầu ngày, từ quỹ chung (quyết định 6c). Không có lệnh mới.
- Nợ do phí: thông báo cho cả hai người; người offline thấy ở tổng kết ngày.
