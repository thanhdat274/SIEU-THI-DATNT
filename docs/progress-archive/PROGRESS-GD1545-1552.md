# Lưu trữ GĐ1545–1552

- **GĐ1552** — "Bạn có biết?" (Xóm B10): dải mẹo xoay 30 phút game trên HUD, lọc theo cấp (`src/data/tips.ts`), nút ✕ ẩn trong phiên (không vào save). Đã thấy hiện trên save khách mới. Test tips.test.ts.
- **GĐ1551** — Máy chụp ảnh lấy liền (máy thu phí thứ 7, cấp 50): 300k, 3.000đ/lượt, hoàn vốn 100 lượt. Test machines.test.ts.
- **GĐ1550** — Audit 1541–1549 + QA save trắng (IndexedDB trống trước/sau): bán món đầu ~38 giây game sau mở cửa; máy kẹo bông + đánh giày ở cấp 46 mỗi máy thu 1 lượt đúng giá. Sửa từ audit: dòng thông tin máy ghi thêm "cuối tuần ×1,5" cho gắp thú/kẹo bông. Máy thu phí gom hết ở machines.ts, không trùng.
- **GĐ1549** — Kẹo bông cuối tuần: máy kẹo bông cũng ×1,5 phí thứ 7/CN như gắp thú (máy của trẻ con). Test machines.test.ts.
- **GĐ1548** — Máy kẹo bông (máy thu phí thứ 6, cấp 46): 250k, 2.500đ/lượt, hoàn vốn 100 lượt. Test machines.test.ts.
- **GĐ1547** — Máy đánh giày (máy thu phí thứ 5, cấp 42): 200k, 2.000đ/lượt, hoàn vốn 100 lượt (danh sách máy tham khảo có máy đánh giày). Test machines.test.ts.
- **GĐ1546** — Nộp phạt đàng hoàng có XP: chọn nộp đủ biên bản vệ sinh ở cấp ≥35 được XP = 0,2% tiền phạt (`finePaidXp`, đối chiếu thanh tra tham khảo 0,05–0,5%). Test finePaidXp.test.ts.
- **GĐ1545** — Nhà phê bình lên sóng: phục vụ kịp ở giai đoạn nghiêm ngặt (cấp ≥45) thêm 3 đánh giá 5★, đối xứng với 3 đánh giá 1★ khi hụt hẹn (`criticPraiseReviews`). Test criticPraise.test.ts.
