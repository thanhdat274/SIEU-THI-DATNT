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

## Trạng thái hiện tại (04/11/2026)
- **GĐ1110 (chiều sâu soi sáng: gợi ý "nuôi lấy sữa" — đối xứng GĐ1101 cho chăn nuôi)**: "Nên hôm nay" chỉ gợi ý trồng cây cho thực đơn quán (GĐ1101), không biết sữa tươi của bò cũng đang bị pha (Bạc xỉu/Ca cao sữa/Ca cao nóng). Thêm `quanMenuMilkNeed` (thuần đọc: menu có món dùng sản phẩm vật nuôi đã mở cấp) → kho sữa tươi cạn (<8) → gợi ý **"🐄 Bò sữa — nuôi lấy sữa: thực đơn quán cần để pha"** (panel Vườn). Không menu/menu chưa mở cấp/đủ sữa → không gợi ý. Thuần đọc, không đổi kinh tế/save → simGolden y nguyên 26.304.891. Test: +3 (Bạc xỉu + thiếu sữa → gợi ý, đủ sữa/không món sữa/không menu → không, cấp 32 khoá món 33 → không). Full 443 file/3444 test xanh, tsc 0, build ok.
- **GĐ1109 (chiều sâu: khối "Nấu hay bán lẻ" xếp theo mức tác động)**: vườn nay có 8+ nông sản nhà nhưng khối tư vấn cắt 5 dòng theo thứ tự thu hoạch — dòng đáng chú ý nhất có thể bị cắt. Thêm `homegrownImpact(id)` (thuần đọc: max lãi nấu, lãi pha; -Infinity khi chỉ bán lẻ) và GardenPanel sắp giảm dần theo impact trước khi cắt → dòng "pha/nấu lời to nhất" luôn lên đầu. Test: +2 (vải dương & bia ngoài vòng đời → -Infinity, nếp có xôi → dương). Full 443 file/3441 test xanh, tsc 0, build ok, simGolden y nguyên 26.304.891 (thuần đọc, không đổi kinh tế/save).
- **GĐ1108 (bảo trì: dồn GĐ1098–1103 sang archive — nợ ghi nhận ở GĐ1107)**: PROGRESS.md 35,5 → ~31 KB; tạo `docs/progress-archive/PROGRESS-GD1098-1103.md` (6 GĐ: rà ngân sách, QA render sống ×2, bảo trì ×2, đơn quán xóm trái cây), thêm 1 dòng mục lục theo khoảng, cập nhật dòng trỏ. Giữ lại 4 GĐ mới nhất (GĐ1104–1107). Verify 6/6 GĐ đủ trong archive. Không đổi mã/test — full suite & build bất đổi (443 file/3439 test xanh).
- **GĐ1107 (audit 10-GĐ khuôn GĐ670/690 — hồi quy GĐ1096–1106)**: (1) Bundle `check:bundle`: tải đầu **537/597 KB** gzip, chunk lớn nhất 253/255 — dữ liệu + helper mới (GĐ1093–1105) nằm trong chunk lazy, ngân sách không xê dịch; (2) `audit:notify`: **358 thông báo, 0 vượt 90** (việc sáng GĐ1102 đã được rút gọn template đúng Luật 9 ngay khi viết); (3) HUD: test trần nút dock+menu Thêm (featureBudget) xanh — GĐ1093–1105 không thêm nút HUD; (4) Golden: simGolden tất định trong ±5% mốc **26.304.891**; economySimL50 **26/26/26** (GĐ1100 thêm trái cây vào đơn quán xóm không lệch trần); (5) Parity Luật 4: mọi helper mới thuần đọc menu/storage — coopClient 51 test xanh; (6) Luật 5: 0 trường save mới → không migration; (7) tsc 0, build ok, full 443 file/3439 test. Prune: không bỏ gì. Nợ ghi nhận: PROGRESS.md 34,3KB — dồn ở GĐ bảo trì kế (GĐ1091–1102 đủ điều kiện archive). Kết luận: 11 GĐ chiều sâu/soi sáng/QA qua đều đạt cổng, không nợ mới; mở rộng lớn vẫn "Cần duyệt".
- **GĐ1106 (QA trình duyệt sống — kiểm chứng render GĐ1104/1105)**: sandbox `?thu=1` (không đụng save thật), cấp 45 + quán nước mở với thực đơn Trà vải/Bạc xỉu + chuồng 2 bò → khối "💡 Hôm nay đáng" render đúng cả hai dòng mới: **"Trồng 🍒 Vải thiều ~125.733đ/luống/ngày · pha Trà vải lời hơn bán lẻ"** (số khớp công thức ngoài mùa: (6×74,5k − 70k)/3) và **"Nuôi 🐄 Bò sữa ~220.900đ/con/ngày · pha Bạc xỉu lời hơn bán lẻ"** (2 lốc × ~130,2k − cám); kèm khối "Nấu hay bán lẻ" (GĐ1093) nguyên vẹn, khung panel không vỡ, **0 lỗi console** toàn phiên. Không đổi mã — full suite & build bất đổi (443 file/3439 test xanh).
- **GĐ1105 (chiều sâu soi sáng: "Hôm nay đáng" cho vật nuôi — sữa cho món pha được định giá đúng)**: hoàn tất đối xứng GĐ1104 cho chăn nuôi — `bestAnimal` định giá sữa theo bán lẻ, nhưng 1 lốc sữa bò pha Bạc xỉu (6 ly × 25k − nguyên liệu khác ≈ 130k) lời gần 3× bán lẻ (~45,6k) mà tư vấn không biết. `animalPerDay` nhận `valuePerUnit` tuỳ chọn (milk/egg mode, max với bán lẻ); thêm `bestAnimalForMenu` (farmQuanValue: vật cho sữa mà món pha trên menu dùng sữa tươi → định giá theo pha, kèm `drinkName`); GardenPanel dòng "Nuôi ⟨vật⟩" kèm chú thích "· pha ⟨món⟩ lời hơn bán lẻ". Không menu/quán đóng → y hệt `bestAnimal` cũ. Thuần đọc, không đổi kinh tế/save → simGolden y nguyên 26.304.891. Test: +3 (bạc xỉu giá trị pha đúng & lọc menu/cấp 32/33, bò định giá theo pha khớp animalPerDay override & không menu y hệt bestAnimal, menu không dùng sữa → bán lẻ không drinkName). Full 443 file/3439 test xanh, tsc 0, build ok.
- **GĐ1104 (chiều sâu soi sáng: "Hôm nay đáng" nhìn thấy giá trị pha — cây cho thực đơn quán được định giá đúng)**: `bestCrop` (GĐ146) định giá cây theo bán lẻ nhà trồng — nhưng vải cho Trà vải lời gần 2× bán lẻ nên tư vấn trồng lệch khi quán đang pha. Thêm `brewGrossPerUnit` (chỉ món **ĐANG trên thực đơn** + đã mở cấp) và `cropRankForMenu`/`bestCropForMenu` (farmQuanValue, tránh vòng import): cây có món pha trên menu lời hơn bán lẻ → `cropPerDay` nhận `valuePerUnit` override (max với bán lẻ); GardenPanel "Hôm nay đáng" dùng `bestCropForMenu` khi quán mở, kèm chú thích "· pha ⟨món⟩ lời hơn bán lẻ". Menu rỗng/không truyền/quán đóng → hành vi y hệt `bestCrop` cũ (bắt được 1 bug thiết kế trong quá trình: bản đầu xét mọi món đã mở chứ không lọc menu — chuối không trên menu cũng được nâng giá; đã sửa + test khoá). Thuần đọc, không đổi kinh tế/save → simGolden y nguyên 26.304.891. Test: +4 (brew giá trị đúng & lọc menu/cấp, valuePerUnit thấp → hành vi cũ, menu Trà vải mùa vải → vải đầu bảng với drinkName, cấp 33 khoá món → xếp hạng như không menu). Full 442 file/3436 test xanh, tsc 0, build ok.
- (Đã chuyển GĐ1074–1103 sang archive: GĐ1074 + GĐ1077–1081 vào `PROGRESS-GD1056-1081.md`; GĐ1082–1090 vào `PROGRESS-GD1082-1090.md`; GĐ1091–1097 vào `PROGRESS-GD1091-1097.md`; GĐ1098–1103 vào `PROGRESS-GD1098-1103.md`.)
- (Đã chuyển GĐ1056–1071 sang `docs/progress-archive/PROGRESS-GD1056-1081.md`; các mốc cũ khác: GĐ1042–1054 `PROGRESS-GD1042-1054.md` · GĐ790–929 `PROGRESS-GD790-929.md` · GĐ980–1005 `PROGRESS-GD980-1005.md`)
- GĐ960–1005 (tách file thuần + QA trình duyệt, chi tiết): `docs/progress-archive/PROGRESS-GD960-1005.md`
- Các mục GĐ930–949 / GĐ950–959 (tách panel/Hud): `docs/progress-archive/PROGRESS-GD930-949.md` · `docs/progress-archive/PROGRESS-GD950-959.md`
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
- 🔐 GĐ1073: `npm audit --omit=dev` = 10 cảnh báo (4 cao/6 vừa) đều đi qua `firebase-admin` → `google-gax` → `@grpc/grpc-js`/`minimatch`, phía máy chủ, KHÔNG nằm trong bundle trình duyệt; `@grpc/grpc-js` đã 1.14.6. Không chạy `audit fix --force` (đổi phiên bản lớn). Xem lại khi nâng firebase-admin.
- ⏱️ GĐ675: render CPU đo ở cấp 10/18/24/34/41 đều đạt biên 4× throttle (cấp 41: 5,1 ms trung vị ⇒ ~20–31 ms < 33 ms). Còn thiếu FPS thật máy yếu. Chi tiết: archive `PROGRESS-GD715-788-summaries.md`.
- 🕳️ GĐ665/668: QA co-op vòng ngày (ngủ cả hẻm → tổng kết 2 tab) cần tab trình duyệt THẬT — tab IAB về nền bị đóng băng timer → server ngắt WS → game tự reload (`coop.ts:339`, thiết kế). Cơ chế đã chốt GĐ668; checkpoint round-trip đã khoá bằng test. Làm trong đợt QA toàn diện GĐ670; trước đó ghi "chưa chạy được vì môi trường", không tính là lỗi game.
- 📦 GĐ515 (cập nhật GĐ709): GĐ704 tách vỏ boot → tải ban đầu 529,4/597 KB, dư địa ~68 KB; khi gần chạm trần lại thì code mới vào main/index phải tìm chỗ tách chunk lười trước.
- GĐ330: QA lưu máy khách (127.0.0.1:5173) — tải lại trang vẫn hiện "Chơi tiếp trong máy (ngày 1)" và vào lại đúng ván; lần "mất ván" trước là bấm nhầm nút ván mới, KHÔNG phải lỗi lưu.

- ⏱️ (GĐ296–298) npm run test nhạy tải máy: 1 test đỏ lẻ không liên quan thay đổi vừa làm → chạy lại đúng file trước khi kết luận; máy rảnh mà vẫn >10 phút thì đo file chậm nhất rồi tối ưu.


## Backlog tiếp theo
- ✅ **Người dùng ĐÃ TRẢ LỜI (GĐ1076): CHƯA mở Ngõ 3 — chiều sâu chưa khai thác hết.** Hướng chiều sâu do người dùng chỉ định, làm TRƯỚC mở rộng: (1) thêm sản phẩm/công thức mới ở tạp hóa, nông trại, quán nước, tiệm xôi; (2) cơ chế nhập hàng NGOÀI tạp hóa để đa dạng hàng bán; (3) liên kết thị trường/quan hệ hàng xóm: nhiều nguồn cung nguyên liệu tự làm tại gia của hàng xóm. Chiều rộng để SAU (người dùng liệt kê làm hướng tương lai): cùng đầu tư, chuỗi sản xuất chế biến từ sản phẩm nhà/hàng xóm, chi nhánh đi lại giữa các khu. Ngõ 3 chỉ làm khi người dùng chốt lại.
- ✅ **Chiều sâu bán online (GĐ715–719) ĐÃ XONG + QA đạt; audit GĐ720 đã chạy** (chi tiết trong archive).
- ✅ **Đường đời nhân viên (GĐ727–731) ĐÃ XONG** — gồm nhân viên chi nhánh xin nghỉ mai (băm riêng, không migration, coopGuard GUARDED); chi tiết trong archive.
- ✅ **Trục tín dụng/nợ — lát cắt trả góp ĐÃ XONG (GĐ734) + QA (735).** Đánh giá bằng số (audit GĐ740): mọi trục lớn ĐỦ SÂU theo coverage 58,22/90,09 và autoplay/simGolden xanh — chuỗi GĐ741+ ưu tiên: rà backlog nợ mở (GĐ675 CPU render cuối-game, refactor UI khi đụng panel) và QA tự nhiên các trục mới trước khi tính mở rộng.
- 🧭 **Đánh giá xong (GĐ738, Leader + Designer): KHÔNG làm "nhịp tuần chủ đề"** — ý tưởng treo từ rà GĐ720 ("tuần chỉ là số"): vai trò đa dạng hoá nội dung tuần ĐÃ có sẵn bằng sự kiện thị trường 3 ngày (hàng hút + traffic) + lễ hội lịch + chợ phiên — thêm theme tuần là trùng vai trò, risk phình (Luật 9). Trục nhân sự (727–731) và tín dụng (734) đã lấp các chỗ MỎNG; landmark có dự án 2 (732). Các trục lớn hiện ĐỦ SÂU theo đánh giá GĐ720 + GĐ730 — chuỗi GĐ739+ quay lại đánh giá bằng số (coverage, autoplay) trước khi tính mở rộng mới.
- ✅ **Đã duyệt (GĐ483):** người dùng chọn (a) — tiệm xôi thành cửa hàng nhỏ có nhà. Sạp/quầy hàng rong sau này bán ở ngõ khác khi **mở rộng bản đồ** (hướng kiểu Cities: Skylines 2: thêm ngõ/khu mới mở dần) — backlog lớn.
- 🗺️ **Mở rộng bản đồ B1–B5 ĐÃ XONG (GĐ497–505); đang làm chiều sâu Ngõ 2 (món sạp GĐ507–511, nâng sạp GĐ513).** Kế hoạch gốc: B1 khung "khu" dữ liệu (id, ranh giới, cấp/tiền mở, gốc toạ độ) + save `zones?` tuỳ chọn; B2 mở "Ngõ 2" phía bắc: đường + lô đất trống, biển RAO BÁN; B3 sạp/quầy hàng rong (xôi, nước mía, bánh mì) chỉ đặt ở ngõ mới; B4 khách/NPC đi lại giữa các khu, lưới đi lại theo khu; B5 bản đồ thu nhỏ hiện khu đã mở/chưa mở. Giữ ngân sách bundle (khu tải lười).
- ✅ **Cửa hàng nước thật B1–B5 ĐÃ XONG (GĐ424–428):** nhà quán, vào trong được, khách ngồi, tự pha, Quầy→Quán→Cà phê. Chiều sâu sau đó: thời tiết, đồ nóng, thực đơn (GĐ414–494).

- 🔍 **Rà 3 cơ sở (GĐ413, theo yêu cầu người dùng trước khi mở rộng tiệm xôi):**
  - Cửa hàng tiện lợi: luật chơi SÂU (ca kíp, mệt mỏi, sự cố đêm, máy bán hàng, điện, nhóm khách đêm). Nợ: BranchPanel 297 dòng gánh hết, cần soát độ rối; QA 3D xong GĐ527.
  - Nông trại: SÂU (mùa vụ, 7 vật nuôi, công trình 3 sao, đơn đặt hàng, phụ trại; world/farm.ts 996 dòng). QA 3D xong GĐ528.
  - Quán nước: ~~MỎNG~~ **ĐÃ KHOÉT SÂU (nhận định cũ lỗi thời — hiệu chỉnh GĐ1064):** nay đủ bốn chiều từng bị chê: (1) không còn "2 nút" — có bậc cửa hàng `QUAN_TIERS` (quầy→quán→cà phê, GĐ428) + mẻ tự pha `hand` (GĐ427, QUAN_HAND_BATCHES/MAX) + menu có slot `quanMenuSlots`; (2) thực đơn không còn "tự lấy mọi đồ uống" — `clearMenu` theo slot + `varietyMul`/`quanHotMul`(nóng theo thời tiết); (3) thời tiết GIỜ CÓ ảnh hưởng — `QUAN_WEATHER_MUL` (nắng 1.25…bão 0.45) × `weatherMul` × `quanMatchMul`(ngày trận, GĐ580+) × `quanWeekendMul`; (4) CÓ sự kiện — `QUAN_EVENT` máy pha hỏng (brewer) / xe nước đối diện (cart, GĐ703) + khách đêm ngày trận. `src/data/quanNuoc.ts` áp dụng tất cả trong `quanNuocDay` (xác định, không Math.random) và **coverage 0 lệnh trống + 7 file test** (`quanNuoc.test`/`quanNuocEvents`/`quanMatchNight`/`quanNuocHealth`/`quanNuocBalance`/`quanRecipes`/`quanNuocDayAction`). Panel 230 dòng là bảng phân tích số liệu mô phỏng — không còn là gánh 2 nút. Chỗ "tiệm xôi" + chiều sâu khác giữ nguyên.
  - Thứ tự sửa: ~~(1) thời tiết~~ xong GĐ414, ~~(2) chọn món~~ thành thực đơn pha chế GĐ415, ~~(3) 3D quán dùng kit~~ (đã có setQuanDecor: chậu cây + băng ghế), ~~(4) gọn BranchPanel~~ xong GĐ417, ~~(5) QA 3D~~ GĐ419 +GĐ420 đủ cả ba. Tiệm xôi phần còn lại để sau.
  - QA 3D cần save thử riêng: không có chế độ sandbox, không được sửa save thật của người dùng.

1. 🧹 **Nợ refactor UI (đo GĐ685, làm khi đụng panel đó hoặc hết việc chơi sâu):** `ReportPanels.tsx` (nay còn 550 dòng ở `src/ui/panels/`, GĐ898 đo lại — nợ ĐÃ HẾT; từng là 1.632 dòng chứa 6 panel (history/records/analytics/dossier/roadmap/discovery) → tách theo file; `BusinessPanel.tsx` (ĐÃ tách GĐ876 → 573 dòng). BranchPanel 297 dòng — nợ cũ GĐ417 ĐÃ ỔN, gỡ khỏi backlog. Chỉ tách khi có lý do chơi (sửa tính năng trong panel đó), không refactor thuần (Luật 1).
2. **Trục đã cạn:** 3D trang trí (chỉ làm 3D mới khi đi kèm gameplay — GĐ172–198) · multi-shop supply chain (GĐ199–209, khép mạch) · bộ soi tiền/vốn (GĐ210–251) · UI nợ (GĐ183/258) · chợ phiên (GĐ182).
2. **Khoá chờ save người thật:** NG+ vòng (GĐ171) · nhiệm vụ ngày 1–5 (GĐ254 đã giảm lặp). (GĐ110/117 ĐÃ ĐÓNG GĐ280 bằng số liệu; Arc E "Hàng xóm khai trương" ĐÃ HOÀN THÀNH GĐ283, 27 test cấu trúc xanh).
3. **Ý tưởng chờ Leader duyệt (chiều sâu, chưa làm):** (a) nhịp cuối tuần đậm hơn — **ĐÃ HOÀN THÀNH GĐ291** (lô chợ phiên đầu tháng nhận biết món ăn vặt cuối tuần + gợi ý trữ hàng đặc biệt); (b) nhiệm vụ tuần/tháng biết đến thứ/ngày trong kỳ — **ĐÃ HOÀN THÀNH GĐ289** (nhịp tháng monthPace hiển thị ngày còn lại tới hết tháng + dự báo kịp/hụt và bảo vệ chuỗi tháng).
4. 👥 **Đủ 2 chế độ (ĐÃ CHỐT GĐ288):** khoá chính sách parity chơi đơn/hẻm online: Sân chơi chung tiến độ; Tái sinh NG+ chỉ chơi đơn; Chào mừng quay lại chạy cục bộ. Test: coopClient.test.ts. Chi tiết: docs/progress-archive/BACKLOG-parity-GD288.md.

## Mục lục giai đoạn đã xong (chi tiết trong archive)
- GĐ1082–1090 (đóng 3 hướng chiều sâu GĐ1076 + món kích hoạt nông sản nhà): docs/progress-archive/PROGRESS-GD1082-1090.md
- GĐ1091–1097 (món kích hoạt nông sản tiếp tục + soi sáng pha-hay-bán + QA + bảo trì): docs/progress-archive/PROGRESS-GD1091-1097.md
- GĐ1098–1103 (rà ngân sách + QA render sống + bảo trì): docs/progress-archive/PROGRESS-GD1098-1103.md
- GĐ640–690 (rà ngân sách định kỳ, QA người mới/co-op, sửa SW stale assets + heartbeat server; dồn chi tiết): docs/progress-archive/PROGRESS-GD662-665.md · 666-671 · 672-680 · 681-688 (+ INDEX-GD637-659.md)
- GĐ741–762 (trục tín dụng/Sổ đầu ngày/sinh nhật khách quen; dồn chi tiết): docs/progress-archive/PROGRESS-GD741-747.md · 748-758 · 759-762
- GĐ860–875 (rà định kỳ Leader+Designer + ngân sách thông báo/bundle; chi tiết): docs/progress-archive/PROGRESS-GD840-854.md
- GĐ1006–1053 (phủ test theo lệnh coverage — từng nhánh core/ui): docs/progress-archive/PROGRESS-GD1005-1041.md · PROGRESS-GD1042-1054.md
- GĐ1056–1081 (phủ test core + rà ngân sách chống phình/coverage + xôi mới + cây trồng + nguồn cung/quan hệ hàng xóm): docs/progress-archive/PROGRESS-GD1056-1081.md
- GĐ721–729 (trục chốt deal ở quầy 4 đòn + nhân viên xin nghỉ hôm nay + save trắng đồng hồ thật): docs/progress-archive/PROGRESS-GD721-729.md
- GĐ731–739 (trả góp nợ, đèn đường dự án 2 + payoff 3D, luồng cố định đồng hồ thật): docs/progress-archive/PROGRESS-GD731-739.md
- GĐ711–719 (chiều sâu bán online 4 lớp: đơn gấp/lớn, bậc gian hàng, sự kiện app, khách quen đặt app; nạp trước 3D; hoàn tất vòng sự kiện 4 cơ sở): docs/progress-archive/PROGRESS-GD711-719.md
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

- GĐ637–659: lịch/đếm ngược sự kiện, gợi ý nhập đồ lễ & đồ cúng, HUD gọn (chi tiết: docs/progress-archive/INDEX-GD637-659.md).
- GĐ834–839: duyệt+áp dụng viết lại 4 thông báo (docs/notify-audit.md); FPS mobile late save ~28–30, CPU render ~1 ms (chưa kết luận, đo rAF cần pane hiện); chip kế hoạch mobile 36 px; hud-alerts mobile max-height 32vh; tsc/build ok, chunk lớn nhất 252 KB.
- GĐ840–854: audit GĐ840 xanh (2943 test, thông báo ≤90, HUD ≤20 nút); thêm hudMobileCss.test.ts (chip ≥36px, dải cảnh báo có trần vh); sửa bế tắc quỹ âm: bot autoplay/playtest vay gấp, cấp <5 được vay thêm tới trần 3 gói (loanWhenBroke.test.ts); nâng timeout coop. Còn mở: FPS ≥30 gfx Low cần máy thật. Chi tiết: docs/progress-archive/PROGRESS-GD840-854.md.
- GĐ855–859: nâng timeout coop 60 s; kiểm tsc/build/gzip bầu đầu ≈538 KB/bộ test 110 s/remote đồng bộ. Chi tiết trong docs/progress-archive/PROGRESS-GD840-854.md.

- GĐ861–865: rà độ dài thông báo kỹ hơn — rút 4 thông báo (lương khi nhập hàng, mua/xuất chuồng giữa kỳ, thu hoạch bù nhìn); audit-notify.mjs và featureBudget.test.ts tính nhánh điều kiện dài nhất (cả template lồng nhau) → 0 thông báo >90. Chi tiết: docs/progress-archive/PROGRESS-GD840-854.md.
- GĐ866–869: gọn PROGRESS.md; cả bộ xanh 107 s; thêm notifyRuntimeLen.test.ts (bot chơi 6 ngày ở cấp 3/8/15, gom toast thật, 0 vượt 90). Chi tiết trong archive.

- GĐ960–979 (tách file lớn: alleyApi, buildingTextures, bizAchieve/Loan/Purchases, regularsList…): xem docs/progress-archive/PROGRESS-GD960-979.md
