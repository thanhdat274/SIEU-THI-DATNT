# Nắng Hẻm — kiểm tra giao diện

## Baseline 30/09/2026

Typecheck, 10 nhóm kiểm thử core + registry thuế, server/web production build đều pass. Cảnh báo có trước: chunk JS 629.23 kB vượt 500 kB. Ảnh baseline HUD/kho và đại lý desktop/mobile ở `qa/baseline-*.png`.

Phạm vi: UI React, pixel assets và Pixi renderer/camera; giữ sửa đổi có trước ở game-core, tax, docs, package manager. XP là giá trị trong cấp, ngưỡng tăng ×1.5; customer là một state machine tự checkout. Save schema 2 giữ nguyên. Baseline chỉ đọc và test trong browser context riêng, không sử dụng tiến trình người dùng.

## Inventory QA

| Nhóm | Thao tác/check | Bằng chứng |
| --- | --- | --- |
| HUD | Giờ, money/XP thật; mở cửa, tốc độ, zoom, kho, túi, đại lý, lưu | Desktop/mobile screenshots + state sau sale |
| Product/panel | Dấu Việt, tiền lớn, fallback, focus/disabled, stepper min/max | Trang dev art và modal |
| Kho/đại lý | Trống, châm không phù hợp, mua/giao ngày sau, thiếu tiền, khóa cấp, kho mát đầy | Smoke transaction + ảnh |
| Modal | Một modal, Tab/Shift+Tab, Esc/restore focus; WASD/Space không điều khiển world | UI keyboard + InputManager test |
| Kệ/thu ngân | Bày/cất số lượng thật, giá/capacity, tiệm đóng/kệ hết, qua ngày | UI smoke + core tests |
| Persistence | Lưu, reload đúng state, reset cancel, save error không báo thành công | Context thử riêng + lỗi có chủ đích |
| Layout | 1920×1080,1366×768,1024×768,844×390,667×375; bounds, safe-area, nút ≥44px | Screenshot matrix + DOM metrics |
| Renderer | Stock hình ảnh thật, animation hướng/idle, camera DPR1/2, tối đọc được, reduced motion | World screenshots + quan sát chuyển động |
| Hiệu năng | Warmup 30s, p95 frame time; thiết bị thật vs viewport mô phỏng | Ghi máy/giới hạn trong verification |

Exploratory: giữ phím di chuyển rồi mở modal/resize kho; nhập số lượng rỗng/âm/99 khi thiếu vốn. Visual QA tách khỏi functional QA; numeric bounds không thay thế screenshot.

Kết quả thực thi và các trường hợp thiếu bằng chứng: xem VERIFICATION.md. Ảnh trước/sau và scripts tái hiện nằm trong qa/.
