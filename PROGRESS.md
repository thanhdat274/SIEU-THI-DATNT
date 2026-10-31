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

1. **Trục đã cạn:** 3D trang trí (chỉ làm 3D mới khi đi kèm gameplay — GĐ172–198) · multi-shop supply chain (GĐ199–209, khép mạch) · bộ soi tiền/vốn (GĐ210–251) · UI nợ (GĐ183/258) · chợ phiên (GĐ182).
2. **Khoá chờ save người thật:** NG+ vòng (GĐ171) · nhiệm vụ ngày 1–5 (GĐ254 đã giảm lặp). (GĐ110/117 ĐÃ ĐÓNG GĐ280 bằng số liệu; Arc E "Hàng xóm khai trương" ĐÃ HOÀN THÀNH GĐ283, 27 test cấu trúc xanh).
3. **Ý tưởng chờ Leader duyệt (chiều sâu, chưa làm):** (a) nhịp cuối tuần đậm hơn — **ĐÃ HOÀN THÀNH GĐ291** (lô chợ phiên đầu tháng nhận biết món ăn vặt cuối tuần + gợi ý trữ hàng đặc biệt); (b) nhiệm vụ tuần/tháng biết đến thứ/ngày trong kỳ — **ĐÃ HOÀN THÀNH GĐ289** (nhịp tháng monthPace hiển thị ngày còn lại tới hết tháng + dự báo kịp/hụt và bảo vệ chuỗi tháng).
4. 👥 **Đủ 2 chế độ (ĐÃ CHỐT GĐ288):** Hoàn thành rà soát và khoá chính sách parity cho 2 chế độ: (a) Sân chơi GĐ287 (chung tiến độ/lượt ngày); (b) Tái sinh NG+ (doPrestige) và Chào mừng quay lại (checkWelcomeBack) giữ nguyên thiết kế an toàn: Tái sinh NG+ chỉ chạy ở chơi đơn (bảo vệ thế giới hẻm online không bị reset đột ngột làm mất dữ liệu của đồng đội), Chào mừng quay lại chạy cục bộ theo máy để thưởng công bằng khi người chơi đăng nhập trở lại mà không tạo lạm phát hay gian lận két tiền chung. Đã bổ sung bộ test tự động trong coopClient.test.ts.

## Mục lục giai đoạn đã xong (chi tiết trong archive)

- GĐ1–250: xem docs/progress-archive/INDEX-GD1-250.md

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
- GĐ272 — 🖼️ Quét đăng nhập + menu Thêm @320/390/768 — 0 lỗi, chốt chuỗi rà soát màn hình
- GĐ273 — 🔮 Dự báo "tuần mai khách săn" trên Nhập hàng tối CN + audit trending/weeklyChallenge
- GĐ274 — 🔮 Mồi tuần mới tối CN trong Mai tiệm có gì (khớp GĐ273)
- GĐ275 — ⏰ Lịch tự động chỉnh giờ mở cửa 6h–8h (autoOpenAt + xoay vòng preset trong menu hồ sơ)
- GĐ276 — ⏰ Dòng lịch tự động trên Sổ đầu ngày (autoOpenNote)
- GĐ279 — 🧾 Note biết thu ngân tự mở cửa sáng sớm (cashierOpensMorning)
- GĐ280 — 📊 Đóng GĐ110/117 bằng số liệu (xương sống 24–26/28; quest hành động bot không làm)
- GĐ281 — 👥 Lock độ phủ 28 khách quen (tất cả ghé được, phân phối <2×)
- GĐ282 — 📖 QA mắt 4 arc A–D trọn vẹn — MỞ gate arc E
- GĐ283 — 🎊 Arc E "Hàng xóm khai trương" (thay cam_do_mo)
- GĐ284 — 🧹 Dồn GĐ283 sang archive
- GĐ285 — ⏰ Khoá cấu trúc TIME_BANDS (liên tục 6h–22h, wants món thật, phân loại)
- GĐ280 — 📊 Đóng GĐ110/117: đo nhiệm vụ cấp 50 (xương sống 24–26/28; 8 quest hành động bot không làm) + test khoá tín hiệu
- GĐ277 — 💾 Khoá autoOpenAt qua save (3 test) + lock chợ phiên luôn rơi Chủ nhật
- GĐ278 — 👀 QA mắt thẻ CÓ dữ liệu GĐ155–159 (thú cưng/hụi/khủng hoảng/bỏ lỡ) — đóng watch-item
- GĐ286 — Co-op: hội thoại cốt truyện không dừng giờ hẻm + ngất khuya khi có người ngủ
- GĐ287 — 🏗️ Sân chơi dùng chung ở hẻm online (1 lượt/ngày theo state chung; chặn góp kép, test co-op)

- GĐ288 — 👥 Co-op parity: khoá chính sách tái sinh NG+ & chào mừng quay lại
- GĐ289 — 📆 Nhịp tháng vận hành: monthPace, dự báo hoàn thành thử thách tháng & cảnh báo chuỗi
- GĐ290 — 🧺 Chợ phiên đầu ngõ thành việc sáng trong Việc hôm nay (Sổ đầu ngày)
- GĐ291 — 🍬 Lô chợ phiên đầu tháng nhận biết món ăn vặt cuối tuần & gợi ý trữ hàng
- GĐ292 — 🧺 Đồng bộ bán chợ phiên ở co-op (sellMarketSurplus qua runner, chặn trùng phiên)
- GĐ293 — 🛒 Thương lái đầu tháng thành việc sáng trong Việc hôm nay (fairMerchantAction)
- GĐ294 — 🩹 Hoàn tất tích hợp fairMerchantAction bị sót ở GĐ293 + test guard đọc source
- GĐ295 — 🧍 Tổng kết đội hôm qua thành việc sáng (morningShiftAction, khép vòng GĐ248/253)
- GĐ296 — ✅ Coverage sweep: khoá `buyLicense` (cấp mới/gia hạn cộng nối tiếp) + trọng số & fee dịch vụ
- GĐ297 — 🔎 Nút HUD bị cắt ở 320px (`.hud-meta` cap 120px + nowrap) + `game.layoutAudit()` chốt lỗ mù "0 tràn"
- GĐ298 — 🔍 QA layout 38 panel × 320/390/768/1280 (140 lượt): 0 nút bị cắt; tách `clipped` vs `inScroller` trong audit
- GĐ299 — 🧭 QA người chơi mới trên save mới @390px: đúng 7 click tới khách đầu tiên, checklist tự tick 4/5, 0 lỗi
- GĐ300 — 👥 Co-op parity: việc sáng 🧍 chốt sẵn ở máy chạy (`lastSummary.staffIdle`) để máy khách thấy y hệt
- GĐ301 — ✂️ Rút 22 thông báo dài về ≤90 ký tự, trần ngân sách 90/0
- GĐ302 — 🔕 Báo hết hàng 1 lần/ngày, thông báo ngày đầu 27→22
- GĐ303 — 📦 Hạ trần bundle 780/380 KB; full suite 2356 xanh
- GĐ304 — ⚡ Bảng tải lười: tải đầu 758→646 KB, trần bundle 680/300
- GĐ305 — ⏱️ Tách economySim thành 3 file song song: test 427s → 194s
- GĐ306 — 🧹 Gộp 6 nút tra cứu thành "Sổ sách" (tab): nút HUD 33→28
- GĐ307 — 🧹 Hub tab Danh tiếng/Mở rộng: nút HUD 28→20 (đạt mục tiêu)
- GĐ308 — 📦 Firebase nạp động + chunk riêng: tải đầu 646→618 KB, trần 640/290
- GĐ309 — 🔕 Dời 4 thông báo phụ khỏi ngày đầu: 22→18, trần 20
- GĐ310 — 🔒 Hạ trần rò rỉ: object +2%, nhân vật +20 (đo 0% / +11)
- GĐ344 — 🧪 QA bán hàng ngày 2/3 (save sạch): mở cửa, tiền đổi, không lỗi mới
- GĐ343 — 📦 Siết trần bundle 598/255
- GĐ336–342 — 📦 Bundle 596 KB (nạp lười STORIES/SURPRISES/GLTF, test hợp đồng); QA gfx=low ~58 FPS, mobile/tablet không tràn; Leader review GĐ337
- GĐ332 — 💰 % kèo 25/40/65; tỉ số thưởng/lãi 0,99/0,89/0,64
- GĐ331 — 🔕 Thông báo ngày 1 đếm đúng ngày → 10, trần 10
- GĐ330 — 🧭 QA lưu máy khách + ngày 1→2: không lỗi
- GĐ329 — 🪙 Thiếu tiền lẻ mở từ cấp 2 (lần bán đầu sạch)
- GĐ328 — 🧭 Đo lần bán đầu: ~4 phút (≤5 ✅); khách đầu gặp hộp thoại thiếu tiền lẻ
- GĐ327 — 🧮 Rà ngân sách đợt GĐ316–326; siết trần bundle 625/275
- GĐ326 — 🔕 Ẩn thông báo Sổ tay mốc nhỏ ngày 1; thông báo ngày 1 = 11, trần 12
- GĐ325 — 💰 Trần thưởng 0,37×/66k; tỉ số 1,07/0,98/0,67 (cấp 10 ≤1)
- GĐ322 — 💰 Trần thưởng 0,4×/sàn 70k; tỉ số 1,13/1,02/0,71 (≈1)
- GĐ321 — 🎯 Sim kinh tế tất định (seed); trần tỉ số 1,6/1,4/1,05, thông báo ngày 1 ≤13
- GĐ319 — 🧭 Ngày 1: ẩn Mối quen/Dự báo/khách săn trong panel Nhập hàng
- GĐ316 — 🔕 Đo thông báo ngày 1 đúng người chơi (bỏ 📜/🎯): 11–14, trần 15
- GĐ312 — 💰 Hạ trần thưởng nhiệm vụ (sàn 110k, ×0,6); tỉ số 1,44/1,17/1,17
- GĐ311 — 💰 Đo tỉ số thưởng/lãi bán: 1,7–2,0 / 1,4–2,0 / 0,94–1,53; trần 3/2,5/1,8
