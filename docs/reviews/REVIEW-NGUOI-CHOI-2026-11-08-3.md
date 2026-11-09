# Review người chơi khó tính — đợt 3 (2026-11-08)

- **Thời điểm:** 08/11/2026, ~22:40–23:00 (giờ VN).
- **Bản được xem:** local `http://localhost:5173/` (server 3002 co-op đang chạy). Đúng quy định của prompt — chỉ dùng bản local, không dùng Vercel.
- **Commit:** `eacedbe3` (GĐ1830, nhánh `phat-trien-game-tu-do`). Lưu ý: **cùng commit với đợt 2** — nên các góp ý đợt 2 chưa xử lý trong code vẫn còn nguyên.
- **Nhãn:** **[QS]** quan sát trực tiếp (đã bấm/nhìn/đo thật) · **[SL]** suy luận từ state/code · **[YT]** ý tưởng đề xuất.
- **Save:** tạo save review mới qua "Chơi không cần đăng nhập" (localStorage trình duyệt review) — **không đụng save thật của người dùng**. Đã chơi/kiểm trên save này; xoá không cần thiết vì 6h tối file lưu đóng.

---

## Giới hạn môi trường (quan trọng — đọc trước khi suy kết luận)

1. **Đồng hồ game đứng do rAF bị treo trong trình duyệt automation.** Với `1×/3×/8×`, `minutes` không nhích (kẹt ở 370→850 chỉ khi `tick()` tay). Theo PROGRESS GĐ719, `tick()` tay **không sinh khách** (luồng khách nằm trong vòng render rAF) → **KHÔNG quan sát được phiên khách/chốt đơn thật trong đợt này.** Cách chơi đầy đủ "nhà → mở tiệm → bán → ngủ" bằng thao tác thật không hoàn tất được; thay vào đó tôi dùng `game.autoplay(N)` (chạy mô phỏng đồng bộ, không cần rAF) để lấy dữ liệu kinh tế ngày 1→2, và kiểm UI/state bằng DOM.
2. **Không mở được khung 375×812:** `window.resizeTo` bị chặn, không có API emulation viewport trong môi trường này → **không đo lại được nút/chữ mobile** (đợt 2 R10 đo được; đợt này không tái hiện để đối chiếu).
3. **Co-op 2 tab thật không dựng được:** server 3002 chạy (DEV_AUTH_BYPASS=true, `?dev=a` đăng nhập "Thử A" thành công), **nhưng server đã đầy 10/10 hẻm** (10 hẻm QA/dev cũ từ trước), tạo hẻm mới báo "Bạn đã ở 10 hẻm, hãy rời bớt trước khi tạo mới" [QS]. Không tự rời/xoá hẻm QA (làm hỏng dữ liệu dev) → **parity co-op sống không kiểm được trong đợt này.** Ngoài ra trình duyệt là 1 trang nên cũng không mở 2 tab cùng lúc.
4. **Không đọc được screenshot** (mô hình không nhận ảnh) → mọi bằng chứng lấy từ DOM text + `useGame.getState()` + đo computed style. Không chụp ảnh lưu `docs/reviews/anh/`.

→ Vì các giới hạn trên, báo cáo này là **review hồi quy + quan sát giao diện/state + góp ý người lớn tuổi**, KHÔNG phải playtest vòng-ngày-thật. Mọi phát hiện về nhịp chơi/cảm giác bán hàng xin coi là suy luận có nhãn, cần playtest người thật.

---

## Quy mô persona (đợt chạy nhanh, 6 góc nhìn + 2 bắt buộc)

| Persona | Mục tiêu | Ngưỡng | Thiết bị | Ghi chú |
|---|---|---|---|---|
| P1 Người mới dễ bỏ | Qua ngày 1 theo hướng dẫn | ~10 phút | PC (~780px) | Chơi ngày 1 thật tới bước bày kệ/mở cửa |
| P37 Chủ tạp hóa ngoài đời (soi sổ) | Sổ sách khớp, số liệu thật | cao | PC | Đọc Sổ đầu ngày, tổng kết ngày 1 |
| Người **phá game** (bắt buộc) | Tìm lỗi biên | cao | PC | Nhập hàng hết tiền, Điểm danh, gợi ý-úp, autoplay |
| Người **Việt lớn tuổi/ít chơi** (bắt buộc) | Chữ to, tiếng Việt tự nhiên | vừa | Tablet/PC | Đọc văn bản UI |
| P28 Speedrunner / người nhanh | Làm nhanh, thấy tiến độ | thấp | PC | Mở khóa, autoplay, tốc độ |
| P6 Khuyến khích quay lại hằng ngày | Điểm danh, chuỗi ngày | vừa | Mobile (không đo được) | Điểm danh + vòng quay |

Do thiết bị mobile không mở được (giới hạn 2) và không chơi được vòng ngày thật, phần persona phản ứng theo nhịp chơi là suy luận, không phải quan sát.

---

## Hồi quy so với đợt 1 và đợt 2

| Mã cũ | Nội dung | Trạng thái đợt này |
|---|---|---|
| Đ1-R1 vốn 360k | Bắt đầu 360.000đ | ✅ **đã có** — save mới đúng 360.000đ [QS] |
| Đ1-R3 gợi ý 3 món | "Điền theo gợi ý" điền đủ 3 món | ✅ **đã có** — bấm ra Mì+Nước+Bánh = 316.200đ, "Nhập ngay" bật [QS] |
| Đ1-R2 lỡ bán ngày 1 | Khách hết hàng bỏ về | ⏳ **cải thiện** — body thay món đang chạy: sim ngày 1 của tôi thấy `substituted=4`, `missed.stock=6` (18h ngày lẻ 210k doanh thu). Guard `reviewR2Day1` trần ≤12 theo log GĐ1829. Cần QA save-trắng chuẩn đo lại (như đợt 2 ghi chú) |
| Đ1-R4 bán tự động | Bước "đứng quầy" tự tick | ✅ label đã đổi thành "Đứng quầy chốt đơn (mặc cả…)" [QS] |
| Đ1-R5 đá khuya | Cảnh báo 8× dính | Không chơi tới (rAF đứng) — không kiểm được |
| Đ1-R6 kệ 3D | Bấm kệ không phản hồi | ✅ label đã đổi "đến gần kệ bấm B" [QS]; không bấm thật được cảnh 3D |
| Đ1-R7 -20k "vô cớ" | autoBreakfast | ✅ đã sửa gốc theo GĐ1827 — ngày 1 không tự ăn phở nữa (chưa tái hiện được âm tiền quanh đóng panel nhập) |
| Đ1-R8 tổng kết ngày 1 dày | Gập phần nâng cao | Theo GĐ1826 đã gập sau "Xem phần nâng cao" (chưa xem lại panel đợt này) |
| Đ1-R9 debug API | Chỉ có trên local | ✅ local có đủ `game.perf/useGame/autoplay/layoutAudit` [QS] |
| Đ2-R1 thành tựu +300k | Tổng kết không khớp ví | ⏳ còn liên quan — xem R2 mới bên dưới (questIncome 314k > revenue 210k) |
| Đ2-R2 WebGL warn | Cảnh báo lặp | Không bắt được lỗi đỏ console đợt này (rAF treo, ít render); không kết luận được |
| Đ2-R3 tiền âm co-op | Qua ngày bị âm tiền | ⏳ **có dấu hiệu thật**: trong danh sách hẻm dev thấy 1 hẻm "Ngày 11 · **-7.659đ**" [QS]. `endDay` không chặn sàn 0 → xác nhận thêm giả thuyết đợt 2. Phải sửa/cảnh báo |
| Đ2-R4 nhập hàng mobile dày | Khối thông tin chồng | Không đo lại được (không mở được mobile) |
| Đ2-R5 banner chồng | Nhiều banner cùng lúc | ⏳ **còn thấy** — cùng lúc có "⏰ Đang giờ vàng…" + "🎆 Tết dương lịch: khách +20%…" + "💡 Bạn có biết?…" gối nhau ở đầu màn [QS] |
| Đ2-R6 bày đầy chia kém | Hàng hot ít ô | ⏳ **còn**: sau "Bày đầy cả tiệm" ở đợt này, kệ 1 dồn **10/12 ô Mì gói**, kệ 2 để trống, trong khi kho còn `nuoc=28, banh=27` và Bánh kẹo là hàng hot Tết [QS]. Chưa thấy thuật toán theo dự báo |
| Đ2-R10 dock 9px/35px mobile | Chữ/nút nhỏ mobile | Desktop đo 11px / 48px [QS]; mức mobile không đo lại được |
| Đ2-R11 placeOrder số lẻ/chuỗi | Chấp nhận 0.5/1.5/'3' | ⏳ **còn trong code** — `placeOrder` chỉ lọc `q > 0`, không `Number.isInteger` (`src/core/slices/inventory.ts:52-93`). UI chỉ có nút ± nên không chạm tới qua giao diện; vector rủi ro là nhận lệnh từ máy khách co-op (Luật 4) |

---

## Phát hiện mới

### R1 — Sau đơn ngày 1 (gợi ý đi đúng), người chơi chỉ còn ~43-48k, dưới giá 1 thùng rẻ nhất; panel nhập không báo rõ "thiếu" · P1 · tin cậy vừa
- Loại / ưu tiên / độ tin cậy: mất cân bằng (biên) / **P1** / vừa ([QS] con số, [SL] cảm giác)
- Persona: P1 người mới đi đúng gợi ý, người phá game.
- Quan sát trực tiếp: mua trọn bộ 3 món ngày 1 (316.200đ) → còn **43.800đ** [QS]. Với 43.800đ, bấm "+1 thùng" Mì gói (93.000đ) **không thêm gì** vào đơn, giỏ vẫn 0, nút "📦 Nhập ngay" vẫn ghi "Nhập ngay" (không hiện "Thiếu X₫" vì giỏ rỗng) → **không có phản hồi giải thích tại sao không thêm được** [QS]. Nhận Điểm danh 5.000đ → 48.800đ vẫn không mua nổi thùng nào.
- Tác động: nếu hết hàng giữa ngày 1, người mới **không thể nhập lại** vì không đủ tiền thùng rẻ nhất; chỉ trông vào cơ chế "khách thay món" (ẩn). Cảm giác đứng im không hỗ trợ.
- Suy luận [SL]: phải có lời dạy rõ "tự nhập ít hơn, chừa tiền châm kệ" hoặc cho ô thùng hiện ghi chú "thiếu 49.200đ". Autoplay cho thấy sang ngày 2 lên 684-704k nên kinh tế dài hạn ổn; đây là biên ngày 1.
- Đề xuất [YT]: khi bấm + mà không đủ tiền, hiện ngay "thiếu X₫" trên nút/ô (như hệ "Thiếu X₫" GĐ1631-1649 đã làm cho nút khác); hoặc gợi ý ngày 1 nhập **2 thùng** chừa tiền nếu người chơi muốn trữ đệm.
- Đối chiếu luật cứng: Luật 1 (giữ chân — tránh cảm giác bí bách đầu game); ngân sách chống phình (không thêm UI, chỉ sửa hành vi/hiển thị nút cũ).
- Cần xác minh: chạy QA save-trắng chuẩn xem người đi đúng 3 thùng có bị hết hàng kẹt giữa ngày hay không (gắn với R2 đợt 1).

### R2 — Ngày 1: questIncome (314k) > doanh thu bán (210k) trong mô phỏng · P1 · tin cậy vừa
- Loại / ưu tiên / độ tin cậy: mất cân bằng / **P1** / vừa ([QS] số liệu autoplay, [SL] diễn giải)
- Persona: P37 chủ tạp hóa soi sổ; P6 quay lại mỗi ngày.
- Quan sát trực tiếp: `autoplay(1)` trên save review cho tổng kết ngày 1: `revenue 210.000đ` (33 món, 16 khách), `questIncome 314.000đ`, `rent 20.000đ`, `substituted 4`, `missed.stock 6` [QS]. Lưu ý ngày này tôi vào lúc 14:10 nên chỉ bán 15h–21h (bán nửa ngày).
- Suy luận [SL]: questIncome cao hơn bán hàng chủ yếu từ thưởng thành tựu "Ngon có tiếng" +300k ngày đầu (chính là Đ2-R1). Nhưng với người soi sổ, **"tiền vào ví" không đến từ bán hàng** có thể làm lệch cảm giác và đối nghịch tinh thần Luật 10 ("bán hàng là nghề chính"). Số liệu này là một phần ngày + thưởng 1 lần nên chưa đủ kết luận là phình.
- Đề xuất [YT]: tách dòng "Thưởng thành tựu" trong tổng kết để số tiền khớp ví (đợi xác minh từ đợt 2 trước khi triển khai); nếu muốn giảm ấn tượng, cân nhắc giảm thưởng khởi đầu (quyết định cân bằng — chạm economySim).
- Đối chiếu luật cứng: Luật 10, Luật 4; economySim giữ tỉ số (quest+bet)/salesProfit ≤1 — phải chạy lại nếu đổi.
- Cần xác minh: đo lại với save-trắng bán đủ ngày để tách thành tựu ra khỏi lãi thật.

### R3 — Co-op: server đầy 10/10 hẻm (toàn hẻm QA/dev cũ) nên không tạo hẻm mới để test cặp mới; có hẻm âm tiền (-7.659đ) · P1 (quy trình/tiềm năng lỗi) · tin cậy cao
- Loại / ưu tiên / độ tin cậy: lỗi quy trình + tiềm năng lỗi / **P1** / cao ([QS])
- Persona: P17/P20 co-op (chưa chơi cặp thật).
- Quan sát trực tiếp: `?dev=a` đăng nhập "Thử A" thành công; bảng hẻm liệt kê **10 hẻm** (QA GD1263 coop, Hẻm Test Coop, QA GD665…). Tạo hẻm mới → "Bạn đã ở 10 hẻm, hãy rời bớt trước khi tạo mới" [QS]. Trong đó "QA GD1263 coop · Ngày 11 · cấp 1 · **-7.659đ**" [QS].
- Tác động: không có hẻm sạch để test cặp persona mới; đồng thời hẻm có tiền âm đúng như giả thuyết Đ2-R3 → người chơi co-op có thể bị âm tiền khi qua ngày mà không có cảnh báo (sát Luật 1/4/10).
- Đề xuất [YT]: (a) thêm cảnh báo/chặn sàn 0 ở `endDay` khi tiền không đủ trả thuê/lương (phan về Đ2-R3); (b) ghi chú để dev dọn hẻm QA cũ trước khi bàn giao cho người dùng duyệt co-op.
- Đối chiếu luật cứng: Luật 4 (đủ 2 chế độ — cần hẻm sạch để verify), Luật 1, Luật 10.
- Cần xác minh: tái hiện âm tiền trên save sạch (Đ2-R3 còn mở); nhờ người dùng dọn hẻm QA để test cặp mới.

### R4 — Nút "+ thùng" và "Điền theo gợi ý" khi hết tiền không có phản hồi "thiếu" · P2 · tin cậy cao
- Loại / ưu tiên / độ tin cậy: khó hiểu / **P2** / cao ([QS])
- Persona: P1 người mới.
- Quan sát trực tiếp: ở 43.800đ bấm "+1 thùng" Mì gói → giỏ vẫn 0, không toast, không báo lý do; "Nhập ngay" giữ nguyên chữ [QS]. Đợt này không thấy dòng "Thiếu X₫" ở ô số thùng (khác hệ nút mua khác đã có "Thiếu X₫" từ GĐ1631-1649).
- Suy luận [SL]: người mới không biết vì sao nút không ăn → bối rối đầu game (một người ở đợt 1 R1/R3 đã từng bị kẹt đúng bước này).
- Đề xuất [YT]: hiện "thiếu X₫" ngay trên ô/nút như chuẩn "Thiếu X₫" đã áp dụng khắp nơi khác — nhất quán UX, không thêm nút mới.
- Đối chiếu: ngân sách chống phình (chỉ sửa nhãn), Luật 1.
- Cần xác minh: kiểm `OrderPanel` có hỗ trợ hiển thị "Thiếu" chưa (có thể đã có ở bước khác).

### R5 — "Bày đầy cả tiệm" vẫn bỏ trống kệ 2 và dồn nhiều Mì gói kệ 1, dù kho còn Bánh kẹo hot · P2 · tin cậy vừa
- Loại / ưu tiên / độ tin cậy: mất cân bằng / **P2** / vừa ([QS] state)
- Persona: P2 casual, P9 thích làm đẹp+kiếm tiền.
- Quan sát trực tiếp: sau "Bày đầy cả tiệm": kệ uid1 có **10/12 ô Mì gói**, kệ uid2 rỗng; kho còn `nuoc=28, banh=27` [QS]. Bánh kẹo là hàng hot Tết dương lịch nhưng chỉ bày ít.
- Suy luận [SL]: thuật toán bày chưa tính theo dự báo/hot (chỉ xếp theo thứ tự/hàng có sẵn); người chơi casual dùng nút này sẽ bày lệch, mất doanh ngày đông khách.
- Đề xuất [YT]: chỉnh thuật toán chia ô theo nhu cầu dự báo/hot, không đổi nút (bảo toàn "Đừng phá" đợt 1/2).
- Đối chiếu: Luật 1 (giữ chân qua hiệu quả); không đổi UI/nút.
- Cần xác minh: so với đợt 2 R6 — có thể đã có test/guard? Chưa thấy ghi hành vi mới trong PROGRESS ≥ GĐ1829.

### R6 — Banner/thông báo gối nhau ở đỉnh màn hình · P2 · tin cậy vừa-khá
- Loại / ưu tiên / độ tin cậy: bất tiện / **P2** / vừa ([QS])
- Persona: P3 lớn tuổi, P2 casual, P5 nhạy thông tin.
- Quan sát trực tiếp: cùng một khung nhìn xuất hiện đồng thời "⏰ Đang giờ vàng…", "🎆 Tết dương lịch: khách +20%…", "💡 Bạn có biết?…" gối nhau phía trên [QS] (giống toàn cảnh Đ2-R5).
- Suy luận [SL]: người mới/lớn tuổi dễ ngợp; không biết cái nào là lời dạy ưu tiên.
- Đề xuất [YT]: giới hạn 1–2 banner cùng lúc, còn lại xếp hàng/hẹn giờ (không thêm nút — chỉ sắp xếp hiển thị).
- Đối chiếu: ngân sách thông báo (≤90, ≤1 ý) — đây là banner, cùng triết lý giảm nhiễu.
- Cần xác minh: đếm chính xác số banner chồng ở cỡ màn thật.

### R7 — Tiếng Việt & tên món: tự nhiên, đủ dấu, đúng chất tạp hóa Việt · (+) · tin cậy khá
- Loại: đánh giá tính cách (người Việt lớn tuổi bắt buộc) / **không cần sửa**.
- Quan sát trực tiếp: đọc nhiều văn bản UI — Sổ đầu ngày ("Tiền nhà trả cuối ngày: 20.000đ", "góp vật liệu Sân chơi", "Thương lái ghé đầu ngõ", "Rốn kho chung"), Nhập hàng, Điểm danh, checklist, hướng dẫn — tiếng Việt đủ dấu, từ ngữ đời thường, không thấy từ máy móc/dịch vụng [QS].
- Ghi chú: rào cản cho người lớn tuổi giờ chủ yếu là **cỡ chữ/nút mobile** (Đ2-R10), không phải từ ngữ — đợt này không đo lại được mobile nhưng Desktop 11px khá ổn. Cần thêm dữ liệu tên món vùng miền (Nam/Bắc) — chưa rà đủ.

### R8 — Việc góp "Sân chơi 8.000đ" xuất hiện ngay từ ngày 1 trên người mới ít tiền · P2 · tin cậy thấp
- Loại / ưu tiên / độ tin cậy: mất cân bằng (nhẹ) / **P2** / thấp ([QS], [SL] diễn giải)
- Persona: P3 lớn tuổi (thích gắn kết hẻm, không thích bị vòi tiền).
- Quan sát trực tiếp: ngày 1 và ngày 2, Sổ đầu ngày đều xếp "🏗️ Góp vật liệu Sân chơi hôm nay (8.000đ) → nên làm" [QS]; ngày 1 người chơi chỉ có 43.800đ + 20k tiền nhà cuối ngày.
- Suy luận [SL]: khoản góp cộng đồng (8.000đ = ~18% số dư đầu) hiện khi người mới đang eo hẹp có thể gây áp lực/cảm giác bị vòi; người lớn tuổi coi trọng hẻm có thể thấy hay, người khác thấy nhiễu. Ghi nhận bất đồng.
- Đề xuất [YT]: cân nhắc dời lời mời góp sang ngày 2–3 khi người chơi có tiền, hoặc để số tiền nhỏ hơn. (Quyết định cân bằng — thuộc Leader/Game Designer.)
- Đối chiếu: Luật 1; chiều sâu-hẻm giữ được, chỉ chỉnh thời điểm.

---

## Bảng tổng hợp

| Mã | Vấn đề | Nhóm ảnh hưởng | P / tin cậy | Khuyến nghị |
|---|---|---|---|---|
| R1 | Sau đơn ngày 1: 43-48k không mua nổi thùng, panel không báo rõ | người mới | P1 / vừa | **Cần xác minh** (QA save-trắng) rồi làm |
| R2 | Ngày 1 questIncome 314k > doanh thu 210k (thưởng +300k) | người soi sổ | P1 / vừa | **Cần xác minh** (tách thành tựu), liên Đ2-R1 |
| R3 | Co-op đầy 10/10 hẻm QA; có hẻm âm tiền -7.659đ | co-op | P1 / cao | **Cần xác minh + dọn hẻm QA**; liên Đ2-R3 |
| R4 | Nút + thùng / gợi ý khi hết tiền không báo "Thiếu" | người mới | P2 / cao | **Đưa vào backlog** (rẻ, đồng bộ chuẩn "Thiếu X₫") |
| R5 | Bày đầy bỏ trống kệ 2, dồn Mì, hàng hot ít ô | casual | P2 / vừa | **Cần xác minh** (Đ2-R6 còn) |
| R6 | Banner gối nhau đỉnh màn hình | lớn tuổi, casual | P2 / vừa | **Đưa vào backlog** (Đ2-R5 còn) |
| R7 | Tiếng Việt tự nhiên, đủ dấu | (tốt) | — | **Không cần sửa** |
| R8 | Góp Sân chơi 8k ngay ngày 1 | lớn tuổi (bất đồng) | P2 / thấp | **Để sau / cân nhắc** |

## Đừng phá (mọi persona thấy tốt, phiên dev sau giữ nguyên)
1. Checklist 5 bước "Ngày đầu mở tiệm" + tự tick — dẫn dắt người mới rõ [QS].
2. Nút "✨ Điền theo gợi ý" và "📥 Bày đầy cả tiệm" — 1 cú bấm làm xong vòng nhập/bày [QS] (đừng bỏ nút; chỉ chỉnh thuật toán chia ô nếu làm R5).
3. Khối "Đã cứu N lượt nhờ khách nhận món thay" — giải thích vì sao hết hàng vẫn bán được [QS qua sim/state].
4. Sổ đầu ngày "Việc hôm nay · ưu tiên" + nhu cầu quầy theo giờ — dẫn dắt hằng ngày tốt [QS].
5. F5/"Chơi tiếp trong máy" giữ đúng tiền/ngày/cấp; Điểm danh ghi ngày, chuỗi và vòng quay lộ trọng số [QS].

## Góp ý nhỏ (một dòng/ý)
- Bản dev `?dev=a` đăng nhập "Thử A" không cần Google — đã ghi nhận server 3002 chạy DEV_AUTH_BYPASS [QS].
- Ở day-2 Sổ đầu ngày có nhắc "🙏 Ngày cúng còn 13 ngày" — nét văn hóa hẻm hay, nhưng chưa rõ nó dẫn tới việc gì (người mới có thể thấy mơ hồ) [QS+SL].
- Nhập hàng mở lại vẫn giữ checklist "Ngày đầu nhập 3 món" chưa tick dù đã mua — chỉ theo giỏ hiện tại nên hợp lý, không phải lỗi [QS].
- Lỗi 404 `/favicon.ico` khi tải vẫn còn (nhiễu console khi dò lỗi thật) — nhỏ [QS theo Đ2-R11 tái ghi].

## Câu hỏi cần playtest người thật
1. Sau khi nhập đủ 3 món ngày 1 còn ~43k: nếu hết hàng giữa ngày, người mới có biết mình bí vì không đủ tiền nhập lại không, và có bỏ game vì cảm giác đứng im?
2. Người soi sổ có thấy "tiền vào ví" nhờ thưởng +300k thành tựu là phù hợp hay lệch với "bán hàng là nghề chính"?
3. Trên điện thoại thật (375×812), dock 9px/35px có còn là rào cản lớn cho người lớn tuổi không (cần đo lại môi trường có emulation)?
4. Co-op khi server hết hẻm: người chơi tạo hẻm mới có hiểu cần rời bớt hẻm cũ không?

## Giới hạn của lần review này
- **Không chơi được vòng ngày thật** (rAF treo → đồng hồ đứng, `tick()` tay không sinh khách): mọi cảm nhận nhịp chơi/chốt đơn là suy luận, KHÔNG quan sát. Dữ liệu kinh tế lấy từ `autoplay` (mô phỏng đồng bộ).
- **Không đo được mobile 375×812** (không có emulation viewport) → chỉ báo desktop.
- **Co-op parity sống không test được** (server đầy 10/10 hẻm QA; trình duyệt 1 trang).
- Không đọc được ảnh minh hoạ (model không nhận ảnh) → bằng chứng bằng text/state.
- Kết quả là mô phỏng định tính, không thay playtest thật; không dùng số persona làm bằng chứng định lượng.
- Commit `eacedbe3` trùng đợt 2 → các góp ý đợt 2 chưa sửa vẫn còn nguyên trong code.

---

## 3–5 vấn đề đáng xem trước
1. **R1 + Đ1-R2**: vòng biên ngày 1 — người đi đúng hướng dẫn hết tiền, không nhập lại được. Cần QA save-trắng chuẩn đo lại (đã treo từ đợt 2).
2. **Đ2-R3 / R3**: tiền âm khi qua ngày co-op (có hẻm thật -7.659đ) — đáng cảnh báo/chặn sàn 0 trước khi bàn giao.
3. **R2 / Đ2-R1**: minh bạch tổng kết ngày (thưởng thành tựu vs lãi bán thật) — người soi sổ mất tin.
4. **R5 / Đ2-R6**: "Bày đầy cả tiệm" chưa theo dự báo hot — gây mất doanh ngày lễ.
5. **R4**: feedback "Thiếu tiền" nhất quán ở nhập hàng (nối chuỗi "Thiếu X₫" đã làm khắp nơi).

## Điều cần người dùng/Leader chốt
- Có dọn bớt các **hẻm QA/dev cũ** để có chỗ test co-op cặp mới không (không tự xoá để tránh phá dữ liệu QA).
- Chọn các mã R đưa vào backlog theo `promt_game.md` (báo cáo này KHÔNG tự thêm vào backlog).
