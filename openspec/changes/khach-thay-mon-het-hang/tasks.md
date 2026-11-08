## 1. Data layer

- [x] 1.1 Thêm `SUBSTITUTE_CHANCE` + `chooseSubstitute(want, shelf, priceOf, hotIds, rng)` thuần (ưu tiên cùng phân loại → hot → thứ tự tầng; giá ≤ món muốn; cổng xác suất simRng).
- [x] 1.2 Test unit helper: có ứng viên cùng loại ưu tiên trước; ứng viên đắt hơn bị loại; kệ trống → null; cổng xác suất chặn; tất định với cùng seed.

## 2. Agent khách

- [x] 2.1 Nhánh `takeFromShelf(want) === null` trong `src/agents/customers.ts`: gọi `chooseSubstitute` với kệ đang đứng (chỉ khi `shelfUid` hợp lệ); thay thành công → vào giỏ + `pullCombo` + bong bóng "🔄 Lấy món này thay!"; thất bại → giữ nguyên noteMiss.
- [x] 2.2 `stats.substituted` tăng khi thay thành công (mẫu clawWins GĐ1592).
- [x] 2.3 Test: khách thay món khi kệ còn món rẻ hơn cùng kệ; không thay khi kệ trống/không kệ; không thay khi tất cả đắt hơn; giỏ lớn vẫn bỏ giỏ; save cũ không có `substituted` nạp OK; tất định cùng seed.

## 3. Phản hồi UI (nhỏ)

- [x] 3.1 Thẻ "Vì sao khách không mua · nên làm gì" trong tổng kết thêm dòng "🔄 Đã cứu X lượt nhờ khách nhận món thay — vẫn nên châm kệ đủ" (chỉ hiện X > 0, ≤ 90 ký tự).
- [x] 3.2 Test: dòng hiện/ẩn theo X; độ dài ≤ 90.

## 4. Kinh tế & guard

- [x] 4.1 Chạy lại `reviewR2Day1` → hạ trần theo mức đo mới (chỉ được giảm từ 17).
- [x] 4.2 Chạy `economySim` (L1 ngày 1 + L5 30 ngày) và kiểm `economySimL50` biên daily_smile — test nào assert cứng số bị lệch thì cập nhật kèm lý do hiểu rõ (không nâng trần máy móc).
- [ ] 4.3 Ghi mức đo SUBSTITUTE_CHANCE + số lỡ-bán mới vào PROGRESS.md.

## 5. QA & hoàn tất

- [x] 5.1 QA chơi đơn: ngày 1 save trắng — luồng xác thực bằng sim trên store+agent thật (substituteFlow.test: thay 12 lượt, lỡ 17→11, doanh thu tăng, 0 lỗi console khi boot + setup trong browser; bubble là hệ text-sprite sẵn có — cửa sổ game không focus nên không soi bubble trực tiếp được, để QA người dùng xác nhận khi chơi).
- [ ] 5.2 QA co-op (cần người dùng đăng nhập): cùng chuỗi khách ra kết quả giống chơi đơn (máy chạy mô phỏng).
- [x] 5.3 `npm run test` xanh toàn bộ, `npm run build` sạch, `npm run check:bundle` đạt.
- [x] 5.4 Soi: không thêm hiệu ứng/đối tượng nặng mới — chỉ dùng bong bóng thoại text-sprite sẵn có của agent khách (không đụng GFX_PRESETS, không biên dịch lại shader).
