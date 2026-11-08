## 1. Data layer

- [ ] 1.1 Thêm `SUBSTITUTE_CHANCE` + `chooseSubstitute(want, shelf, priceOf, hotIds, rng)` thuần (ưu tiên cùng phân loại → hot → thứ tự tầng; giá ≤ món muốn; cổng xác suất simRng).
- [ ] 1.2 Test unit helper: có ứng viên cùng loại ưu tiên trước; ứng viên đắt hơn bị loại; kệ trống → null; cổng xác suất chặn; tất định với cùng seed.

## 2. Agent khách

- [ ] 2.1 Nhánh `takeFromShelf(want) === null` trong `src/agents/customers.ts`: gọi `chooseSubstitute` với kệ đang đứng (chỉ khi `shelfUid` hợp lệ); thay thành công → vào giỏ + `pullCombo` + bong bóng "🔄 Lấy món này thay!"; thất bại → giữ nguyên noteMiss.
- [ ] 2.2 `stats.substituted` tăng khi thay thành công (mẫu clawWins GĐ1592).
- [ ] 2.3 Test: khách thay món khi kệ còn món rẻ hơn cùng kệ; không thay khi kệ trống/không kệ; không thay khi tất cả đắt hơn; giỏ lớn vẫn bỏ giỏ; save cũ không có `substituted` nạp OK; tất định cùng seed.

## 3. Phản hồi UI (nhỏ)

- [ ] 3.1 Thẻ "Vì sao khách không mua · nên làm gì" trong tổng kết thêm dòng "🔄 Đã cứu X lượt nhờ khách nhận món thay — vẫn nên châm kệ đủ" (chỉ hiện X > 0, ≤ 90 ký tự).
- [ ] 3.2 Test: dòng hiện/ẩn theo X; độ dài ≤ 90.

## 4. Kinh tế & guard

- [ ] 4.1 Chạy lại `reviewR2Day1` → hạ trần theo mức đo mới (chỉ được giảm từ 17).
- [ ] 4.2 Chạy `economySim` (L1 ngày 1 + L5 30 ngày) và kiểm `economySimL50` biên daily_smile — test nào assert cứng số bị lệch thì cập nhật kèm lý do hiểu rõ (không nâng trần máy móc).
- [ ] 4.3 Ghi mức đo SUBSTITUTE_CHANCE + số lỡ-bán mới vào PROGRESS.md.

## 5. QA & hoàn tất

- [ ] 5.1 QA chơi đơn: ngày 1 save trắng — thấy khách nói "🔄 Lấy món này thay", tổng kết hiện dòng đã cứu, không có thông báo mới vượt ngân sách.
- [ ] 5.2 QA co-op (cần người dùng đăng nhập): cùng chuỗi khách ra kết quả giống chơi đơn (máy chạy mô phỏng).
- [ ] 5.3 `npm run test` xanh toàn bộ, `npm run build` sạch, `npm run check:bundle` đạt.
- [ ] 5.4 Soi trong game ở mức đồ họa Thấp: không thêm hiệu ứng nặng (chỉ bubble text sẵn có).
