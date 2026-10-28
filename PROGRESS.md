# PROGRESS — Tạp Hóa Đầu Ngõ (tap-hoa-3d)

> Đọc file này TRƯỚC TIÊN khi bắt đầu phiên mới. File được giữ GỌN: chỉ tầm nhìn, trạng thái, quy ước, quyết định, backlog và mục lục giai đoạn.
> Chi tiết đầy đủ GĐ1–GĐ153 (nguồn quyết định, công thức, QA, số liệu) nằm ở [docs/progress-archive/PROGRESS-GD1-153.md](docs/progress-archive/PROGRESS-GD1-153.md) — tra bằng `grep -n "GĐ1xx" docs/progress-archive/PROGRESS-GD1-153.md`.
> Quy ước: mỗi giai đoạn một commit; test phải xanh (`npm run test`) + build sạch (`npm run build`) trước khi duyệt. Ghi GĐ mới vào mục "Giai đoạn gần đây" (≤ ~15 dòng/GĐ); khi mục đó quá ~10 GĐ, dồn bản cũ sang archive và chỉ để lại 1 dòng ở Mục lục.

## Tầm nhìn game (mọi quyết định phải đối chiếu với phần này — KHÔNG tự ý thay đổi)

**Game là gì?** Mô phỏng quản lý **tiệm tạp hóa Việt Nam trong một con hẻm** (3D, góc nhìn thứ nhất): người chơi vừa là chủ tiệm vừa đứng quầy — nhập hàng, bày kệ, định giá, tuyển người, mở rộng sang trại/bếp/chi nhánh/quán nước/bán online, sống cùng con hẻm với khách quen, đối thủ và lễ hội.

**Cảm giác cốt lõi:** niềm tự hào của người chủ nhỏ dần thành cơ ngơi — "tiệm nhỏ đầu ngõ, mình chăm chút từng ngày, khách quen gọi đúng tên mình". Ấm áp, đời thường, đậm chất hẻm Việt Nam.

**Vòng lặp chơi chính (nesting):**
1. **Nhịp ngày (lõi):** sáng — Sổ đầu ngày (việc hôm nay + nhu cầu quầy + nhập/nấu/bày) → giữa ngày — đứng quầy, chốt deal, khách quen, đơn online → tối — chốt ngày, thu quà/nhịp.
2. **Nhịp dài:** tuần (thử thách) → tháng (mục tiêu) → mùa (sự kiện + Sổ Mùa) → năm (tổng kết) → NG+ Tái sinh.
3. **Trục tiến trình:** cấp mở khóa 10 hệ lớn × chiều sâu từng hệ (kệ, giá, nhân sự, trại→kho→bếp→quầy, chi nhánh 24/7, online) × quan hệ (khách quen, đối thủ, danh tiếng).

**Nguyên tắc thiết kế:** (a) mọi quyết định hằng ngày phải có dữ liệu phản hồi (không hộp đen); (b) phần thưởng phụ có cổng (không farming được); (c) không đổi công thức kinh tế khi thêm meta — meta chỉ soi sáng/ghi nhận; (d) UI ấm áp, gọn, rõ — dùng được khi chưa đọc hướng dẫn.

**Phong cách hình ảnh:** low-poly 3D màu ấm, UI nền tím-than (#3a3a4d) accent vàng (#f1c40f), icon emoji nhất quán, tiếng Việt đời thường. Bảng màu/biểu mẫu tập trung ở `src/ui/controls.css` + `src/ui/panels/shared.tsx`.

## Trạng thái hiện tại (28/10/2026)

- **1527/1527 test pass (142 files)** · build sạch (chỉ cảnh báo bundle-size có sẵn) · game chạy ổn định. Nhánh làm việc: `phat-trien-game-tu-do`.
- Đã xong GĐ1–GĐ153.
- Bức tranh tổng: các nhịp giữ chân (ngày/tuần/tháng/mùa/năm/NG+) đã bão hòa; UI responsive đa thiết bị đã audit kỹ (GĐ85–104, 116); trục "giá trị vs chi phí" đã soi kín gần hết tài sản: nhân sự tiệm chính/ca đêm/chi nhánh (141/142/144), mối hàng (143), bếp (145), trại (146/147), danh tiếng (148), quầy thịt cá (149), sổ nợ (150), hợp đồng (151), chi nhánh sau điện (152/153). Mở rộng Gánh hàng rong / Chợ phiên đã có (135–138), NG+ có dự phóng + mục tiêu vòng (139/140).
- Backup source trước GĐ1 (trước khi có git): `C:\Users\Admin\GAME_TU_DO_backup_2026-10-26.tar.gz`.

### GĐ153 — 🧮 Gọi đúng tên số dư chi nhánh (chưa phân bổ giá vốn) — ĐANG DỞ

- Lý do: GĐ152 tính `doanh thu − lương − điện` nhưng chưa có giá vốn hàng chi nhánh → gọi "lời ròng" dễ hiểu nhầm.
- Triển khai (chưa commit): `branchNetToday`/`BranchNet` → `branchOperatingBalanceToday`/`BranchOperatingBalance`; `net`→`balance`, `marginPct`→`afterOperatingCostsPct`, verdict `profit/loss`→`surplus/deficit`. BranchPanel hiện "Còn lại sau lương & điện", chip "dư vận hành/âm/chưa có thu" + dòng "Số dư vận hành; chưa phân bổ giá vốn hàng đã nhập." Không đổi công thức/state/save/kinh tế. File: `src/data/branchNet.ts`, `src/ui/BranchPanel.tsx`, `src/__tests__/branchNet.test.ts`.
- Kết quả: `npm run test` **1527/1527 pass (142 files)**; `npm run build` sạch (cảnh báo bundle-size có sẵn); reload `localhost:5173` thành công. Browser hiện chỉ có save cấp 1 nên BranchPanel bị khóa; không thay đổi save để ép cấp. QA GĐ152 trước đó xác nhận 3 mức số dư và bố cục @390; thay đổi GĐ153 chỉ làm rõ nhãn/note, không đổi cấu trúc. **Commit kế tiếp.**

## Quy ước kỹ thuật cần nhớ

- Thay đổi "soi sáng" (helper thuần đọc trong `src/data/*.ts` + một thẻ UI gọn) là mẫu mặc định — **không đổi SAVE_VERSION/kinh tế/persist** trừ khi bắt buộc.
- Test sim phải dùng **seed cố định** (`setSimSeed`, `simRng()` trong seam RNG — GĐ27/28) thay vì mock `Math.random`.
- QA live trên `localhost:5173` (vite); kiểm không tràn ngang @320/390 (`scrollWidth == clientWidth`), 0 lỗi console.
- Nhiều phiên có thể chạy song song trên cùng worktree → commit theo đường dẫn cụ thể.

## Quyết định lớn đã chốt

- Thứ tự ưu tiên giữ chân: vòng ngày → dẫn đường người mới → nhịp tuần → endgame/rival → hạ tầng server.
- NG+ (GĐ14) chỉ làm sau khi có quán thứ hai; giữ bộ sưu tập, chỉ bonus doanh thu (tối đa +48%), chặn khi hẻm online.
- Vé tha thứ streak: tối đa 1 lần/7 ngày, cần chuỗi ≥3. Thử thách tuần tích vào sổ tuần (không làm hệ song song).
- Sau GĐ83: ưu tiên chiều sâu UI/UX trước mở rộng hệ mới. Định hướng hiện tại: **chiều sâu-trước** — làm sâu hệ có sẵn (đóng hộp đen còn lại) rồi mới tính mở rộng.
- Kèo "Đặt kèo hôm nay" bám bộ "việc chính" (đông khách + bán hàng + doanh thu), không gồm "Khách vui vẻ" (GĐ107); thưởng nhiệm vụ có trần theo lãi bình quân (GĐ106); người chơi mới không bị trần (GĐ114).
- Khách treo câu hỏi quầy tự chốt theo giây thực (30s → 😕, 38s → 😤, 45s tự chốt — GĐ122).
- Lương trong số dư chi nhánh KHÔNG áp good_boss −10% (bảo thủ, trung thực).

## Cần theo dõi / nợ mở

- GĐ153: xác nhận trực quan câu chữ mới của BranchPanel khi có save cấp 22+; IAB hiện chỉ có save cấp 1 (GĐ152 đã xác nhận bố cục @390 và ba trạng thái cũ).
- (GĐ110/117) Mục tiêu nhiệm vụ ngày & kèo ở cấp 50+: sim bot hụt ~40% nhưng browser thật cấp 50 cho thấy target ×1.0 vẫn trong năng lực → chưa đổi; theo dõi nếu có phản hồi người chơi.
- Dock 1 hàng trên mobile — defer, chỉ làm khi có bằng chứng người chơi bấm nhầm.
- Mỗi lần subagent bị "model concurrency limit" → chạy tuần tự/đợi rồi spawn lại.

## Backlog tiếp theo

1. ~~Hoàn tất GĐ153 (test + build + QA + commit)~~ ✅ (commit sắp tạo; visual check câu chữ chờ save cấp 22+).
2. Leader + Game Designer rà hộp đen còn lại (gợi ý: giá vốn hàng theo chi nhánh để có lời ròng thật — chỉ khi đo được dữ liệu; các hệ "dữ liệu lạnh" còn sót), ưu tiên làm sâu trước mở rộng.
3. Tầm nhìn dài hạn: nhiều loại tiệm cung ứng cho nhau (xem memory "multi-shop supply chain").

## Mục lục giai đoạn đã xong (chi tiết trong archive)

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
- GĐ27 — Nền Seeded RNG cho sim (bước 1: seam + consumer đầu)
- GĐ28 — Cuốn RNG lõi vào seam (chi nhánh/khách/weighted)
- GĐ31 — Cân bằng kinh tế Quán Nước (khóa regress; đối xứng GĐ6)
- GĐ32 — Quán Nước: hiện LỢI NHUẬN RÒNG ở card "Hôm qua" (đóng vòng nhân viên ↔ giá bán)
- GĐ33 — Sổ cái tiền (ledger) toàn ván — khóa bất biến tiền trên mọi luồng thu/chi
- GĐ34 — Đo lại tỷ trọng chi nhánh ở ván cao (QA live, kết thúc backlog #7)
- GĐ35 — Chi nhánh: dòng "Lãi thô hôm nay" (thu − lương) ở tab Info
- GĐ36 — Sổ tay Tiệm: Album thu thập hàng hóa (Discovery Collection)
- GĐ37 — QA polish: stepper giá bán (false-positive) + đánh giá "tạm tính" (bug UX thật)
- GĐ38 — Mua đơn đầu tiên (Guided First Purchase)
- GĐ39 — "Chào mừng quay lại" (Welcome-Back Rewards)
- GĐ40 — Công trình khu phố (Community Landmark: Sân chơi trẻ em)
- GĐ41 — Đà giá thị trường (giải hộp đen giá gợi ý trên Bảng giá)
- GĐ42 — Cảnh báo đối thủ hạ giá cạnh tranh (rival lên tiếng trên HUD)
- GĐ43 — Cảnh báo lô cận hạn (biến "giảm hao phí" thành quyết định hằng ngày)
- GĐ44 — Combo "hiệu quả thực" (số lần kích hoạt để xoay combo)
- GĐ45 — Happy-hour "đáng giá": chọn đúng giờ có dữ liệu (đóng đề xuất #5)
- GĐ46 — Happy-hour "hôm nay hiệu quả thật": báo cáo kết quả khung (đóng vòng GĐ45)
- GĐ47 — Combo "gợi ý xoay": nên bật combo nào khi còn slot (đóng vòng GĐ44)
- GĐ48 — Sổ kỷ lục (cá nhân hóa "lý do quay lại": phá kỷ lục của chính mình)
- GĐ49 — Nhiệm vụ ngày "khép trọn" (tín hiệu X/M + chúc mừng xong cả bộ)
- GĐ50 — Chip mục tiêu hiện X/M nhiệm vụ ngày (luôn nhìn thấy, không cần mở bảng)
- GĐ51 — Sổ kỷ lục: feed "đang trên đà phá kỷ lục" (hôm nay so chính mình)
- GĐ52 — Xu hướng cơ sở (chi nhánh 24/7 + quán nước đang lên/xuống theo ngày)
- GĐ53 — Đào tạo nhân viên "thấy được" (tốc độ thật + lợi ích vai + chi phí)
- GĐ54 — Nhạy giá theo món trên bảng Giá (🔴 nhạy / 🟠 vừa / 🟢 bền)
- GĐ55 — Cam kết kỳ hợp đồng (quyết định đổi-lấy: trữ sẵn hàng để nhận thưởng tin cậy)
- GĐ56 — Kế hoạch giao kỳ trên Sổ đầu ngày (đóng vòng GĐ55 ngay tại màn khởi ngày)
- GĐ57 — "Mua khi rẻ": minh bạch chi phí nhập (đà giá MUA)
- GĐ58 — "Tiền bay đi đâu": sổ rủi ro/trộm (risk & security ledger)
- GĐ59 — "Đơn có đáng lấy": kinh tế từng đơn online + rủi ro điểm
- GĐ60 — "⚔️ Rival đang tiến hay lui": xu hướng sức mạnh đối thủ + 4 đòn bẩy của bạn
- GĐ61 — "🧾 Chính sách quầy": thái độ chủ tiệm (mặc cả & tiền lẻ)
- GĐ62 — "🧑 Khách của tôi là ai": nhân khẩu học khách vãng lai + quảng cáo chạm đúng nghề
- GĐ63 — "💡 Nên quảng cáo nghề nào": đề xuất nghề nên nhắm theo doanh thu (đóng vòng GĐ62)
- GĐ64 — "🔓 Mới mở — thử ngay": mồi mở khóa hệ mới sau ngày 1 (onboarding mid-game)
- GĐ65 — "🌙 Ca đêm có đáng không": lời/lỗ của khoản đầu tư 15 triệu "Mở ca đêm 24h"
- GĐ66 — "🧾 Dịch vụ nào đáng": hoàn vốn từng dịch vụ quầy (khép vòng mua 1 lần)
- GĐ67 — "🤝 Mối quen lâu dài": quan hệ nhà cung cấp + hoàn tiền sỉ theo THÁNG
- GĐ68 — "🛒 Chợ phiên nhà cung cấp đặc biệt": thương lái bán lô rẻ đầu tháng
- GĐ69 — "📖 Sổ thương mến": bể khách quen toàn tiệm + quà tri ân cuối tháng (phía BÁN)
- GĐ70 — "🎊 Đón lễ: trữ sẵn trước mùa": trục giữ-chân THEO DỊP LỄ (seasonal)
- GĐ71 — "📖 Hồ sơ tiệm + Huy hiệu thâm niên": meta-progression dài hạn (không phải trục cadence)
- GĐ72 — "🏪 Tiện lợi 24/7: việc hôm nay": mặt chủ động cho chi nhánh
- GĐ73 — "🌾 Nên hôm nay": chuỗi sản xuất hội tụ (trồng → nấu → quán nước)
- GĐ74 — "🤝 Đối tác chi nhánh × quán nước: Hiệp lực tháng": hội tụ 2 tài sản doanh thu lớn nhất
- GĐ75 — "🌟 Sự kiện thử thách theo mùa (Seasonal Mini-Event)": đợt burst 5 ngày theo mùa
- GĐ76 — "🗓️ Việc hôm nay: một bảng, đúng thứ tự (cảnh báo ép nhịp)": hành động sổ đầu ngày gom về 1 bảng ưu tiên
- GĐ77 — "🛒 Nên hôm nay: cả đêm nay của chi nhánh": đưa chuỗi sản xuất vào tài sản doanh thu lớn nhất
- GĐ78 — "🛒 Nhu cầu quầy: dự báo cầu theo giờ của tiệm chính"
- GĐ79 — "🧭 Nếp vận hành: chuỗi ngày sạch"
- GĐ80 — "📖 Câu chuyện khách quen: đợt nhờ vả nhiều ngày (Regular Errand Arc)"
- GĐ81 — "🗺️ Phía trước: bản đồ mở khóa toàn ván (Unlock Roadmap)"
- GĐ82 — "📅 Tròn một năm — tổng kết năm vận hành (nhịp năm)"
- GĐ83 — "📖 Sổ Mùa — Niên giám 4 mùa dài hạn: bộ sưu tập sao mùa toàn ván"
- GĐ85 — Fix "màn hình trắng": save schema cũ sập cả HUD
- GĐ86 — Dock điện thoại: hết nút tràn ra khỏi màn (đóng 1 phần UI-gate đa kích thước)
- GĐ87 — QA đa kích thước: 6 viewport × 10 panel, 0 overflow
- GĐ88 — Polish UI
- GĐ91-92 — Fix "chức năng bị che khuất" (feedback người chơi 28/10)
- GĐ92b — Menu "Thêm" tràn màn hình hẹp (tiếp feedback "chức năng bị che")
- GĐ93 — Audit đa thiết bị hệ thống + sửa lớp nền responsive (feedback "thiết kế theo màn chưa chuẩn")
- GĐ94 — Giảm chiều sâu cuộn panel dày nhất trên mobile (Cook tab theo trạm, Regulars thẻ gập)
- GĐ95 — Hết lớp tràn ngang còn lại: var padding panel + phân trang Đánh giá
- GĐ96 — Chốt 0 tràn ngang nhìn thấy được: flex-wrap thống kê + minmax co giãn + khoá cuộn ngang panel
- GĐ97 — QA luồng chơi thật trên mobile 390px sau GĐ93–96: đạt toàn bộ
- GĐ98 — Trả 2 nghi thức hằng ngày về dock trên màn ≤480 (quan sát GĐ97)
- GĐ99 — Rút gọn mô tả Sổ nấu trên màn hẹp (backlog GĐ98 mục 2)
- GĐ100b — Prompt chốt deal quầy: border-box toàn HUD (kéo dài GĐ100)
- GĐ101 — Chốt nợ GĐ100b: vệt cuộn "vô hình" BusinessPanel là lỗi thật ở 320px, đã sửa
- GĐ102 — QA tương tác chốt deal quầy trên mobile (backlog GĐ99 mục 4) + thế giới dừng khi có câu hỏi
- GĐ103 — Chiều sâu vòng ngày: dự phóng trước khi chốt (giá + đơn nhập) + Đặt kèo hôm nay
- GĐ104 — Polish UI 3 chỗ: footer Nhập hàng hết tràn 4px @320, thẻ kèo nén ≤200px @390, heatmap kệ đưa về Planogram
- GĐ105 — Khảo sát kinh tế vòng ngày: mô phỏng 30 ngày cấp 5/10/20, đo nguồn thu (bán hàng vs nhiệm vụ vs kèo)
- GĐ106 — Neo thưởng nhiệm vụ vào kinh tế thật: trần tổng thưởng bộ theo lãi bình quân (đóng GĐ103-№3)
- GĐ107 — Kèo dễ trúng hơn: kèo bám bộ "việc chính hôm nay" (đông khách + bán hàng + doanh thu), bỏ quest "khách vui" chết cứng
- GĐ108 — Làm mềm quest "Khách vui vẻ" (`daily_smile`): đếm khách hài lòng thay vì "tất-cả-hoặc-không"
- GĐ109 — Kèo không còn hộp đen: thẻ kèo (pending) hiện tiến độ sống của bộ "việc chính" X/Y
- GĐ110 — Khảo sát kèo & kinh tế vòng ngày giai đoạn cao (cấp 30/50/80): đo thuần, không sửa code
- GĐ111 — Sạch chuỗi lời kèo: đổi mọi chữ "trọn bộ" thành "việc chính" cho khớp GĐ107
- GĐ112 — Khóa bộ kèo trên dịp biến thể: test lễ/festival + lời hẹn/reserve trong BET_CORE_IDS
- GĐ113 — Kèo treo từ save cũ: phòng cảnh tương thích (trọn bộ → việc chính) + round-trip save
- GĐ114 — Người chơi MỚI: kèo & trần kinh tế ngày đầu phải thân thiện (không bị cày)
- GĐ115 — QA trực quan thẻ kèo GĐ107–111 trên trình duyệt thật (đóng "Cần duyệt")
- GĐ116 — Audit đa kích thước panel mở rộng (Levels/Landmark/Discovery) trên browser thật (đóng backlog #4)
- GĐ117 — Xác minh browser thật target kèo ×1.0 ở cấp 50 (bổ sung bằng chứng GĐ110)
- GĐ118 — QA live quest "Khách vui vẻ" (GĐ108) + xác nhận đường "Nhận tất cả" an toàn cho kèo
- GĐ119 — Dấu hiệu "khách sốt ruột" ở quầy (làm sâu khoảnh khắc phục vụ, UI-only)
- GĐ120 — Phản hồi cuối ngày "mất khách vì chờ quầy" (đóng vòng lặp của GĐ119)
- GĐ121 — Nhịp chạy tuần (Weekly Pace): tín hiệu kịp/hụt + rủi ro mất chuỗi cho thử thách tuần (UI-only)
- GĐ122 — Khách chờ mặc cả/ghi sổ quá lâu: tự chốt theo giây thực (đóng backlog #2 desk-queo)
- GĐ123 — Đưa analytics + kỷ lục vào vòng ngày cho người chơi cấp 60+ (đóng backlog #1 chiều sâu cấp cao, đề xuất #2 của Game Designer audit)
- GĐ124 — Làm sâu COMBO theo NGÀY: mở khóa quyết định "xoay slot combo" (khuyến nghị #1 audit deleg_cf5d8d4e)
- GĐ125 — Làm sâu hệ HỢP ĐỒNG: "Sổ chuỗi hợp đồng" đóng vòng phản hồi quyết định bị đứt (khuyến nghị #2 audit deleg_cf5d8d4e)
- GĐ126 — 🔮 "Mai tiệm có gì": mồi quay lại ngày mai ở tổng kết cuối ngày
- GĐ127 — Sổ kinh doanh Quán nước: đóng vòng phản hồi quyết định 25M (đề xuất #1 audit Game Designer)
- GĐ128 — 📈 "Quảng cáo có đáng không": đóng vòng phản hồi ROI nguyên quảng cáo (đề xuất B1 audit)
- GĐ129 — 🎫 "Thẻ tích điểm có đáng không": đóng vòng phản hồi chi phí–lợi ích (primary audit nối tiếp)
- GĐ130 — 🌞 "Giờ vàng hôm nay có đáng không": đưa verdict giờ vàng ra ranh giới ngày (B2 audit còn sót)
- GĐ131 — 📦 "Hết hàng còn bỏ lỡ bao nhiêu": định lượng lãi bỏ lỡ vì kệ/kho tiệm CHÍNH (primary audit sau khi backlog cạn)
- GĐ132 — 🧭 "Sắp mở khóa": đưa tiến trình mở khóa hệ vào Sổ đầu ngày cho người chơi MỚI (B1 audit)
- GĐ133 — 🥀 "Đêm qua hỏng hàng bao nhiêu": bản kê NGƯỢC hàng hết hạn/hỏng theo món (primary audit deleg_9ecd6919)
- GĐ134 — 🧊 "Tủ lạnh kho đầy": định lượng hàng cần lạnh vượt khả năng giữ lạnh (backup B2 audit deleg_9ecd6919)
- GĐ135 — 🧺 "Chợ phiên đầu ngõ": bản đánh giá thuần-đọc hàng DƯ đáng gánh ra bán (slice 1 của mở rộng Gánh hàng rong)
- GĐ136 — 🧺 "Bán chợ phiên": action bán hàng DƯ thật sự, một lần mỗi phiên (hoàn thiện mở rộng Gánh hàng rong)
- GĐ137 — 🧺 "Chợ phiên ngày mai": mồi cuối ngày báo trước phiên chợ + hàng DƯ, chuẩn bị từ đêm (làm sâu CHÍNH mở rộng Gánh hàng rong)
- GĐ138 — 🧺 "Chợ phiên hôm nay": tổng kết cuối ngày gánh hàng DƯ đã bán (làm sâu tiếp mở rộng Gánh hàng rong)
- GĐ139 — 🌳 "Chuẩn bị tái sinh": dự phóng NG+ thuần đọc, đóng trục lặp lại cuối cùng còn là hộp đen
- GĐ140 — 🌱 "Mục tiêu vòng tái sinh": cho vòng NG+ một cuốn mục tiêu ngắn — vài mốc đo theo VÒNG, nhận thưởng tiền, reset mỗi lần tái sinh
- GĐ141 — 💸 "Người này đáng đồng lương không?": bảng giá trị hôm nay của từng nhân viên ca ngày so với lương — đóng vòng phản hồi quyết định nhân sự (làm sâu hệ nhân viên đang có)
- GĐ142 — 🏪 "Tiện lợi đáng đồng lương?": bảng giá trị hôm nay của từng nhân viên CHI NHÁNH so với lương — đóng vòng phản hồi quyết định nhân sự tiện lợi
- GĐ143 — 🤝 "Mối nào rẻ THẬT": giá vốn theo từng mối sau bớt số thùng + hoàn tháng, và mối rẻ nhất theo từng món hôm nay — đóng mảnh GIỮA (mua Ở mối nào) còn là hộp đen của vòng nhập hàng
- GĐ144 — 🌙 "Ca đêm ai xứng đồng lương?": giá trị hôm nay của TỪNG nhân viên CA ĐÊM tiệm chính so với lương thực trả (×1.5 · good_boss −10%) — đóng góc "nhân sự lạnh" cuối cùng của trục giá trị VS chi phí nhân sự
- GĐ145 — 🍳 "Nấu món nào xứng cho trạm": kinh tế nấu bếp — lãi theo PHÚT TRẠM THẬT + nguyên liệu bán rời có hời hơn nấu không
- GĐ146 — "🌱 Trồng giống nào, nuôi con nào đáng?" — kinh tế trang trại theo LUỐNG/NGÀY và CON/NGÀY
- GĐ147 — "🧑🍳 Nấu hay bán lẻ nông sản nhà trồng/nuôi?" — mặt ghép trại→bếp, nấu lời hơn bán lẻ bao nhiêu
- GĐ148 — ⭐ "Danh tiếng đáng bao nhiêu khách?" — đưa danh tiếng (ẩn trong máy) ra con số khách/ngày
- GĐ149 — 🔪 "Quầy thịt cá có người bán không?" — đưa lỗ cầu thịt cá (hộp đen) ra con số tiền/ngày
- GĐ150 — 💳 "Ghi sổ đang khóa bao nhiêu tiền, ai sắp quỵt nợ?" — định lượng Sổ nợ (tiền khóa + rủi ro mất hẳn)
- GĐ151 — 🤝 "Hợp đồng này có đáng ký?" — ROI nhận hợp đồng (đóng hộp đen "có nên ký hợp đồng không")
- GĐ152 — 🏪 "Chi nhánh 24/7 hôm nay lời hay lỗ sau điện?" (đóng hộp đen "chưa trừ điện" của tiện lợi)
- GĐ153 — 🧮 Gọi đúng tên số dư chi nhánh (chưa phân bổ giá vốn)
