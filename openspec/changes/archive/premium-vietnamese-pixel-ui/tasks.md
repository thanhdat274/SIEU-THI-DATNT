# Tasks

Kế hoạch triển khai theo thứ tự phụ thuộc. Checkbox dưới đây dành cho code/kiểm thử sắp làm; nghiên cứu và bộ tài liệu kế hoạch đã hoàn thành, chưa tính là giao diện được triển khai.

## 1. Baseline và bản mẫu art

- [x] 1.1 Đọc GAME_DESIGN, ARCHITECTURE, ROADMAP, TASKS và diff hiện tại; xác minh bằng ghi chú phạm vi, luồng khách/XP và các thay đổi có trước trong research.md.
- [x] 1.2 Chạy `yarn typecheck`, `yarn test`, `yarn build` và chụp HUD/kho/modal baseline tại 1366×768 và 667×375; ghi kết quả thật và lỗi có trước.
- [x] 1.3 Tạo trang mẫu nội bộ cho palette, panel, nút, icon sản phẩm và chữ Việt theo design.md; xác minh contrast, dấu và các state normal/hover/pressed/focus/disabled ở screenshot desktop/mobile.
- [x] 1.4 Chốt inventory asset theo productId/fixtureId và source/license; xác minh mỗi asset mới có provenance ở assets/README.md và có fallback được mô tả.

## 2. Hệ component pixel

- [x] 2.1 Thêm token CSS, PixelPanel và PixelButton theo palette; xác minh không blur/bo tròn tùy tiện, body ≥14px và CTA ≥44px trên trang mẫu.
- [x] 2.2 Vẽ PixelIcon cho ngày/giờ/tiền/kho/túi/đại lý/lưu/zoom/đóng cùng grid; xác minh icon chính không dùng emoji và có aria-label khi không có chữ.
- [x] 2.3 Thêm ProductSlot, QuantityStepper và PixelProgress với giá trị clamp theo dữ liệu nhận được; xác minh số lượng min/max, disabled và tên Việt dài bằng thao tác thực trên trang mẫu.
- [x] 2.4 Tài liệu hóa props/token và cập nhật assets/README; xác minh mẫu component dùng được từ HUD và một modal, chạy typecheck sau nhóm này.

## 3. Lát cắt HUD + kho + đại lý

- [x] 3.1 Chuyển App sang layout vùng HUD/world/footer/kho, dùng kích thước thật và safe-area; xác minh mở/đóng kho và resize liên tục không che HUD hay làm hỏng Pixi lifecycle.
- [x] 3.2 Viết lại HUD bằng component pixel, dùng XP thật, count khách thật và bỏ capacity/buff không có cơ chế; xác minh tiền/cấp/giờ thay đổi theo simulation sau bán và sang ngày.
- [x] 3.3 Chuyển WarehouseDock sang stock thật và trạng thái châm kệ hợp lệ; xác minh kho rỗng, kệ trống, có hàng phù hợp và không có hàng phù hợp cho phản hồi đúng.
- [x] 3.4 Chuyển SupplierModal sang danh sách/stepper/tổng tiền/ngày giao; xác minh khóa theo level, thiếu tiền và sức chứa kho lạnh không cho giao dịch sai.
- [x] 3.5 Hoàn thiện bố cục mobile của lát cắt, kho mặc định đóng khi mobile và nút chạm đủ lớn; xác minh tại 844×390 và 667×375, không horizontal overflow, joystick không bị che.
- [x] 3.6 Smoke đặt hàng → ngày giao → châm kệ → bán → save/reload trên hồ sơ thử riêng; xác minh stock/tiền/XP/pending orders đúng và ghi bằng chứng vào research.md, cập nhật TASKS/ROADMAP đúng tiến độ.

## 4. Modal và điều khiển nhất quán

- [x] 4.1 Tạo coordinator một modal, khóa world input và reset held keys/joystick khi mở; xác minh mở supplier từ kệ không chồng modal và nhân vật đứng yên khi thao tác.
- [x] 4.2 Thêm dialog semantics/focus trap/Escape/restore focus; xác minh Tab/Shift+Tab không thoát modal, Escape đóng và focus về control gọi.
- [x] 4.3 Chuyển ShelfModal và InventoryModal sang cùng panel/product slots; xác minh bày/cất không nhân đôi hoặc mất hàng, hạn sử dụng hiển thị đúng.
- [x] 4.4 Chuyển CashierModal, phản hồi checkout và advance day; xác minh trạng thái đóng cửa/kệ hết và giá trị tiền/XP sau sale thực.
- [x] 4.5 Chuyển SaveModal và loading/error, bổ sung xác nhận reset hủy được; xác minh lastSavedAt chỉ đổi sau persist thành công, cancel reset không đổi save, startup error có retry.
- [x] 4.6 Chuyển BottomBar, VirtualJoystick và ToastContainer theo style/hit area mới; xác minh chữ không tràn, toast tối đa ba mục nhìn thấy và reduced-motion không mất thông báo.
- [x] 4.7 Ghi quy tắc focus/input/error trong docs, chạy typecheck/test và smoke bàn phím/cảm ứng cho nhóm modal; xác minh không regression giao dịch/lưu và cập nhật tasks đúng trạng thái.

## 5. Thế giới và sprite nguyên bản

- [x] 5.1 Nâng tiles tường/gạch bông/hẻm và bảng hiệu/mái hiên/cây; xác minh cùng palette, nguồn sáng, không đổi map collision hoặc che đường đi cũ.
- [x] 5.2 Nâng kệ/tủ lạnh/thu ngân và icon hàng Việt, bổ sung empty/low/full theo stock; xác minh mỗi fixture giữ id/anchor và hình ảnh stock cập nhật sau mua/bày/bán.
- [x] 5.3 Tạo player 32×48, walk 4 hướng ×4 frames và idle 2 frames; xác minh footprint không thay đổi, chân sprite không trượt và đúng occlusion khi đi sau kệ.
- [x] 5.4 Tạo ba silhouette customer để thay art luân phiên trong luồng khách hiện có; xác minh không tăng số khách hoặc sửa shopping logic ngoài phạm vi UI.
- [x] 5.5 Thêm animation môi trường nhẹ và day/night theo giờ game; xác minh decor không che hàng, reduced-motion dừng animation phụ và object vẫn đọc được ban đêm.
- [x] 5.6 Sửa pixel camera default zoom nguyên và thêm Fit nếu cần, cache texture/atlas; xác minh pan/zoom ở DPR 1/2 bằng screenshot grid và profiling không regenerate texture mỗi frame.
- [x] 5.7 Ghi asset sizes/anchors/animation và license ở assets/README, chạy renderer typecheck/build; xác minh fallback cũ vẫn khởi động được khi asset thiếu.

## 6. Tích hợp và nghiệm thu

- [x] 6.1 Đối chiếu mọi scenario của bốn specs (bao gồm store-warehouse) với game chạy thật; xác minh báo cáo có pass/fail và bằng chứng cho từng requirement, không chỉ screenshot đẹp.
- [x] 6.2 Chụp ma trận 1920×1080, 1366×768, 1024×768, 844×390, 667×375 với kho/modal dài/money lớn/error; xác minh CTA không bị cắt, body không mất dấu và idle mobile còn ≥60% chiều cao bản đồ.
- [x] 6.3 Đo frame time sau warm-up trên máy/thiết bị ghi rõ; xác minh mục tiêu p95 desktop ≤20ms và mobile ≤33ms khi có thiết bị thật, ghi giới hạn nếu chỉ giả lập viewport.
- [x] 6.4 Chạy lại `yarn typecheck`, `yarn test`, `yarn build` và flow save cũ/reload/lifecycle resize; xác minh không regression do change này và không đổi save schema.
- [x] 6.5 Cập nhật TASKS/ROADMAP và báo cáo giao diện trước/sau, phần còn thiếu; xác minh mọi checkbox đánh dấu x có bằng chứng, chỉ archive change sau khi các tác vụ triển khai hoàn tất.

## 7. Nhà kho vật lý phía sau cửa hàng — bổ sung plan

Nhóm này đã triển khai và có bằng chứng kiểm thử trong docs/ui/WAREHOUSE.md. Các kết quả nhóm 1–6 đã đánh dấu x là kết quả trước khi có nhà kho; kiểm thử tích hợp phải chạy lại ở 7.9.

- [x] 7.1 Audit map/collision/spawn/A* và save cũ; chốt phòng kho 6×5 tile liền phía trên, cùng hai mép với tiệm, cửa hậu/lối đi ≥2 tile; ghi sơ đồ tọa độ và kiểm tra không dịch chuyển kệ/quầy/cửa chính cũ.
- [x] 7.2 Thêm phòng kho và collision, id điểm tương tác riêng cho giá khô/góc lạnh/bàn nhận; kiểm tra đi vào/ra bằng WASD/joystick, không xuyên giá/tường, NPC chỉ mua ở gian bán.
- [x] 7.3 Vẽ asset nguyên bản cho biển NHÀ KHO, cửa, nền xi măng, giá, thùng carton, góc lạnh và bàn kiểm kê; document source/license/anchor và kiểm tra occlusion, empty/low/full từ tồn thật.
- [x] 7.4 Thêm WarehouseModal vào coordinator; nhóm hàng khô/lạnh, số lượng, hạn, cold used/reserved, châm kệ và đại lý; kiểm tra một dialog, focus trap/Escape/restore và world input bị khóa.
- [x] 7.5 Kết nối WarehouseDock và màn inventory với cùng nguồn reserve stock; bổ sung Xem nhà kho để camera nhìn/đánh dấu cửa, không teleport; kiểm tra mở xem không đổi tiền/hàng và không có ledger trùng.
- [x] 7.6 Thể hiện pending orders/ngày giao tại khu nhận và phản hồi khi hàng đến; kiểm tra đơn tới hạn nhận đúng một lần, hàng khô/lạnh/hết hạn và khóa vượt chỗ lạnh đúng luật hiện có.
- [x] 7.7 Bổ sung fixture kho khi load save cũ một cách idempotent, giữ schema nếu không cần dữ liệu mới; test money/XP/lots/pending/sales stock và vị trí hợp lệ, fallback vị trí collision không reset tiến trình.
- [x] 7.8 Chụp phòng kho/modal trên năm viewport, DPR 1/2 và night/reduced-motion; xác minh lối đi/biển/CTA đọc được, không che joystick, camera zoom nguyên và đi sau giá không sai occlusion.
- [x] 7.9 Smoke đặt → giao vào kho → bày → cất → bán → save/reload, NPC path và lifecycle resize; chạy lại typecheck/test/build, đo hiệu năng có nhà kho, cập nhật VERIFICATION/TASKS/ROADMAP trước khi xét archive.
