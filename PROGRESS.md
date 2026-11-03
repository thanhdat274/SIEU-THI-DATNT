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

## Trạng thái hiện tại (03/11/2026)
- **GĐ1096 (bảo trì: dồn PROGRESS.md về đúng quy ước <30KB — khuôn GĐ1084)**: chuyển chi tiết GĐ1074–1090 sang archive (GĐ1074 + GĐ1077–1081 → PROGRESS-GD1056-1081.md; GĐ1082–1090 → PROGRESS-GD1082-1090.md mới) và nén mục lục theo khoảng (gom ~60 dòng chi tiết đơn-GĐ đã có archive thành 4 dòng GĐ640–690/741–762/860–875/1006–1053). PROGRESS.md 54,5 → 31,2 KB; giữ nguyên toàn bộ nội dung (chỉ dời chỗ, không xóa lịch sử). Không đổi mã/test — full suite & build bất đổi theo GĐ1095 (438 file/3417 test xanh).
- **GĐ1095 (QA: kiểm toán loạt GĐ1088–1094 trước khi tính mở rộng — đúng khuôn "QA tự nhiên" GĐ735/740)**: (1) Coverage dữ liệu mới: `farmQuanValue` **100%** stmts (1 nhánh else), loạt test mới +4 tới +9 GĐ mỗi file; `quanRecipes` do 7 file test chuyên dụng sẵn phủ trong full-suite. (2) Golden: simGolden chạy xanh trong **mọi** full-suite hôm nay (≥6 lần) — mốc 26.304.891 nguyên vẹn; economySimL50 các lần đo 24–26/24–26/25-25-25 (trần ≥22) — món mới (mở ≥34) không lọt sim cấp 50 lệch trần. (3) Luật 9: 0 nút HUD mới (chỉ thêm dòng soi sáng trong GardenPanel), 0 thông báo mới, tên món ≤ 20 ký tự, không thêm trạm/ô menu (dùng 6 trạm có sẵn). (4) Bundle: index 106,11 kB / gzip 37,84 kB — dữ liệu mới nằm trong chunk dữ liệu lazy, dist ~5,2 MB không đổi đáng kể. (5) 3D: chỉ thêm `CROP_LOOK` chanhday (dựng lại từ geometry dùng chung — Luật 8 không đổi, test dựng 4 giai đoạn). Full 438 file/3417 test xanh, tsc 0, build ok. Kết luận: loạt GĐ1088–1094 đạt cổng chất lượng, an toàn trước khi cân nhắc hướng mới (mở rộng lớn vẫn "Cần duyệt").
- **GĐ1094 (chiều sâu: khép loạt "nông sản nhà ngủ đông" — trứng vịt/ngỗng, sữa dê, thịt heo & gà Đông Tảo có lối ra bếp)**: rà thấy 5 sản phẩm chăn nuôi chỉ bán nguyên liệu (vịt mở 16, ngỗng 18, dê 27, heo 20, Đông Tảo 30). Thêm 5 món bếp: **Hột vịt lộn** (ấm nước 34: trứng vịt+rau+muối → 10 phần × 7k, lãi 23k), **Bánh flan** (nồi hấp 39: trứng ngỗng+sữa đặc+đường → 24 cái × 18k, lãi 113k), **Sữa chua dê** (máy xay 40: sữa dê+trái cây+đường → 6 hũ × 22k, lãi 45k), **Chả lụa hấp** (nồi hấp 40: thịt heo×2+trứng gà → 10 cây × 12k, lãi 35k), **Gà Đông Tảo nướng** (bếp nướng 42: thịt DT+rau+muối → 3 phần × 180k, lãi 145k) — tất cả verdict 'cook', mở > mốc golden 30 → simGolden y nguyên 26.304.891, save không đổi. Test khép loạt: mọi productId của CROPS + ANIMALS đều xuất hiện ở ≥1 công thức bếp/món pha (assert dữ liệu, chặn tái phạm). Test: +9 mới, cập nhật 2 test farmKitchenValue (rau 5 công thức, trái cây 5 — best không đổi). Full 438 file/3417 test xanh, tsc 0, build ok. **Loạt GĐ1088–1094 ĐÓNG: chuỗi "trồng/nuôi → bếp/pha → bán" trọn vẹn cho toàn bộ nông sản nhà.**
- **GĐ1093 (chiều sâu: soi sáng "pha hay bán lẻ" ở vườn — nối nông trại với món quán nước)**: phát hiện lỗ hổng soi sáng — `farmVsCook` (GĐ147) chỉ xét công thức BẾP, nên vải/ổi/chuối (đã có ly pha sau GĐ1088–1092) hiện "không vào bếp nào" → panel Vườn tư vấn sai "chỉ bán lẻ được". Thêm `farmQuanValue.ts` (thuần đọc): `homegrownDrinkDecision` (1 đơn vị nông sản → `cups` ly, nguyên liệu khác lấy theo tỷ lệ ly, cơ hội phí = bán lẻ nhà trồng ×1,2), `farmVsDrinks`, `drinkableProducts`; GardenPanel gộp xét cả bếp lẫn quán, chọn nơi nông sản bõ nhất ("nấu X" / "pha Y ~N ly/1"). Không đổi state/kinh tế/save → simGolden y nguyên 26.304.891, economySimL50 trong vùng chuẩn. Test: +6 (trà vải brew +36k/1 đúng công thức cơ hội phí, ổi/chuối nhận diện đúng món, mía có nước mía & không lẫn bếp, gạo verdict sell, drinkableProducts đủ 8 nông sản trái cây, minUnlock đúng quy ước farmVsCook & mốc 30 chưa mở món mới). Full 436 file/3407 test xanh, tsc 0, build ok.
- **GĐ1092 (chiều sâu: Sinh tố ổi & chuối — khép xong loạt kích hoạt nông sản "ngủ đông", nông trại → quán nước)**: hai trái cây cuối chưa có lối ra pha — ổi (`x_oi`) & chuối (`x_chuoi`, giống mở cấp 22). Thêm 2 món quán nước: **Sinh tố ổi** (mở 34) & **Sinh tố chuối** (mở 35), mỗi ly 24.000đ, nguyên liệu 4 trái cây nhà + sữa đặc + đá → trồng được lâu trước khi mở món. **Đóng loạt GĐ1088–1092: mọi nông sản trái cây nhà (chanh dây, bưởi, vải, nhãn, ổi, chuối, mít, xoài, cam) đều đã có lối ra bếp/pha.** Cả 2 món > mốc golden 30 → simGolden y nguyên 26.304.891, save không đổi. Test: +6 (mỗi món: duy nhất + nguyên liệu + cấp; cleanMenu chặn 33, nhận 34/35). Full 435 file/3401 test xanh, tsc 0, build ok.
- **GĐ1091 (chiều sâu: món Chè nhãn — tiếp tục kích hoạt nông sản "ngủ đông", liên hệ nông trại → ấm nước)**: nhãn (`x_nhan`, giống mở cấp 32, mùa 7–9) chưa có lối ra bếp. Thêm món **Chè nhãn** (ấm nước hot_kettle, mở cấp 36 ≥ cấp nhãn 32 → trồng được trước khi mở món, mẻ: 1 nhãn + 1 đường → 6 phần, 15 phút): lãi 25.000/mẻ, nấu hời hơn bán nguyên liệu rời (66k > 55k, verdict 'cook'). Khép chuỗi trồng → nấu → bán theo khuôn GĐ1089–1090; cấp 36 > mốc golden 30 → simGolden y nguyên 26.304.891, save không đổi. Test: +4 (thành phẩm trong PRODUCTS mở 36, công thức hot_kettle dùng x_nhan+đường, mở 36 ≥ giống 32 & cấp 30 chưa mở — không lệch RNG mốc, lãi dương + verdict 'cook'). Full 434 file/3395 test xanh, tsc 0, build ok. Còn nông sản chưa có lối ra bếp/pha: x_chuoi, x_oi (đều mở cấp 22 — có thể gộp 1 GĐ).
- (Đã chuyển GĐ1074–1090 sang archive: GĐ1074 + GĐ1077–1081 vào `docs/progress-archive/PROGRESS-GD1056-1081.md`; GĐ1082–1090 vào `docs/progress-archive/PROGRESS-GD1082-1090.md`; mục lục nén theo khoảng.)
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
