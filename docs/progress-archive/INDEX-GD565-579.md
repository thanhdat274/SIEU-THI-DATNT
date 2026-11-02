# GĐ565–579 (lưu trữ)

- GĐ565: Đóng nợ GĐ564 — tin sáng đủ lưu ở lastSummary.news (tạm thời, đã đồng bộ hẻm như GĐ300, không cần migration), Sổ đầu ngày có thẻ '📰 Tin sáng nay'; toast sáng dùng fitJoin ≤90 ('… · +N tin'). Bỏ ngoại lệ 'Hôm nay:' trong test cấp 10/25. 4 file test tin cơ sở đọc thêm lastSummary.news. QA sandbox: thẻ hiện đầu Sổ đầu ngày. 2668 test xanh (1 lần đỏ lẻ 'ngày 2' trong cả bộ, chạy lại xanh — tranh CPU).
- GĐ566: Test độ dài thông báo sinh lúc chạy mở thêm cấp 40 → lộ '🏅 Danh hiệu mới: …' 4 danh hiệu một lúc (~100 ký tự). Dùng fitList gộp '+N'. 2669 test xanh.
- GĐ567: Đo thông báo sinh lúc chạy cấp 60 và 80 (bot 3 ngày): cả hai ≤90, không lộ thêm. Giữ cấp 60 trong test (~10s), bỏ 80 (~12s, không phát hiện mới) để bộ test không nặng thêm.
- GĐ568: Lỗi: endDay gọi notify ~12 chỗ liên tiếp vào MỘT ô thông báo → tin sau đè tin trước ngay (vd. '💡 Chi phí vận hành' đè dòng sáng; nợ quỵt, hàng hết hạn, hàng về… gần như không ai thấy). Gom mọi tin đêm vào log → một toast cuối (thời tiết trước, '+N tin', ≤90) + đủ ở lastSummary.news (Sổ đầu ngày). Lên cấp/danh hiệu/thay ô sau ngủ vẫn bật riêng như cũ. Đo lại: ngày 1 = 9 (trần 10→9), ngày 2 = 10 (trần 11→10). Test mới nightNewsOneToast. 2671 test xanh.
- GĐ569: gom tin sau ngủ (XP chuỗi, thành tích, danh hiệu, thay ô) vào cùng toast sáng; trần ngày 2 = 8 (đo 10 → 8).
- GĐ570 (rà ngân sách + QA người mới): bundle 597/597 KB, chunk lớn nhất 253/255 KB; save mới ?thu=1 bán lần đầu ≈80 giây (đích ≤5 phút); ngày 1 = 9 tin, ngày 2 = 8 tin.
- GĐ571: notify gọi liên tiếp trong cùng một lượt xử lý (vd. bán hàng + lên cấp) gộp một toast, tin mới nhất đứng đầu, bỏ trùng, ≤90 — hết đè nhau ngoài endDay. Test notifyBurst; 2674 test xanh.
- GĐ572: QA trình duyệt GĐ571 (2 tin cùng lượt → '⭐ Lên cấp 2 · 🛒 Bán được gói mì', lượt sau tách riêng); lưu trữ GĐ550–564 cho PROGRESS <30KB.- GĐ573: BranchPanel tab Tình hình: 5 dòng ⚠️ rời (thiếu thu ngân/giờ trống/giao hàng/bảo vệ/kho cạn) gom vào một Callout '⚠️ Cần xử lý (N)'. Test branchWarnGroup.
- GĐ574: QA trình duyệt GĐ573 (sandbox mở chi nhánh): khung '⚠️ Cần xử lý (3)' hiện đúng 3 cảnh báo thiếu thu ngân/giao hàng/bảo vệ, gọn thay 3 dòng rời.
- GĐ575: đo FPS sandbox (đồ họa tự hạ Thấp, có chi nhánh mở): ~75 FPS (trần ≥30). Rà ⚠️ ở BusinessPanel/ReportPanels: đều là cảnh báo ngữ cảnh gắn số liệu, không gom.
- GĐ576: FPS trong tiệm (mở cửa, 3×) ~74. Nghi mất tiến độ save khách mới sau reload → kiểm: save khách mới + chơi tiếp đều lưu đúng (777.777đ còn sau reload). Nguyên nhân: deleteDatabase bị chặn khi trang còn mở kết nối, chạy trễ lúc reload sau. QA xoá sandbox: xoá rồi reload NGAY, đợi xong mới chơi.
- GĐ577: toast gộp nhiều tin (GĐ571) hiện 4,5s thay 3s để kịp đọc; tin đơn giữ 3s. Test notifyBurst (fake timers).
- GĐ578: bộ test đầy đủ 2676 xanh sau GĐ577; trình duyệt: toast gộp còn ở 3,5s, tắt trước 4,8s.
- GĐ579: đo module chunk chính (build --sourcemap): regulars 25,0 · biz 24,2 · Hud 24,0 · world/farm 21,5 · characterModel 20,6 KB thô. farm.ts lazy cần createWorld bất đồng bộ + guard mọi world.farm (~6 KB gzip) → rủi ro, chưa tách; ghi làm ứng viên khi cần chỗ ngân sách.
