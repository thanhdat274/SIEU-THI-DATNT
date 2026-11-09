# Review người chơi khó tính — đợt 4 (2026-11-08)

- **Thời điểm:** 08/11/2026, khuya (sau đợt 2 và đợt 3 cùng ngày — đọc cả hai trước khi chơi để tránh lặp).
- **Bản được xem:** bản **local** `http://localhost:5173/`; server co-op 3002 chạy sẵn (`DEV_AUTH_BYPASS`). Đúng quy định prompt.
- **Commit:** bắt đầu phiên ở `95ae13ef` (GĐ1829); giữa phiên repo chuyển sang `eacedbe3` (commit chỉ xoá 4 file phân tích cũ — **không đổi code game**). Mọi bằng chứng dưới đây hợp lệ cho cả hai.
- **Nhãn:** **[QS]** quan sát trực tiếp (bấm/nhìn/đo thật) · **[SL]** suy luận · **[YT]** ý tưởng.
- **Save:** chơi trong **chế độ `?thu=1`** (kho IndexedDB riêng `taphoa3d-thu`, GĐ418) — xác nhận màn đăng nhập kho thật còn nguyên "Chơi tiếp trong máy (**ngày 260**)" trước và sau phiên; **save thật không bị đụng tới**. Trên save QA: chơi tiếp ngày 150 → 151 (F5 giữ đúng) → "Chơi lại từ đầu" (qua hộp xác nhận) chơi ngày 1 trọn vòng thật.
- **Co-op:** **ĐÃ KIỂM** 2 tab thật `?dev=a&thu=1&lock=off` / `?dev=b&thu=1&lock=off`, gia nhập hẻm có sẵn (không tạo hẻm mới vì trần 10 hẻm — xem hồi quy Đ2-R14/Đ3-R3).

## Vị trí của đợt này so với đợt 2/3 (cùng ngày)

- Đợt 2 và đợt 3 đều **không chơi được vòng ngày thật** (rAF đóng băng) và **không mở được viewport mobile**, **không test được co-op sống**. Đợt này: rAF hoạt động ở nhiều đoạn (pane được hiển thị thật) → **chơi được vòng ngày 1 thật** (nhập → bày → mở cửa → khách vào → bán 16 món → ngất qua đêm → tổng kết); **mở được 375×812**; **test được mua hàng từ máy khách co-op với parity số liệu** — ba khoảng trống của đợt 2/3.
- Phát hiện hoàn toàn mới của đợt này: R1 (thoại chương sai thứ tự), R2 (gợi ý không giải nút thắt), R3 (reset để lại sàn bẩn ngày 1), R4 (toast bị thoại chương che), R5 (tiêu đề panel mobile — tái xuất đợt 1). Phần còn lại là **hồi quy/xác nhận** cho Đ1, Đ2, Đ3.

## Hồi quy đợt 1 (R1–R9) — tất cả đã được sửa, xác nhận bằng chơi thật

| Mã Đ1 | Kết quả đợt 4 | Bằng chứng |
|---|---|---|
| R1 vốn đủ 3 món | ✅ | Vốn 360.000đ (+20.000 quà điểm danh); bộ 3 món 316.200đ mua được, còn 63.800đ [QS] |
| R2 lỡ bán ngày 1 | ✅ cải thiện rõ | Ngày 1 chơi thật (kèm quãng sáng chủ để ở nhà): 26 khách · lỡ 12 (Đ1: 28/55 lượt); tổng kết "🔄 Đã cứu 10 lượt nhờ khách nhận món thay" [QS] |
| R3 gợi ý đủ 3 món | ✅ | Bấm "✨ Điền theo gợi ý" → Mì + Nước suối + Bánh kẹo, 3 thùng 316.200đ [QS] |
| R4 label quầy | ✅ | "Đứng quầy chốt đơn (mặc cả, đặt hàng trước)"; chủ ở nhà → chip "⚠ 11 khách bỏ về vì chờ quầy (~42% khách)" + banner "🛒 1 khách đang chờ tính tiền — bấm 🛵 Ra tiệm" dẫn đúng việc [QS] |
| R5 đá khuya | ✅ phần giải thích | Ngất tự động ~2:00–4:00: "mất 14.880đ tiền thuốc. Tối nay nhớ về nhà ngủ trước 2:00 sáng (ăn sáng thì được thêm 1 giờ)" — hậu quả + cách tránh đều được dạy [QS] |
| R6 kệ 3D | ✅ label | "Bày hàng lên kệ (đến gần kệ bấm B)" — thao tác B chưa tái hiện được (không đi lại bằng phím qua automation) |
| R7 -20k vô cớ | ✅ | Ngày 1 đứng ở nhà >12s: tiền giữ nguyên 360.000đ; ngày ≥2 tự ăn sáng có toast giải thích rõ (nhưng bị che — xem R4 mới) |
| R8 tổng kết gập | ✅ | Ngày 1: 3 tab, khối nâng cao gập sau "🔎 Xem phần nâng cao (kỷ lục, ca đêm, thanh toán, giờ bán...)" [QS] |
| R9 debug API | ✅ | qa-guide đã có mục riêng; local có đủ `game.perf/useGame/autoplay/layoutAudit` |

Hồi quy từ Đ2/Đ3: vốn 360k, gợi ý 3 món, thay món, tổng kết gập — khớp; **Đ2-R10 (dock mobile 35px) tái xác nhận** bằng đo DOM ở 375×812 thật (nút dock 35×54px, nút tốc độ 26px — xem R5-mở-rộng dưới); **Đ2-R12 "tiệm không tự đóng sau 22:00" tái xác nhận** (shopOpen còn true lúc 23:45, ngất ~2:00–4:00) [QS]; **Đ2-R2 (WebGL warn) không tái hiện** trong cả phiên (~40 phút, desktop + gfx low + mobile, bộ thu console gắn từ đầu đợt gfx low: 0 lỗi, 2 warn vô hại "THREE.Clock deprecated" + "[render] WebGL2") — lỗi của đợt 2 có thể chỉ xảy ra khi điều kiện render riêng nào đó, giữ "cần xác minh".

## Phát hiện mới (R1–R5) + lấp khoảng trống (R6–R7)

**R1 — Thoại chương cốt truyện bật sai thứ tự (Chương 3 trước Chương 2) và giữa giờ vàng**
- Loại / ưu tiên / độ tin cậy: khó hiểu / P2 / cao (quan sát), nguyên nhân — vừa
- Persona: P26 nhà phê bình + P7; save ngày 150–151, cấp 45
- Quan sát trực tiếp [QS]: ngày 150 mở "📖 Chương 3 · Một mình không xuể" (bấm hết 3 trang, có ghi "Thưởng: 50.000đ"); hôm sau ngày 151 mở "📖 Chương 2 · Hẻm nhỏ tiệm (Chú Ba xe ôm)". Thứ tự 3 → 2.
- Tác động: người chơi nghi mình lỡ nội dung; thoại chặn đồng hồ ngay đầu giờ vàng 6h–8h30 — gián đoạn đúng lúc đông khách; ai quay lại game sau nghỉ vài ngày sẽ bị ngắt liên tục.
- Suy luận [SL]: các chương đang mở theo điều kiện riêng lẻ (cấp/khác), không ép đúng dãy; trên save leo cấp nhanh dễ chồng điều kiện. Người thật chậm hơn ít gặp hơn nhưng vẫn dính khi nhận thưởng cấp ảo/quay lại lâu.
- Đề xuất [YT]: (a) chương N+1 chỉ mở khi N đã xong; (b) hoãn thoại chương tới lúc tiệm đóng/ngoài giờ vàng nếu đang đông khách. (b) rẻ hơn (chỉ ràng buộc hiển thị).
- Đối chiếu: Luật 1; trục "khách quen, lời thoại" là điểm giữ chân — đừng để nó tự phản chủ.
- Cần xác minh: điều kiện mở từng chương trong data cốt truyện (`chapters.ts`).

**R2 — "✨ Điền theo gợi ý" không giải bài toán nút thắt mà chính panel đang nêu**
- Loại / ưu tiên / độ tin cậy: bất tiện (khớp lời khuyên ↔ hành động) / P2 / cao
- Persona: P37 chủ tạp hóa ngoài đời; ngày 150, kho đồ uống cạn (10 ly), Sổ đầu ngày + panel nhập đồng loạt báo "quán cần ~126 ly, kho còn 10 — nhập thêm ít nhất 116 ly. Nút thắt: Trà túi lọc"
- Quan sát trực tiếp [QS]: bấm "✨ Điền theo gợi ý" trên panel đó → giỏ chỉ có 3 thùng Nước ngọt/Nước tăng lực/Lạp xưởng (477.600đ ≈ 48 ly) — không có Trà túi lọc, không đủ 116 ly. Nút đúng việc nằm ngay phía trên: "➕ Nạp đồ uống quán nước vào giỏ" (bấm → thêm 4 thùng nước suối, tổng 861.600đ ≥ 116 ly ✓, mua về kho 6/20 thùng).
- Tác động: người mới đọc đầu panel rồi bấm nút gợi ý nổi bật nhất sẽ tưởng đã sửa xong; lời khuyên và nút hành động đang đi hai đường khác nhau.
- Đề xuất [YT]: khi panel có nút thắt đang nêu, "✨ Điền theo gợi ý" ưu tiên điền theo nút thắt (hoặc đổi nhãn ngắn gọn để phân biệt với "➕ Nạp…") — không thêm nút mới.
- Đánh đổi: giữ nguyên case test ngày đầu (`minTotal` — Đ1-R3) khi sửa; đây là hành vi ngày 2+.
- Đối chiếu: Luật 1; nguyên tắc "không hộp đen". Liên quan Đ3-R4 (bấm + khi thiếu tiền không báo "Thiếu") — cùng cụm làm rõ nhập hàng.
- Cần xác minh: các tình huống nút thắt khác (hàng sắp hỏng, trữ lễ) có cùng lệch không.

**R3 — "Chơi lại từ đầu" khi khách còn trong tiệm: ngày 1 mở màn với sàn bẩn 72%**
- Loại / ưu tiên / độ tin cậy: lỗi biên / P2 / cao (giải mã được số)
- Persona: P1 người mới; reset khi tiệm đang mở, ~15 khách còn trong tiệm
- Quan sát trực tiếp [QS]: ngày 1 phút đầu tiên, HUD đỏ "🧹 Sàn tiệm bẩn (72%), khách ngại vào · đứng trong tiệm bấm [C]…" + nút "Lau nhà". `state.dirt = 72.00000000000009`.
- Giải mã: dirt tích từ khách ngày cũ (15 khách × 4,8 = 72) chưa kịp rời lúc reset; `resetGame()` đặt `dirt: 0` nhưng khung render sau đó khách cũ rời tiệm vẫn `addDirt` (`agents/customers.ts:446`).
- Tác động: người mới bị phạt thứ mình không gây + được dạy "lau nhà" ngay ngày 1 (trái "ngày đầu chỉ dạy vòng lõi"); câu cảnh báo còn đe "khách ngại vào".
- Đề xuất [YT]: khi reset, xoá sạch khách đang đứng hoặc cờ "bỏ qua addDirt" trong giây đầu sau reset; kèm test biên.
- Đối chiếu: mục "Người chơi mới: ngày đầu chỉ dạy vòng lõi"; ngân sách thông báo ngày đầu ≤10 (cảnh báo này chiếm một suất).
- Cần xác minh: tái hiện khi reset lúc tiệm đóng (không nên xảy ra).

**R4 — Toast giải thích (ăn sáng 20.000đ) bị card thoại chương đè lên**
- Loại / ưu tiên / độ tin cậy: khó hiểu / P2 / cao (ảnh)
- Persona: P3 lớn tuổi (mobile); ngày 151 vừa vào game, thoại Chương 2 bật đồng thời tự ăn sáng
- Quan sát trực tiếp [QS]: tiền tụt 38.975.782 → 38.955.782 (−20.000đ, đúng `BREAKFAST.price`); toast "🍜 Ăn tô phở sáng (20.000đ): hôm nay đi nhanh hơn, thức khuya thêm 60 phút mới ngật" CÓ phát nhưng nằm sau card thoại — ảnh `anh/2026-11-08/mobile-375-thoai-chep-toast-an-sang.png`: dải chữ "thức khuya thêm 60 phút mới ngật" lộ sau lưng thoại, không đọc nổi.
- Tác động: bản chất Đ1-R7 ("mất 20k vô cớ") vẫn tái hiện được khi có thoại cùng lúc — sửa gốc GĐ1827 đang bị lớp hiển thị vô hiệu hoá.
- Đề xuất [YT]: khi có thoại chương/modal mở, toast vào hàng đợi và bấy sau khi modal đóng (hàng đợi thông báo đã có sẵn khái niệm "thông báo sau đè thông báo trước").
- Đối chiếu: Luật 1; quy ước "Ô thông báo chỉ có một chỗ"; ngân sách chống phình (không thêm UI).
- Cần xác minh: toast có bị che bởi panel thường (Nhập hàng…) không.

**R5 — Mobile 375×812: nút dock hẹp hơn chuẩn cảm ứng của dự án; tiêu đề panel vẫn xuống 3 dòng**
- Loại / ưu tiên / độ tin cậy: thiếu chuẩn (theo checklist riêng qa-guide) / P2 / cao
- Persona: P3 lớn tuổi + P22 máy cũ; đo DOM ở 375×812 thật (đợt 2 đo được nhưng đợt 3 không; đợt này tái xác nhận)
- Quan sát trực tiếp [QS]: nút dock chính (Mở cửa, Ra tiệm, Ra trại, Kho, Sơ đồ kệ, Nhập hàng) **35px rộng × 54px cao**; nút tốc độ (⏸/1×/3×/8×) **26px rộng × 48px** — dưới chuẩn "vùng bấm ≥44px trên cảm ứng" của chính `docs/qa-guide.md`. `game.layoutAudit()` cho `clipped: []`, `scrollWidth == 375` — **không vỡ, chỉ khó chạm** (Ra tiệm/Ra trại kề nhau rất sát).
- Tái xuất đợt 1 [QS]: tiêu đề panel "☀️ Tạp Hóa Đầu Ngõ · Sổ đầu ngày 151 (31/5) · Thứ 5" bọc 3 dòng ở 375px (Đ1 ghi ở góp ý nhỏ, chưa sửa).
- Tác động: người ngón to/lớn tuổi bấm nhầm nút kề; tiêu đề dài chiếm ~1/5 màn panel.
- Đề xuất [YT]: mở rộng vùng chạm vô hình ≥44px (không đổi hình ảnh); tiêu đề mobile chỉ còn "Sổ đầu ngày 151 (31/5)".
- Đối chiếu: checklist "Đồng nhất giao diện — thao tác bên trong"; ngân sách (chỉ CSS/text).
- Ảnh: `anh/2026-11-08/mobile-375-hud-dock-2hang.png`, `mobile-375-so-dau-ngay.png`.

**R6 — LẤP KHOẢNG TRỐNG Đ2/Đ3: mua hàng từ máy khách co-op — parity khớp tuyệt đối**
- Persona: P45 cặp đôi; tab A `?dev=a` (máy chạy) + tab B `?dev=b` (máy khách), cùng hẻm "Hẻm Test Coop" ngày 1 (không tạo hẻm mới — trần 10 hẻm, khớp Đ2-R14/Đ3-R3)
- Quan sát trực tiếp [QS]: máy khách mở Nhập hàng → "✨ Điền theo gợi ý" → "📦 Nhập ngay": tiền 305.000 → **18.200đ**, kho 3/20 → **6/20 thùng**; máy chạy (tab A) đọc lại đúng **18.200đ** từng đồng. Máy khách cũng thấy banner "🛒 1 khách đang chờ tính tiền ở quầy — bấm 🛵 Ra tiệm" [QS].
- Kết luận: lời báo kết quả nằm trong thao tác, state đồng bộ ngay — **Đ2/Đ3 chưa kiểm được phần này nay đã có bằng chứng sống**. Vẫn chưa kiểm: đổi vai, câu hỏi quầy hai tab, rời hẻm.
- Đối chiếu: Luật 4 — phần thao tác mua hàng đạt.

**R7 — XÁC NHẬN Đ2-R14 bằng phiên riêng: hộp xác nhận "Rời hẻm" chỉ hiện SAU KHI đã vào game**
- Quan sát trực tiếp [QS]: bấm "Rời hẻm" 3 lần ở màn đăng nhập — không hộp thoại, số hẻm vẫn 10; sau khi "Gia nhập" hẻm khác (đã vào game), hộp "Xác nhận · Rời hẻm "QA GD1263 coop"?…" mới hiện trên màn chơi. Khớp nguyên nhân Đ2 ghi: `<ConfirmHost/>` chỉ gắn trong `Hud.tsx:292`.
- Bổ sung so với Đ2: hộp thoại không mất đi mà **chờ tới khi HUD mount mới hiện** — tức promise `askConfirm` xếp hàng đợi, dẫn tới hành vi kỳ lạ "hộp xác nhận của màn đăng nhập bật ở giữa màn chơi". Gắn ConfirmHost ở App root sửa được cả hai mặt.

---

## Bảng tổng hợp

| Mã | Vấn đề | Nhóm ảnh hưởng | P / tin cậy | Khuyến nghị |
|---|---|---|---|---|
| R1 | Thoại chương sai thứ tự 3→2, bật giữa giờ vàng | người chơi giữa/cuối game, người quay lại | P2 / cao | **Cần xác minh** điều kiện mở chương rồi quyết |
| R2 | "Điền theo gợi ý" không khớp nút thắt đang nêu | người mới, người soi số | P2 / cao | **Đưa vào backlog** (giữ case ngày đầu) |
| R4 | Toast ăn sáng bị thoại chương che → "mất 20k vô cớ" tái hiện | mobile, người mới | P2 / cao | **Đưa vào backlog** (hàng đợi toast sau modal) |
| R5 | Dock mobile 26–35px < 44px chuẩn; tiêu đề panel 3 dòng (tái xuất Đ1) | mobile, người lớn tuổi | P2 / cao | **Đưa vào backlog** (mở rộng vùng chạm + rút tiêu đề) |
| R3 | Reset khi khách còn trong tiệm → ngày 1 sàn bẩn 72% | ai chơi lại từ đầu | P2 / vừa | **Cần xác minh** tái hiện lúc tiệm đóng |
| R7 | Đ2-R14 xác nhận thêm: confirm đợi tới khi vào game mới hiện | người chơi co-op | P1 / cao | **Đưa vào backlog** (gắn ConfirmHost ở App root — khớp Đ2-R14) |
| R6 | (Dương) Co-op parity mua hàng máy khách khớp tuyệt đối | co-op | — | **Cần xác minh** nốt: đổi vai, câu hỏi quầy |

Đồng loạt gộp khi vào backlog: R2 + Đ3-R4 (cụm phản hồi nhập hàng); R4 + Đ2-R5/Đ3-R6 (cụm hiển thị toast/banner); R5 + Đ2-R10 (cụm cảm ứng mobile).

## Đừng phá (giữ nguyên khi sửa)
1. Checklist "Ngày đầu mở tiệm" 5 bước với label trung thực ("đến gần kệ bấm B", "Đứng quầy chốt đơn (mặc cả, đặt hàng trước)") — P1 tự đi được vòng lõi.
2. "✨ Điền theo gợi ý" ngày đầu điền trọn bộ 3 món vừa tiền (test khoá `minTotal`) — sửa R2 không được phá case này.
3. Tổng kết ngày 1 gọn + "Vì sao khách không mua · nên làm gì" + "🔄 Đã cứu X lượt nhờ khách nhận món thay" + câu dạy ngất có giải thích cả hậu quả lẫn cách tránh.
4. Sổ đầu ngày giữa game: "Việc hôm nay · ưu tiên", "Rốn kho chung — nghẽn", nhu cầu quầy theo khung giờ, Khách vàng theo tuần, hàng sắp hỏng kèm nút "🧺 Xếp kệ".
5. Sự bền trạng thái: F5 giữ đúng từng đồng (ngày 151 khớp 38.975.782đ), khoá 1 tab, validate số lượng rác (`-3`/`abc` xóa, `99999` kẹp 47), spam Mở cửa/Đóng cửa nhất quán, co-op parity mua hàng.

## Góp ý nhỏ (một dòng/ý)
- Chip đồng hồ giữa game ("hôm nay 26 khách · bán 16 món · thu 85.000đ · lãi 33.000đ · món chạy nhất: Mì gói (13)") — phản hồi liên tục rất tốt; Đ1/Đ2 chưa liệt kê vào "Đừng phá".
- Khoảng đêm ngày 1→2 tiền 148.800 → 392.220 (+243.420) trong khi tổng kết ghi "Tiền vào − tiền ra ▼ -252.900đ" — khớp giả thuyết Đ2-R1/Đ3-R2 (thành tựu +300k + trừ vài khoản chưa hiện tên); chờ dòng "Thưởng thành tựu/Phí vận hành" trong tổng kết.
- Điểm danh mới hiển thị "Quà điểm danh hôm nay: 🪙 Vốn nhỏ (20.000đ) · chuỗi sắp tới 1 ngày" ngay màn bắt đầu — rõ, giữ nguyên.
- Chỉ 1 mối "Đại lý đầu ngõ" mở ở ngày 1, các mối khác gộp "🔒 +5 mối nữa từ cấp 8" — đúng fix backlog T7, gọn.
- Lỗi 404 `/favicon.ico` vẫn còn khi tải trang (Đ2-R11 đã ghi) — nhiễu console dò lỗi thật.
- gfx=low: nạp nhanh, chơi được, 0 lỗi console; FPS vẫn không đo được trong môi trường này (rAF = 0 lúc đo — pane không được composite; Đ2 đo được 26,3 FPS một lần trên giả lập mobile, Đ3 không đo được).

## Câu hỏi cần playtest người thật
1. Thoại chương bật sai thứ tự: người chơi thật có để ý/phiền không, hay chỉ người chơi lâu ngày mới thấy?
2. Khi panel nêu nút thắt "thiếu 116 ly" mà nút gợi ý điền thứ khác — người chơi có nhận ra cần bấm "➕ Nạp đồ uống" riêng không?
3. Trên điện thoại thật, bấm nhầm giữa "Ra tiệm"/"Ra trại" (35px) xảy ra nhiều không?
4. Người chơi co-op chạm trần 10 hẻm: có tự tìm ra nút "Rời hẻm" không, và bấm nó im lặng thì họ làm gì tiếp?

## Giới hạn của lần review này
- rAF có lúc đóng băng (pane không được composite) → một phần ngày 150 chạy bằng `game.autoplay()` (bot tự quyết — số 117 khách/lỡ 75 của ngày 150 là số bot, không phải người chơi); các đoạn ngày 1–2 còn lại chơi thật bằng nút game ("🛵 Ra tiệm", checklist, panel).
- Không đi lại được bằng WASD qua automation → chưa tái hiện thao tác "bấm B vào kệ" (Đ1-R6 chỉ xác nhận label).
- Không CPU throttle 4×; FPS không có số (rAF = 0 lúc đo).
- Co-op: chưa kiểm đổi vai, câu hỏi quầy hai tab, rời hẻm (nút đang chết — R7); hẻm test dùng chung save ngày 1 cấp 1.
- Chưa chơi tới: trại, giá bán, kinh doanh, combo, nhân viên, ca đêm chủ động, NG+.
- Kết quả là mô phỏng định tính, không thay playtest người thật; không dùng số persona làm bằng chứng định lượng. Không sửa code, không tự thêm vào backlog.

## 3–5 vấn đề đáng xem trước
1. **Đ2-R14 / R7** — ConfirmHost chết ở màn đăng nhập (kẹt trần 10 hẻm co-op): sửa rẻ nhất, mở khoá cả luồng test co-op sạch.
2. **R2 + Đ3-R4** — cụm phản hồi nhập hàng (gợi ý ↔ nút thắt; "Thiếu X₫" khi thiếu tiền).
3. **R1** — thứ tự chương cốt truyện: cần xác minh `chapters.ts` rồi ép dãy.
4. **R4 + Đ2-R5/Đ3-R6** — cụm hiển thị toast/banner (không che nhau, không gối).
5. **R5 + Đ2-R10** — chuẩn cảm ứng mobile (vùng chạm ≥44px, tiêu đề gọn).
