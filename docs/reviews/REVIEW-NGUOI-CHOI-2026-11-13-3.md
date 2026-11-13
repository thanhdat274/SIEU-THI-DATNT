# Review Người chơi — Đợt 8 (13/11/2026, lần 3)

- **Commit đã review:** `732fd0b2` (mobile) và `7fc53604` (desktop / lâu năm). Bản local `http://localhost:5173/?thu=1` (`&lock=off` khi cần). Không đụng save thật.
- **Quy mô:** 3 nhóm persona chạy bằng sub-agent (4 persona gộp). Lần chạy song song đầu bị khoá 1-tab chặn 2 nhóm → đã sửa ở GĐ2393 rồi chạy lại.
- **Co-op (2 tab `?dev=a/b`):** chưa kiểm tra trong đợt này.
- **Giới hạn môi trường:** tab nền không chạy vòng lặp game (đồng hồ đứng); pane ẩn làm screenshot lỗi; nhiều tab `?thu=1` dùng chung IndexedDB nên có thể ghi đè nhau. Mobile chỉ đo DOM, không phải máy thật.

## 1. Kiểm chứng thay đổi GĐ2392 / GĐ2393

| Thay đổi | Kết quả |
|---|---|
| Khen rẻ (`🏷️ Rẻ ghê!`) | **Đạt** — thấy ở giá 90% gợi ý; đối chứng giá = gợi ý không có câu khen. Chưa thấy `✨ Giá tốt!`. Khen thưa (~1/5), không spam. |
| Thẻ `🧺 N ô kệ trống/sắp hết` + nút Bày đầy | **Đạt** (2 agent, cấp 27 và 35) — bấm châm đúng, kho trừ đúng, thẻ tự biến mất. Chưa thử ngưỡng đúng 2 ô và khi tiệm đóng. Chưa thấy trên mobile (agent bày đầy trước) → chưa kết luận về tràn UI. |
| Mua gom +1 (cấp ≥31, giá ≤75%) | **Đạt** ở cấp 35 (`🛒 Rẻ quá, lấy thêm một cái!`). Chưa đo tần suất thật; chưa kiểm cấp ≤30 bằng chơi (chỉ đọc code). |
| Bỏ khoá 1-tab cho `thu=1`/`dev=` | **Đạt** — tab `?thu=1&lock=off` vào được; save thật vẫn khoá. |

## 2. Bảng góp ý

| Mã | Vấn đề | Bằng chứng | Nhóm | Ưu tiên / tin cậy | Khuyến nghị |
|---|---|---|---|---|---|
| R1 | Nút ô kệ quá nhỏ trên điện thoại: "Bày" 27×40, "Dỡ" 23×40, "Tự chọn" 32×45, cách ~4px; Dỡ làm mất hàng đã bày | Đo DOM 375×812 | Mobile dọc | P1 / cao | Backlog: nút ≥44px, 2 ô/hàng, hoàn tác cho Dỡ |
| R2 | Hàng ô kệ cuộn ngang ẩn (rộng 303, scrollWidth 387), ô thứ 4 bị khuất không gợi ý | Đo DOM 375×812 | Mobile dọc | P1 / vừa | Backlog: lưới 2 cột hoặc chỉ báo cuộn |
| R3 | HUD trái chiếm ~54% chiều cao (351×442) khi có hướng dẫn ngày đầu + banner; chip "🎯 3 xong" đè chữ "Khai trương" | Đo + ảnh 375×812 | Mobile dọc, người mới | P1 / cao | Backlog: mặc định thu gọn checklist trên mobile dọc |
| R4 | Mobile ngang 812×375: hud-left + dock 2 hàng che ~67%, chỉ còn dải ~100px thấy cảnh; nút ✕ panel 30×30 | Đo DOM | Mobile ngang | P1 / cao | Backlog: dock 1 hàng/cuộn ngang, ẩn hộp mục tiêu ở ngang |
| R5 | Chồng chip ở cấp ~27: hết hạn + kệ trống + "Mới mở" + Tết + giờ vàng ×3 + sổ thông báo; trên 1366×768 chiếm gần nửa cột trái | Quan sát 2 agent | Người chơi lâu năm | P1 / vừa-cao | Backlog: gộp giờ vàng thành 1 chip, "Mới mở" tự thu gọn, giới hạn thẻ cùng lúc |
| R6 | Hộp xin gửi số liệu ẩn danh hiện giữa màn hình lần đầu mở tiệm sau 30 ngày; nút "Không" nhỏ hơn "Đồng ý" | Quan sát cấp 27 | Lớn tuổi, mọi người | P1 / cao | Cần xác minh: dời xuống menu ⋯ hoặc hiện lúc tiệm đóng, hai nút ngang cỡ nhau |
| R7 | Tablet 768×1024: nút nhỏ hơn cả điện thoại ("Bày/Dỡ" 71×21, nút panel cao 29–30) | Đo DOM | Tablet cảm ứng | P2 / cao | Backlog: min-height theo `pointer:coarse` thay vì theo bề rộng |
| R8 | Lỗi console lặp 495+ lần sau đổi cỡ 375→812×375 + reload: `THREE.WebGPURenderer: Uncaptured WebGPU GPUValidationError: [Buffer (unlabeled)] used in submit while destroyed` | Console | Mobile, máy yếu | P2 / vừa | Cần xác minh: có thể do nhiều tab dùng chung GPU; thử lại 1 tab |
| R9 | Rời tiệm khi đang mở → khách xếp hàng không ai thu ngân, bỏ về hết (17/33); tăng tốc 8x thì khách chất đống, tour hiện giữa chừng | Quan sát 2 agent | Người mới, ít thời gian | P2 / cao | Cân nhắc: cảnh báo sớm hơn, dừng tốc độ >3x khi khách chờ |
| R10 | `buy()` với id lạ ném TypeError; `setPrice` nhận số âm/NaN | Gọi qua console | Người phá game | P2 / cao | **Đã sửa ngay (GĐ2394)** |
| R11 | Toast "Máy hơi nặng, bớt đám đông" ngay ngày 1 trên máy bàn có WebGPU | Quan sát | Máy yếu | P2 / thấp | Cần máy thật |
| R12 | Tiền cấp 20 = 2,37 triệu, cấp 24 = 473k (autoplay tự chi) | Số liệu autoplay | Cân bằng | P2 / thấp | Cần playtest tay, không kết luận |

**Góp ý nhỏ:** nút "Điều khoản"/"Chính sách" ở login cao 19px · chữ nhãn dock ~9–10px · header "Ngày 2 (2/1)" chưa rõ nghĩa · "Cấp · 35%" thiếu nhãn · thông báo "Mới mở Bảng giá" có vẻ báo muộn (tin cậy thấp, có thể do save dùng chung).

**Ghi nhận bất đồng / chưa chắc:** một agent thấy kho đổi sau F5 (mi 40→0) nhưng lặp lại thì kho giữ đúng — nhiều khả năng do agent khác ghi đè IndexedDB dùng chung, không phải lỗi game. Trạng thái "17 khách bỏ về" ở ngày 1 cũng có thể cùng nguyên nhân.

## 3. Đừng phá
1. Banner HUD ngang đã co gọn (435×29, trong mép) — GĐ2391.
2. Giữ panel khi xoay dọc↔ngang; không mất layout.
3. Chip kệ trống tự tắt khi <3 ô; nút Bày đầy chạy tuần tự có guard 80 vòng.
4. Chip hàng sắp hết hạn có số tiền thiệt hại + nút "Xử lý"; thông báo gom thành Sổ thông báo.
5. Lời thoại khách rõ nghĩa (❓ Hết …, 🔄 Lấy món này thay!, ⏳ Hàng cận hạn!); nút "Chơi không cần đăng nhập" 302×40.

## 4. Đáng xem trước
1. R3 + R4 — HUD chiếm quá nửa màn hình trên mobile (dọc và ngang).
2. R1 + R2 — nút ô kệ nhỏ/khuất, nguy cơ bấm nhầm Dỡ.
3. R5 — chồng chip ở giữa game.
4. R6 — hộp xin số liệu che màn hình.

## 5. Câu hỏi cần playtest người thật
- Ngón tay thật có bấm nhầm Dỡ/Bày ở 23–27px không?
- Safe-area/notch ở màn ngang; độ trễ vuốt hàng ô kệ.
- WebGPU lỗi sau xoay/đổi cỡ có xảy ra trên máy thật không; FPS thật trên máy yếu.
- Nhịp tiền cấp 15–30 khi chơi tay.

## 6. Chưa chơi tới
Vòng đầy đủ nhà→tiệm→bán→ngủ bằng UI trên mobile; 1024×768; xoay lúc đang bán; 1920×1080; co-op; cấp 30–50 chơi tay; thẻ 🧺 trên mobile.

## 7. Đã xử lý (ghi chú sau review)
- R1, R2, R7 → GĐ2395 (nút ô kệ ≥44px, ô xuống dòng 2 cột trên cảm ứng).
- R3, R4 → GĐ2395 (giới hạn chiều cao cột trái HUD; ngang thấp ẩn hộp hướng dẫn, dock 1 hàng cuộn). Nút ✕ panel 30×30 chưa chỉnh.
- R6 → GĐ2396 (hộp số liệu chỉ hỏi khi tiệm đóng; hai nút cùng cỡ).
- R10 → GĐ2394.
- R5: đã có `ALERT_CAP=2` cho thẻ `.hud-alert`; phần chip khác (giờ vàng, Tết, Mới mở) chưa gộp — cần đo lại trên bản mới trước khi sửa.
- R8, R9, R11, R12: chưa làm — cần xác minh trên máy thật / quyết định thiết kế.
- Các review 08–09/11 và 13/11, 13/11-2: đã đóng ở GĐ1826–1829 và GĐ2392; không còn mục mở.
- GĐ2397: nút ✕ panel sắp xếp ≥44px trên cảm ứng.
- GĐ2398: R9 — cấp >30, chạy >3× mà ≥4 khách chờ quầy → hạ về 3× một lần kèm thông báo (test `tocDoKhachCho`). R5 — dòng lễ/chợ và "lễ sắp tới" trong chip đồng hồ gộp thành một dòng.
- R12 (GĐ2399, chạy sim): `runEconomySim` seed 169, 3 ngày, cấp 16/18/20/22/24/26/28 → tiền cuối kỳ 17,7–22,8 triệu, lãi vận hành âm ngày đầu rồi tiến về ~0 — cùng dạng với mốc golden cấp 10–100; KHÔNG có vách ở cấp 20/24. Số 2,37 triệu vs 473k trong review là do autoplay tự chi, không so được → đóng, không sửa.
- R11 (tái hiện bằng trình duyệt pane ẩn, 42 FPS): toast "Máy hơi nặng" bật vì khung hình thật sự chậm trong môi trường này (pane ẩn/GL mềm) — bộ tự giảm đồ họa chạy đúng, không phải lỗi. Giữ nguyên.
- R8: tái hiện được cảnh báo `GL_INVALID_FRAMEBUFFER_OPERATION … zero size` (263 lần) khi canvas 0×0 (pane ẩn). Thêm guard bỏ khung vẽ khi canvas 0×0 ở `src/main.tsx` (GĐ2399). Chưa xác nhận số cảnh báo về 0 do log console cũ còn lưu; lỗi `Buffer used in submit while destroyed` riêng của WebGPU chưa tái hiện.
