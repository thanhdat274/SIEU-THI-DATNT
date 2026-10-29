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

**Phong cách hình ảnh (2D + 3D):** low-poly 3D màu ấm, UI nền tím-than (#3a3a4d) accent vàng (#f1c40f), icon emoji nhất quán, tiếng Việt đời thường. Tài sản 3D thủ công bằng Blender (low-poly stylized cùng bảng màu, theo mục "TÀI SẢN 3D VỚI BLENDER" trong promt_game.txt). Bảng màu/biểu mẫu tập trung ở `src/ui/controls.css` + `src/ui/panels/shared.tsx`.

## Trạng thái hiện tại (29/10/2026)

- **1786/1787 test pass (158 files)** · build sạch (chỉ cảnh báo bundle-size có sẵn) · game chạy ổn định. Nhánh làm việc: `phat-trien-game-tu-do`. Đã xong GĐ1–GĐ178. (Sim nặng `weeklyGoalCap` cấp 50 timeout trong lần full do tranh CPU khi chạy Blender/browser; re-run isolated 16/16 xanh)
- Bức tranh tổng: các nhịp giữ chân (ngày/tuần/tháng/mùa/năm/NG+) bão hòa; UI responsive đa thiết bị audit kỹ (GĐ85–104, 116, 166–167); trục "giá trị vs chi phí" soi kín gần hết tài sản (GĐ141–153); loạt "học từ Xóm Nông Trại" đã hoàn (GĐ172–176: kit prop GLB + coin-pop juice + tách chunk vendor + guard render + Blender 5.2 pipeline Draco). NG+ có mục tiêu vòng co giãn theo vòng + mục tiêu rival trong vòng (GĐ171).
- Backup source trước GĐ1 (trước khi có git): `C:\Users\Admin\GAME_TU_DO_backup_2026-10-26.tar.gz`.

### Giai đoạn gần đây · GĐ168–178 (chi tiết: docs/progress-archive/PROGRESS-GD154-180.md)

- **GĐ168** 🗺️ Nạp lại "Phía trước" cho cấp 30+ (SYSTEM_UNLOCKS 10 mốc thật: đất 16/24, Mini mart 30, chương 40/55/75, siêu thị 45/58/75, Tái sinh 60; mốc cuối 75; RoadmapPanel "hệ"→"mục", badge HUD sống lại).
- **GĐ169** 🎯 Nhịp tuần/tháng sống mãi: bó ratchet mục tiêu (trần doanh thu kỳ ×1.15) + thưởng chuỗi đổi XP (≥3 tuần +35% xpToNext). Sim seed 169: goal spike về tầm với, XP/cấp ổn.
- **GĐ170** ⚔️ Rival có kết: chương 13 "Siêu Thị Sao Mai" (rivalsBeaten≥12, thưởng 5M+3000XP 1 lần); gen 13+ tên "(cơ sở 2/3)"; sửa rival qua NG+ (reset rival+rivalsBeaten, cổng đời mới prestige.level>0).
- **GĐ171** 🎯 NG+ mục tiêu vòng co giãn theo vòng + rival trong vòng: target ×(1+0.5(N−1)) trần 3, reward ×(1+0.3(N−1)) trần 2.5 (runtime, save 0 đổi); mục tiêu "⚔️ Hạ 3 đối thủ trong vòng"; danh hiệu `chu_hem_lao_lang` 🧭 khi muốn mọi mục tiêu vòng. NgGoalsCard dòng scale. Full 1783/1783.
- **GĐ172** 🧱 Kit prop GLB sinh bằng script: 6 prop hẻm Việt (chậu cây/thùng gỗ/khóm tre/bồn nước/ghế nhựa/gánh hàng) 3.7k tris ~550KB; loader `kitProps.ts` lazy + fallback warn; 14 placement không chặn lưới. (học Xóm Nông Trại)
- **GĐ173** 💰 Coin-pop juice: sprite "+Xđ" bay 1.4s tại quầy sau checkout, pool 10 — phản hồi tiền đã tay.
- **GĐ174** 📦 Tách chunk vendor (manualChunks: vendor-react/three/data/misc) — cache trình duyệt khỏi xả.
- **GĐ175** 🛡️ Guard mất ngữ cảnh render (webglcontextlost / device.lost → toast + mời F5, chống spam 8s).
- **GĐ176** 🎨 Blender 5.2 pipeline: `blender_kit_atlas.py` (import → gộp → Smart UV → bake EMIT atlas tùy chọn → Draco level 6 + preview). Kit 550KB→68.6KB. DRACOLoader ở `public/decoders/draco/`. Quy ước: `--no-bake` chuẩn cho prop màu phẳng.
- **GĐ177** 🏮 "Đầu ngõ lên đèn": đèn lồng cột dựng Blender (`scripts/blender_lantern.py`, 16KB Draco) đặt bên cửa tiệm (5.9,0,2.1); nguồn sáng ấm #ffb35c qua quỹ ánh sáng (lightBudget) bật chập tối (lamp 17h–5h30); lõi phát sáng tắt hẳn ban ngày. Chrome: lazy GLB + fallback thủ tục + không chặn lưới (boxes rỗng — convention kit GĐ172). QA @5173: loaded=true, glow 2.6 đêm / 0 trưa; QA bắt 1 bug (GLB emissive mặc định cháy sáng cả ngày) → đã sửa điều khiển theo giờ. `storefrontLantern.ts`, `world.ts`, `main.tsx`, test 4.
- **GĐ178** 🎨 Gộp họ xanh dương hướng dẫn/chuỗi/biểu đồ (`#0984e3`/`#74b9ff`/`#2e86de` + tint `rgba(9,132,227,…)`) về đúng info `#3498db` ở OrderPanel/ReportPanels/ContractsPanel/PricePanel (16 chỗ). Giữ họ buy-tone `#55efc4`/`#ff7675` (ngoại lệ được duyệt GĐ166). "Quyết định lớn": họ banner guide = một sắc info duy nhất, không bảng riêng (đóng nợ GĐ167). GardenPanel giữ họ "system card" của nó — không churn. tsc + build sạch, reload @5175 game nạp ổn, grep 0-màu-cũ/16-màu-mới.

### Giai đoạn gần đây · GĐ159–167 (chi tiết: docs/progress-archive/PROGRESS-GD154-180.md)

- **GĐ159** 🔍 Đóng 4 hộp mờ nhẹ: hụi (đã góp/ngày), phản công, khủng hoảng MXH (còn N ngày), máy bán hàng (hoàn vốn) — `minorPayoff.ts`, mọi số ước đều "~".
- **GĐ160** 🌱 Người mới vá ngày đầu + nhiệm vụ tuỳ chọn cấp 1 (NEWBIE_REVENUE_TARGET 100k, khoá Ra trại cấp 8, 3 quest: sớm hôm/bán đồ mưa/đón khách quen).
- **GĐ161** 🍳 Kịch bản nấu theo giờ (`cookSchedule.ts`): nấu kịp giờ vàng / chuẩn bị tối là quyết định thời điểm (học Hay Day).
- **GĐ162** 🗓️ Dải "Kế hoạch hôm nay" trên HUD: 6 nguồn hẹn giờ gom 1 bề mặt, chip đầu viền vàng, mobile scroll ẩn.
- **GĐ163** 🤝 Đợt nhờ khách quen rơi vào khung vắng (`errandWindow` = khung ghé ∩ khung vắng, thuần đọc, 0 đụng core).
- **GĐ164** 📖 Sự kiện bất ngờ thành mini-arc 2–3 ngày (4 arc A–D, `surpriseArcs.ts` + `surpriseArc?`/`surpriseArcsTold?` state tuỳ chọn).
- **GĐ165** 🎲 5 sự kiện một-phát cấp thấp (chuot_kho/tre_dau_cau/ban_ghe_hong/mat_dien_trua/xe_khach_do).
- **GĐ166** 🧹 Đồng bộ thẻ GĐ131–165: component `Callout` (6 tone) chuyển 22/22 thẻ, bảng màu ngữ cảnh chuẩn hoá, button:disabled có tín hiệu.
- **GĐ167** 🧹 Chuyển 5 thẻ BusinessPanel sang Callout + quét 6 màu lệch bảng toàn src/ui = 0.

## Quy ước kỹ thuật cần nhớ

- Thay đổi "soi sáng" (helper thuần đọc trong `src/data/*.ts` + một thẻ UI gọn) là mẫu mặc định — **không đổi SAVE_VERSION/kinh tế/persist** trừ khi bắt buộc.
- **Bảng màu ngữ cảnh UI (GĐ166 — KHÔNG tự chế màu mới):** accent vàng `#f1c40f` · lời `#2ecc71` · lỗ/mất-thật `#e74c3c` · cảnh báo `#e67e22` · info `#3498db` · sự kiện `#9b59b6`; chip = nền rgba cùng màu chữ. Bậc cảnh báo: đỏ = mất tiền thật, cam = cảnh báo nên xử lý, vàng = theo dõi/đang tốt. (GĐ167: grep 6 màu lệch = 0; GĐ178: họ banner guide xanh dương đã gộp về info `#3498db` — toàn bộ src/ui chỉ còn các màu ngữ cảnh + họ buy-tone được duyệt.)
- **Thẻ nhấn mạnh dùng `Callout` (shared.tsx, GĐ166):** borderLeft 3px màu ngữ cảnh, tiêu đề 13px màu tone (`styles.cardTitle`), thân 12px; `strong` + danger → nền đỏ nhạt. Thẻ mới KHÔNG tự vẽ viền/tint riêng. HUD chip/alert dùng class CSS riêng (mẫu GĐ162).
- **Pipeline Blender (GĐ172–176):** script nguồn trong `scripts/` + G LB trong `public/models/kit/` được commit để dựng lại; chạy headless `blender -b -P scripts/blender_kit_atlas.py`; xuất Draco; lazy-load trong code (`kitProps.ts`), fallback warn khi load lỗi; prop chỉ hình ảnh KHÔNG chặn lưới điều hướng. Dung lượng: kit 6 prop 68.6KB. Ngân sách: cap tris trong `build-kit-assets.ts`. KHÔNG commit file .blend nặng. 3D Artist giữ thư mục script/tài sản; Developer chỉ tích hợp.
- Test sim phải dùng **seed cố định** (`setSimSeed`, `simRng()` trong seam RNG — GĐ27/28) thay vì mock `Math.random`.
- QA live trên `localhost:5173` (vite); kiểm không tràn ngang @320/390 (`scrollWidth == clientWidth`), 0 lỗi console.
- Nhiều phiên có thể chạy song song trên cùng worktree → commit theo đường dẫn cụ thể.

## Quyết định lớn đã chốt

- Thứ tự ưu tiên giữ chân: vòng ngày → dẫn đường người mới → nhịp tuần → endgame/rival → hạ tầng server.
- NG+ (GĐ14) chỉ làm sau khi có quán thứ hai; giữ bộ sưu tập, chỉ bonus doanh thu (tối đa +48%), chặn khi hẻm online.
- Vé tha thứ streak: tối đa 1 lần/7 ngày, cần chuỗi ≥3. Thử thách tuần tích vào sổ tuần.
- Sau GĐ83: ưu tiên chiều sâu UI/UX trước mở rộng hệ mới. Định hướng hiện tại: **chiều sâu-trước**.
- Kèo "Đặt kèo hôm nay" bám bộ "việc chính" (đông khách + bán hàng + doanh thu), không gồm "Khách vui vẻ" (GĐ107); thưởng nhiệm vụ có trần theo lãi bình quân (GĐ106); người chơi mới không bị trần (GĐ114).
- Khách treo câu hỏi quầy tự chốt theo giây thực (30s → 😕, 38s → 😤, 45s tự chốt — GĐ122).
- Lương trong số dư chi nhánh KHÔNG áp good_boss −10% (bảo thủ, trung thực).
- 3D: Tài sản 3D mới đều qua pipeline Blender (không dựng tạm khối nguyên thủy khi Blender làm đẹp hơn), làm chậm/lười để không chặn lần tải đầu.
- Họ màu hướng dẫn/chuỗi/biểu đồ (GĐ178): gộp hết về một sắc info `#3498db`, KHÔNG lập bảng riêng — tránh "màu tự chế" trái GĐ166; giữ ngoại lệ duy nhất họ buy-tone `#55efc4`/`#ff7675`. GardenPanel dùng họ "system card" riêng (cùng mẫu BusinessPanel) nên giữ nguyên, không churn.

## Cần theo dõi / nợ mở

- GĐ177: đèn lồng bật theo `lamp` (17h–5h30) chung toàn cảnh — xác nhận trên save thật vào khung chập tối không chói/gắt (nếu cần, bó thêm theo mưa/mây đậm); cũng nên mở rộng "cảnh ấm" sang bếp/trai khi làm depth tiếp.
- GĐ171: scale mục tiêu vòng ×(1+0.5(N−1))/×(1+0.3(N−1)) — cần save thật vòng 2+ để xác nhận trad vẫn căng nhưng với tới; nếu vẫn quá dễ → siết trần.
- (GĐ110/117) Mục tiêu nhiệm vụ ngày & kèo ở cấp 50+: sim bot hụt ~40% nhưng browser thật cho thấy target ×1.0 vẫn trong năng lực → chưa đổi; theo dõi.
- QA trực quan GĐ155–158 xong trên save máy cấp 46 ngày 1; chưa QA mắt được trạng thái CÓ dữ liệu của Bỏ lỡ/Thú cưng/hụi/khủng hoảng (cần play vài ngày — bọc bởi test). GĐ159 các dòng mới ẩn ngày 1 — QA mắt khi có save có doanh thu.
- Thời gian nhân viên rảnh không ghi ở state nào (chỉ runtime) — muốn soi phải thêm bộ đếm; nợ mở.
- Mỗi lần subagent bị "model concurrency limit" → chạy tuần tự/đợi rồi spawn lại.

## Backlog tiếp theo

1. **Audit trải nghiệm & tiến trình (GĐ168–171) đã xong** ✅ (mid/late-game: roadmap 30+, ratchet tuần/tháng, rival kết, NG+ mục tiêu vòng). Đánh giá lại: vòng ngày & tiến trình đã khai thác sâu; trục mới đáng làm là **trải nghiệm bim bim tài sản 3D + không gian con hẻm** — nối tiếp GĐ172–176.
2. 🏮 **Chiều sâu trải nghiệm 3D / con hẻm sống**: (a) đèn lồng cửa tiệm sáng ấm chập tối ✅ GĐ177. Còn: (b) kit prop có mục đích gameplay (biển mở/đóng cửa, gánh hàng đổi khi chợ phiên); (c) dấu hiệu không lời "khách đang đợi" trước hiên (tái dùng world state, không thêm sim). Làm (b) trước rồi (c) — Blender + lazy load chuẩn GĐ176 + QA 3 góc nhìn.
3. Theo dõi sau GĐ160: nhiệm vụ mới có làm ngày 1–5 bớt lặp không (save người thật); nếu vẫn lặp → thêm biến thể hoàn cảnh (lễ, weekend).
4. GĐ164 theo dõi: arc E "Hàng xóm khai trương" (thay cam_do_mo) — chỉ làm khi 4 arc A–D chạy tốt trên save thật.
5. UI nợ còn: Callout GardenPanel:79 vào Callout (chỉ còn một thẻ); các màu UI còn lại đều là màu ngữ cảnh/họ buy-tone đã duyệt.
6. Tầm nhìn dài hạn: nhiều loại tiệm cung ứng cho nhau (multi-shop supply chain) — chỉ khi audit tiếp vẫn hết chiều sâu.

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
- GĐ71 — "📖 Hồ sơ tiệm + Huy hiệu thâm niên": meta-progression dài hạn
- GĐ72 — "🏪 Tiện lợi 24/7: việc hôm nay": mặt chủ động cho chi nhánh
- GĐ73 — "🌾 Nên hôm nay": chuỗi sản xuất hội tụ (trồng → nấu → quán nước)
- GĐ74 — "🤝 Đối tác chi nhánh × quán nước: Hiệp lực tháng"
- GĐ75 — "🌟 Sự kiện thử thách theo mùa (Seasonal Mini-Event)"
- GĐ76 — "🗓️ Việc hôm nay: một bảng, đúng thứ tự (cảnh báo ép nhịp)"
- GĐ77 — "🛒 Nên hôm nay: cả đêm nay của chi nhánh"
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
- GĐ92b — Menu "Thêm" tràn màn hình hẹp
- GĐ93 — Audit đa thiết bị hệ thống + sửa lớp nền responsive
- GĐ94 — Giảm chiều sâu cuộn panel dày nhất trên mobile
- GĐ95 — Hết lớp tràn ngang còn lại: var padding panel + phân trang Đánh giá
- GĐ96 — Chốt 0 tràn ngang nhìn thấy được
- GĐ97 — QA luồng chơi thật trên mobile 390px sau GĐ93–96
- GĐ98 — Trả 2 nghi thức hằng ngày về dock trên màn ≤480
- GĐ99 — Rút gọn mô tả Sổ nấu trên màn hẹp
- GĐ100b — Prompt chốt deal quầy: border-box toàn HUD
- GĐ101 — Chốt nợ GĐ100b: vệt cuộn "vô hình" BusinessPanel ở 320px
- GĐ102 — QA tương tác chốt deal quầy trên mobile + thế giới dừng khi có câu hỏi
- GĐ103 — Chiều sâu vòng ngày: dự phóng trước khi chốt + Đặt kèo hôm nay
- GĐ104 — Polish UI 3 chỗ (footer Nhập hàng, thẻ kèo, heatmap kệ)
- GĐ105 — Khảo sát kinh tế vòng ngày: mô phỏng 30 ngày cấp 5/10/20
- GĐ106 — Neo thưởng nhiệm vụ vào kinh tế thật (trần theo lãi bình quân)
- GĐ107 — Kèo dễ trúng hơn (bám bộ "việc chính hôm nay")
- GĐ108 — Làm mềm quest "Khách vui vẻ" (`daily_smile`)
- GĐ109 — Kèo không còn hộp đen (thẻ kèo hiện tiến độ sống X/Y)
- GĐ110 — Khảo sát kèo & kinh tế giai đoạn cao (cấp 30/50/80)
- GĐ111 — Sạch chuỗi lời kèo (đổi "trọn bộ" → "việc chính")
- GĐ112 — Khóa bộ kèo trên dịp biến thể
- GĐ113 — Kèo treo từ save cũ: phòng tương thích + round-trip
- GĐ114 — Người chơi MỚI: kèo & trần kinh tế ngày đầu thân thiện
- GĐ115 — QA trực quan thẻ kèo trên trình duyệt thật
- GĐ116 — Audit đa kích thước panel mở rộng trên browser thật
- GĐ117 — Xác minh browser thật target kèo ×1.0 ở cấp 50
- GĐ118 — QA live quest "Khách vui vẻ" + đường "Nhận tất cả" an toàn
- GĐ119 — Dấu hiệu "khách sốt ruột" ở quầy (UI-only)
- GĐ120 — Phản hồi cuối ngày "mất khách vì chờ quầy"
- GĐ121 — Nhịp chạy tuần (Weekly Pace)
- GĐ122 — Khách chờ mặc cả/ghi sổ quá lâu: tự chốt theo giây thực
- GĐ123 — Đưa analytics + kỷ lục vào vòng ngày cho cấp 60+
- GĐ124 — Làm sâu COMBO theo NGÀY: mở khóa quyết định "xoay slot combo"
- GĐ125 — Làm sâu hệ HỢP ĐỒNG: "Sổ chuỗi hợp đồng"
- GĐ126 — 🔮 "Mai tiệm có gì": mồi quay lại ngày mai
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
- GĐ171 — 🎯 NG+ mục tiêu vòng co giãn theo vòng + mục tiêu rival trong vòng (danh hiệu)
- GĐ172 — 🧱 Kit prop GLB sinh bằng script (học pipeline Xóm Nông Trại)
- GĐ173 — 💰 Juice bán hàng: bong bóng tiền bay ở quầy
- GĐ174 — 📦 Tách chunk vendor (manualChunks)
- GĐ175 — 🛡️ Guard mất ngữ cảnh render
- GĐ176 — 🎨 Blender 5.2 vào pipeline: nén Draco + nướng atlas
- GĐ177 — 🏮 Đầu ngõ lên đèn: đèn lồng cột bên cửa tiệm sáng ấm chập tối
- GĐ178 — 🎨 Gộp họ xanh dương hướng dẫn/chuỗi/biểu đồ về info #3498db
