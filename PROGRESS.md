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

## Trạng thái hiện tại (01/11/2026)

- **GĐ703:** sự kiện một ngày ở quán nước — chiều sâu bị chê "MỎNG" từ GĐ413: ⚙️ máy pha hỏng (p 0,06, chỉ khi có thực đơn — số ly món pha bị chặn nửa, phần khách chuyển sang nước chai) · 🛺 xe nước mọc đối diện (p 0,05 — khách −20% hôm đó). endDay truyền simRng cho `quanNuocDay` (tham số tuỳ chọn — không truyền giữ hành vi cũ, projection/test cũ không vỡ); tin sáng mai thêm đuôi sự kiện, `quanNuocLast.event` lưu để panel hiển thị (bản lưu cũ thiếu = không có, không cần migration). UI: QuanNuocPanel thẻ "Hôm qua" ghi rõ sự kiện. Test mới quanNuocEvents 7 test (2 rng cứng + quét 400 seed qua sleep khớp tin ↔ event); mutation-check tắt hệ số xe nước → đỏ → xanh. Cả bộ 297 file / 2801 test xanh (2 lần chạy liên tiếp 317 s / 310 s — VƯỢT nhẹ mốc 300 s, ghi theo dõi: nếu audit GĐ710 vẫn vượt thì trải các file sim nặng sang pool khác). ⚠️ bundle 596,9/597 KB gzip — gần chạm trần, code mới vào main phải tìm chỗ tách bớt (GĐ515).
- **GĐ702:** phủ đường vận chuyển co-op còn lộ (net/coop.ts, covlines GĐ693): thêm 5 test vào coopClient.test.ts (48 test) — server trả lỗi khi vào hẻm → từ chối đúng thông báo + đóng kết nối; rớt TRƯỚC khi vào được → từ chối "Mất kết nối khi vào hẻm."; rớt SAU khi vào được (máy chạy) → thoát session + báo "Mất kết nối hẻm online" + hẹn reload 2,5s (fake timers); REST danh sách hẻm GET có token / join mã hoá + in hoa / lỗi server ném đúng thông báo; mất mạng khi gọi REST → lỗi gợi ý chạy server (mutation-check bỏ throw lỗi REST → đỏ → xanh). Đo thời gian các file sim nặng: economySimL50 127s · L5 76s · economySim 81s solo — wall time full-suite 195–295s là tranh CPU 3 file này, ngân sách ≤5 phút vẫn ĐẠT, không cắt số ngày mô phỏng (giữ giá trị khoá kinh tế). Hồi quy full-suite 3 lần cho GĐ702: lần 1 fail 1 test nhưng log chỉ giữ tail (mất định danh), lần 2-3 xanh đủ 2794/2794 (252 s) — flake ~1/3 lần chạy, chưa bẫy được tên test; 2 run sau đều kèm log đầy đủ, theo dõi tiếp các GĐ sau.
- **GĐ701:** bắt được test flaky (2/5 lần chạy full-suite): `wsHeartbeat.test.ts` nhánh bug cũ — assert `ws.readyState !== OPEN` NGAY sau khi server terminate; dưới tải 8 worker, trạng thái phía client tới muộn một tick → đỏ giả. Sửa gốc: chờ có hạn (poll 10ms × 20) trước khi assert — không che bug (terminatedCount vẫn assert cứng, test 2 vẫn khoá client sống qua ≥6 chu kỳ). 3 lần chạy file xanh liên tiếp.
- **GĐ700:** 🧭 AUDIT 10-GĐ (GĐ691–700) — mọi hàng ngân sách ĐẠT: bundle **596,7/597 KB gzip** (scripts/check-bundle.mjs) · chunk lớn nhất **253,2/255** · cả bộ 296 file / **2789 test xanh** (~260 s ≤5 phút) · HUD trần + thông báo: featureBudget.test 3/3 xanh · save trắng mới (?thu=1): mở cửa ngay, khách vào liên tục, **45 món bán cho 30 khách tới 17h27 ngày 1** (mục tiêu ≤5 phút ✅) · **FPS gfx=low 74,2 có khách** (≥30 ✅) · coverage 57,44% stmt / 89,85% br (GĐ693, ↑). Điểm nhấn chu kỳ GĐ691–700: **covlines GĐ690 → phủ toàn bộ nhánh logic còn lộ** (7 file test mới, 46 test, mutation-check đủ khối chính) — branch.ts từ 46 nhánh lộ về 2 stmt; sales/orders/endDay/biz/online đều có test khoá hành vi thật. Lưu ý QA tooling: evaluate trên IAB phải dùng chuỗi IIFE (() => {...})() — arrow-function string chỉ trả về hàm, không chạy. Prune (Leader + Designer): không gộp/bỏ gì — các trục còn đường đo riêng; nợ refactor ReportPanels/BusinessPanel giữ nguyên điều kiện. PROGRESS 26,1 KB sau khi dồn GĐ691–699.
- **GĐ691–699** (covlines GĐ690 → phủ hết nhánh logic còn lộ: branch.ts còn 2 stmt; 7 file test mới — branchNightPaths 8 · wholesaleSale 6 · ordersPaths 6 · endDayOverdue 5 · bizActions 6 · bizNight 6 · adviceAndOnline 9; mỗi khối chính mutation-check đỏ/xanh; coverage 57,44% stmt / 89,85% br; hồi quy 296 file / **2789 test xanh** ~260 s; 1 test flaky lần chạy GĐ699 — rerun xanh, theo dõi; giữ dev/ws_probe.cjs, bỏ 2 probe scratch) đã dồn archive: docs/progress-archive/PROGRESS-GD691-699.md
- **GĐ690:** 🧭 AUDIT 10-GĐ (GĐ681–690) — mọi hàng ngân sách ĐẠT: bundle 596,7/597 KB · chunk 253/255 · cả bộ 289 file / **2743 test xanh** (~250 s ≤5 phút) · HUD 20 (=trần) · thông báo ngày 1 9/9 · tỉ số 0,99/0,89/0,64 · rò rỉ 0% · FPS gfx=low 69,8→73,4 có khách · PROGRESS 24,4 KB. Save trắng mới: mở cửa trong ~10 s, khách vào ngay giờ vàng, **11 món bán trong ~2 phút** (mục tiêu ≤5 phút ✅). Điểm nhấn chu kỳ GĐ681–690: **fix heartbeat server (GĐ686)** — hẻm online trước đây chết sau ~60 s cho mọi người chơi; sau fix, co-op vòng ngày (GĐ687) và bán hàng đồng bộ 2 máy (GĐ688) chạy trọn vẹn lần đầu. Prune (Leader + Designer): không gộp/bỏ gì — các trục đều còn đường đo riêng; nợ refactor ReportPanels/BusinessPanel giữ nguyên điều kiện "làm khi đụng tính năng". Co-op vòng ngày/bán hàng đã QA đầy đủ — không còn mục "chờ môi trường".
- **GĐ681–688** (dồn archive ×2; test hành vi SW mutation-checked; hồi quy 2740→2743 xanh 218–241 s; QA live chợ phiên preview = thật; QA co-op vòng ngày THÀNH CÔNG lần đầu + bán hàng đồng bộ tuyệt đối — nhờ **fix heartbeat server GĐ686**: pong ghi sai object khiến hẻm chết ~60 s) đã dồn archive: docs/progress-archive/PROGRESS-GD681-688.md
- **GĐ672–680** (dồn archive GĐ662–671; QA khung tablet/ngang; QA 320px mobile; đo CPU render gfx=low 5,7 ms; dọn import chết; **sửa SW stale assets — glb network-first + swStrategy.test mutation-checked**; hồi quy 2735 xanh/225 s; audit 10-GĐ ĐẠT) đã dồn archive: docs/progress-archive/PROGRESS-GD672-680.md
- **GĐ677 chi tiết:** dọn import chết `economySim.test.ts` sau GĐ669 — tsc + test xanh. Không đổi hành vi.
- **GĐ666–671** (coverage sweep + endDayNightFlow.test; dọn PROGRESS; chốt reset co-op IAB; tách economySimL5 → 243 s; audit 10-GĐ ĐẠT; luồng cố định trọn vẹn) đã dồn archive: docs/progress-archive/PROGRESS-GD666-671.md

## Quy ước kỹ thuật cần nhớ

- **Khung modal cố định (GĐ662):** mọi panel dùng chung khung `styles.panel` cứng (desktop 760×min(688,100dvh−108), mobile 100vw−24 × 100dvh−96); KHÔNG đặt kích thước riêng cho panel nào, nội dung dài cuộn bên trong. Chuyển tab trong hub không được làm khung co giãn — test khoá `panelFrame.test.ts`.

- Thay đổi "soi sáng" (helper thuần đọc + thẻ UI gọn) là mẫu mặc định — **không đổi SAVE_VERSION/kinh tế/persist** trừ khi bắt buộc.
- **Bảng màu ngữ cảnh UI (GĐ166 — KHÔNG tự chế màu mới):** accent vàng `#f1c40f` · lời `#2ecc71` · lỗ/mất-thật `#e74c3c` · cảnh báo `#e67e22` · info `#3498db` · sự kiện `#9b59b6`; chip = nền rgba cùng màu chữ. Bậc cảnh báo: đỏ = mất tiền thật, cam = cảnh báo nên xử lý, vàng = theo dõi/đang tốt. (GĐ167: grep 6 màu lệch = 0; GĐ178: họ banner guide xanh dương đã gộp về info `#3498db` — toàn bộ src/ui chỉ còn các màu ngữ cảnh + họ buy-tone được duyệt.) **GĐ258 quét lại toàn bộ src/ui: chuẩn hoá 6 màu cũ còn sót trước GĐ166 về bảng duyệt** — `#e17055`→`#e67e22`, `#fdcb6e`→`#f1c40f`, `#00b894`→`#2ecc71`, `#d63031`→`#e74c3c`, `#ff8a7a`/`#ff8f7a`→`#ff7675` (buy-tone), `#c0392b` StaffPanel→`#e74c3c`; grep còn 0 (trừ màu NHẬN DIỆN được giữ: ArrangePanel màu loại đồ, GardenPanel họ riêng GĐ178, art SVG login/BuildPanel).
- **Thẻ nhấn mạnh dùng `Callout` (shared.tsx, GĐ166):** borderLeft 3px màu ngữ cảnh, tiêu đề 13px màu tone (`styles.cardTitle`), thân 12px; `strong` + danger → nền đỏ nhạt. Thẻ mới KHÔNG tự vẽ viền/tint riêng. HUD chip/alert dùng class CSS riêng (mẫu GĐ162).
- **Pipeline Blender (GĐ172–176):** script nguồn trong `scripts/` + G LB trong `public/models/kit/` được commit để dựng lại; chạy headless `blender -b -P scripts/blender_kit_atlas.py`; xuất Draco; lazy-load trong code (`kitProps.ts`), fallback warn khi load lỗi; prop chỉ hình ảnh KHÔNG chặn lưới điều hướng. Dung lượng: kit 7 prop (baked: `chau_cay`/`thung_go`/`khom_tre`/`bon_nuoc`/`cho_nhua`/`xe_day`/`rao_chan`) ~76KB baked tổng. Ngân sách: cap tris trong `build-kit-assets.ts`. KHÔNG commit file .blend nặng. 3D Artist giữ thư mục script/tài sản; Developer chỉ tích hợp.
- Test sim dùng **seed cố định** (`setSimSeed`/`simRng()` — GĐ27/28), không mock `Math.random`.
- **Hạ tầng test:** sim seed TẤT ĐỊNH — logic qua `simRng()`, không Math.random/Date.now (chỉ hình ảnh 3D còn). `simGolden.test.ts` bắt tất định vỡ + lệch ±5% — đổi kinh tế CÓ CHỦ Ý thì chép số vào `GOLDEN` + ghi lý do. `test:coverage` mỗi ~10 GĐ (ưu tiên core/data/agents/save). `saveStore`/`staffAgent` đã mutation-check.
- **Co-op = chơi đơn (30/10):** máy khách nhận `true` tạm cho mọi thao tác → lời báo kết quả nằm TRONG thao tác (`notify`), cần kết quả thật thì `lastActionResult()`, cần dữ liệu thì ghi state chung (vd. `wheelLastPrize`). Không `useGame.setState` cả object lớn từ UI (thành PATCH đè máy chạy) → làm thao tác (vd. `dismissUnlockAct`); trường máy chạy tự tính mỗi khung → `NO_PATCH` (`atBranch`). Câu hỏi quầy gửi kèm gói state (`sharedAsk`/`applyRemoteAsk`), ai trong hẻm đứng quầy cũng được hỏi, ai bấm trước thì chốt. `coopClient.test.ts` (26 test, mutation 16/16). Checklist 5 câu ở promt_game.md mục Tester.
- QA live trên `localhost:5173`; kiểm 0 tràn ngang @320/390 (`scrollWidth == clientWidth`), 0 lỗi console. **GĐ297:** phép so `scrollWidth == clientWidth` KHÔNG đủ — `html/body` là `overflow: hidden` nên nút lòi ra bị cắt mà vẫn báo 0 tràn. Từ nay chạy thêm `game.layoutAudit()` (dev tool `src/dev/layoutAudit.ts`) ở mỗi cỡ màn: `clipped: []` mới là đạt; `overBy` dương là số px bị cắt.
- Nhiều phiên song song trên cùng worktree → commit theo đường dẫn.

## Quyết định lớn đã chốt

- Tiệm xôi (người dùng chọn b, 2026-10-31): giữ Quây xôi cấp 36 trong tạp hóa (tạp hóa lớn thành siêu thị); Tiệm xôi là cơ sở riêng cấp 40, nấu xôi số lượng lớn rẻ 40% bù kho chung mỗi đêm. Còn lại: lô 3D đầu hẻm, Sổ đầu ngày, xu hướng cơ sở.
- Thứ tự ưu tiên giữ chân: vòng ngày → dẫn đường người mới → nhịp tuần → endgame/rival → hạ tầng server.
- NG+ (GĐ14) chỉ làm sau khi có quán thứ hai; giữ bộ sưu tập, chỉ bonus doanh thu (tối đa +48%), chặn khi hẻm online.
- Vé tha thứ streak: tối đa 1 lần/7 ngày, cần chuỗi ≥3. Thử thách tuần tích vào sổ tuần.
- Sau GĐ83: ưu tiên chiều sâu UI/UX trước mở rộng hệ mới. Định hướng hiện tại: **chiều sâu-trước**.
- Kèo hôm nay bám bộ "việc chính" (GĐ107); thưởng nhiệm vụ có trần theo lãi bình quân (GĐ106); người mới không bị trần (GĐ114).
- Khách treo câu hỏi quầy tự chốt theo giây thực (30s → 😕, 45s tự chốt — GĐ122); sim có seed đếm theo tick.
- Lương trong số dư chi nhánh KHÔNG áp good_boss −10% (bảo thủ, trung thực).
- Ngoại lệ "đủ 2 chế độ" (30/10): ở hẻm online đi lại tiệm/trại tốn 0 phút (chơi đơn 10–15 phút) — đồng hồ dùng chung, một người đi không được tua giờ cả hẻm.
- 3D: Tài sản 3D mới đều qua pipeline Blender (không dựng tạm khối nguyên thủy khi Blender làm đẹp hơn), làm chậm/lười để không chặn lần tải đầu.
- Họ màu hướng dẫn/chuỗi/biểu đồ: gộp về một sắc info `#3498db` (GĐ178); ngoại lệ duy nhất: buy-tone `#55efc4`/`#ff7675`; GardenPanel giữ họ riêng. GĐ258 quét nốt 6 màu cũ — src/ui chỉ còn bảng duyệt + màu nhận diện.

## Cần theo dõi / nợ mở
- ⏱️ GĐ703: full-suite 317 s rồi 310 s (2 lần liên tiếp) vượt nhẹ ngân sách ≤5 phút — nghi tranh CPU cụm sim nặng (economySimL50/L5/economySim) cộng dồn test mới; audit GĐ710 đo lại, vẫn vượt thì phân bổ lại pool, KHÔNG cắt số ngày mô phỏng.
- ⏱️ GĐ675: số CPU render gfx=low (5,7 ms trung vị) đo trên save ngày 2 ít prop — đo lại trên save cuối-game (cấp cao, nhiều kệ/prop) trước khi khẳng định biên 4× throttle; làm khi đụng vòng render lần kế.
- 🕳️ GĐ665/668: QA co-op vòng ngày (ngủ cả hẻm → tổng kết 2 tab) cần tab trình duyệt THẬT — tab IAB về nền bị đóng băng timer → server ngắt WS → game tự reload (`coop.ts:339`, thiết kế). Cơ chế đã chốt GĐ668; checkpoint round-trip đã khoá bằng test. Làm trong đợt QA toàn diện GĐ670; trước đó ghi "chưa chạy được vì môi trường", không tính là lỗi game.
- 📦 GĐ515: tải ban đầu 598/598 KB — code mới cho Ngõ 2/sạp phải nằm trong chunk lười (world/ngo2, QuanNuocPanel); trước khi thêm vào main/index tìm chỗ tách bớt.
- GĐ330: QA lưu máy khách (127.0.0.1:5173) — tải lại trang vẫn hiện "Chơi tiếp trong máy (ngày 1)" và vào lại đúng ván; lần "mất ván" trước là bấm nhầm nút ván mới, KHÔNG phải lỗi lưu.

- ⏱️ (GĐ296–298) `npm run test` rất nhạy với tải máy: cùng một bộ test cho **355s / 405s / 532s / 655s / 733s / 994s**. Ở lần 994s có **1 test đỏ**, chạy lại ngay sau đó thì **2331/2331 xanh (532s)** → đỏ do tranh CPU, không phải lỗi logic (GĐ298 chỉ sửa CSS + dev tool, không đụng logic game). Nếu gặp 1 test đỏ lẻ mà không liên quan thay đổi vừa làm: chạy lại đúng file đó trước khi kết luận. Nếu máy rảnh mà vẫn >10 phút: đo file chậm nhất (`npx vitest run --reporter=json`) rồi tối ưu — nghi phạm vẫn là cụm sim cấp 50 (GĐ280 ~242s/file).
- Co-op (30/10, đã xử lý 3 điểm để ngỏ): (a) đi ngủ ở hẻm là **bỏ phiếu** — cả hẻm cùng nằm giường mới sang ngày, nằm chờ thì bấm [N] để dậy rút phiếu, người chưa ngủ rời hẻm thì tự sang ngày; (b) bảng tổng kết **không dừng giờ ở hẻm**, máy khách cũng tự mở bảng tổng kết (qua `lastSummary`); (c) "Về giá gợi ý"/"Chỉnh tất cả giá" dùng `setPrices`: món người khác vừa đổi giá thì giữ giá của họ. Đã QA 2 tab (`?dev=a`/`?dev=b`) cho (a)(b). GĐ286 đã đóng nốt 2 điểm ngỏ (hội thoại cốt truyện không dừng giờ hẻm; ngất khuya có người ngủ thì không phạt).


## Backlog tiếp theo
- ✅ **Đã duyệt (GĐ483):** người dùng chọn (a) — tiệm xôi thành cửa hàng nhỏ có nhà. Sạp/quầy hàng rong sau này bán ở ngõ khác khi **mở rộng bản đồ** (hướng kiểu Cities: Skylines 2: thêm ngõ/khu mới mở dần) — backlog lớn.
- 🗺️ **Mở rộng bản đồ B1–B5 ĐÃ XONG (GĐ497–505); đang làm chiều sâu Ngõ 2 (món sạp GĐ507–511, nâng sạp GĐ513).** Kế hoạch gốc: B1 khung "khu" dữ liệu (id, ranh giới, cấp/tiền mở, gốc toạ độ) + save `zones?` tuỳ chọn; B2 mở "Ngõ 2" phía bắc: đường + lô đất trống, biển RAO BÁN; B3 sạp/quầy hàng rong (xôi, nước mía, bánh mì) chỉ đặt ở ngõ mới; B4 khách/NPC đi lại giữa các khu, lưới đi lại theo khu; B5 bản đồ thu nhỏ hiện khu đã mở/chưa mở. Giữ ngân sách bundle (khu tải lười).
- ✅ **Cửa hàng nước thật B1–B5 ĐÃ XONG (GĐ424–428):** nhà quán, vào trong được, khách ngồi, tự pha, Quầy→Quán→Cà phê. Chiều sâu sau đó: thời tiết, đồ nóng, thực đơn (GĐ414–494).

- 🔍 **Rà 3 cơ sở (GĐ413, theo yêu cầu người dùng trước khi mở rộng tiệm xôi):**
  - Cửa hàng tiện lợi: luật chơi SÂU (ca kíp, mệt mỏi, sự cố đêm, máy bán hàng, điện, nhóm khách đêm). Nợ: BranchPanel 297 dòng gánh hết, cần soát độ rối; QA 3D xong GĐ527.
  - Nông trại: SÂU (mùa vụ, 7 vật nuôi, công trình 3 sao, đơn đặt hàng, phụ trại; world/farm.ts 996 dòng). QA 3D xong GĐ528.
  - Quán nước: MỎNG — chỉ 2 nút (số nhân viên, 3 mức giá), thực đơn tự lấy mọi đồ uống, thời tiết không ảnh hưởng, không sự kiện; panel 230 dòng phần lớn là bảng phân tích quanh 2 nút. 3D dựng hộp thủ tục, chưa dùng kit Blender (bang_ghe, chau_cay có sẵn).
  - Thứ tự sửa: ~~(1) thời tiết~~ xong GĐ414, ~~(2) chọn món~~ thành thực đơn pha chế GĐ415, ~~(3) 3D quán dùng kit~~ (đã có setQuanDecor: chậu cây + băng ghế), ~~(4) gọn BranchPanel~~ xong GĐ417, ~~(5) QA 3D~~ GĐ419 +GĐ420 đủ cả ba. Tiệm xôi phần còn lại để sau.
  - QA 3D cần save thử riêng: không có chế độ sandbox, không được sửa save thật của người dùng.

1. 🧹 **Nợ refactor UI (đo GĐ685, làm khi đụng panel đó hoặc hết việc chơi sâu):** `ReportPanels.tsx` 1.632 dòng chứa 6 panel (history/records/analytics/dossier/roadmap/discovery) → tách theo file; `BusinessPanel.tsx` 1.206 dòng gánh nhiều hệ kinh doanh. BranchPanel 297 dòng — nợ cũ GĐ417 ĐÃ ỔN, gỡ khỏi backlog. Chỉ tách khi có lý do chơi (sửa tính năng trong panel đó), không refactor thuần (Luật 1).
2. **Trục đã cạn:** 3D trang trí (chỉ làm 3D mới khi đi kèm gameplay — GĐ172–198) · multi-shop supply chain (GĐ199–209, khép mạch) · bộ soi tiền/vốn (GĐ210–251) · UI nợ (GĐ183/258) · chợ phiên (GĐ182).
2. **Khoá chờ save người thật:** NG+ vòng (GĐ171) · nhiệm vụ ngày 1–5 (GĐ254 đã giảm lặp). (GĐ110/117 ĐÃ ĐÓNG GĐ280 bằng số liệu; Arc E "Hàng xóm khai trương" ĐÃ HOÀN THÀNH GĐ283, 27 test cấu trúc xanh).
3. **Ý tưởng chờ Leader duyệt (chiều sâu, chưa làm):** (a) nhịp cuối tuần đậm hơn — **ĐÃ HOÀN THÀNH GĐ291** (lô chợ phiên đầu tháng nhận biết món ăn vặt cuối tuần + gợi ý trữ hàng đặc biệt); (b) nhiệm vụ tuần/tháng biết đến thứ/ngày trong kỳ — **ĐÃ HOÀN THÀNH GĐ289** (nhịp tháng monthPace hiển thị ngày còn lại tới hết tháng + dự báo kịp/hụt và bảo vệ chuỗi tháng).
4. 👥 **Đủ 2 chế độ (ĐÃ CHỐT GĐ288):** khoá chính sách parity chơi đơn/hẻm online: Sân chơi chung tiến độ; Tái sinh NG+ chỉ chơi đơn; Chào mừng quay lại chạy cục bộ. Test: coopClient.test.ts. Chi tiết: docs/progress-archive/BACKLOG-parity-GD288.md.

## Mục lục giai đoạn đã xong (chi tiết trong archive)
- GĐ177–293 (3D/đèn, supply chain, bộ soi tiền/vốn, khách quen, arc A–E, nhịp tháng, co-op parity): PROGRESS-GD230-249/250-257/281-293.md + INDEX-GD251-300.md
- GĐ294–342 (bundle/lazy, thông báo, co-op ca sáng, trần thưởng, save sandbox, FPS, vàng ngày 1/2): PROGRESS-GD294-305/306-310/311-319/312-325/326-328.md + PROGRESS-GD326-342-notes.md
- GĐ400–449 (test vườn, khách quen gọi tên, Tiệm xôi, quán nước thời tiết/pha chế/bậc/tự pha, sạp xôi 3D): docs/progress-archive/PROGRESS-GD400-449.md

- GĐ1–250: xem docs/progress-archive/INDEX-GD1-250.md
- GĐ251–300: xem docs/progress-archive/INDEX-GD251-300.md
- GĐ301–349: xem docs/progress-archive/INDEX-GD301-349.md
- GĐ350–381: xem docs/progress-archive/INDEX-GD350-381.md
- GĐ450–499 (quán nước đồ nóng, tiệm xôi có nhà, khu bản đồ B1–B2): xem docs/progress-archive/INDEX-GD450-499.md
- GĐ359–399 (lẻ) + GĐ500–511 (Ngõ 2 B2–B5, món sạp): xem docs/progress-archive/INDEX-GD359-399-500-511.md

- GĐ512–534 (Ngõ 2 nâng sạp/3D/tự đứng sạp, QA 3 cơ sở, nhịp cuối tuần xôi/tiện lợi): xem docs/progress-archive/INDEX-GD512-534.md
- GĐ535–549 (đơn trại cuối tuần + theo sức trại, dấu phẩy thập phân, chữ ≥11px, biểu đồ 375px, tin đồn quán xóm): xem docs/progress-archive/INDEX-GD535-549.md
- GĐ550–564: QA người mới, ngày 1 gọn, fitList/fitJoin ≤90 → xem docs/progress-archive/INDEX-GD550-564.md
- GĐ580–599 (quán nước đêm có trận, tiệm xôi/sạp ngày cúng, tách quanNuocInsights): xem docs/progress-archive/INDEX-GD580-599.md
- GĐ600–619 (tiện lợi đêm có trận, đồ cúng tiệm chính/trang trại, Sổ đầu ngày & thẻ "Mai tiệm có gì" báo ngày cúng/trận): xem docs/progress-archive/INDEX-GD600-619.md
- GĐ565–579: gom tin một toast (đêm/sau ngủ/cùng lượt), cảnh báo chi nhánh gom khung, đo FPS/module → docs/progress-archive/INDEX-GD565-579.md

- GĐ620–636 (ngày trận cho sạp/quán/tiện lợi, nhắc ngày cúng ở Sổ đầu ngày, tách việc theo dịp sang file nạp lười, HudKeys/CounterAskAlert nạp lười giữ bundle ≤597) → docs/progress-archive/INDEX-GD620-636.md

- GĐ640 (rà ngân sách + QA người mới): bundle 596,8/597, chunk 253/255, cả bộ 2709/2710 → sửa 🙏 lịch fontSize 8 (vi phạm ≥11, GĐ639) → xanh; FPS gfx=low ~72. Save sandbox mới: 3 thoại → Mở cửa 14s; khách xếp quầy khi chủ còn ở nhà, Ra tiệm → bán đầu ~35s. ≤5 phút. Lưu trữ GĐ620–636.
- GĐ641: test đếm ngược qua năm mới (Tết dương lịch + mùng 1 năm sau cùng còn 3 ngày) — nextEventLine đúng khi vắt năm.
- GĐ650 (rà ngân sách + QA người mới): bundle 596,8/597, chunk 253/255, cả bộ 2715/2715 xanh, PROGRESS 27KB, FPS gfx=low ~67. Save sandbox mới đúng thứ tự (3 thoại → Ra tiệm → Mở cửa 8,5s) → bán đầu ~55s. ≤5 phút.
- GĐ637–659: lịch/đếm ngược sự kiện, gợi ý nhập đồ lễ & đồ cúng, HUD gọn (chi tiết: docs/progress-archive/INDEX-GD637-659.md).
- GĐ660: rà ngân sách — tải đầu 596.7/597 KB, chunk 253/255 KB; lưu trữ GĐ637–659; PROGRESS gọn 25.6 KB; ván mới vào được ngày 1, FPS ~46.
- GĐ661: QA ván mới bổ sung cho GĐ660 — Tiếp/Xong → Ra tiệm → Mở cửa, bán được 9 món (nước, bánh, mì) trong ~65 s thật (≤5 phút ✅).
- GĐ662: QA toàn diện giao diện — khung modal cố định, hết nhảy khung khi chuyển tab (chi tiết: mục Trạng thái hiện tại; test `panelFrame.test.ts`). FPS gfx=low đo lại 70–74 có khách → mức ~46 GĐ660 là nhiễu tải máy.
- GĐ663: QA co-op luồng ngắn khung panel GĐ662 — máy khách cùng khung 760×688 như chơi đơn, clipped 0. Không đổi mã.
- GĐ664: QA danh sách dài/số tiền lớn (cấp 45 + 30 ngày dữ liệu) — quét lại sạch; kết luận bundle: hết thắng rẻ, code mới nằm chunk lười.
- GĐ665: co-op 2 tab qua IAB bị chặn môi trường (tab nền mất WS hẻm); khoá checkpoint round-trip bằng test mới — không phải bug join. Vòng ngày hẻm thật dời GĐ670.
- GĐ666: coverage sweep — vá timeout phoneReasons, test mới đường nối chốt ngày (trại/nợ/đơn mang đi); tool xếp hạng dev/covrank.cjs + dev/covlines.cjs.
- GĐ667: dọn PROGRESS 31,6 → 24,3 KB — ghi chú GĐ329–342 dồn archive, không đổi mã.
- GĐ668: chốt nguyên nhân reset co-op IAB — tab nền đóng băng timer → server ngắt WS → tự reload (thiết kế coop.ts:339). Không phải bug.
- GĐ669: tách economySimL5.test.ts — test 300 → 243 s, hết sát trần 5 phút. Cập nhật bảng ngân sách theo số đo mới.
- GĐ670: audit 10-GĐ ĐẠT (bundle/test/HUD/thông báo/tỉ số/FPS/save trắng/16 panel); prune: không bỏ gì, nợ BranchPanel ghi lại.
- GĐ671: luồng cố định trọn vẹn trên HEAD (ngủ → tổng kết 3 tab) — sạch, 0 lỗi console.
- GĐ672: dồn chi tiết GĐ662–665 sang docs/progress-archive/PROGRESS-GD662-665.md; PROGRESS về 27,4 KB.
- GĐ673: khung panel trên tablet dọc + điện thoại ngang (nhánh mobile thật) — đạt, không đổi mã.
- GĐ674: 320px nhánh mobile thật — 8 panel dày clipped 0; lớp lỗi GĐ297 vẫn được chặn.
- GĐ675: đo CPU render gfx=low 5,7 ms/khung → 4× throttle ~28–33 FPS đạt; đo lại trên save cuối-game khi đụng render.
- GĐ676: dồn chi tiết GĐ666–671 sang docs/progress-archive/PROGRESS-GD666-671.md.
- GĐ677: dọn import chết economySim.test.ts sau GĐ669 — tsc + test xanh.
- GĐ678: sửa SW stale assets (glb cache-first → network-first) — tài sản 3D mới tới tay người chơi cũ; test swStrategy.test.ts.
- GĐ679: hồi quy cả bộ 2735 xanh / 225 s.
- GĐ680: audit 10-GĐ ĐẠT; điểm nhấn chu kỳ = sửa SW stale assets (GĐ678); prune không bỏ gì.
- GĐ681: dồn chi tiết GĐ672–680 sang docs/progress-archive/PROGRESS-GD672-680.md; PROGRESS về ~20 KB.
- GĐ682: test hành vi SW (swFetch.test, mutation-checked); SW v2 áp dụng khi deploy PROD kế.
- GĐ683: hồi quy cả bộ 2740 xanh / 241 s.
- GĐ688: QA co-op bán hàng — đồng bộ tuyệt đối 2 máy, hand-off đổi vai hoạt động thật, sàn bẩn kìm khách đúng thiết kế.
- GĐ684: QA live chợ phiên — preview = thật (±0đ), chống bán 2 lần/ngày đạt. Không đổi mã.
- GĐ685: đo nợ refactor UI bằng số — ReportPanels 1.632 dòng (6 panel) & BusinessPanel 1.206 dòng là nợ thật; BranchPanel 297 dòng ổn, gỡ khỏi backlog.
- GĐ689: dồn chi tiết GĐ681–688 sang docs/progress-archive/PROGRESS-GD681-688.md.
- GĐ690: audit 10-GĐ ĐẠT — điểm nhấn chu kỳ = fix heartbeat + co-op trọn vẹn lần đầu; prune không bỏ gì.
- GĐ686: 🐛 fix heartbeat server (pong ghi sai object → hẻm chết ~60 s) + heartbeatStep + wsHeartbeat.test. Server dev cần khởi động lại để có hiệu lực — sau đó QA co-op vòng ngày (GĐ690) khả thi.
