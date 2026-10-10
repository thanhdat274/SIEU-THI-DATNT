# UI-REGRESSION-RULES — Tiệm Tạp Hóa Đầu Hẻm

> Người duy trì: **UI/UX Lead**. Bảo vệ tính năng/UI đã hoạt động; mọi thay đổi UI phải kiểm tra lại regression.

## 1. Nguyên tắc

- **Không giả định bug cũ đã fix** — kiểm tra lại khi có thay đổi liên quan.
- **Không phá chức năng cũ**; Tester/QA luôn có Layer Regression.
- Dependency-aware: sửa component dùng chung (Button/Modal/Panel/HUD/Typography/responsive container/Global CSS) → **FULL UI REGRESSION** tất cả nơi dùng.

## 2. Lịch sử bug / regression cần theo dõi

| ID | Mô tả | Trạng thái theo dõi |
|---|---|---|
| BUG-001 | Mobile notification (toast) quá lớn | Đã nén (round 31/32) — vẫn cần QA mắt |
| BUG-002 | Shelf layer che player | Theo dõi z-index/layering |
| BUG-003 | Darkness overlay (night) che warehouse | Theo dõi day/night overlay |
| BUG-004 | Suggestion quantity vượt supplier stock | Theo dõi clamp |
| BUG-005 | NPC cầm umbrella khi weather FX off | Theo dõi weather |
| REG-14F | Inline padding/style đè rule compact (bê desktop xuống mobile) | Đã xử lý; phòng tái phạm |

## 3. Loại thay đổi cần FULL regression

- Global HUD, Design Tokens, responsive system, shared Button/Modal/Panel, Global CSS (`index.css`/`responsive.css`), input/state wiring.

## 4. Cấm

- Sửa UI trong lúc claim "PASS" mà chưa kiểm tra nơi dùng chung.
- Bỏ qua regression đã ghi nhận.
- Gộp thay đổi UI vào gameplay logic thay đổi.
