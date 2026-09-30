# Premium Vietnamese pixel UI — nghiệm thu 30/09/2026

## Bổ sung nhà kho đã triển khai

Phòng 6×5 tile liền phía trên, cửa hậu giữa tiệm 2 tile, giá khô/góc lạnh/bàn nhận và WarehouseModal đã có trong game. Kho dùng inventory hiện hữu, không có ledger thứ hai. Save schema 2; fixture kho được hydrate idempotent; không thay tọa độ gian bán cũ. Chi tiết và nguồn asset: WAREHOUSE.md.

Tests nhà kho pass: cửa/giá collision, A*, di chuyển vào/ra, pending reload và delivery đúng một lần, bảo toàn reserve stock, fallback vị trí, NPC không vào kho. Browser pass: locate không teleport, E/joystick mở panel, focus/input, châm kệ, chuyển supplier một dialog, đặt/giao +3/save reload. Năm viewport không overflow và dialog nằm trong viewport; DPR2, giờ 20 từ save thử và reduced-motion được kiểm tra. Metrics `qa/warehouse-metrics.json`, `qa/warehouse-controls.json`; ảnh `qa/warehouse-*.png`.

Các kết quả thiếu bằng chứng của phiên trước bên dưới là lịch sử. Night và reduced-motion đã có bằng chứng bổ sung cho kho; nghiệm thu hiệu năng toàn game/điện thoại thật vẫn chưa hoàn tất.

Bổ sung cache/occlusion: `verify-warehouse-art.cjs`, ảnh trước/sau giá và zoom ở DPR1/2; 49 canvas được tạo khi warm-up, số canvas không tăng trong cảnh ổn định. Flow warehouse cuối bổ sung cất 1/bày lại 1 rồi bán +4.500₫/+5 XP trước save/reload. Typecheck/test/build pass, main chunk ~638 kB vẫn có cảnh báo trên 500 kB. Headless sau warm-up30s/180 mẫu rAF: p95 66.7ms; chỉ ghi số đo, chưa đạt tiêu chí hiệu năng và không suy ra cải thiện từ hai lần chạy khác tải hệ thống.

## Kết quả đã xác minh

- TypeScript, 10 nhóm kiểm thử gameplay, input regression, registry thuế và production build pass. Save schema vẫn là 2. Cảnh báo chunk chính ~629 kB có từ baseline, chưa xử lý trong change này.
- Context Playwright riêng: đóng tiệm → đặt 3 mì (−9.000₫) → ngày 2 nhận +3 → châm kệ 24, kho còn 5, tổng 29 → bán 1 (+4.500₫, +5 XP, −1 stock) → lưu → reload khôi phục đúng money, XP, tồn kệ và kho. Test core xác minh pending orders được khôi phục.
- Reset confirmation hủy không đổi tiến trình. Cố ý nâng revision trong IndexedDB của context thử: lưu báo “Chưa lưu được”, không đổi thời gian lưu thành công. Script tái hiện: `qa/verify-browser.cjs`; ảnh `qa/save-success.png`, `qa/save-failure.png`.
- Đại lý: khóa cấp hiện rõ; nhập 99 mì khóa vì thiếu tiền; 41 trứng giải thích kho mát không đủ; số âm clamp về 1. Khi focus input, W không di chuyển nhân vật. Escape trả focus về Đại lý. Tab/Shift+Tab chứa trong dialog tại DPR 1/2. Input test xác minh held controls/queued interaction được xóa khi khóa.
- Ma trận idle và supplier dài: 1920×1080,1366×768,1024×768,844×390,667×375. Không tràn ngang. Canvas mobile 266/390 (68.2%) và 251/375 (66.9%). Resize liên tục không lỗi lifecycle. Ảnh `qa/final-*.png`, `qa/supplier-final-*.png`, số đo `qa/layout-metrics.json`.
- Art lab: palette, dấu Việt, icon, disabled/focus/pressed/hover; ảnh `qa/art-*.png`. Contrast ink/paper 13.30:1, muted/paper 5.79:1, chữ CTA 7.32:1, warning 7.08:1. Body 14px, CTA ít nhất 44px. DPR2 và tiền 999.999.999₫ có ảnh `qa/large-money-modal-dpr*.png`. Fallback hàng dùng cùng hàm procedural cho DOM và renderer.
- Kệ: đi W rồi E mở ShelfModal, bày 1/cất 1 trả về đúng stock kho/kệ ban đầu. Chuyển từ kệ sang đại lý chỉ còn một dialog. Ảnh `qa/shelf-final.png`, script `qa/verify-shelf.cjs`.
- Renderer: cache texture theo key, frame được tạo một lần; badge Graphics chỉ đổi khi stock state đổi. World integer zoom/camera offsets, DPR cap 2, nearest sampling. Fixture id, map collision và shopping logic giữ nguyên. Nguồn/anchor/frame nằm trong assets/README.md.

## Chưa đủ bằng chứng nghiệm thu

| Requirement/scenario | Trạng thái |
| --- | --- |
| HUD dữ liệu thật, sale, đóng cửa, count không capacity giả | PASS |
| Purchase/delivery/restock/save/reload, save failure | PASS |
| Pixel identity, chữ Việt/contrast, fallback | PASS art lab + source + ảnh shelf/inventory/supplier/cashier |
| Single modal, focus trap/restore, input isolation | PASS đại lý/save và chuyển shelf sang supplier |
| Layout mục tiêu, supplier dài, reset cancel/locked/money/cold | PASS; chưa chạy mọi tổ hợp tiền lớn/lỗi trên từng viewport |
| Camera DPR1/2 | PASS ảnh tĩnh; chưa đủ chuyển động bốn hướng/occlusion |
| Reduced motion và night | Code có gate/overlay; chỉ xác minh media query được nhận. Ảnh `night-money` chỉ kiểm tra tiền lớn: giờ store bị simulation ghi đè, không dùng làm bằng chứng night |
| Startup error + retry | Có implementation; chưa gây lỗi khởi tạo có kiểm soát |
| Hiệu năng | Chromium headless trên Windows, 1366×768 DPR1, warm-up 30s, 180 rAF; p95 83.4ms, sau cache badge 83.3ms. Vượt mục tiêu desktop 20ms. Không phải số đo điện thoại thật; chưa chứng minh do renderer hay môi trường headless. Chưa đạt nghiệm thu hiệu năng |

Không archive change khi còn checkbox chưa hoàn tất. Chưa thể tuyên bố 33/33 hoặc đáp ứng FPS trên thiết bị thật. Mẫu chạy localhost:5173; trang art nội bộ `/?art-lab` chỉ ở DEV.
