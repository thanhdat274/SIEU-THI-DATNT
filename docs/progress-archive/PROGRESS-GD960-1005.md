# PROGRESS-GD960-1005 — tách file thuần + QA (03/11/2026)

Thời kỳ chủ yếu tách code thuần (không đổi luật chơi) + QA trình duyệt save trắng GĐ960–1005.

- GĐ1005–1041 (phủ test + tách file, chi tiết): `docs/progress-archive/PROGRESS-GD1005-1041.md`
- GĐ996: tách render/productShapes (luật chọn kiểu dáng món theo tên, 98 dòng) khỏi render/productModels (598→500) + test; tsc 0.
- GĐ997: tách world/farmSign (texture biển cổng trại, 23 dòng) khỏi world/farm (714→692) + test; tsc 0.
- GĐ998: tách ui/orderPanelParts (nhãn mua-khi-rẻ, ASSESS_STYLE, Meter) khỏi ui/OrderPanel (604→~565) + test; tsc 0; full 383 file/3109 qua (đo trước GĐ998).
- GĐ999: tách render/characterProps (kiểu tóc, đạo cụ cầm tay, 125 dòng) khỏi render/characterModel (636→516) + test; tsc 0; full sau GĐ998: 384 file/3110, build + bundle 533/253 KB đạt.
- GĐ1000 (rà 991–999): chỉ tách file thuần, full 386 file/3112 test, tsc 0, build ok, bundle 533/253 KB (trần 597/255), thông báo ≤90. Tách net/coopGuard (bảng khoá thao tác GUARDED, 42 dòng) khỏi net/coop (671→632) + test; coop re-export. tsc 0.
- GĐ1001 (QA save trắng bằng mắt, panel trình duyệt): xoá storage → "Chơi không cần đăng nhập" → ngày 1 06:00, 280.000đ, HUD + "5 việc" hiện đủ; 30 tick đẩy tới 07:00 không lỗi, console sạch, FPS 48–54 (mức Vừa, cửa sổ nhỏ, không phải máy yếu). Chưa bán món đầu, chưa đo ?gfx=low + throttle 4×.
- GĐ1002 (đo bán món đầu, panel trình duyệt): save trắng đã có sẵn kệ (mì/nước/bánh), nhập thử `placeOrder("daily")` ok (280.000→255.200đ); mở tiệm + 300 tick vẫn 0 khách vì khách sinh trong vòng render (tab pane không tự chạy đồng hồ, xem mẹo GĐ719) — CHƯA đo được thời gian bán món đầu, cần cửa sổ có mắt chơi thật.
- GĐ1003: tách shop/pointerTap (chạm/bấm trên canvas: huỷ đặt đồ, chạm đi tới) khỏi main.tsx (971→950) + test; tsc 0; tải lại trang không lỗi console.
- GĐ1004: tách world/farmSync (đồng bộ dựng trang trại theo store) khỏi main.tsx (950→914) + test; full 388 file/3114, tsc 0, build ok, bundle 533/253 KB; vào game lại: console sạch, FPS 55.
- GĐ1005: tách world/quanNuocSync (đồng bộ lô đất/quầy/nhà quán nước theo store) khỏi main.tsx (914→870) + test; full 389 file/3115, tsc 0; vào game, ép cấp 29: console sạch, FPS 57.
- **GĐ971 (QA save trắng bằng mắt)** Xoá localStorage/IndexedDB → màn đăng nhập → "Chơi không cần đăng nhập" → vào ngày 1 (6:00, Tết dương lịch, hướng dẫn 5 bước, hội thoại Bà Năm chương 1, HUD 12 nút, dock có "Thêm"). Không có lỗi mới sau khi vào game; các lỗi `REGULAR_NAMES`/`main.tsx` trong console là dấu vết HMR cũ của GĐ962 (máy chủ nay trả 200, export có đủ).
- **GĐ970 (rà 961–969)** Chỉ tách code thuần (main.tsx 1012→971 dòng: stocktakeMessage, effectiveSpeed, lampLevel, interactHints, tutorialMarker); sửa 1 lỗi tsc sót ở GĐ965 (từ nay đọc exit code tsc riêng). Bundle không đổi: đầu 533/597 KB gzip, chunk lớn nhất 253/255. Full test 361 file/3075. GĐ950–959 chuyển sang `docs/progress-archive/PROGRESS-GD950-959.md`. Chưa soi bằng mắt trong game.
- **GĐ961 (QA save trắng bằng mắt, panel trình duyệt)** Vào chơi khách từ màn đầu: không lỗi console, ngày 1 06:00 280.000đ, hướng dẫn 5 bước hiện, HUD 12 nút (≤20), chương 1 bà Năm mở đầu. Chưa đi hết một ngày (không kiểm FPS/bán hàng). Chưa soi nút Nhập hàng trong game.
- **GĐ960 (rà 951–959 + dọn PROGRESS)** Chỉ tách UI/data thuần (Hud, BusinessPanel, ReportPanels, StaffPanel, OrderPanel, ArrangePanel, data/rivals), không đổi luật chơi; full 355 file/3053 test, tsc sạch. Bundle tải đầu 533/597 KB, chunk lớn nhất 253/255 KB (không đổi); thông báo ≤90. PROGRESS 38.9→33KB (GĐ930–949 sang archive). Còn nợ ngoài tầm: FPS thật trên cửa sổ có mắt, save thật, tín hiệu người chơi thật. Chưa soi bằng mắt trong game.
- **GĐ715–788** (tóm tắt từng khối: docs/progress-archive/PROGRESS-GD715-788-summaries.md): bán online, đường đời nhân viên, trả góp/sổ nợ, sinh nhật khách quen, audit GĐ720/730/740 đều ĐẠT (bundle ≤ 597 KB, chunk ≤ 255 KB).

- Các mục GĐ930–949 (nhập gấp, tách MorningPanel #11–22, tách OrderPanel #1–4, rà 931–939) đã chuyển sang `docs/progress-archive/PROGRESS-GD930-949.md`
- Các mục GĐ950–959 (tách Hud #1–3, BusinessPanel, SummaryCards, StaffLines, OrderBanners, arrangeGeometry, rivals) đã chuyển sang `docs/progress-archive/PROGRESS-GD950-959.md`.

