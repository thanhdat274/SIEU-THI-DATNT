# Góp ý người dùng ảo — Tạp Hóa 3D (bản GĐ1437)

**Ngày:** 2026-11-06 · **Mẫu:** Persona Feedback Panel (~30 người dùng ảo) · **Trạng thái game được soi:** GĐ1437

---

## 1. Mục đích & phương pháp

Đội phát triển dùng `promt_game.md` để tự chủ làm game theo backlog. Để lấp khoảng trống "không có người chơi thật góp ý", dự án triển khai **bảng góp ý người dùng ảo**: dựng **30 persona** — mỗi persona là một *hồ sơ tính cách người chơi* (độ tuổi, thiết bị, thói quen, kiểu chơi, giai đoạn) — rồi mô phỏng "phiên trải nghiệm + phản hồi" của từng người, **bám vào trạng thái game có thật** (trích từ PROGRESS.md qua `npm run persona:digest`).

**Bản tóm tắt trạng thái game được dùng làm sàn (không bịa):**
- GĐ hiện tại: **1437** — những GĐ gần đây toàn "thêm món/trạm" theo trục chiều sâu (tiệm xôi +2 món, quán nước +3 món, trạm quầy pha, đổi "Ấm nước nóng" → "Bếp nồi nấu").
- Tầm nhìn: mô phỏng quản lý **tiệm tạp hóa Việt Nam trong một con hẻm**, góc nhìn thứ nhất; cảm giác cốt lõi *"niềm tự hào của người chủ nhỏ dần thành cơ ngơi"*; vòng lặp **nhịp ngày → nhịp tuần/tháng/mùa/năm → NG+**; chạy trên web, mobile-first, có PWA.
- Các hệ lớn có thật: chuỗi sản xuất **trồng → kho → bếp → quầy/phục vụ**; trạm bếp (bếp nướng, chảo chiên, nồi hấp, máy xay, quầy pha, bếp nồi nấu); **nông trại** (mùa vụ, 7 vật nuôi, công trình 3 sao, đơn đặt hàng, phụ trại); **quán nước** (quầy → quán → cà phê, thời tiết, thực đơn); **tiệm xôi** (quây xôi cấp 36 trong tạp hóa, tiệm xôi là cơ sở riêng cấp 40); **nhân viên** (tuyển, xếp ca, huấn luyện, đường đời nhân viên, xin nghỉ); **khách** (35 nghề, 33 archetype, khách quen, câu hỏi quầy); **bán online** (đơn online 20 phút); **co-op/hẻm online** (WebSocket, nghiệp đoàn, chống gian lận kinh tế); **meta-progression** (hồ sơ tiệm, huy hiệu thâm niên/hợp đồng, nền móng vững chắc, NG+); **sự kiện** (lễ hội theo mùa + Sổ Mùa, chợ phiên, kèo hôm nay, thử thách tuần, mục tiêu tháng); **3 mức đồ họa + tự động**, hiệu năng máy yếu; lưu **IndexedDB cục bộ + cloud MongoDB + Firebase**.

**Giới hạn (đọc kỹ trước khi dùng):** đây là **mô phỏng định tính**, không phải playtest thật — số liệu dùng làm *tín hiệu thiết kế*, không làm bằng chứng định lượng. Không nên vì một persona "đòi" mà gấp rút thêm tính năng; mọi đề xuất ở mục 6 đã **đối chiếu luật cứng** (chống phình, chiều sâu-trước, đủ 2 chế độ, có test, hiệu năng) để lọc. **Không tự động thêm vào backlog PROGRESS.md** — Leader/người dùng chốt sau khi xem bảng đề xuất.

---

## 2. Tóm tắt điều hành

**Điểm giữ chân được nhiều persona công nhận:**
1. **Nhịp ngày cuốn hút** — Sổ đầu ngày + đứng quầy + khách quen gợi cảm giác "người chủ nhỏ thật sự", kéo quay lại mỗi ngày (P2, P6, P14, P29).
2. **Chất Việt đời thường** — hẻm, quán nước, tiệm xôi, lễ hội, khách quen "gọi đúng tên" tạo bầu không khí riêng, ít game cùng thể loại có (P8, P10, P23, P30).
3. **Chiều sâu hệ thống có thật** — chuỗi trồng→nấu→phục vụ, nhân viên xếp ca, co-op nghiệp đoàn cho người chơi hardcore "cắn răng" được lâu (P11, P14, P17).
4. **Tôn trọng người chơi** — không P2W (P29 tôn trọng), chống phình, hiệu năng máy yếu, không làm hỏng save (P5, P22).

**Nỗi đau chính (cộng hưởng nhiều persona):**
- **A. Ngày đầu hơi ngợp** với người mới ở thiết bị cũ/chữ nhỏ — cần người mới bán được món đầu ≤5 phút thật; vài persona sợ bỏ lỡ thông báo/việc khi lần đầu (P1, P3, P19, P21).
- **B. Chữ/nút hơi nhỏ trên mobile**, nhất là người lớn tuổi — mặc dù game đã mobile-first (P3, P22, P25).
- **C. Người chơi cuối game kiếm "lý do quay lại mỗi ngày"** ngoài nhịp ngày — nhiều người ở endgame chờ thêm chiều sâu/mục tiêu dài (P16, P14, P26).
- **D. Co-op có rào cản nhập môn** — người mới hẻm online sợ choáng/không biết "ở hẻm làm gì được" (P19, P20).

**Góp ý đáng làm nhất (đã đối chiếu luật cứng, xem mục 6):**
- **N1 (P0):** Dẫn dắt người mới bằng *dòng việc ngày 1 thật gọn* (đã có "10 thông báo ngày đầu" — giữ, chỉ làm rõ), thêm gợi ý việc cần làm ngay từ Sổ đầu ngày. Giữ chân người mới.
- **N2 (P0):** Nhắc "quay lại" theo nhịp dài nhẹ nhàng (thử thách tuần/mục tiêu tháng đã có) — thêm dòng "hôm nay còn việc gì" ở đầu phiên. Rất khớp chiều sâu-trước, không thêm nút HUD.
- **N3 (P1):** Khảo sát một button/cửa một-vài-chạm cho "nhập nhanh theo gợi ý" — giảm click lặp; **phải gộp vào nút HUD ≤20** nên cân nhắc thay nút cũ.
- **N4 (P1):** Gợi ý nguồn hàng "trồng/nuôi để pha" ở Sổ đầu ngày khi thiếu nguyên liệu (đã có gợi ý theo nông sản — mở rộng cho trạm pha/quán nước).

---

## 3. Danh sách 30 persona (hồ sơ)

| # | Tên | Archetype | Thiết bị | Thói quen / kiểu chơi | Giai đoạn | Mục tiêu chính |
|---|---|---|---|---|---|---|
| P1 | Minh, 16, học sinh | Người mới dễ bỏ | Mobile | Chơi tự do khi rảnh, ngại đọc | Ngày 1 | Hiểu vòng lõi nhanh |
| P2 | Hoa, 24, NVVP | Casual nghỉ trưa | Mobile | 5–10 phút/lượt, quen mobile game | Ngày 1 | Làm được việc trong lượt ngắn |
| P3 | Bác Bảy, 55 | Người mới lớn tuổi | Tablet cũ | Không quen game, cần chữ to | Ngày 1 | Không sợ, thao tác được |
| P4 | Thảo, 19, SV | Đa nền tảng dễ chán | PC + Mobile | Tải nhiều game rồi bỏ | Ngày 1–3 | Ấn tượng ngay, không thấy "cày" |
| P5 | Trung, 30 | Nhạy hiệu năng | PC cấu hình thấp | Chơi cuối tuần | Giữa | Mượt, không giật |
| P6 | Lan, 28 | Casual hằng ngày | Mobile | Quay lại mỗi ngày, tiếc streak | Giữa | Lý do nhỏ để quay lại |
| P7 | Đạt, 33 | Nhịp ngày đều | PC + Mobile | Chơi tối, thích cuốn | Giữa | Phiên ngắn vui |
| P8 | Cô Tư, 50 | Cảm xúc hẻm | Mobile | Không đua, thích khách quen | Giữa | Bầu không khí ấm |
| P9 | Nam, 17 | Làm đẹp + kiếm tiền | PC | Thích trang trí, tăng doanh thu | Giữa | Tiệm đẹp, lãi lên |
| P10 | Phương, 26 | Chuỗi sản xuất | PC | Thích quy hoạch trồng→nấu | Giữa | Chuỗi rõ ràng |
| P11 | Hùng, 29 | Hardcore phân tích | PC | Tối ưu lãi/phút, số liệu | Giữa | Cân bằng rõ ràng |
| P12 | Nga, 31 | Thư giãn quán nước | Mobile + Tablet | Phiên ngắn, trang trí | Giữa | Vui vẻ chứ không áp lực |
| P13 | Khánh, 35 | Tránh lỗ nhân sự | PC thấp | Sợ mất tiền, cẩn thận | Giữa | Quản nhân viên an toàn |
| P14 | Việt, 27 | Endgame hardcore | PC cao | Tối ưu tuyệt đối | Cuối | Chiều sâu, thử thách |
| P15 | Linh, 30 | NG+ sưu tập | PC | Thích giữ thành quả | Cuối/NG+ | Bộ sưu tập + thử thách |
| P16 | Đức, 40 | Endgame chán | PC | Đã master, muốn mới | Cuối | Lý do quay lại hằng ngày |
| P17 | Thu, 23 | Co-op xã hội | PC | Chơi cùng bạn, nghiệp đoàn | Giữa | Hợp tác vui |
| P18 | Long, 26 | Chủ hẻm online | PC | Mở hẻm cho bạn bè | Giữa | Quản phòng/đồng bộ |
| P19 | Mai, 21 | Co-op mới | Mobile | Lần đầu hẻm online | Ngày 1–3 | Không bị choáng |
| P20 | Quân, 32 | Chơi đơn + co-op | PC | So sánh 2 chế độ | Giữa | Nhất quán |
| P21 | Bé Na, 12 | Trẻ em cùng người lớn | Tablet | Chơi cùng mẹ | Ngày 1 | Đơn giản, vui |
| P22 | Ông Năm, 60 | Người lớn tuổi | Điện thoại cũ | Game nhẹ, chơi lúc rảnh | Ngày 1–5 | Bắt đầu dễ |
| P23 | My, 22 | Du học sinh | PC | So sánh Hay Day/Stardew | Giữa | Chất Việt + chiều sâu |
| P24 | Bảo, 25 | Đồ họa cao | PC cao | Muốn đẹp, mê 3D | Giữa | Hình ảnh ấn tượng |
| P25 | Hương, 34 | Mẹ bỉm sữa | Mobile | Vài phút lúc con ngủ | Giữa | Lưu + nối tiếp mượt |
| P26 | Khoa, 28 | Nhà phê bình | PC | Chấm khắt khe | Giữa/End | Sạch sẽ, sâu |
| P27 | Ngân, 25 | Completionist | PC | Muốn mở hết, ghét bỏ sót | Giữa | Lộ trình mở khóa rõ |
| P28 | Tùng, 22 | Speedrunner | PC | Tối ưu thời gian, thích phím tắt | Giữa | Thao tác nhanh |
| P29 | Vũ, 35 | "Whale" nhưng tôn trọng no-P2W | PC | Muốn chi tiền mở nhanh nếu có | Giữa | Không P2W, tiến đều |
| P30 | Ái, 29 | Chơi cảm xúc/story | Mobile | Thích câu chuyện khách quen | Giữa | Nhân vật có hồn |

---

## 4. Trải nghiệm & góp ý từng persona

> Mỗi persona: hành trình ngắn (người này đã thấy/đụng gì) rồi góp ý theo 4 nhãn — 👍 thích / 🤔 khó hiểu / 😤 bực / 💡 ước có. Mọi tính năng nhắc đến đều **có thật** trong game.

### P1 — Minh (16, học sinh, mobile, ngày 1)
Hành trình: tải game mở ra tiệm 3D trong hẻm, thấy Sổ đầu ngày, thử bày món lên kệ rồi đứng quầy bán.
- 👍 Tiệm trong hẻm đẹp, nhìn thoáng, không rối — gần gũi hơn game nông trại tây.
- 🤔 Lần đầu hơi ngơ — nhiều ô/thông báo cùng lúc, không biết làm gì trước.
- 😤 Bấm lung tung vài nút thấy mất tiền nhập hàng hơi phí.
- 💡 Ước có một việc duy nhất cần làm đầu tiên nhấp nháy ("bày 3 món lên kệ rồi ra quầy").

### P2 — Hoa (24, NVVP, mobile, ngày 1)
Hành trình: chơi lúc nghỉ trưa, làm theo Sổ đầu ngày, bán được vài món, thấy đồng hồ ngày.
- 👍 Sổ đầu ngày gọn — nghỉ trưa cũng kịp một vòng ngày.
- 👍 Thấy doanh thu/lãi phản hồi liền, không mơ hồ.
- 🤔 Không biết "việc hôm nay" có nhất thiết phải làm hết không.
- 💡 Ước khi mở lại có dòng "hôm nay nên làm: …" ngắn gọn.

### P3 — Bác Bảy (55, tablet cũ, ngày 1)
Hành trình: dùng ngón tay chậm, chữ nhỏ, thử bấm các menu rồi bỏ dở.
- 👍 Màu ấm, tiếng Việt bình dân dễ hiểu.
- 😤 Chữ/nút nhỏ quá, tay già bấm trượt — nhất là khi chơi trên tablet màn hình vừa.
- 🤔 Thấy "menu Thêm" thêm nút, không rõ dùng làm gì.
- 💡 Ước có chế độ chữ to + nút to khi phát hiện thiết bị lớn/cũ.

### P4 — Thảo (19, SV, PC + mobile, ngày 1–3)
Hành trình: thử cả đt lẫn PC, thấy đồng bộ save, chơi 2 hôm.
- 👍 Có save cloud — đổi máy không mất tiến độ.
- 🤔 Ngày 2 hơi trống, không biết nên làm gì ngoài bán.
- 😤 Thấy một số gợi ý bày nhưng chưa hiểu vì sao nên làm theo.
- 💡 Ước ngày 2 có 1–2 việc "có thưởng" rõ ràng để quay lại.

### P5 — Trung (30, PC cấu hình thấp, giữa)
Hành trình: kéo mức đồ họa Thấp, chơi nhiều ngày trong game.
- 👍 Có 3 mức đồ họa + Tự động — máy cũ vẫn chạy được.
- 🙂 Chấp nhận ít bóng/NPC khi mức Thấp; không giật là được.
- 🤔 Không rõ mức nào là ổn định — ước có dòng báo FPS ngắn gọn.
- 💡 Ước mức Thấp còn giảm được thứ không quan trọng (ví dụ đồ trang trí) thay vì phải tắt bóng luôn.

> Lưu ý: game đã có QualityGovernor tự hạ — góp ý này chỉ là "muốn thấy FPS", không phải thiếu cơ chế.

### P6 — Lan (28, mobile, hằng ngày)
Hành trình: quay lại mỗi ngày, làm nhiệm vụ tuần, không muốn mất streak.
- 👍 Thử thách tuần + huy hiệu tạo lý do quay lại trong tuần.
- 👍 Vé tha thứ streak giúp không cay cú khi bận một hôm.
- 💡 Ước có nhắc khẽ "còn 1 việc tuần sắp hết" — không cần nút mới.
- 😤 Hơi tiếc khi hết giờ không kịp "gói" ngày.

### P7 — Đạt (33, PC + mobile, tối)
Hành trình: chơi buổi tối, nhịp ngày đều, thử bán online.
- 👍 Đơn online trong ngày tăng doanh thu mà không phải đứng quầy.
- 👍 Cảm giác "đang phát triển tiệm" rõ qua từng cấp mở khóa.
- 💡 Ước báo "món đang nấu dở" gọn ở đầu ngày để không quên.

### P8 — Cô Tư (50, mobile, giữa)
Hành trình: chăm khách quen, không đua, thích nhìn hẻm đông vui lúc lễ hội.
- 👍 Khách quen "gọi đúng tên" + lễ hội theo mùa đúng chất đời thường.
- 👍 Không bị ép phải tối ưu mới chơi được — chơi chậm vẫn vui.
- 💡 Ước có thêm vài mẩu chuyện nhỏ của khách quen (đã có đường đời nhân viên; mở rộng sang khách).
- 🤔 Một số thuật ngữ ("archetype", "giá bán tối ưu") hơi tây.

### P9 — Nam (17, PC, giữa)
Hành trình: thích bày kệ đẹp, tăng doanh thu, thử đồ trang trí.
- 👍 Trang trí + bày kệ có ảnh hưởng doanh thu — làm đẹp không phí.
- 💡 Ước có gợi ý "kệ nào đang trống/thiếu món hút" để bày đúng chỗ.
- 😤 Muốn xoay/đặt nhanh hơn, bớt vài thao tác lặp khi bày nhiều kệ.

### P10 — Phương (26, PC, giữa — đang chuỗi trồng→nấu)
Hành trình: mở trại + bếp, thử chuỗi trồng→kho→nấu→quầy, dùng gợi ý theo nông sản.
- 👍 Gợi ý "trồng/nuôi để pha" rất hữu ích khi thiếu nguyên liệu.
- 👍 Cảm giác đầu tư chuỗi có nghĩa, không phải bấm máy.
- 🤔 Nhiều trạm/nguyên liệu mới, mất công nhớ món ở trạm nào.
- 💡 Ước Sổ đầu ngày gợi ý "món nào nên nấu hôm nay theo nhu cầu quầy" (đã có tư vấn Vườn 4 tín hiệu — mở rộng cho quầy/bếp).

### P11 — Hùng (29, hardcore, PC, giữa)
Hành trình: phân tích lãi/phút từng món, so sánh trạm, tối ưu giá.
- 👍 Có số liệu phản hồi rõ (giá, lãi, thời gian nấu) — không hộp đen.
- 👍 Cân bằng "lãi bán hàng là chính", nhiệm vụ không lấn lãi.
- 💡 Ước có bảng so sánh "lãi/phút giữa các món/trạm" sẵn (hiện phải tự tính).
- 😤 Some quy ước cần đọc kỹ mới rõ; hardcore chấp nhận, người khác có thể bỏ.

### P12 — Nga (31, mobile+tablet, giữa — quán nước)
Hành trình: chơi quán nước, thấy ảnh hưởng thời tiết/sự kiện, thư giãn.
- 👍 Quán nước có bậc quầy→quán→cà phê, thời tiết đổi doanh thu — tự nhiên.
- 👍 Sự kiện (máy pha hỏng, xe nước đối diện) tạo nhịp vui.
- 💡 Ước báo nhẹ khi thời tiết sắp đổi để kịp chuẩn bị thực đơn nóng/lạnh.

### P13 — Khánh (35, PC thấp, giữa — nhân sự)
Hành trình: tuyển nhân viên, xếp ca, thấy nhân viên xin nghỉ.
- 👍 Có xếp ca, huấn luyện, đường đời nhân viên — sâu hơn game quản lý thường.
- 👍 Nhân viên xin nghỉ có báo trước — không bất ngờ mất người.
- 😤 Sợ lỗ lương, muốn dự báo "chi phí nhân sự tuần này" rõ hơn.
- 💡 Ước có cảnh báo trước khi ký/mở rộng "sẽ tốn bao nhiêu/bao lâu hồi vốn" (đã có đối chiếu kinh tế, mở rộng hiển thị).

### P14 — Việt (27, endgame hardcore, PC cao)
Hành trình: đã qua NG+, tối ưu mọi thứ, chờ thử thách mới.
- 👍 NG+ giữ bộ sưu tập chỉ bonus doanh thu — không phá công thức.
- 👍 Đủ hệ lớn để "cắn răng" chơi lâu.
- 💡 Ước có hệ "mục tiêu dài hạn" kiểu nền móng/huy hiệu sâu hơn để có đích nữa.
- 😤 Endgame thấy ít việc mới mỗi ngày — muốn nhịp mùa/năm sôi động hơn.

### P15 — Linh (30, PC, cuối/NG+)
Hành trình: dùng NG+ để giữ bộ sưu tập, chơi thử thách tuần.
- 👍 NG+ chỉ bonus doanh thu, không reset mất công sức — an tâm.
- 👍 Huy hiệu thâm niên/hợp đồng ghi nhận quá trình.
- 💡 Ước có "bộ sưu tập" nhìn thấy rõ danh sách món/khách đã mở.

### P16 — Đức (40, PC, endgame chán)
Hành trình: đã master mọi hệ, không có gì mới để làm sâu.
- 👍 Game sâu thật — chơi được rất lâu.
- 😤 Cuối game thiếu "lý do quay lại hằng ngày" ngoài việc nấu/bán lặp.
- 💡 Ước có nhịp sự kiện mùa/năm dày hơn hoặc mục tiêu dài hạn kiểu "dự án xây lại hẻm".

### P17 — Thu (23, PC, co-op)
Hành trình: lập nghiệp đoàn, chơi hẻm online cùng bạn.
- 👍 Nghiệp đoàn + hẻm online tạo trải nghiệm xã hội riêng.
- 👍 Chống gian lận kinh tế giữ công bằng trong hẻm.
- 💡 Ước có cách hiển thị "ai đang làm gì trong hẻm" để phối hợp dễ hơn.

### P18 — Long (26, PC, chủ hẻm)
Hành trình: mở phòng hẻm, mời bạn, quản lý đồng bộ.
- 👍 Lập hẻm qua mã/room đơn giản, đồng bộ rõ.
- 🤔 Khi tab về nền bị ngắt cần load lại — hiểu do thiết kế nhưng lần đầu hơi bối rối.
- 💡 Ước có báo "đang ở hẻm online" rõ để bạn bè không tưởng bị lỗi.

### P19 — Mai (21, mobile, co-op mới, ngày 1–3)
Hành trình: lần đầu vào hẻm online, hơi choáng.
- 👍 Vào hẻm cùng bạn vui, không chơi một mình.
- 😤 Lần đầu không biết "ở hẻm mình làm được những gì".
- 💡 Ước có hướng dẫn ngắn "ở hẻm bạn có thể: bán chung, xem chung tiến độ…" ngay khi vào.

### P20 — Quân (32, PC, đơn + co-op)
Hành trình: chơi cả đơn lẫn co-op, so sánh kết quả.
- 👍 Nhất quán giữa 2 chế độ — chuyển qua lại không lệch.
- 👍 Chính sách parity rõ (NG+ chơi đơn, sân chơi chung tiến độ).
- 💡 Ước ghi rõ chỗ "chỉ có ở chế độ này" để khỏi ngạc nhiên.

### P21 — Bé Na (12, tablet, cùng mẹ)
Hành trình: chơi cùng mẹ, thích trang trí tiệm, chưa đọc kỹ.
- 👍 Màu đẹp, nhân vật dễ thương, thích bày đồ.
- 🤔 Có từ khó với lứa tuổi; vài chỗ cần người lớn đọc giúp.
- 💡 Ước phần chơi trang trí đơn giản để tự chơi được.

### P22 — Ông Năm (60, điện thoại cũ, ngày 1–5)
Hành trình: game nhẹ, chơi lúc rảnh, dần quen.
- 👍 Game nhẹ, không nặng — máy cũ chạy được.
- 😤 Chữ nhỏ, bấm trượt; cần nhìn thật kỹ mới thấy nút.
- 💡 Ước chế độ chữ to toàn giao diện (nút, bảng, thông báo).

### P23 — My (22, du học, PC, giữa)
Hành trình: so sánh với Hay Day/Stardew, tìm chất riêng.
- 👍 Chất Việt thật — hẻm, quán nước, tiệm xôi không đụng hàng game tây.
- 👍 Chuỗi sản xuất có chiều sâu đủ so với game cùng thể loại.
- 🤔 Kỳ vọng "giao diện gọn như mobile game quốc tế" — một số panel hơi dày chữ.
- 💡 Ước có nút "gắn cờ" món/việc quan trọng để tự theo dõi như cày-trang trại tây.

### P24 — Bảo (25, PC cao, giữa)
Hành trình: mê 3D, để mức Cao, thử đồ họa.
- 👍 Low-poly màu ấm có phong cách riêng, không phải để mặc định.
- 👍 Khung cảnh hẻm + nhân vật cử động đủ sống.
- 💡 Ước thêm chi tiết hiệu ứng nhẹ (nắng, bong bóng, khói bếp) ở mức Cao để máy mạnh hưởng lợi — không tụt FPS máy yếu vì để mức Thấp.

### P25 — Hương (34, mẹ bỉm, mobile, giữa)
Hành trình: chơi vài phút lúc con ngủ, dừng giữa chừng, quay lại sau.
- 👍 Lưu cục bộ + cloud — dừng lúc nào cũng được, quay lại không mất.
- 👍 Một phiên ngắn vẫn có tiến triển nhỏ.
- 💡 Ước có báo "đã lưu" khi thoát để an tâm.

### P26 — Khoa (28, nhà phê bình, PC)
Hành trình: chấm theo tiêu chí hiểu-nhanh, sâu, sạch.
- 👍 Đúng tầm nhìn "mọi quyết định có dữ liệu phản hồi" — không hộp đen.
- 👍 Có test chống phình, co-op nhất quán — chín hơn nhiều game indie.
- 😤 Một số thuật ngữ/mẹo tối ưu nằm rải rác, người mới khó tự khám phá.
- 💡 Ước có "kho mẹo ngắn" ngay trong game để học — nhưng chú ý không phình thông báo.

### P27 — Ngân (25, completionist, PC, giữa)
Hành trình: muốn mở hết món/hệ, theo dõi tiến trình.
- 👍 Có mốc unlock rõ (cấp mở khóa món/trạm).
- 🤔 Giữa vô số món mới, khó biết "món nào đang thiếu lối ra".
- 💡 Ước bảng "món đã mở/đang thiếu nguyên liệu" rõ để biết bước kế tiếp.

### P28 — Tùng (22, speedrunner, PC, giữa)
Hành trình: thử tối ưu thời gian, thao tác nhanh.
- 👍 Nhịp ngày có tốc độ, đẩy nhanh được.
- 😤 Vài hành động lặp (nhập, bày, chốt) cần bấm nhiều bước.
- 💡 Ước phím tắt cho thao tác thường dùng (PC) / nút "làm nhanh" cho lặp.

### P29 — Vũ (35, PC, "whale" nhưng tôn trọng no-P2W)
Hành trình: sẵn sàng chi tiền vì thích, nhưng tôn trọng game không bán cho thắng.
- 👍 Game không P2W — công bằng, đáng tôn trọng.
- 👍 Muốn thưởng nếu có (skin, trang trí) miễn không đổi cân bằng.
- 🤔 Chưa rõ lộ trình mở khóa để quyết "đầu tư thời gian hay tiền".
- 💡 Ước nếu sau này có mua, chỉ mua thẩm mỹ — ghi rõ để không e ngại.

### P30 — Ái (29, mobile, story)
Hành trình: thích câu chuyện khách quen/nhân viên, đọc bóng thoại.
- 👍 Khách quen có cá tính, bóng thoại/bong bóng dễ thương.
- 👍 Sự kiện hẻm (chợ phiên, lễ hội) tạo câu chuyện mỗi mùa.
- 💡 Ước thêm vài "mẩu chuyện" đời thường của người trong hẻm khi chơi chậm.

---

## 5. Tổng hợp góp ý (nhóm hạng mục + mức lan tỏa)

> "Số persona" = bao nhiêu người trong 30 nhắc tới/chạm tới ý này (tín hiệu tương đối của mô phỏng).

| # | Góp ý (đã gộp trùng) | Hạng mục | Số persona |
|---|---|---|---|
| G1 | Dẫn dắt người mới ngày 1 gọn hơn, một việc rõ ràng trước | Onboarding | P1, P2, P3, P19, P21, P22 (6) |
| G2 | Chế độ chữ/nút to hơn cho màn hình lớn & người lớn tuổi | UX / dễ dùng | P3, P22, P25, P26 (4) |
| G3 | Dòng "hôm nay nên làm gì" gọn khi mở lại | Giữ chân / nhịp ngày | P2, P6, P7, P10 (4) |
| G4 | Gợi ý "món nên nấu hôm nay theo nhu cầu quầy" | Chiều sâu / chuỗi | P7, P10, P11 (3) |
| G5 | Giảm thao tác lặp (nhập/bày/chốt nhanh, phím tắt) | UX / tốc độ | P9, P28, P9-nam, P28 (3) |
| G6 | Bảng so sánh lãi/phút giữa món/trạm sẵn | Kinh tế / minh bạch | P11, P13, P27 (3) |
| G7 | Mục tiêu dài hạn / nhịp sự kiện cuối game dày hơn | Giữ chân / endgame | P14, P16, P26 (3) |
| G8 | Hướng dẫn ngắn khi vào hẻm online | Co-op / nhập môn | P19, P18, P20 (3) |
| G9 | Hiển thị FPS/đang ở hẻm rõ | Hiệu năng / trạng thái | P5, P18, P25 (3) |
| G10 | Bảng "món đã mở / thiếu nguyên liệu / chưa có lối ra" | Chiều sâu / completionist | P15, P27 (2) |
| G11 | Mẩu chuyện khách quen / người hẻm thêm | Chiều sâu / story | P8, P30 (2) |
| G12 | Nếu có mua, chỉ thẩm mỹ, không P2W | Kinh tế / niềm tin | P29 (1) |
| G13 | Cảnh báo chi phí/hồi vốn trước khi mở rộng | Kinh tế / minh bạch | P13 (1) |
| G14 | "Đã lưu" hiển thị khi thoát | UX / tin cậy | P25 (1) |

**Nhận định:** không có góp ý nào đòi *hệ mới lớn*; hầu hết là làm **rõ + đỡ lặp + thêm chiều sâu hiển thị** — nằm trọn trong định hướng "chiều sâu-trước" và không xung đột luật cứng trừ khi thêm nút/thông báo.

---

## 6. Bảng đề xuất ưu tiên (đối chiếu luật cứng)

> **Kết luận:** ✅ nên bổ sung · 🕐 để sau (giá trị có nhưng chưa phải bây giờ) · ⛔ không nên (đụng luật cứng / phình / trùng).

| Mã | Đề xuất | Vì sao giữ chân (Luật 1) | Đối chiếu luật cứng | Kết luận |
|---|---|---|---|---|
| N1 | Dòng "việc hôm nay cần làm" gọn ở Sổ đầu ngày (người mới thấy 1 việc trước) | Người mới hết lúng túng, bán được món đầu sớm → giữ lại | Không thêm nút HUD; thông báo giữ ≤90 (Luật 9); có test (Luật 6); cả 2 chế độ (Luật 4) | ✅ **NÊN** (P0) |
| N2 | Nhắc nhẹ "còn việc tuần/tháng" ngay đầu phiên | Lý do quay lại mỗi ngày, kéo giữ chân | Dùng dòng Sổ đầu ngày sẵn, không thêm nút; khớp chiều sâu-trước | ✅ **NÊN** (P0) |
| N3 | Gợi ý "món nên nấu hôm nay theo nhu cầu quầy" (mở rộng tư vấn Vườn có sẵn) | Chuỗi sản xuất mạch lạc, bớt đoán mò | Đã có tiền lệ gợi ý nông sản — tái dùng, không thêm UI mới | ✅ **NÊN** (P1) |
| N4 | Chế độ chữ to trên màn hình lớn/thiết bị cũ | Người lớn tuổi chơi được lâu | Không thêm nút HUD (một lựa chọn trong cài đặt hiển thị sẵn); cần test layout; không tụt FPS máy yếu | ✅ **NÊN** (P1) |
| N5 | Bảng "lãi/phút giữa món/trạm" hiển thị sẵn | Hardcore & người mới hiểu cân bằng | Chỉ là panel soi sáng (Luật: soi sáng là mẫu mặc định), không đổi công thức | ✅ **NÊN** (P1) |
| N6 | Bảng "món đã mở / thiếu nguyên liệu / chưa có lối ra" | Completionist có đích rõ | Soi sáng thuần, không đổi kinh tế/save | ✅ **NÊN** (P1) |
| N7 | "Đã lưu" hiển thị khi thoát | Tin cậy, an tâm dừng giữa chừng | Thông báo ngắn ≤90, không thêm nút | ✅ **NÊN** (P2, nhỏ) |
| N8 | Nút/phím "làm nhanh" cho thao tác lặp (nhập/bày/chốt) | Giảm mệt, tăng trải nghiệm | **Nguy cơ phình:** phải gộp vào nút HUD ≤20 hoặc phím tắt không đếm như nút; thêm đều phải bỏ nút cũ (Luật 9) | 🕐 **ĐỂ SAU** (cần kế hoạch gộp nút) |
| N9 | Mục tiêu dài hạn / nhịp sự kiện cuối game dày hơn | Endgame có lý do quay lại | **Lớn — đúng quy trình OpenSpec vừa/lớn**; không làm vội (vai trò lễ hội/chợ phiên đã có sẵn, tránh trùng — ghi nhớ cảnh báo GĐ738) | 🕐 **ĐỂ SAU** (đề xuất OpenSpec) |
| N10 | Hướng dẫn ngắn khi vào hẻm online | Co-op mới không bị hụt | Đã có chỉ dẫn "cách chạy ở hẻm" trong quy trình; nếu thêm phải kèm test co-op + giữ ≤2 dòng (Luật 9) | 🕐 **ĐỂ SAU** |
| N11 | Mẩu chuyện khách quen thêm nhiều | Story, gắn kết | Không đổi cơ chế; nhưng đừng phình thông báo/bóng thoại | 🕐 **ĐỂ SAU** (chỉ vài mẩu chon lọc) |
| N12 | Hiển thị FPS trong game cho người dùng | Tránh "tưởng lỗi / tưởng giật" | Có thể là công cụ dev, không phải nút HUD chính; đừng tăng nút | 🕐 **ĐỂ SAU** |
| N13 | Mua chỉ-thẩm-mỹ (IAP) | Mở nguồn thu, giữ công bằng | **Không thuộc tầm nhìn hiện tại**; dễ trượt sang đổi cân bằng — cần Leader duyệt riêng trước khi nghĩ | ⛔ **KHÔNG** (hiện tại) |
| N14 | Hiệu ứng đồ họa nặng thêm cho mức Cao | Máy mạnh hưởng lợi | Phải gắn vào preset (mức Thấp tắt), cấm đổi thứ biên dịch shader lúc chạy (Luật 8) — cẩn thận, giá trị chưa cao | 🕐 **ĐỂ SAU** |

**Ưu tiên gọn:** làm trước N1, N2 (P0 — nhịp ngày & người mới), rồi N3, N5, N6 (P1 — chiều sâu hiển thị), N7 (P2 nhỏ). N8, N9, N10 rà theo quy trình khi có ngân sách. N13, N14 gác lại.

---

## 7. Khuyến nghị cho đội dev

1. **Không tự động đưa vào backlog** — đây là bảng đề xuất; Leader/người dùng chốt. Ưu tiên khởi điểm: **N1 + N2** (gộp chung làm "dòng việc hôm nay + nhắc nhịp" trong Sổ đầu ngày, không thêm nút), mỗi việc trước khi làm phải kèm test (Luật 6) + ghi cách chạy ở hẻm (Luật 4).
2. Trước khi làm **P1** (N3, N5, N6): đây đều là dạng "soi sáng" — khớp mẫu mặc định helper thuần + thẻ UI gọn, **không đổi SAVE_VERSION/kinh tế/persist**.
3. Các góp ý "lớn" (N9, N10) đưa qua **quy trình OpenSpec** khi chốt làm — đề xuất riêng, không merge chung với nội dung này.
4. Mọi góp ý **đã chiếu luật cứng**; nhắc lại hai nút thắt hay gặp: **nút HUD ≤20** (muốn thêm nút thì gộp/bỏ nút cũ — Luật 9) và **đủ 2 chế độ + co-op** (Luật 4).
5. Đây là **tín hiệu định tính** — nếu muốn bằng chứng, chạy **playtest thật** (đang để trống) cho các góp ý người-mới (G1/G2) và endgame (G7).

---

## 8. Tái chạy panel này

- Script tất định làm "sàn": `npm run persona:digest` (đọc PROGRESS.md + promt_game.md).
- Quy trình đầy đủ (dựng persona → mô phỏng → tổng hợp → ghi báo cáo ngày): skill **`feedback-panel`** (`.claude/skills/feedback-panel/`, mirror ở `.agents/skills/feedback-panel/`), kèm roster 30 archetype.
- Dùng lại khi game lên GĐ mới: chạy digest, cập nhật persona theo trạng thái mới, ghi báo cáo mới có ngày — không sửa báo cáo cũ.

---

*Tài liệu do agent tạo theo skill `feedback-panel`; nội dung là mô phỏng định tính bám trạng thái game GĐ1437, không thay playtest thật.*
