# ACCESSIBILITY-RULES — Tiệm Tạp Hóa Đầu Hẻm

> Người duy trì: **UI/UX Lead**. Mức accessibility hợp lý cho **game web**, không biến game thành enterprise app.

## 1. Phạm vi (game web reasonable)

- **Text readability**: body ≥14px; đủ contrast; không chỉ dựa vào màu sắc cho thông tin trạng thái (kèm icon/label).
- **Touch target**: control ≥ `--touch` (44px) trên `data-input=touch`; không đòi tap chính xác.
- **Keyboard**: Tab/Shift+Tab trong modal, Esc đóng, restore focus (PixelDialog đã có focus trap/Escape/restore). WASD/Space không điều khiển world khi modal mở.
- **Focus state**: rõ ràng cho điều khiển tương tác.
- **Labels**: aria-label cho icon-only control; input có label đọc được; `aria-hidden` cho icon trang trí.
- **Contrast**: CTA dùng teal-dark/paper đạt contrast; teal sáng chỉ cho progress/decor.
- **Reduced motion**: `prefers-reduced-motion` tắt idle/walk/decor chuyển động phụ + bubble bounce, giữ thông báo chữ (đã triển khai trong renderer/UI).

## 2. Không chấp thuận

- Chỉ dùng màu để báo trạng thái.
- Control icon-only thiếu aria-label.
- Nút nhỏ hơn `--touch` trên thiết bị cảm ứng.
- Chữ quá nhỏ / contrast kém trên nền paper/wood.
