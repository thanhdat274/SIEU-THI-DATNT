# Design

## D1 — Quầy không nguyên liệu
`planStallDay`, `sellStalls` và `processStalls` đã chạy đúng với `ingredients: []` (vòng kiểm nguyên liệu dùng `some` trên mảng rỗng). Vốn mỗi vé nằm trong `cashCostPerServing` và được ghi vào giá vốn (`cogs`) như quầy cũ. Không đổi `StallState` hay lệnh server, nên không cần migrate save.

## D2 — Giờ ngừng bán theo quầy
`sellUntilHour?: number` (giữ 08:00 làm giờ mở chung, `STALL_FIRST_HOUR`). Số khung của quầy = `(sellUntilHour ?? 22) - 8`. Trong `sellStalls`, mục tiêu cộng dồn của quầy = `nhu cầu × min(khung toàn cục, khung quầy) / khung quầy`. `progress.slots` vẫn theo thang 14 nên save đang dở ngày vẫn nạp được. Quầy cũ có khung quầy = 14, công thức trùng cũ.

## D3 — Biển HẾT
Quầy "hết" khi `sellUntilHour` đã qua trong ngày, hoặc đã bán đủ nhu cầu hôm nay. Quầy không có `sellUntilHour` không bao giờ hiện HẾT (bán tới 22:00, nguyên liệu thiếu đã có báo cáo riêng). Lõi tính `getSoldOutStalls()` và phát `onStallStatusChanged(ids)` khi tập thay đổi (so khóa chuỗi, gọi mỗi lần đồng hồ đổi, sau khi mua quầy và khi khởi tạo). Renderer giữ tập id gần nhất để vẽ lại biển sau khi dựng lại quầy (`updateTileMap`).

## D4 — Vị trí
Ô trống trên vỉa hè y=12 chọn bằng kiểm tra hình học (không chồng quầy khác, chỗ đỗ xe máy/ô tô, bãi bốc dỡ, cửa tiệm) và xác nhận bằng ảnh chụp trong game.

## D5 — Kinh tế (provisional)
Giá vé 10.000, vốn 8.800 (hoa hồng ~12%), 45–80 vé/ngày, hoàn vốn ~3–5 ngày. Chưa playtest; chỉnh qua `balance-audit.ts`.
