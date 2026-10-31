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

- **GĐ316:** 🔕 Đo thông báo ngày đầu đúng người chơi thật: không đếm 📜/🎯 (phản hồi cú bấm nhận thưởng, bot nhận dồn 7 cái một lượt). Đo 11–14; trần 20 → 15. GĐ315 in danh sách thông báo để truy vết. Còn lại ≤10: dồn thông báo lên cấp liền nhau.
- **GĐ312:** 💰 Hạ trần thưởng nhiệm vụ theo lãi: sàn 150k→110k, hệ số 0,7→0,6 (`questEcoCap`). Giữ nguyên luật người mới chưa có lãi = không trần. Đo: cấp 5 **1,44**, cấp 10 **1,17**, cấp 20 **1,17** (trước 1,7–2,0 / 1,4–2,0 / 0,94–1,53). Toàn bộ 2356 test xanh. Còn lại tới ≤1: cấp 5/10, cần tăng lãi gộp.
- **GĐ311:** 💰 Đo lại tỉ số (nhiệm vụ+kèo)/lãi bán hàng thật (4 lần chạy): cấp 5 **1,7–2,0**, cấp 10 **1,4–2,0**, cấp 20 **0,94–1,53** (trước: 3,6/1,7/1,2) — thưởng không còn lấn lãi bán hàng rõ rệt, cấp 20 có lúc ≤1. Trần test hạ 5/3/2 → 3/2,5/1,8 (thử 4/2,2/1,4 thì đỏ do nhiễu mô phỏng, nên đặt theo đỉnh dải + đệm). Chưa đổi công thức kinh tế. Mục tiêu ≤1 còn ở cấp 5/10: cần giảm thưởng nhiệm vụ cấp thấp hoặc tăng lãi gộp — để Game Designer cân nhắc, đo trước/sau.

- **GĐ310:** 🔒 Khoá rò rỉ chặt hơn: đo 8 ngày liền object ngoài tiệm đứng yên 563 → 563 (0%), nhân vật sống dao động 13–26 (+11 tối đa). Trần `longSessionLeak` hạ: object +10% → +2%, nhân vật +40 → +20 (hai lần chạy liên tiếp đạt). Full suite GĐ309: 2356 xanh, 157s. Ghi nhận: tải ban đầu 618 KB còn lại chủ yếu `three` (267) + app (247); muốn ≤600 phải lazy-load `world/farm.ts` (chỉ cần từ cấp 8) — đụng khởi tạo thế giới 3D, để dành giai đoạn có QA 3D riêng. Toast ngày đầu 18 còn lại là mốc thật (lên cấp, nhiệm vụ xong do bot chơi nhanh) — không gộp vì mỗi lần bấm nhận cần phản hồi riêng.

- **GĐ309:** 🔕 Ngày đầu chỉ dạy vòng lõi: dời sang ngày 2+ bốn thông báo phụ — Danh hiệu mới (trừ danh hiệu NG+ vì tái sinh đưa ngày về 1), Chốt kèo, Chi phí vận hành, Thay ô hết hàng (thưởng/số liệu vẫn ghi nhận, xem ở Sổ đầu ngày/Tổng kết). Thông báo ngày đầu (bot) 22 → 18; trần `DAY1_TOAST_CEILING` 24 → 20. Test prestigeContent bắt đúng lỗi chặn nhầm toast NG+ → sửa. Phần còn lại là cột mốc thật (4 lần lên cấp, 6 nhiệm vụ xong do bot chơi nhanh gấp nhiều lần người); người thật ngày 1 ít hơn nhiều. Mục tiêu ≤10 cần gộp toast lên cấp/nhiệm vụ thành một.

- **GĐ308:** 📦 Firebase nạp động: `src/net/firebase.ts` dùng `import('firebase/app'|'firebase/auth')` (memo `loadAuth`), `watchUser` trả hàm huỷ an toàn kể cả khi SDK chưa nạp xong; `vite.config.ts` tách `vendor-firebase` (45,6 KB gzip, không còn gộp chung zustand/dexie). **Tải ban đầu 646 → 618 KB gzip**; trần `check-bundle` 680/300 → 640/290. Màn đăng nhập vẫn đủ nút, SDK kéo về sau khi trang hiện; full suite 2356 xanh, 159s. Còn: ≤600 KB (index app 247 KB + three 267 KB là phần lớn).

- **GĐ307:** 🧹 Nút HUD 28 → **20 (đạt mục tiêu dài hạn)**: thêm 2 nút gom — "⭐ Danh tiếng" (Đánh giá, Khách quen, Danh hiệu, Giấy phép) và "🌱 Mở rộng" (Trang trại, Quán nước, Sân chơi, Tiện lợi, MXH, Online); định nghĩa tập trung ở `src/ui/hubs.ts` (`HUBS`, mỗi tab có cấp mở khóa; tab chưa mở thì ẩn, riêng tab đang mở luôn hiện). Gộp luôn "Sổ sách" (GĐ306) vào cùng cơ chế. Mất: nút khoá 🔒 "Cấp N" làm gợi ý mở khóa — tab "Mở khóa" trong Sổ sách đã gánh vai đó. Trần HUD 28/18 → 20/10. Kiểm trình duyệt cấp 1: tab đúng cấp, layoutAudit 0 cắt/0 tràn; full suite 2356 xanh, 153s.

- **GĐ306:** 🧹 Nút HUD 33 → 28: gộp 6 nút tra cứu (Sổ theo dõi, Kỷ lục, Sức khoẻ món, Hồ sơ tiệm, Bản đồ mở khóa, Sổ tay Tiệm) thành MỘT nút "📊 Sổ sách" + thanh tab trong `Panels.tsx` (`SO_SACH_TABS`); các bảng cũ giữ nguyên, `openPanel({type})` ở mọi nơi vẫn chạy. Badge Hồ sơ giữ trên nút Sổ sách; badge Bản đồ mở khóa bỏ (nhiễu). Trần `HUD_TOOLS_CEILING` 33/23 → 28/18 (Thêm). QA 320px: 6 tab đều mở, tab xuống dòng gọn, layoutAudit 0 cắt/0 tràn; full suite 2356 xanh, 181s. Mục tiêu còn: ≤20 nút (gộp tiếp nhóm Kinh doanh/Ngoài tiệm/Nhân sự).

- **GĐ294–305** đã dồn archive: docs/progress-archive/PROGRESS-GD294-305.md (bundle/lazy, thông báo, test time, co-op morning shift).

- Bức tranh tổng: các nhịp giữ chân (ngày/tuần/cuối tuần/tháng/mùa/năm/NG+) bão hòa; UI responsive audit kỹ; trục "giá trị vs chi phí" soi kín; 3D chỉ khi kèm gameplay.
- Backup trước GĐ1: GAME_TU_DO_backup_2026-10-26.tar.gz (thư mục người dùng).

### Giai đoạn gần đây · GĐ281 (chi tiết GĐ cũ: docs/progress-archive/ — GĐ230–249: PROGRESS-GD230-249.md · GĐ250–280: PROGRESS-GD250-257.md)

- **GĐ177–271** đã dồn archive (docs/progress-archive/): 3D + đèn · supply chain · bộ soi tiền/vốn · PROGRESS-GD230-249.md · PROGRESS-GD250-257.md (phụ lục 258–271).



- **GĐ293 thương lái đầu tháng thành việc sáng** 🛒: đưa `fairMerchantAction(day, biz.fairTaken)` vào danh sách Việc hôm nay (Sổ đầu ngày) tương tự chợ phiên GĐ290. Ngày 1–2 đầu tháng khi thương lái ghé và tiệm chưa lấy lô tháng này, việc sáng hiển thị nhắc người chơi xem lô sỉ chiết khấu trong Nhập hàng (panel 'order', ưu tiên 3). Lấy lô xong tự ẩn việc nhắc. Test trong `src/__tests__/fairmerchant.test.ts`.
- **GĐ287 sân chơi dùng chung ở co-op** 🏗️: `contributeLandmark` được xác nhận là action chung qua máy chạy; lượt góp/ngày và tiền vật liệu là state của cả hẻm, giữ đúng luật 1 lượt/ngày như chơi đơn (không thêm quota riêng mỗi thành viên để tránh lệch kinh tế). Test client/server khóa tiến độ + tiền + chặn người thứ hai cùng ngày; sửa mô tả phân loại trong `coopGuard.test.ts`. QA live bảng hiện 0→1/28, trừ 8.000đ; thao tác client→runner đã có test tự động, chưa kiểm tra trực tiếp hai vai cùng lúc.
- **GĐ288 co-op parity: khoá chính sách tái sinh NG+ & chào mừng quay lại** 👥: (a) Tái sinh NG+ (doPrestige) giữ nguyên thiết kế an toàn chỉ chạy ở chơi đơn — tránh reset làm mất tiệm chung của cả hẻm; (b) Chào mừng quay lại (checkWelcomeBack) duy trì cơ chế nạp thưởng cục bộ theo máy khi đăng nhập chơi đơn, không can thiệp hẻm online; (c) Danh hiệu chung (checkTitles) do máy chạy soát và đồng bộ sau khi sang ngày. Bổ sung 2 unit test trong coopClient.test.ts.
- **GĐ291 lô chợ phiên nhận biết ăn vặt cuối tuần** 🍬: kết nối phiên chợ thương lái (GĐ68/GĐ221) với nhịp cuối tuần (GĐ254/255). Helper `fairLotValue` nhận thêm tham số `day`, phát hiện các món thuộc `WEEKEND_SNACKS` và xác định `isWeekendFair`. OrderPanel hiển thị gợi ý đặc biệt màu vàng khi lô chứa món ăn vặt cuối tuần, giúp người chơi tận dụng chiết khấu để chuẩn bị cho nhu cầu tăng cao. Test trong `src/__tests__/fairLotValue.test.ts`.
- **GĐ290 phiên chợ đầu ngõ thành việc sáng** 🧺: đưa `marketDayAction(chophien)` vào danh sách Việc hôm nay (Sổ đầu ngày) tương tự mẫu GĐ249 (trữ lễ) và GĐ257 (cuối tuần). Khi đến ngày chợ phiên (ngày 7, 14, 21...) và có hàng dư đọng vốn/cần lạnh, việc sáng hiển thị rõ số món dư và số tiền ước thu về để người chơi giải phóng kho trước giờ mở cửa. Test kiểm chứng trong `src/__tests__/marketClearValue.test.ts`.
- **GĐ289 nhịp tháng vận hành (monthPace)** 📆: hoàn thiện đối xứng với nhịp tuần (weekPace) cho tab Tháng. Tính năng: (a) `daysRemainingInMonth(day)` tính chính xác số ngày còn lại của tháng dương lịch; (b) `monthPace` dự báo khả năng hoàn thành thử thách tháng theo tiến độ thực tế; (c) UI BusinessPanel tab Tháng hiển thị % nhịp, dự kiến kịp/hụt, số ngày còn lại đến hết tháng và cảnh báo nguy cơ đứt chuỗi tháng (streakAtRisk) kèm XP chuỗi; (d) Unit test đầy đủ trong `src/__tests__/monthly.test.ts`.
- **GĐ281 độ phủ khách quen** 👥: probe 28 khách quen × 20 seed × 120 ngày — tất cả đều ghé được (834–839/2400, hash nhiễu tự nhiên 1.6×), không ai "tàng hình"; lock test ngưỡng 2× (bắt loại lỗi hệ thống GĐ267). Kết thúc chuỗi audit độ phủ: đơn (GĐ267) · sự kiện/thị trường (GĐ269) · khách quen (GĐ281). 2249 test xanh; boot @5173 sạch.

- **GĐ282 QA mắt 4 arc A–D trọn vẹn** 📖: force từng arc qua dev state và đi hết mọi cảnh/lựa chọn — Mưa rào (needStock chặn nút thiếu kho — hoạt động thật), Cái kính, Hẻm ngập (3 cảnh, chuyện NỐI mạch), Clip hot (3 cảnh); cả 4 done + ghi choices đúng; 0 lỗi console. **Kết hợp test cấu trúc + pick đều + told-exclusion → gate arc E MỞ** (save 100 ngày chỉ thấy ~1–2 arc — chờ save thật không thực tế, QA dựng trạng thái là bằng chứng mạnh nhất).

- **GĐ283 arc E "Hàng xóm khai trương"** 🎊 — def cam_do_mo thành arc thứ 5 (2 ngày 4 cảnh 3 nhánh). Chi tiết: archive (phụ lục 5).
- **GĐ285 khoá cấu trúc TIME_BANDS** ⏰: 6 khung phủ LIÊN TỤC 6h–22h không hở/chồng; wants toàn món thật (chặn loại id chết GĐ259); phân loại vàng (≥1.3: sáng/trưa/tối) / vắng (<0.8) / trung tính (khuya 0.8); trung bình trọng số 1.08 là số CÂN BẰNG THỰC NGHIỆM — không "sửa" về 1. 3 test; boot @5173 sạch (chip "Sắp đến giờ vàng" đúng ranh giới 6h).

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

- ⏱️ (GĐ296–298) `npm run test` rất nhạy với tải máy: cùng một bộ test cho **355s / 405s / 532s / 655s / 733s / 994s**. Ở lần 994s có **1 test đỏ**, chạy lại ngay sau đó thì **2331/2331 xanh (532s)** → đỏ do tranh CPU, không phải lỗi logic (GĐ298 chỉ sửa CSS + dev tool, không đụng logic game). Nếu gặp 1 test đỏ lẻ mà không liên quan thay đổi vừa làm: chạy lại đúng file đó trước khi kết luận. Nếu máy rảnh mà vẫn >10 phút: đo file chậm nhất (`npx vitest run --reporter=json`) rồi tối ưu — nghi phạm vẫn là cụm sim cấp 50 (GĐ280 ~242s/file).
- QA mắt 3D/panel chập tối (IAB nền dừng rAF): GĐ177–194 đã QA @5173 lúc làm; đối chiếu lại thì xem archive.
- ✅ ĐÃ ĐÓNG (29/10) flake `weeklyGoalCap`: bot bày lại tầng kệ đầy → bỏ qua tầng đầy + timeout 1.8tr ms. Nếu cả bộ lại > ~10 phút: profile trước khi làm tiếp.
- ✅ ĐÃ ĐÓNG (GĐ287): Tối ưu regression suite toàn bộ — gom vòng sim lặp cấp 50 giữa `weeklyGoalCap` và `economySim`; thời gian chạy `weeklyGoalCap.test.ts` giảm từ 320s xuống ~53s. Tổng thời gian test giảm từ 11+ phút xuống ~6.6 phút an toàn trong giới hạn 10 phút.
- ✅ ĐÃ ĐÓNG (GĐ292): Khóa kiểm định scale mục tiêu vòng NG+ (GĐ171) — công thức runTargetScale (trần ×3) và runRewardScale (trần ×2.5) với targetCap đã khống chế chặt chẽ giới hạn cấp (MAX_LEVEL 100) và bậc mối (PARTNER_TIERS.length 5). Bộ 45 test prestige/ngGoalsRun/ngGoals bảo đảm độ khó vòng 2+ bền vững và không sinh lạm phát.
- Co-op (30/10, đã xử lý 3 điểm để ngỏ): (a) đi ngủ ở hẻm là **bỏ phiếu** — cả hẻm cùng nằm giường mới sang ngày, nằm chờ thì bấm [N] để dậy rút phiếu, người chưa ngủ rời hẻm thì tự sang ngày; (b) bảng tổng kết **không dừng giờ ở hẻm**, máy khách cũng tự mở bảng tổng kết (qua `lastSummary`); (c) "Về giá gợi ý"/"Chỉnh tất cả giá" dùng `setPrices`: món người khác vừa đổi giá thì giữ giá của họ. Đã QA 2 tab (`?dev=a`/`?dev=b`) cho (a)(b). GĐ286 đã đóng nốt 2 điểm ngỏ (hội thoại cốt truyện không dừng giờ hẻm; ngất khuya có người ngủ thì không phạt).

- 📦 (GĐ317) Bundle 618 KB vs mục tiêu 600: `world/farm.ts` (49KB raw ≈ 12KB gzip) chỉ gọi đồng bộ trong `createWorld` — lazy-load nó cũng chưa đủ 18KB và buộc đổi `createWorld` sang async (rủi ro 3D/co-op). Hoãn; muốn xuống 600 cần tách thêm cả `three` examples hoặc world con khác.
- 💰 Tỉ số thưởng/lãi bán 1,44 (cấp 5) / 1,17 (cấp 10) — phần lớn do ngày 1 không trần (luật người mới, cố ý). Muốn ≤1: tăng lãi gộp, đo trước/sau.

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
- GĐ316 — 🔕 Đo thông báo ngày 1 đúng người chơi (bỏ 📜/🎯): 11–14, trần 15
- GĐ312 — 💰 Hạ trần thưởng nhiệm vụ (sàn 110k, ×0,6); tỉ số 1,44/1,17/1,17
- GĐ311 — 💰 Đo tỉ số thưởng/lãi bán: 1,7–2,0 / 1,4–2,0 / 0,94–1,53; trần 3/2,5/1,8
