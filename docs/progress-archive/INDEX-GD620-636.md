# GĐ620–636 (lưu trữ)

- GĐ620 (rà ngân sách + QA người mới): bundle 597/597, chunk 253/255, PROGRESS 29,4KB (sát trần — lần sau lưu trữ GĐ600–619), 2703/2703 xanh (GĐ619). Save sandbox mới: Chơi không đăng nhập → Ra tiệm → 3 thoại Bà Năm → Mở cửa → bán món đầu ~62s (mục tiêu ≤5 phút).
- GĐ621: lưu trữ GĐ600–619 → docs/progress-archive/INDEX-GD600-619.md.
- GĐ622: ngày có trận (lịch quán nước, không mưa/bão) lô sạp nước mía thu ×1,15 (SAP_MATCH_MUL); bản đồ khu ghi ' ⚽' sau lô. Theo số ngày → parity; bán thật, không phải thưởng. sapRong 22/22, golden + economySim 9/9 xanh, bundle 597/597.
- GĐ623: gọn test GĐ622 (so với cùng công thức không trận). QA sandbox ngày 17 nắng: 'Lô 1: 🧺 🥤 Nước mía · hôm nay 517.500đ ⚽' (300k×1,5×1,15), lô bánh mì không đổi. Lưu ý QA: biz.zones là mảng id, đặt object làm vỡ UI.
- GĐ624: gợi ý sạp ngày mai ghi lý do '(có trận)' khi món gợi ý là nước mía vào ngày trận. QA sandbox ngày 16, mai nắng: 'Mai nắng đẹp: nên bán 🥤 Nước mía (có trận)'. sapRong 23/23.
- GĐ625: Sổ đầu ngày ngày trận nhắc '⚽ Hôm nay có trận — đổi một lô sạp sang nước mía (×1,15)' khi có sạp mà chưa lô nào bán nước mía (mở panel quán nước/bản đồ). QA sandbox ngày 17: lô bánh mì+xôi → hiện; có lô nước mía → ẩn. sapRong 24/24.
- GĐ626: cả bộ sau GĐ622–625: 2706/2706 xanh (248s).
- GĐ627: tin cuối ngày sạp hàng rong gắn ' · ⚽' vào ngày trận khi có lô nước mía (giải thích thu tăng), như ' · 🙏' của lô xôi ngày cúng. sapRong 25/25, tsc sạch.
- GĐ628: QA tin sạp ngày trận (sandbox, ngày 17 nắng, lô nước mía + bánh mì, ngủ 20h): '🥤🥖 sạp hàng rong Ngõ 2 · +877.500đ · ⚽' (517,5k + 360k). Đúng.
- GĐ629: QA máy yếu ?gfx=low (sandbox ngày 18, cấp 50, có sạp Ngõ 2, tab hiện): ~75 FPS đo rAF 5s (mục tiêu ≥30).
- GĐ630 (rà ngân sách + QA người mới): bundle 597/597, chunk 253/255, PROGRESS 26,5KB, economySim (thông báo ngày 1/2) + golden 9/9 xanh, cả bộ 2706 xanh (GĐ626); FPS gfx=low ~75 (GĐ629). Save sandbox mới: bán món đầu ~136s từ lúc xoá save (trong đó ~80s do script QA kẹt ở thoại 3/3 'Xong'); từ Mở cửa tới bán đầu ~40s. Vẫn ≤5 phút.
- GĐ631: Sổ đầu ngày ngày cúng nhắc '🙏 Hôm nay ngày cúng — đổi một lô sạp sang xôi (×1,3)' khi có sạp mà chưa lô nào bán xôi (bỏ qua mưa/bão). QA sandbox ngày 15 nắng: bánh mì+nước mía → hiện; có lô xôi → ẩn. sapRong 26/26.
- GĐ632: tách 2 việc nhắc đổi lô sạp (ngày cúng→xôi, ngày trận→nước mía) khỏi ReportPanels thành hàm thuần sapEventActions (data/sapRong.ts); test hành vi thật thay test đọc nguồn (6 trường hợp). QA sandbox ngày 15: vẫn hiện. sapRong 25/25, bundle 597/597.
- GĐ633: tách nhắc đồ cúng thiếu hàng (GĐ612/613) khỏi ReportPanels thành hàm thuần cungGoodsAction (data/tiemXoi.ts); test hành vi 6 trường hợp thay test đọc nguồn. QA sandbox ngày 14/15: 2 câu hiện đúng. tiemXoiCungDay 10/10.
- GĐ634 (hoàn tác): tách tiemXoiCungAction làm tải ban đầu 597→598 KB (vượt trần, phát hiện SAU khi đã push) → revert d01c30f, về 597. Bài học: đọc kết quả check:bundle trước khi commit, đừng nối && sau grep.
- GĐ635: làm lại GĐ634 đúng cách: 3 hàm việc Sổ đầu ngày theo dịp (cungGoodsAction, tiemXoiCungAction, sapEventActions) chuyển sang data/dayEventActions.ts chỉ panel Sổ đầu ngày (nạp lười) dùng → tải ban đầu 597,1 KB (trần 597, so theo số làm tròn). check-bundle in thêm 1 chữ số thập phân để thấy còn bao nhiêu chỗ. QA sandbox ngày 15: 3 việc 🙏 hiện đúng. 34 test sạp+ngày cúng xanh.
- GĐ635b: SỬA — 597,1 KB vẫn đỏ (check so số thực, không làm tròn; GĐ635 đã push khi đỏ). Bảng phím tắt menu Thêm (CONTROLS) tách sang ui/HudKeys.tsx nạp lười → 597,0, check xanh (EXIT 0). QA: Thêm → Phím hiện đủ. Còn ~0 KB chỗ trống: GĐ sau phải bù trước khi thêm code vào gói đầu.
- GĐ636: cả bộ 2706/2706 xanh (237s) sau GĐ635. Tạo chỗ trống gói đầu: CounterAskAlert chuyển từ Hud sang HudAlerts (nạp lười) → 596,8/597 KB. QA sandbox: giả câu hỏi quầy → khung 'Cô Ba muốn ghi sổ nợ… còn ~45s' + 2 nút hiện đúng.
