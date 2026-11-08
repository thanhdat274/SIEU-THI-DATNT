# Review người chơi khó tính — 2026-11-08 (đợt 1)

- **Người review:** hội đồng persona mô phỏng theo `PROMPT-REVIEW-NGUOI-CHOI-KHO-TINH.md` (bộ archetype `persona-roster.md`).
- **Quy mô:** đợt chạy nhanh — **8 persona đại diện** (quy mô nhỏ theo quy tắc trong prompt): P1 người mới dễ bỏ, P3 người mới lớn tuổi, P5 nhạy hiệu năng, P7 nhịp ngày đều, P26 nhà phê bình, P37 chủ tạp hóa ngoài đời, P28 speedrunner, +1 persona **phá game**.
- **Bản được xem:** **bản web** `https://sieu-thi-datnt.vercel.app/` (local `localhost:5173` KHÔNG chạy lúc review — curl trả 000, không tự khởi động server theo Luật 11). Commit code gốc: `1f758d21` (GĐ1817) — bản web có thể khác code local mới nhất; không suy đoán hai bản giống nhau.
- **Thiết bị mô phỏng:** desktop 1280×720 · điện thoại 375×812 · máy yếu `?gfx=low`.
- **Trạng thái game:** save review mới tạo trong trình duyệt review (không đụng save thật của người dùng); chơi tiếp sau F5 và qua `?gfx=low`.
- **Co-op/hẻm online:** **chưa kiểm tra được trong đợt này** (cần đăng nhập Google của người dùng — không tự đăng nhập).
- **Giới hạn môi trường:** không bật được CPU throttle 4× trong browser tích hợp; `window.game.perf()` / `useGame` **không tồn tại trên bản web** (chỉ bản dev) nên FPS đo bằng rAF thủ công; bộ thu console gắn sau khi trang load nên lỗi lúc load đầu chưa bắt được.
- **Chưa chơi tới:** trại (cấp 8), nhân viên, giá bán/kinh doanh (cấp 3), quán nước, chi nhánh, NG+.

---

## Tóm tắt điều hành

Ngày 1 chơi được trọn vòng cốt lõi **nhập → bày → mở cửa → bán → ngủ** mà không kẹt cơ chế; kỹ thuật sạch (0 lỗi console, FPS 75 ở mức Thấp, save giữ qua F5, chặn 2 tab, chặn nhập số lượng rác). Vấn đề lớn nhất không phải lỗi mà là **kinh tế ngày đầu**: hướng dẫn bắt nhập 3 món nhưng vốn không đủ, và kết thúc ngày là "28 khách không mua vì hết hàng, bỏ lỡ ~113.000đ" — cảm giác ngày đầu là thất bại, trái với mục tiêu giữ chân (Luật 1).

---

## Góp ý (R1–R10)

**R1 — Hướng dẫn ngày 1 bắt nhập 3 món nhưng vốn không đủ**
- Loại / ưu tiên / độ tin cậy: mất cân bằng / **P1** / cao
- Persona: P1 người mới (desktop, ngày 1, 6h sáng)
- Quan sát trực tiếp: vốn 280.000đ khi vào Nhập hàng; chọn đủ 3 món theo hướng dẫn "🧭 Ngày đầu tiên: nhập 3 món trước" (Mì gói 93.000 + Nước suối 100.800 + Bánh kẹo 122.400) → đơn **316.200đ, "thiếu 36.200đ"**, nút "📦 Nhập ngay" **disabled**. Ngay cả với 300.000đ ban đầu vẫn thiếu.
- Bước tái hiện: game mới → Sổ đầu ngày → Nhập hàng → +1 thùng cho cả 3 món gợi ý.
- Tác động: người mới đi đúng theo hướng dẫn bị kẹt ngay bước 1 của ngày 1 — nguy cơ rời game cao nhất tại đây.
- Suy luận: có thể do Tết dương lịch "giá nhập +3%" đẩy 3 thùng vượt 300k; nếu vậy sự kiện + giá nhập cũng làm lệch hướng dẫn onboarding.
- Đề xuất: hạ trần gợi ý ngày 1 xuống 2 món, hoặc tăng vốn ngày 1 lên ≥ 320k, hoặc để "Điền theo gợi ý" tự chọn tổ hợp vừa túi tiền.
- Đánh đổi: đổi vốn ngày 1 chạm kinh tế (phải chạy lại economySim); hạ gợi ý xuống 2 món là rẻ nhất.
- Đối chiếu luật cứng: Luật 1 (giữ chân), ngân sách chống phình — không thêm UI mới.
- Cần xác minh thêm: giá nhập ngày thường (không Tết) có vừa 300k cho 3 món không.

**R2 — Ngày 1 kết thúc với 28/55 lượt khách "không mua vì hết hàng"**
- Loại / ưu tiên / độ tin cậy: mất cân bằng / **P1** / cao
- Persona: P1 + P7 (cùng một save, ngày 1)
- Quan sát trực tiếp: bán 30 món là **hết sạch hàng từ trưa** (mì hết ~12h, nước suối 9/12); tổng kết: "28 khách không mua vì hết hàng · Hết hàng bỏ lỡ ~113.000đ · 8/27 khách không hài lòng"; "Tiền vào − tiền ra **▼ -57.400đ**".
- Bước tái hiện: nhập tối đa 2 thùng (đủ tiền) → mở cửa cả ngày → đọc tổng kết.
- Tác động: bài học người chơi rút ra là "mình thất bại vì nghèo", không phải "mình học được vòng lặp" — ốm cảm giác ngày đầu.
- Đề xuất: cân bằng lại cầu ngày 1 (giảm ~30–40% khách hoặc tăng sức chứa kệ ngày đầu) hoặc vốn khởi đầu đủ nhập 3–4 thùng; giữ nguyên công thức từ ngày 2 trở đi.
- Đánh đổi: chạm economySim (Luật 10: phải giữ lãi bán hàng thật dương — hiện +46.000đ, dư địa nhỏ).
- Đối chiếu luật cứng: Luật 1, Luật 10; mục "Người chơi mới: ngày đầu chỉ dạy vòng lõi".
- Cần xác minh thêm: chạy economySimL5 để chọn số không làm vỡ biên.

**R3 — Nút "✨ Điền theo gợi ý" không khớp hướng dẫn "nhập 3 món"**
- Loại / ưu tiên / độ tin cậy: khó hiểu / P2 / cao
- Persona: P1
- Quan sát trực tiếp: bấm "Điền theo gợi ý" → chỉ điền **1/3** món (Bánh kẹo 1 thùng), trong khi panel và checklist đều bảo nhập 3 món.
- Đề xuất: cho nút này điền đúng bộ 3 món ngày đầu (hoặc đúng số món panel đang khuyên) — gộp được, không thêm nút mới.
- Đối chiếu: ngân sách chống phình (không thêm UI, chỉ sửa hành vi nút cũ).

**R4 — Bán hàng chạy tự động, bước "Đứng quầy tính tiền" tự tick**
- Loại / ưu tiên / độ tin cậy: khó hiểu / P1 / cao (quan sát), nguyên nhân — vừa
- Persona: P1, P28 speedrunner
- Quan sát trực tiếp: tôi **không bấm vào bất kỳ khách nào**; bước "Đứng quầy tính tiền cho khách" chuyển ✅ tự động; tiền tăng 106k → 174k → 286k dần dần. Tip "Đứng gần quầy thu ngân để tính tiền nhanh cho khách" là cơ chế duy nhất nói về vai trò chủ động, nhưng không bao giờ được dạy hay bắt buộc.
- Tác động: người mới không hiểu mình *phải làm gì* ngoài chờ; fantasy "chủ tiệm đứng quầy" bị mờ; hai persona chê / hai persona thích (người thư giãn thích tự động) — **bất đồng có thật giữa persona, ghi cả hai**.
- Đề xuất: nhấn mạnh cơ chế tính tiền ở ngày 1 (1 dòng trong checklist hoặc hiệu ứng khi khách chờ), hoặc cho bước 4 chỉ tick khi người chơi thực sự đứng quầy nhận ít nhất 1 đơn.
- Cần xác minh thêm: đứng xa quầy thì tốc độ bán có giảm thật không (chưa đo được vì bản web không có debug state).

**R5 — Cảnh báo "Đá khuya" dễ dính khi chơi 8×; hậu quả chưa thấy**
- Loại / ưu tiên / độ tin cậy: bất tiện / P2 / vừa
- Persona: P28 speedrunner
- Quan sát trực tiếp: bật 8× lúc ~22h game, vài giây thật sau đã 00:08 với băng đỏ "🌙 Đá khuya! Về nhà ngủ trước 3:00 sáng kẻo ngật"; checklist cuối "Tối về nhà đi ngủ" chưa tick. Không rõ "ngật" làm gì (chưa dám thử trên save).
- Đề xuất: khi ở 8×, kéo dài cửa sổ 22h–3h theo thời gian thực, hoặc hiện đếm ngược lớn hơn; cần giải thích hậu quả "ngật" trước khi nó xảy ra lần đầu.
- Đối chiếu: Luật 1 (giữ chân — hình phạt không được cảm giác là "bẫy").

**R6 — Bấm vào kệ 3D hai lần không phản hồi; đường 2D thì tốt**
- Loại / ưu tiên / độ tin cậy: khó hiểu / P2 / vừa (có thể bấm trượt — cần xác minh)
- Persona: P1, P3
- Quan sát trực tiếp: checklist bảo "Bày hàng lên kệ (bấm vào kệ)"; click vào kệ gỗ trong cảnh 3D (2 điểm khác nhau) **không mở panel, không có phản hồi nào**; mở được nhờ nút "🗺️ Sơ đồ kệ" — panel 2D này rất tốt: có "📥 Bày đầy cả tiệm", "✨ Tự chọn", tình trạng từng ô.
- Đề xuất: khi bấm trúng kệ phải có phản hồi ngay (highlight + panel); nếu bấm trượt, hiện gợi ý nhẹ lần đầu. Chỉnh chữ checklist thành "bấm vào kệ hoặc mở Sơ đồ kệ".
- Cần xác minh thêm: tái hiện trên bản local (dev) để chắc không do click mapping của bản web.

**R7 — 300.000đ thành 280.000đ không ai giải thích**
- Loại / ưu tiên / độ tin cậy: khó hiểu / P2 / cao (quan sát), nguyên nhân — suy luận
- Persona: P37 chủ tạp hóa ngoài đời (soi sổ sách)
- Quan sát trực tiếp: HUD ban đầu 300.000đ; khi mở Sổ đầu ngày đã còn 280.000đ; tổng kết đêm ghi "Tiền nhà (theo bậc tiệm) -20.000đ" nhưng Sổ sáng lại ghi "**Tiền nhà trả cuối ngày**: 20.000đ".
- Suy luận: tiền nhà bị trừ lúc đầu ngày trong khi chữ nói "cuối ngày" — lệch lời nói với sổ sách.
- Đề xuất: chọn một: trừ thật cuối ngày, hoặc đổi chữ thành "Tiền nhà: 20.000đ (đã trừ đầu ngày)".

**R8 — Tổng kết cuối ngày rất dày với người chơi ngày 1**
- Loại / ưu tiên / độ tin cậy: bất tiện (mặt trái của chiều sâu) / P2 / vừa
- Persona: P3 lớn tuổi, P26 nhà phê bình
- Quan sát trực tiếp: panel tổng kết ngày 1 gồm: bảng 9 dòng, khu kỷ lục 3 nút, ca đêm + nâng cấp 15tr, tiền vào theo hình thức thanh toán, khách theo giờ 11 dòng, "vì sao khách không mua" 4 khối, ... — dài hơn 2 màn hình.
- Mặt tốt: mọi khối đều có dữ liệu thật + nút hành động ("📦 Nhập hàng", "🧺 Xếp kệ") — đúng nguyên tắc "không hộp đen".
- Đề xuất: ngày 1–2 gập phần nâng cao (kỷ lục, thanh toán, ca đêm) vào nút "Xem chi tiết"; từ ngày 3 mở mặc định. Không xóa nội dung.
- Đối chiếu: tinh thần ngân sách "số thông báo ngày đầu ≤10" — đây là panel không phải thông báo nên không vi phạm, nhưng cùng một triết lý.

**R9 — Bản web không có debug API (`game.perf`, `useGame`)**
- Loại / ưu tiên / độ tin cậy: lỗi quy trình (không phải lỗi người chơi) / P2 / cao
- Quan sát trực tiếp: `window.game` trên vercel là object rỗng — `perf()` và `useGame.getState()` không tồn tại; quy trình QA trong `docs/qa-guide.md` và file review đều dựa vào các API này trên bản local.
- Đề xuất: không cần thêm vào bản production (bundle +); chỉ ghi rõ vào qa-guide: debug API chỉ có trên local, review trên web phải đo FPS bằng rAF thủ công.

**R10 — Những thứ làm đúng (bằng chứng trực tiếp)**
- Chặn 2 tab: tab thứ hai hiện "Game đang mở ở tab khác" + nút Thử lại — bảo vệ save tốt.
- F5 giữ tiến trình: nút "Chơi tiếp trong máy (ngày 2)" khôi phục đúng 542.600đ, Ngày 2.
- Validation nhập hàng: ô số thùng nhận `-3` → xóa trắng, `abc` → xóa trắng, `999` → kẹp về số ô kho còn trống (4).
- Spam Mở cửa/Đóng cửa 6 lần: trạng thái nhất quán, tiền không đổi.
- 0 lỗi console trong suốt ~3 giờ game (ngày 1–2, desktop + mobile + gfx low); FPS **75** ở `?gfx=low` (không CPU throttle).
- Tự hạ đồ họa khi máy nặng: "Máy hơi nặng nên game tự giảm đồ họa xuống Vừa cho mượt hơn".
- Tự lưu có báo: "💾 Đã tự động lưu game".

---

## Bảng tổng hợp

| Mã | Vấn đề | Nhóm bị ảnh hưởng | P / tin cậy | Khuyến nghị |
|---|---|---|---|---|
| R1 | Hướng dẫn ngày 1 thiếu tiền nhập 3 món | người mới | P1 / cao | **Đưa vào backlog** |
| R2 | Ngày 1 mất 28 lượt khách vì hết hàng | người mới | P1 / cao | **Đưa vào backlog** (chạy economySim trước) |
| R4 | Bán tự động, bước "đứng quầy" tự tick | người mới, người thích chủ động | P1 / cao | **Cần xác minh** rồi quyết |
| R3 | "Điền theo gợi ý" điền 1/3 món | người mới | P2 / cao | **Đưa vào backlog** (rẻ, gộp với R1) |
| R5 | Cảnh báo đá khuya dễ dính ở 8× | người chơi nhanh | P2 / vừa | **Cần xác minh** hậu quả "ngật" |
| R6 | Bấm kệ 3D không phản hồi | người mới | P2 / vừa | **Cần xác minh** trên local |
| R7 | Trừ tiền nhà lệch với chữ "cuối ngày" | người soi sổ | P2 / cao | **Đưa vào backlog** (sửa 1 dòng chữ) |
| R8 | Tổng kết ngày 1 quá dày | người lớn tuổi, người mới | P2 / vừa | **Để sau** (gập nâng cao, không xóa) |
| R9 | Bản web thiếu debug API cho QA | quy trình QA | P2 / cao | **Đưa vào backlog** (sửa qa-guide) |

## Đừng phá (điều persona thích nhất — phiên dev sau giữ nguyên)

1. Checklist onboarding 5 bước "Ngày đầu mở tiệm" — mọi persona đều biết phải làm gì mà không cần đọc tài liệu.
2. Nút nhanh "📥 Bày đầy cả tiệm" / "✨ Tự chọn" trong Sơ đồ kệ — bày 24 ô trong 1 cú bấm.
3. Tổng kết có khối "Vì sao khách không mua · nên làm gì" kèm nút hành động trực tiếp.
4. Sổ đầu ngày có "Việc hôm nay · ưu tiên" + nhu cầu quầy theo khung giờ — dẫn dắt hằng ngày tốt.
5. Thông báo tự hạ đồ họa và tự lưu luôn nói rõ bằng một dòng ngắn, không spam.

## Góp ý nhỏ (một dòng/ý)

- Mobile 375×812: dock chiếm ~2 hàng nút + hàng phụ, hơi cao nhưng không che cảnh; chữ nhỏ nhất vẫn đọc được, chưa test cảm ứng thật.
- Tiêu đề panel mobile xuống dòng lộn xộn ("Sổ đầu ngày 2 (2/1) · Thứ 3" bọc 3 dòng).
- Nút HUD "Nhập hàng" có badge "🛒 Phiên chợ" ngày 2 — gợi ý tốt, chưa khám phá sâu.
- "Sàn tiệm bẩn (32%) · mất ~4 khách/ngày (24.192đ)" — số liệu phản hồi tốt; nút "Lau nhà" có sẵn.

## Câu hỏi cần playtest người thật

1. Bạn mới chơi có nhận ra phải nhập hàng *ít hơn* hướng dẫn vì thiếu tiền, và có bỏ game tại bước này?
2. Người chơi có hiểu vai trò của việc "đứng quầy" khi bán hàng tự chạy?
3. Hậu quả "ngật" lúc 3:00 sáng có được hiểu trước, hay cảm giác là bị phạt oan?

## Giới hạn của lần review

- Review trên **bản web vercel** (local không chạy) — code có thể khác commit `1f758d21` đang ở máy.
- Không CPU throttle, không đo được FPS qua `game.perf()` (bản web không có debug API), bộ thu console gắn sau load.
- Không đăng nhập được co-op; chưa chơi tới trại, nhân viên, giá bán, kinh doanh, quán nước, NG+, ca đêm chủ động.
- Kết quả là mô phỏng định tính, không thay thế playtest người thật; không dùng số liệu persona làm bằng chứng định lượng.

---

## Kết quả xác minh & xử lý ở phiên dev GĐ1823 (cùng ngày)

| Mã | Kết quả xác minh bằng code / thao tác | Đã làm |
|---|---|---|
| R1 | **Đúng.** `newGameData()` vốn 300k; bộ 3 món ngày Tết 316.200đ → kẹt. | Vốn đầu **300k → 360k** (`store.ts`); test `saveMigration` theo vốn mới. |
| R2 | **Giảm nhẹ.** Với vốn mới, người chơi có thể nhập 3 thùng (~103 món tính cả hàng khai trương) — đủ bày cả ngày thay vì 2 thùng. Cân bằng cầu ngày 1 chưa đụng tới. | Chờ QA chơi lại ngày 1 trên bản local để đo lại số khách "không mua vì hết hàng". |
| R3 | **Đúng.** Nút gợi ý bị trần 40% (`DAY1_SUGGEST_SHARE`, GĐ1514) chặn ở 1 thùng. | `suggestBudget()` thêm `minTotal` = giá trọn bộ 3 món hướng dẫn; nút gợi ý ngày 1 điền đủ bộ (test mới 4 case). |
| R4 | **Xác minh.** `checkout()` do agent khách tự gọi (`agents/customers.ts`) — bán hàng tự chạy; đứng quầy mở chiều sâu (mặc cả, đặt trước, trả góp — `playerAtCounter`). | Đổi label bước 4 thành "Đứng quầy chốt đơn (mặc cả, đặt hàng trước)" (`tutorialSteps.ts`). |
| R5 | **Xác minh.** Ngất lúc `faintMinutes` (3:00, +60 phút nếu ăn sáng) mất "tiền thuốc" (`clock.ts`); sau 24:00 game tự hạ về 1× và nhắc (GĐ786). | Không đổi — cơ chế tự bảo vệ đã có; theo dõi cảm giác người chơi ở QA sau. |
| R6 | **Xác minh.** Kệ 3D không mở bằng click — phải đứng gần ≤1,2 m bấm **B** (`main.tsx buildInteractables`) hoặc Sơ đồ kệ. | Đổi label bước 2 thành "Bày hàng lên kệ (đến gần kệ bấm B)". |
| R7 | **Không tái hiện trên local:** reset game mới giữ nguyên 300k, Sổ đầu ngày không trừ tiền; rent chỉ trừ ở `endDay`. Bản web (commit có thể khác) vẫn nghi. | Không đổi code; ghi lại đây — QA lần sau kiểm lại trên bản web sau deploy. |
| R9 | **Đúng.** Bản web trả `window.game` rỗng. | `docs/qa-guide.md` thêm mục "Debug API chỉ có trên bản local". |
| R8 | Chưa xử lý (để sau — gập phần nâng cao ngày 1–2). | — |

**Đã sửa thêm:** test `suggestBudget` có 4 case mới khóa hành vi `minTotal`; thông báo ngày 1 đổi thành "Ngày đầu điền đủ bộ 3 món hướng dẫn".

## Kết quả xử lý tiếp — GĐ1826 (cùng ngày, phiên dev thứ hai)

| Mã | Kết quả | Đã làm |
|---|---|---|
| R1/R3 | **Xác minh live trên bản local (code GĐ1823):** vốn 360k → nút "✨ Điền theo gợi ý" điền **đủ 3 món** (mì + nước + bánh kẹo = 316.200đ), "Nhập ngay" bật, mua xong còn 43.800đ. Sửa thêm 1 lỗi phát hiện khi QA: bộ 3 món ngày đầu phải tra trên **danh sách đầy đủ của mối** (`rows`) chứ không phải danh sách đang lọc "✨ Nên nhập" (`shown`) — mì/nước có sẵn hàng khai trương nên suggest=0, chỉ tra `shown` thì giỏ thiếu 2/3 món. | `OrderPanel.tsx` (guideRows từ `rows`) |
| R8 | **Xong.** Ngày 1–2 tổng kết gập khối nâng cao (kỷ lục, ca đêm, thanh toán, giờ bán) sau nút "🔎 Xem phần nâng cao"; "Vì sao khách không mua · nên làm gì" và lõi tiền/lãi giữ nguyên hiển thị. Xác minh live: ngày 1 hiện đúng nút, khối nâng cao ẩn; từ ngày 3 mở mặc định. Test mới `day1SummaryCompact.test.ts` (3 case). | `ReportPanels.tsx` |
| R2 | **Chưa đo được trong trình duyệt:** lượt QA ngày 1 trên local bị nhiễu kịch bản điều khiển (hội thoại chương 1 chặn đồng hồ, nhân vật chưa đứng quầy → khách vào 32 lượt mà không chốt đơn nào) — là hạn chế của cách chạy QA, không kết luận được cầu ngày 1. `economySim` trong test vẫn chứng minh bot ngày 1 đạt mục tiêu doanh thu người mới. | Giao QA save trắng chuẩn (`docs/qa-guide.md`) cho phiên sau để đo lại số khách "không mua vì hết hàng" với vốn 360k. |
| R7 | **Tái hiện 1 lần trên local:** sau khi mua 3 thùng (còn 43.800đ), tiền tụt 20.000đ (stats.spent +20.000đ) quanh lúc đóng panel nhập hàng — chưa tìm ra thủ phạm; probe money-subscribe gắn sau đó không bắt thêm lần nào (endDay trừ thuê 20k + tiền thuốc ngất 4.380đ là hợp lệ, có log). | Nghi vấn mở — phiên QA sau chạy lại với probe từ đầu phiên. |

**Kết luận GĐ1826:** R1/R3/R8 đóng; R2 chờ QA save trắng; R7 mở nghi vấn có probe theo dõi.

## Kết quả xử lý tiếp — GĐ1827 (cùng ngày, phiên dev thứ ba): R2 + R7 đóng

| Mã | Kết quả | Đã làm |
|---|---|---|
| R2 | **Đo được bằng mô phỏng chuẩn** (test mới `reviewR2Day1.test.ts`, save trắng `newGameData()` + autoplay 1 ngày, seed tất định): vốn 360k → khách 43 · bán 77 món · **lỡ vì hết hàng 17** (kèm 4 khách không hài lòng) — so với vốn 280k cũ: 28 lỡ / 55 lượt. Cải thiện rõ; 17 còn lại một phần là bài học "châm kệ giữa ngày" mà game đang dạy. | Khoá guard trần **≤17** ("chỉ được giảm"); số liệu in ra stdout cho Leader đối chiếu. Nếu muốn giảm nữa phải sửa cầu ngày 1 (chạm economySim — làm riêng có kế hoạch). |
| R7 | **Giải mã xong — không phải lỗi sổ sách:** `autoBreakfast()` (main.tsx) — nhân vật đứng gần bàn ăn cạnh giường trong nhà (≤1,3 m, trước 11h) là game **tự mua tô phở 20.000đ** (`BREAKFAST.price`, `biz.ts`). Cả 2 lần bắt được (bản web lúc review + bản local GĐ1826) đều xảy ra khi nhân vật đang đứng ở nhà. | Ngày 1 không tự gọi phở (người mới chưa biết cơ chế — tiền lặng lẽ trừ 20k là "mất tiền vô cớ"); từ ngày 2 tự ăn như cũ, toast trở thành lời dạy. Xác minh live: ngày 1 đứng ở nhà 12 giây — tiền giữ nguyên 360.000đ. |

**Kết luận GĐ1827:** toàn bộ góp ý trong review này đã xử lý hoặc khoá guard — R1/R3/R8/R9 đóng (GĐ1823/1826), R2 khoá trần đo được, R7 sửa gốc. Việc còn mở duy nhất: muốn giảm sâu hơn số "lỡ bán ngày 1" dưới 17 phải cân bằng lại cầu ngày 1 (riêng một giai đoạn có kế hoạch economySim).

## Kết quả xử lý tiếp — GĐ1828 (cùng ngày): R2 đóng bằng dữ liệu đo

Đo lỡ-bán ngày 1 ở 5 mức vốn (save trắng + autoplay, seed tất định, test `reviewR2Day1.test.ts`):

| Vốn | Khách | Bán | Lỡ hết hàng |
|---|---|---|---|
| 360k (hiện tại) | 37 | 65 | 16 |
| 400k | 36 | 66 | 17 |
| 420k | 36 | 61 | 12 |
| 450k | 39 | 71 | 9 |
| 480k | 42 | 71 | **25 (tệ hơn)** |

**Kết luận:** lỡ-bán **không giảm đều theo vốn** (phi tuyến — vốn khác → bot/người chơi mua hỗn hợp món khác, món cạn trước khác). "Tăng vốn" không phải đòn bẩy đáng tin; chọn vốn theo một lần chạy nhiễu là tune bề mặt. Giữ **360k**, guard trần **≤17** giữ nguyên.

**R2 → ĐÓNG.** Muốn giảm sâu hơn nữa (dưới ~10) phải làm cơ chế thật: khách **thay món khi món thèm hết hàng** (substitution) hoặc chỉnh cầu-mix ngày đầu — đây là đề xuất thiết kế riêng (chạm economySimL50 đang sát biên), không nằm trong scope sửa review.

## Hạ mục GĐ1829 — cơ chế "khách thay món khi hết hàng" đã áp dụng (OpenSpec `khach-thay-mon-het-hang`)

Kết quả đo trên save trắng + autoplay (seed cố định, `substituteFlow.test.ts`):

| Chỉ số | Trước (GĐ1827) | Sau (GĐ1829) |
|---|---|---|
| Lỡ vì hết hàng ngày 1 | 17 | **11** (guard khoá ≤12) |
| Món bán ngày 1 | 77 | **89** |
| Doanh thu ngày 1 | 515.000đ | **695.000đ** |
| Lượt khách nhận món thay | — | 12 |

- Guard `reviewR2Day1.test.ts` hạ trần 17 → **12** (mức đo lặp 11–12, jitter async như economySimL50).
- `economySimL50` vẫn xanh (3 nhiệm vụ xương sống 25/28 ≥ ngưỡng 22).
- Sổ tổng kết thêm dòng "🔄 Đã cứu X lượt nhờ khách nhận món thay — vẫn nên châm kệ đủ" (X > 0 mới hiện).
- Hàng hoá ngoài kệ khách đang đứng, món đắt quá 1,5× giá món muốn, và kệ trống thì vẫn lỡ như cũ — bài học châm kệ được giữ.

**R2 chính thức đóng ở mức cơ chế.**
