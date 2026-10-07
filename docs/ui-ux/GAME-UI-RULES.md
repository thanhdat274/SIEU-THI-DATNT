# GAME-UI-RULES — Tiệm Tạp Hóa Đầu Hẻm

> Người duy trì: **UI/UX Lead**. Tài liệu này **KHÔNG tạo hệ thống mới**; nó mã hoá và tham chiếu hệ thống hiện có
> (`PIXEL_UI.md`, `index.css`, components) để ngăn các agent phá vỡ quy chuẩn. Mọi thay đổi quan trọng phải qua review Lead.

## 1. Nguồn quy chuẩn hiện có (đọc trước, dùng lại, mở rộng — không song song)

| Nguồn | Vai trò |
|---|---|
| `docs/ui/PIXEL_UI.md` | Token màu/font, component, state/input, layout, feedback, renderer — **là tiêu chuẩn gốc** |
| `apps/web/src/index.css` | Token CSS thực tế: ink, wood-dark, wood, wood-light, paper, paper-shade, teal, teal-dark, brick, sun, muted; body ≥14px; title 18–20px; `--touch: 44px`; `.pixel-button` min-height/min-width 44px; `.quantity-stepper input height:44px` |
| `apps/web/src/responsive.ts` | Nguồn density/responsive: `data-density=compact|normal|comfortable`, `data-size`, `data-orient`, `data-short` |
| `apps/web/src/responsive.css` | Toàn bộ rule compact/touch/responsive — **là nơi DUY NHẤT thêm CSS responsive** |
| `docs/ui/QA.md` | Chuẩn báo trạng thái: Technical Fit ≠ Usability Fit; RAM NOT TESTED khi không có browser |

## 2. Nguyên tắc thay đổi

- **Preserve existing functionality.** Sửa tối thiểu.
- **Không rewrite** hệ thống đang chạy nếu không có lý do thuyết phục.
- **Không tạo framework/breakpoint/token/component thứ hai.**
- **Không đổi gameplay/business logic/state/save/API** cho task UI-only.
- **Không hard-code thiết bị** (iPhone 15…) — dùng `data-density` + `--touch` + `--safe-*` + container query.
- Mọi thay đổi là **presentation/CSS/markup-only**, trừ khi chủ dự án duyệt riêng.

## 3. Visual language (pixel art, cozy nostalgia)

- Phong cách: 2D Pixel Art 2.5D top-down, lưới 32×32, Nearest-Neighbor, palette ấm (nâu gỗ, vàng ấm, xanh ngọc, đỏ gạch).
- UI phải **đúng tinh thần game mô phỏng cửa hàng thế giới mở** — không giống website.
- Bảng màu chỉ dùng token `index.css`. Dùng màu **đúng ngữ cảnh trạng thái** (warning/error/success) — không gây hiểu nhầm.

## 4. UI/UX ưu tiên Gameplay

Khi có conflict, thứ tự quyết định:

```
Gameplay > Player visibility > Interaction clarity > Game UX > Responsive layout > Visual decoration
```

UI **không được** che player / NPC / object tương tác / gameplay; không tạo quá nhiều overlay; không làm khó điều khiển.

## 5. Hierarchy

- Người chơi phải biết **đâu là thông tin quan trọng nhất** và **action chính là gì**.
- Primary action nổi bật; secondary ít nổi bật hơn; không nhiều thành phần cùng tranh chú ý.
- HUD hierarchy rõ ràng; action chính dễ thấy / sticky footer khi cần (Pattern C: Cashier/Inventory/Warehouse).

## 6. Component grammar (bắt buộc tái sử dụng)

- `PixelPanel`, `PixelButton` (variant paper|teal|brick|wood; hit ≥44px; aria-label cho icon-only), `PixelIcon`,
  `ProductIcon`/`ProductSlot` (dùng chung `productPixels` game-data + renderer), `PixelStat`, `PixelProgress`,
  `QuantityStepper` (clamp int, min/max disabled), `PixelDialog` (header/footer cố định, content cuộn, focus trap/Escape/restore).
- Component cùng loại phải cùng behavior + visual language nhất quán.
- Modal: một modal mở luôn đóng modal khác (Zustand coordinator).

## 7. Action chính

- Action chính của feature **không chôn trong nội dung** cuộn nếu cần chạm thường xuyên → dùng sticky footer (`dialog.footer`).
- Nút phải **rõ nghĩa** (không mơ hồ); nhãn dùng ngôn ngữ người chơi Việt, không dùng thuật ngữ kỹ thuật (IndexedDB/Dexie...).

## 8. Không chấp thuận

- Ngôn ngữ mơ hồ trong review ("cái nút kia", "làm đẹp hơn"). Mọi issue có ID + severity + recommendation + acceptance criteria.
- Sửa UI làm phá logic hiện có.
