# Playtest persona đợt 3 — 07/11/2026 (GĐ1628)

**Giới hạn:** chơi thật trên trình duyệt (khung 440 px giả điện thoại, origin 127.0.0.1 — không đụng save thật) kết hợp autoplay 5 ngày. Là quan sát định tính, không phải số liệu playtest người thật. Không tự ghi vào backlog.

## Persona & kịch bản
- **P1 "Mới chơi ngày 1" (điện thoại):** mở ván mới, đọc HUD.
- **P2 "Cày 5 ngày đầu" (autoplay 5 ngày, cấp 1→10):** xem nhịp lãi/khách.
- **P3 "Kẹt cốt truyện" (QA GĐ1618–1628, cấp 3/7/10/30):** đọc nhiệm vụ khi hệ chưa mở.

## Quan sát thật
1. Ngày 1: HUD có danh sách 5 bước "🧭 Ngày đầu mở tiệm", chip "Khai trương 0/10", mẹo "kệ đầy hàng…" — rõ ràng, không kẹt.
2. Autoplay 5 ngày: ~47 khách/ngày, mỗi ngày 18–34 khách bỏ về vì **hết hàng**. Tổng kết ngày (ReportPanels) đã hiện "N hết hàng" → người chơi có dữ liệu phản hồi; con số cao là do bot nhập hàng kém, không phải lỗi game.
3. Trước GĐ1618–1628, nhiều việc/cốt truyện **không làm được mà không nói lý do** (kho cấp 8 khi mới cấp 3, bậc kho/mặt bằng 7 không tồn tại, đơn app khi chưa mở gian hàng, MXH dưới 20 người theo dõi…). Đã sửa hết; chip HUD nay hiện "🔒 cấp N".

## Đề xuất
| Đề xuất | Luật cứng | Kết luận |
|---|---|---|
| Giữ nguyên onboarding ngày 1 | L9 (không thêm thông báo) | Không đổi |
| Bot autoplay nhập hàng thông minh hơn | Không giúp người chơi thật (L1) | Không nên |
| Rà tiếp các bảng hệ phụ (quán nước, tiệm xôi) xem có nút bấm bị chặn mà không nói lý do | L1, L6 | Nên (P1) — làm trong vòng lặp |

## Cách tái chạy
Mở http://127.0.0.1:5173 → "Chơi không cần đăng nhập" → `await game.autoplay(5)` → đọc `game.useGame.getState().history`. Xoá save từ trang không chạy game (/src/data/critic.ts).
