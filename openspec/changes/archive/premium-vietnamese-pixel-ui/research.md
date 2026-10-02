# Nghiên cứu giao diện — 30/09/2026

## Phạm vi và độ tin cậy

Nguồn do người dùng cung cấp đã được mở trực tiếp bằng browser; nguồn bổ sung được tìm trên web. Bảng phân biệt điều đã quan sát với định hướng thiết kế của dự án. Không coi mô tả marketing là bằng chứng đã chơi thử đầy đủ.

| Nguồn | Đã xác minh | Ý tưởng áp dụng |
| --- | --- | --- |
| [Tiệm Mì Cay](https://tiem-mi-cay.vercel.app/) | URL chuyển sang aenhatrang.com; landing có hình tiệm, thông báo và onboarding lên cấp/mở khóa, nền nâu đỏ và CTA đỏ lớn | Tên tiệm nổi bật, hướng dẫn một việc mỗi bước, diễn đạt gần gũi. Không lấy giao diện bo tròn làm chuẩn pixel |
| [Tiệm Xôi Bà Tám](https://tiemxoibatam.io.vn/) | Trang thông báo chuyển sang app; nút Chơi Ngay dẫn tới `/choi-ngay/`; đã thấy màn tải với chữ pixel và lời thoại Bà Tám. Chưa quan sát đầy đủ HUD trong game | Giọng kể nhân vật Việt và màn khởi động có bản sắc; không suy đoán hệ quản lý bên trong |
| [Chủ Tiệm Nhỏ — redhexx16](https://redhexx16.itch.io/grocery-store) | Chạy game nhúng; thấy HUD ngày/giờ, tiền, tim, quản lý, tốc độ và mở cửa; popup hàng/nhân viên/báo cáo/nâng cấp/cài đặt, bảng kệ/kho/nhập-bán và footer hướng dẫn | Khung nhiều lớp, icon sản phẩm, bố cục bảng dễ so sánh. Giảm mật độ chữ và tăng kích thước nút so với màn nhúng |
| `C:/Users/Admin/Desktop/GAME/tap-hoa-dau-hem` | Đọc README, package.json và `src/ui/theme.ts`: Phaser, thiết kế nền 360×640, scale nguyên 2, hệ màu ấm và UI nhiều module | Từ vựng hàng hóa, hệ màu Việt, cách tách UI; dùng làm tham khảo mã nguồn, chưa chạy hay sao chép asset |
| [Hội thoại nền](https://chatgpt.com/share/6abbf29b-8488-83ec-b72b-e71fd10ad4eb) | Đọc phần hiển thị: PixiJS v8 + React, landscape 16:9, tile 32×32, logic 960×540, nhân vật 32×48/64, top-down 2.5D, hoài cổ 1990–2000 | Giữ kiến trúc và hướng ngang đã thống nhất; không nhập cấu hình portrait của dự án Phaser |
| [Stardew Valley — Media](https://www.stardewvalley.net/media/) và [Press](https://www.stardewvalley.net/press/) | Nguồn chính thức có screenshots/trailer; trang press đề cập UI riêng cho mobile | Tham khảo tổ chức cảnh đời sống và menu túi đồ; đây là hướng art đề xuất, không sao chép sprite |
| [Moonlighter — 11 bit studios](https://11bitstudios.com/game/moonlighter/) | Trang publisher của game | Đối chiếu game bán hàng pixel: chất lượng silhouette hàng hóa, phản hồi mua bán và độ rõ panel; dùng Moonlighter bản đầu làm art reference |
| [Eastward — Media](https://eastwardgame.com/media/) | Nguồn chính thức mô tả kết hợp retro pixel với ánh sáng hiện đại | Chọn lọc chi tiết môi trường và lớp ánh sáng; giảm độ dày trang trí để kệ hàng luôn rõ |
| [Kynseed — PixelCount](https://kynseed.com/about-pixelcount-studios.html) | Nguồn developer và [changelog](https://www.server.kynseed.com/changelog.html) có portrait pixel trong UI | Thêm chân dung NPC nhất quán vào hướng dẫn; không làm hệ gia đình/đời sống mới trong đợt UI |
| [Roots of Pacha — Nintendo](https://www.nintendo.com/us/store/products/roots-of-pacha-switch/) | Trang sản phẩm chính thức và ảnh giới thiệu | Tham khảo sắc ấm, biểu cảm và nhịp sống thư giãn |
| [Super Shopper Simulator](https://sodagummy.itch.io/super-shopper-simulator) | Trang tác giả có game đi mua hàng và ghi nguồn UI pack pixel | Đối chiếu độ rõ sản phẩm trên kệ và chỉ dẫn công việc; chỉ xem asset pack nếu kiểm tra license riêng |

## Kết luận thiết kế

Tổng hợp thành phong cách nguyên bản “Nắng Hẻm”: cảm giác cửa hàng Việt có người sống trong đó, phối cảnh top-down nhìn mặt trước đồ vật, HUD ít nhưng đủ và sổ hàng rõ. Khung gỗ/giấy của game quản lý, chi tiết môi trường đời sống và lời thoại Việt là ba trục thiết kế. Chất lượng sẽ đo bằng tính nhất quán, độ rõ ở mobile và phản hồi gắn gameplay; không thể bảo đảm thứ hạng “đẹp nhất” bằng một danh sách tham khảo.

## Kiểm toán code hiện tại

- `HUD.tsx`: nhiều `rounded-*`, emoji, khối thống kê cùng hàng; event luân phiên theo `day % 4` công bố +25%/+50% mà chưa đối chiếu cơ chế buff. `experience % 100` cần thay bằng công thức XP thật sau khi đọc logic level.
- `App.tsx`: khách đang có lấy từ một customer; `maxStoreCapacity={11}` là giá trị gán cứng. Không hiển thị tỷ lệ sức chứa nếu simulation chưa có hợp đồng đó.
- `WarehouseDock.tsx`: panel fixed `top-14`, dễ đè HUD khi HUD wrap; mở mặc định và che bản đồ. Cần vùng layout có chiều cao thật.
- `camera.ts`: zoom bước 0.25, mặc định 1.75/2/2.5; nearest filtering không tự bảo đảm pixel có độ rộng đều ở fractional scale.
- `textures.ts`: đã có texture procedural, nearest filtering và nhiều sản phẩm Việt; nâng trên nền này, giữ fallback.
- `index.html`: khóa pinch zoom; cần rà lại để giữ khả năng phóng chữ/giao diện và không làm canvas nhận thao tác vô tình.
- Repo đang có nhiều thay đổi chưa commit; mọi triển khai phải giữ những thay đổi này, chỉ sửa phần liên quan.

## Asset và nguồn

Baseline triển khai: `docs/ui/QA.md` và `docs/ui/qa/baseline-*.png`. Typecheck/test/build pass. XP giảm phần ngưỡng khi lên cấp, threshold ×1.5, một customer tự checkout. Giữ các thay đổi pre-existing (tax/core, docs, Yarn). Không sửa save schema 2.

Tự vẽ hoặc generate procedural cho icon, viền và sprite. Mọi font/asset nhập thêm phải ghi tác giả, URL, license, quyền sửa và redistributing trong `assets/README.md`; không trích asset của game tham khảo. Font body ưu tiên khả năng hiển thị tiếng Việt, font pixel chỉ chọn khi kiểm tra đủ dấu. Tham khảo [OpenSpec](https://openspec.dev/) và schema CLI đã cài 1.13.2 cho quy trình proposal → specs/design → tasks.

## Apply 30/09/2026
Giao diện Nắng Hẻm đã triển khai. Smoke hồ sơ riêng: mua 3 mì trừ 9.000, nhận đủ 3 ngày 2, châm kệ tổng stock bảo toàn, bán tăng 4.500 và 5 XP, reload đúng state. Bày/cất 1 qua ShelfModal bảo toàn kho/kệ; chuyển shelf sang đại lý còn một dialog. Save revision conflict báo thất bại và giữ lần lưu thành công. Typecheck/test/build pass; ma trận 5 viewport không overflow, mobile canvas 66.9–68.2% chiều cao. Đo headless p95 sau warmup: 83.4ms, sau cache badge 83.3ms, chưa đạt 20ms và chưa có số đo điện thoại thật. Chi tiết/bằng chứng/thiếu kiểm tra ở docs/ui/VERIFICATION.md; không archive khi còn task mở.

## Nhà kho đã code
Map 26x16, phòng 6x5 phía sau bên phải, cửa nối 2 tile; giữ kệ/quầy/spawn cũ. WarehouseModal, giá khô/góc lạnh/bàn nhận dùng inventory/pending thật. Test migration/collision/A*/đi lại/NPC/delivery pass. Browser đặt 3 -> giao +3 -> châm -> cất/bày -> bán +4.500/+5 XP -> save/reload pass. Keyboard và joystick đi vào kho thực, reduced-motion ảnh canvas ổn định; 5 viewport không overflow, DPR1/2 49 canvas sau warmup và không tăng theo frame. Hiệu năng headless 30s warmup/180 rAF p95 66.7ms, chưa đạt 20ms, không có điện thoại thật. Báo cáo và ảnh tại docs/ui/WAREHOUSE.md, docs/ui/qa/warehouse-*. Change còn các nghiệm thu chung chưa hoàn tất, không archive.

## Điều chỉnh bố trí theo yêu cầu người chơi
Kho chuyển liền phía trên, cùng footprint ngang với tiệm, cửa hậu giữa. Map originTileY=-6 giúp giữ kệ/quầy/player/NPC cũ ở cùng world coordinate; collision và A* ánh xạ local/world. Save schema2 không đổi. Fixture kho phiên bên phải được canonicalize; player trong phòng bị bỏ chuyển về cửa hậu (320,112), không mất tiền/hàng/lots/pending. Tests và bộ ảnh warehouse-* đã chạy lại theo bố trí này. Bounds chung chuẩn bị cho thiết kế mở rộng ngang; chưa thêm cơ chế mua/nâng cấp diện tích.
