# Design: civic-local-fees

## D1. Thời điểm
Trừ trong cùng bước đầu ngày với tiền thuê lô (giữ thứ tự cố định để replay ổn định), sau khi tính QoL ngày.

## D2. Công thức
`civicFee = OWNED_TILE_FEE × ownedTiles × (1 − 0.3 × qol/100)`, làm tròn nghìn đồng; QoL lấy theo khu của từng lô.
`civicUpkeep = Σ CIVIC_DEFS[type].upkeepPerDay`.

## D3. Sổ cái
`LedgerEntryType` thêm `'civic_upkeep' | 'civic_fee'`; `DailyRecord` thêm `civicUpkeep?`, `civicFee?` (tùy chọn ⇒ save cũ hợp lệ); `netProfit` trừ cả hai.
Không cần mảng `taxRecords[]` riêng như plan cũ — dữ liệu đã nằm trong `DailyRecord` và ledger.

## D4. Nợ
Tái dùng luồng nợ của `land-lease-sim.ts`; thêm test trường hợp thiếu tiền.

## D5. Cân bằng
Kiểm trong sweep của `civic-population-demand`: phí + duy trì không vượt ~5% doanh thu ngày của tiệm cỡ trung.

## Co-op (bổ sung 16/10/2026)
- Phí/duy trì chỉ trừ ở server đầu ngày, từ quỹ chung (quyết định 6c). Không có lệnh mới.
- Nợ do phí: thông báo cho cả hai người; người offline thấy ở tổng kết ngày.
