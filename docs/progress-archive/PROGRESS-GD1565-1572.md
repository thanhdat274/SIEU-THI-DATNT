# PROGRESS lưu trữ GĐ1565–1572

- **GĐ1572** — Sổ đầu ngày: trời mưa/bão + có máy đánh giày (cấp 42) nhắc "thu ×1,5 hôm nay" (ctx tuỳ chọn `furniture`). Ghi chú: longSessionLeak thỉnh thoảng trượt khi chạy full suite, chạy riêng qua.
- **GĐ1571** — Máy đánh giày (cấp 42) ×1,5 phí khi trời mưa/bão (`machineFeeAt` thêm tham số weather; popup "trời mưa ×1,5").
- **GĐ1570** — Rà soát + QA save mới: bán đầu tiên ~41s. Máy thu phí GĐ1564–1568 gom trong `data/machines.ts` (dòng ngày, tổng ngày, máy rảnh, gắp trúng, ảnh ngày lễ); tặng quà khách quen trong `regularGift.ts`. Trình duyệt: tab Dịch vụ hiện "🎰 Máy thu phí hôm nay: 6.000đ (🧸 3.600đ · 🥤 2.400đ)". Lưu ý QA: tiêm đồ giả thiếu `tiers` làm vỡ UI — dùng đồ thật. Save QA đã xoá.
- **GĐ1569** — Thêm 3 mẹo: máy chưa ai chơi (25), gắp trúng (44), máy chụp ảnh ngày lễ (50).
- **GĐ1568** — Máy chụp ảnh (cấp 50) ×1,5 phí vào ngày lễ hội (`festivalOn`); popup xây ghi "ngày lễ ×1,5". Cấp 50 > golden.
- **GĐ1567** — Tab Dịch vụ: từ 14h nêu máy thu phí chưa ai chơi hôm nay, gợi ý dời gần cửa (`idleMachineHint`). Thuần UI.
- **GĐ1566** — Máy gắp thú (cấp 44) ~1/20 lượt khách "🧸 Gắp trúng!" — chỉ bong bóng, không tiền; băm máy/ngày/phút, không rút RNG nên golden/sim không đổi (`clawWin`).
- **GĐ1565** — Tổng kết ngày thêm dòng "trong đó 🎰 máy thu phí" dưới Doanh thu (`machineDayTotal`). Thuần UI.
