# Proposal: Phí xóm và chi phí duy trì công trình

Change con 3/5 của `neighborhood-builder-expansion`. Cần `civic-buildings-qol`.

## Why
Công trình công cộng cần chi phí đều để có đánh đổi, và người chơi cần thấy rõ tiền đi đâu. Plan cũ thêm thuế tài sản + thuế doanh nghiệp 5% — trùng với GTGT/TNCN đã có ở `game-core/src/tax/` và với tiền thuê lô (`rent`).

## What Changes
- **Duy trì công trình**: mỗi công trình trừ `upkeepPerDay` mỗi ngày từ quỹ chung.
- **Phí vệ sinh/an ninh xóm**: phí cố định nhỏ theo số ô lô **sở hữu** (lô thuê đã trả `rent` nên không thu thêm), giảm khi khu có QoL cao.
- Sổ cái: thêm `LedgerEntryType` `'civic_upkeep'` và `'civic_fee'`, gắn `buildingInstanceId`; đưa vào `DailyRecord`, báo cáo theo tòa, tổng kết ngày.
- Thiếu tiền: dùng cơ chế nợ đang có của thuê lô, không tạo luật nợ mới.

## Không làm
Không thuế tài sản/thuế doanh nghiệp mới; không ngân sách thành phố riêng; không đổi hệ thuế GTGT/TNCN.
