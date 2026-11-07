# Backlog đã xong / đã chốt — dời khỏi PROGRESS ở GĐ1510 (07/11/2026)

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
