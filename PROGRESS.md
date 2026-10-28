# PROGRESS — Tạp Hóa Đầu Ngõ (tap-hoa-3d)

> Đọc file này TRƯỚC TIÊN khi bắt đầu phiên mới. File được giữ GỌN: chỉ tầm nhìn, trạng thái, quy ước, quyết định, backlog và mục lục giai đoạn.
> Chi tiết đầy đủ GĐ1–GĐ153 (nguồn quyết định, công thức, QA, số liệu) nằm ở [docs/progress-archive/PROGRESS-GD1-153.md](docs/progress-archive/PROGRESS-GD1-153.md) và GĐ154–158 ở [docs/progress-archive/PROGRESS-GD154-158.md](docs/progress-archive/PROGRESS-GD154-158.md) — tra bằng `grep -n "GĐ1xx" docs/progress-archive/*.md`.
> Quy ước: mỗi giai đoạn một commit; test phải xanh (`npm run test`) + build sạch (`npm run build`) trước khi duyệt. Ghi GĐ mới vào mục "Giai đoạn gần đây" (≤ ~15 dòng/GĐ); khi mục đó quá ~10 GĐ, dồn bản cũ sang archive và chỉ để lại 1 dòng ở Mục lục.

## Tầm nhìn game (mọi quyết định phải đối chiếu với phần này — KHÔNG tự ý thay đổi)

**Game là gì?** Mô phỏng quản lý **tiệm tạp hóa Việt Nam trong một con hẻm** (3D, góc nhìn thứ nhất): người chơi vừa là chủ tiệm vừa đứng quầy — nhập hàng, bày kệ, định giá, tuyển người, mở rộng sang trại/bếp/chi nhánh/quán nước/bán online, sống cùng con hẻm với khách quen, đối thủ và lễ hội.

**Cảm giác cốt lõi:** niềm tự hào của người chủ nhỏ dần thành cơ ngơi — "tiệm nhỏ đầu ngõ, mình chăm chút từng ngày, khách quen gọi đúng tên mình". Ấm áp, đời thường, đậm chất hẻm Việt Nam.

**Vòng lặp chơi chính (nesting):**
1. **Nhịp ngày (lõi):** sáng — Sổ đầu ngày (việc hôm nay + nhu cầu quầy + nhập/nấu/bày) → giữa ngày — đứng quầy, chốt deal, khách quen, đơn online → tối — chốt ngày, thu quà/nhịp.
2. **Nhịp dài:** tuần (thử thách) → tháng (mục tiêu) → mùa (sự kiện + Sổ Mùa) → năm (tổng kết) → NG+ Tái sinh.
3. **Trục tiến trình:** cấp mở khóa 10 hệ lớn × chiều sâu từng hệ (kệ, giá, nhân sự, trại→kho→bếp→quầy, chi nhánh 24/7, online) × quan hệ (khách quen, đối thủ, danh tiếng).

**Nguyên tắc thiết kế:** (a) mọi quyết định hằng ngày phải có dữ liệu phản hồi (không hộp đen); (b) phần thưởng phụ có cổng (không farming được); (c) không đổi công thức kinh tế khi thêm meta — meta chỉ soi sáng/ghi nhận; (d) UI ấm áp, gọn, rõ — dùng được khi chưa đọc hướng dẫn.

**Phong cách hình ảnh:** low-poly 3D màu ấm, UI nền tím-than (#3a3a4d) accent vàng (#f1c40f), icon emoji nhất quán, tiếng Việt đời thường. Bảng màu/biểu mẫu tập trung ở `src/ui/controls.css` + `src/ui/panels/shared.tsx`.

## Trạng thái hiện tại (28/10/2026)

- **1755/1755 test pass (154 files)** · build sạch (chỉ cảnh báo bundle-size có sẵn) · game chạy ổn định. Nhánh làm việc: `phat-trien-game-tu-do`.
- Đã xong GĐ1–GĐ165.
- Bức tranh tổng: các nhịp giữ chân (ngày/tuần/tháng/mùa/năm/NG+) đã bão hòa; UI responsive đa thiết bị đã audit kỹ (GĐ85–104, 116); trục "giá trị vs chi phí" đã soi kín gần hết tài sản: nhân sự tiệm chính/ca đêm/chi nhánh (141/142/144), mối hàng (143), bếp (145), trại (146/147), danh tiếng (148), quầy thịt cá (149), sổ nợ (150), hợp đồng (151), chi nhánh sau điện (152/153). Mở rộng Gánh hàng rong / Chợ phiên đã có (135–138), NG+ có dự phóng + mục tiêu vòng (139/140).
- Backup source trước GĐ1 (trước khi có git): `C:\Users\Admin\GAME_TU_DO_backup_2026-10-26.tar.gz`.

### GĐ159 — 🔍 Đóng nốt 4 hộp mờ nhẹ (hụi · phản công · khủng hoảng MXH · máy bán hàng) — XONG

- Lý do: audit tài chính 28/10 còn sót 4 chỗ "mờ nhẹ" — không đáng giai đoạn riêng từng cái, gộp 1 giai đoạn để khép trục tài chính sạch trước khi chuyển sang audit trải nghiệm.
- Triển khai: helper thuần đọc `src/data/minorPayoff.ts` + 4 chỗ UI: (1) hụi — "Đã góp Xđ trong vòng này · còn góp N ngày" (chính xác, không phải ước; sửa chữ audit: chủ hụi ôm trốn là MẤT THẬT, không có "lời từ người vỡ"); (2) phản công — "Bớt ~N sức mạnh ≈ khách đông lại ~P% — ước ~Qđ/ngày" (rivalTrafficFactor tuyến tính, gọi hàm thật với rival giả); (3) khủng hoảng MXH (SocialPanel, không phải BusinessPanel như audit ghi) — "Còn N ngày — xin lỗi cứu ~20% khách/ngày, ước ~Qđ/ngày" (hệ số thật 0.72→0.92); (4) máy bán hàng — "Hoàn vốn sau ~N ngày (đã trừ điện máy ~10k/6.5k nếu efficient)". File: `minorPayoff.ts`, `BusinessPanel.tsx`, `SocialPanel.tsx`, `BranchPanel.tsx`, test 17 test.
- Kinh tế/save không đổi; số ước đều có "~".

### GĐ160 — 🌱 Người mới: vá 3 mớt ngày đầu + nhiệm vụ tuỳ chọn từ cấp 1 — XONG

- Lý do: audit trải nghiệm — ngày 1–5 là cửa sổ bỏ game: nhiệm vụ lặp (pool tuỳ chọn rỗng cấp thấp), nhiệm vụ doanh thu ngày 1 đòi bán 100% kho (phạt người thử giá), Ra trại không khoá cấp, lịch tự động 8h lỡ giờ vàng sáng 6h–8h30 không báo.
- Triển khai: (a) hint 1 dòng ở mục Lịch tự động (AccountMenu) khi Bật + cùng cảnh báo trong toast bật lịch — KHÔNG đổi ROUTINE; (b) khoá "Ra trại" cấp 8 theo cơ chế lock chung (chỉ khoá chiều ĐI — chiều về luôn mở để không mắc kẹt save cũ); (c) `NEWBIE_REVENUE_TARGET = 100.000đ` (~65% kho khởi đầu 150k) chỉ cấp 1, từ cấp 2 nguyên thang cũ — sim ngày 1 bot bán 646–861k → đạt thoải mái; (d) 3 nhiệm vụ tuỳ chọn mở từ cấp 1: "🌅 Sớm hôm đón khách" (doanh thu 6–9h qua sổ theo giờ GĐ78; thay ý gốc vì KHÔNG có field giờ châm kệ — trung thực thay vì váng), "🌧️ Bán đồ mưa" (chỉ ngày mưa/giông; ô dù + áo mưa có sẵn), "💛 Đón khách quen" (chỉ ngày có người hẹn ghé; `visitsToday` deterministic theo weatherSeed, loại người đã phục vụ nên không đếm trùng). `questContext` thêm 3 field tuỳ chọn (save cũ an toàn). BET_CORE_IDS nguyên vẹn.
- File: `quests.ts`, `store.ts`, `Hud.tsx`, `hud.css`, test mới `newbieQuests.test.ts` (15) + điều chỉnh 4 test quest + smoke sim ngày 1.

### GĐ161 — 🍳 "Kịch bản nấu theo giờ": hẹn-giờ-thu-hoạch trong phiên — XONG

- Lý do: audit trải nghiệm — khung vắng 8:30–11h & 13–17h (×0.6) là "ca trực không quyết định". Nguyên lý Hay Day (đã ghi nguồn ở audit): mẻ nấu chạy trong phiên — bắt đầu TRƯỚC khung đông để kịp châm kệ giờ vàng là quyết định thời điểm có kỹ năng.
- Triển khai: helper thuần đọc `src/data/cookSchedule.ts` — `cookAdvice` theo khung giờ (chỉ nói thời điểm xong + khung bán, KHÔNG hứa doanh số; null khi quá 17h hoặc mẻ xong sau 20h), `pickEveningPrep` chọn mẻ dài nhất vẫn kịp 17h (hòa duration lấy lời nhất/phút trạm GĐ145). CookPanel: dòng "⏰ ..." cho món nấu được ngay (phút trạm thật = cookSpeed × bartenderBoost cùng nguồn tick đồng hồ, giờ vẽ lại 1 lần/phút game). Sổ đầu ngày (MorningPanel): 1 dòng duy nhất khung 13–17h "Muốn kịp giờ vàng tối: bắt đầu nấu {món} trước ~HH:MM".
- File: `cookSchedule.ts`, `CookPanel.tsx`, `ReportPanels.tsx`, test 27 test.

### Audit trải nghiệm (Game Designer, 28/10 sau GĐ159): vòng ngày còn 2 chỗ nông thật

- Khung giờ vắng (8:30–11h, 13–17h ×0.6) là "ca trực không quyết định" — chờ khách, không có việc có đích; tua nhanh làm kiên nhẫn khách co lại (mâu thuẫn cấu trúc).
- Tuần đầu (ngày 1–5) nhiệm vụ ngày lặp y nguyên — pool tuỳ chọn rỗng ở cấp thấp; nhiệm vụ doanh thu ngày 1 = bán 100% kho khởi đầu (phạt người chỉnh giá thử).
- Sự kiện bất ngờ: mật độ ổn nhưng một-phát quay số, không kéo dài thành chuyện kể.
- 5 đề xuất làm sâu (không mở rộng): (1) mở pool nhiệm vụ tuỳ chọn từ cấp 1 + biến thể theo hoàn cảnh; (2) "kịch bản nấu theo giờ" (bám GĐ145); (3) dải "Kế hoạch hôm nay" gom mọi hẹn giờ lên 1 bề mặt; (4) đợt nhờ của khách quen rơi vào khung vắng (bám GĐ80); (5) vá 3 mớt ngày đầu (cảnh báo lịch tự động lỡ giờ vàng sáng · khoá Ra trại cấp 8 · nới nhiệm vụ doanh thu ngày 1). Nguyên lý tham chiếu: Stardew (thời gian rảnh = chi tiêu tự chọn), Hay Day (hẹn giờ thu hoạch trong phiên), My Happy Town (bảng tin mới mỗi sáng, NPC có việc). Ghi chi tiết đề xuất vào backlog GĐ160+.

### GĐ162 — 🗓️ Dải "Kế hoạch hôm nay" trên HUD — XONG

- Lý do: audit trải nghiệm — các mốc hẹn giờ nằm rải ở 6+ bảng; không có MỘT bề mặt trả lời "BÂY GIỜ việc kế tiếp là gì?" (nguyên lý Stardew "bảng việc-ngày" + My Happy Town đơn hẹn giờ — nguồn ghi ở audit GĐ159).
- Triển khai: helper thuần đọc `src/data/todayAgenda.ts` ghép 6 nguồn có sẵn: khách quen ghé (visitsToday deterministic + lời hẹn giữ món), giờ vàng (3 band ×≥1.35), mẻ nấu đang chạy/xong + "nấu kịp 17h" (tái dùng GĐ161), khe điện thoại (chỉ khi có nhân viên giao — không có thì chip sẽ nói dối nên bỏ), hợp đồng/đơn tiệc hạn hôm nay (không có giờ trong state → xếp mốc 20h nhắc deadline, comment ghi rõ). Chợ phiên/sự kiện BỎ (cả ngày, không phải hẹn giờ).
- UI: dải chip ngang trên HUD THAY slot IdleChip khi có hẹn (0 hẹn/hướng dẫn ngày đầu/panel mở → IdleChip như cũ hoặc ẩn); chip đầu (đến hạn/đang trong khung) viền vàng; bấm mở đúng panel; mobile cuộn ngang scrollbar ẩn — không đè dock (dùng ResizeObserver có sẵn); giờ qua useClock 1 lần/phút. QA mắt: 8 chip đúng thứ tự (5 khách quen + 3 giờ vàng), chip đầu nổi đúng, @390 không tràn, 0 lỗi console.
- File: `todayAgenda.ts`, `Hud.tsx` (tối thiểu), `hud.css`, test 28 test.

### GĐ163 — 🤝 Đợt nhờ của khách quen rơi vào khung vắng — XONG

- Lý do: audit trải nghiệm — khung vắng 8:30–11h & 13–17h (×0.6) là "ca trực không quyết định". Nguyên lý NPC-có-việc (My Happy Town, ưu tiên Cao trong PHAN-TICH-THAM-KHAO-HAPPYTOWN.md) + Stardew "thời gian rảnh = chi tiêu tự chọn".
- Fact-check: arc GĐ80 chốt bước mới chỉ tại lúc thanh toán của chính khách đó (regularVisit) — KHÔNG thể hẹn giờ lúc sinh. → Phương án ít đụng nhất (0 dòng core, 0 đổi save): SUY RA cửa sổ "tiện làm" thuần đọc `errandWindow(def)` = khung ghé ∩ khung vắng (lấy chồng dài nhất; không chạm → nguyên khung ghé, inSlow:false). Cả 3 đợt nhờ hiện có cửa sổ trọn trong khung vắng (Bà Năm 8h30–10h · Chú Ba 13–17h · Bé Na 16–17h).
- Triển khai: `slowBands()` đối xứng goldenHourBands (rhythm.ts); `errandWindow`/`pendingErrands` thuần đọc (regularArc.ts); IdleChip mức ưu tiên 0 khi đang trong cửa sổ nhờ ("🤝 Bà Năm ... — 8h30–10h tiện làm", bấm mở Khách quen); chip "🤝 {giờ} Việc {khách} nhờ" trên dải GĐ162 mọi ngày đợt còn dở (cửa sổ là giờ TIỆN, không hứa khách ghé — chip ghé thật đã có ở nguồn riêng). Nhịp tiến/hết hạn/thưởng GĐ80 nguyên vẹn 100%.
- File: `rhythm.ts`, `regularArc.ts`, `idle.ts`, `todayAgenda.ts`, `Hud.tsx` (1 dòng), test mới `errandTiming.test.ts` (17 test, quét 40 seed × 10 ngày). Lưu ý: khi có hẹn hôm nay, mặt hiển thị chính là chip trên dải GĐ162 (IdleChip nhường slot) — đã thiết kế cùng nhau.

### GĐ164 — 📖 "Sự kiện bất ngờ" thành chuyện kể (mini-arc 2–3 ngày) — XONG

- Lý do: audit trải nghiệm — sự kiện bất ngờ mật độ ổn nhưng một-phát quay số, không chuyện kể. 4 arc A–D thay 4 def một-phát cùng id (kể xong không lặp — giảm đúng pool lặp mà audit chê): "Mưa rào trước hiên" (mua_roi, cấp 1, 2 ngày), "Cái kính vỡ" (bong_da_kinh, cấp 4, 2 ngày), "Hẻm ngập ba ngày" (mua_dai, cấp 6, 3 ngày), "Đoạn clip hot" (livestream, cấp 10, 3 ngày, ngại lên hình = khép sớm). Mỗi ngày 1 cảnh, hệ quả hôm qua hiện trong văn cảnh hôm nay, chọn ấm (good) cộng thưởng cuối; tổng 1.5–2× def cũ.
- Kỹ thuật: file mới `src/data/surpriseArcs.ts` (thuần dữ liệu + helper; pattern GĐ80 nhưng state riêng vì vòng khép regularArc xoá entry lạ); `BizState` thêm `surpriseArc?` + `surpriseArcsTold?` (cả hai tuỳ chọn, MERGE_DEEP — save cũ an toàn, không SAVE_VERSION); core `maybeSurprise`/`chooseSurprise` (+~60 dòng): arc dở → không quay pool, cảnh phát 10h–11h30 tất định, giữ tới 20h, lỡ hôm nay mai phát lại tới hết hạn, quá hạn khép nhẹ không phạt; `EventChoice` thêm `good?`/`needStock?` (lựa chọn cần hàng kho — xám khi thiếu).
- UI 4 bề mặt tái dùng: SurpriseAlert (findSurprise), chip "📖 chuyện còn dở" trên dải GĐ162 (nguồn 8), tin sáng "Chuyện hôm qua còn dở", mồi GĐ126 "mai có tiếp".
- Dev lệch spec có lý: thêm `surpriseArcsTold` (không có thì arc kể lại — spec "không lặp" yêu cầu vết); test ngưỡng 30→26 def (hệ quả xoá 4 def).
- Test: `surpriseArc.test.ts` 27 test (helper + core setSimSeed + round-trip + sim 2 ngày Arc A ròng +28k đúng công thức) + 109 test liên quan xanh. QA live: save mới cấp 1 (phiên song song đã reset) load sạch với field mới, 0 lỗi console, đồng hồ chạy; gặp arc trực tiếp cần chơi nhiều ngày — để tự nhiên.
- File: `surpriseArcs.ts`, `biz.ts` (data + core), `endDay.ts`, `todayAgenda.ts`, `tomorrowTeaser.ts`, `Hud.tsx`, `ReportPanels.tsx`, `surprises.test.ts` (ngưỡng).

### GĐ165 — 🎲 Bổ sung 5 sự kiện một-phát cấp thấp — XONG

- Lý do: GĐ164 thay 4 def một-phát bằng arc → pool cấp thấp mỏng; khôi phục độ đa dạng ngày 1–5 (cùng mục tiêu "mỗi sáng có thứ mới" của GĐ160).
- 5 def mới (chỉ dùng effect có sẵn, quy mô ±2k–25k / xp 5–10 / friendship +1): `chuot_kho` 🐭 (cấp 1), `tre_dau_cau` 🎈 (cấp 1), `ban_ghe_hong` 🪑 (cấp 2), `mat_dien_trua` 🧊 (cấp 3), `xe_khach_do` 🚌 (cấp 5). Friendship nối vào khách quen thật (bác Tám / Bé Na / chú Ba).
- Test: ngưỡng pool ≥31, arc+one-shot tổng 35; 4 assert dữ liệu mới. **1713/1713 (152 files)** xanh; build sạch. Thuần data — không đụng core/UI.
- File: `src/data/biz.ts`, `surprises.test.ts`, `surpriseArc.test.ts`.

### GĐ166 — 🧹 Đồng bộ hoá thẻ GĐ131–165 (audit UI 29/10) — XONG

- Audit UI/UX: 0 lỗi vỡ layout; nợ thật = "card nhấn mạnh có 6 biến thể vẽ khác nhau" + vài màu/font lệch bảng + nút disabled không tín hiệu.
- Fix: (1) controls.css 2 rule chung — `button:disabled` (opacity .45 + not-allowed) và hover nút panel (brightness 1.1) phủ toàn bộ panel; (2) 7 vá màu/font lệch bảng (#4caf50→#2ecc71, #f5b041→#e67e22, fontSize 12.5→12, bỏ borderColor chết, 2 xanh dương GĐ140 về #3498db, st.warn #f39c12→#e67e22); (3) `styles.cardTitle` (13px) áp 13 tiêu đề thẻ SummaryPanel/MorningPanel; (4) component `Callout` (shared.tsx, 6 tone) — chuyển 22/22 thẻ borderLeft của ReportPanels, 0 sót, chữ giữ nguyên 100%; (5) BranchPanel: thẻ "Bỏ lỡ" GĐ155 bỏ tái dùng st.event đỏ, khách đêm GĐ152 bỏ minWidth cứng (wrap @320). Giữ nguyên: hệ card BusinessPanel/StaffPanel, thẻ tint/dashed BusinessPanel + OrderPanel GĐ143 (đợt sau), HUD (đã chuẩn).
- Quy ước màu + Callout đã ghi vào "Quy ước kỹ thuật" (mục trên) — thẻ mới KHÔNG tự vẽ viền riêng.
- Test 1713/1713 (chữ không đổi nên không test vỡ) + build sạch + QA live: load sạch, 0 lỗi console, panel render chuẩn. Còn lại cho đợt sau: chuyển tint/dashed BusinessPanel/OrderPanel sang Callout; #27ae60 còn sót 3 chỗ nhỏ.
- File: `controls.css`, `shared.tsx`, `ReportPanels.tsx`, `BranchPanel.tsx`, `BusinessPanel.tsx`, `StoragePanel.tsx`, `LandmarkPanel.tsx`.

### GĐ167 — 🧹 Nốt vụn màu + thẻ BusinessPanel — XONG

- Chuyển 5 thẻ BusinessPanel sang Callout (GĐ128 quảng cáo, GĐ63 nên quảng cáo nghề nào, GĐ157 pitch mèo — danger strong, GĐ140 mục tiêu vòng — info, GĐ139 chuẩn bị tái sinh — ok). GIỮ banner GĐ143 OrderPanel (mint #55efc4 là màu nhận diện "mối rẻ"; cả họ 9 banner st.banner — chuyển 2/9 chỉ làm lệch hơn).
- Quét màu lệch bảng rộng hơn đề bài: `#27ae60`→`#2ecc71` (15 chỗ), `#f39c12`→`#e67e22` (17 chỗ), `#c9a20a`→`#f1c40f` (7 chỗ, gồm 2 dead fallback gọn lại) — grep 6 màu lệch toàn src/ui/ = 0 kết quả. HistoryChart kiểm tra không trùng màu đường.
- Còn cho đợt sau: Callout GardenPanel:79; họ banner guide xanh dương #0984e3/#74b9ff/#2e86de (OrderPanel/ReportPanels) cần quyết định bảng riêng — không phải "nốt vụn".
- Test 1713/1713 + build sạch; chỉ style/màu, 0 chữ, 0 logic. File: 14 file UI.

### GĐ168 — 🗺️ Nạp lại "Phía trước" cho cấp 30+ — XONG

- Lý do: audit tiến trình — RoadmapPanel rỗng từ cấp 30 (mốc cuối cũ = 29) đúng đoạn khô 31–44 (14 cấp không hệ mới); các mốc thật (tier, chương, NG+) không nằm trong bản đồ nào. Nguyên lý GĐ81/132 "nhìn thấy cái sắp tới" bị rút mất đúng chỗ cần nhất.
- Triển khai: SYSTEM_UNLOCKS thêm 10 mốc lấy đúng data thật (đất 16/24, Mini mart 30, chương 40/55/75, Siêu thị 45/58 + Đại siêu thị 75, Tái sinh 60 kèm điều kiện doanh thu 100tr) — tổng 20 mục, mốc cuối 75; `panel` thành optional (chương không có bảng riêng); RoadmapPanel chữ "hệ"→"mục", nút Xem chỉ khi có panel; badge HUD 🗺️ tự sống lại. Thuần data/đọc, không đụng logic mở khóa.
- Test 34/34 liên quan (9 test mới: snapshot 20 mục, probe when() chương, mọi cấp 30–44 còn ≥1 mục, 75+ không crash).
- File: `unlockMap.ts`, `RoadmapPanel.tsx`, `ReportPanels.tsx`, `Hud.tsx`, `unlockMap.test.ts`.

### GĐ169 — 🎯 Nhịp tuần/tháng sống mãi: bó ratchet + thưởng chuỗi đổi XP — XONG

- Lý do: audit tiến trình — goal doanh thu tuần/tháng nhân ×1.1/×1.15 trên max() cũ không trần → hụt vĩnh viễn sau vài chục tuần (nhịp tuần tự tắt); thưởng chuỗi trả tiền cho người thừa tiền.
- Fix A (trần goal): `nextGoalCapped` — trần = doanh thu kỳ vừa chốt ×1.15 (bám năng lực thật từng save, tự kéo goal spike về tầm với sau 1 tuần hụt); ĐẠT mới tăng (hụt giữ goal cũ nhưng vẫn bó trần); goal đang lưu giữ nguyên tới lần đặt mới (save-an-toàn).
- Fix B (XP chuỗi): bỏ nhân tiền chuỗi ×1.2→×1.8 (giữ thưởng gốc ×1.0); chuỗi ≥3 tuần → +35% xpToNext mỗi tuần (tháng ×2) — bù đúng cỡ 10–15%+ tốc độ lên cấp khi giữ chuỗi; notify "🔥 Chuỗi N tuần — +X XP"; XP qua addXp sau set state (1 luồng lên cấp).
- Sim xác minh (harness GĐ105, seed 169, 28 ngày, trước/sau): trần ăn ngay (goalMới 31M→24.4M cấp 30; 58.7M→41M cấp 50); XP/cấp 2.80→2.55–2.80 ngày (cấp 30), 3.50→3.11 (cấp 50); dòng tiền bot ~0 (bot giữ chuỗi 0) — đối chiếu công thức: người giữ chuỗi mất ≤0.8× thưởng cũ/tuần, người đạt mục tiêu (giờ trong tầm với) nhận +5–6% doanh thu kỳ.
- Test: `weeklyGoalCap.test.ts` 16 test (100 tuần hội tụ, hụt giữ goal, save cũ clamp, XP đúng/claim 1 lần, simSmoke cấp 30/50) + cập nhật weekly/monthly/weekPace (187 test liên quan xanh). **Full 1738/1738 (153 files)**.
- File: `data/biz.ts`, `core/biz.ts`, `endDay.ts`, `BusinessPanel.tsx` (dòng "+X XP" + cảnh báo GĐ121 đổi chữ), 4 test file.

### GĐ170 — ⚔️ Rival có kết + sửa rival qua NG+ — XONG

- Lý do: audit tiến trình — rival là hệ đối kháng sâu nhất nhưng không có đích cuối (hạ gen nào cũng 800k+400XP, tên lặp từ gen 13, truyện im sau ch5/ch8); bug thiết kế: prestigeRestart giữ rival thế hệ N → "thuế ~24–47% khách" đè lên cấp 1 vòng 2.
- Chương 13 "Siêu Thị Sao Mai": fact-check thấy rival bị hạ thứ 12 ĐÃ SẴN là Siêu Thị Sao Mai (mục cuối catalog, blurb "hậu phương công ty lớn") → trùm cuối dùng đúng chất liệu có sẵn. Điều kiện `rivalsBeaten >= 12` (RIVAL_BOSS_GEN), thưởng 5M + 3.000 XP đúng 1 lần (cơ chế chương giữ qua NG+ nên không lặp; đối xứng 6×/7,5× thưởng hạ thường, giữa ch10 và ch12).
- Gen 13+: news đời mới đổi nhãn ("Hàng mới về, hẻm lại đông" — không còn kêu gọi triệt hạ); tên gắn hậu tố "(cơ sở 2/3)" thay vì lặp vô nghĩa; rivalTier giữ trần gen 10.
- Sửa NG+: prestigeRestart đặt rival null + rivalsBeaten = 0 (câu chuyện rival khởi lại từ thế hệ 1, hợp lý với việc khởi đầu lại từ tiệm nhỏ); chương đã xem không phát lại; cổng rival đời mới thêm `prestige.level > 0` (bắt buộc của phương án reset — nếu không rival không bao giờ quay lại ở vòng 2 vì ch4 không tái phát); notify tái sinh nhắc "rival đời mới quay lại từ cấp 8". Save schema 0 thay đổi.
- Test: `rivalBoss.test.ts` 17 test (chương + ranh giới 11/12, thưởng đúng 1 lần, nhãn gen 13+, tái sinh + round-trip, cổng đời mới) + prestige/narrative cập nhật (331 test/24 file liên quan). **Full 1755/1755 (154 files)**.
- File: `chapters.ts`, `data/biz.ts`, `core/biz.ts`, `core/prestige.ts`, `slices/prestige.ts`, `rivalBoss.test.ts`, `narrative.test.ts`, `prestige.test.ts`.

## Quy ước kỹ thuật cần nhớ

- Thay đổi "soi sáng" (helper thuần đọc trong `src/data/*.ts` + một thẻ UI gọn) là mẫu mặc định — **không đổi SAVE_VERSION/kinh tế/persist** trừ khi bắt buộc.
- **Bảng màu ngữ cảnh UI (GĐ166 — KHÔNG tự chế màu mới):** accent vàng `#f1c40f` · lời `#2ecc71` · lỗ/mất-thật `#e74c3c` · cảnh báo `#e67e22` · info `#3498db` · sự kiện `#9b59b6`; chip = nền rgba cùng màu chữ. Bậc cảnh báo: đỏ = mất tiền thật, cam = cảnh báo nên xử lý, vàng = theo dõi/đang tốt.
- **Thẻ nhấn mạnh dùng `Callout` (shared.tsx, GĐ166):** borderLeft 3px màu ngữ cảnh, tiêu đề 13px màu tone (`styles.cardTitle`), thân 12px; `strong` + danger → nền đỏ nhạt. Thẻ mới KHÔNG tự vẽ viền/tint riêng nữa. HUD chip/alert dùng class CSS riêng (mẫu GĐ162).
- Test sim phải dùng **seed cố định** (`setSimSeed`, `simRng()` trong seam RNG — GĐ27/28) thay vì mock `Math.random`.
- QA live trên `localhost:5173` (vite); kiểm không tràn ngang @320/390 (`scrollWidth == clientWidth`), 0 lỗi console.
- Nhiều phiên có thể chạy song song trên cùng worktree → commit theo đường dẫn cụ thể.

## Quyết định lớn đã chốt

- Thứ tự ưu tiên giữ chân: vòng ngày → dẫn đường người mới → nhịp tuần → endgame/rival → hạ tầng server.
- NG+ (GĐ14) chỉ làm sau khi có quán thứ hai; giữ bộ sưu tập, chỉ bonus doanh thu (tối đa +48%), chặn khi hẻm online.
- Vé tha thứ streak: tối đa 1 lần/7 ngày, cần chuỗi ≥3. Thử thách tuần tích vào sổ tuần (không làm hệ song song).
- Sau GĐ83: ưu tiên chiều sâu UI/UX trước mở rộng hệ mới. Định hướng hiện tại: **chiều sâu-trước** — làm sâu hệ có sẵn (đóng hộp đen còn lại) rồi mới tính mở rộng.
- Kèo "Đặt kèo hôm nay" bám bộ "việc chính" (đông khách + bán hàng + doanh thu), không gồm "Khách vui vẻ" (GĐ107); thưởng nhiệm vụ có trần theo lãi bình quân (GĐ106); người chơi mới không bị trần (GĐ114).
- Khách treo câu hỏi quầy tự chốt theo giây thực (30s → 😕, 38s → 😤, 45s tự chốt — GĐ122).
- Lương trong số dư chi nhánh KHÔNG áp good_boss −10% (bảo thủ, trung thực).

## Cần theo dõi / nợ mở

- QA trực quan GĐ155–158 đã xong trên save máy cấp 46 (ngày 1): Mở rộng hiện tiền nhà + dự phóng đúng cả desktop/390/320 (không tràn, wrap gọn); Sân chơi số ước khớp chính xác luật charge thật (28 lượt ≈ 504.000đ ở cấp 46 = 14×15k + 7×19k + 7×23k, đã đối chiếu feedCost + roundThousand); card "Bỏ lỡ" chi nhánh & tab Thú cưng đúng trạng thái rỗng ngày 1, 0 lỗi console xuyên suốt. Chưa QA mắt được: trạng thái CÓ dữ liệu của Bỏ lỡ/Thú cưng (cần chơi vài ngày — đã bọc bởi 38 test mới). GĐ159: các dòng mới ẩn khi chưa có dữ liệu (ngày 1) — QA mắt khi có save có doanh thu/vỡ hụi/khủng hoảng sẽ bổ sung.
- (GĐ110/117) Mục tiêu nhiệm vụ ngày & kèo ở cấp 50+: sim bot hụt ~40% nhưng browser thật cấp 50 cho thấy target ×1.0 vẫn trong năng lực → chưa đổi; theo dõi nếu có phản hồi người chơi.
- Dock 1 hàng trên mobile — defer, chỉ làm khi có bằng chứng người chơi bấm nhầm.
- Audit 28/10 còn sót hộp đen mờ-nhẹ (chưa đáng giai đoạn riêng): hụi thiếu "đã góp Xđ trong vòng này"; phản công đối thủ chưa quy "-1 sức mạnh ≈ 0,25% khách" ra tiền; xin lỗi MXH chưa đếm "còn N ngày khủng hoảng"; máy bán hàng chi nhánh chỉ có doanh thu hôm nay, không hoàn vốn.
- Thời gian nhân viên rảnh KHÔNG được ghi ở state nào (chỉ runtime) — muốn soi phải thêm bộ đếm, đụng state nhẹ; nợ mở.
- Mỗi lần subagent bị "model concurrency limit" → chạy tuần tự/đợi rồi spawn lại.

## Backlog tiếp theo

1. ~~Audit tài chính~~ ✅ (GĐ155–158) · ~~4 hộp mờ nhẹ~~ ✅ (GĐ159) · ~~Audit trải nghiệm~~ ✅ · ~~GĐ160 người mới~~ ✅ · ~~GĐ161 nấu theo giờ~~ ✅.
2. ~~GĐ162 dải Kế hoạch hôm nay~~ ✅.
3. ~~GĐ163 đợt nhờ vào khung vắng~~ ✅ — 5/5 đề xuất audit trải nghiệm đã xong (GĐ160–163).
4. ~~GĐ165 sự kiện cấp thấp~~ ✅ (5 def mới) · ~~GĐ166–167 đồng bộ UI~~ ✅. Còn lại: arc E "Hàng xóm khai trương" (thay cam_do_mo) — chỉ làm khi 4 arc A–D chạy tốt trên save thật; theo dõi gặp arc trực tiếp khi chơi nhiều ngày.
5. **Audit tiến trình giữa–cuối game (29/10) → 4 giai đoạn chốt** (đều làm sâu, không mở hệ mới; KHÔNG làm: thêm hệ, thêm món — đã dày, đổi XP curve — nhịp 2–5 ngày/cấp hợp lý). Phát hiện: (a) "Phía trước" rỗng từ cấp 30 đúng đoạn khô 31–44; (b) mục tiêu doanh thu tuần/tháng ratchet ×1.1/×1.15 không trần → hụt vĩnh viễn sau vài chục tuần; (c) thưởng tuần/tháng trả tiền cho người thừa tiền; (d) rival không có đoạn kết; (e) NG+ giữ rival thế hệ N → "thuế ~24% khách" đè lên cấp 1 vòng 2 (bug thiết kế). Kế hoạch: **GĐ168** nạp lại Roadmap 30+ (mốc tier/chương/NG+ — thuần đọc); **GĐ169** bó ratchet mục tiêu + thưởng chuỗi tuần/tháng đổi XP (sim trước — tiền lệ GĐ105/110); **GĐ170** rival có kết (chương gen 12 "Siêu Thị Sao Mai" + nhãn rival đời mới + xử lý rival qua NG+); **GĐ171** NG+ mục tiêu vòng nhân theo vòng + đếm theo vòng.
6. Theo dõi sau GĐ160: nhiệm vụ mới có làm ngày 1–5 bớt lặp không (cần save người thật / sim nhiều ngày); nếu vẫn lặp → thêm biến thể hoàn cảnh khác (lễ, weekend).
7. Tầm nhìn dài hạn: nhiều loại tiệm cung ứng cho nhau (multi-shop supply chain) — chỉ tính khi audit tiếp vẫn hết chiều sâu.

## Mục lục giai đoạn đã xong (chi tiết trong archive)

- GĐ1 — Nền vững + vòng ngày sâu hơn
- GĐ2 — Người mới không lạc đường
- GĐ3 — Nhịp tuần
- GĐ4 — Đối thủ đời mới + hạ tầng server
- GĐ5 — Nền cân bằng
- GĐ6 — Cân bằng chi nhánh 24/7
- GĐ7 — Quán Nước Đầu Ngõ
- GĐ8 — Tinh chỉnh kết nối hệ thống
- GĐ9 — Cốt truyện dài hơi
- GĐ10 — Hẻm sống động hơn
- GĐ11 — Bot phủ Quán Nước
- GĐ12 — "Cái xác" 3D của Quán Nước đầu hẻm
- GĐ13 — Gắn kết xã hội vào Sự kiện bất ngờ (wire field `friendship` chết)
- GĐ14 — Prestige / NG+ "🌟 Tái sinh"
- GĐ15 — Prestige mở khóa nội dung (danh hiệu + trang phục NG+ độc quyền)
- GĐ16 — Gỡ "hộp đen" đơn app (minh bạch điểm → độ dày đơn)
- GĐ17 — Quà điểm danh theo nền kinh tế (giữ "lý do quay lại" cho kỳ cựu)
- GĐ18 — Chi nhánh "lên tiếng" (đẩy cảnh báo vận hành lên HUD)
- GĐ19 — Lấp khoảng trống 79–100 (hàng cao cấp + mốc cuối run)
- GĐ20 — Tháng vận hành (mốc nhịp tháng dương lịch)
- GĐ21 — Giờ vàng hôm nay (dự báo khung giờ đông khách)
- GĐ22 — Mồi "Sắp đạt" (cột mốc gần xong)
- GĐ23 — Chuẩn bị giờ vàng (gợi ý châm kệ trước khung đông khách)
- GĐ24 — Chuỗi giao hợp đồng đúng hẹn (thưởng mốc)
- GĐ25 — Cứng hóa dữ liệu kinh tế lễ hội (integrity)
- GĐ26 — Cửa hàng tiện lợi "có xác theo sở hữu"
- GĐ27 — Nền Seeded RNG cho sim (bước 1: seam + consumer đầu)
- GĐ28 — Cuốn RNG lõi vào seam (chi nhánh/khách/weighted)
- GĐ31 — Cân bằng kinh tế Quán Nước (khóa regress; đối xứng GĐ6)
- GĐ32 — Quán Nước: hiện LỢI NHUẬN RÒNG ở card "Hôm qua" (đóng vòng nhân viên ↔ giá bán)
- GĐ33 — Sổ cái tiền (ledger) toàn ván — khóa bất biến tiền trên mọi luồng thu/chi
- GĐ34 — Đo lại tỷ trọng chi nhánh ở ván cao (QA live, kết thúc backlog #7)
- GĐ35 — Chi nhánh: dòng "Lãi thô hôm nay" (thu − lương) ở tab Info
- GĐ36 — Sổ tay Tiệm: Album thu thập hàng hóa (Discovery Collection)
- GĐ37 — QA polish: stepper giá bán (false-positive) + đánh giá "tạm tính" (bug UX thật)
- GĐ38 — Mua đơn đầu tiên (Guided First Purchase)
- GĐ39 — "Chào mừng quay lại" (Welcome-Back Rewards)
- GĐ40 — Công trình khu phố (Community Landmark: Sân chơi trẻ em)
- GĐ41 — Đà giá thị trường (giải hộp đen giá gợi ý trên Bảng giá)
- GĐ42 — Cảnh báo đối thủ hạ giá cạnh tranh (rival lên tiếng trên HUD)
- GĐ43 — Cảnh báo lô cận hạn (biến "giảm hao phí" thành quyết định hằng ngày)
- GĐ44 — Combo "hiệu quả thực" (số lần kích hoạt để xoay combo)
- GĐ45 — Happy-hour "đáng giá": chọn đúng giờ có dữ liệu (đóng đề xuất #5)
- GĐ46 — Happy-hour "hôm nay hiệu quả thật": báo cáo kết quả khung (đóng vòng GĐ45)
- GĐ47 — Combo "gợi ý xoay": nên bật combo nào khi còn slot (đóng vòng GĐ44)
- GĐ48 — Sổ kỷ lục (cá nhân hóa "lý do quay lại": phá kỷ lục của chính mình)
- GĐ49 — Nhiệm vụ ngày "khép trọn" (tín hiệu X/M + chúc mừng xong cả bộ)
- GĐ50 — Chip mục tiêu hiện X/M nhiệm vụ ngày (luôn nhìn thấy, không cần mở bảng)
- GĐ51 — Sổ kỷ lục: feed "đang trên đà phá kỷ lục" (hôm nay so chính mình)
- GĐ52 — Xu hướng cơ sở (chi nhánh 24/7 + quán nước đang lên/xuống theo ngày)
- GĐ53 — Đào tạo nhân viên "thấy được" (tốc độ thật + lợi ích vai + chi phí)
- GĐ54 — Nhạy giá theo món trên bảng Giá (🔴 nhạy / 🟠 vừa / 🟢 bền)
- GĐ55 — Cam kết kỳ hợp đồng (quyết định đổi-lấy: trữ sẵn hàng để nhận thưởng tin cậy)
- GĐ56 — Kế hoạch giao kỳ trên Sổ đầu ngày (đóng vòng GĐ55 ngay tại màn khởi ngày)
- GĐ57 — "Mua khi rẻ": minh bạch chi phí nhập (đà giá MUA)
- GĐ58 — "Tiền bay đi đâu": sổ rủi ro/trộm (risk & security ledger)
- GĐ59 — "Đơn có đáng lấy": kinh tế từng đơn online + rủi ro điểm
- GĐ60 — "⚔️ Rival đang tiến hay lui": xu hướng sức mạnh đối thủ + 4 đòn bẩy của bạn
- GĐ61 — "🧾 Chính sách quầy": thái độ chủ tiệm (mặc cả & tiền lẻ)
- GĐ62 — "🧑 Khách của tôi là ai": nhân khẩu học khách vãng lai + quảng cáo chạm đúng nghề
- GĐ63 — "💡 Nên quảng cáo nghề nào": đề xuất nghề nên nhắm theo doanh thu (đóng vòng GĐ62)
- GĐ64 — "🔓 Mới mở — thử ngay": mồi mở khóa hệ mới sau ngày 1 (onboarding mid-game)
- GĐ65 — "🌙 Ca đêm có đáng không": lời/lỗ của khoản đầu tư 15 triệu "Mở ca đêm 24h"
- GĐ66 — "🧾 Dịch vụ nào đáng": hoàn vốn từng dịch vụ quầy (khép vòng mua 1 lần)
- GĐ67 — "🤝 Mối quen lâu dài": quan hệ nhà cung cấp + hoàn tiền sỉ theo THÁNG
- GĐ68 — "🛒 Chợ phiên nhà cung cấp đặc biệt": thương lái bán lô rẻ đầu tháng
- GĐ69 — "📖 Sổ thương mến": bể khách quen toàn tiệm + quà tri ân cuối tháng (phía BÁN)
- GĐ70 — "🎊 Đón lễ: trữ sẵn trước mùa": trục giữ-chân THEO DỊP LỄ (seasonal)
- GĐ71 — "📖 Hồ sơ tiệm + Huy hiệu thâm niên": meta-progression dài hạn (không phải trục cadence)
- GĐ72 — "🏪 Tiện lợi 24/7: việc hôm nay": mặt chủ động cho chi nhánh
- GĐ73 — "🌾 Nên hôm nay": chuỗi sản xuất hội tụ (trồng → nấu → quán nước)
- GĐ74 — "🤝 Đối tác chi nhánh × quán nước: Hiệp lực tháng": hội tụ 2 tài sản doanh thu lớn nhất
- GĐ75 — "🌟 Sự kiện thử thách theo mùa (Seasonal Mini-Event)": đợt burst 5 ngày theo mùa
- GĐ76 — "🗓️ Việc hôm nay: một bảng, đúng thứ tự (cảnh báo ép nhịp)": hành động sổ đầu ngày gom về 1 bảng ưu tiên
- GĐ77 — "🛒 Nên hôm nay: cả đêm nay của chi nhánh": đưa chuỗi sản xuất vào tài sản doanh thu lớn nhất
- GĐ78 — "🛒 Nhu cầu quầy: dự báo cầu theo giờ của tiệm chính"
- GĐ79 — "🧭 Nếp vận hành: chuỗi ngày sạch"
- GĐ80 — "📖 Câu chuyện khách quen: đợt nhờ vả nhiều ngày (Regular Errand Arc)"
- GĐ81 — "🗺️ Phía trước: bản đồ mở khóa toàn ván (Unlock Roadmap)"
- GĐ82 — "📅 Tròn một năm — tổng kết năm vận hành (nhịp năm)"
- GĐ83 — "📖 Sổ Mùa — Niên giám 4 mùa dài hạn: bộ sưu tập sao mùa toàn ván"
- GĐ85 — Fix "màn hình trắng": save schema cũ sập cả HUD
- GĐ86 — Dock điện thoại: hết nút tràn ra khỏi màn (đóng 1 phần UI-gate đa kích thước)
- GĐ87 — QA đa kích thước: 6 viewport × 10 panel, 0 overflow
- GĐ88 — Polish UI
- GĐ91-92 — Fix "chức năng bị che khuất" (feedback người chơi 28/10)
- GĐ92b — Menu "Thêm" tràn màn hình hẹp (tiếp feedback "chức năng bị che")
- GĐ93 — Audit đa thiết bị hệ thống + sửa lớp nền responsive (feedback "thiết kế theo màn chưa chuẩn")
- GĐ94 — Giảm chiều sâu cuộn panel dày nhất trên mobile (Cook tab theo trạm, Regulars thẻ gập)
- GĐ95 — Hết lớp tràn ngang còn lại: var padding panel + phân trang Đánh giá
- GĐ96 — Chốt 0 tràn ngang nhìn thấy được: flex-wrap thống kê + minmax co giãn + khoá cuộn ngang panel
- GĐ97 — QA luồng chơi thật trên mobile 390px sau GĐ93–96: đạt toàn bộ
- GĐ98 — Trả 2 nghi thức hằng ngày về dock trên màn ≤480 (quan sát GĐ97)
- GĐ99 — Rút gọn mô tả Sổ nấu trên màn hẹp (backlog GĐ98 mục 2)
- GĐ100b — Prompt chốt deal quầy: border-box toàn HUD (kéo dài GĐ100)
- GĐ101 — Chốt nợ GĐ100b: vệt cuộn "vô hình" BusinessPanel là lỗi thật ở 320px, đã sửa
- GĐ102 — QA tương tác chốt deal quầy trên mobile (backlog GĐ99 mục 4) + thế giới dừng khi có câu hỏi
- GĐ103 — Chiều sâu vòng ngày: dự phóng trước khi chốt (giá + đơn nhập) + Đặt kèo hôm nay
- GĐ104 — Polish UI 3 chỗ: footer Nhập hàng hết tràn 4px @320, thẻ kèo nén ≤200px @390, heatmap kệ đưa về Planogram
- GĐ105 — Khảo sát kinh tế vòng ngày: mô phỏng 30 ngày cấp 5/10/20, đo nguồn thu (bán hàng vs nhiệm vụ vs kèo)
- GĐ106 — Neo thưởng nhiệm vụ vào kinh tế thật: trần tổng thưởng bộ theo lãi bình quân (đóng GĐ103-№3)
- GĐ107 — Kèo dễ trúng hơn: kèo bám bộ "việc chính hôm nay" (đông khách + bán hàng + doanh thu), bỏ quest "khách vui" chết cứng
- GĐ108 — Làm mềm quest "Khách vui vẻ" (`daily_smile`): đếm khách hài lòng thay vì "tất-cả-hoặc-không"
- GĐ109 — Kèo không còn hộp đen: thẻ kèo (pending) hiện tiến độ sống của bộ "việc chính" X/Y
- GĐ110 — Khảo sát kèo & kinh tế vòng ngày giai đoạn cao (cấp 30/50/80): đo thuần, không sửa code
- GĐ111 — Sạch chuỗi lời kèo: đổi mọi chữ "trọn bộ" thành "việc chính" cho khớp GĐ107
- GĐ112 — Khóa bộ kèo trên dịp biến thể: test lễ/festival + lời hẹn/reserve trong BET_CORE_IDS
- GĐ113 — Kèo treo từ save cũ: phòng cảnh tương thích (trọn bộ → việc chính) + round-trip save
- GĐ114 — Người chơi MỚI: kèo & trần kinh tế ngày đầu phải thân thiện (không bị cày)
- GĐ115 — QA trực quan thẻ kèo GĐ107–111 trên trình duyệt thật (đóng "Cần duyệt")
- GĐ116 — Audit đa kích thước panel mở rộng (Levels/Landmark/Discovery) trên browser thật (đóng backlog #4)
- GĐ117 — Xác minh browser thật target kèo ×1.0 ở cấp 50 (bổ sung bằng chứng GĐ110)
- GĐ118 — QA live quest "Khách vui vẻ" (GĐ108) + xác nhận đường "Nhận tất cả" an toàn cho kèo
- GĐ119 — Dấu hiệu "khách sốt ruột" ở quầy (làm sâu khoảnh khắc phục vụ, UI-only)
- GĐ120 — Phản hồi cuối ngày "mất khách vì chờ quầy" (đóng vòng lặp của GĐ119)
- GĐ121 — Nhịp chạy tuần (Weekly Pace): tín hiệu kịp/hụt + rủi ro mất chuỗi cho thử thách tuần (UI-only)
- GĐ122 — Khách chờ mặc cả/ghi sổ quá lâu: tự chốt theo giây thực (đóng backlog #2 desk-queo)
- GĐ123 — Đưa analytics + kỷ lục vào vòng ngày cho người chơi cấp 60+ (đóng backlog #1 chiều sâu cấp cao, đề xuất #2 của Game Designer audit)
- GĐ124 — Làm sâu COMBO theo NGÀY: mở khóa quyết định "xoay slot combo" (khuyến nghị #1 audit deleg_cf5d8d4e)
- GĐ125 — Làm sâu hệ HỢP ĐỒNG: "Sổ chuỗi hợp đồng" đóng vòng phản hồi quyết định bị đứt (khuyến nghị #2 audit deleg_cf5d8d4e)
- GĐ126 — 🔮 "Mai tiệm có gì": mồi quay lại ngày mai ở tổng kết cuối ngày
- GĐ127 — Sổ kinh doanh Quán nước: đóng vòng phản hồi quyết định 25M (đề xuất #1 audit Game Designer)
- GĐ128 — 📈 "Quảng cáo có đáng không": đóng vòng phản hồi ROI nguyên quảng cáo (đề xuất B1 audit)
- GĐ129 — 🎫 "Thẻ tích điểm có đáng không": đóng vòng phản hồi chi phí–lợi ích (primary audit nối tiếp)
- GĐ130 — 🌞 "Giờ vàng hôm nay có đáng không": đưa verdict giờ vàng ra ranh giới ngày (B2 audit còn sót)
- GĐ131 — 📦 "Hết hàng còn bỏ lỡ bao nhiêu": định lượng lãi bỏ lỡ vì kệ/kho tiệm CHÍNH (primary audit sau khi backlog cạn)
- GĐ132 — 🧭 "Sắp mở khóa": đưa tiến trình mở khóa hệ vào Sổ đầu ngày cho người chơi MỚI (B1 audit)
- GĐ133 — 🥀 "Đêm qua hỏng hàng bao nhiêu": bản kê NGƯỢC hàng hết hạn/hỏng theo món (primary audit deleg_9ecd6919)
- GĐ134 — 🧊 "Tủ lạnh kho đầy": định lượng hàng cần lạnh vượt khả năng giữ lạnh (backup B2 audit deleg_9ecd6919)
- GĐ135 — 🧺 "Chợ phiên đầu ngõ": bản đánh giá thuần-đọc hàng DƯ đáng gánh ra bán (slice 1 của mở rộng Gánh hàng rong)
- GĐ136 — 🧺 "Bán chợ phiên": action bán hàng DƯ thật sự, một lần mỗi phiên (hoàn thiện mở rộng Gánh hàng rong)
- GĐ137 — 🧺 "Chợ phiên ngày mai": mồi cuối ngày báo trước phiên chợ + hàng DƯ, chuẩn bị từ đêm (làm sâu CHÍNH mở rộng Gánh hàng rong)
- GĐ138 — 🧺 "Chợ phiên hôm nay": tổng kết cuối ngày gánh hàng DƯ đã bán (làm sâu tiếp mở rộng Gánh hàng rong)
- GĐ139 — 🌳 "Chuẩn bị tái sinh": dự phóng NG+ thuần đọc, đóng trục lặp lại cuối cùng còn là hộp đen
- GĐ140 — 🌱 "Mục tiêu vòng tái sinh": cho vòng NG+ một cuốn mục tiêu ngắn — vài mốc đo theo VÒNG, nhận thưởng tiền, reset mỗi lần tái sinh
- GĐ141 — 💸 "Người này đáng đồng lương không?": bảng giá trị hôm nay của từng nhân viên ca ngày so với lương — đóng vòng phản hồi quyết định nhân sự (làm sâu hệ nhân viên đang có)
- GĐ142 — 🏪 "Tiện lợi đáng đồng lương?": bảng giá trị hôm nay của từng nhân viên CHI NHÁNH so với lương — đóng vòng phản hồi quyết định nhân sự tiện lợi
- GĐ143 — 🤝 "Mối nào rẻ THẬT": giá vốn theo từng mối sau bớt số thùng + hoàn tháng, và mối rẻ nhất theo từng món hôm nay — đóng mảnh GIỮA (mua Ở mối nào) còn là hộp đen của vòng nhập hàng
- GĐ144 — 🌙 "Ca đêm ai xứng đồng lương?": giá trị hôm nay của TỪNG nhân viên CA ĐÊM tiệm chính so với lương thực trả (×1.5 · good_boss −10%) — đóng góc "nhân sự lạnh" cuối cùng của trục giá trị VS chi phí nhân sự
- GĐ145 — 🍳 "Nấu món nào xứng cho trạm": kinh tế nấu bếp — lãi theo PHÚT TRẠM THẬT + nguyên liệu bán rời có hời hơn nấu không
- GĐ146 — "🌱 Trồng giống nào, nuôi con nào đáng?" — kinh tế trang trại theo LUỐNG/NGÀY và CON/NGÀY
- GĐ147 — "🧑🍳 Nấu hay bán lẻ nông sản nhà trồng/nuôi?" — mặt ghép trại→bếp, nấu lời hơn bán lẻ bao nhiêu
- GĐ148 — ⭐ "Danh tiếng đáng bao nhiêu khách?" — đưa danh tiếng (ẩn trong máy) ra con số khách/ngày
- GĐ149 — 🔪 "Quầy thịt cá có người bán không?" — đưa lỗ cầu thịt cá (hộp đen) ra con số tiền/ngày
- GĐ150 — 💳 "Ghi sổ đang khóa bao nhiêu tiền, ai sắp quỵt nợ?" — định lượng Sổ nợ (tiền khóa + rủi ro mất hẳn)
- GĐ151 — 🤝 "Hợp đồng này có đáng ký?" — ROI nhận hợp đồng (đóng hộp đen "có nên ký hợp đồng không")
- GĐ152 — 🏪 "Chi nhánh 24/7 hôm nay lời hay lỗ sau điện?" (đóng hộp đen "chưa trừ điện" của tiện lợi)
- GĐ153 — 🧮 Gọi đúng tên số dư chi nhánh (chưa phân bổ giá vốn)
- GĐ154 — 📉 Xu hướng cơ sở: lỗ không được biến mất
- GĐ155 — 🚪 Chi nhánh bỏ lỡ bao nhiêu tiền mỗi tối
- GĐ156 — 🏗️ Mở rộng thì tiền nhà tăng bao nhiêu
- GĐ157 — 🐱 Thú cưng đáng bữa cơm không
- GĐ158 — 🛝 Sân chơi: góp bao nhiêu, còn bao nhiêu, đáng không
- GĐ159 — 🔍 Đóng nốt 4 hộp mờ nhẹ (hụi · phản công · MXH · máy bán hàng)
- GĐ160 — 🌱 Người mới: vá ngày đầu + nhiệm vụ tuỳ chọn từ cấp 1
- GĐ161 — 🍳 Kịch bản nấu theo giờ: hẹn-giờ-thu-hoạch trong phiên
- GĐ162 — 🗓️ Dải Kế hoạch hôm nay trên HUD
- GĐ163 — 🤝 Đợt nhờ khách quen rơi vào khung vắng
- GĐ164 — 📖 Sự kiện bất ngờ thành chuyện kể (mini-arc)
- GĐ165 — 🎲 Bổ sung 5 sự kiện một-phát cấp thấp
- GĐ166 — 🧹 Đồng bộ hoá thẻ GĐ131–165 (Callout + bảng màu)
- GĐ167 — 🧹 Nốt vụn màu + thẻ BusinessPanel
- GĐ168 — 🗺️ Nạp lại Phía trước cho cấp 30+
- GĐ169 — 🎯 Nhịp tuần/tháng sống mãi (bó ratchet + XP chuỗi)
- GĐ170 — ⚔️ Rival có kết (Chương 13 Siêu Thị Sao Mai) + sửa rival qua NG+
