# Nắng Hẻm — kiểm tra giao diện

## §25.1 Technical Fit ≠ Usability Fit

**Quy tắc báo trạng thái mobile (chuẩn chủ dự án).** Một chức năng có thể đạt *Technical Fit* mà vẫn **chưa** đạt *Usability Fit*. Việc vượt qua:

- TypeScript;
- ESLint;
- CSS parsing;
- static overflow analysis;
- responsive rules;
- viewport constraints;

**không chứng minh mobile UX đúng.**

### Technical Fit
- Khớp viewport (không tràn ngang ngoài ý muốn);
- tôn trọng chiều cao khả dụng;
- dùng responsive sizing;
- tôn trọng `--touch`;
- tránh fixed dimension nguy hiểm;
- giữ kiến trúc responsive hiện có.

### Usability Fit
- Đọc được, dễ thao tác bằng chạm;
- giữ hệ thống phân cấp thông tin rõ ràng;
- thông tin P0 hiểu ngay được;
- action chính hiển nhiên;
- không làm nội dung quan trọng quá nhỏ;
- không thu nhỏ canvas/board/map dưới mức thao tác thực dụng;
- không cuộn quá nhiều;
- không đòi tap chính xác lên control bé;
- giữ được tầm nhìn gameplay;
- hiểu được mà không phụ thuộc giả định layout desktop.

**No overflow ≠ good mobile UX** và **Responsive CSS ≠ Mobile Ready**.

Một chức năng chỉ được coi **mobile-ready** khi **cả hai** `Technical Fit + Usability Fit` đều thoả. Nếu không thể render browser, **Usability Fit không thể được xác minh** nên trạng thái đúng là **`NOT TESTED`**, không phải `PASS` hay `Mobile Ready`.

> Áp dụng: mọi kết luận "đạt static / typecheck / eslint / postcss / không overflow / responsive" chỉ là điều kiện Technical Fit (nền tảng code). Khi môi trường không chạy được browser/nghiệm thu mắt, feature phải được báo **NOT TESTED** (không ghi PASS / Mobile Ready). Ghi rõ nguồn bằng chứng tĩnh và còn thiếu gì để đạt Usability Fit.

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
