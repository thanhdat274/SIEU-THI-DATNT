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

## Trạng thái hiện tại (02/11/2026)
- **GĐ790–799** (kiểm kê 790; ngất 791–792; đòi khách quen bị rival kéo 793 + cảnh báo ⚠️ 794; timeout test co-op 795; đo CPU render gfx=low cấp 18/24/34 796–798 — ghi nhận 4× vẫn ≪ 33 ms; QA co-op hai tab bị chặn bởi server không chạy 799): docs/progress-archive/PROGRESS-GD790-799.md
- **GĐ801–809:** QA save trắng: đơn đầu 209 s → 184 s sau GĐ806 (trần khoảng chờ khách đầu ngày ≤ 20 phút game, test firstGapCap); rút thông báo GĐ803–804 là SAI (đếm byte) — đã hoàn lại GĐ808. Chi tiết: `docs/progress-archive/PROGRESS-GD715-788-summaries.md`.
- **GĐ820 (rà 811–820):** bundle 533/597 KB, chunk 253/255, 2942 test xanh, QA save trắng: khách đầu ~86 s, đơn đầu 184 s (≤5 phút). Chi tiết: docs/progress-archive/PROGRESS-GD840-854.md.
- **GĐ830 (rà 10 GĐ 821–830, Leader + Designer):** bundle 533/597 KB, chunk 253/255, tsc sạch, 2943 test xanh ở lần chạy lại (1 lần đầu có 4 test đỏ, không tái hiện qua 4 lần chạy sau; GĐ831). Không đổi hành vi game; thêm test NFC thông báo, script `audit-notify.mjs`; độ dài thông báo thật lúc chạy ≤ 82. Không tính năng mới, không cần gộp/bỏ. Nợ mở: duyệt câu chữ (`docs/notify-audit.md`), FPS thật, QA co-op hai tab.
- **GĐ800 (rà 10 GĐ):** HUD ≤ 20 nút, bundle 533/597 KB, chunk 253/255, 2940 test xanh — không tính năng nào cần gộp/bỏ (GĐ793–794 chỉ thêm vào panel có sẵn, không nút/thông báo mới); không hạ trần được thêm. Nợ mở: FPS thật máy yếu, đo cấp ≥40, QA co-op hai tab (cần `npm run server`).
- **GĐ715–788** (tóm tắt từng khối: docs/progress-archive/PROGRESS-GD715-788-summaries.md): bán online, đường đời nhân viên, trả góp/sổ nợ, sinh nhật khách quen, audit GĐ720/730/740 đều ĐẠT (bundle ≤ 597 KB, chunk ≤ 255 KB).

- **GĐ892 (điều tra, không đổi code):** pane đếm 1.597 mesh hiện; 5 nhóm lớn nhất 154–489 mesh (tại (60,-64), (24,-70), (7,-8), (4,-2), (-12,-4)) đều có số geometry = số mesh và hầu hết vật liệu riêng (vd 489 mesh/489 geo/411 mat) ⇒ KHÔNG instancing được, muốn giảm phải gộp geometry theo vật liệu (bake tĩnh) — việc lớn, rủi ro với cửa/quạt/đèn, và đổi luồng Math.random của sim. Quyết định: chỉ làm khi có số FPS thật báo khựng; hiện giữ nguyên. FPS 4× throttle vẫn cần cửa sổ hiện.
- **GĐ914 (rà ngân sách)** check:bundle sau các GĐ906–913: tải đầu 533 KB gzip / ngân sách 597 (≤600), chunk lớn nhất 253/255 KB (vendor-three, sát trần — không thêm thư viện vào chunk này). FPS ×4 đã đo GĐ912; sim kinh tế GĐ913; còn lại không có mục vượt ngân sách.
- **GĐ913 (kinh tế: tỉ số thu nhập)** Log sim ghi nhầm lãi vận hành (đã trừ tiền bot đầu tư) nên hiện "N/A (lãi ≤ 0)"; sửa simEconomy dùng lãi bán hàng thật. Đo tất định: (nhiệm vụ+kèo)/lãi bán = cấp 5 0,77 · cấp 10 0,89 · cấp 20 0,65 (đều ≤ 1: bán hàng là nguồn thu chính). Hạ trần cấp 5 từ 1,0 xuống 0,85. 2956/2956 xanh.
- **GĐ912 (FPS thật ×4)** Chrome headless=new + CDP (Emulation.setCPUThrottlingRate), tab visible, ?gfx=low, trong tiệm: rAF 144 FPS ở ×1 và 144 FPS ở ×4 (khoảng cách khung trung vị 7 ms, p90 8,4 ms) — đạt ≥30 FPS có dư; npm test 2956/2956 xanh. Script đo dùng WebSocket CDP thuần, không cần thêm gói.
- **GĐ911 (tòa nhà tiệm)** Nhóm 374 mesh trong tòa nhà (7,-8.2) là nội thất, đã visible=false khi người chơi ở xa (GĐ888) nên ~55 mesh thật sự vẽ; không gộp thêm. Kho (-12,-2) 70 mesh, cùng cơ chế ẩn. Mục giảm mesh coi như xong; việc mở còn lại: FPS rAF thật cần cửa sổ Chrome không bị che.
- **GĐ910 (đo trên Chrome thật)** Tab Chrome thật ?gfx=low: 118 draw call, render CPU trung vị 2,4 ms / p90 4 ms (×4 throttle ≈ 10/16 ms, còn dưới 33 ms của 30 FPS), game.perf().fps=42. rAF bị Chrome ghim 1 Hz vì cửa sổ automation bị che nên không đo được FPS rAF thật; số 42 là của bộ đo trong game.
- **GĐ909 (soi mắt + nhóm (4,-1))** Ban đêm 19:00 nhìn đường: đèn InstancedMesh có quầng sáng + vệt sáng trên mặt đường, cửa sổ khung gộp bình thường. Nhóm 196 mesh ở (4,-1.5) có 2 nhóm con 67 và 76 mesh đã visible=false (nội thất ẩn khi xa, GĐ888) nên chỉ ~53 mesh thật sự vẽ — không cần gộp thêm; hết mục tiêu giảm mesh đáng giá, còn lại là FPS thật cần cửa sổ hiển thị thật.
- **GĐ908 (kiểm đêm)** Chạy ?gfx=low, đặt 19:00: đèn đường InstancedMesh phát sáng (emissive 2.5), không lỗi console; chưa soi cột đèn bằng mắt vì hộp thoại che khung cảnh.
- **GĐ907 (gộp mesh thật #2: đèn đường):** `StreetLamps` 24 cột × 5 mesh (đế/cột/que/chao/bóng) → 2 `InstancedMesh` (thân kim loại gộp 1 hình + bóng phát sáng, dùng chung `headMat` nên `emissiveIntensity` ban đêm vẫn chạy); mỗi cột chỉ còn nhóm quầng sáng + PointLight (quỹ ánh sáng giữ nguyên). Chỉ dùng ở `world.ts` nên sim headless không ảnh hưởng. Đo pane: draw call 362→329, CPU render trung vị 5,5→3,7 ms (cộng dồn từ GĐ906: 552→329, 6,8→3,7). npm test xanh. Chưa nhìn đèn sáng ban đêm bằng mắt (chỉ kiểm cấu trúc) — nên liếc lúc 18:00+.
- **GĐ906 (gộp mesh THẬT: khung cửa sổ, đòn bẩy của GĐ897):** mỗi cửa sổ `Building` từng 8 mesh (kính + 6 thanh khung + bệ, cùng 1 vật liệu khung); nay thanh khung + bệ gộp 1 mesh (8→2), GIỮ NGUYÊN vật liệu nên `setOpacity` mờ theo tường vẫn đúng (đo: opacity kính 0,8 / khung 1). Bật qua `setMergeWindowFrames(true)` ở `createWorld` (lần đầu bật cho mọi đường thì 2 sim economySim L5/L10L20 vỡ vì UUID/Math.random — cùng bài học `sharedGoods`; sim headless không gọi createWorld). Đo pane `?gfx=low` cấp 2: nhà hàng xóm 65→35 mesh, draw call ~552→362, CPU render trung vị 6,8→5,5 ms. tsc sạch, npm test 2.956 xanh. Chưa nhìn bằng mắt cửa sổ trông giống cũ (khung gộp cùng toạ độ nên không đổi hình theo thiết kế) — nên liếc khi vào tiệm.
- **GĐ905 (hết đòn bẩy ẩn theo khoảng cách):** sau GĐ888/904 các nhóm mesh còn hiện đều nằm trong ~45 m quanh tiệm (kho (-12,-4), nhà hàng xóm x∈[-35,34] z≈-2, trục hẻm) nên ẩn theo khoảng cách không còn lợi. Đòn bẩy kế duy nhất là gộp tĩnh vỏ nhà/kho (cần giữ hiệu ứng mờ, GĐ897) — chỉ làm khi có FPS thật từ máy người chơi. Không đổi code.
- **GĐ904 (ẩn trang trại khi ở xa):** `main.tsx` đặt `world.farm.group.visible = người chơi cách farmSpot < 60 m` (cùng ngưỡng `farm.update`; chỉ ẩn cảnh, logic không đổi). Đo pane: ở tiệm (67 m) farm ẩn, draw call 535; đứng cạnh farm hiện lại, 497 (số draw call chênh nhỏ vì frustum culling đã loại phần lớn; lợi chính là bớt ~195 mesh duyệt/cull mỗi khung và đỡ vẽ khi camera lia xa). Kiểm tra: tsc sạch, npm test 2.956 xanh. Biên kiểm bằng số: 59 m hiện, 61 m ẩn. Chưa kiểm bằng mắt farm có 'bật/tắt' lộ liễu ở rìa tầm nhìn (pane đang ở màn lobby) — nếu có thì nâng ngưỡng.
- **GĐ903 (đo lại mesh hiện sau GĐ888, kiểm hiệu quả ẩn nội thất):** tiện lợi (60,-64): `interior` 289 mesh đã ẩn ở khoảng cách 81 m (khớp GĐ888); số liệu "474 mesh" của GĐ892 đếm cả nội thất nên đã cũ. Còn hiện: tổng 1.589 mesh (draw call 552 nhờ frustum culling), nhóm lớn: tiệm chính (7,-8) 248, (24,-70) 195, kho (-12,-4) 182, (0,0)/(4,-1) 120 + 120, 5 nhà hàng xóm ~65. Tiệm chính phải hiện (người chơi ở đó); ứng viên kế: (24,-70) 195 mesh (ngõ 2/nông trại?) ẩn theo khoảng cách như GĐ888 — cần xác định chủ nhóm trước. Không đổi code.
- **GĐ902 (đo đại diện: 23 kệ đầy hàng, thay GĐ901):** tạm `setState` thêm 21 kệ × 12 tầng × 12 món (đã trả furniture về 2 sau đo), `?gfx=low`: CPU render trung vị 7,6 ms, p90 10,5 ms, 780 draw call, hàng hóa 15 InstancedMesh. ×4 throttle ≈ 30 ms (trung vị) / 42 ms (p90) ⇒ khoảng 24–33 FPS: SÁT/DƯỚI ngưỡng 30 FPS ở tầng yếu nhất. So 15 ms GĐ885 (trước gộp kệ, cấp 44): đã tốt hơn nhưng còn dư địa. Chi phí còn lại chủ yếu cảnh ngoài kệ (~550 draw call nền) ⇒ gộp mesh tĩnh nhà/hẻm là đòn bẩy kế (GĐ897). Vẫn là CPU-time pane, không phải FPS thật.
- **GĐ901 (thử đo cấp cao, KHÔNG đại diện):** `setState({level:44})` trong pane (đã trả về 2 sau đo) chỉ mở thêm cảnh (2.888 mesh, 508 draw call, 4,1 ms trung vị) nhưng tiệm vẫn 2 nội thất, không giống save cuối game của GĐ885 (21 kệ) ⇒ số này không so được với 15 ms. Muốn đo đúng phải dựng save đầy kệ (simEconomy `seed level` + dựng 3D từ store) — việc tiếp, cần nối store thật vào world 3D, chưa có sẵn trong pane.
- **GĐ900 (ước FPS 4× bằng thời gian CPU render, thay cho rAF vô dụng của pane):** cấp 2, ngày 2, `?gfx=low`, 60 lần `render` liên tiếp: trung vị 6,8 ms, p90 7,9 ms, drawCalls 552 (sau GĐ886–889). ×4 throttle ≈ 27–32 ms < 33 ms ⇒ sát ngưỡng 30 FPS ngay cả đầu game; cuối game (cấp 44) GĐ885 đo 15 ms/frame trước shared-shelf nên vẫn rủi ro. Đây là CPU-time trên pane, không phải FPS thật (GPU không đo). Việc tiếp: đo lại ở save cấp cao (autoplay) để so với 15 ms của GĐ885.
- **GĐ899 (đọc MorningPanel 846 dòng để cân nhắc tách):** một component `MorningPanel()` dài ~770 dòng, ~60 giá trị dẫn xuất (combo hôm qua, quán nước, lễ, hợp đồng, khách quen…) dùng chéo nhau trong JSX; tách an toàn cần gom thành hook/selector theo khối trước, có ảnh chụp đối chiếu. Quyết định: KHÔNG tách lúc này (Luật "chỉ tách khi đụng panel"). Không đổi code.
- **GĐ898 (rà nợ refactor UI):** đo lại `src/ui/panels/ReportPanels.tsx` = 550 dòng, chỉ còn `SummaryPanel` + `EMPTY_DAY_STATS`; nợ "1.632 dòng" trong backlog là số cũ, đã sửa dòng backlog. Không đổi code. Panel lớn nhất còn lại xem `wc -l src/ui/panels/*.tsx` khi cần tách.
- **GĐ897 (thử gộp nhà hàng xóm → dừng có lý do, không đổi code):** đo nhà hàng xóm: `interior` rỗng, 65 mesh đều là vỏ nhà: 5 cụm tường × 9 mesh (tường + 8 chi tiết), nhóm 10 + 4 + 4 mesh (cửa/mái/đèn), 29 vật liệu. Tường/mái được `setOpacity` làm mờ khi người vào (xuyên thấu) nên vật liệu phải đổi theo khung ⇒ gộp theo vật liệu sẽ phá hiệu ứng mờ mái/tường; muốn gộp phải tách riêng phần không mờ (chi tiết viền) — lợi tối đa ~40 mesh/nhà × 5 = 200 (~12%), cần ảnh chụp đối chiếu. Hoãn tới khi có FPS máy thật.
- **GĐ896 (kiểm sức khỏe sau GĐ886–895):** `npm test` 320 file / 2.956 test xanh, 126 s (< 5 phút); `tsc --noEmit` sạch. Không đổi code. Hướng tiếp (không cần FPS máy thật): gộp tĩnh nhà hàng xóm (5×65 mesh) theo vật liệu — chỉ làm cùng test chụp ảnh/đếm mesh để không vỡ cửa/đèn.
- **GĐ895 (thử đo FPS khi tab được đưa lên trước):** `visibilityState=visible` nhưng rAF chỉ ~3,7/giây (pane vẫn bị hãm, gfx=low, có thể render phần mềm) còn `game.perf().fps`≈20 ⇒ hai số lệch, không dùng được làm FPS máy thật. Kết luận: pane này không đo được FPS tin cậy; cần máy/cửa sổ người dùng (nút `?perf` hoặc DevTools) — giữ nguyên nợ, không đổi code.
- **GĐ894 (đóng nợ GĐ893):** đọc `Hud.tsx`: nút Kho đã có huy hiệu `emptySlots` (ô kệ chưa gán/hết hàng) nên người chơi được nhắc kệ trống; không thêm gợi ý mới, không đổi code. Nợ còn lại: FPS 4× throttle cần cửa sổ hiện; gộp mesh tĩnh chờ số đo thật.
- **GĐ893 (QA ngày 2 co-op, tab A):** sau khi sang ngày 2, tiệm tự mở 08:00 nhưng 107 phút game không có đơn: khách ở trạng thái `walkBy` (không vào), kệ trống do chưa nhập hàng sau ngày 1 ⇒ hành vi đúng thiết kế (không hàng thì khách đi ngang), tiền giữ 676.040đ. Chưa kiểm cảnh báo "kệ trống" có đủ nổi bật với người chơi mới hay không — việc sau: đọc `customers.ts` quanh walkBy + thêm gợi ý nếu thiếu.
- **GĐ891 (QA co-op hai tab THẬT, server :3002 do người dùng bật, `?dev=a` / `?dev=b`, DEV_AUTH_BYPASS):** A tạo hẻm, B gia nhập bằng mã (👥 2); tua 8× tới 18:00 (~5 phút thật dù pane ẩn: vòng lặp vẫn chạy chậm, WS không bị ngắt); A ngủ → "Đã lên giường (1/2) — chờ Thử B"; B về nhà + ngủ → cả hai tab sang ngày 2 cùng lúc 06:03/06:11, 676.040đ khớp nhau, tổng kết ngày 1 hiện ở cả hai, không reload. Đạt. Lưu ý UX nhỏ: nút "Đi ngủ" chỉ có ở nhà; ở tiệm phải "Về nhà" trước (đã là thiết kế chơi đơn). Nợ "co-op hai tab cần server" ĐÓNG. Còn nợ: FPS thật trên cửa sổ hiện + throttle 4×.
- **GĐ890 (kiểm GĐ888–889 trong pane):** camera ở (60,30,60) thì cả 9 nhà ẩn `interior`; góc mặc định ~454 draw call. Số far=4 vô nghĩa (camera nhìn ra ngoài cảnh) nên KHÔNG dùng làm bằng chứng giảm call.
- **GĐ889:** kệ + hàng hóa của tiệm (`furnitureGroup`, nằm ngoài `interior`) giờ ẩn theo `interior.visible` qua `GroceryShop.syncFurnitureVisible()` gọi mỗi khung sau `updateView`: tiệm ở xa không vẽ kệ. Không đổi logic/ lưu trữ. npm test mã 0.
- **GĐ888:** `Building.updateView` ẩn `interior` khi camera ở xa (> ~25 m, mái + tường đặc kín, không ở trong nhà): không vẽ nội thất nhà khuất. Đo (pane): 3/9 nhà ẩn từ vị trí camera mặc định, drawCalls 585 → 577 — lợi nhỏ ở góc nhìn này, lớn hơn khi camera xa/lia ngoài hẻm. Bật lại ngay khi lại gần (`inside > 0`). npm test mã 0. Còn nợ: hố ~1.280 mesh cảnh ngoài kệ (GĐ887) chỉ giảm một phần.
- **GĐ887 (điều tra hố render còn lại, không đổi code):** ~1.280 mesh nhìn thấy nằm NGOÀI kệ: 5 nhà hàng xóm × 65 mesh, nhà/kho/hẻm 105–363 mesh/nhóm; `Building.interior` không bao giờ ẩn dù ở xa. Gộp tĩnh kiểu `bakeTemplate` rủi ro cao vì `Building` có cửa xoay, quạt, đèn, mái ẩn/hiện. Hướng làm sau (khi có máy thật báo khựng): (1) ẩn `interior`/trang trí nhà hàng xóm khi camera xa > ~30 m (cần kiểm cửa sổ nhìn xuyên), (2) gộp riêng phần tĩnh thuần (tường, sàn, hàng rào) theo vật liệu. Chưa làm vì chưa có số đo FPS thật trên cửa sổ hiện + throttle.
- **GĐ886 (Backlog #1 của GĐ885, Dev):** gộp hàng hóa MỌI kệ theo món vào `ShelfInstancer` (`src/shop/shelfInstancer.ts`): 1 InstancedMesh/phần-vật-liệu/món cho cả tiệm thay vì mỗi kệ một bộ; kệ gửi ma trận (toạ độ cha) qua `FurnitureView.renderShared`, `flush()` cuối `GroceryShop.sync()`. Đo trong pane (gfx thấp, 21 kệ × 3 món dựng tay): hàng hóa còn 15 InstancedMesh cho 2.520 hộp (trước: mỗi kệ một bộ, hàng trăm); render ~6,7 ms. SỬA: lần đầu tôi ghi "62 draw call" do đọc nhầm counter — `info.reset()` rồi render 1 lần cho drawCalls ≈ 991, trong đó ~1.280 mesh nhìn thấy là CẢNH NGOÀI kệ (thành phố/NPC; kệ chỉ 231 mesh): hố tiếp theo là gộp tĩnh cảnh ngoài kệ (backlog #1 mới). Chỉ bật ở `world.ts` (tham số `sharedGoods`): sim kinh tế headless seed `Math.random` mà three sinh UUID bằng `Math.random` nên đổi số mesh làm lệch dòng ngẫu nhiên và vỡ trần thưởng 3 test economySim (đã xảy ra khi thử) — nên sim giữ đường cũ. Test mới `shelfInstancer.test.ts`; npm test 320/320 mã 0, bundle 533/597. Còn nợ: giảm cạnh xi-lanh ở gfx thấp (chỉ giảm tam giác, không giảm call).
- **GĐ885 (đo CPU render, cấp 44 ngày 105, `?gfx=low`, pane ẩn nên chỉ đo thời gian gọi render):** trung vị 15 ms/frame (p90 19 ms) — CAO HƠN nhiều so với 2,1 ms ở cấp 34 (GĐ798); ×4 throttle sẽ vượt 33 ms. Nguyên nhân: ~812 draw call, 1.117 `InstancedMesh` (mỗi món hàng trên mỗi kệ một bộ, ~800 tam giác/hộp vì xi-lanh 16 cạnh) trong `furnitureView.ts renderInstanced`; trạng thái do autoplay dựng nhiều kệ. Backlog #1 (Luật 8): gộp instancing xuyên kệ theo món (một InstancedMesh/món cho cả cảnh) và giảm số cạnh xi-lanh ở gfx thấp; đo lại bằng cùng cách.
- **GĐ884 (rà 10 GĐ 875–884, Leader + Designer):** HUD ≤ 20 nút, thông báo ≤ 90 ký tự, bundle 533/597 KB, chunk 253/255, 2954 test xanh, `npm test` thoát mã 0 (~2 phút). Hai refactor panel (GĐ876–877) không đổi hành vi; không tính năng mới nên không có gì cần gộp/bỏ, không hạ được trần thêm. Nợ mở: FPS thật cửa sổ hiển thị + throttle 4×, QA co-op hai tab (cần server), save người thật.
- **GĐ883:** SỬA nợ "Timeout calling onTaskUpdate": đó KHÔNG phải nhiễu — `npm test` thoát mã 1 ở 3/3 lần dù 2954 test xanh (pool `forks` mặc định + mô phỏng dài). Đặt `pool: 'threads'` trong vitest.config.ts: 3/3 lần thoát mã 0, ~103–130 s (≤ 5 phút). Đính chính GĐ882: lỗi này sửa được từ cấu hình.
- **GĐ882 (Leader + Designer đánh giá lại, backlog trống):** mọi trục lớn đã đủ sâu (audit GĐ740), ý tưởng (a)(b) đã xong, nợ refactor UI hết. Việc còn lại cần điều kiện ngoài phiên này: (1) FPS thật cửa sổ hiển thị + throttle 4×; (2) QA co-op hai tab cần `npm run server`; (3) save người thật. Lỗi "Timeout calling onTaskUpdate" khi chạy test là nhiễu tải máy (autoplay async đã nhả main thread mỗi 40 tick), không sửa được từ code. Không mở rộng khi chưa có tín hiệu từ người chơi thật.
- **GĐ878–881 (SỬA GĐ881):** các số FPS "60/50" ghi ở GĐ878–880 KHÔNG đáng tin: pane trình duyệt của app bị ẩn nên rAF dừng và `game.perf().fps` đứng yên (50,345 lặp nguyên). Autoplay vẫn chạy tới ngày 105 cấp ~45, tsc/không lỗi console. FPS thật máy yếu vẫn là nợ mở — cần cửa sổ hiển thị thật + throttle 4×.
- **GĐ877:** tách `MorningPanel` (846 dòng) khỏi `ReportPanels.tsx` (1.327 → 550); 3 test đọc nguồn đổi đường dẫn; 2954 test xanh, bundle không đổi. Nợ refactor UI ĐÃ HẾT. QA trình duyệt: Sổ đầu ngày + Tổng kết mở được, console 0 lỗi.
- **GĐ876:** tách `BusinessPanel.tsx` 1.206 → 573 dòng (MarketTab, PeriodTabs, businessStyles); không đổi hành vi. tsc sạch, 2954 test xanh, bundle 533/597 KB, chunk 253/255. Nợ refactor UI còn `ReportPanels.tsx`.

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
- ⏱️ GĐ675: render CPU đo ở cấp 10/18/24/34/41 đều đạt biên 4× throttle (cấp 41: 5,1 ms trung vị ⇒ ~20–31 ms < 33 ms). Còn thiếu FPS thật máy yếu. Chi tiết: archive `PROGRESS-GD715-788-summaries.md`.
- 🕳️ GĐ665/668: QA co-op vòng ngày (ngủ cả hẻm → tổng kết 2 tab) cần tab trình duyệt THẬT — tab IAB về nền bị đóng băng timer → server ngắt WS → game tự reload (`coop.ts:339`, thiết kế). Cơ chế đã chốt GĐ668; checkpoint round-trip đã khoá bằng test. Làm trong đợt QA toàn diện GĐ670; trước đó ghi "chưa chạy được vì môi trường", không tính là lỗi game.
- 📦 GĐ515 (cập nhật GĐ709): GĐ704 tách vỏ boot → tải ban đầu 529,4/597 KB, dư địa ~68 KB; khi gần chạm trần lại thì code mới vào main/index phải tìm chỗ tách chunk lười trước.
- GĐ330: QA lưu máy khách (127.0.0.1:5173) — tải lại trang vẫn hiện "Chơi tiếp trong máy (ngày 1)" và vào lại đúng ván; lần "mất ván" trước là bấm nhầm nút ván mới, KHÔNG phải lỗi lưu.

- ⏱️ (GĐ296–298) npm run test nhạy tải máy: 1 test đỏ lẻ không liên quan thay đổi vừa làm → chạy lại đúng file trước khi kết luận; máy rảnh mà vẫn >10 phút thì đo file chậm nhất rồi tối ưu.


## Backlog tiếp theo
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
  - Quán nước: MỎNG — chỉ 2 nút (số nhân viên, 3 mức giá), thực đơn tự lấy mọi đồ uống, thời tiết không ảnh hưởng, không sự kiện; panel 230 dòng phần lớn là bảng phân tích quanh 2 nút. 3D dựng hộp thủ tục, chưa dùng kit Blender (bang_ghe, chau_cay có sẵn).
  - Thứ tự sửa: ~~(1) thời tiết~~ xong GĐ414, ~~(2) chọn món~~ thành thực đơn pha chế GĐ415, ~~(3) 3D quán dùng kit~~ (đã có setQuanDecor: chậu cây + băng ghế), ~~(4) gọn BranchPanel~~ xong GĐ417, ~~(5) QA 3D~~ GĐ419 +GĐ420 đủ cả ba. Tiệm xôi phần còn lại để sau.
  - QA 3D cần save thử riêng: không có chế độ sandbox, không được sửa save thật của người dùng.

1. 🧹 **Nợ refactor UI (đo GĐ685, làm khi đụng panel đó hoặc hết việc chơi sâu):** `ReportPanels.tsx` (nay còn 550 dòng ở `src/ui/panels/`, GĐ898 đo lại — nợ ĐÃ HẾT; từng là 1.632 dòng chứa 6 panel (history/records/analytics/dossier/roadmap/discovery) → tách theo file; `BusinessPanel.tsx` (ĐÃ tách GĐ876 → 573 dòng). BranchPanel 297 dòng — nợ cũ GĐ417 ĐÃ ỔN, gỡ khỏi backlog. Chỉ tách khi có lý do chơi (sửa tính năng trong panel đó), không refactor thuần (Luật 1).
2. **Trục đã cạn:** 3D trang trí (chỉ làm 3D mới khi đi kèm gameplay — GĐ172–198) · multi-shop supply chain (GĐ199–209, khép mạch) · bộ soi tiền/vốn (GĐ210–251) · UI nợ (GĐ183/258) · chợ phiên (GĐ182).
2. **Khoá chờ save người thật:** NG+ vòng (GĐ171) · nhiệm vụ ngày 1–5 (GĐ254 đã giảm lặp). (GĐ110/117 ĐÃ ĐÓNG GĐ280 bằng số liệu; Arc E "Hàng xóm khai trương" ĐÃ HOÀN THÀNH GĐ283, 27 test cấu trúc xanh).
3. **Ý tưởng chờ Leader duyệt (chiều sâu, chưa làm):** (a) nhịp cuối tuần đậm hơn — **ĐÃ HOÀN THÀNH GĐ291** (lô chợ phiên đầu tháng nhận biết món ăn vặt cuối tuần + gợi ý trữ hàng đặc biệt); (b) nhiệm vụ tuần/tháng biết đến thứ/ngày trong kỳ — **ĐÃ HOÀN THÀNH GĐ289** (nhịp tháng monthPace hiển thị ngày còn lại tới hết tháng + dự báo kịp/hụt và bảo vệ chuỗi tháng).
4. 👥 **Đủ 2 chế độ (ĐÃ CHỐT GĐ288):** khoá chính sách parity chơi đơn/hẻm online: Sân chơi chung tiến độ; Tái sinh NG+ chỉ chơi đơn; Chào mừng quay lại chạy cục bộ. Test: coopClient.test.ts. Chi tiết: docs/progress-archive/BACKLOG-parity-GD288.md.

## Mục lục giai đoạn đã xong (chi tiết trong archive)
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

- GĐ640 (rà ngân sách + QA người mới): bundle 596,8/597, chunk 253/255, cả bộ 2709/2710 → sửa 🙏 lịch fontSize 8 (vi phạm ≥11, GĐ639) → xanh; FPS gfx=low ~72. Save sandbox mới: 3 thoại → Mở cửa 14s; khách xếp quầy khi chủ còn ở nhà, Ra tiệm → bán đầu ~35s. ≤5 phút. Lưu trữ GĐ620–636.
- GĐ641: test đếm ngược qua năm mới (Tết dương lịch + mùng 1 năm sau cùng còn 3 ngày) — nextEventLine đúng khi vắt năm.
- GĐ650 (rà ngân sách + QA người mới): bundle 596,8/597, chunk 253/255, cả bộ 2715/2715 xanh, PROGRESS 27KB, FPS gfx=low ~67. Save sandbox mới đúng thứ tự (3 thoại → Ra tiệm → Mở cửa 8,5s) → bán đầu ~55s. ≤5 phút.
- GĐ637–659: lịch/đếm ngược sự kiện, gợi ý nhập đồ lễ & đồ cúng, HUD gọn (chi tiết: docs/progress-archive/INDEX-GD637-659.md).
- GĐ660: rà ngân sách — tải đầu 596.7/597 KB, chunk 253/255 KB; lưu trữ GĐ637–659; PROGRESS gọn 25.6 KB; ván mới vào được ngày 1, FPS ~46.
- GĐ661: QA ván mới bổ sung cho GĐ660 — Tiếp/Xong → Ra tiệm → Mở cửa, bán được 9 món (nước, bánh, mì) trong ~65 s thật (≤5 phút ✅).
- GĐ662: QA toàn diện giao diện — khung modal cố định, hết nhảy khung khi chuyển tab (chi tiết: mục Trạng thái hiện tại; test `panelFrame.test.ts`). FPS gfx=low đo lại 70–74 có khách → mức ~46 GĐ660 là nhiễu tải máy.
- GĐ663: QA co-op luồng ngắn khung panel GĐ662 — máy khách cùng khung 760×688 như chơi đơn, clipped 0. Không đổi mã.
- GĐ664: QA danh sách dài/số tiền lớn (cấp 45 + 30 ngày dữ liệu) — quét lại sạch; kết luận bundle: hết thắng rẻ, code mới nằm chunk lười.
- GĐ665: co-op 2 tab qua IAB bị chặn môi trường (tab nền mất WS hẻm); khoá checkpoint round-trip bằng test mới — không phải bug join. Vòng ngày hẻm thật dời GĐ670.
- GĐ666: coverage sweep — vá timeout phoneReasons, test mới đường nối chốt ngày (trại/nợ/đơn mang đi); tool xếp hạng dev/covrank.cjs + dev/covlines.cjs.
- GĐ667: dọn PROGRESS 31,6 → 24,3 KB — ghi chú GĐ329–342 dồn archive, không đổi mã.
- GĐ668: chốt nguyên nhân reset co-op IAB — tab nền đóng băng timer → server ngắt WS → tự reload (thiết kế coop.ts:339). Không phải bug.
- GĐ669: tách economySimL5.test.ts — test 300 → 243 s, hết sát trần 5 phút. Cập nhật bảng ngân sách theo số đo mới.
- GĐ670: audit 10-GĐ ĐẠT (bundle/test/HUD/thông báo/tỉ số/FPS/save trắng/16 panel); prune: không bỏ gì, nợ BranchPanel ghi lại.
- GĐ671: luồng cố định trọn vẹn trên HEAD (ngủ → tổng kết 3 tab) — sạch, 0 lỗi console.
- GĐ672: dồn chi tiết GĐ662–665 sang docs/progress-archive/PROGRESS-GD662-665.md; PROGRESS về 27,4 KB.
- GĐ673: khung panel trên tablet dọc + điện thoại ngang (nhánh mobile thật) — đạt, không đổi mã.
- GĐ674: 320px nhánh mobile thật — 8 panel dày clipped 0; lớp lỗi GĐ297 vẫn được chặn.
- GĐ675: đo CPU render gfx=low 5,7 ms/khung → 4× throttle ~28–33 FPS đạt; đo lại trên save cuối-game khi đụng render.
- GĐ676: dồn chi tiết GĐ666–671 sang docs/progress-archive/PROGRESS-GD666-671.md.
- GĐ677: dọn import chết economySim.test.ts sau GĐ669 — tsc + test xanh.
- GĐ678: sửa SW stale assets (glb cache-first → network-first) — tài sản 3D mới tới tay người chơi cũ; test swStrategy.test.ts.
- GĐ679: hồi quy cả bộ 2735 xanh / 225 s.
- GĐ680: audit 10-GĐ ĐẠT; điểm nhấn chu kỳ = sửa SW stale assets (GĐ678); prune không bỏ gì.
- GĐ681: dồn chi tiết GĐ672–680 sang docs/progress-archive/PROGRESS-GD672-680.md; PROGRESS về ~20 KB.
- GĐ682: test hành vi SW (swFetch.test, mutation-checked); SW v2 áp dụng khi deploy PROD kế.
- GĐ683: hồi quy cả bộ 2740 xanh / 241 s.
- GĐ688: QA co-op bán hàng — đồng bộ tuyệt đối 2 máy, hand-off đổi vai hoạt động thật, sàn bẩn kìm khách đúng thiết kế.
- GĐ684: QA live chợ phiên — preview = thật (±0đ), chống bán 2 lần/ngày đạt. Không đổi mã.
- GĐ685: đo nợ refactor UI bằng số — ReportPanels 1.632 dòng (6 panel) & BusinessPanel 1.206 dòng là nợ thật; BranchPanel 297 dòng ổn, gỡ khỏi backlog.
- GĐ689: dồn chi tiết GĐ681–688 sang docs/progress-archive/PROGRESS-GD681-688.md.
- GĐ690: audit 10-GĐ ĐẠT — điểm nhấn chu kỳ = fix heartbeat + co-op trọn vẹn lần đầu; prune không bỏ gì.
- GĐ686: 🐛 fix heartbeat server (pong ghi sai object → hẻm chết ~60 s) + heartbeatStep + wsHeartbeat.test. Server dev cần khởi động lại để có hiệu lực — sau đó QA co-op vòng ngày (GĐ690) khả thi.
- GĐ748: Sổ nợ xếp món gần mất lên trước (debtRowsByUrgency, test debtSoon).
- GĐ749: nợ quá hạn chưa nhắc lên Sổ đầu ngày (debtUnremindedAction).
- GĐ750: audit 10-GĐ (741–750) — số đo suite/bundle đạt; coverage/FPS/QA trình duyệt chưa đo (không có server).
- GĐ751: soát co-op chuỗi Sổ đầu ngày (741/747/749) — đạt, không đổi mã.
- GĐ752: coverage 58,27/90,16 (bù audit 750).
- GĐ753: khép chuỗi đưa việc lên Sổ đầu ngày; việc tiếp theo cần dev server.
- GĐ754: QA trình duyệt dòng Sổ 747/749 đạt (cloud, ngoại lệ Luật 11 được duyệt); FPS thật vẫn chờ.
- GĐ755: sửa dính chữ câu mở Sổ đầu ngày.
- GĐ756: QA co-op 2 tab bị chặn (thiếu credential Firebase cho server hẻm trong cloud).
- GĐ757: QA save trắng chơi đơn — món đầu bán ~20 s thật (8×), 0 lỗi; ghi nhận rủi ro người mới bỏ qua 'Đứng quầy'.
- GĐ758: đóng rủi ro 'bỏ qua Đứng quầy' — đã có nút Ra tiệm nhấp nháy.
- GĐ759: sinh nhật khách quen (ghé chắc + 3 thân thiết, nhắc trên Sổ đầu ngày).
- GĐ760: lời báo sinh nhật khi thanh toán (thay câu thường).
- GĐ761: QA trình duyệt luồng sinh nhật — ghé đúng ngày, thanh toán +3, 0 lỗi.
- GĐ762: thẻ khách quen hiện ngày sinh nhật (sau khi đã gặp).
- GĐ834–839: duyệt+áp dụng viết lại 4 thông báo (docs/notify-audit.md); FPS mobile late save ~28–30, CPU render ~1 ms (chưa kết luận, đo rAF cần pane hiện); chip kế hoạch mobile 36 px; hud-alerts mobile max-height 32vh; tsc/build ok, chunk lớn nhất 252 KB.
- GĐ840–854: audit GĐ840 xanh (2943 test, thông báo ≤90, HUD ≤20 nút); thêm hudMobileCss.test.ts (chip ≥36px, dải cảnh báo có trần vh); sửa bế tắc quỹ âm: bot autoplay/playtest vay gấp, cấp <5 được vay thêm tới trần 3 gói (loanWhenBroke.test.ts); nâng timeout coop. Còn mở: FPS ≥30 gfx Low cần máy thật. Chi tiết: docs/progress-archive/PROGRESS-GD840-854.md.
- GĐ855–859: nâng timeout coop 60 s; kiểm tsc/build/gzip bầu đầu ≈538 KB/bộ test 110 s/remote đồng bộ. Chi tiết trong docs/progress-archive/PROGRESS-GD840-854.md.

- GĐ860 (rà Leader+Designer): 2949 test xanh 110 s, tsc sạch, 358 thông báo, 0 vượt 90, bundle đầu ≈538/600 KB. Không thêm tính năng: các trục đã đủ sâu; việc mở duy nhất là FPS ≥30 gfx Low (cần máy thật, cửa sổ tiền cảnh) và QA co-op 2 tab (cần server, bị cấm). Kế: rà GĐ870.
- GĐ861–865: rà độ dài thông báo kỹ hơn — rút 4 thông báo (lương khi nhập hàng, mua/xuất chuồng giữa kỳ, thu hoạch bù nhìn); audit-notify.mjs và featureBudget.test.ts tính nhánh điều kiện dài nhất (cả template lồng nhau) → 0 thông báo >90. Chi tiết: docs/progress-archive/PROGRESS-GD840-854.md.
- GĐ866–869: gọn PROGRESS.md; cả bộ xanh 107 s; thêm notifyRuntimeLen.test.ts (bot chơi 6 ngày ở cấp 3/8/15, gom toast thật, 0 vượt 90). Chi tiết trong archive.

- GĐ870 (rà Leader+Designer): 2952 test xanh 99 s, tsc sạch, 358 thông báo tĩnh + toast thật đều ≤90, bundle đầu ≈538/600 KB (đo GĐ857). Không thêm tính năng: trục đã đủ sâu. Mở: FPS ≥30 gfx Low (máy thật), QA co-op 2 tab (cần server, cấm). Kế: rà GĐ880.
- GĐ871: thử đo 'toast ngày 1' bằng bot (16 toast) → KHÔNG dùng: bot lên 4 cấp và nhận hết nhiệm vụ trong 1 ngày nên không đại diện người chơi thật; giữ ngân sách ngày 1 ở dạng tĩnh (featureBudget). Không đổi code.
- GĐ872: notifyRuntimeLen mở rộng cấp 3/8/15/30/50: 139–353 toast khác nhau mỗi cấp, dài nhất 90, 0 vượt.
- GĐ873: thêm npm run audit:notify; check:bundle chính thức: tải đầu 533/597 KB gzip, chunk lớn nhất 253/255 (số GĐ857 ≈538 là ước tay, dùng số này).
- GĐ874: xem dòng 'Bản sao Draco thừa' của check:bundle — chỉ để biết: game tải decoder từ /decoders/draco/, bản trong assets/ không tới người chơi (không phải lỗi, không cần xử lý).
- GĐ875: xem lại dư địa chunk (253/255): vendor-three là lõi three, loader GLTF/Draco đã nạp lười, vendor-react/data/firebase đã tách riêng → không còn chỗ cắt rẻ; thêm tính năng phải vào chunk store/lazy, không đụng vendor-three.
