# Chi tiết GĐ840–854 (lưu trữ)

- GĐ840 (rà soát Leader+Designer): 2943 test xanh; thông báo dài nhất 90, 0 vượt; HUD ≤20 nút; chunk 252/255 KB. Còn mở: FPS ≥30 gfx Low cần đo khi pane hiện; QA chơi chung cần server (cấm).
- GĐ841: thử đo lại FPS: rAF không chạy dù visibilityState=visible (cửa sổ app không ở tiền cảnh), game.perf tụt 13,7 do throttle → số đo ở môi trường này không đáng tin; cần đo trên máy thật khi cửa sổ ở tiền cảnh.
- GĐ842: autoplay 1 ngày trên save QA ngày 100 mất 4,7 s CPU (tab nền, gồm bot) — chỉ là mốc so sánh cho lần sau, chưa quy ra ms/khung.
- GĐ843: thêm hudMobileCss.test.ts khoá chip ≥36 px và trần max-height dải cảnh báo mobile.
- GĐ844: rà backlog: còn lại chỉ nợ refactor UI (ReportPanels/BusinessPanel — luật: chỉ tách khi đụng panel), đo FPS thật (cần cửa sổ tiền cảnh) và QA chơi chung (cần server). Không có việc chơi sâu mới đã duyệt; chờ người dùng chọn hướng mở rộng.
- GĐ845: playtest 3 ngày trên save bot ngày 100: tiền −9→−11,5 triệu, 0 doanh thu, 100% khách bất mãn (kệ trống, lương+thuê trừ vô điều kiện ở endDay.ts:458). Là xoáy nợ của bot (đã biết GĐ817), người chơi thật có cảnh báo lương + vay gấp/vay thêm (biz.ts takeLoan). Chưa thêm cơ chế cứu trợ; nếu muốn, cần duyệt thiết kế (trần vay theo nợ, giảm lương tạm).
- GĐ846: loanWhenBroke.test.ts — quỹ âm vẫn vay được và vay thêm được (lối thoát có thật cho người chơi; xoáy nợ GĐ845 là của bot).
- GĐ847: autoplay vay gấp (1 triệu) khi quỹ âm và chưa nợ, như người chơi thật → playtest không còn kẹt xoáy nợ giả; test sim/autoplay xanh.
- GĐ848: thử kiểm chứng bot vay gấp trên save ngày 100 — HMR nạp lại thành ván mới (ngày 1–3 lãi bình thường), chưa kiểm chứng được trên save nợ; sửa GĐ847 mới chỉ có test sim chung xanh.
- GĐ849: ép tiền −3 triệu trên ván mới rồi playtest 3 ngày: bot hồi dần (−2,36M → −1,13M, doanh thu ~600–700k/ngày), không kẹt xoáy nợ; xoáy ở save ngày 100 do kệ trống + 12 nhân viên, khác tình huống này.
- GĐ850: sửa bot playtest.ts (bot riêng của game.playtest, GĐ847 chỉ sửa autoplay.ts): vay gấp khi quỹ âm; kiểm trên ván mới ép −3M → khoản vay 1M được tạo. Rà soát 850: tsc sạch, test playtest xanh.
- GĐ851: tái hiện bế tắc THẬT trên ván mới (cấp <5): quỹ −3M + vay gấp 1M (chỉ vay được 1 lần ở cấp <5) vẫn âm → không nhập nổi hàng, 5 ngày doanh thu 0, 100% khách bất mãn. Đề xuất chờ duyệt: lương/tiền thuê không kéo quỹ xuống dưới 0 (nợ treo/nhân viên xin nghỉ) hoặc cho vay thêm khi quỹ âm. Chưa sửa vì đổi cân bằng kinh tế.
- GĐ852: chọn hướng nhẹ cho bế tắc quỹ âm (GĐ851): cấp <5 quỹ còn âm thì vay gấp thêm 1M, gộp vào gốc, trần 3 gói (3M); quỹ dương thì không. Lương/thuê giữ nguyên. +2 test; toàn bộ test xanh, riêng coopClient "đổi vai" timeout 20 s một lần khi chạy cả bộ (chập chờn như GĐ830, 2 lần chạy riêng đều xanh).
- GĐ853: kiểm chứng trình duyệt (ván mới cấp 6, ép −3M): bot vay 3M, quỹ dương ngay ngày 1, doanh thu 250k→1,07M/ngày trong 5 ngày, không còn bế tắc. (Cấp ≥5 dùng đường vay thường; luật vay gấp thêm cấp <5 được khoá bằng test.)
- GĐ854: test coopClient "đổi vai" (nạp lại cả store) quá hạn 20 s khi cả bộ chạy song song (chập chờn GĐ830/852) → nâng timeout riêng test đó lên 60 s; không đổi logic.

- GĐ855: coopClient.test.ts nâng timeout chung 20→60 s (cả bộ chạy song song làm 28 test quá hạn; chạy riêng luôn xanh 51/51); gộp log GĐ840–854 để PROGRESS.md ≤30 KB.
- GĐ856: kiểm tra sức khỏe — tsc sạch, thông báo dài nhất 88/90, cây làm việc sạch; tiếp theo audit GĐ860.
- GĐ857: build vite xanh; đo lại gzip các chunk nạp đầu từ dist/index.html: tổng ≈538 KB (three 258, store 99, react 65, surpriseArcs 46, index 35, data 34) ≤ 600 KB.
- GĐ858: đo thời gian bộ test: 2949 test xanh, 110 s tường (ngân sách ≤5 phút), không timeout sau khi nâng coop lên 60 s.
- GĐ859: xác nhận remote khớp HEAD (20fd99f), nhánh đồng bộ; chuẩn bị audit GĐ860.
