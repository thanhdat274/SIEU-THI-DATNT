# Playtest persona đợt 2 — giữa game, máy yếu, thêm 30 persona (GĐ1438)

**Ngày:** 2026-11-06 · **Tiếp nối:** `PHAN-TICH-PLAYTEST-PERSONA-2026-11-06.md` (ngày 1) và `PHAN-TICH-FEEDBACK-NGUOI-DUNG-AO-2026-11-06.md` (P1–P30)

## 1. Cách làm

- **Giữa game:** dùng `game.autoplay()` cho bot tự chơi 37 ngày → **cấp 29**, 9 nhân viên, 9 kệ. Lưu, tải lại trang, rồi chơi tay trong khung điện thoại 440×875.
- **Máy yếu:** đọc FPS bằng `game.perf()` ở đúng save giữa game (chế độ đồ họa tự động).
- **Xoay ngang:** khung 812×375 + `game.layoutAudit()`.
- **Persona:** thêm **30 persona mới (P31–P60)**, nâng tổng lên **60**. Roster nằm ở `references/persona-roster.md` (nhóm E–I). Mỗi góp ý có nhãn **[thật]** nếu dựa trên quan sát khi chơi, **[mô phỏng]** nếu chỉ suy từ tính năng.

**Không làm được:**
- **Co-op:** hẻm online bắt buộc đăng nhập Google, người test không đăng nhập thay người dùng.
- **Máy yếu thật, iPhone/Safari, Android rẻ:** không có thiết bị.
- **FPS:** đo trong trình duyệt nhúng của app, có thể thấp hơn trình duyệt thường. Cần đo lại trên Chrome thật.

## 2. Phát hiện khi chơi thật giữa game

| # | Phát hiện | Bằng chứng | Mức |
|---|---|---|---|
| M1 | **FPS 21–22 ở mức Thấp** (luật ≥30). Ngày 1 cùng máy đạt 60 ở mức Cao. Bộ tự hạ đã xuống Thấp mà vẫn không đủ. | `game.perf()` → `{level:"low", fps:22.1}`, đo 3 lần (20,7 / 22,1 / 22,6) | **P0** (cần đo lại ngoài app) |
| M2 | **Sổ nấu in chữ "0" lạc**: "Lãi gộp ~50.000đ/mẻ**0**" và dòng chỉ có "0" dưới mỗi món khi chưa có trạm. | `src/ui/panels/CookPanel.tsx:123` và `:133` — `{own && …}` với `own = stationCount()` là **số**; bằng 0 thì React in "0". Sửa: `own > 0 &&`. | **P0** (lỗi rõ, sửa 2 dòng) |
| M3 | **Thẻ cảnh báo hết hạn lặp tên**: "Diêm, bật lửa (8)" lặp **4 lần**; "≈ 928.500đ hỏng đêm nay · tổng 928.500đ" lặp số. Diêm/bật lửa hết hạn cũng lạ. | Văn bản trang lúc 11:04 ngày 37 | P1 |
| M4 | **Thẻ sự kiện chồng nhau che >50% màn hình điện thoại**: "Mới mở" + khách mua sỉ + Tết (13 món "hàng hút") + truyện Chú Ba + hết hạn. | Ảnh chụp 10:06 | **P0** (Luật 9 — chống phình) |
| M5 | **Menu "Thêm" có 2 tiêu đề "NHÂN SỰ & KHÁCH"**; huy hiệu "1tr", "Đơn sắp hết hạn" nằm đè lên dòng tiêu đề. | Ảnh menu + đếm DOM: 2 tiêu đề | P1 |
| M6 | **Tự tiêu tiền buổi sáng**: "Ăn tô phở sáng (20.000đ)" bị trừ mà không hỏi. | Thông báo lúc vào ngày | P2 (cần xem có cố ý không) |
| M7 | **Xoay ngang**: HUD + băng thông tin chiếm ~80% chiều cao 375 px, dòng trạng thái dài 3–4 dòng chữ nhỏ; cảnh 3D chỉ còn một dải. `layoutAudit` không báo nút bị cắt. | Ảnh 812×375 | P1 |
| M8 | Nút **"Chơi lại từ đầu"** nằm chung menu "Thêm" với các nút thường, chỉ chặn bằng `confirm()` của trình duyệt. Trong lúc test, state đang chạy bị về ngày 1 (rất có thể do người test bấm nhầm + công cụ tự đồng ý hộp hỏi). Save trên đĩa còn nguyên. | `src/ui/Hud.tsx:414` | P2 — nên dời vào Cài đặt, hỏi bằng hộp thoại của game |
| — | Tốt: Sổ nấu chia theo 10 trạm, ghi rõ thiếu gì, lãi/mẻ, cấp mở. Không nút nào bị cắt mép ở 440 px và 812 px. | | |

Ghi chú kỹ thuật: lúc vào ngày, cảnh tối đen ~3 giây rồi mới sáng (hiệu ứng mờ dần, không phải lỗi).

## 3. Góp ý 30 persona mới (P31–P60)

Định dạng: 👍 thích · 🤔 khó hiểu · 😤 bực · 💡 ước có.

**Nhóm E — Hoàn cảnh & tiếp cận**
- **P31 Cô Hạnh (58, mắt kém, điện thoại):** 😤 chữ trong Sổ nấu 12 px, thẻ Tết 13 món chữ nhỏ [thật]. 💡 nút "chữ to" trong Đồ họa/Cài đặt.
- **P32 Tuấn (27, mù màu đỏ-lục):** 🤔 lãi xanh `#2ecc71` và lỗ đỏ `#e74c3c` trong Sổ nấu chỉ khác nhau ở màu [thật]. 💡 thêm dấu +/− hoặc ▲▼ (tổng kết ngày đã có ▲, nên làm đồng bộ).
- **P33 Chị Thư (31, bế con, chơi một tay):** 😤 nút ✕ đóng panel ở góc trên phải, xa ngón cái [thật]. 💡 vuốt xuống để đóng, hoặc nút Đóng ở đáy (Nhập hàng đã có).
- **P34 Lực (20, 3G):** 🤔 [mô phỏng] tải đầu ~600 KB gzip là ổn. 😤 panel lười tải trắng 3 giây sẽ còn lâu hơn trên 3G [thật — T4].
- **P35 Hòa (36, máy nóng):** 😤 giữa game 22 FPS thì máy chạy hết công suất [thật — M1]. 💡 chế độ "Tiết kiệm pin" khóa 30 FPS.
- **P36 Ông Sáu (62, ít đọc):** 👍 icon emoji trên dock dễ nhận. 😤 thẻ khách mua sỉ cần đọc 4 dòng số mới quyết được [thật].

**Nhóm F — Động cơ khác**
- **P37 Chị Mười (45, chủ tạp hóa thật):** 👍 lô cận hạn, bán sỉ, giờ vàng rất "đời". 🤔 diêm/bật lửa mà hết hạn? [thật — M3]. Khách hỏi cám bò ở tạp hóa ngày 1 [thật — T6].
- **P38 Nam (29, kế toán):** 👍 tổng kết tách "lãi gộp" và "tiền vào − ra". 😤 cùng một số 928.500đ ghi hai lần [thật — M3].
- **P39 Vy (24, sưu tầm công thức):** 👍 "+42 món nữa mở dần từ cấp 34" kích thích [thật]. 💡 lọc "món nấu được ngay".
- **P40 Hằng (33, thích truyện):** 👍 truyện Chú Ba xe ôm, chiếc Dream đời 95 [thật]. 😤 truyện nằm lẫn giữa thẻ Tết và thẻ hết hạn, dễ bị tắt nhầm [thật — M4].
- **P41 Linh (26, chill):** 😤 không có cách gom/tắt thẻ sự kiện, mở tiệm là bị dội 4–5 thẻ [thật — M4]. 💡 chế độ "ít thông báo".
- **P42 Khải (22, min-max):** 💡 xuất bảng lãi/phút toàn bộ món (Sổ nấu đã có ⏱/phút khi có trạm). 🤔 [mô phỏng] Chè yến 29k/phút cuối game có phá cân bằng không.
- **P43 Duy (30, thích thử thách):** 💡 [mô phỏng] chế độ "vốn ít, không vay" cho NG+ — để sau, phải theo luật chiều sâu trước.
- **P44 Trâm (19, trang trí):** 👍 [mô phỏng] Xây dựng + 3 bậc tiệm. 😤 không thấy được tiệm khi các thẻ che [thật — M4].

**Nhóm G — Xã hội**
- **P45 Khoa & Ly (cặp đôi):** 😤 [thật] phải đăng nhập Google mới chơi chung được. 💡 mã mời nhanh cho khách — **không nên** nếu làm yếu chống gian lận.
- **P46 Nhóm 4 bạn:** 💡 [mô phỏng] so tiệm trong hẻm theo tuần (đã có nghiệp đoàn; kiểm trước khi làm thêm).
- **P47 Bin (21, TikToker):** 👍 khoảnh khắc Tết "+70% khách" đông vui. 😤 thẻ che mất cảnh quay [thật].
- **P48 Phong (27, bảng xếp hạng):** 🤔 [mô phỏng] không thấy mình đứng thứ mấy trong hẻm.
- **P49 Anh Lâm + bé 8 tuổi:** 👍 nội dung lành, "Bà Năm", phở sáng. 🤔 bé không hiểu "kèo", "lãi gộp".

**Nhóm H — Quay lại & rời bỏ**
- **P50 Thảo (quay lại sau 2 tuần):** 😤 vào là 5 thẻ cùng lúc, không biết bắt đầu từ đâu [thật — M4]. 💡 một thẻ "Hôm nay nên làm 3 việc" thay cho chồng thẻ (Sổ đầu ngày đã gần như vậy).
- **P51 Bảo (bỏ ở ngày 3):** lý do: ngày 1 âm 232k, chiều mất buổi vì tiệm tự đóng [thật — T1, T5].
- **P52 Sơn (chơi dồn cuối tuần):** 😤 giữa game nhiều hàng hết hạn qua đêm, 928k "hỏng đêm nay" [thật].
- **P53 Ngọc (PC công ty + điện thoại):** 💡 [mô phỏng] cần đăng nhập để đồng bộ — đã có cloud; khung đăng nhập cần nói rõ lợi ích này.
- **P54 Hưng (từng mất save):** 👍 "Đã tự động lưu" ở tổng kết ngày [thật]. 😤 "Chơi lại từ đầu" cạnh nút thường [thật — M8].
- **P55 Mai (cài PWA):** 🤔 [mô phỏng] chơi offline có ghi save cloud sau không.

**Nhóm I — Nền tảng & thị trường**
- **P56 Hà (Hà Nội):** 🤔 "bạc xỉu", "chè yến" ổn. "Khai trương" không có dấu cách sau huy hiệu "1 xong" bị đè chữ [thật].
- **P57 Kevin (Việt kiều):** 🤔 câu dài "Kho thiếu — nhập gấp 345.000đ vẫn lời −38.400đ" khó đọc: "vẫn lời" mà số âm [thật]. Đáng sửa chữ.
- **P58 Tú (tablet Android rẻ):** 😤 [suy từ M1] nếu máy dev chỉ 22 FPS giữa game thì tablet rẻ sẽ tệ hơn.
- **P59 Uyên (iPhone 8, Safari):** 🤔 [chưa kiểm] WebGPU/WebGL2 trên Safari cũ — cần thiết bị thật.
- **P60 Đông (chơi ngang):** 😤 HUD chiếm ~80% màn hình ngang [thật — M7].

## 4. Tổng hợp 60 persona (đợt 1 + playtest ngày 1 + đợt 2)

| Nhóm vấn đề | Persona đồng tình | Nguồn |
|---|---|---|
| Thông báo/thẻ chồng che màn hình | 11 (P2, P8, P40, P41, P44, P47, P50, P31, P36, P1, P22) | thật |
| Mất tiến trình / mất buổi khi vào lại (T1) | 6 (P1, P51, P54, P53, P2, P50) | thật |
| Hiệu năng giữa game (M1) | 6 (P5, P13, P35, P58, P22, P34) | thật (cần đo lại) |
| Ngày 1 gây nản (T2, T3, T5) | 7 (P1, P2, P3, P22, P26, P51, P49) | thật |
| Chữ/số khó đọc, lỗi hiển thị (M2, M3, P57) | 6 (P31, P32, P38, P57, P56, P11) | thật |
| Tiếp cận (chữ to, mù màu, một tay) | 4 (P31, P32, P33, P36) | thật + mô phỏng |
| Xã hội/co-op cần đăng nhập | 4 (P45, P46, P48, P53) | mô phỏng |

## 5. Đề xuất mới (bổ sung T1–T9 đợt trước)

| # | Đề xuất | Vì sao giữ chân | Đối chiếu luật cứng | Kết luận |
|---|---|---|---|---|
| M2 | Sửa `own && …` → `own > 0 && …` ở `CookPanel.tsx` | Lỗi rõ, nhìn thiếu chỉn chu | Luật 3, 6: thêm test render không có "0" lạc | **Nên làm — P0** (nhỏ) |
| M1 | Đo lại FPS giữa game trên Chrome thật; nếu vẫn <30 ở Thấp, xem bộ tự hạ (đám đông, 9 nhân viên) | Máy yếu là số đông người chơi điện thoại VN | **Luật 8** — đang vi phạm nếu đúng | **Nên làm — P0** |
| M4 | Gom thẻ sự kiện: tối đa 1–2 thẻ cùng lúc, còn lại vào hàng chờ / Sổ đầu ngày; thẻ Tết rút "hàng hút" còn 3–4 món | Giảm ngợp, thấy được tiệm | **Luật 9** — giảm, không thêm | **Nên làm — P0** |
| M3 | Gộp dòng trùng trong cảnh báo hết hạn; bỏ số lặp; xem lại hạn dùng của diêm/bật lửa | Chỉn chu, đúng đời thực | Dữ liệu sản phẩm cần test | **Nên làm — P1** |
| M5 | Sửa tiêu đề trùng + vị trí huy hiệu trong menu Thêm | Gọn | Không thêm nút | **Nên làm — P1** |
| M7 | Bố cục ngang: thu gọn băng thông tin còn 1 dòng | Người chơi ngang | Không thêm nút | **Nên làm — P1** |
| A1 | Thêm dấu ▲▼/+− cạnh số lãi/lỗ ở mọi panel (P32) | Tiếp cận mù màu | Không thêm nút | **Nên làm — P1** |
| P57 | Sửa câu "vẫn lời −38.400đ" thành "lỗ 38.400đ" | Dễ hiểu | ≤90 ký tự | **Nên làm — P1** (nhỏ) |
| M8 | Dời "Chơi lại từ đầu" vào Cài đặt, hỏi bằng hộp thoại game, nhắc có backup | Chống mất save | Luật 5 | **Nên làm — P2** |
| A2 | Tùy chọn chữ to (P31) | Người lớn tuổi | Thêm 1 tùy chọn trong Đồ họa, không thêm nút HUD | **Để sau — P2** |
| A3 | Chế độ tiết kiệm pin khóa 30 FPS (P35) | Máy nóng | Gộp vào Đồ họa | **Để sau — P2** |
| S1 | Mã mời co-op không cần đăng nhập (P45) | Rủ bạn dễ | Đụng chống gian lận, Luật 4 | **Không nên** lúc này |
| S2 | Chế độ khó cho NG+ (P43) | Người chơi lâu | Chiều sâu trước, mở rộng sau | **Để sau** |

## 6. Lần chạy sau
- **Co-op:** người dùng tự đăng nhập Google trong khung trình duyệt của app, sau đó mở 2 tab cùng hẻm.
- **FPS:** đo lại M1 trên Chrome thật, cùng save cấp 29 (`game.autoplay(37)` từ save mới, chạy từng đợt ≤7 ngày vì công cụ có giới hạn thời gian).
- **Cuối game:** autoplay tới cấp 60+ để thử Chè yến, NG+.
- Khi bấm nút trong test, dùng `find` theo tên chứ không bấm tọa độ trong menu "Thêm" (tránh trúng "Chơi lại từ đầu").
