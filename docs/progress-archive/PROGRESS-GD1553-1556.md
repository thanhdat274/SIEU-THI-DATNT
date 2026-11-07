# Lưu trữ GĐ1553–1556

- **GĐ1556** — Xếp thẻ điện thoại (cẩm nang HappyTown "giao được trước / sắp hết giờ"): đơn đang giao lên đầu theo hẹn gần nhất, rồi cuộc gọi đủ hàng, rồi thiếu hàng; cùng nhóm sắp hết giờ trước (`src/data/phoneSort.ts`). Chỉ giao diện. Test phoneSort.test.ts.
- **GĐ1555** — Quà điểm danh cuối tuần (cẩm nang HappyTown "cuối tuần thưởng nhiều hơn"): thứ 7/CN cấp ≥37 tiền quà +25%, XP giữ nguyên (`src/data/weekendGift.ts`). Test weekendGift.test.ts.
- **GĐ1554** — Huy hiệu thông thạo ở kệ: khi chọn hàng bày, gợi ý món ghép 🥉/🥈/🥇 theo bậc thông thạo (cấp ≥36, `masteryBadge`). Test sellMastery.test.ts.
- **GĐ1553** — Thông thạo món bán (Xóm B5): bán 1 món cả ván 200/1.000/4.000 lần → báo 🥉/🥈/🥇 (cấp ≥36), đọc từ `soldEver` sẵn có, không thêm tiền/XP/save (`src/data/sellMastery.ts`). Test sellMastery.test.ts.
