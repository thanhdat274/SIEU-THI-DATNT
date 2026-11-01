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

- **GĐ671:** QA luồng cố định trọn vẹn trên HEAD (save trắng GĐ670): tối 22h → ngủ → sang ngày 2 đúng 06:00, bảng tổng kết ngày 1 tự mở với 3 tab (Tổng quan/Theo món/Mai tiệm có gì — doanh thu 82.000đ), chuyển tab + đóng không lỗi, 0 lỗi console. Chốt: luồng ngày (sáng→bán→ngủ→tổng kết) sạch trên HEAD.
- **GĐ670:** 🧭 AUDIT 10-GĐ (GĐ661–670) — mọi hàng ngân sách ĐẠT: bundle 596,7/597 KB · chunk 253/255 · test 243 s/≤5 phút · HUD 20 nút (=trần) · thông báo ngày 1 đo 9 (trần 9) · tỉ số thưởng/lãi 0,99/0,89/0,64 (trần 1,0/0,92/0,67) · rò rỉ 0%. QA trình duyệt trên save trắng mới (HEAD): mở cửa ~4 s → bán món đầu ~28 s thực (tổng từ màn khởi đầu ~37 s, mục tiêu ≤5 phút ✅); FPS gfx=low ~74 khi có khách (≥30 ✅); 16 panel hub + layoutAudit clipped 0, 0 lỗi console. Rà tính năng (Leader + Designer): không gộp/bỏ gì đợt này — mỗi nút HUD còn đường đo riêng, không chồng chéo mới; nợ duy nhất là độ rối BranchPanel (nợ kỹ thuật, không phải tính năng thừa). Co-op vòng ngày trên trình duyệt thật vẫn mở (GĐ665/668 — môi trường IAB không giữ WS nền); đã khoá bằng test checkpoint.
- **GĐ669:** ⏱️ lấy lại biên thời gian test: `npm run test` đo 300,1 s — SÁT trần ≤5 phút. Tách bài sim cấp 5 × 30 ngày (~170 s, dài nhất) khỏi `economySim.test.ts` sang `economySimL5.test.ts` — vitest chạy file song song, không đụng số mốc/trần/golden (trần 1.0 cấp 5 chuyển nguyên vẹn sang file mới). Cả bộ: 300 → **243 s**, 286 file / 2731 test xanh; nút thắt còn lại là `economySimL50` (230 s, 1 `it` 28 ngày — không tách được thêm không đổi độ dài sim).
- **GĐ668:** 🔬 chốt nguyên nhân reset co-op trên IAB (theo dõi 100 s không can thiệp: ngữ cảnh trang biến mất hoàn toàn): tab nền IAB bị đóng băng timer → heartbeat `sendState`/pose (`coop.ts` setInterval 0,1s) ngừng → server ngắt WS → `onclose` tự `location.reload()` về màn chính sau 2,5 s (`coop.ts:339`, thiết kế "Mất kết nối hẻm online… quay về màn hình chính"). Không phải bug game; người chơi thật (tab thường) không bị đóng băng timer mức này. QA co-op qua IAB chỉ đứng vững khi tab giữ hiển thị. Không đổi mã.
- **GĐ667:** 🗄️ dọn PROGRESS (31,6 → 24,3 KB): ghi chú GĐ329–342 còn trong "Cần theo dõi" (đã cũ về số liệu bundle/FPS/test) dồn sang `docs/progress-archive/PROGRESS-GD326-342-notes.md`; các mục ✅ ĐÃ ĐÓNG và con trỏ archive GĐ281–342 gộp thành 2 dòng mục lục. Không đổi mã, không đổi quyết định.
- **GĐ666:** 🧪 coverage sweep (đầu tiên được ghi từ GĐ270): tổng 56,5% stmt / 88,9% branch / 80,6% fn. Thêm reporter `json` vào vitest coverage + tool xếp hạng `dev/covrank.cjs` (file logic thiếu test nhất) và `dev/covlines.cjs` (dòng chưa phủ theo file). Sửa `phoneReasons.test.ts`: quét 21.600 tổ hợp vượt timeout 5 s mặc định dưới instrumentation → 30 s riêng cho test đó. Test mới `endDayNightFlow.test.ts` (6 test, mutation-checked) phủ đường nối chốt ngày chưa chạm tới: phụ trại qua đêm (tưới/đổ cám/gom trứng về kho + tin 🧑‍🌾), đơn trại quá hạn huỷ + lập đơn mới (cấp đủ/thiếu), sổ nợ quỵt 14 ngày (xoá + −10 thân thiết) / nhắc ngày thứ 8, đơn gọi điện carrying về kho + 2 sao + −3 thân thiết. Các file 0% còn lại (branchVisit, residents, audio) là lớp diễn 3D/âm thanh — theo quy ước không đáng thêm test. 2731 test xanh (300s).
- **GĐ665:** vòng ngày co-op 2 tab bị chặn bởi môi trường QA: tab IAB về nền là mất phiên WS hẻm — quay lại thì tab về màn khởi đầu hoặc nạp lại checkpoint server (đo được reset về đúng ngày 1, 06:00 nhiều lần trên cả 2 tab) → không chạy được vòng ngày đầy đủ qua IAB. Soi code chốt cơ chế: máy khách nhận state SỐNG broadcast từ máy chạy (`coop.ts` sendState, nhịp 0,2s khi ≥2 người) chứ không phải snapshot cũ; máy chạy checkpoint 30 s/lần + khi ẩn tab; vào lại hẻm nạp checkpoint gần nhất. Khoá bảo đảm này bằng test mới `coopClient.test.ts` (checkpoint giữa ngày round-trip + máy khách không tự checkpoint; đã kiểm đỏ khi tắt checkpoint). **Kết luận: không phải bug join-giữa-ngày cho người chơi thật; các lần reset là tab IAB đóng băng nền.** Vòng ngày hẻm 2 tab trên trình duyệt thật dời sang dịp QA toàn diện (GĐ670) — xem Cần theo dõi.
- **GĐ664:** QA "danh sách dài, số tiền lớn" (chiều checklist GĐ662 chưa phủ): dựng save sandbox cấp 45 + lịch sử 30 ngày (revenue/profit/khách biến thiên, 98 triệu) → quét lại 34 panel ở 1280 & 390: clipped 0, 0 lỗi console; biểu đồ Sổ theo dõi vẽ đúng 30 ngày. Kèm kết luận phân tích bundle (chỉ để biết, khỏi phân tích lại): chunk `surpriseArcs` 34,5 KB là phần dữ liệu DÙNG CHUNG entry+stories (biz/catalog/recipes) — không tách được; `regulars.ts` 25KB đan sâu 10 file lõi; `world/farm.ts` 20KB chỉ đáng ~6KB gzip mà phải bất đồng bộ hoá main.tsx — không đáng. Quy tắc hiện hành giữ nguyên: code mới phải nằm trong chunk lười.
- **GĐ663:** QA co-op luồng ngắn cho khung panel GĐ662 (2 tab `?dev=a`/`?dev=b`, hẻm "QA GD662 khung panel"): máy khách (Thử B, hẻm T9VP65) mở history/records/branch — khung cùng 760×688 top=56 như chơi đơn, chuyển tab không nhảy, `layoutAudit` clipped 0, không lỗi console. Không đổi mã.
- **GĐ662–665** (khung modal cố định + panelFrame.test; QA co-op khung; QA danh sách dài; checkpoint co-op test + chốt reset IAB là môi trường) đã dồn archive: docs/progress-archive/PROGRESS-GD662-665.md
- **GĐ661:** QA ván mới bổ sung cho GĐ660 — Tiếp/Xong → Ra tiệm → Mở cửa, bán được 9 món (nước, bánh, mì) trong ~65 s thật (≤5 phút ✅).


- Bức tranh tổng: các nhịp giữ chân (ngày/tuần/cuối tuần/tháng/mùa/năm/NG+) bão hòa; UI responsive audit kỹ; trục "giá trị vs chi phí" soi kín; 3D chỉ khi kèm gameplay.
- Backup trước GĐ1: GAME_TU_DO_backup_2026-10-26.tar.gz (thư mục người dùng).


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

1. **Trục đã cạn:** 3D trang trí (chỉ làm 3D mới khi đi kèm gameplay — GĐ172–198) · multi-shop supply chain (GĐ199–209, khép mạch) · bộ soi tiền/vốn (GĐ210–251) · UI nợ (GĐ183/258) · chợ phiên (GĐ182).
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
