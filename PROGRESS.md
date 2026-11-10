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

## Trạng thái hiện tại (10/11/2026)
- GĐ2161–2162: Sò huyết làm sẵn (x_so_huyet, cuối catalog L170); Sò huyết nướng mỡ hành (food_grill, L198), Sò huyết xào tỏi (fryer, L199).
- GĐ2159–2160: Tôm tít làm sẵn (x_tom_tit, cuối catalog L170); Tôm tít rang muối (fryer, L198), Tôm tít hấp sả (steamer, L199).
- GĐ2157–2158: Cá chim làm sẵn (x_ca_chim, cuối catalog L170); Cá chim nướng giấy bạc (food_grill, L198), Cá chim sốt cà chua (hot_kettle, L197).
- GĐ2155–2156: Hàu làm sẵn (x_hau, cuối catalog L170); Hàu nướng mỡ hành (food_grill, L198), Hàu chiên giòn (fryer, L199).
- GĐ2153–2154: Ghẹ làm sẵn (x_ghe, cuối catalog L170); Ghẹ rang muối (fryer, L198), Ghẹ nướng sa tế (food_grill, L199).
- GĐ2151–2152: Bạch tuộc làm sẵn (x_bach_tuoc, cuối catalog L170); Bạch tuộc nướng (food_grill, L198), Bạch tuộc xào sa tế (fryer, L199).
- GĐ2149–2150: Sò điệp làm sẵn (x_so_diep, cuối catalog L170); Sò điệp hấp sả (steamer, L198), Sò điệp xào nấm (fryer, L199).
- GĐ2147–2148: Thịt dê làm sẵn (x_de, cuối catalog L170); Dê xào lăn (fryer, L198), Dê nướng sa tế (food_grill, L199).
- GĐ2145–2146: Cá kèo làm sẵn (x_ca_keo, cuối catalog L170); Cá kèo nướng ống tre (food_grill, L198), Cá kèo kho tộ (hot_kettle, L199).
- GĐ2143–2144: Chim cút làm sẵn (x_chim_cut, cuối catalog L170); Chim cút quay (food_grill, L198), Chim cút chiên giòn (fryer, L199).
- GĐ2141–2142: Gà ác làm sẵn (x_ga_ac, cuối catalog L170); Cháo gà ác (hot_kettle, L198), Gà ác hấp (steamer, L199).
- GĐ2139–2140: Ba ba làm sẵn (x_ba_ba, cuối catalog L170); Cháo ba ba (hot_kettle, L198), Ba ba hấp sả (steamer, L199).
- GĐ2137–2138: Bồ câu làm sẵn (x_bo_cau, cuối catalog L170); Cháo bồ câu (hot_kettle, L196), Bồ câu quay (food_grill, L197).
- GĐ2135–2136: Cá trê làm sẵn (x_ca_tre, cuối catalog L170); Cá trê chiên giòn (fryer, L198), Cá trê nướng trui (food_grill, L199).
- GĐ2133–2134: Bún măng vịt (L198), Cháo lươn (L199) — hot_kettle.
- GĐ2131–2132: Ếch làm sẵn (x_ech, cuối catalog L170); Ếch xào sả ớt (L196), Ếch chiên nước mắm (L197) — fryer.
- GĐ2129–2130: Vịt làm sẵn (x_vit, cuối catalog L170); Cháo vịt (L194), Vịt kho gừng (L195) — hot_kettle.
- GĐ2127–2128: Lươn (x_luon, cuối catalog L170); Miến lươn (hot_kettle, L192), Lươn xào sả ớt (fryer, L193).
- GĐ2125–2126: Cua đồng (x_cua_dong, cuối catalog L170); Bún riêu (L190), Canh cua mồng tơi (L191) — hot_kettle.
- GĐ2123–2124: Lá lốt (x_la_lot, cuối catalog L170); Bò lá lốt (food_grill, L188), Chả lá lốt (fryer, L189).
- GĐ2121–2122: Hột vịt lộn xào me (L186), Mực xào sả ớt (L187) — fryer.
- GĐ2119–2120: Thịt rim (L200), Bún mọc (L199) — hot_kettle. Cấp 200 = trần; món sau dùng lại cấp 101–199.
- GĐ2117–2118: Canh khoai môn (L198), Canh khoai tây (L199) — hot_kettle. Dồn GĐ2071–2116 sang archive.
- GĐ2071–2116 (món đợt 5 L159–197: phở/bún/canh rau, ốc/nghêu cuối catalog; GĐ2107 thay món trùng) — chi tiết ở docs/progress-archive/PROGRESS-GD2071-2116.md.
- GĐ2031–2070 (món đợt 4 L121–158; đậu que/mướp vào cuối catalog để không lệch sim) — chi tiết ở docs/progress-archive/PROGRESS-GD2031-2070.md.
- GĐ2002–2030 (món cơm nhà/quán đợt 3, L92–120) — chi tiết ở docs/progress-archive/PROGRESS-GD2002-2030.md.
- GĐ1983–2001 (món cơm nhà đợt 2, L71–90) — chi tiết ở docs/progress-archive/PROGRESS-GD1983-2001.md.
- GĐ1966–1982 (món cơm nhà đợt 1: xào/luộc/canh L54–70) — chi tiết ở docs/progress-archive/PROGRESS-GD1966-1982.md.
- GĐ1940–1965 (nâng kho vật liệu, khung giờ, món có thật, nút khóa ghi lý do): `docs/progress-archive/PROGRESS-GD1940-1965.md`.
- (cũ: PROGRESS-GD840-854.md) GĐ1829–1939 (review đợt 2–4, giờ mở cửa, catalog nhà làm/ô mai, rà ẩm thực): `docs/progress-archive/PROGRESS-GD1829-1939.md`.
- GĐ1394–1408 + GĐ1490–1505 (chuỗi khu ăn tại chỗ: bàn ghế, khách ngồi ăn, tip, máy thu phí, toilet, decor × sao, sao món, vắng mặt, nhà phê bình, toast ghế, tour HUD, đồ bếp decor, bảng hiệu đặc sản; khoá 1 tab): docs/progress-archive/PROGRESS-GD1490-1505.md
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

- Cao điểm sáng GIỮ 6h–9h (người dùng chốt 09/11/2026, review đợt 6 R4): không dời theo giờ mở 8h.
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
- 🆕 **Góp ý người chơi đợt 2–4 (08/11, docs/reviews/REVIEW-NGUOI-CHOI-2026-11-08-{2,3,4}.md)** — Leader đã chọn đưa vào backlog theo cụm (mã R gốc ghi trong ngoặc); giữ nguyên mục "Đừng phá" của báo cáo (checklist 5 bước, Điền theo gợi ý/Bày đầy, khối "Đã cứu N lượt", tổng kết gọn + Xem phần nâng cao, chip đồng hồ, F5 giữ đúng tiền, parity mua hàng co-op):
  1. [P1] ✅ GĐ1831 ConfirmHost ở gốc ứng dụng — nút "Rời hẻm" màn đăng nhập câm, hộp chờ tới khi vào game mới hiện (Đ2-R14, Đ4-R7); kèm placeOrder/buy chặn số lẻ/chuỗi (Đ2-R11).
  2. [P1] ✅ GĐ1832 Minh bạch tổng kết ngày: dòng "Thưởng thành tựu" + "Phí vận hành" để số tiền khớp ví (Đ2-R1, Đ3-R2).
  3. [P1] ✅ GĐ1833 Cảnh báo trước khi ngủ khi két không đủ trả tiền nhà/lương/vận hành + dòng "Két thiếu" trong tổng kết (Đ2-R3, Đ3-R3).
  4. [P2] ✅ GĐ1834 Cụm nhập hàng: "Thiếu X₫" trên nút; "✨ Điền theo gợi ý" ưu tiên nút thắt đang nêu (Đ3-R4, Đ4-R2; giữ case minTotal ngày đầu).
  5. [P2] ✅ GĐ1835 Cụm hiển thị: mẹo "Bạn có biết" nhường banner lễ; toast bị giữ khi thoại chương mở, nổi trên panel (Đ2-R5, Đ3-R6, Đ4-R4).
  6. [P2] ✅ GĐ1836 Cảm ứng mobile: dock vùng chạm ≥44px, nhãn ≥11px; tiêu đề panel mobile rút gọn (Đ2-R10, Đ4-R5).
  7. [P2] ✅ GĐ1837 "Bày đầy cả tiệm" chia ô theo kho ảo từng ô một + hot set gồm hàng hút lễ (Đ2-R6, Đ3-R5; không đổi nút).
  8. [P2] ✅ GĐ1838 Thoại chương hoãn trong giờ vàng khi tiệm mở (Đ4-R1b; lệch thứ tự 3→2 xác định do save cũ — nextChapter vốn tuần tự).
  9. [P2] ✅ GĐ1839 Reset khi khách còn trong tiệm không để lại sàn bẩn ngày 1 (Đ4-R3 — freezeDirt).
- 🔍 **Cần xác minh (chưa code):** WebGL warn "no buffer is bound" lặp (Đ2-R2 — Đ4 không tái hiện trong ~40 phút, giữ theo dõi); "⏳ Đang mở…" panel trên bản build (Đ2-R8 — có thể chỉ dev); FPS mobile máy thật (Đ2-R12 — chạm 26,3 ở 8×); nhãn "Đang mở cửa" sau 22:00 (✅ GĐ1842 + GĐ1843/1948 thống nhất 22:30); góp Sân chơi ngày 1 (Đ3-R8 — ✅ GĐ1840 dời sang ngày 3); Đ2-R4 ✅ GĐ1841. **Cần người dùng chốt:** (b) dọn hẻm QA co-op cũ trên server 3002 (đang đầy 10/10 hẻm) để test cặp co-op mới.
- P2 T6 THỬ RỒI HOÀN TÁC (06/11): khóa cám heo→cấp 20, cám bò→24 làm sim cấp 5 (economySimL5, seed cố định) tụt lãi bán +189.800→−10.067đ/ngày — bot xoay vòng hàng theo danh sách mở khóa, cám bao 5kg là món giá cao bán được ở cấp thấp. Muốn làm phải thay món tạp hóa giá tương đương ở cấp 1 trước. T9 ĐÃ SỬA: Ra tiệm/Ra trại camera nhảy thẳng (snapTo), không lia qua cảnh — test cameraSnap. T7 ĐÃ SỬA: tab mối nhập chỉ hiện mối mở + 1 mối khóa gần nhất, còn lại gộp "+N mối nữa" (test visibleSuppliers). T8 ĐÃ SỬA: chơi đơn mở Nhập hàng lúc tua nhanh → hạ về 1× (hẻm online không đụng) — test orderSlowdown.
- ◐ **P0 M1 (ĐÃ GIẢM, test gfxLowShield):** mức Thấp hạ độ nét tới 0.6 (trước 0.75) khi < 45 FPS — không bớt NPC ở mức chọn tay (giữ quyết định GĐ1235). Còn: đo lại trên Chrome thật cấp 29; nếu vẫn < 30 thì soi CPU (9 NV + đám đông), không phải GPU.
- ✅ **Người dùng ĐÃ TRẢ LỜI (GĐ1076): CHƯA mở Ngõ 3 — chiều sâu chưa khai thác hết.** Hướng chiều sâu do người dùng chỉ định, làm TRƯỚC mở rộng: (1) thêm sản phẩm/công thức mới ở tạp hóa, nông trại, quán nước, tiệm xôi; (2) cơ chế nhập hàng NGOÀI tạp hóa để đa dạng hàng bán; (3) liên kết thị trường/quan hệ hàng xóm: nhiều nguồn cung nguyên liệu tự làm tại gia của hàng xóm. Chiều rộng để SAU (người dùng liệt kê làm hướng tương lai): cùng đầu tư, chuỗi sản xuất chế biến từ sản phẩm nhà/hàng xóm, chi nhánh đi lại giữa các khu. Ngõ 3 chỉ làm khi người dùng chốt lại.
- 🆕 **Phần Midnight Bistro còn lại (rà GĐ1510):** (1) ✅ GĐ1511 tip 2 nấc; (2) ✅ GĐ1512 K1; (3) ✅ GĐ1513. Vách ngăn biến thể: BỎ (đã có vách, chỉ thêm hình).
- Lịch sử backlog đã xong: docs/progress-archive/BACKLOG-DONE-2026-11-07.md

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
- GĐ1484: Măng khô nhà phơi (hàng xóm, cấp 53, 45k→70k) + Măng khô xào lạp xưởng (cấp 80, chảo chiên: 1 măng + 1 lạp xưởng → 8, bán 25k).
- GĐ1485: Nấm mèo khô nhà phơi (hàng xóm, cấp 54, 35k→55k) + Chả giò nấm mèo (cấp 81, chảo chiên: nấm + thịt + bánh tráng → 30, bán 7k).
- GĐ1486: Mè rang nhà làm (hàng xóm, cấp 55, 32k→50k) + Xôi muối mè (cấp 82, bếp xôi: 2 nếp + 1 mè → 14, bán 12k; nhập 8.5k cho khớp biên cuối run ≤1.42).
- GĐ1487: Nem nướng bà Tám (cấp 56, 50k→80k) + Nem nướng cuốn (cấp 83, bếp nướng: nem + bánh tráng → 8, bán 20k). Ghi chú: latePremium chỉ soát biên ở mốc 82/86/91/96/100 — tránh đặt món nấu đúng các mốc này.
- GĐ1488: Cá cơm khô bà Tám (cấp 57, 40k→64k) + Cơm cá cơm rim (cấp 84, bếp xôi: 2 gạo + 1 cá → 12, bán 25k).
- GĐ1490–1505 (khu ăn tại chỗ theo tham khảo Midnight Bistro + bảng hiệu đặc sản 4 miền + khoá 1 tab): docs/progress-archive/PROGRESS-GD1490-1505.md
- GĐ1506–1513 (đoàn kiểm tra vệ sinh, sửa maybeSurprise, decor khoe, tip 2 nấc, nút Nhập đủ, decor theo dịp lễ): docs/progress-archive/PROGRESS-GD1506-1513.md
- Tham chiếu cũ dời theo GĐ1394–1408: PROGRESS-GD1404-1407.md · PROGRESS-GD1427-1429.md · PROGRESS-GD250-257.md · INDEX-GD1-250.md (trong docs/progress-archive/)

