# Proposal

## Why

Tiệm Tạp Hóa Đầu Hẻm cần một giao diện pixel art đồng nhất, giàu không khí hẻm Việt thập niên 1990–2000 và dễ thao tác trên PC lẫn điện thoại ngang. Bản hiện tại có nền PixiJS tốt nhưng trộn emoji, panel bo tròn, font và thông tin trang trí nên chưa đạt chất lượng hình ảnh mong muốn.

## What Changes

- Xây bộ giao diện “Nắng Hẻm”: khung gỗ pixel, giấy kem, xanh ngọc của mái hiên, đỏ gạch và vàng nắng; icon tự vẽ nhất quán với sprite trong thế giới.
- Tổ chức HUD thành cụm ngày/giờ/trạng thái, tiền/cấp độ và thao tác; đưa thông tin phụ vào sổ quản lý để bản đồ luôn dễ quan sát.
- Thiết kế lại kho, nhà cung cấp, kệ, thu ngân, lưu game và thông báo theo cùng hệ component; có trạng thái trống, khóa, thiếu tiền, đầy kho và lỗi lưu rõ ràng.
- Nâng chất lượng hình ảnh cửa tiệm, nhân vật, hàng hóa, tương tác và hiệu ứng phản hồi bằng pixel art nguyên bản.
- Bố cục riêng cho desktop và mobile landscape; vùng chạm đủ lớn, panel cuộn được, tránh che joystick và nút tương tác.
- HUD chỉ công bố dữ liệu và hiệu ứng thực sự có trong simulation; bỏ tuyên bố buff theo ngày và sức chứa khách giả định.
- Lập tài liệu tham khảo có nguồn, asset inventory, tiêu chí kiểm tra hình ảnh và lộ trình triển khai theo từng lát cắt có thể chơi.
- Bổ sung nhà kho vật lý phía sau cửa hàng: phòng đi vào được, cửa nối gian bán hàng, giá hàng khô, góc bảo quản lạnh và khu nhận hàng. Hàng trong kho phản ánh inventory thật; WarehouseDock là bảng xem nhanh của nhà kho này.

## Capabilities

### New Capabilities

- `pixel-visual-language`: diện mạo pixel art đồng nhất, chữ tiếng Việt và phản hồi hình ảnh.
- `gameplay-hud`: thông tin thật và thao tác quản lý gắn với game đang chạy.
- `responsive-game-panels`: panel quản lý, tương tác bàn phím và cảm ứng trên màn hình ngang.
- `store-warehouse`: nhà kho vật lý, lối đi và điểm tương tác nhận/xem/lấy hàng gắn với tồn kho hiện có.

### Modified Capabilities

Không có spec nền hiện hữu (`openspec list --specs` trả về rỗng). Đây là lần đầu ghi nhận hợp đồng giao diện cho các chức năng game đã có.

## Impact

Phần nhà kho bổ sung phạm vi map/fixture trong `packages/game-data`, điểm tương tác trong shared/core và art/camera trong renderer. Ưu tiên giữ save schema 2; bổ sung fixture mặc định khi load mà không mất hàng hoặc dịch chuyển vị trí hợp lệ. Ràng buộc giữ collision bên dưới áp dụng cho gian bán hàng hiện hữu; nhà kho được phép thêm vùng đi lại và một cửa nối được kiểm thử.

Ảnh hưởng `apps/web/src/components`, `App.tsx`, `index.css`, cấu hình Tailwind và renderer/camera/texture trong `packages/game-renderer`; có thể bổ sung asset nguyên bản ở `assets` và thư mục public của web. Giữ React, TypeScript, PixiJS v8, Zustand và IndexedDB; không cần thay framework hay thêm thư viện UI. Kiểm tra điều khiển, inventory, mua hàng, checkout, XP và save/load khi áp dụng. Thư mục Phaser `C:/Users/Admin/Desktop/GAME/tap-hoa-dau-hem` chỉ dùng tham khảo; triển khai trong repo hiện tại. Không có thay đổi backend hoặc định dạng save được đề xuất.
