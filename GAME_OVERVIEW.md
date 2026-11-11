# TẠP HÓA ĐẦU NGÕ (tap-hoa-3d) — Tổng hợp nội dung game hiện có

> Mục đích: file đưa đi phân tích / lấy ý tưởng. Cập nhật theo code 10/11/2026 (đến GĐ2279 — đã chốt chiều sâu SPEC-CHIEU-SAU: Hệ 1 Phơi·Muối·Ủ, Hệ 2 Tình làng, Hệ 3 Định vị tiệm, Hệ 4 Nhãn riêng + tầng 3D).
> Nguồn: `PROGRESS.md`, `src/data/*`, `src/core/*`, `src/agents/*`, `server/*`. Số liệu đếm bằng grep nên là xấp xỉ.

---

## 1. Tổng quan

- **Thể loại:** mô phỏng quản lý **tiệm tạp hóa Việt Nam trong một con hẻm**, 3D góc nhìn thứ nhất, mobile-first (PWA), tiếng Việt.
- **Cảm giác cốt lõi:** "tiệm nhỏ đầu ngõ, chăm từng ngày, khách quen gọi đúng tên mình" → dần thành cơ ngơi. Ấm áp, đời thường.
- **Tech:** React 19 + Three.js (WebGL/WebGPU+TSL) + Zustand; lưu IndexedDB (Dexie) + cloud MongoDB; đăng nhập Firebase; server Express + WebSocket (hẻm online / co-op). Vitest ~740 file test. ~68k dòng TS trong `src`.
- **Quy mô nội dung:** 200 cấp · ~600 mặt hàng (370 catalog + 131 sản phẩm gốc + ~100 hàng nhà làm) · **~520 công thức nấu** · 12 vai nhân viên · 37 nghề khách · 28 khách quen · 13 chương truyện · 18 sự kiện lịch · ~45 thành tựu · 7 bậc tiệm.
- **Triết lý thiết kế (đã chốt trong PROGRESS):** (a) mọi quyết định có dữ liệu phản hồi, không hộp đen; (b) thưởng phụ có cổng, không farm được; (c) thêm meta thì **không đổi công thức kinh tế** (chỉ "soi sáng"); (d) UI ấm, gọn, dùng được khi chưa đọc hướng dẫn. Định hướng hiện tại: **chiều sâu trước, mở rộng sau** (người dùng chưa duyệt "Ngõ 3").
- **Đủ 2 chế độ:** mọi tính năng phải chạy giống nhau ở chơi đơn và hẻm online/co-op (có test parity).

## 2. Vòng lặp chơi

1. **Ngày (lõi):** 06:00 thức → *Sổ đầu ngày* (việc hôm nay, nhu cầu quầy, nhập/nấu/bày) → 08:00 mở cửa (giờ chỉnh 6h–8h) → đứng quầy / chốt deal / khách quen / đơn online → 22:30 đóng cửa → 23:00 kiểm kê → ngủ (từ 18:00; quá 02:00 thì ngất, mất tiền thuốc) → tổng kết ngày. Đồng hồ: 1 giây thật = 2 phút game ở 1×. Có lịch tự động (`autoRoutine`).
2. **Tuần → tháng → mùa → năm:** thử thách tuần (chuỗi tuần), mục tiêu tháng (`monthPace`), sự kiện mùa 5 ngày + Sổ Mùa (niên giám, mốc 15/30/50 sao), tổng kết năm + thưởng tròn năm.
3. **Cuối game:** Tái sinh NG+ (cấp ≥60 & doanh thu ≥100tr; +8%/lần, tối đa 6 lần = +48%; giữ bộ sưu tập; chỉ chơi đơn).
4. **Tiến trình theo cấp (1→200):** `xpToNext = 35·level^1.25`; khách/ngày = 20 + 4·level. Cấp 100–200 có danh hiệu (Ông trùm chợ phường … Thánh tạp hóa).

## 3. Hệ thống chính (theo mở khóa)

| Cấp | Hệ / tính năng |
|---|---|
| 3 | Bảng giá (tự đặt giá, khách nhạy giá) |
| 4 | Thuê nhân viên (thu ngân, xếp hàng, giao hàng) |
| 5 | Thẻ tích điểm, vay vốn |
| 6 | Combo khuyến mãi (3→6 slot theo cấp 12/18/25), kệ hàng chớp nhoáng, tiệm nới rộng |
| 8 | Trang trại (vườn), mạng xã hội |
| 10 | Bán online (app giao hàng, hoa hồng 12% giảm theo bậc), Chi nhánh 24/7 |
| 14–16 | Chuồng gia cầm, đơn trại, mua thêm đất (cấp 16) |
| 15 | Bảo vệ · 18 pha chế/phụ trại · 22 quản lý · 25 đầu bếp |
| 21 | Nấu món nhà làm (sổ nấu) |
| 29 | Quán nước đầu ngõ (25tr) |
| 30 | Mini mart, quản lý kho · 32 bán thịt cá · 35 chăm sóc khách |
| 32 | Việc nhà trong hẻm (giỗ, lo cỗ) |
| 34 | Sân phơi · 38 vại muối · 46 nhà chum ủ |
| 40 | Tiệm xôi (30tr), chương 10 · 45 Siêu thị tạp hóa |
| 55–58 | Chương 11, Siêu thị khang trang |
| 60 | Tái sinh NG+, Định vị tiệm (Bình dân / Đặc sản / Tiện lợi) |
| 60+ | **Hệ 3 Định vị tiệm (SPEC-CHIEU-SAU §3):** treo biển theo 3 hướng từ cấp 60, khớp hướng → bậc 1–5 (3/10/21/35/50 ngày) kèm hiệu ứng + thưởng/phạt, đổi biển 5tr×bậc + 14 ngày "làm lại", ấn NG+, hai biển cùng lúc (Hệ3-L8); biển phụ 3D dưới bảng hiệu tiệm theo hướng treo |
| 100 | **Hệ 4 Nhãn riêng (SPEC-CHIEU-SAU §4):** lập nhãn (≥100 mẻ & bán ≥500), 6 dòng hàng (100→180), xưởng đóng gói + thợ, uy tín nhãn 5 bậc → premium bán lẻ 5–25%; **bỏ mối 5 đại lý** (110→170, giao kỳ), **bán cho đối thủ** 95% (nuôi rival), **nhượng quyền 3 điểm** (150/170/190), **4 danh hiệu nhãn** (uy tín 40/60/80 + 3 nhượng quyền khỏe 30 ngày); hồ sơ nhãn giữ qua NG+ |
| 112 | Hệ 1 Phơi·Muối·Ủ (SPEC-CHIEU-SAU §1): 6 mẻ phơi/muối/ủ, giàn nong + bạt kéo (34), vại muối (38), nhà chum (46), mốc ủ lâu ×1,6; một nắng/phơi sương, phụ trại thu hộ |
| 75 | Chương 12, **Đại siêu thị** (24×14) + ô mở rộng tiếp giáp |
| 42–50 | Quảng cáo mở rộng (tờ rơi/băng rôn/tiếng lành hẻm) |
| 100–200 | Món/nội dung cuối game (công thức tới cấp 200 là trần) |

Bản đồ mốc đầy đủ ở `src/data/unlockMap.ts` (panel "🗺️ Phía trước").

## 4. Nội dung chi tiết từng mảng

### 4.1 Cửa hàng & bố cục
- **7 bậc tiệm:** Tiệm nhỏ đầu ngõ 8×5 → nới rộng 10×6 (500k) → Tạp hóa lớn 12×8 (2,5tr) → Mini mart 15×10 (7tr) → Siêu thị tạp hóa 18×12 (16tr) → Siêu thị khang trang 21×13 (30tr) → Đại siêu thị 24×14 (52tr). Thợ làm xong sáng hôm sau. Thêm ô mở rộng, sơn nền/vách theo khu (ngành hàng siêu thị), phong cách tiệm tùy biến.
- **Ngành hàng (7):** đồ khô, đồ uống, hàng mát, đông lạnh, gia dụng, tươi sống, thịt cá tươi (→ quyết định kệ/tủ mát/tủ đông). `departments` chia khu siêu thị.
- **Nội thất ~45 loại:** kệ gỗ/siêu thị, tủ mát/đông, quầy thu ngân phụ, bãi xe đẩy, quầy rau quả, quầy thịt cá, **trạm nấu** (bếp nồi, bếp nướng, chảo chiên, nồi hấp, quầy xôi, máy xay, quầy pha chế, máy ép mía, bàn gói quà), **khu ăn tại chỗ** (bàn, ghế, nhà vệ sinh 3 bậc), **máy kiếm tiền** (bán nước, ghế massage, đánh giày, kẹo bông, chụp ảnh, cân sức khỏe, gắp thú), **decor** (chậu cây, đèn lồng, tranh Đông Hồ, bộ "Đồ Việt": bình Bát Tràng, trống đồng, chùa Một Cột; bảng hiệu đặc sản 4 miền; mâm ngũ quả, đèn ông sao theo dịp lễ).
- **Kệ:** nhiều tầng/ô, planogram, heatmap bán theo kệ, lời/m², độ mòn & hỏng (sửa chữa), tự đổi ô hết hàng (`autoSwap`), nút "Bày đầy cả tiệm", "Nhập đủ".
- **Điểm decor 🩷:** kéo thêm khách (`decorVisitBoost`); có xếp hạng "mua decor nào trước", payoff từng món.
- Nâng cấp thiết bị vĩnh viễn (camera chống trộm, POS nhanh…), nâng kho theo bậc + vật liệu.

### 4.2 Hàng hóa & chuỗi cung ứng
- **Nhà cung cấp (7):** Đại lý đầu ngõ, Chợ đầu mối, Giao hỏa tốc, Kho sỉ Đại Phát, Nhà hàng xóm, Nhà bà Tám, **Mối lái đặc sản vùng** (đặc sản 4 miền, biên ×1,70). Có quan hệ nhà cung cấp (bậc đối tác), chợ phiên đầu tháng (lô sỉ rẻ), thương lái sỉ, hợp đồng cung ứng (giao định kỳ, chuỗi đúng hẹn, cam kết trữ hàng), giá thị trường nhích hằng ngày [0,8–1,4].
- **Hàng nhà làm hàng xóm** (`homemade`): chỉ nhập ở hàng xóm, giá cao hơn công nghiệp.
- **Hạn dùng theo lô:** mỗi lần nhập là 1 lô, bán lô cũ trước (FIFO), hỏng theo đêm/thời tiết/chỗ cất; cảnh báo cận hạn; quản lý kho xoay hàng.
- **Tồn kho:** nhà kho nhiều cấp, kho vật liệu, chuyển kho giữa các điểm bán, "rốn kho chung" (tiệm chính + chi nhánh + quán nước).
- **Đối chiếu giá/lời:** bảng giá, gợi ý giá, giá theo phân khúc khách, so đối thủ, lost-sales, vòng quay hàng.

### 4.3 Khách hàng
- **Khách vãng lai:** 37 nghề (công nhân, y tá, shipper, mẹ bỉm, giáo viên, thợ cắt tóc, bác sĩ, influencer, sinh viên, tài xế đêm…) × ~33 archetype mô hình; mỗi nghề có nhu cầu/giờ ghé riêng (`professionDemand`). Cao điểm sáng 6–9h (đã chốt giữ).
- **Hành vi:** chọn hàng, xếp hàng chờ quầy (kiên nhẫn có hạn), trộm cắp (bảo vệ bắt 92%), mặc cả, thối tiền lẻ, thanh toán đa dạng (tiền mặt/bank/ví/thẻ/ghi nợ), khách giỏ lớn (`bigBasket`), mua kẹp hàng chớp nhoáng, ngồi ăn tại chỗ, dùng máy.
- **Khách quen (28 người):** Bà Năm bán xôi, Chú Ba xe ôm, Bé Na, Bác Tám tổ trưởng, Chị Lan văn phòng, Sư cụ Khánh Long, Chị Vy livestream… Thân thiết → perk, câu chuyện (arc), tin cậy, quà tặng, hẹn giữ món, **sổ nợ** (ghi sổ, nhắc nợ, xóa nợ), có thể bị đối thủ lôi kéo (đòi lại bằng quà), churn.
- **Câu hỏi quầy** (khách hỏi/đặt món — chốt trong 30–45s thật), đơn đặt trước/đơn tiệc, đơn điện thoại hàng xóm (cần shipper), đơn online.
- **Đánh giá & danh tiếng:** review từng khách, danh tiếng 5 mặt (có nguyên nhân), nhà phê bình ẩm thực ghé khu ăn, thanh tra thị trường.

### 4.4 Nấu ăn & chế biến
- **Trạm nấu theo cách nấu thật:** `fryer` (152 công thức) · `hot_kettle` luộc/nấu/kho (157) · `food_grill` nướng (79) · `steamer` hấp (45) · `blender` (34) · `rice_station` cơm/xôi (27) · `drink_counter` (17) · `gift_wrap` (9) · `sugarcane_press` (2).
- Món có thật ngoài đời, đúng tên người bán gọi; công thức dùng nguyên liệu "làm sẵn" (cá, hải sản, thịt, rau…) + nhà trồng; mở theo cấp 54→200 (đợt cơm nhà, phở/bún/canh, hải sản…). Luật cứng trong `CLAUDE.md` + test `monThat.test.ts` chặn đổi sai tên/trạm.
- **Sổ nấu:** mẻ nấu có thời gian, thông thạo món (số mẻ → nấu nhanh hơn), sao món theo lượt bán, lịch nấu, đồ đựng; đầu bếp/pha chế tăng tốc.
- **Thay thế nguyên liệu:** `substitute`; nguyên liệu chưa có trong game thì dùng thứ gần nhất + ghi chú.

### 4.5 Nông trại
- Đất 3 bậc: Mảnh trại ven đường → Mua thêm đất phía sau (15tr, cấp 16; 8 luống) → Trang trại đầu ngõ (40tr, cấp 24; 12 luống).
- **~22 loại cây** (rau cải, bắp, lúa, nếp, đậu xanh, mía, chuối, ổi, xoài, cam, vải, nhãn, gấc, thơm, gừng, mít, bưởi, sả…) theo mùa (×1,5 đúng mùa), tưới, phân bón (+30%).
- **7 vật nuôi:** gà, vịt, ngan/ngỗng, heo, bò, dê, đông tảo → trứng (vỉ 10), sữa, thịt; cho ăn, máng.
- **4 công trình trại** (bù nhìn, tưới tự động, bãi thả, nhà lưới, tối đa 3 sao); rác/mảnh vụn; "crit" nông trại.
- **Hàng nhà trồng** bán lẻ ×1,2 (nhãn nhà trồng); đơn trại (bán cho quán cơm/lò bánh…, bonus ×1,25/×1,35 cuối tuần); phụ trại tự tưới/cho ăn/thu hoạch mỗi tối; bếp trại, nước ép.

### 4.6 Nhân sự
- **12 vai:** thu ngân, xếp hàng, lao công, giao hàng, bảo vệ, quản lý, pha chế, đầu bếp, quản lý kho, chăm sóc khách, bán thịt cá, phụ trại — mỗi vai một hiệu ứng thật (lương nhân hệ số).
- Ca (sáng/chiều/cả ngày/đêm), kỹ năng, **tính cách (trait)**, nguyện vọng, mệt mỏi (nghỉ việc ở 90), huấn luyện, thăng chức (nhóm trưởng → quản lý chi nhánh), lì xì Tết, tuyển ứng viên sinh ngẫu nhiên, ca trực chi nhánh. Quản lý tự nhập hàng (dưới 6 → bù tới 24), kiểm kho 7h/12h.
- Có bảng "payoff" định lượng giá trị từng vai (hirePayoff, managerAutoPayoff, warehouseKeeperPayoff, farmhandPayoff…).

### 4.7 Chi nhánh & cơ sở phụ
- **Chi nhánh 24/7 (cấp 10):** mặt bằng riêng, ca sáng/chiều/đêm, hàng đêm (mì ly, nước tăng lực…), nhóm khách đêm, rượu bia (giấy phép), ẩu đả/trộm/mất điện/vắng ca (sự kiện đêm), máy bán nước tự động, điện (máy phát/tiết kiệm), giao đêm, cuối tuần/trận bóng, báo cáo đêm. Chuyển hàng tự động (`branchHaul`).
- **Quán nước đầu ngõ (cấp 29):** nhân viên ≤3, mức giá rẻ/vừa/cao, thời tiết ảnh hưởng, thực đơn tùy chọn, ngày trận bóng, nâng bậc, tự pha tay.
- **Tiệm xôi (cấp 40):** nấu số lượng lớn rẻ 40% bù kho chung mỗi đêm, cúng xôi, mở rộng "big".
- **Sạp hàng rong Ngõ 2**, **bản đồ nhiều khu** (mở dần bằng tiền+cấp), Hiệp lực chi nhánh × quán nước (cam kết tháng).
- **Kênh bán thêm:** online (hoa hồng bậc, sự kiện khuyến mãi/Grab tăng), dịch vụ tiện ích (nạp tiền, hóa đơn, xổ số, giữ xe, gửi bưu kiện), máy tự phục vụ, chợ phiên bán dư.

### 4.8 Kinh doanh & tài chính
- **Chi phí:** tiền thuê tiệm theo bậc, lương, vận hành (% doanh thu), điện, sửa chữa, phí giấy phép, thuốc khi ngất.
- **Tín dụng:** vay vốn (lãi 0,8%/ngày, 30 ngày), hụi, huy động vốn đối tác, sổ nợ khách.
- **Đối thủ (6 tiệm):** Tạp hóa Phát Đạt, Mini mart Hưng Thịnh, Cô Ba Mới, 24h Ánh Dương, Quang Trung, Chợ Xanh; hành vi phá giá/chất lượng/liều; phản công (giá/quảng cáo/quà), mua lại tiệm đối thủ, kéo khách quen.
- **Quảng cáo/tiếp thị:** thẻ tích điểm, tờ rơi/băng rôn, mạng xã hội (viral tốt/xấu, khủng hoảng, xin lỗi), Hiệp lực.
- **Giấy phép & thanh tra:** kinh doanh, an toàn thực phẩm, bán rượu bia; thanh tra định kỳ phạt/thưởng; đoàn kiểm tra vệ sinh; rủi ro (trộm, hỏng, hàng giả, hao mòn).
- **Nhà ở & xe:** đồ nhà (nghỉ ngơi), ăn sáng, xe đạp/xe máy; thú cưng.

### 4.9 Tiến trình, mục tiêu, kể chuyện
- **13 chương truyện** (1 "Về hẻm giữ tiệm" → 13 "Siêu Thị Sao Mai"), thoại chương có thưởng, hoãn trong giờ vàng.
- Nhiệm vụ (~68), kèo hôm nay (đặt cược mức cam kết), mục tiêu NG+, thử thách tuần/tháng, thành tựu (~45) & danh hiệu/kỹ năng chủ tiệm, hồ sơ tiệm/kỷ lục/dossier, lộ trình, khám phá.
- **Sự kiện:** thời tiết (nắng/mây/mưa/bão/sương, dự báo), sự kiện ngẫu nhiên (sóng nhiệt, mưa dầm, khách sộp, bão, sửa đường, mất điện, đối thủ giảm giá), **sự kiện bất ngờ thành mini-arc 2–3 ngày** (có lựa chọn), lịch 18 dịp (Tết, Valentine, Trung thu, 20/11, Giáng sinh…) có mục tiêu chung hẻm + decor/hàng theo dịp, công trình khu phố (Sân Chơi Trẻ Em), quà điểm danh/rương/vòng quay, quà chào mừng quay lại.
- **Giữ chân:** streak điểm danh, thưởng tròn năm, niên giám mùa, nhắc quay lại ở màn đăng nhập (GĐ2224–2225).
- **Cá nhân hóa:** trang phục (37 bộ), hướng dẫn người mới/tour HUD, chương hướng dẫn.

### 4.10 Online / co-op
- Server Express + WebSocket (`server/index.ts`, `room.ts`): lưu cloud, hẻm online nhiều người chơi cùng 1 tiệm; máy chạy (host) tính, máy khách nhận state + gửi thao tác; `coopGuard` chống gian lận kinh tế; đồng hồ dùng chung; câu hỏi quầy ai đứng quầy cũng chốt được. Tab lock chống mở nhiều tab. Chính sách bảo mật + điều khoản (docs).

### 4.11 Đồ họa & âm thanh
- Low-poly 3D màu ấm, UI nền tím-than #3a3a4d + vàng #f1c40f, icon pixel 16×16 + emoji, chữ vẽ canvas dán 3D. Tài sản Blender → glTF (kit prop Draco/baked, lazy-load). Chất lượng đồ họa thấp/trung/cao + tự hạ khi FPS thấp; đèn hẻm/biển hiệu/đèn chờ; nhiều mẫu nhân vật + đồ đội/cầm. Audio 300 dòng (`core/audio.ts`).

## 5. Kiến trúc code (tóm tắt)

```
src/
  main.tsx, boot.tsx      khởi động, lazy-load
  core/                   store.ts (Zustand), gameTypes.ts (GameState), save.ts, slices/ (endDay, orders, sales,
                          branch, garden, staff, quanNuoc, tiemXoi, ads, online, social, prestige, progress…),
                          biz*.ts (tài chính/thành tựu/truyện), stock.ts, prestige.ts
  data/ (~270 file)       dữ liệu + hàm THUẦN (recipes 3.1k dòng, catalog, products, staff, branches, garden,
                          quests, chapters, calendar, rivals, regulars, professions, *Payoff.ts…)
  agents/                 customers.ts (khách), staff.ts, walker.ts, player.ts, residents.ts, branchVisit.ts
  world/ render/ shop/    dựng thế giới 3D, mô hình nhân vật/sản phẩm, kệ/nội thất, navGrid
  ui/ + ui/panels/        HUD, ~40 panel (Morning, Order, Staff, Branch, Garden, QuanNuoc, Build, Business…)
  net/                    coop, cloud, firebase, alleyApi, consent
  dev/                    autoplay, playtest, simEconomy, layoutAudit
server/                   index.ts (REST+WS), room.ts
```
- **Quy ước:** mỗi giai đoạn (GĐ) một commit; test xanh + build sạch; sim TẤT ĐỊNH có seed (`simRng`), `simGolden.test.ts` khóa số kinh tế (golden byte 24363320) → món/công thức mới ghi `since: 1` (kỷ nguyên nội dung, `data/contentEpoch.ts`) thì mở được ở bất kỳ cấp nào mà không đổi golden; không ghi `since`, hoặc là cơ chế mới, thì vẫn phải mở **sau cấp 30**; đổi kinh tế có chủ ý dùng `npm run golden:update`; save có `SAVE_VERSION`/migration.
- **Mẫu mặc định:** helper thuần đọc state + thẻ UI "soi sáng", không đổi save/kinh tế.

## 6. Hiện trạng phát triển (GĐ gần đây)
- GĐ2071–2210: ~140 món mới (cơm nhà, phở/bún/canh, hải sản, cá…), mỗi nguyên liệu "làm sẵn" kèm 2 món cấp 198/199 — **mạch thêm món đã bão hòa**.
- GĐ2211–2212: thêm đặc sản vùng (bánh cốm, kẹo cu đơ).
- GĐ2213–2218: payoff cho combo, decor, bảng hiệu đặc sản (đo ra khách/tiền thật).
- GĐ2219/2223: **hệ Quảng cáo** mới (cấp 42–50) + dòng số sống.
- GĐ2220–2222: payoff tự động hóa nhân viên (quản lý, quản lý kho, phụ trại).
- GĐ2224–2225: nhắc quay lại ở màn đăng nhập (năm + sự kiện mùa + niên giám).
- Mạch "payoff/soi một con số" **cạn hoàn toàn**; hướng cũ cần dừng để mở **cơ chế mới**.

## 7. Nợ / giới hạn đã biết
- Chờ upstream: 10 cảnh báo `npm audit` (firebase client grpc-js, minimatch dưới firebase-admin).
- Chưa đo FPS thật trên máy yếu/mobile; QA 2 tab co-op thật còn thiếu (môi trường).
- Chưa mở **Ngõ 3** (người dùng chưa duyệt); NG+ vòng & vài nhiệm vụ ngày đầu chờ dữ liệu người chơi thật.
- Cám heo/bò không khóa cao được vì sim cấp 5 phụ thuộc (đã thử rồi hoàn tác).
- Hạ tầng test nặng (~740 file) nhạy tải máy.

## 8. Chỗ trống có thể khai thác (gợi ý để phân tích)
- Hướng người dùng đã nêu cho "chiều rộng sau": **cùng đầu tư, chuỗi chế biến từ sản phẩm nhà/hàng xóm, chi nhánh đi lại giữa các khu**.
- Chưa có: sự kiện/mùa vụ có tính tương tác người chơi (mini-game), cơ chế cạnh tranh/đối kháng giữa người chơi online, xã hội hóa hẻm (tương tác hàng xóm sâu), nhập hàng ngoài tạp hóa kiểu "đi chợ/đi tỉnh", xuất khẩu/chuỗi liên tỉnh (có danh hiệu nhưng ít cơ chế), thiên tai/biến cố dài hạn, cốt truyện sau chương 13, hệ thống nghề phụ của chủ tiệm.
