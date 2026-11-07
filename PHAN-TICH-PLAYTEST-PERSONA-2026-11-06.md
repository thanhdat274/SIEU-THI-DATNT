# Playtest persona chơi thật — Tạp Hóa 3D (GĐ1438)

**Ngày:** 2026-11-06 · **Bổ sung cho:** `PHAN-TICH-FEEDBACK-NGUOI-DUNG-AO-2026-11-06.md` (bản đó chỉ đọc PROGRESS.md; bản này **chơi thật trên trình duyệt**)

## 1. Cách làm

- Chơi game thật tại `http://localhost:5173/` trong khung trình duyệt hẹp **440×875** (giống điện thoại), chế độ "Chơi không cần đăng nhập", save mới.
- Vai chính: **P1/P22 — người mới dùng điện thoại** (ngày 1, không đọc hướng dẫn, chỉ bấm theo gợi ý trên màn hình).
- Kịch bản: mở game → hội thoại mở đầu → mở cửa → ra tiệm → đứng quầy → bày hàng → nhập hàng → đi ngủ → đọc tổng kết ngày 1.
- Số liệu lấy từ màn hình + `window.game.useGame.getState()` + `window.game.perf()`.

**Giới hạn:** chỉ chơi được ngày 1 của một save. **Chưa** thử máy yếu thật (máy test chạy 60 FPS mức Cao, tự động), co-op, giữa game và cuối game. Những persona đó vẫn chỉ ở mức mô phỏng như báo cáo trước.

## 2. Diễn biến ngày 1 (số liệu thật)

| Giờ game | Việc | Quan sát |
|---|---|---|
| 06:00 | Vào game | Ở nhà, hội thoại Bà Năm 3 trang. Nút to nhất màn hình là **"[N] Đi ngủ"** lúc 6 giờ sáng; chữ "[N]" là phím tắt bàn phím, vô nghĩa trên điện thoại. |
| 06:02 | Bảng "Ngày đầu mở tiệm" | 2 bước đầu (**Nhập hàng**, **Bày hàng**) đã **gạch xong sẵn** dù người chơi chưa làm gì. Bảng + băng rôn "Tết dương lịch" che gần nửa màn hình. |
| 06:15 | Bấm Mở cửa | Tiệm mở trong khi nhân vật **vẫn ở nhà**. Thông báo "dự kiến khoảng 24 khách". |
| 06:32 | Ra tiệm | Camera nhìn thẳng vào **quạt trần**, không thấy quầy/kệ. Phải chờ vài giây camera mới về chỗ. |
| 06:33 | Ẩn hướng dẫn | Bấm xong ~1–2 giây mới ẩn, không có phản hồi ngay. |
| 06–11h (8×) | Đứng quầy | Tính tiền **tự động**, người chơi không phải làm gì. "Kệ hết Bánh kẹo" bật lên lúc 11h. |
| 12:31 | Mở Sơ đồ kệ | Panel **trắng trơn ~3 giây** rồi mới hiện nội dung (lần mở "Tổng kết ngày" cũng vậy). Cột chữ hẹp: "đã bày 3/12 trên kệ — châm thêm khi sắp hết" xuống 6 dòng. |
| 12:44 | Bày đầy cả tiệm | Chạy đúng (kho → kệ), số ô cập nhật. |
| 13:09 | Nhập hàng | Đồng hồ **vẫn chạy** khi panel mở. 7 nhà cung cấp bị khóa hiện hết ngay ngày 1. "Điền theo gợi ý" đặt **244.800đ / 355.000đ** (69% tiền mặt) vào 2 thùng. |
| 13:43 | (thoát ra màn hình đầu rồi vào lại) | **Tiệm tự đóng, nhân vật về nhà, không có thông báo.** Cả buổi chiều không bán được gì. *(Việc thoát là do người test bấm nhầm, nhưng điện thoại bị tắt tab / tải lại là chuyện thường.)* |
| 19:26 | Đi ngủ | Chip "17h Giờ vàng" vẫn hiện lúc 19h26 (đã qua). |

**Tổng kết ngày 1 (màn hình game):** 8 khách (**3 không hài lòng**) so với dự kiến 24 · doanh thu 55.000đ · chi 265.900đ + tiền nhà 20.000đ · **"Lãi hôm nay: −232.000đ"** · bỏ lỡ 6 lượt vì hết hàng, gồm **Cám bò (bao 5kg)**. Tiền: 300k → 69,1k.

Màn tổng kết rất đầy đủ (khách theo giờ, lý do khách không mua được, thanh toán…) và có câu giải thích vì sao âm tiền. Nhưng con số đỏ to −232k là thứ người mới nhìn thấy đầu tiên.

## 3. Góp ý của persona dựa trên những gì thấy thật

**P22 — Ông Năm (60, điện thoại cũ)**
- *Thích:* Bà Năm nói chuyện như người trong hẻm; khách tự trả tiền nên không bị rối.
- *Khó hiểu:* "Sáu giờ sáng sao bảo tôi đi ngủ?" Bảng việc đã tích sẵn 2 ô nên không biết mình phải làm gì.
- *Bực:* Mở bảng ra thì thấy màn hình tím trống, tưởng bị treo.

**P1 — Minh (16, học sinh, điện thoại)**
- *Bực:* Thoát ra nhắn tin rồi vào lại thì tiệm đóng, mất nguyên buổi chiều mà không ai báo.
- *Bực:* Ngày đầu thấy −232k đỏ chót: "chơi dở vậy sao?"
- *Ước có:* Vào lại thì tiệm tự mở tiếp, hoặc ít nhất có nút "Mở lại tiệm".

**P2 — Hoa (24, nhân viên văn phòng, điện thoại, chơi giờ nghỉ)**
- *Khó hiểu:* "Dự kiến 24 khách" nhưng chỉ có 8. Không biết là do mình mở muộn hay hết hàng.
- *Bực:* Đang chọn hàng trong bảng Nhập hàng thì đồng hồ vẫn chạy, bị mất giờ vàng.
- *Thích:* "Bày đầy cả tiệm" và "Điền theo gợi ý" — một chạm là xong.

**P3 — Bác Bảy (55, tablet cũ)**
- *Khó hiểu:* Tạp hóa đầu ngõ mà khách hỏi mua **cám bò** ngay ngày đầu.
- *Ước có:* Ẩn bớt 7 nhà cung cấp chưa mở, chỉ hiện "mở ở cấp 3" cho cái gần nhất.

**P26 — Khoa (nhà phê bình)**
- *Thích:* Màn tổng kết ngày có số liệu thật, đúng nguyên tắc "không hộp đen".
- *Góp ý:* Nút gợi ý nhập hàng dám tiêu 69% tiền mặt ngày đầu; thất bại đầu tiên nên do người chơi tự chọn, không phải do nút gợi ý.

## 4. Đề xuất (đối chiếu luật cứng)

| # | Đề xuất | Vì sao giữ chân | Luật cứng | Kết luận |
|---|---|---|---|---|
| T1 | **Lưu trạng thái mở cửa + vị trí** khi vào lại giữa ngày (hoặc tự mở lại kèm 1 thông báo ≤90 ký tự). `shopOpen` hiện không được lưu (`core/save.ts`). | Người chơi điện thoại hay bị tắt tab; mất buổi là lý do bỏ game | Luật 5: save cũ vẫn nạp được (thiếu trường → mặc định đóng). Đủ 2 chế độ: cần kiểm hẻm online. | **Nên làm — P0** |
| T2 | Bảng ngày đầu **không tự tích** "Nhập hàng / Bày hàng" khi người chơi chưa làm (hoặc đổi chữ thành "Đã có sẵn hàng khai trương ✓") | Onboarding phải dạy đúng thao tác | Không thêm nút/thông báo | **Nên làm — P0** |
| T3 | Ẩn "[N] Đi ngủ" trước 18h, bỏ "[N]" trên thiết bị cảm ứng | Bớt khó hiểu lúc mở đầu | **Giảm** độ rối HUD (đúng Luật 9) | **Nên làm — P0** |
| T4 | Hiện khung chờ/"Đang mở…" khi panel lười tải (Sơ đồ kệ, Tổng kết ~3 giây trắng) | Màn trắng bị tưởng là treo | Không đổi dung lượng tải | **Nên làm — P1** |
| T5 | Ngày 1: "Điền theo gợi ý" giới hạn ~40% tiền mặt; tổng kết ngày 1 đưa **lãi gộp trên hàng bán (+20k)** lên đầu, khoản nhập kho để dòng dưới | Thất bại đầu tiên làm nản | Luật 10 (bán hàng là nghề chính) — không đổi công thức, chỉ đổi cách trình bày/gợi ý | **Nên làm — P1** |
| T6 | Bỏ "Cám bò" khỏi nhu cầu khách ở cấp 1 (hoặc chỉ xuất hiện khi mở trại) | Giữ chất "tạp hóa đầu ngõ" | Cần chỉnh demand + test | **Để sau — P2**, kiểm lại cân bằng trước |
| T7 | Ngày 1 chỉ hiện nhà cung cấp gần mở nhất | Bớt nhiễu | Giảm UI | **Để sau — P2** |
| T8 | Tạm dừng đồng hồ khi mở panel Nhập hàng (hoặc tự hạ về 1×) | Không bị "phạt" vì đọc kỹ | Phải giữ giống nhau ở hẻm online (đồng hồ chung) → khó | **Cần bàn** — có thể chỉ áp dụng khi chơi đơn |
| T9 | Camera "Ra tiệm" nhìn thẳng vào quầy ngay, không quét qua quạt trần | Ấn tượng đầu | Hiệu năng không đổi | **Nên làm — P2** |

## 5. So với báo cáo chỉ đọc PROGRESS

Chơi thật lòi ra **T1, T2, T3, T4, T6, T9**, là những thứ báo cáo mô phỏng **không thể thấy** vì PROGRESS.md không ghi. Báo cáo mô phỏng mạnh hơn ở mảng giữa game, cuối game và co-op, nơi lần chơi này chưa tới. Hai cách nên dùng kèm nhau.

## 6. Lần chạy sau

- Thêm kịch bản **giữa game**: nạp save cấp ~30 (nếu có fixture) để thử chuỗi trồng → nấu → quầy, quán nước, tiệm xôi.
- **Máy yếu:** ép mức đồ họa Thấp + giảm CPU (DevTools throttle) rồi đọc `game.perf()`.
- **Co-op:** hai tab cùng vào hẻm online.
- Lưu ý kỹ thuật: gọi `tick()` bằng tay **không sinh khách** (khách chạy theo khung hình), nên muốn có khách phải để game chạy thật ở 8×.
