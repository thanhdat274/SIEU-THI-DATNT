# Nhà kho cửa hàng

Triển khai trong change `premium-vietnamese-pixel-ui`, dùng inventory hiện hữu và save schema 2.

## Map và đường đi

Map 26×22 có `originTileY=-6`: array row0 tương ứng world tile−6. Collision, A* và renderer đều đổi giữa chỉ số local/world. Gian bán hàng x6..13/y3..10, cửa chính x9..10/y10, tất cả kệ/quầy/tủ bán và spawn cũ giữ nguyên. Kho liền phía trên, cùng mép x6..13: tường y−3..3, lòng phòng 6×5 tại x7..12/y−2..2. Tường y3 dùng chung với lưng tiệm, cửa hậu x9..10/y3 rộng hai tile. Giá khô x7..8/y−1, tủ lạnh x11..12/y−1, bàn nhận x11..12/y1. Lối giữa x9..10 và ngang y0..1 thông suốt; đi sau giá tại y−2.

Kho và tiệm chung tường, không còn hành lang bên phải. Vỏ phòng, cửa giữa, tâm camera và vị trí nội thất kho tính từ STORE_BOUNDS/WAREHOUSE_BOUNDS. Hai bên tiệm để trống cho hướng mở rộng ngang sau này. Cơ chế nâng cấp/mua diện tích thuộc phase mở rộng riêng; đợt này chuẩn hóa vị trí để feature đó không vướng kho bên hông. Camera giữ giữa kho khi ở trong phòng; desktop zoom1 định vị cho thấy cả hai phòng, mobile định vị riêng kho để giữ chữ/sprite đủ lớn.

Khách chỉ target `isSalesFixture`; A* của khách chặn world y≤3. Collision và A* người chơi vẫn đi qua cửa kho và hỗ trợ tọa độ y âm. Không thay hành vi tự checkout của NPC.

## Điều khiển

Nút Kho trên HUD mở bảng tồn nhanh; **Xem nhà kho** hoặc icon **Định vị nhà kho** cạnh zoom đưa camera tới phòng kho và đánh dấu cửa hướng lên. Di chuyển đưa camera trở lại nhân vật. Đi lên lối giữa hai kệ, qua cửa hậu ở giữa tường trên tiệm. Tới giá, tủ hoặc bàn nhận, E/nút Xem mở panel. Tiệm đóng vẫn vào kho được.

Panel có bộ lọc hàng khô/lạnh, từng lô/hạn, chỗ lạnh đang dùng/giữ bởi đơn chờ, châm kệ hợp lệ và đại lý. Mở đại lý thay dialog kho; world input/focus gate dùng coordinator hiện có. Màn Túi & sổ kho giải thích đây là cùng hàng dự trữ, không tạo túi mang theo riêng.

## Stock và migration

Warehouse fixtures có stock=0, không assignedProductId, không chứa lô riêng. Art/count tính trực tiếp từ inventory hoặc pending orders; không cho bày/cất/bán qua fixture kho. Góc lạnh 40 chỗ gồm reservation, tủ bán vẫn 12. Hàng khô không có capacity giả. Đơn tới hạn tự nhập một lần, loại khỏi pending; toast ghi số lượng thực sau delivery. Không có nút nhận lần hai.

Hydrate thêm/canonicalize ba fixture kho theo id ổn định, giữ stock/lots/money/XP/pending của save cũ. Giữ vị trí hợp lệ trong tiệm và kho trên. Nhận diện fixture kho bên phải phiên trước: nếu người chơi còn đứng ở phòng đó, chuyển tới cửa hậu mới (320,112) có thông báo. Vị trí chắn tường/giá hoặc ngoài map cũng về điểm này. Import/reset cũng kiểm tra vị trí. Không đổi save schema vì origin chỉ thuộc map, không phải save.

## Asset nguyên bản

`packages/game-renderer/src/warehouse-textures.ts`: procedural rectangles trên grid; không dùng asset mạng. `warehouse_floor`, `warehouse_wall` 32×32; `warehouse_sign` 128×24 với glyph NHÀ KHO tự vẽ; `fixture_warehouse_dry/cold/receiving` 64×48 (anchor sprite −16px, footprint 64×32). Empty/low/full cache key, DOM/Pixi icon cùng product mapping. Cold empty vẫn có vỏ tủ, receiving empty vẫn có sổ giấy; không vẽ carton hàng khi không còn stock. License theo mã nguồn project, không thêm license bên thứ ba.

## Bằng chứng

- `packages/game-core/src/warehouse.test.ts`: legacy hydrate, idempotent reload, tiền/vị trí/tồn giữ nguyên, collision/cửa/A*, đi bốn hướng qua phòng và trở về, guard stock, đơn chờ/giao một lần, fallback vị trí và NPC không vào kho.
- `docs/ui/qa/verify-warehouse.cjs`: context thử riêng, camera không teleport, keyboard E/modal gate/focus, bày bảo toàn tổng hàng, supplier một dialog, giao +3, save/reload; năm viewport panel/canvas không overflow, DPR2 và night hour20 từ save thử.
- Ảnh `qa/warehouse-*.png` và metrics `qa/warehouse-metrics.json`; không dùng dữ liệu save của người dùng.
- `qa/verify-warehouse-controls.cjs`: W/A đi vào kho, D/S đi ra qua cửa hậu, joystick pointer-capture vào kho và nút Xem mở dialog, vị trí kiểm chứng từ export Save UI thay vì snapshot HUD. Reduced-motion canvas giống nhau sau khi camera/toast ổn định, desktop lẫn 667×375; `qa/warehouse-controls.json`.
- Hiệu năng headless chỉ là số đo môi trường thử; không chứng minh FPS điện thoại thật. Không archive khi nghiệm thu chung còn mở.
- Đo mới sau warm-up30s, 180 mẫu rAF tại1366×768 DPR1: p95 66.7ms ở phiên kho bên phải trước lần đổi bố trí, vượt mục tiêu20ms; không suy ra FPS thiết bị thật. `qa/performance.json` là kết quả mới, các số83.3ms trong báo cáo trước là lịch sử.
