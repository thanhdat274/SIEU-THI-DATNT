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

## Trạng thái hiện tại (30/10/2026)

- **GĐ329:** 🪙 Hộp thoại "thiếu tiền lẻ" mở từ cấp 2 thay vì cấp 1 (`CHANGE_UNLOCK` 1→2, cùng cấp với mặc cả): lần bán đầu của người mới không còn bị quyết định phức tạp chen vào (QA GĐ328 gặp ngay ở khách đầu, xác suất 6%/lần). Cấp 2 đạt ngay trong ngày 1. 2356 test xanh.
- **GĐ326–328** (ẩn thông báo Sổ tay ngày 1, rà ngân sách, đo lần bán đầu ~4 phút) đã dồn archive: docs/progress-archive/PROGRESS-GD326-328.md
- **GĐ312/321/322/325** (trần thưởng nhiệm vụ, sim tất định) đã dồn archive: docs/progress-archive/PROGRESS-GD312-325.md

- **GĐ306–310** đã dồn archive: docs/progress-archive/PROGRESS-GD306-310.md (nút HUD 33→20, firebase động, thông báo ngày 1, rò rỉ).
- **GĐ311/316/319** đã dồn archive: docs/progress-archive/PROGRESS-GD311-319.md.

- **GĐ294–305** đã dồn archive: docs/progress-archive/PROGRESS-GD294-305.md (bundle/lazy, thông báo, test time, co-op morning shift).

- Bức tranh tổng: các nhịp giữ chân (ngày/tuần/cuối tuần/tháng/mùa/năm/NG+) bão hòa; UI responsive audit kỹ; trục "giá trị vs chi phí" soi kín; 3D chỉ khi kèm gameplay.
- Backup trước GĐ1: GAME_TU_DO_backup_2026-10-26.tar.gz (thư mục người dùng).

### Giai đoạn gần đây · GĐ281 (chi tiết GĐ cũ: docs/progress-archive/ — GĐ230–249: PROGRESS-GD230-249.md · GĐ250–280: PROGRESS-GD250-257.md)

- **GĐ177–271** đã dồn archive (docs/progress-archive/): 3D + đèn · supply chain · bộ soi tiền/vốn · PROGRESS-GD230-249.md · PROGRESS-GD250-257.md (phụ lục 258–271).



- **GĐ281–293** đã dồn archive: docs/progress-archive/PROGRESS-GD281-293.md (khách quen, arc A–E, TIME_BANDS, nhịp tháng, co-op parity)

## Quy ước kỹ thuật cần nhớ

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
- GĐ330: QA lưu máy khách (127.0.0.1:5173) — tải lại trang vẫn hiện "Chơi tiếp trong máy (ngày 1)" và vào lại đúng ván; lần "mất ván" trước là bấm nhầm nút ván mới, KHÔNG phải lỗi lưu.

- ⏱️ (GĐ296–298) `npm run test` rất nhạy với tải máy: cùng một bộ test cho **355s / 405s / 532s / 655s / 733s / 994s**. Ở lần 994s có **1 test đỏ**, chạy lại ngay sau đó thì **2331/2331 xanh (532s)** → đỏ do tranh CPU, không phải lỗi logic (GĐ298 chỉ sửa CSS + dev tool, không đụng logic game). Nếu gặp 1 test đỏ lẻ mà không liên quan thay đổi vừa làm: chạy lại đúng file đó trước khi kết luận. Nếu máy rảnh mà vẫn >10 phút: đo file chậm nhất (`npx vitest run --reporter=json`) rồi tối ưu — nghi phạm vẫn là cụm sim cấp 50 (GĐ280 ~242s/file).
- QA mắt 3D/panel chập tối (IAB nền dừng rAF): GĐ177–194 đã QA @5173 lúc làm; đối chiếu lại thì xem archive.
- ✅ ĐÃ ĐÓNG (29/10) flake `weeklyGoalCap`: bot bày lại tầng kệ đầy → bỏ qua tầng đầy + timeout 1.8tr ms. Nếu cả bộ lại > ~10 phút: profile trước khi làm tiếp.
- ✅ ĐÃ ĐÓNG (GĐ287): Tối ưu regression suite toàn bộ — gom vòng sim lặp cấp 50 giữa `weeklyGoalCap` và `economySim`; thời gian chạy `weeklyGoalCap.test.ts` giảm từ 320s xuống ~53s. Tổng thời gian test giảm từ 11+ phút xuống ~6.6 phút an toàn trong giới hạn 10 phút.
- ✅ ĐÃ ĐÓNG (GĐ292): Khóa kiểm định scale mục tiêu vòng NG+ (GĐ171) — công thức runTargetScale (trần ×3) và runRewardScale (trần ×2.5) với targetCap đã khống chế chặt chẽ giới hạn cấp (MAX_LEVEL 100) và bậc mối (PARTNER_TIERS.length 5). Bộ 45 test prestige/ngGoalsRun/ngGoals bảo đảm độ khó vòng 2+ bền vững và không sinh lạm phát.
- Co-op (30/10, đã xử lý 3 điểm để ngỏ): (a) đi ngủ ở hẻm là **bỏ phiếu** — cả hẻm cùng nằm giường mới sang ngày, nằm chờ thì bấm [N] để dậy rút phiếu, người chưa ngủ rời hẻm thì tự sang ngày; (b) bảng tổng kết **không dừng giờ ở hẻm**, máy khách cũng tự mở bảng tổng kết (qua `lastSummary`); (c) "Về giá gợi ý"/"Chỉnh tất cả giá" dùng `setPrices`: món người khác vừa đổi giá thì giữ giá của họ. Đã QA 2 tab (`?dev=a`/`?dev=b`) cho (a)(b). GĐ286 đã đóng nốt 2 điểm ngỏ (hội thoại cốt truyện không dừng giờ hẻm; ngất khuya có người ngủ thì không phạt).


- 📦 GĐ336: ✅ BUNDLE ĐẠT 596 KB (<600): văn bản dài `STORIES` + `SURPRISES` chuyển sang `data/stories.ts`, nạp lười bằng `loadStories()` (gọi ở main.tsx; `STORIES`/`SURPRISES` là `let` live-binding, rỗng tới khi nạp xong, mọi chỗ đọc chịu được rỗng). Test cần `await loadStories()` (narrative + 3 test surprise). 2356 test xanh, trần bundle hạ 600/260.
- 🧪 GĐ340: `lazyTextData.test.ts` khoá hợp đồng nạp lười — trước khi nạp xong `storyOnVisit`/`maybeSurprise` không ném lỗi, nạp xong có ≥10 chuyện + ≥1 bất ngờ, `loadStories()` idempotent.
- 🔎 GĐ341: đo thông báo NGÀY 2 của bot (sim 2 ngày): 11, toàn phản hồi tiến trình (thành tựu/danh hiệu/thuê NV/2 lần lên cấp/Sổ tay/chi phí vận hành); chưa có trần riêng — nếu thêm thì ≥11, đừng bơm thêm toast ngày 2.
- 📱 GĐ342: QA điện thoại 375×812 (+ máy tính bảng 768×1024 màn khởi đầu: scrollWidth = 768, không tràn) trên save sạch (ngày 2, tối): không tràn ngang (scrollWidth = 375), thanh nút dưới + joystick + [Đi ngủ] vừa khung, banner lễ không che nút.
- 📦 GĐ333–335 (thử esnext/alias three/lazy farm không giảm; lazy farm hoàn tác) → GĐ334: GLTFLoader+DRACOLoader nạp lười (`world/gltfLoader.ts`, 4 chỗ gọi + manualChunks tách `three/examples/jsm/loaders`) → tải ban đầu 618→604 KB, chunk lớn nhất 267→253; QA trình duyệt: GLB kit/facade vẫn tải 200, không lỗi mới. Trần hạ 610/260. Còn 4KB tới 600.
- 🪴 GĐ339: khoá luật mật độ prop kit (≤4 prop/4 m, mọi sự kiện bật) bằng `kitDensity.test.ts` — đo hiện tại đạt, test chặn thêm prop dồn cục.
- 🖥️ GĐ338: QA máy yếu `?gfx=low` trên save sạch (ngày 2, dev server không nén, tab hiện): ~58 FPS (mục tiêu ≥30). Sau GĐ334–336 (nạp lười GLTF/stories) không thấy tụt hay lỗi tải.
- 🧭 GĐ337 Leader review (GĐ328–336): cả 4 mục tiêu ĐẠT trên HEAD — thông báo ngày 1 = 10, tỉ số thưởng/lãi cấp 5/10/20 = 0.99/0.89/0.64, bundle 596/253 KB, PROGRESS 28.8KB; 2356 test xanh, tsc sạch. Rủi ro còn lại: (1) test toàn bộ đo 165s (trần ~150s, máy bận) — theo dõi, đừng thêm test nặng; (2) `STORIES`/`SURPRISES` rỗng ~ms đầu phiên (an toàn nhưng test mới đọc chúng phải `await loadStories()`); (3) % kèo hạ 25/40/65 — chờ phản hồi người chơi thật về cảm giác kèo. Việc kế: chờ save người thật, không có trục kỹ thuật nào còn mở.
- GĐ332: ✅ tỉ số thưởng/lãi bán cấp 5 ĐẠT ≤1: hạ % kèo 30/50/80 → 25/40/65 (kèo tuỳ chọn, vẫn trần 1× bộ nhiệm vụ). Đo tất định cấp 5 0.99 · cấp 10 0.89 · cấp 20 0.64; trần test hạ 1.0/0.92/0.67; golden L30 money cập nhật. 2356 test xanh. Không đụng luật ngày 1 không trần.
- GĐ330: QA ngày 1→2 trên save sạch (8× rồi N): sang ngày 2 đúng, hiện Tổng kết ngày 1 + "Mai tiệm có gì"; tiền 300k→260k (tiền nhà, ngày không bán). Không lỗi.
- GĐ331: ✅ mục tiêu ≤10 thông báo ngày 1 ĐẠT: bộ đếm test chỉ tính khi còn ở ngày 1 (dự báo thời tiết + danh hiệu hiện SAU đi ngủ là của ngày 2) → đo 10, trần test hạ 12→10. Phần còn lại là 4 lần lên cấp + thành tựu + phản hồi tiến trình của bot.
- 🧭 (GĐ318) QA người mới trên save sạch (origin 127.0.0.1:5173, tách IndexedDB khỏi save thật — không xoá gì): từ màn khởi đầu tới **mở cửa tiệm = ~10 cú bấm, 06:29 giờ game** (3 thoại Bà Năm → Nhập hàng → Điền theo gợi ý → Nhập ngay → Mở cửa); checklist "Ngày đầu mở tiệm" tự tick đúng. **Chưa đo được lần bán đầu** (cảnh 3D tab nền không chạy rAF, cần người chơi đứng quầy). Phát hiện: panel **Nhập hàng ngày 1 quá dày** (lô chợ phiên, mối quen, dự báo, khách săn tuần, cần nhập gấp cùng lúc) — ứng viên ẩn bớt khối ở ngày 1.
- 🧪 (GĐ320) Thử hạ thêm trần thưởng (sàn 90k, ×0,5): tỉ số 1,95/1,65 (cấp 5), 1,24/1,14 (cấp 10), 1,12/0,62 (cấp 20) — KHÔNG tốt hơn GĐ312 (1,44/1,17/1,17) vì lãi bán ngày ở cấp 5 dao động 82k–150k giữa các lần chạy. Hoàn tác. Muốn chỉnh tiếp phải làm sim tất định (seed) hoặc lấy trung bình ≥5 lần.

- 🧪 (GĐ323) Thử trần thưởng 0,35×/sàn 60k (sim tất định): tỉ số 1,03 (cấp 5) / 0,95 (cấp 10) / 0,65 (cấp 20) nhưng `economySimL50` đỏ (bot cấp 50 chỉ đạt 21 < 22 nhiệm vụ xương sống) → thưởng thấp hơn làm bot thiếu vốn, mất nhịp. Hoàn tác về 0,4×/70k (GĐ322). Ratio ≤1 ở cấp 5 chỉ còn cách khác: tăng lãi gộp (không đụng trần thưởng), vì cấp 5 bị ngày 1 không-trần kéo lên.


## Backlog tiếp theo
- 🙋 **Cần duyệt (GĐ470, 31/10):** người dùng hỏi sao tiệm xôi là sạp vỉa hè, mưa bán sao được. Đề xuất: nâng tiệm xôi thành cửa hàng nhỏ có nhà (biển TIỆM XÔI, quầy + nồi trong nhà, vào đứng quầy bấm J), giữ nguyên luật/save. Chờ chọn: (a) cửa hàng nhỏ (b) giữ sạp. Đã giải thích: Quán cà phê là bậc 3 của chính quán nước, không phải tiệm riêng.
- ✅ **Đã duyệt (a) cửa hàng nước thật** — lộ trình: B1 nhà thật có quầy pha/tủ mát bên trong (hình) → B2 vào trong được (nav) → B3 khách 3D gọi món/ngồi → B4 tự đứng quầy pha → B5 lớn dần quầy→quán→cà phê. Đề xuất gốc GĐ422: — Người dùng hỏi sao quán nước chưa là cửa hàng như tạp hóa. Hiện là quầy ngoài trời ở (54.4,0,1), sim theo ngày, không vào trong được. Đề xuất: (a) nâng thành cửa hàng nước thật — nhà có quầy pha + tủ mát, khách 3D vào gọi món/ngồi, tự đứng quầy pha, lớn dần quầy→quán→cà phê (thay đổi lớn: sim, nav, migration); (b) giữ quầy, chỉ đẹp/to dần theo cấp; (c) hướng khác. Chờ người dùng chọn; trong lúc chờ làm tiếp tiệm xôi.

- 🔍 **Rà 3 cơ sở (GĐ413, theo yêu cầu người dùng trước khi mở rộng tiệm xôi):**
  - Cửa hàng tiện lợi: luật chơi SÂU (ca kíp, mệt mỏi, sự cố đêm, máy bán hàng, điện, nhóm khách đêm). Nợ: BranchPanel 297 dòng gánh hết, cần soát độ rối; chưa có đợt chụp QA 3D.
  - Nông trại: SÂU (mùa vụ, 7 vật nuôi, công trình 3 sao, đơn đặt hàng, phụ trại; world/farm.ts 996 dòng). Nợ: chưa chụp QA 3D gần đây.
  - Quán nước: MỎNG — chỉ 2 nút (số nhân viên, 3 mức giá), thực đơn tự lấy mọi đồ uống, thời tiết không ảnh hưởng, không sự kiện; panel 230 dòng phần lớn là bảng phân tích quanh 2 nút. 3D dựng hộp thủ tục, chưa dùng kit Blender (bang_ghe, chau_cay có sẵn).
  - Thứ tự sửa: ~~(1) thời tiết~~ xong GĐ414, ~~(2) chọn món~~ thành thực đơn pha chế GĐ415, (3) 3D quán dùng kit, ~~(4) gọn BranchPanel~~ xong GĐ417, ~~(5) QA 3D~~ GĐ419 +GĐ420 đủ cả ba. Tiệm xôi phần còn lại để sau.
  - QA 3D cần save thử riêng: không có chế độ sandbox, không được sửa save thật của người dùng.

1. **Trục đã cạn:** 3D trang trí (chỉ làm 3D mới khi đi kèm gameplay — GĐ172–198) · multi-shop supply chain (GĐ199–209, khép mạch) · bộ soi tiền/vốn (GĐ210–251) · UI nợ (GĐ183/258) · chợ phiên (GĐ182).
2. **Khoá chờ save người thật:** NG+ vòng (GĐ171) · nhiệm vụ ngày 1–5 (GĐ254 đã giảm lặp). (GĐ110/117 ĐÃ ĐÓNG GĐ280 bằng số liệu; Arc E "Hàng xóm khai trương" ĐÃ HOÀN THÀNH GĐ283, 27 test cấu trúc xanh).
3. **Ý tưởng chờ Leader duyệt (chiều sâu, chưa làm):** (a) nhịp cuối tuần đậm hơn — **ĐÃ HOÀN THÀNH GĐ291** (lô chợ phiên đầu tháng nhận biết món ăn vặt cuối tuần + gợi ý trữ hàng đặc biệt); (b) nhiệm vụ tuần/tháng biết đến thứ/ngày trong kỳ — **ĐÃ HOÀN THÀNH GĐ289** (nhịp tháng monthPace hiển thị ngày còn lại tới hết tháng + dự báo kịp/hụt và bảo vệ chuỗi tháng).
4. 👥 **Đủ 2 chế độ (ĐÃ CHỐT GĐ288):** khoá chính sách parity chơi đơn/hẻm online: Sân chơi chung tiến độ; Tái sinh NG+ chỉ chơi đơn; Chào mừng quay lại chạy cục bộ. Test: coopClient.test.ts. Chi tiết: docs/progress-archive/BACKLOG-parity-GD288.md.

## Mục lục giai đoạn đã xong (chi tiết trong archive)
- GĐ400–449 (test vườn, khách quen gọi tên, Tiệm xôi, quán nước thời tiết/pha chế/bậc/tự pha, sạp xôi 3D): docs/progress-archive/PROGRESS-GD400-449.md

- GĐ1–250: xem docs/progress-archive/INDEX-GD1-250.md
- GĐ251–300: xem docs/progress-archive/INDEX-GD251-300.md
- GĐ301–349: xem docs/progress-archive/INDEX-GD301-349.md
- GĐ350–381: xem docs/progress-archive/INDEX-GD350-381.md

- GĐ359–363 — 🧹 QA thưởng quay lại theo cấp, mobile 375px, ngất đúng giờ; gỡ 31 tên import không dùng (tsc sạch, 2361 test, bundle 596/253); chuyển mục lục GĐ251–300 sang archive (PROGRESS.md 25KB)
- GĐ382–393 — test bổ sung (nhắc hàng hỏng, nhập hàng, hợp đồng, thành tựu, rival, kỹ năng, tên tiệm) + Leader review GĐ384; chi tiết dồn archive.
- GĐ394 — 🧭 Leader review (GĐ384–394): 252 file / 2506 test xanh 173s (cùng dải dao động tải máy), tsc sạch, build OK, chunk chính gzip 244KB (<255), PROGRESS.md ~29KB (cần gọn lại sớm). Chỉ thêm test (acceptContract, thành tựu, hết hạn chào bán rival, nhập bù đơn điện thoại, learnSkill, tên tiệm/trang phục); gameplay/ngân sách không đổi. Phủ slice/biz.ts gần bão hòa — các hàm còn lại đều đã có test riêng. Chờ save thật (NG+, nhiệm vụ ngày 1–5). Review kế ~GĐ404; khi hết gap test, ưu tiên chiều sâu gameplay.
- GĐ395 — 🗜️ Dồn mục lục GĐ350–381 (26 dòng) sang archive/INDEX-GD350-381.md; PROGRESS.md 29KB → ~23,6KB
- GĐ396: QA save sạch @127.0.0.1:5173 tải lại bình thường. Console cũ có lỗi HMR 'emptyTiers before initialization' (chu trình import store → stock → biz → store); chỉ xảy ra khi Vite hot-reload store.ts, tải mới/bản build không lỗi — chỉ dev → ĐÃ SỬA GĐ397.
- GĐ397 — 🔁 Gỡ vòng import stock→biz→store: spoilFactor/theftFactor chuyển sang data/biz.ts (core/biz re-export, API giữ nguyên); stock.ts import từ data. 252 file/2506 test xanh 161s, tsc sạch, build OK (gzip 244,5KB <255). Rà thời tiết: nhu cầu theo thời tiết (customers.ts), hỏng hàng, đơn điện thoại, nhiệm vụ đồ mưa đã có — trục này đã sâu, không làm thêm.
- GĐ398 — 📏 Đồng bộ bảng "Ngân sách chống phình" trong promt_game(.full).md theo hằng số test (HUD 20, thông báo 90/0, ngày 1 = 10, thưởng/lãi 1.0/0.92/0.67, bundle 598/255, rò rỉ +2%/+20, test ~3 phút) — bảng cũ ghi số trước GĐ306 khiến phiên mới dễ làm lại việc đã xong. QA @5173: màn khởi đầu tải, không lỗi console. Mọi trần đạt đích; trục chiều sâu bão hòa, chờ save thật.
- GĐ399 — 🧹 Hạ trần rò rỉ object ngoài tiệm 2% → 0% (đo 563 → 563 suốt 6 ngày) trong longSessionLeak.test.ts; nhân vật sống giữ +20 vì dao động theo khách đang ở ngoài. Test xanh, tsc sạch.
- GĐ450: Nút nâng lên Quán cà phê ghi thêm '+1 ô món'.
- GĐ451: QA sandbox: nút nâng ghi '+1 ô món', sau nâng thực đơn hiện x/5.
- GĐ452: QA sandbox: gợi ý P 'còn 4 mẻ' và 'đã pha hết mẻ' đúng.
- GĐ453: Việc tay cho XP: tự đồ xôi +4, tự pha 1 mẻ nước +2.
- GĐ454: Test XP +2 cho mỗi mẻ tự pha ở quán nước.
- GĐ455: Món mới Sinh tố xoài (cấp 39, 30k, xoài + sữa đặc + đá) — xoài trồng được ở trại.
- GĐ456: Tách lazy BranchAlert/RivalAlert/StoryAlert sang HudAlerts.tsx — tải ban đầu về lại 598 KB sau GĐ455 lỡ lên 599.
- GĐ457: QA sandbox: StoryAlert lazy vẫn hiện (Bà Năm · Chương 1) sau tách GĐ456.
- GĐ458: FestivalBanner cũng tách lazy sang HudAlerts.tsx (chừa chỗ ngân sách tải ban đầu).
- GĐ459: Tách lazy TodayAgendaStrip+IdleChip sang HudAgenda.tsx — tải ban đầu 598→595 KB.
- GĐ460: QA sandbox: FestivalBanner và dải hẹn hôm nay (lazy) hiện đúng, không lỗi console.
- GĐ461: Mở rộng bếp xôi (cấp 42, 20tr): giữ 120 phần/món, sức nấu ×1.5 (expandTiemXoi, big? tuỳ chọn).
- GĐ462: Sạp xôi 3D thêm nồi thứ hai sau quầy khi đã mở rộng bếp (setBig).
- GĐ463: QA sandbox: mở rộng bếp xôi chạy (big=true), sạp hiện bình thường; nồi thứ hai quá nhỏ ở góc camera mặc định để thấy rõ.
- GĐ464: Thành tựu mới: Quán cà phê (+2tr) và Bếp xôi lớn (+1,5tr).
- GĐ465: Đưa 2 thành tựu mới xuống cuối danh sách (không chen lên đầu bảng).
- GĐ466: Dồn GĐ400–449 sang docs/progress-archive/PROGRESS-GD400-449.md, PROGRESS 37,6→27 KB.
- GĐ467: Quán nước cuối tuần (T7/CN) khách ×1.2 — áp cho ngày bán thật và dự phóng trong bảng (quanWeekendMul).
- GĐ468: Bảng quán nước ghi '🎉 Cuối tuần: khách đông hơn ×1.2' vào T7/CN.
- GĐ469: Ước tính chở/nạp đồ uống cho quán (teahouseHaul, đơn nhập) tính cả cuối tuần ×1.2.
- GĐ470: Ghi Cần duyệt nâng tiệm xôi thành cửa hàng nhỏ (chờ người dùng chọn).
- GĐ471: Bảng quán ghi rõ 'bậc x/3: Quầy nước → Quán nước → Quán cà phê — cùng một cửa hàng' (người dùng tưởng cà phê là tiệm riêng).
- GĐ472: QA sandbox: bảng quán hiện 'bậc 3/3 … cùng một cửa hàng' và '🎉 Cuối tuần ×1.2' (ngày 6).
- GĐ473: Test teahouseFillPlan nạp nhiều hơn vào cuối tuần.
