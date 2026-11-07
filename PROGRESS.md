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

## Trạng thái hiện tại (07/11/2026)
- GĐ1618: bước cốt truyện "Đối tác đầu tiên" khi dưới cấp 14 ghi "hợp đồng mở từ cấp 14" (không kẹt câm); test storyContractHint.
- **GĐ1617** — QA trình duyệt GĐ1616 (cấp 10, ván mới): "Lời 47.000đ từ dịch vụ — chưa mở dịch vụ nào: mở ở 📈 Kinh doanh". Save tạm đã xoá từ trang không mở game (0 IndexedDB).
- **GĐ1616** — "Lời từ dịch vụ" hiện từ cấp 3 dù chưa mở dịch vụ nào: mô tả thêm "— chưa mở dịch vụ nào: mở ở 📈 Kinh doanh" (`hasService` tính trực tiếp từ biz.services). Đã rà hết 15 việc ngày: các việc còn lại đều làm được với tiệm ván mới. Full suite 575/5185 xanh.
- **GĐ1615** — QA trình duyệt GĐ1614: có Bếp nướng, không nhân viên → "Giao 7 đơn nấu — cần thuê 🛵 Giao hàng để khách gọi điện đặt". Bài học QA: xoá save tạm phải chạy từ trang KHÔNG mở game (vd. `/src/data/critic.ts`), nếu không game lưu lại ngay — save tạm GĐ1613 đã sót và nay đã xoá sạch (0 IndexedDB trên 127.0.0.1).
- **GĐ1614** — "Giao đơn nấu" khi có bếp nhưng chưa có người giao (điện thoại không đổ chuông → không thể có đơn): mô tả đổi thành "… — cần thuê 🛵 Giao hàng để khách gọi điện đặt" (`hasCourier` tính trực tiếp, không lưu). Full suite 575/5184 xanh.
- **GĐ1613** — QA trình duyệt GĐ1612 (save tạm 127.0.0.1, đã xoá): bảng Nhiệm vụ cấp 26 hiện "Bán 24 món nhà làm — tiệm chưa có bếp: mua ở 🛠️ Xây dựng" gọn 1 dòng (cao 16px).
- **GĐ1612** — Việc ngày "Bán món nhà làm"/"Giao đơn nấu" hiện từ cấp 21 kể cả khi tiệm chưa có bếp (không làm được). Nay giữ chỗ trong bộ (không xáo danh sách khi mua bếp giữa ngày) nhưng mô tả thêm "— tiệm chưa có bếp: mua ở 🛠️ Xây dựng" (`hasCookStation` tính trực tiếp, không lưu → save cũ an toàn; hẻm online tính trên state đồng bộ). Full suite 575/5183 xanh.
- **GĐ1611** — QA trọn vòng nhà phê bình trong ván thật (127.0.0.1, save tạm đã xoá): gọi "Bánh tráng trộn" (Bếp nướng, 10 phút) → bày lên kệ → +500.000đ, "🌟 Nhà phê bình khen…", hết lời hẹn.
- **GĐ1610** — QA nhà phê bình trong ván thật (save khách tạm trên 127.0.0.1, origin riêng — không đụng save ngày 37 ở localhost): cấp 50 + chỉ Bếp nướng → gọi "Bánh mì kẹp xà lách (Bếp nướng)" (8 phút, mở cấp 47) rồi "Bánh pía nướng nóng (Bếp nướng)"; thông báo hiện trên HUD. Save QA đã xoá.
- **GĐ1609** — Rà K2/K3 (chợ đồ cũ, tủ trao đổi): hẻm online là MỘT tiệm chung (kho/tiền dùng chung, server chỉ chuyển state/act/lock) → trao đổi trong hẻm vô nghĩa; giữa các hẻm cần kho lưu mới trên server → giữ chờ backend. Full suite 574/5181 xanh sau GĐ1608.
- **GĐ1608** — Nhà phê bình chỉ gọi món nấu xong trong 25 phút (khung 30 − 5 phút bày kệ); món 30 phút trước đây xong đúng lúc hết hẹn → phạt dù nấu ngay. Rà "trang trí nhiều lớp": sơn tường/nền cả tiệm đã có (`style`); nền riêng từng khu cần đổi tìm đường (đồ hiện chắn lối) → giữ chờ siêu thị nhiều khu.
- **GĐ1607** — QA trình duyệt GĐ1604–1606 (nạp module qua Vite, không đụng save thật ngày 37): tiệm chỉ có Bếp nướng ở cấp 50 → 5/5 lần gọi đều món nướng, câu "… (Bếp nướng) — phục vụ trong 30 phút!" gọn 1 dòng. Full suite 574/5180 xanh.
- **GĐ1606** — Thông báo nhà phê bình gọi món ghi kèm bếp đang có để nấu ("… gọi Xôi gấc (Bếp xôi) — …"); không thêm thông báo mới (`criticCallText`).
- **GĐ1605** — Nhà phê bình lọc như đơn điện thoại: chỉ gọi món nấu được bằng trạm ĐANG có trong tiệm và không trái mùa (không khớp gì thì lùi về mọi món đã mở). Rà HappyTown P0/P1: ngoại hình riêng khách quen + nhờ vả nhiều ngày đã có.
- **GĐ1604** — Sửa nhà phê bình (rà lại KE-HOACH I1): từ cấp 45 trước đây có thể gọi món khóa tới cấp 100 → không nấu được, phạt 3★1 chắc chắn. Nay nghiêm ngặt gọi mọi món ĐÃ MỞ (kể cả món mới mở); nhẹ chỉ gọi món mở từ ≥10 cấp. Chạy ở máy chạy sim như cũ → hẻm online không đổi. Đối chiếu xong 6 tài liệu tham khảo: mọi mục còn lại đều chờ siêu thị phase 2/backend.
- **GĐ1603** — Mẹo cấp 32: mốc sao món nấu 20/100/800 lượt và dòng đếm 3★ ở Sổ nấu.
- **GĐ1602** — Đầu Sổ nấu hiện "🏆 N món đã đạt 3★" (maxedDishLine). QA trình duyệt nhãn GĐ1601 hiện đúng; save QA đã xoá.
- **GĐ1601** — Sổ nấu: món đã 3★ hiện "🏆 bậc cao nhất" thay vì để trống mục tiêu (dishMaxLabel). Rà KE-HOACH I4/K1: kiên nhẫn 60%, trần vắng mặt 30+cấp×5, nút Nhập đủ đều đã có.
- **GĐ1600** — Rà soát + QA save mới: bán đầu tiên ~35s, không lỗi console. Chuỗi GĐ1591–1599 (tặng quà, gắp trúng) đều là đếm/hiển thị, không đổi kinh tế; mọi trường mới tuỳ chọn. Lưu trữ GĐ1565–1572. Save QA đã xoá.
- **GĐ1599** — QA trình duyệt nút 🎁 (save QA cấp 40): "Kho hết Sữa hộp — nhập thêm để tặng" và "Chưa quen…" hiện đúng. Save QA đã xoá.
- **GĐ1598** — Nút tặng quà khi kho trống gọi tên món khách thích đã biết ("Kho hết X — nhập thêm để tặng"); món chưa khám phá vẫn giấu.
- **GĐ1597** — Nhiệm vụ "Tặng quà khách quen" thêm dòng hướng dẫn chỗ bấm 🎁.
- **GĐ1596** — Test store cho thông báo tặng quà + QA trình duyệt: "… +3 thân thiết · hôm nay đã tặng hết". Save QA đã xoá.
- **GĐ1595** — Thông báo tặng quà kèm "còn tặng được N khách" / "đã tặng hết".
- **GĐ1594** — Mẹo máy gắp (cấp 44) chỉ chỗ xem số lần trúng.
- **GĐ1593** — Tổng kết ngày thêm dòng "🧸 Khách gắp trúng thú bông N lần" (ẩn khi 0). QA trình duyệt dòng tab Dịch vụ GĐ1592.
- **GĐ1592** — Tab Dịch vụ thêm dòng "🧸 Gắp trúng thú bông hôm nay: N lần" (stats.clawWins tuỳ chọn, chỉ đếm, không tiền/RNG).
- **GĐ1591** — QA UI chuỗi tặng quà trên trình duyệt (save QA cấp 40): tặng thành công, bảng Khách quen ghi "đã tặng 1", tổng kết ngày có dòng "🎁 Quà tặng khách quen 1 món". Save QA đã xoá.
- **GĐ1590** — Rà soát + QA save mới: bán đầu tiên ~38s, không lỗi console; chuỗi tặng quà GĐ1584–1589 gọn trong regularGift.ts (nhiệm vụ, báo cáo, XP sinh nhật). Lưu trữ GĐ1557–1564. Save QA đã xoá.
- **GĐ1589** — Mẹo cấp 38: quà sinh nhật ×2 thân thiết +30 XP.
- **GĐ1588** — Tặng quà đúng sinh nhật khách quen +30 XP.
- **GĐ1587** — Bảng Khách quen hiện thêm "đã tặng N" hôm nay.
- **GĐ1586** — Báo cáo cuối ngày thêm dòng "🎁 Quà tặng khách quen".
- **GĐ1585** — Mẹo cấp 38: nhiệm vụ ngày tặng quà khách quen.
- **GĐ1584** — Nhiệm vụ ngày "Tặng quà khách quen" (cấp 38, 2 lần; stats.gifts tuỳ chọn, an toàn save cũ).
- **GĐ1583** — Cảnh báo sàn bẩn trên HUD (cấp 18, sàn ≥30) thêm "đoàn kiểm tra ghé lúc này sẽ lập biên bản" (`dirtInspectionNote`). Thuần UI.
- **GĐ1582** — Mẹo cấp 35: sàn sạch lúc đoàn kiểm tra ghé được khen +50 XP.
- **GĐ1581** — Đoàn kiểm tra khen sàn sạch (cấp 35): +50 XP, ghi trong câu khen (`praiseXp`). Không tiền.
- **GĐ1580** — Rà soát + QA save mới: bán đầu tiên ~41s. Gom: nhắc máy Sổ đầu ngày còn 1 dòng chung (GĐ1579); thông thạo (XP, tiến độ, tổng kết) trong `sellMastery.ts`. Trình duyệt: Sổ tay hiện "Thông thạo: 🥉 1 · 🥈 1 · 🥇 0". Save QA đã xoá.
- **GĐ1579** — Gộp nhắc Sổ đầu ngày: thay dòng riêng máy đánh giày (GĐ1572) bằng 1 dòng chung "Hôm nay <các máy> thu ×1,5" cho mọi máy đang được tăng phí (mưa/cuối tuần/lễ) — `boostedMachinesToday`.
- **GĐ1578** — Máy kẹo bông (cấp 46) ×1,5 cả ngày lễ hội (ngoài cuối tuần); popup "cuối tuần & ngày lễ ×1,5". Test GĐ1549 chọn ngày thường không trùng lễ.
- **GĐ1577** — Sổ tay Tiệm (cấp 36) hiện "Thông thạo: 🥉 N · 🥈 N · 🥇 N" (`masterySummary`). Thuần UI.
- **GĐ1576** — Huy hiệu thông thạo ở bảng chọn hàng kèm tiến độ tới bậc kế ("🥉 320/1.000"; Vàng thì chỉ 🥇); mẹo thông thạo nhắc có XP.
- **GĐ1575** — Lên bậc thông thạo món (cấp 36) thưởng XP Đồng 20 / Bạc 60 / Vàng 150 (`masteryXp`), báo trong tin chúc mừng. Chỉ XP, không tiền; recordDiscovery vẫn LOCAL_ONLY.
- **GĐ1574** — Sửa: chỉ tặng quà khách đã ghé ≥1 lần (trước sổ đếm cả khách chưa gặp, lệch với Sổ đầu ngày). Lỗi "Chưa quen — chờ khách ghé lần đầu".
- **GĐ1573** — Sổ đầu ngày (cấp 38) nhắc "Còn N khách quen có thể tặng quà hôm nay" (chỉ khách đã ghé ≥1 lần; `giftableCount`).
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

