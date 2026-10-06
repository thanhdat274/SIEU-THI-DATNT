# Proposal

## Why

Phân tích 05/10/2026 (đối chiếu hai ảnh game tham khảo) cho thấy nhóm "bắp xào, cá viên chiên, bánh tráng trộn" hợp làm một tòa nhà nhỏ chứ không phải quầy vỉa hè: cần trạm nấu riêng, kệ, thu ngân và chỗ ngồi như tiệm xôi và quán nước. Game đã có sẵn khung nhiều tòa nhà (`BUILDINGS`, `buy_plot`, dòng khách riêng từng tòa), nên thêm tòa thứ tư chủ yếu là dữ liệu. Quầy vé số vỉa hè (`ve-so-stall`) là việc riêng, không đụng nhau.

## What Changes

- Tòa nhà thứ tư `snack` "Quán ăn vặt", **không nới bản đồ**: chen vào khoảng trống x=21..26 giữa cánh đông tiệm chính (chung tường x=21 khi mua đủ hai cánh) và quán nước (chung tường x=26). Sàn trong 4×6 ô (nhỏ nhất, "bé trước"); cửa x=22..23; hai mảnh mở rộng bắc (+3 hàng mỗi mảnh) là phần nâng cấp.
- Mua bằng `buy_plot` (cấp 26, 400.000 ₫; mảnh bắc cấp 28/30, 150.000/250.000 ₫), bố cục mặc định: chảo xào, chảo chiên, kệ, bàn, thu ngân. Không đổi schema save, không thêm lệnh server.
- Hai trạm mới `chao_xao` và `chao_chien` (`allowedBuildings: ['snack']`), hai món mới `bap_xao_tp`, `ca_vien_chien_tp` và ba công thức (gồm bánh tráng trộn dùng lại ở chảo xào). `SNACK_SHOP_PRODUCT_IDS`: kệ quán ăn vặt chỉ tự nhận các món này.
- Liên kết giữa các quán (đợt đầu, rẻ): (1) luật gọi thêm `snack` trong `DINING_ADD_ON_RULES` (trà đá, nước mía), (3) cụm ẩm thực: số tòa phụ đang mở nhân nhịp sinh khách các tòa phụ (`FOOD_CLUSTER_TRAFFIC_MULTIPLIER`).
- Hiển thị: tường, mặt tiền, biển `sign_snack`, mái hiên, đèn, khu trú mưa, bảng sàn trong `StoreLayoutModal`, bộ lọc kệ trong `StorePlanogramModal`; icon 16×16 cho hai món mới.

## Capabilities

### New Capabilities

- `snack-shop-building`: tòa nhà quán ăn vặt, trạm chảo, món/công thức, gọi thêm và cụm ẩm thực.

### Modified Capabilities

- Không có spec chính sửa.

## Non-goals

- Chưa làm: khách chuyền tòa (`CROSS_SELL_RULES`, phải sửa `customers.ts`), nguyên liệu dùng chung có chủ đích, khách quen Bé Na ghé quán ăn vặt, khung giờ bổ trợ giữa các quán, nhân viên riêng cho quán ăn vặt, gộp `BuildingId` thành bảng dữ liệu.
- Chưa cân bằng kinh tế: mọi số liệu (cấp, giá, `SNACK_TRAFFIC_SHARE`, hệ số cụm) là đề xuất.
