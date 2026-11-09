# Review người chơi khó tính — đợt 2 (2026-11-08)

- **Commit:** `eacedbe3` (nhánh `phat-trien-game-tu-do`), localhost:5173, co-op server :3002 đang chạy.
- **Quy mô:** KHÔNG đủ 8–12 persona. Chỉ ~3 góc nhìn chơi thật (xem "Giới hạn"). Phần persona khác là suy luận từ những gì quan sát được.
- **Save:** localStorage trình duyệt tích hợp trống từ đầu → save mới ("Chơi không cần đăng nhập"). Không đụng save thật.
- Nhãn: **[QS]** quan sát trực tiếp · **[SL]** suy luận · **[YT]** ý tưởng.

## Persona đã chơi

| Persona | Mục tiêu | Ngưỡng kiên nhẫn | Thiết bị | Muốn bỏ khi |
|---|---|---|---|---|
| P1/P28 Người mới + speedrunner | Qua ngày 1 có lãi | ~10 phút | PC (~780px, gfx tự hạ Thấp) | Chưa tới mức bỏ; hơi ngợp lúc 19:49 (4 banner chồng) |
| P2 Casual mobile | Mở tiệm trong 5 phút | ~5 phút | 375×812 `?gfx=low` | Mở Nhập hàng: phải cuộn qua nhiều khối mới thấy hàng |
| P17/P20 Co-op | Hai tab cùng hẻm, kiểm nhất quán | — | 2 tab PC | — |

**Chưa chơi thật:** người phá game (chỉ có dữ liệu lẻ), người lớn tuổi (chỉ đo chữ), throttle CPU, vòng lặp đầy đủ trên mobile.

## Hồi quy so với đợt 1
- R1 vốn 360k: **đã có** (start 360.000đ) [QS]. R3 gợi ý điền đủ 3 món: **đã có** [QS]. R2 khách thay món: **đã có** — "Đã cứu 21 lượt nhờ khách nhận món thay" [QS]. R8 tổng kết ngày 1 gọn + nút "Xem phần nâng cao": **đã có** [QS].
- Nhập hàng/Sơ đồ kệ/tổng kết vẫn là chỗ dày thông tin nhất (xem R4, R5).

## Phát hiện

### R1 — Tiền tăng/giảm không có dòng giải thích · P1 · tin cậy trung bình
- **[QS]** Ngày 1: sau thoại Bà Năm lúc 06:00, tiền 43.800 → 63.800 (+20.000) không có thông báo. Tối ngày 1: 393.800 (20:59) → 647.200 đầu ngày 2 (+253.400), trong khi tổng kết ghi lãi ròng −12.800đ, thưởng "+0đ".
- **Cập nhật (lượt chơi lại trên save sạch, đã tái hiện 2 lần) [QS]:**
  - +20.000 là thưởng chương 1; trang cuối hộp thoại ghi "Thưởng: 20.000đ" (`chapters.ts:53`, `closeChapter` ở `bizStory.ts:242`) → **đính chính: không phải vấn đề**, ghi "không có thông báo" ở trên là sai.
  - Khoản qua đêm khoảng +254.000 gồm: thành tựu **"Ngon có tiếng" +300.000đ** (`bizAchievements.ts:72`, mở khóa ngay sau ngày đầu), trừ −26.000 cuối ngày (`endDay.ts:461`; riêng phí vận hành 2% doanh thu chỉ ~6.000, phần còn lại chưa tách được) và −20.000 tiền thuê. Tổng kết ngày 1 vẫn ghi "thưởng +0đ" và "Tiền vào − tiền ra −42.200đ".
  - Giao diện không có dòng nào cho phí vận hành/bảo trì (tìm `opCost|maintCost` trong `src/ui` không ra) [QS code].
- **[SL]** 300.000đ ≈ 83% vốn khởi đầu 360.000đ, nhận sau ngày đầu: ảnh hưởng cân bằng và luật 10 (lãi bán hàng dương) vì tiền vào ví không đến từ bán hàng. Chưa kiểm luật 4 (đơn và co-op cùng kết quả).
- **Tái hiện:** tab mới, chơi ngày 1, ghi `money` trước/sau thoại và trước/sau ngủ.
- **Tác động [SL]:** người chơi soi sổ sách (P37/P38) sẽ thấy số không khớp → mất tin.
- **Đề xuất [YT]:** tổng kết ngày có dòng "Thưởng thành tựu" và "Phí vận hành" để số tiền khớp với ví. Có cân nhắc thưởng thành tựu đầu game cho gọn hơn (quyết định cân bằng, thuộc về người làm game).
- Luật cứng: 4, 10 — cần kiểm số liệu trước khi kết luận.

### R2 — Cảnh báo WebGL lặp 262+ lần khi chơi tiệm · P1 · tin cậy trung bình
- **[QS]** Console: "INVALID_OPERATION: drawElements: no buffer is bound to enabled attribute", kết thúc bằng "too many errors, no more errors will be reported". Bắt đầu khi chơi trong tiệm; không có lỗi đỏ.
- **[SL]** Có đối tượng 3D (mới ghép model GĐ1830?) bị vẽ khi chưa có buffer; có thể tốn FPS ở máy yếu (luật 8). Chưa xác minh nguyên nhân.
- **Đề xuất:** tra khi nào bắt đầu bằng cách bật/tắt từng nhóm object. Chưa nên sửa mù.

### R3 — Tiền âm sau khi sang ngày ở co-op (cần xác minh) · P1 · tin cậy thấp
- **[QS]** Hẻm "QA GD1263 coop": ngày 9 tiền 15.235đ; lúc kiểm lại là ngày 10, tiền **−6.288đ** (tab `?dev=a`, không do tôi mua gì — 15.235đ không đủ cho thùng rẻ nhất 90–122k).
- **[SL]** Có thể do chi phí nhân sự/thuê khi qua ngày trên save QA cũ. Nếu đúng, người chơi co-op có thể bị âm tiền mà không có cảnh báo trước. Cần xác minh trên save sạch.
- **Tái hiện cơ chế trên save đơn sạch [QS]:** đặt tiền 5.000đ rồi `sleep()` lúc 19:00 (ngày 2) → sang ngày 3 tiền **−15.000đ**. Công thức tiền ở `endDay.ts:461` không có chặn sàn 0 và co-op dùng cùng hàm, nên R3 là hệ quả của việc không có chặn/cảnh báo, không phải lỗi riêng của co-op. Kết quả tiền của người chơi bình thường (đủ tiền) không âm (337.800 → 617.800).
- **Bằng chứng thêm [QS]:** hẻm "QA GD1263 coop" giờ ở ngày 11 với −7.659đ (trước đó −6.288đ ở ngày 10), tức tiền âm vẫn tiếp tục sau mỗi ngày.
- **Lượt co-op trên hẻm sạch (đã được cho phép xóa 1 hẻm QA "QA GD665 vong ngay 2" để lấy chỗ; tạo hẻm "QA review R3", 2 tab `?dev=a`/`?dev=b`) [QS]:** hạ tiền còn 9.700đ bằng `placeOrder` (đặt hàng thật, không sửa state), rồi cả hai tab gọi `sleep()` lúc 19:00. Máy khách (tab B) hiển thị **ngày 2, tiền −10.300đ** (HUD ghi "−20.000đ", tức tiền thuê), khớp cơ chế R3. Sau đó máy B và máy A đều hiện lại **ngày 1, 9.700đ** và server cũng lưu ngày 1, 9.700đ. Tức là kết quả sang ngày hiện ra rồi không được giữ.
- **Kết luận thận trọng:** cơ chế tiền âm khớp R3 (thấy −10.300đ), nhưng chưa xác nhận máy chạy thật sự chốt qua ngày, vì tôi gọi `sleep()` bằng lệnh debug và vừa đổi tab liên tục (tab ẩn có thể đổi vai trò). Có thể là lỗi đồng bộ (máy khách hiện kết quả tạm không khớp máy chạy, liên quan luật 4) hoặc do cách tôi thao tác; cần chơi bằng nút giường thật trên hai máy riêng để chắc. Việc đặt `money` bằng tay là thao tác debug trên save review của tôi, không phải đường chơi thật.
- **Đề xuất [YT]:** cảnh báo trước khi ngủ khi tiền không đủ trả thuê/lương, hoặc chặn sàn (thiết kế do người làm game quyết định; cần xem luật 4/10).
- Luật cứng: 4 (đơn/co-op cùng kết quả), 10.

### R4 — Nhập hàng trên mobile: danh sách hàng bị đẩy xuống dưới nhiều khối thông tin · P1 · tin cậy cao
- **[QS]** 375×812: Chợ phiên, 3 nhà cung cấp, "Mối quen", ghi chú giá, "Dự báo", "Tuần này khách săn", "Cần nhập gấp" chiếm gần cả màn; danh sách hàng chỉ lộ ~1 dòng. Trên PC cũng dày (xem ảnh chụp 778px: phải cuộn tới bảng).
- **Tác động:** người chơi casual (P2) mất 3–4 lần cuộn mới mua được.
- **Đề xuất [YT]:** gấp mặc định các khối phụ, chỉ để "Cần nhập gấp" + nút "Điền theo gợi ý" + bảng. Kiểm tra backlog trước (đã có "gộp khối" ở đợt 1? — chưa tra lại PROGRESS.md đầy đủ).

### R5 — Banner HUD chồng nhau, nhất là trên mobile · P1 · tin cậy cao
- **[QS]** Desktop 19:49: 4 banner khác độ rộng cùng lúc (sàn bẩn 44%, mở bảng giá, checklist, mẹo) + "+1 thông báo". Mobile: banner đè nhãn "Khai trương 10/10"; toast "Ngày 2" đè banner Tết; dock chiếm 2 hàng che cảnh.
- **Đề xuất [YT]:** giới hạn 1–2 banner cùng lúc, còn lại vào hàng chờ. Đợt 1 có "thông báo auto-save một dòng" — hướng tương tự.

### R6 — "Bày đầy cả tiệm" chia đều kém, bánh kẹo (mặt hàng hot) chỉ 1 ô · P2 · tin cậy trung bình
- **[QS]** Sau nhập gợi ý + "Bày đầy": mì gói ~8 ô, nước suối 2, bánh kẹo 1, 13 ô trống. Cuối ngày thống kê **hết hàng: bánh kẹo 10, nước 5, ngọt 3**, tổng "Lỡ 29 lượt bán".
- **[SL]** Hàng hot theo sự kiện (Tết dương lịch: bánh kẹo/nước ngọt) bày ít nhất → mất doanh thu đúng ngày khách đông.
- **Đề xuất [YT]:** chia ô theo nhu cầu dự báo, không theo thứ tự nhập. Mâu thuẫn với "Đừng phá" (nút Bày đầy là điểm tốt) nên chỉ chỉnh thuật toán chia, không bỏ nút.

### R7 — Mở tiệm khi nhân vật chưa ra tiệm · P2 · tin cậy trung bình
- **[QS]** "Mở cửa" khi nhân vật đứng ở nhà; vào 06:00 hiện thoại 3 trang (chương Bà Năm); lúc 20:59 khi ngủ báo "3 khách đang chờ tính tiền — bấm Ra tiệm".
- **[SL]** Người chơi dễ mở tiệm rồi quên ra quầy; khách chờ tính tiền khi mình không ở quầy.
- **Đề xuất [YT]:** nhắc "Ra tiệm" ngay khi mở cửa mà đang ở nhà. Kiểm tra trước: có thể đã có tutorial nhắc ở đợt 1.

### R8 — Panel mở lần đầu hiện "⏳ Đang mở…" 1–5 giây · P2 · tin cậy thấp
- **[QS]** Lần đầu mở panel ở bản dev. **[SL]** Có thể chỉ do lazy chunk của Vite dev, bản build sẽ nhanh hơn. **Cần xác minh trên bản build.**

### R9 — Cỡ chữ nhỏ ở panel · P2 · tin cậy thấp–trung bình
- **[QS]** Đo nhanh 400 phần tử đầu: 20 phần tử có font <11px. Ảnh chụp Nhập hàng (PC ~780px): chữ ghi chú/nhãn nhỏ.
- **[SL]** Người lớn tuổi (P3/P22/P31) khó đọc. **Chưa chơi persona này** nên chưa kết luận mức độ.

### R10 — Thanh dock: nhãn chữ 9px, nút rộng 35px trên mobile · P1 · tin cậy cao (bổ sung sau lượt chơi tiếp)
- **[QS]** Đo DOM: nhãn của cả dock ("Mở cửa", "Về nhà", "Kho", "Sơ đồ kệ", "Nhập hàng", "Sổ đầu ngày", "Nhiệm vụ", "Điểm danh", "Giá bán", "Kinh doanh", "Thêm") đều cỡ **9px**; huy hiệu 10px. Ở 375×812 các nút dock rộng **35px** (cao 64px), "Ẩn mẹo" 23×19px, nút ✕ 39×36px — dưới mức chạm 44px thường dùng. Màn hình không tràn ngang.
- **Persona:** người lớn tuổi (P3/P22/P31) và người một tay (P33): đây là thanh điều hướng chính nên chữ nhỏ + nút hẹp là rào cản lớn nhất.
- **[SL]** Dấu tiếng Việt ("Tết dương lịch", "Sơ đồ kệ") hiển thị đúng, không lỗi font — vấn đề là cỡ chữ, không phải dấu.
- **Đề xuất [YT]:** nâng nhãn dock ≥11–12px và nút ≥40px, nhóm bớt nút vào "Thêm". Kiểm trước backlog có mục "chữ nhỏ" chưa.
- Luật cứng: 9 (không thêm nút/mô-đun; chỉ chỉnh cỡ).

### R11 — Người phá game: nhiều lớp chặn tốt, không phát hiện lỗi · tin cậy trung bình
- **[QS]** Bảng giá chỉ có nút ±, không ô nhập tự do. Bấm "Giảm giá" 150 lần liên tiếp: mì gói dừng ở 4.500đ (giá nhập 3.000đ → vẫn lời); bấm "Tăng giá" 150 lần: dừng ở 5.000đ. Giá được chặn hai đầu, luật 10 giữ nguyên ở món này.
- **[QS]** Bấm dồn 60 vòng các nút Mở cửa/Tạm dừng/Nhanh/Rất nhanh/Tốc độ thường/Ra tiệm: không lỗi console đỏ, trạng thái cuối nhất quán (đóng cửa, tốc độ 1×, tiền giữ nguyên 647.200đ).
- **[QS] Gọi thẳng `placeOrder('daily', {mi: q})` (không qua UI; UI chỉ có ±, nên khó chạm tới):** `Infinity`, `NaN`, `-5`, `1e9` đều bị từ chối, tiền giữ nguyên. Nhưng **`0.5` và `1.5` được nhận và trừ tiền (−1.550đ, −4.650đ), còn chuỗi `'3'` cũng được nhận (−9.300đ)**. Sau đó kho `warehouse.mi` = `"03"` — **một chuỗi, không phải số** (0 nối với '3'). Có vẻ phần lẻ bị bỏ khi giao nhưng tiền vẫn bị trừ.
- **[SL]** Nếu có đường nào đưa số lẻ/chuỗi vào (co-op gửi message, save sửa tay), kho sẽ hỏng kiểu "03" + 1 → "031" và mất tiền không có hàng. Với UI hiện tại thì chưa tái hiện được. **Đề xuất [YT]:** ép số nguyên dương ở `placeOrder` (Number.isInteger). Mức P2, cần xác minh có đường thật không; luật 4 (co-op nhận lệnh từ máy khách) là chỗ đáng soi nhất.
- **Chưa kiểm được:** đi ra biên bản đồ, mua hết tiền bằng UI.
- **[QS]** Lỗi 404 khi tải trang là `/favicon.ico` (trang không khai báo favicon; trình duyệt tự hỏi). Vô hại, nhưng làm console luôn có 1 lỗi đỏ gây nhiễu khi dò lỗi thật.

- **Xác nhận trên save sạch [QS]:** sau "Bày đầy cả tiệm" có 24 ô hàng và 13 ô trống; các ô gán Mì gói hiện 0/6 "Kho: hết"; bánh kẹo vẫn chỉ 1 ô (xem R6).

### R12 — Vòng ngày đầy đủ trên mobile (375×812, `?gfx=low`) · P2 · tin cậy trung bình
- **[QS]** Chơi đủ: mở tiệm → bán → về nhà → ngủ → ngày 2, không lỗi chặn.
- **[QS]** FPS: một lần chạm 26,3 khi tốc độ 8× (dưới 30, luật 8), sau đó 50–58. Chỉ đo một lần, máy desktop giả lập mobile nên chưa kết luận.
- **[QS]** Nút tốc độ là một nút xoay 1× → 3× → 8× → tạm dừng → 1×; trên mobile khó nhận ra có tạm dừng.
- **[QS]** Tiệm không tự đóng sau 22:00 (shopOpen vẫn true lúc 24:16). Có thể là thiết kế; người chơi lớn tuổi dễ bán quá khuya mà không hiểu vì sao.
- **[QS]** Nhập hàng ngày 1 trên save sạch rõ ràng (khối ngày đầu + danh sách); R4 chỉ rõ từ ngày 2 trở đi.
- **[QS]** Thông báo thành tựu "🏆 Thành tựu: … +300.000đ": chưa xác nhận người chơi nhìn thấy đủ lâu hay không.

### R13 — Người lớn tuổi: giọng văn và tên món · P3 · tin cậy thấp
- **[QS code]** Tên món/combo là từ phổ thông, đủ dấu ("Mì gói + nước suối", "Trà đá", "Nước mía", "Nước mắm cá cơm nhà ủ"); không thấy từ vay mượn khó. Chưa thấy từ địa phương Nam/Bắc khác nhau (ví dụ "nước ngọt/nước giải khát", "bánh kẹo/bánh trái").
- **[SL]** Chưa có người lớn tuổi thật chơi. Rào cản lớn hơn là chữ 9px và nút 35px (R10), không phải từ ngữ.
- **Giới hạn:** chỉ đọc dữ liệu món và các màn đã mở, không rà hết văn bản trong game.

### R14 — Nút "Rời hẻm" ở màn chính không có phản ứng · P1 · tin cậy trung bình
- **[QS]** Ở màn hình chính (chưa vào tiệm), bấm "Rời hẻm" trên hẻm QA 1 người: không hiện hộp xác nhận, danh sách vẫn 10 hẻm. Đã thử cả bấm chuột lẫn `.click()`.
- **[QS code]** `AlleyPanel.tsx:55` gọi `askConfirm`, nhưng `<ConfirmHost />` chỉ được gắn trong `Hud.tsx:292` (trong tiệm), nên ở màn chính hộp thoại không bao giờ hiện và hàm dừng chờ.
- **[SL]** Người chơi đủ 10 hẻm không có cách rời/xóa hẻm từ màn chính, và không có thông báo vì sao.
- **Đề xuất [YT]:** gắn `ConfirmHost` ở gốc ứng dụng. Chưa xác minh bằng cách sửa.

## Góp ý nhỏ
- Màn đen khoảng 1 giây đầu khi tải ở mobile [QS].
- Danh sách hẻm co-op nhảy layout khi tải xong, dễ bấm nhầm hẻm [QS].
- Đạt tối đa 10 hẻm thì không tạo thêm được; thông báo rõ nhưng người chơi không biết rời hẻm nào [QS].
- Tab thứ hai không `?lock=off` bị chặn "Game đang mở ở tab khác" — đúng thiết kế, nhưng dev cần nhớ [QS].
- Ccảnh 3D không dựng được co-op "Chương 1 Bà Năm" ở ngày 9 trên save QA cũ [QS] — có thể chỉ do save thử.

## Bảng tổng hợp

| R | Nội dung | Khuyến nghị |
|---|---|---|
| R1 | Thành tựu +300k đêm 1 và tổng kết không khớp ví (đã giải thích nguồn) | **Đưa vào backlog** (ưu tiên cao, kiểm luật 4/10) |
| R2 | Cảnh báo WebGL lặp | **Cần xác minh** |
| R3 | Tiền âm khi qua ngày co-op | **Cần xác minh** |
| R4 | Nhập hàng mobile quá dày | Đưa vào backlog (sau khi tra trùng) |
| R5 | Banner chồng | Đưa vào backlog |
| R6 | Bày đầy chia kém | Đưa vào backlog |
| R7 | Nhắc ra tiệm | Chưa nên làm (tra tutorial trước) |
| R8 | Panel "Đang mở…" | Cần xác minh trên bản build |
| R9 | Chữ nhỏ ở panel | Gộp vào R10 |
| R10 | Dock 9px, nút 35px mobile | **Đưa vào backlog** (đã đo trực tiếp) |
| R11 | Người phá game: giá/tốc độ chặn tốt | Không cần làm; còn mục chưa kiểm |
| R12 | Vòng ngày mobile: FPS chạm 26 ở 8×, nút tốc độ, tiệm không tự đóng | Cần xác minh (đo lại trên máy thật) |
| R13 | Giọng văn/tên món cho người lớn tuổi | Chưa cần làm |

## Đừng phá
1. Checklist 5 bước ngày đầu + tự tick [QS].
2. Nút "Điền theo gợi ý" ở Nhập hàng và "Bày đầy cả tiệm" [QS].
3. Khối "Đã cứu N lượt nhờ khách nhận món thay" — người chơi hiểu ngay vì sao hết hàng vẫn bán được [QS].
4. Tổng kết ngày 1 có "Xem phần nâng cao" thay vì đổ hết số [QS].
5. F5 + "Chơi tiếp trong máy (ngày 2)" giữ đúng tiền/ngày/cấp [QS].

## 3–5 vấn đề ưu tiên
1. R1 (thành tựu +300k và tổng kết ngày không khớp ví) — làm mất tin ngay ngày 1 và lệch cân bằng.
2. R3 (tiền âm co-op) — nếu tái hiện được trên save sạch, ảnh hưởng luật 4/10.
3. R4/R5 (độ dày thông tin & banner chồng ở mobile).
4. R6 (hàng hot bày ít).
5. R2 (WebGL warn) — kiểm tác động FPS.

## Câu hỏi cho playtest thật
- Người chơi có để ý và hiểu khoản +300.000 "Ngon có tiếng" sau ngày đầu không, và có thấy số dư không khớp tổng kết không?
- Họ có mở "Cần nhập gấp" hay cuộn qua thẳng bảng hàng?
- Co-op: người chơi tab phụ có thấy khách/tiền cập nhật kịp không?

## Giới hạn của review này
- Vòng nhà → tiệm → bán → ngủ → ngày sau chỉ chơi đủ ở ngày 1 (PC và mobile 375×812 `?gfx=low`, save sạch); không chơi nhiều ngày, không đủ 8–12 persona thật.
- **Lượt bổ sung:** người phá game (R11), đo chữ/nút (R10), vòng ngày mobile (R12), đọc tên món (R13).
- **Không làm được/chưa làm:** throttle CPU (công cụ trình duyệt tích hợp không có tùy chọn này) nên FPS ở máy yếu chưa đo; số lượng âm/cực lớn và biên bản đồ chỉ kiểm qua `placeOrder`, chưa qua UI.
- **Xóa save review:** tôi đã xóa và chơi lại trên save sạch để tái hiện R1; đó là save review của tôi, không phải save thật.
- Console khi chơi còn có lỗi WebGPU "Buffer used in submit while destroyed" lặp hàng trăm lần (cùng nhóm với R2) [QS].
- **Co-op:** hai tab cùng vào hẻm "QA GD1263 coop"; đồng bộ tiền/ngày/giờ khớp lúc đầu; vai trò runner/player xuất hiện đúng. **Chưa kiểm được** mua hàng từ máy khách (không đủ tiền: 15.235đ < giá thùng rẻ nhất) và đổi vai trò khi tab ẩn. Không tạo hẻm mới vì đã đủ 10 hẻm; không rời hẻm để khỏi xóa dữ liệu dev.
- Chưa đối chiếu đầy đủ `PROGRESS.md`/backlog cho R4–R7; các mục đó cần tra trước khi đưa vào backlog.
- Không chụp ảnh lưu vào `docs/reviews/anh/`.
