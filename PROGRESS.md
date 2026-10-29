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

- **2240/2240 test pass (220 files) + coverage branch 87.40%/fn 76.17%** · build sạch · boot @5173 200. Nhánh: `phat-trien-game-tu-do`. Đã xong GĐ1–GĐ275. QA TOÀN DIỆN GĐ270: 34 panel + 0 tràn @320/390/768.
- Bức tranh tổng: các nhịp giữ chân (ngày/tuần/cuối tuần/tháng/mùa/năm/NG+) bão hòa; UI responsive audit kỹ; trục "giá trị vs chi phí" soi kín; 3D chỉ khi kèm gameplay.
- Backup trước GĐ1: GAME_TU_DO_backup_2026-10-26.tar.gz (thư mục người dùng).

### Giai đoạn gần đây · GĐ266–270 (chi tiết GĐ cũ: docs/progress-archive/ — GĐ230–249: PROGRESS-GD230-249.md · GĐ250–269: PROGRESS-GD250-257.md)

- **GĐ177–261** đã dồn archive (docs/progress-archive/): 3D + đèn (177–198) · supply chain (199–209) · bộ soi tiền/vốn (210–229) · PROGRESS-GD230-249.md · PROGRESS-GD250-257.md (gồm phụ lục 258–261).
- **GĐ251 giá dịp lễ** 💲 — suggestPrice/priceForecast theo tolerance của dịp lễ (THUẦN ĐỌC). Chi tiết: archive.
- **GĐ252 vai hiện diện + sửa OrderPanel vỡ** 🧍 — thu ngân/bảo vệ/chăm khách khỏi bảng rảnh; sửa TDZ vỡ OrderPanel. Chi tiết: archive.
- **GĐ253 xếp lại ca mai một chạm** 🔀 — nút trên thẻ recap cuối ngày chạy setShift (staffShiftFix). Chi tiết: archive.
- **GĐ254–257 nhịp CUỐI TUẦN** 📅 khép trọn 4 mạch: weekdayOf/isWeekend (ngày 1 = Thứ 2) + quest "🍬 Cuối tuần ăn vặt" (chỉ pool Thứ 7/CN, cuối pool — ngày thường xoay GIỮ NGUYÊN) → khách thèm ăn vặt (chooseWants ×0.2, list chung WEEKEND_SNACKS) → lịch tô sáng cuối tuần → việc sáng + "Mai tiệm có gì" nhắc. Chi tiết: archive. Cảm hứng Hay Day/Stardew; không đổi lượng khách, chỉ đổi nhiệm vụ + NMU trong ngày.
- **GĐ258–261** 🎨🖼️ — gọn 6 họ màu cũ về bảng GĐ166 · coverage sweep (credit/services/professions, xoá 6 id chết `likes` nghề) · QA TOÀN DIỆN (34 panel × 3 cỡ màn 0 lỗi/0 tràn, autoplay 2 ngày sạch) · quét thẩm mỹ ảnh chụp: wrap hàng nút Nhân viên @390, tương phản ô cuối tuần, 2 dropdown Sổ tay Tiệm cắt chữ @390. Chi tiết: archive PROGRESS-GD250-257.md (phụ lục 258–261).

- **GĐ266–269** 🍬🎲 — nhập hàng biết cuối tuần (×1.25 nhóm ăn vặt + badge) · đơn `weekendOnly` (hoc_nhom chốt Thứ 7/CN) · sửa 2 bug roll tương quan (8 đơn = 0 lượt, sự kiện lệch 2.7×) · phản hồi cuối tuần trong tổng kết. Chi tiết: archive (phụ lục 2).
- **GĐ270 QA TOÀN DIỆN** ✅: coverage branch **87.40%**/fn **76.17%** (2229 test, 219 file, ↑ từ 87.17/75.59); browser: 34 panel render @desktop 0 lỗi console, **0 tràn ngang** @320/390/768 qua 12 bảng dày nhất + HUD; autoplay ngày thật sạch (108 khách, ~2.43tr doanh thu). Người mới: hệ thứ/cuối tuần tự dạy qua quest + HUD + lịch (QA từng mắt xích GĐ254–268). GĐ262–269 dồn archive (phụ lục 2).

- **GĐ271 lý do gọi khớp thời tiết** 📞: trước đây random cả "trời mưa..." trong ngày nắng → pool theo ngữ cảnh (mưa/nắng/chung; VIP + nấu giữ pool riêng); salt chọn biến thiên theo ngày (mẫu GĐ267/269). Audit nốt visitsToday/arcSceneAt — sạch. 2 test (sweep >200 đơn × 4 thời tiết); 2231 test xanh.

- **GĐ272 quét 2 bề mặt cuối** 🖼️: màn đăng nhập + menu "Thêm" @320/390/768 (ảnh + DOM) — 0 lỗi: nút full-bề-rộng, lưới 2 cột cuộn tốt, Chương 1 đè menu đúng z-order. Chuỗi "rà soát toàn bộ màn hình" chốt — mọi bề mặt đã soi (GĐ264/265/272). Không đổi code.

- **GĐ273 dự báo tuần mai** 🔮: audit trending + weeklyChallenge (sạch); Nhập hàng tối CN thêm "🔮 Tuần mai: X, Y" (đúng ranh giới khối). 2 test biên; 2233 test xanh.

- **GĐ274 mồi tuần mới tối CN** 🔮: "Mai tiệm có gì" tối CN thêm "🔥 Tuần mới khách săn: X, Y" (khớp GĐ273). 2 test; 2235 test xanh.

- **GĐ275 lịch tự động chỉnh giờ mở cửa** ⏰: giải tension GĐ160 (lịch 8h lỡ nửa đầu giờ vàng 6h–8h30) — `autoOpenAt` (mặc định 8h, save cũ tự bù, không cần MIGRATIONS; vào whitelist snapshot) + `AUTO_OPEN_PRESETS` [8h/7h30/7h/6h30/6h]; `planRoutine` mở theo `autoOpenAt`, ra tiệm trước 1h (floor 5h); menu hồ sơ: Tắt → Bật, đang bật bấm tiếp xoay vòng giờ (mỗi mốc một notify). 5 test routine; 2240 test xanh; QA @5173: label "mở 8h", bấm 3 lần → 390 đúng mốc, boot sạch.

## Quy ước kỹ thuật cần nhớ

- Thay đổi "soi sáng" (helper thuần đọc + thẻ UI gọn) là mẫu mặc định — **không đổi SAVE_VERSION/kinh tế/persist** trừ khi bắt buộc.
- **Bảng màu ngữ cảnh UI (GĐ166 — KHÔNG tự chế màu mới):** accent vàng `#f1c40f` · lời `#2ecc71` · lỗ/mất-thật `#e74c3c` · cảnh báo `#e67e22` · info `#3498db` · sự kiện `#9b59b6`; chip = nền rgba cùng màu chữ. Bậc cảnh báo: đỏ = mất tiền thật, cam = cảnh báo nên xử lý, vàng = theo dõi/đang tốt. (GĐ167: grep 6 màu lệch = 0; GĐ178: họ banner guide xanh dương đã gộp về info `#3498db` — toàn bộ src/ui chỉ còn các màu ngữ cảnh + họ buy-tone được duyệt.) **GĐ258 quét lại toàn bộ src/ui: chuẩn hoá 6 màu cũ còn sót trước GĐ166 về bảng duyệt** — `#e17055`→`#e67e22`, `#fdcb6e`→`#f1c40f`, `#00b894`→`#2ecc71`, `#d63031`→`#e74c3c`, `#ff8a7a`/`#ff8f7a`→`#ff7675` (buy-tone), `#c0392b` StaffPanel→`#e74c3c`; grep còn 0 (trừ màu NHẬN DIỆN được giữ: ArrangePanel màu loại đồ, GardenPanel họ riêng GĐ178, art SVG login/BuildPanel).
- **Thẻ nhấn mạnh dùng `Callout` (shared.tsx, GĐ166):** borderLeft 3px màu ngữ cảnh, tiêu đề 13px màu tone (`styles.cardTitle`), thân 12px; `strong` + danger → nền đỏ nhạt. Thẻ mới KHÔNG tự vẽ viền/tint riêng. HUD chip/alert dùng class CSS riêng (mẫu GĐ162).
- **Pipeline Blender (GĐ172–176):** script nguồn trong `scripts/` + G LB trong `public/models/kit/` được commit để dựng lại; chạy headless `blender -b -P scripts/blender_kit_atlas.py`; xuất Draco; lazy-load trong code (`kitProps.ts`), fallback warn khi load lỗi; prop chỉ hình ảnh KHÔNG chặn lưới điều hướng. Dung lượng: kit 7 prop (baked: `chau_cay`/`thung_go`/`khom_tre`/`bon_nuoc`/`cho_nhua`/`xe_day`/`rao_chan`) ~76KB baked tổng. Ngân sách: cap tris trong `build-kit-assets.ts`. KHÔNG commit file .blend nặng. 3D Artist giữ thư mục script/tài sản; Developer chỉ tích hợp.
- Test sim dùng **seed cố định** (`setSimSeed`/`simRng()` — GĐ27/28), không mock `Math.random`.
- **Hạ tầng test:** sim seed TẤT ĐỊNH — logic qua `simRng()`, không Math.random/Date.now (chỉ hình ảnh 3D còn). `simGolden.test.ts` bắt tất định vỡ + lệch ±5% — đổi kinh tế CÓ CHỦ Ý thì chép số vào `GOLDEN` + ghi lý do. `test:coverage` mỗi ~10 GĐ (ưu tiên core/data/agents/save). `saveStore`/`staffAgent` đã mutation-check.
- QA live trên `localhost:5173`; kiểm 0 tràn ngang @320/390 (`scrollWidth == clientWidth`), 0 lỗi console.
- Nhiều phiên song song trên cùng worktree → commit theo đường dẫn.

## Quyết định lớn đã chốt

- Thứ tự ưu tiên giữ chân: vòng ngày → dẫn đường người mới → nhịp tuần → endgame/rival → hạ tầng server.
- NG+ (GĐ14) chỉ làm sau khi có quán thứ hai; giữ bộ sưu tập, chỉ bonus doanh thu (tối đa +48%), chặn khi hẻm online.
- Vé tha thứ streak: tối đa 1 lần/7 ngày, cần chuỗi ≥3. Thử thách tuần tích vào sổ tuần.
- Sau GĐ83: ưu tiên chiều sâu UI/UX trước mở rộng hệ mới. Định hướng hiện tại: **chiều sâu-trước**.
- Kèo hôm nay bám bộ "việc chính" (GĐ107); thưởng nhiệm vụ có trần theo lãi bình quân (GĐ106); người mới không bị trần (GĐ114).
- Khách treo câu hỏi quầy tự chốt theo giây thực (30s → 😕, 45s tự chốt — GĐ122); sim có seed đếm theo tick.
- Lương trong số dư chi nhánh KHÔNG áp good_boss −10% (bảo thủ, trung thực).
- 3D: Tài sản 3D mới đều qua pipeline Blender (không dựng tạm khối nguyên thủy khi Blender làm đẹp hơn), làm chậm/lười để không chặn lần tải đầu.
- Họ màu hướng dẫn/chuỗi/biểu đồ: gộp về một sắc info `#3498db` (GĐ178); ngoại lệ duy nhất: buy-tone `#55efc4`/`#ff7675`; GardenPanel giữ họ riêng. GĐ258 quét nốt 6 màu cũ — src/ui chỉ còn bảng duyệt + màu nhận diện.

## Cần theo dõi / nợ mở

- QA mắt 3D/panel chập tối (IAB nền dừng rAF): GĐ177–194 đã QA @5173 lúc làm; đối chiếu lại thì xem archive.
- ✅ ĐÃ ĐÓNG (29/10) flake `weeklyGoalCap`: bot bày lại tầng kệ đầy → bỏ qua tầng đầy + timeout 1.8tr ms. Nếu cả bộ lại > ~10 phút: profile trước khi làm tiếp.
- GĐ171: scale mục tiêu vòng NG+ — cần save thật vòng 2+ để xác nhận; nếu quá dễ → siết trần.
- (GĐ110/117) Mục tiêu nhiệm vụ & kèo cấp 50+: sim bot hụt ~40% nhưng browser thật cho thấy trong năng lực → theo dõi.
- QA mắt trạng thái CÓ dữ liệu Bỏ lỡ/Thú cưng/hụi/khủng hoảng (GĐ155–159) — bọc bởi test; cần save người thật.


## Backlog tiếp theo

1. **Trục đã cạn:** 3D trang trí (chỉ làm 3D mới khi đi kèm gameplay — GĐ172–198) · multi-shop supply chain (GĐ199–209, khép mạch) · bộ soi tiền/vốn (GĐ210–251) · UI nợ (GĐ183/258) · chợ phiên (GĐ182).
2. **Khoá chờ save người thật:** arc E (4 arc A–D xác minh trước) · NG+ vòng (GĐ171) · kèo cấp 50+ (GĐ110/117) · nhiệm vụ ngày 1–5 (GĐ254 đã giảm lặp).
3. **Ý tưởng chờ Leader duyệt (chiều sâu, chưa làm):** (a) nhịp cuối tuần đậm hơn khi hệ đã ổn trên save thật (hàng đặc biệt ngày phiên chợ; không vội); (b) nhiệm vụ tuần/tháng biết đến thứ trong tuần (WeeklyPace hiện "còn X ngày tới Chủ nhật") — nhỏ, chỉ khi có việc khác đi kèm.

## Mục lục giai đoạn đã xong (chi tiết trong archive)## Mục lục giai đoạn đã xong (chi tiết trong archive)

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
- GĐ252 — 🧍 Vai hiện diện (thu ngân/bảo vệ/chăm khách) khỏi bảng rảnh + sửa OrderPanel vỡ TDZ phiếu trữ lễ
- GĐ253 — 🔀 Xếp lại ca mai một chạm (staffShiftFix: bớt/dồn ca theo %rảnh + giờ đông, nút trên thẻ recap)
- GĐ254 — 📅 Biến thể cuối tuần (weekdayOf/isWeekend + quest "Cuối tuần ăn vặt" Thứ 7/CN, HUD hiện thứ)
- GĐ255 — 🍬 Cuối tuần thành nhịp thật (chooseWants ưu tiên nhóm ăn vặt Thứ 7/CN, list chung với quest)
- GĐ256 — 🗓️ Lịch cả năm hiện cuối tuần (ô Thứ 7/CN nền sáng, tooltip có thứ, gameDayOfDoy)
- GĐ257 — ☀️ Cuối tuần thành việc sáng (Sổ đầu ngày nhắc châm kệ ăn vặt Thứ 7/CN, tiêu đề có thứ)
- GĐ258 — 🎨 Gọn 6 họ màu cũ còn sót về bảng duyệt GĐ166 (e17055/fdcb6e/00b894/d63031/ff8a7a/c0392b)
- GĐ259 — 🧪 Coverage sweep: test credit/services/professions + xoá 6 id chết trong likes nghề
- GĐ260 — ✅ QA TOÀN DIỆN: 34 panel × 3 cỡ màn 0 tràn/0 lỗi, autoplay ngày thật, coverage 87.17/75.75
- GĐ261 — 🔮 Mồi cuối tuần tối thứ Sáu (Mai tiệm có gì nhắc châm kệ ăn vặt khi mai Thứ 7/CN)
- GĐ262–265 — 📅🎨 Thẻ tuần biết thứ · khoá tuần×thứ · 2 đợt quét thẩm mỹ (chi tiết archive)
- GĐ266–269 — 🍬🎲 Cuối tuần vào nhập hàng/đơn gọi + phản hồi tổng kết · sửa 2 bug roll tương quan (chi tiết archive)
- GĐ270 — ✅ QA TOÀN DIỆN: 34 panel + 0 tràn @320/390/768, autoplay sạch, coverage 87.40/76.17
- GĐ271 — 📞 Lý do gọi điện khớp thời tiết (pool theo ngữ cảnh + salt biến thiên; audit nốt các hệ tất định)
- GĐ272 — 🖼️ Quét đăng nhập + menu Thêm @320/390/768 — 0 lỗi, chốt chuỗi rà soát màn hình
- GĐ273 — 🔮 Dự báo "tuần mai khách săn" trên Nhập hàng tối CN + audit trending/weeklyChallenge
- GĐ274 — 🔮 Mồi tuần mới tối CN trong Mai tiệm có gì (khớp GĐ273)
- GĐ275 — ⏰ Lịch tự động chỉnh giờ mở cửa 6h–8h (autoOpenAt + xoay vòng preset trong menu hồ sơ)
