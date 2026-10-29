# PROGRESS — Tạp Hóa Đầu Ngõ (tap-hoa-3d)

> Đọc file này TRƯỚC TIÊN khi bắt đầu phiên mới. File được giữ GỌN: chỉ tầm nhìn, trạng thái, quy ước, quyết định, backlog và mục lục giai đoạn.
> Chi tiết đầy đủ các giai đoạn (nguồn quyết định, công thức, QA, số liệu) nằm ở `docs/progress-archive/`: PROGRESS-GD1-153.md, PROGRESS-GD154-158.md, PROGRESS-GD154-180.md — tra bằng `grep -n "GĐ1xx" docs/progress-archive/*.md`.
> Quy ước: mỗi giai đoạn một commit; test phải xanh (`npm run test`) + build sạch (`npm run build`) trước khi duyệt. Ghi GĐ mới vào mục "Giai đoạn gần đây" (≤ ~15 dòng/GĐ); khi mục đó quá ~10 GĐ, dồn bản cũ sang archive và chỉ để lại 1 dòng ở Mục lục.

## Tầm nhìn game (mọi quyết định phải đối chiếu với phần này — KHÔNG tự ý thay đổi)

**Game là gì?** Mô phỏng quản lý **tiệm tạp hóa Việt Nam trong một con hẻm** (3D, góc nhìn thứ nhất): người chơi vừa là chủ tiệm vừa đứng quầy — nhập hàng, bày kệ, định giá, tuyển người, mở rộng sang trại/bếp/chi nhánh/quán nước/bán online, sống cùng con hẻm với khách quen, đối thủ và lễ hội.

**Cảm giác cốt lõi:** niềm tự hào của người chủ nhỏ dần thành cơ ngơi — "tiệm nhỏ đầu ngõ, mình chăm chút từng ngày, khách quen gọi đúng tên mình". Ấm áp, đời thường, đậm chất hẻm Việt Nam.

**Vòng lặp chơi chính (nesting):**
1. **Nhịp ngày (lõi):** sáng — Sổ đầu ngày (việc hôm nay + nhu cầu quầy + nhập/nấu/bày) → giữa ngày — đứng quầy, chốt deal, khách quen, đơn online → tối — chốt ngày, thu quà/nhịp.
2. **Nhịp dài:** tuần (thử thách) → tháng (mục tiêu) → mùa (sự kiện + Sổ Mùa) → năm (tổng kết) → NG+ Tái sinh.
3. **Trục tiến trình:** cấp mở khóa 10 hệ lớn × chiều sâu từng hệ (kệ, giá, nhân sự, trại→kho→bếp→quầy, chi nhánh 24/7, online) × quan hệ (khách quen, đối thủ, danh tiếng).

**Nguyên tắc thiết kế:** (a) mọi quyết định hằng ngày phải có dữ liệu phản hồi (không hộp đen); (b) phần thưởng phụ có cổng (không farming được); (c) không đổi công thức kinh tế khi thêm meta — meta chỉ soi sáng/ghi nhận; (d) UI ấm áp, gọn, rõ — dùng được khi chưa đọc hướng dẫn.

**Phong cách hình ảnh (UI 2D phủ trên thế giới 3D):** thế giới low-poly 3D màu ấm; UI (HUD, panel React, icon pixel 16×16) nền tím-than (#3a3a4d) accent vàng (#f1c40f); chữ/biển/bong bóng vẽ canvas 2D rồi dán lên vật thể 3D; icon emoji nhất quán, tiếng Việt đời thường. Tài sản 3D thủ công bằng Blender (low-poly stylized cùng bảng màu, theo mục "Tài sản 3D với Blender" trong promt_game.md). Bảng màu/biểu mẫu tập trung ở `src/ui/controls.css` + `src/ui/panels/shared.tsx`.

## Trạng thái hiện tại (29/10/2026)

- **2187/2187 test pass (215 files) + 2159/2159 (test:coverage, 211 files; branch 87.14%/fn 75.59%)** · build sạch (chỉ cảnh báo bundle-size có sẵn) · game chạy ổn định (dev boot @5173 200). Nhánh làm việc: `phat-trien-game-tu-do`. Đã xong GĐ1–GĐ251. ⚠️ 29/10 phiên GĐ245–250: dev server 5173 KHÔNG chạy (xem "Cần theo dõi") — QA mắt hoãn, xác minh bằng test + build + coverage.
- Bức tranh tổng: các nhịp giữ chân (ngày/tuần/tháng/mùa/năm/NG+) bão hòa; UI responsive đa thiết bị audit kỹ (GĐ85–104, 116, 166–167); trục "giá trị vs chi phí" soi kín gần hết tài sản (GĐ141–153); loạt "học từ Xóm Nông Trại" đã hoàn (GĐ172–176: kit prop GLB + coin-pop juice + tách chunk vendor + guard render + Blender 5.2 pipeline Draco). NG+ có mục tiêu vòng co giãn theo vòng + mục tiêu rival trong vòng (GĐ171).
- Backup source trước GĐ1 (trước khi có git): `C:\Users\Admin\GAME_TU_DO_backup_2026-10-26.tar.gz`.

### Giai đoạn gần đây · GĐ230–251 (chi tiết GĐ154–229: docs/progress-archive/PROGRESS-GD154-180.md · PROGRESS-GD181-203.md · PROGRESS-GD204-212.md · PROGRESS-GD213-219.md · PROGRESS-GD220-229.md)

- **GĐ177–229** đã dồn archive: 3D + đèn/đèn lễ/sửa đường (177–198) · multi-shop supply chain khép mạch (199–209) · QA toàn diện + bộ "soi tiền/vốn" (210–229) — xem 5 file archive.
- **GĐ230–250** ✅ QA TOÀN DIỆN (GĐ230: branch 86.96%/fn 74.77% · GĐ240: 86.85/74.84 · GĐ250: 87.14/75.59, 2181/2181): 231 commitTry · 232 onlineNet · 233 wearRisk · 234 contractPortfolio · 235 stockTurn · 236 theftRisk · 237 serveCoverage · 238 onlineRatingValue · 239 categoryMix · 241 dirtLoss · 242 trafficForecast · 243 licenseHealth · 244 socialValue · 245 festivalValue (soi lễ ra khách/tiền, CẢ thẻ đang diễn ra + sắp tới) · 246 staffIdle (agent đếm rảnh/làm qua slice transient staffDay; StaffPanel dòng 🧍 + Callout ≥65% ca) · 247 festivalRestock (phiếu trữ lễ một chạm vào giỏ) · 248 staffDayRecap (tổng kết đội cuối ngày: dư người vs lệch ca) · 249 festivalPrepAction (trữ lễ thành việc sáng) · 250 audit vá test trafficForecast/warehouseUpgrade/festivalPrep. Chi tiết: docs/progress-archive/PROGRESS-GD220-229.md.
- **GĐ251 giá dịp lễ** 💲: `suggestPrice`/`priceForecast` nhận `tolerance` (dayEffects — Tết 0.5, ngày thường 1): trần gợi ý TĂNG nới rộng thêm (1−tol)×0.3, ngưỡng "đắt quá phải hạ" ×tol; PricePanel (bảng + Chỉnh-tất-cả + dự phóng từng món) và priceGap truyền đúng hệ số; badge GĐ54 ghi "nhạy thực tế ×tol" + banner lễ trên bảng giá. THUẦN ĐỌC, mặc định 1 = hành vi cũ.

## Quy ước kỹ thuật cần nhớ

- Thay đổi "soi sáng" (helper thuần đọc trong `src/data/*.ts` + một thẻ UI gọn) là mẫu mặc định — **không đổi SAVE_VERSION/kinh tế/persist** trừ khi bắt buộc.
- **Bảng màu ngữ cảnh UI (GĐ166 — KHÔNG tự chế màu mới):** accent vàng `#f1c40f` · lời `#2ecc71` · lỗ/mất-thật `#e74c3c` · cảnh báo `#e67e22` · info `#3498db` · sự kiện `#9b59b6`; chip = nền rgba cùng màu chữ. Bậc cảnh báo: đỏ = mất tiền thật, cam = cảnh báo nên xử lý, vàng = theo dõi/đang tốt. (GĐ167: grep 6 màu lệch = 0; GĐ178: họ banner guide xanh dương đã gộp về info `#3498db` — toàn bộ src/ui chỉ còn các màu ngữ cảnh + họ buy-tone được duyệt.)
- **Thẻ nhấn mạnh dùng `Callout` (shared.tsx, GĐ166):** borderLeft 3px màu ngữ cảnh, tiêu đề 13px màu tone (`styles.cardTitle`), thân 12px; `strong` + danger → nền đỏ nhạt. Thẻ mới KHÔNG tự vẽ viền/tint riêng. HUD chip/alert dùng class CSS riêng (mẫu GĐ162).
- **Pipeline Blender (GĐ172–176):** script nguồn trong `scripts/` + G LB trong `public/models/kit/` được commit để dựng lại; chạy headless `blender -b -P scripts/blender_kit_atlas.py`; xuất Draco; lazy-load trong code (`kitProps.ts`), fallback warn khi load lỗi; prop chỉ hình ảnh KHÔNG chặn lưới điều hướng. Dung lượng: kit 7 prop (baked: `chau_cay`/`thung_go`/`khom_tre`/`bon_nuoc`/`cho_nhua`/`xe_day`/`rao_chan`) ~76KB baked tổng. Ngân sách: cap tris trong `build-kit-assets.ts`. KHÔNG commit file .blend nặng. 3D Artist giữ thư mục script/tài sản; Developer chỉ tích hợp.
- Test sim phải dùng **seed cố định** (`setSimSeed`, `simRng()` trong seam RNG — GĐ27/28) thay vì mock `Math.random`.
- **Hạ tầng test (29/10):** sim có seed là TẤT ĐỊNH — mọi rẽ ngẫu nhiên của logic đi qua `simRng()` (không seed = Math.random, game thật không đổi); chỉ hình ảnh (three.js, nhân vật, cây, gà) còn Math.random. Code logic mới KHÔNG dùng Math.random/Date.now trực tiếp. `simGolden.test.ts` bắt cả tất định vỡ lẫn lệch cân bằng ±5% so với mốc — đổi kinh tế CÓ CHỦ Ý thì chép số mới in ở stdout vào `GOLDEN` + ghi lý do ở đây. `npm run test:coverage` (~1 phút, bỏ 3 file sim) chạy mỗi ~10 GĐ. Test lớp lưu thật: `saveStore.test.ts` (IndexedDB giả, backup, bản hỏng, bản khẩn cấp, migrate); nhân viên: `staffAgent.test.ts` (đến/về ca, quầy, lao công, kho, quản lý). Cả hai đã kiểm bằng cài lỗi (mutation) — test đỏ đúng chỗ.
- QA live trên `localhost:5173` (vite); kiểm không tràn ngang @320/390 (`scrollWidth == clientWidth`), 0 lỗi console.
- Nhiều phiên có thể chạy song song trên cùng worktree → commit theo đường dẫn cụ thể.

## Quyết định lớn đã chốt

- Thứ tự ưu tiên giữ chân: vòng ngày → dẫn đường người mới → nhịp tuần → endgame/rival → hạ tầng server.
- NG+ (GĐ14) chỉ làm sau khi có quán thứ hai; giữ bộ sưu tập, chỉ bonus doanh thu (tối đa +48%), chặn khi hẻm online.
- Vé tha thứ streak: tối đa 1 lần/7 ngày, cần chuỗi ≥3. Thử thách tuần tích vào sổ tuần.
- Sau GĐ83: ưu tiên chiều sâu UI/UX trước mở rộng hệ mới. Định hướng hiện tại: **chiều sâu-trước**.
- Kèo "Đặt kèo hôm nay" bám bộ "việc chính" (đông khách + bán hàng + doanh thu), không gồm "Khách vui vẻ" (GĐ107); thưởng nhiệm vụ có trần theo lãi bình quân (GĐ106); người chơi mới không bị trần (GĐ114).
- Khách treo câu hỏi quầy tự chốt theo giây thực (30s → 😕, 38s → 😤, 45s tự chốt — GĐ122). Riêng sim có seed (test/bot): đếm theo tick (mỗi lần gọi ~0.1s) để kết quả không phụ thuộc máy nhanh/chậm.
- Lương trong số dư chi nhánh KHÔNG áp good_boss −10% (bảo thủ, trung thực).
- 3D: Tài sản 3D mới đều qua pipeline Blender (không dựng tạm khối nguyên thủy khi Blender làm đẹp hơn), làm chậm/lười để không chặn lần tải đầu.
- Họ màu hướng dẫn/chuỗi/biểu đồ (GĐ178): gộp hết về một sắc info `#3498db`, KHÔNG lập bảng riêng — tránh "màu tự chế" trái GĐ166; giữ ngoại lệ duy nhất họ buy-tone `#55efc4`/`#ff7675`. GardenPanel dùng họ "system card" riêng (cùng mẫu BusinessPanel) nên giữ nguyên, không churn.

## Cần theo dõi / nợ mở

- ⚠️ (29/10, phiên GĐ245–) Dev server @5173 KHÔNG chạy trong phiên này (connection refused, không còn process vite). Theo quy tắc không tự khởi động server → QA mắt trực tiếp bị hoãn: GĐ245 festivalValue đã xác minh bằng test (2152/2152 xanh) + build sạch; khi server bật lại cần QA mắt thẻ lễ "đang diễn ra"/"sắp tới" ở Sổ đầu ngày (cả 390px).

- QA mắt 3D/panel chập tối (save thật, foreground tab — IAB nền dừng rAF): đèn lồng GĐ177, biển mở/đóng GĐ179, đèn khách đợi GĐ180 + mức khẩn GĐ186, rào sửa đường GĐ184, đèn ấm hiên/cổng GĐ185 + quán nước GĐ187, thẻ từng người đáng lương GĐ188, quán nước thành việc sáng GĐ189, thanh nạp kho GĐ190 + socket OrderPanel GĐ191, hồi vốn ca đêm GĐ192 + xây quán GĐ193 + xây chi nhánh GĐ194 — từng giai đoạn đã QA @5173 lúc làm; nếu cần đối chiếu lại trên save thật các khung giờ cụ thể, xem archive.
- ✅ ĐÃ ĐÓNG (29/10) flake `weeklyGoalCap` cấp 50: nguyên nhân là bot autoplay bày lại cả tầng kệ ĐÃ ĐẦY mỗi 150 tick → dựng lại 3D cả kệ (~44% CPU sim). Bỏ qua tầng đầy + timeout 1.800.000ms → cả bộ test 23 phút → ~4 phút, 0 đỏ. Nếu cả bộ lại vượt ~10 phút: đo `npx vitest run --reporter=json` + profile trước khi làm tiếp.
- GĐ171: scale mục tiêu vòng ×(1+0.5(N−1))/×(1+0.3(N−1)) — cần save thật vòng 2+ để xác nhận trad vẫn căng nhưng với tới; nếu vẫn quá dễ → siết trần.
- (GĐ110/117) Mục tiêu nhiệm vụ ngày & kèo ở cấp 50+: sim bot hụt ~40% nhưng browser thật cho thấy target ×1.0 vẫn trong năng lực → chưa đổi; theo dõi.
- QA trực quan GĐ155–158 xong trên save máy cấp 46 ngày 1; chưa QA mắt được trạng thái CÓ dữ liệu của Bỏ lỡ/Thú cưng/hụi/khủng hoảng (cần play vài ngày — bọc bởi test). GĐ159 các dòng mới ẩn ngày 1 — QA mắt khi có save có doanh thu.
- Mỗi lần subagent bị "model concurrency limit" → chạy tuần tự/đợi rồi spawn lại.

## Backlog tiếp theo

1. **Audit trải nghiệm & tiến trình (GĐ168–171) đã xong** ✅ (mid/late-game: roadmap 30+, ratchet tuần/tháng, rival kết, NG+ mục tiêu vòng). Trục "**tài sản 3D + không gian con hẻm**" đã hoàn kín: kit prop (GĐ172–176) + băng ghế (GĐ195) + phiên chợ chỗ ngồi (GĐ196) + cờ dịp (GĐ197) + thẻ đọc con hẻm (GĐ198). **Trục này đã cạn chiều sâu trong phạm vi đồ trang trí** — nhịp 3D mới chỉ đáng làm khi đi kèm gameplay (không chỉ hình). Nhịp kế tiếp nên chuyển trục theo backlog (multi-shop supply chain — mục 6) hoặc đào sâu một hệ đang ít được nối trọn.
2. 🎯 **Chợ phiên thành nhịp gameplay** ✅ (GĐ182: đông khách ×1.15 + toast nhắc). Giờ nhịp tuần: gánh hàng dựng (GĐ181) + xả kho (GĐ135/136) + đông khách. Nếu sau này muốn mạnh hơn: hàng đặc biệt bán giá tốt hơn ngày phiên, hoặc mùa/lễ hội riêng — ghi chờ, không vội.
3. Sau GĐ160: nhiệm vụ mới có làm ngày 1–5 bớt lặp không (save người thật); nếu vẫn lặp → thêm biến thể hoàn cảnh (lễ, weekend).
4. GĐ164 theo dõi: arc E "Hàng xóm khai trương" (thay cam_do_mo) — chỉ làm khi 4 arc A–D chạy tốt trên save thật.
5. ✅ UI nợ ĐÃ ĐÓNG (GĐ183): toàn bộ thẻ trong src/ui dùng `Callout`; 0 màu lệch bảng/toan trong UI. Hết món nợ UI còn thấy.
6. 🔗 **Multi-shop supply chain (backlog 6)** — ĐÃ SÂU VA KHÉP: GĐ199 rốn kho → GĐ200 chân trời ngày → GĐ201 nạp đúng chi nhánh → GĐ202 phiếu nạp → GĐ203 nhảy một chạm → GĐ204 thấy cả mạng ở Nhập hàng → GĐ205 điền kệ chi nhánh vào giỏ → GĐ206 auto chuyển kho (CƠ CHẾ, chạm kinh tế/persist) → GĐ207 chỉnh ngưỡng/hẹn giờ → GĐ208 soi quán nước còn mấy đêm đồ uống → GĐ209 NẠP đồ uống quán nước một-chạm (chở thật). Mạch đọc→gợi ý→nhảy→thấy→điền→tự chở→chỉnh→soi→nạp qn đã khép; hết ý mở rộng nhỏ.

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
- GĐ27 — Nền Seeded RNG cho sim (bước 1
- GĐ28 — Cuốn RNG lõi vào seam (chi nhánh/khách/weighted)
- GĐ31 — Cân bằng kinh tế Quán Nước (khóa regress; đối xứng GĐ6)
- GĐ32 — Quán Nước
- GĐ33 — Sổ cái tiền (ledger) toàn ván — khóa bất biến tiền trên mọi luồng thu/chi
- GĐ34 — Đo lại tỷ trọng chi nhánh ở ván cao (QA live, kết thúc backlog #7)
- GĐ35 — Chi nhánh
- GĐ36 — Sổ tay Tiệm
- GĐ37 — QA polish
- GĐ38 — Mua đơn đầu tiên (Guided First Purchase)
- GĐ39 — "Chào mừng quay lại" (Welcome-Back Rewards)
- GĐ40 — Công trình khu phố (Community Landmark
- GĐ41 — Đà giá thị trường (giải hộp đen giá gợi ý trên Bảng giá)
- GĐ42 — Cảnh báo đối thủ hạ giá cạnh tranh (rival lên tiếng trên HUD)
- GĐ43 — Cảnh báo lô cận hạn (biến "giảm hao phí" thành quyết định hằng ngày)
- GĐ44 — Combo "hiệu quả thực" (số lần kích hoạt để xoay combo)
- GĐ45 — Happy-hour "đáng giá"
- GĐ46 — Happy-hour "hôm nay hiệu quả thật"
- GĐ47 — Combo "gợi ý xoay"
- GĐ48 — Sổ kỷ lục (cá nhân hóa "lý do quay lại"
- GĐ49 — Nhiệm vụ ngày "khép trọn" (tín hiệu X/M + chúc mừng xong cả bộ)
- GĐ50 — Chip mục tiêu hiện X/M nhiệm vụ ngày (luôn nhìn thấy, không cần mở bảng)
- GĐ51 — Sổ kỷ lục
- GĐ52 — Xu hướng cơ sở (chi nhánh 24/7 + quán nước đang lên/xuống theo ngày)
- GĐ53 — Đào tạo nhân viên "thấy được" (tốc độ thật + lợi ích vai + chi phí)
- GĐ54 — Nhạy giá theo món trên bảng Giá (🔴 nhạy / 🟠 vừa / 🟢 bền)
- GĐ55 — Cam kết kỳ hợp đồng (quyết định đổi-lấy
- GĐ56 — Kế hoạch giao kỳ trên Sổ đầu ngày (đóng vòng GĐ55 ngay tại màn khởi ngày)
- GĐ57 — "Mua khi rẻ"
- GĐ58 — "Tiền bay đi đâu"
- GĐ59 — "Đơn có đáng lấy"
- GĐ60 — "⚔️ Rival đang tiến hay lui"
- GĐ61 — "🧾 Chính sách quầy"
- GĐ62 — "🧑 Khách của tôi là ai"
- GĐ63 — "💡 Nên quảng cáo nghề nào"
- GĐ64 — "🔓 Mới mở — thử ngay"
- GĐ65 — "🌙 Ca đêm có đáng không"
- GĐ66 — "🧾 Dịch vụ nào đáng"
- GĐ67 — "🤝 Mối quen lâu dài"
- GĐ68 — "🛒 Chợ phiên nhà cung cấp đặc biệt"
- GĐ69 — "📖 Sổ thương mến"
- GĐ70 — "🎊 Đón lễ
- GĐ71 — "📖 Hồ sơ tiệm + Huy hiệu thâm niên"
- GĐ72 — "🏪 Tiện lợi 24/7
- GĐ73 — "🌾 Nên hôm nay"
- GĐ74 — "🤝 Đối tác chi nhánh × quán nước
- GĐ75 — "🌟 Sự kiện thử thách theo mùa (Seasonal Mini-Event)"
- GĐ76 — "🗓️ Việc hôm nay
- GĐ77 — "🛒 Nên hôm nay
- GĐ78 — "🛒 Nhu cầu quầy
- GĐ79 — "🧭 Nếp vận hành
- GĐ80 — "📖 Câu chuyện khách quen
- GĐ81 — "🗺️ Phía trước
- GĐ82 — "📅 Tròn một năm — tổng kết năm vận hành (nhịp năm)"
- GĐ83 — "📖 Sổ Mùa — Niên giám 4 mùa dài hạn
- GĐ85 — Fix "màn hình trắng"
- GĐ86 — Dock điện thoại
- GĐ87 — QA đa kích thước
- GĐ88 — Polish UI
- GĐ91-92 — Fix "chức năng bị che khuất" (feedback người chơi 28/10)
- GĐ92b — Menu "Thêm" tràn màn hình hẹp
- GĐ93 — Audit đa thiết bị hệ thống + sửa lớp nền responsive
- GĐ94 — Giảm chiều sâu cuộn panel dày nhất trên mobile
- GĐ95 — Hết lớp tràn ngang còn lại
- GĐ96 — Chốt 0 tràn ngang nhìn thấy được
- GĐ97 — QA luồng chơi thật trên mobile 390px sau GĐ93–96
- GĐ98 — Trả 2 nghi thức hằng ngày về dock trên màn ≤480
- GĐ99 — Rút gọn mô tả Sổ nấu trên màn hẹp
- GĐ100b — Prompt chốt deal quầy
- GĐ101 — Chốt nợ GĐ100b
- GĐ102 — QA tương tác chốt deal quầy trên mobile + thế giới dừng khi có câu hỏi
- GĐ103 — Chiều sâu vòng ngày
- GĐ104 — Polish UI 3 chỗ (footer Nhập hàng, thẻ kèo, heatmap kệ)
- GĐ105 — Khảo sát kinh tế vòng ngày
- GĐ106 — Neo thưởng nhiệm vụ vào kinh tế thật (trần theo lãi bình quân)
- GĐ107 — Kèo dễ trúng hơn (bám bộ "việc chính hôm nay")
- GĐ108 — Làm mềm quest "Khách vui vẻ" (`daily_smile`)
- GĐ109 — Kèo không còn hộp đen (thẻ kèo hiện tiến độ sống X/Y)
- GĐ110 — Khảo sát kèo & kinh tế giai đoạn cao (cấp 30/50/80)
- GĐ111 — Sạch chuỗi lời kèo (đổi "trọn bộ" → "việc chính")
- GĐ112 — Khóa bộ kèo trên dịp biến thể
- GĐ113 — Kèo treo từ save cũ
- GĐ114 — Người chơi MỚI
- GĐ115 — QA trực quan thẻ kèo trên trình duyệt thật
- GĐ116 — Audit đa kích thước panel mở rộng trên browser thật
- GĐ117 — Xác minh browser thật target kèo ×1.0 ở cấp 50
- GĐ118 — QA live quest "Khách vui vẻ" + đường "Nhận tất cả" an toàn
- GĐ119 — Dấu hiệu "khách sốt ruột" ở quầy (UI-only)
- GĐ120 — Phản hồi cuối ngày "mất khách vì chờ quầy"
- GĐ121 — Nhịp chạy tuần (Weekly Pace)
- GĐ122 — Khách chờ mặc cả/ghi sổ quá lâu
- GĐ123 — Đưa analytics + kỷ lục vào vòng ngày cho cấp 60+
- GĐ124 — Làm sâu COMBO theo NGÀY
- GĐ125 — Làm sâu hệ HỢP ĐỒNG
- GĐ126 — 🔮 "Mai tiệm có gì"
- GĐ127 — Sổ kinh doanh Quán nước (đóng vòng phản hồi 25M)
- GĐ128 — 📈 "Quảng cáo có đáng không" (ROI)
- GĐ129 — 🎫 "Thẻ tích điểm có đáng không"
- GĐ130 — 🌞 "Giờ vàng hôm nay có đáng không"
- GĐ131 — 📦 "Hết hàng còn bỏ lỡ bao nhiêu"
- GĐ132 — 🧭 "Sắp mở khóa" cho người chơi MỚI
- GĐ133 — 🥀 "Đêm qua hỏng hàng bao nhiêu"
- GĐ134 — 🧊 "Tủ lạnh kho đầy"
- GĐ135 — 🧺 "Chợ phiên đầu ngõ" (slice 1 Gánh hàng rong)
- GĐ136 — 🧺 "Bán chợ phiên" (hoàn thiện Gánh hàng rong)
- GĐ137 — 🧺 "Chợ phiên ngày mai" (mồi cuối ngày)
- GĐ138 — 🧺 "Chợ phiên hôm nay" (tổng kết cuối ngày)
- GĐ139 — 🌳 "Chuẩn bị tái sinh" (dự phóng NG+)
- GĐ140 — 🌱 "Mục tiêu vòng tái sinh"
- GĐ141 — 💸 "Người này đáng đồng lương không?" (ca ngày)
- GĐ142 — 🏪 "Tiện lợi đáng đồng lương?"
- GĐ143 — 🤝 "Mối nào rẻ THẬT"
- GĐ144 — 🌙 "Ca đêm ai xứng đồng lương?"
- GĐ145 — 🍳 "Nấu món nào xứng cho trạm"
- GĐ146 — "🌱 Trồng giống nào, nuôi con nào đáng?"
- GĐ147 — "🧑🍳 Nấu hay bán lẻ nông sản nhà trồng/nuôi?"
- GĐ148 — ⭐ "Danh tiếng đáng bao nhiêu khách?"
- GĐ149 — 🔪 "Quầy thịt cá có người bán không?"
- GĐ150 — 💳 "Ghi sổ đang khóa bao nhiêu tiền, ai sắp quỵt?"
- GĐ151 — 🤝 "Hợp đồng này có đáng ký?" (ROI)
- GĐ152 — 🏪 "Chi nhánh 24/7 hôm nay lời hay lỗ sau điện?"
- GĐ153 — 🧮 Gọi đúng tên số dư chi nhánh (chưa phân bổ giá vốn)
- GĐ154 — 📉 Xu hướng cơ sở
- GĐ155 — 🚪 Chi nhánh bỏ lỡ bao nhiêu tiền mỗi tối
- GĐ156 — 🏗️ Mở rộng thì tiền nhà tăng bao nhiêu
- GĐ157 — 🐱 Thú cưng đáng bữa cơm không
- GĐ158 — 🛝 Sân chơi
- GĐ159 — 🔍 Đóng nốt 4 hộp mờ nhẹ (hụi · phản công · MXH · máy bán hàng)
- GĐ160 — 🌱 Người mới
- GĐ161 — 🍳 Kịch bản nấu theo giờ
- GĐ162 — 🗓️ Dải Kế hoạch hôm nay trên HUD
- GĐ163 — 🤝 Đợt nhờ khách quen rơi vào khung vắng
- GĐ164 — 📖 Sự kiện bất ngờ thành chuyện kể (mini-arc)
- GĐ165 — 🎲 Bổ sung 5 sự kiện một-phát cấp thấp
- GĐ166 — 🧹 Đồng bộ hoá thẻ GĐ131–165 (Callout + bảng màu)
- GĐ167 — 🧹 Nốt vụn màu + thẻ BusinessPanel
- GĐ168 — 🗺️ Nạp lại Phía trước cho cấp 30+
- GĐ169 — 🎯 Nhịp tuần/tháng sống mãi (bó ratchet + XP chuỗi)
- GĐ170 — ⚔️ Rival có kết (Chương 13 Siêu Thị Sao Mai) + sửa rival qua NG+
- GĐ171 — 🎯 NG+ mục tiêu vòng co giãn theo vòng + mục tiêu rival trong vòng (danh hiệu)
- GĐ172 — 🧱 Kit prop GLB sinh bằng script (học pipeline Xóm Nông Trại)
- GĐ173 — 💰 Juice bán hàng
- GĐ174 — 📦 Tách chunk vendor (manualChunks)
- GĐ175 — 🛡️ Guard mất ngữ cảnh render
- GĐ176 — 🎨 Blender 5.2 vào pipeline
- GĐ177 — 🏮 Đầu ngõ lên đèn
- GĐ178 — 🎨 Gộp họ xanh dương hướng dẫn/chuỗi/biểu đồ về info #3498db
- GĐ179 — 🪧 Biển treo mở/đóng cửa
- GĐ180 — 💡 Đèn báo "khách đang đợi" trước hiên (tái dùng world state `waiting`, không thêm sim)
- GĐ181 — 🛒 Chợ phiên sống
- GĐ182 — 🧺 Chợ phiên thành nhịp gameplay
- GĐ183 — 🧹 Đóng nợ UI cuối
- GĐ184 — 🚧 Nâng hiệu ứng sửa đường lên 3D
- GĐ185 — 🏠 Cơ ngơi lên đèn
- GĐ186 — 🚨 Đèn báo khách đợi thêm mức KHẨN "sắp mất khách"
- GĐ187 — 🍵 Quán nước lên đèn
- GĐ188 — 🧑‍🤝‍🧑 Quán nước "người thứ N đáng đồng lương?"
- GĐ189 — 📒 Quán nước thành việc sáng
- GĐ190 — 🧃 Thanh nạp kho quán nước
- GĐ199 — 🔗 Rốn kho chung
- GĐ200 — ⏳ Kho chung nuôi quán nước mấy ngày
- GĐ201 — 🏪 Nạp đúng thứ cho chi nhánh
- GĐ202 — 🧾 Phiếu nạp kho
- GĐ203 — 🎯 Nạp kho một chạm
- GĐ204 — 🔗 Nối phiếu vào OrderPanel: thấy cả mạng lưới cần nhập/chở (rốn kho chung)
- GĐ205 — ➕ Điền kệ chi nhánh vào giỏ: phiếu nạp kho thành hành động
- GĐ206 — 🚚 Auto chuyển kho: chủ bật tự chở khi kệ vơi (trả phí xăng/chuyến, không cần nhân viên)
- GĐ207 — 🎛️ Auto chuyển kho chỉnh ngưỡng/hẹn giờ (autoHaulCfg clamp)
- GĐ208 — 🥤 Quán nước soi độ đủ đồ uống theo đêm (còn mấy đêm, nên chở không)
- GĐ209 — ➕ Nạp đồ uống quán nước một-chạm (chở đồ uống về kho đủ tối nay)
- GĐ210 — ✅ QA toàn diện + phủ test (reputation/wholesale/adviceMore)
- GĐ211 — 🛺 Bán sỉ có đáng không? soi từng món (giá sỉ vs giá lẻ giảm cận hạn / độ ứ kho)
- GĐ212 — 💰 Cận hạn đáng bao nhiêu? tiền rủi ro hỏng đêm nay (giá trị lô cận hạn sau giảm giá)
- GĐ213 — 🪙 Kho chôn bao nhiêu vốn? vốn đóng băng theo giá nhập + trị giá bán lẻ
- GĐ214 — 🪙 Tối nay có đáy không? cân đối thanh khoản (tiền + bán hết kho) vs nợ gốc vay
- GĐ215 — 📞 Đơn gọi nhà lời ròng bao nhiêu? trừ giá vốn (đơn nấu theo số mẻ nguyên liệu)
- GĐ216 — 💸 Đội lương cần ~N lượt khách tự nuôi? (wageCoverage: hòa vốn lương vs lượt hôm nay)
- GĐ217 — 🏦 Lãi vay ngốn bao nhiêu % doanh thu hôm nay? (loanBurden + lãi tiết kiệm mỗi 1 triệu trả bớt)
- GĐ218 — 📈 Lời 30 ngày bao nhiêu, món nào gánh gần hết? (profitMix: tổng lời + rủi ro tập trung + món âm)
- GĐ219 — 🧾 Tiền mặt đủ trả lương cuối ngày chưa? (payrollRunway: thiếu bao nhiêu + đủ mấy ngày lương)
- GĐ220 — ✅ QA TOÀN DIỆN mỗi 10 GĐ: test:coverage (branch 87%) + QA browser 2 cỡ màn + sim đa cấp xanh
- GĐ221 — 🛒 Lô chợ phiên đáng múc không? (fairLotValue: lời so lẻ + món bán nhanh/dữ chôn vốn)
- GĐ222 — 🏭 Bao giờ nên nâng kho? (warehouseUpgradeValue: %thùng/%lạnh + giá trị tràn lạnh + giá vs tiền)
- GĐ223 — 🎓 Đào tạo nhân viên đáng không? (trainValue: mức tăng giá trị/ngày + số ngày hoà vốn)
- GĐ224 — 🔥 Mỗi ngày gầm bao nhiêu tiền cố định? (dailyBurn: lương+thuê+lãi vay+hụi vs doanh thu bình quân)
- GĐ225 — 🥊 Đối thủ hút mất bao nhiêu khách/ngày? (rivalDrag: % khách mất → tiền/ngày)
- GĐ245 — 🎉 Dịp lễ ra bao nhiêu khách/tiền? (festivalValue: đang diễn ra + sắp tới, món hot, giá nhập)
- GĐ246 — 🧍 Nhân viên rảnh bao nhiêu % ca? (staffIdle: agent đếm làm/rảnh, soi từng người bảng Nhân viên)
- GĐ247 — ⏳ Trữ lễ một chạm (festivalRestock: phiếu trữ lễ thẳng vào giỏ Nhập hàng, đúng mẫu phiếu nạp kho)
- GĐ248 — 🧍 Tổng kết đội cuối ngày (staffDayRecap: dư người vs lệch ca, gợi ý xếp ca mai)
- GĐ249 — ⏳ Trữ lễ thành việc sáng (festivalPrepAction: vào danh sách việc hôm nay, danger khi sát lễ)
- GĐ250 — ✅ QA TOÀN DIỆN: coverage branch 87.14%/fn 75.59%, vá test 3 helper yếu; QA mắt hoãn (không có server)
- GĐ251 — 💲 Giá dịp lễ (suggestPrice/priceForecast theo tolerance: trần tăng nới rộng, bớt bảo hạ giá; bảng giá nói rõ khách lễ chịu giá)
