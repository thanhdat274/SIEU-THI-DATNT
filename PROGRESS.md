# PROGRESS — Tạp Hóa Đầu Ngõ (tap-hoa-3d)

> Đọc file này TRƯỚC TIÊN khi bắt đầu phiên mới. File được giữ GỌN: chỉ tầm nhìn, trạng thái, quy ước, quyết định, backlog và mục lục giai đoạn.
> Chi tiết đầy đủ các giai đoạn (nguồn quyết định, công thức, QA, số liệu) nằm ở `docs/progress-archive/`: PROGRESS-GD1-153.md, PROGRESS-GD154-158.md, PROGRESS-GD154-180.md — tra bằng `grep -n "GĐ1xx" docs/progress-archive/*.md`.
> Quy ước: mỗi giai đoạn một commit; test phải xanh (`npm run test`) + build sạch (`npm run build`) trước khi duyệt. Ghi GĐ mới vào mục "Giai đoạn gần đây" (≤ ~15 dòng/GĐ); khi mục đó quá ~10 GĐ, dồn bản cũ sang archive (dồn xong chạy `node dev/archiveCheck.cjs` — GĐ1157 — đối chiếu 2 chiều: 0 tham chiếu ma, 0 archive thiếu mục lục) và chỉ để lại 1 dòng ở Mục lục.

## Tầm nhìn game (mọi quyết định phải đối chiếu với phần này — KHÔNG tự ý thay đổi)

**Game là gì?** Mô phỏng quản lý **tiệm tạp hóa Việt Nam trong một con hẻm** (3D, góc nhìn thứ nhất): người chơi vừa là chủ tiệm vừa đứng quầy — nhập hàng, bày kệ, định giá, tuyển người, mở rộng sang trại/bếp/chi nhánh/quán nước/bán online, sống cùng con hẻm với khách quen, đối thủ và lễ hội.

**Cảm giác cốt lõi:** niềm tự hào của người chủ nhỏ dần thành cơ ngơi — "tiệm nhỏ đầu ngõ, mình chăm chút từng ngày, khách quen gọi đúng tên mình". Ấm áp, đời thường, đậm chất hẻm Việt Nam.

**Vòng lặp chơi chính (nesting):**
1. **Nhịp ngày (lõi):** sáng — Sổ đầu ngày (việc hôm nay + nhu cầu quầy + nhập/nấu/bày) → giữa ngày — đứng quầy, chốt deal, khách quen, đơn online → tối — chốt ngày, thu quà/nhịp.
2. **Nhịp dài:** tuần (thử thách) → tháng (mục tiêu) → mùa (sự kiện + Sổ Mùa) → năm (tổng kết) → NG+ Tái sinh.
3. **Trục tiến trình:** cấp mở khóa 10 hệ lớn × chiều sâu từng hệ (kệ, giá, nhân sự, trại→kho→bếp→quầy, chi nhánh 24/7, online) × quan hệ (khách quen, đối thủ, danh tiếng).

**Nguyên tắc thiết kế:** (a) mọi quyết định hằng ngày phải có dữ liệu phản hồi (không hộp đen); (b) phần thưởng phụ có cổng (không farming được); (c) không đổi công thức kinh tế khi thêm meta — meta chỉ soi sáng/ghi nhận; (d) UI ấm áp, gọn, rõ — dùng được khi chưa đọc hướng dẫn.

**Phong cách hình ảnh (UI 2D phủ trên thế giới 3D):** thế giới low-poly 3D màu ấm; UI (HUD, panel React, icon pixel 16×16) nền tím-than (#3a3a4d) accent vàng (#f1c40f); chữ/biển/bong bóng vẽ canvas 2D rồi dán lên vật thể 3D; icon emoji nhất quán, tiếng Việt đời thường. Tài sản 3D thủ công bằng Blender (low-poly stylized cùng bảng màu, theo mục "Tài sản 3D với Blender" trong promt_game.md). Bảng màu/biểu mẫu tập trung ở `src/ui/controls.css` + `src/ui/panels/shared.tsx`.

## Trạng thái hiện tại (06/11/2026)
- **GĐ1408 (Cà phê phin sữa — lối ra đầu tiên của cà phê xay nguyên chất, quầy pha)**: `ca_phe_xay` + `x_sua_dac` → 25 ly × 12k = 300k, vốn 172k, lãi 128k/mẻ, nấu 20 phút (phin nhỏ giọt mẻ lớn) → ~6,4k lãi/phút, dưới cà phê đen đá ~8,5k nên xếp hạng quầy pha giữ nguyên. unlock 64. (Kèm: sửa khối test GĐ1404 bị nhân đôi khi chép mẫu ở GĐ1407.)
- GĐ1404–1429 (lối ra bếp cho ~80 nguyên liệu chưa dùng, trong products.ts và catalog x_*; bia & snack đóng gói giữ bán thẳng): chi tiết ở docs/progress-archive/PROGRESS-GD1404-1407.md … PROGRESS-GD1427-1429.md
- **GĐ1403 (dời món về đúng trạm, rà tiếp theo góp ý người dùng)**: Cơm chiên trứng, Xôi chiên phồng, Cá hồi áp chảo: bếp nướng → **chảo chiên**; Bò hầm rượu vang: nồi hấp → **bếp nồi nấu**. Cả 4 mở ≥38 > golden 30 → sim/autoplay/tiệm xôi KHÔNG đổi (chỉ 3 test khẳng định trạm cũ sửa có chủ ý). Save cũ an toàn: món đang nấu dở chỉ đếm ngược, hoàn tất không kiểm trạm. Test `potStationName.test.ts` +3 (cấm món chiên ở bếp nướng / món hầm ở nồi hấp). Full suite xanh.
- GĐ1395–1401 (Mực nướng, QA mô hình nồi, Tôm nướng, Cua hấp bia, Tương ớt, Sinh tố dưa hấu, Mì ý — lối ra đầu tiên cho nguyên liệu chưa dùng): chi tiết `docs/progress-archive/PROGRESS-GD1395-1401.md`.
- GĐ1394: trạm hot_kettle đổi tên "Bếp nồi nấu 🍲" (góp ý người dùng) — id giữ nguyên để không vỡ save; chi tiết: docs/progress-archive/PROGRESS-GD1440-1447.md
- GĐ1382–1393 (món mới từ nguyên liệu có sẵn, gọn PROGRESS, đổi "Ấm nước nóng" → "Bếp nồi nấu" GĐ1394 xem dòng riêng): chi tiết `docs/progress-archive/PROGRESS-GD1382-1391.md`.
- GĐ960–1005 (tách file thuần + QA trình duyệt, chi tiết): `docs/progress-archive/PROGRESS-GD960-1005.md`
- Các mục GĐ930–949 / GĐ950–959 (tách panel/Hud): `docs/progress-archive/PROGRESS-GD930-949.md` · `docs/progress-archive/PROGRESS-GD950-959.md`
- Archive giai đoạn cũ (grep "GĐxx"): PROGRESS-GD1292-1381.md · PROGRESS-GD1287-1290.md · PROGRESS-GD1282-1286.md · PROGRESS-GD1276-1280.md · PROGRESS-GD1270-1274.md · PROGRESS-GD1258-1269.md · PROGRESS-GD1249-1257.md · PROGRESS-GD1236-1248.md · PROGRESS-GD1233-1235.md · PROGRESS-GD1222-1232.md · PROGRESS-GD1214-1221.md · PROGRESS-GD1210-1213.md · PROGRESS-GD1206-1209.md · PROGRESS-GD1198-1205.md · PROGRESS-GD1187-1197.md · PROGRESS-GD1189-1190.md · PROGRESS-GD1183-1187.md · PROGRESS-GD1170-1182.md · PROGRESS-GD1056-1081.md · PROGRESS-GD1082-1090.md · PROGRESS-GD1091-1097.md · PROGRESS-GD1098-1103.md · PROGRESS-GD1104-1108.md · PROGRESS-GD1109-1113.md · PROGRESS-GD1114-1118.md · PROGRESS-GD1119-1123.md · PROGRESS-GD1124-1128.md · PROGRESS-GD1129-1133.md · PROGRESS-GD1134-1137.md · PROGRESS-GD1138-1142.md · PROGRESS-GD1143-1146.md · PROGRESS-GD1147-1149.md · PROGRESS-GD1150-1151.md · PROGRESS-GD1152-1157.md · PROGRESS-GD1159-1160.md · PROGRESS-GD1161-1163.md · PROGRESS-GD1164-1169.md · PROGRESS-GD1042-1054.md · PROGRESS-GD790-929.md · PROGRESS-GD960-1005.md (trong `docs/progress-archive/`).
## Quy ước kỹ thuật cần nhớ

- **🧰 Sổ tay bảo trì (GĐ1167):** `npm run test` / `npm run build` / `npx tsc --noEmit` (cổng duyệt) · `npm run check:bundle` (ngân sách 538/597 KB) · `npm run audit:notify` (thông báo ≤90) · `npm run test:coverage` (độ phủ định kỳ) · `node dev/archiveCheck.cjs` (đối chiếu 2 chiều archive sau khi dồn — exit 1 khi lệch) · `dev/covrank.cjs` / `dev/covlines.cjs` (xếp hạng coverage) · `node dev/mutate_sw.cjs` (mutation SW). Chu kỳ: audit 10-GĐ · độ phủ ~30 GĐ · dồn archive ~5 GĐ · vệ sinh mã + làm mới nợ bảo mật khi tới hạn.

- **Khung modal cố định (GĐ662):** mọi panel dùng chung khung `styles.panel` cứng (desktop 760×min(688,100dvh−108), mobile 100vw−24 × 100dvh−96); KHÔNG đặt kích thước riêng cho panel nào, nội dung dài cuộn bên trong. Chuyển tab trong hub không được làm khung co giãn — test khoá `panelFrame.test.ts`.

- Thay đổi "soi sáng" (helper thuần đọc + thẻ UI gọn) là mẫu mặc định — **không đổi SAVE_VERSION/kinh tế/persist** trừ khi bắt buộc.
- **Bảng màu ngữ cảnh UI (GĐ166 — KHÔNG tự chế màu mới):** accent vàng `#f1c40f` · lời `#2ecc71` · lỗ/mất-thật `#e74c3c` · cảnh báo `#e67e22` · info `#3498db` · sự kiện `#9b59b6`; chip = nền rgba cùng màu chữ. Bậc cảnh báo: đỏ = mất tiền thật, cam = cảnh báo nên xử lý, vàng = theo dõi/đang tốt. (GĐ167: grep 6 màu lệch = 0; GĐ178: họ banner guide xanh dương đã gộp về info `#3498db` — toàn bộ src/ui chỉ còn các màu ngữ cảnh + họ buy-tone được duyệt.) **GĐ258 quét lại toàn bộ src/ui: chuẩn hoá 6 màu cũ còn sót trước GĐ166 về bảng duyệt** — `#e17055`→`#e67e22`, `#fdcb6e`→`#f1c40f`, `#00b894`→`#2ecc71`, `#d63031`→`#e74c3c`, `#ff8a7a`/`#ff8f7a`→`#ff7675` (buy-tone), `#c0392b` StaffPanel→`#e74c3c`; grep còn 0 (trừ màu NHẬN DIỆN được giữ: ArrangePanel màu loại đồ, GardenPanel họ riêng GĐ178, art SVG login/BuildPanel).
- **Thẻ nhấn mạnh dùng `Callout` (shared.tsx, GĐ166):** borderLeft 3px màu ngữ cảnh, tiêu đề 13px màu tone (`styles.cardTitle`), thân 12px; `strong` + danger → nền đỏ nhạt. Thẻ mới KHÔNG tự vẽ viền/tint riêng. HUD chip/alert dùng class CSS riêng (mẫu GĐ162).
- **Pipeline Blender (GĐ172–176):** script nguồn trong `scripts/` + G LB trong `public/models/kit/` được commit để dựng lại; chạy headless `blender -b -P scripts/blender_kit_atlas.py`; xuất Draco; lazy-load trong code (`kitProps.ts`), fallback warn khi load lỗi; prop chỉ hình ảnh KHÔNG chặn lưới điều hướng. Dung lượng: kit 7 prop (baked: `chau_cay`/`thung_go`/`khom_tre`/`bon_nuoc`/`cho_nhua`/`xe_day`/`rao_chan`) ~76KB baked tổng. Ngân sách: cap tris trong `build-kit-assets.ts`. KHÔNG commit file .blend nặng. 3D Artist giữ thư mục script/tài sản; Developer chỉ tích hợp.
- Test sim dùng **seed cố định** (`setSimSeed`/`simRng()` — GĐ27/28), không mock `Math.random`.
- **Hạ tầng test:** sim seed TẤT ĐỊNH — logic qua `simRng()`, không Math.random/Date.now (chỉ hình ảnh 3D còn). `simGolden.test.ts` bắt tất định vỡ + lệch ±5% — đổi kinh tế CÓ CHỦ Ý thì chép số vào `GOLDEN` + ghi lý do. `test:coverage` mỗi ~10 GĐ (ưu tiên core/data/agents/save). `saveStore`/`staffAgent` đã mutation-check.
- **Co-op = chơi đơn (30/10):** máy khách nhận `true` tạm cho mọi thao tác → lời báo kết quả nằm TRONG thao tác (`notify`), cần kết quả thật thì `lastActionResult()`, cần dữ liệu thì ghi state chung (vd. `wheelLastPrize`). Không `useGame.setState` cả object lớn từ UI (thành PATCH đè máy chạy) → làm thao tác (vd. `dismissUnlockAct`); trường máy chạy tự tính mỗi khung → `NO_PATCH` (`atBranch`). Câu hỏi quầy gửi kèm gói state (`sharedAsk`/`applyRemoteAsk`), ai trong hẻm đứng quầy cũng được hỏi, ai bấm trước thì chốt. `coopClient.test.ts` (26 test, mutation 16/16). Checklist 5 câu ở promt_game.md mục Tester.
- QA live trên `localhost:5173`; kiểm 0 tràn ngang @320/390 (`scrollWidth == clientWidth`), 0 lỗi console. **GĐ297:** phép so `scrollWidth == clientWidth` KHÔNG đủ — `html/body` là `overflow: hidden` nên nút lòi ra bị cắt mà vẫn báo 0 tràn. Từ nay chạy thêm `game.layoutAudit()` (dev tool `src/dev/layoutAudit.ts`) ở mỗi cỡ màn: `clipped: []` mới là đạt; `overBy` dương là số px bị cắt.
- **GĐ719 — mẹo QA thời gian trong IAB:** tab nền bị đóng băng rAF → đồng hồ game đứng (GĐ665). Chạy `window.game.useGame.getState().tick(1)` thủ công trong evaluate để đẩy thời gian từng nhịp (MPS ≈ 2 phút game/tick ở 1×; dùng speed cao sẽ nhảy cả ngày). updateOnline chạy trong tick — đơn mới xuất hiện giữa các tick và hết hạn sau 20′, phải đọc state SAU MỖI tick, không đọc cuối vòng. Thao tác bấm nút trong panel có thể mất vì React vẽ lại liên tục khi đồng hồ chạy — gọi thẳng action store (`acceptOnline(...)`) khi cần chắc chắn.
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
> Ghi chú 05/11/2026: đã rà lại + kiểm chứng số liệu thật. Các mục ✅ đã xong (giữ lại vết để đối chiếu); các mục ⏳/🕳️ còn mở là vì **chờ điều kiện NGOÀI tầm dev** (bản vá upstream / tab trình duyệt thật) — không phải nợ thiếu trách nhiệm.

- ✅ **GĐ1265 phần NÂNG dep patch an toàn — ĐÃ XONG** (verify lại 05/11: installed `dexie` 4.4.7 · `ws` 8.22.1 · `mongodb` 7.8.0 · `@types/node` 26.6.6 — khớp mục tiêu; full suite 466/3808 + tsc/build/bundle không đổi + co-op 110 xanh). Không nâng major (`firebase` 12→13, `three` 0.186→0.187, `dotenv` 17→18 — phá tương thích, chưa có lý do chơi, Luật 3). **Phần còn lại** (firebase-admin advisory) đã dồn về GĐ1073 bên dưới để không trùng dấu vết.
- ✅ **GĐ1263 followup — lập phiên hẻm qua automation ĐÃ THÀNH CÔNG** (hẻm 8BX6AP, tab a runner/tab b player; bằng chứng parity farm homegrown **16=16** trên host đồng bộ sang máy khách). Phiên rớt khi tab về nền → đúng thiết kế GĐ665, không phải lỗi parity. Vết tích user-fix (`AlleyPanel.tsx` + `login.css`: danh sách hẻm cuộn riêng 300px/38vh) đã ghi nhận — nội dung đúng, gates xanh.
- ✅ **GĐ330 — QA lưu máy khách ĐÃ CHỐT KHÔNG PHẢI LỖI** (127.0.0.1:5173 tải lại vào đúng ván; lần "mất ván" trước là bấm nhầm nút ván mới). **Đóng.**
- 📦 **GĐ515 — MỤC TIÊU ĐẠT, không còn là nợ**: tải ban đầu 356/597 KB gzip (từ 538), dư ~241 KB; chunk lớn 101/255; tải đầu bất biến nhờ tách three/WebGPU+TSL + bỏ Draco (GĐ1196–1197). Chỉ còn "theo dõi headroom" — khi gần chạm trần 597/255 lại tách tiếp. Không phải việc treo.
- ⏱️ **GĐ675 — phần chính ĐÃ XONG**: render CPU cấp 10/18/24/34/41 đều đạt biên 4× throttle (cấp 41: 5,1 ms trung vị ⇒ ~20–31 ms < 33 ms). **Còn thiếu đúng 1 mảnh**: FPS thật máy yếu — cần môi trường chạy thật. Chi tiết: archive `PROGRESS-GD715-788-summaries.md`.
- ⏳/🕳️ **GĐ1263 (parity thu ngân GĐ1253 + juice GĐ1255 2 tab) + GĐ665/668 (vòng ngày 2 tab)** — chờ **2 tab trình duyệt THẬT** (artifact môi trường: tab nền đóng băng timer → server ngắt WS → reload, `coop.ts:339`). Parity 2 tính năng này **bảo đảm bằng kiến trúc + test**, không cần QA live: (1) GĐ1253 quyết định thu ngân nằm trong `counterDeal` phía MÁY CHẠY, không tạo `sharedAsk` → máy khách không thể thấy câu hỏi lệch; (2) GĐ1255 bong bóng sinh từ `farmSync.subscribe` trên state ĐỒNG BỘ — máy khách tự vẽ pop giống hệt; (3) không thao tác mới → `coopGuard` không đổi. Làm khi có QA tab thật (GĐ670); không tính là lỗi game.
- 🔐 **GĐ1073 (làm mới GĐ1142) — còn MỞ, chờ UPSTREAM** (khảo sát lại 05/11/2026): `npm audit --omit=dev` **10 cảnh báo (6 vừa/4 cao)**. Truy gốc chính xác:
  - **4 cao** = `@firebase/firestore@4.17.2 → @grpc/grpc-js@1.9.16` (nhánh **client** `firebase@12.19.0`); trong khi 2 bản `@grpc/grpc-js@1.14.6` phía **server** (`firebase-admin→@google-cloud/firestore`) **đã vá** (advisory nhắm ≤1.13.5). 
  - **6 vừa** = `minimatch@9.0.9` + `glob/rimraf` dưới `firebase-admin→firestore-api→google-gax` — chỉ **tooling build/server**, không ship vào bundle trình duyệt.
  - Đã thử `npm audit fix --omit=dev` (không `--force`) — **KHÔNG đổi gì** (cha chốt semver hẹp). Hết 10 cảnh báo buộc ép bump major transitive → vi phạm Luật 3. **Giữ chờ upstream** (firebase-admin 14.5.0 đã là bản mới nhất). Khi nâng firebase/firestore sau này: sạch cao nhờ grpc-js mới, cân lại vừa.

- ⏱️ (GĐ296–298) npm run test nhạy tải máy: 1 test đỏ lẻ không liên quan thay đổi vừa làm → chạy lại đúng file trước khi kết luận; máy rảnh mà vẫn >10 phút thì đo file chậm nhất rồi tối ưu.

## Backlog tiếp theo
- 🆕 **Người dùng ĐÃ DUYỆT (06/11/2026) — sửa theo playtest chơi thật ngày 1** (`PHAN-TICH-PLAYTEST-PERSONA-2026-11-06.md`, mục 4). Làm theo thứ tự, mỗi việc có test:
  - ✅ **P0 T1 (ĐÃ SỬA, test saveShopOpen):** snapshot lưu shopOpen (tùy chọn, thiếu = đóng), vào game đang mở → đứng sau quầy + báo; hẻm: runner nạp bản hẻm giữ đúng trạng thái. Gốc: vào lại game giữa ngày → tiệm tự đóng + về nhà, không báo (`shopOpen` không được lưu, `core/save.ts`). Lưu/khôi phục trạng thái mở cửa (save cũ thiếu trường → mặc định đóng), kiểm cả hẻm online.
  - ✅ **P0 T2 (ĐÃ SỬA):** "Nhập hàng" tích khi totals.spent > 0 hoặc có xe hàng; "Bày hàng" tích theo cờ tùy chọn biz.tutShelved (stockTier ghi) — save cũ không cần migrate (test tutorialStepsHonest).
  - ✅ **P0 T3 (ĐÃ SỬA):** bedHint() ẩn "[N] Đi ngủ" trước 18h (test bedHint); cảm ứng vốn đã đổi "[N]" → 👆 (Hud.tsx:454).
  - ✅ **P1 T4 (ĐÃ SỬA):** panel tải lười hiện "⏳ Đang mở…" (PanelLoading, test panelLoading).
  - ✅ **P1 T5 ĐÃ SỬA** (ngày 1 điền gợi ý ≤40% tiền mặt; tổng kết ngày 1 đưa lãi gộp bán hàng lên đầu — test suggestBudget, day1SummaryHeadline).
  - P2 T6 THỬ RỒI HOÀN TÁC (06/11): khóa cám heo→cấp 20, cám bò→24 làm sim cấp 5 (economySimL5, seed cố định) tụt lãi bán +189.800→−10.067đ/ngày — bot xoay vòng hàng theo danh sách mở khóa, cám bao 5kg là món giá cao bán được ở cấp thấp. Muốn làm phải thay món tạp hóa giá tương đương ở cấp 1 trước. T9 ĐÃ SỬA: Ra tiệm/Ra trại camera nhảy thẳng (snapTo), không lia qua cảnh — test cameraSnap. T7 ĐÃ SỬA: tab mối nhập chỉ hiện mối mở + 1 mối khóa gần nhất, còn lại gộp "+N mối nữa" (test visibleSuppliers). T8 ĐÃ SỬA: chơi đơn mở Nhập hàng lúc tua nhanh → hạ về 1× (hẻm online không đụng) — test orderSlowdown.
- 🆕 **Người dùng ĐÃ DUYỆT (06/11/2026) — đợt 2 playtest giữa game** (`PHAN-TICH-PLAYTEST-PERSONA-DOT2-2026-11-06.md`, mục 5). Mỗi việc có test:
  - ✅ **P0 M2 (ĐÃ SỬA, test cookPanelZero):** Sổ nấu in "0" lạc ("/mẻ0") — `ui/panels/CookPanel.tsx:123,133` dùng `{own && …}` với `own` là số; đổi `own > 0 &&`.
  - ◐ **P0 M1 (ĐÃ GIẢM, test gfxLowShield):** mức Thấp hạ độ nét tới 0.6 (trước 0.75) khi < 45 FPS — không bớt NPC ở mức chọn tay (giữ quyết định GĐ1235). Còn: đo lại trên Chrome thật cấp 29; nếu vẫn < 30 thì soi CPU (9 NV + đám đông), không phải GPU.
  - ✅ **P0 M4 (ĐÃ SỬA, test alertCap + soi trình duyệt):** tối đa 2 thẻ thông báo (nguy cấp + hướng dẫn ngày đầu luôn hiện), còn lại gom sau nút "+N thông báo".
  - ✅ **P1 M3 (ĐÃ SỬA, test reviveLots):** GỐC là lỗi save — life Infinity qua JSON thành null → hàng gia dụng (diêm…) báo cận hạn và BỊ HỎNG qua đêm sau mỗi lần nạp; applySnapshot giờ trả null → Infinity. Cảnh báo gộp cùng tên, bỏ lặp số tiền.
  - ✅ **P1 M5 ĐÃ SỬA:** menu Thêm gom nhóm (test groupTools); tiêu đề nhóm chừa 6px cho huy hiệu nút dưới (test landscapeTimeChip).
  - ✅ **P1 M7 ĐÃ SỬA:** màn thấp ≤480px ô đồng hồ còn 1 dòng (giờ + ngày), HUD trên ~135→95px (test landscapeTimeChip).
  - ✅ **P1 A1 (ĐÃ SỬA, test trendMark):** ▲/▼ cạnh lãi/lỗ ở 9 bảng (Tổng kết, Lịch sử, Sổ nấu, Combo, Giá, Online, Quán, Tiệm xôi, Kỳ).
  - ✅ **P1 (đã rà):** "vẫn lời −38.400đ" không tái hiện — VendorAlert.tsx:42 chỉ in "vẫn lời" khi rush.net > 0, lỗ thì in "không còn lời".
  - P2 M8 — Leader quyết (06/11): GIỮ "Chơi lại từ đầu" trong menu tài khoản (đã có confirm + nút đỏ); game chưa có màn Cài đặt, dựng màn mới chỉ để chứa 1 nút trái Luật chống phình. Chữ to / tiết kiệm pin: để khi có playtest nhắc lại.
- ✅ Trục "vòng đời nông sản nhà" ĐÃ KHÉP (GĐ1088–) — chi tiết: docs/progress-archive/PROGRESS-GD1440-1447.md

- ✅ **Người dùng ĐÃ TRẢ LỜI (GĐ1076): CHƯA mở Ngõ 3 — chiều sâu chưa khai thác hết.** Hướng chiều sâu do người dùng chỉ định, làm TRƯỚC mở rộng: (1) thêm sản phẩm/công thức mới ở tạp hóa, nông trại, quán nước, tiệm xôi; (2) cơ chế nhập hàng NGOÀI tạp hóa để đa dạng hàng bán; (3) liên kết thị trường/quan hệ hàng xóm: nhiều nguồn cung nguyên liệu tự làm tại gia của hàng xóm. Chiều rộng để SAU (người dùng liệt kê làm hướng tương lai): cùng đầu tư, chuỗi sản xuất chế biến từ sản phẩm nhà/hàng xóm, chi nhánh đi lại giữa các khu. Ngõ 3 chỉ làm khi người dùng chốt lại.
- ✅ **Chiều sâu bán online (GĐ715–719) ĐÃ XONG + QA đạt; audit GĐ720 đã chạy** (chi tiết trong archive).
- ✅ **Đường đời nhân viên (GĐ727–731) ĐÃ XONG** — gồm nhân viên chi nhánh xin nghỉ mai (băm riêng, không migration, coopGuard GUARDED); chi tiết trong archive.
- ✅ **Trục tín dụng/nợ — lát cắt trả góp ĐÃ XONG (GĐ734) + QA (735).** Đánh giá bằng số (audit GĐ740): mọi trục lớn ĐỦ SÂU theo coverage 58,22/90,09 và autoplay/simGolden xanh — chuỗi GĐ741+ ưu tiên: rà backlog nợ mở (GĐ675 CPU render cuối-game, refactor UI khi đụng panel) và QA tự nhiên các trục mới trước khi tính mở rộng.
- ✅ **Đã duyệt (GĐ483):** người dùng chọn (a) — tiệm xôi thành cửa hàng nhỏ có nhà. Sạp/quầy hàng rong sau này bán ở ngõ khác khi **mở rộng bản đồ** (hướng kiểu Cities: Skylines 2: thêm ngõ/khu mới mở dần) — backlog lớn.
- 🗺️ **Mở rộng bản đồ B1–B5 ĐÃ XONG (GĐ497–505); đang làm chiều sâu Ngõ 2 (món sạp GĐ507–511, nâng sạp GĐ513).** Kế hoạch gốc: B1 khung "khu" dữ liệu (id, ranh giới, cấp/tiền mở, gốc toạ độ) + save `zones?` tuỳ chọn; B2 mở "Ngõ 2" phía bắc: đường + lô đất trống, biển RAO BÁN; B3 sạp/quầy hàng rong (xôi, nước mía, bánh mì) chỉ đặt ở ngõ mới; B4 khách/NPC đi lại giữa các khu, lưới đi lại theo khu; B5 bản đồ thu nhỏ hiện khu đã mở/chưa mở. Giữ ngân sách bundle (khu tải lười).
- ✅ **Cửa hàng nước thật B1–B5 ĐÃ XONG (GĐ424–428):** nhà quán, vào trong được, khách ngồi, tự pha, Quầy→Quán→Cà phê. Chiều sâu sau đó: thời tiết, đồ nóng, thực đơn (GĐ414–494).

- 🔍 **Rà 3 cơ sở (GĐ413, theo yêu cầu người dùng trước khi mở rộng tiệm xôi):**
  - Cửa hàng tiện lợi: luật chơi SÂU (ca kíp, mệt mỏi, sự cố đêm, máy bán hàng, điện, nhóm khách đêm). Nợ: BranchPanel 297 dòng gánh hết, cần soát độ rối; QA 3D xong GĐ527.
  - Nông trại: SÂU (mùa vụ, 7 vật nuôi, công trình 3 sao, đơn đặt hàng, phụ trại; world/farm.ts 996 dòng). QA 3D xong GĐ528.
  - Quán nước: ĐÃ KHOÉT SÂU — chi tiết dời sang docs/progress-archive/PROGRESS-GD1440-1447.md
  - Thứ tự sửa: ~~(1) thời tiết~~ xong GĐ414, ~~(2) chọn món~~ thành thực đơn pha chế GĐ415, ~~(3) 3D quán dùng kit~~ (đã có setQuanDecor: chậu cây + băng ghế), ~~(4) gọn BranchPanel~~ xong GĐ417, ~~(5) QA 3D~~ GĐ419 +GĐ420 đủ cả ba. Tiệm xôi phần còn lại để sau.
  - QA 3D cần save thử riêng: không có chế độ sandbox, không được sửa save thật của người dùng.

1. 🧹 **Nợ refactor UI (đo GĐ685, làm khi đụng panel đó hoặc hết việc chơi sâu):** `ReportPanels.tsx` (nay còn 550 dòng ở `src/ui/panels/`, GĐ898 đo lại — nợ ĐÃ HẾT; từng là 1.632 dòng chứa 6 panel (history/records/analytics/dossier/roadmap/discovery) → tách theo file; `BusinessPanel.tsx` (ĐÃ tách GĐ876 → 573 dòng). BranchPanel 297 dòng — nợ cũ GĐ417 ĐÃ ỔN, gỡ khỏi backlog. Chỉ tách khi có lý do chơi (sửa tính năng trong panel đó), không refactor thuần (Luật 1).
2. **Trục đã cạn:** 3D trang trí (chỉ làm 3D mới khi đi kèm gameplay — GĐ172–198) · multi-shop supply chain (GĐ199–209, khép mạch) · bộ soi tiền/vốn (GĐ210–251) · UI nợ (GĐ183/258) · chợ phiên (GĐ182).
2. **Khoá chờ save người thật:** NG+ vòng (GĐ171) · nhiệm vụ ngày 1–5 (GĐ254 đã giảm lặp). (GĐ110/117 ĐÃ ĐÓNG GĐ280 bằng số liệu; Arc E "Hàng xóm khai trương" ĐÃ HOÀN THÀNH GĐ283, 27 test cấu trúc xanh).
3. **Ý tưởng chờ Leader duyệt (chiều sâu, chưa làm):** (a) nhịp cuối tuần đậm hơn — **ĐÃ HOÀN THÀNH GĐ291** (lô chợ phiên đầu tháng nhận biết món ăn vặt cuối tuần + gợi ý trữ hàng đặc biệt); (b) nhiệm vụ tuần/tháng biết đến thứ/ngày trong kỳ — **ĐÃ HOÀN THÀNH GĐ289** (nhịp tháng monthPace hiển thị ngày còn lại tới hết tháng + dự báo kịp/hụt và bảo vệ chuỗi tháng).
4. 👥 **Đủ 2 chế độ (ĐÃ CHỐT GĐ288):** khoá chính sách parity chơi đơn/hẻm online: Sân chơi chung tiến độ; Tái sinh NG+ chỉ chơi đơn; Chào mừng quay lại chạy cục bộ. Test: coopClient.test.ts. Chi tiết: docs/progress-archive/BACKLOG-parity-GD288.md.

## Mục lục giai đoạn đã xong (chi tiết trong archive)

- Mục lục đầy đủ đến GĐ1391: `docs/progress-archive/INDEX-MUC-LUC-DEN-GD1391.md` (grep "GĐxx"). GĐ1382–1391 tóm tắt ở mục Trạng thái hiện tại; GĐ1392 gọn PROGRESS 190→37KB; GĐ1393 dời mục lục để PROGRESS < 30KB.
- GĐ1409 (Sữa chua granola — lối ra đầu tiên của ngũ cốc granola ở máy xay): 14 cốc×18k, unlock 68. Dời GĐ1395–1401 sang archive. Full suite 503/4518 xanh.
- GĐ1430–1434 (catalog đợt 10–11; test ingredientOutlet + RETAIL_ONLY; Sổ nấu gộp món khóa xa; rải 45 món cấp 35→35–57): docs/progress-archive/PROGRESS-GD1430-1434.md
- GĐ1435–1439 (mô tả trạm; quán nước +3 món trái cây; tiệm xôi +2; lạp xưởng bà Tám + chà bông nhà làm kèm lối ra): docs/progress-archive/PROGRESS-GD1435-1439.md
- GĐ1440–1447 (mọi trái cây vườn có lối ra bếp; giò thủ/me dầm bà Tám, chanh muối hàng xóm 1 kèm lối ra bếp & quán): docs/progress-archive/PROGRESS-GD1440-1447.md
- GĐ1448–1462 (13 món nối hàng xóm/chanh muối/me dầm; GĐ1455 🧭 DỪNG thêm món dưới cấp 50 vì economySimL50 daily_smile sát ngưỡng 22 — món mới đặt ≥51): docs/progress-archive/PROGRESS-GD1448-1462.md
- GĐ1463–1481 (công thức cấp 59–77): docs/progress-archive/PROGRESS-GD1463-1481.md
- GĐ1482: Cháo lạp xưởng (cấp 78, nồi nước: 2 gạo + 1 lạp xưởng → 14, bán 23k).
- GĐ1483: Tôm khô nhà phơi (hàng xóm, cấp 52, 58k→90k) + lối ra Cháo tôm khô (cấp 79, nồi nước: 2 gạo + 1 tôm khô → 14, bán 22k).
