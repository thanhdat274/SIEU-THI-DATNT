# Proposal: Chuỗi chi nhánh

## Vì sao

Tiệm xôi (change `xoi-shop-same-land-strip`) chỉ là tòa nhà thứ hai trên **cùng bản đồ, cùng save, cùng kho, cùng sổ cái**. Game gốc `tap-hoa-dau-hem` có chi nhánh thật (`branches.ts`, `internalSupply.ts`: mỗi cửa hàng một snapshot, hàng luân chuyển nội bộ) và chương 7 "mở chuỗi" đo việc này. Ở dự án này chương 7 tạm đo `buildingsOpened` (tiệm xôi), không phải chi nhánh (xem `tổng hợp.md`, 03/10/2026). Đây là mục "chuỗi chi nhánh và loại hình cửa hàng khác" còn thiếu.

Chủ dự án đã chốt (03/10/2026):

1. **Tiền chung** cho cả chuỗi.
2. Chi nhánh **vừa chạy nền tự động, vừa cho người chơi ghé qua** để mở rộng đất và sắp xếp nội thất.
3. Loại hình đầu tiên ngoài tạp hóa và xôi là **quán nước nhiều loại đồ uống**; loại hình khác làm sau.
4. **Kho tổng dùng chung**; mỗi chi nhánh lấy hàng từ kho tổng để bày lên kệ.

## Mục tiêu

- Một "chuỗi" gồm tiệm gốc (hub) và các chi nhánh, mỗi chi nhánh có **bản đồ, nội thất, nhân viên, đất riêng**; người chơi chọn chi nhánh đang điều khiển, ghé qua chỉnh bố cục/mua đất.
- Một ví và một sổ cái cho cả chuỗi (mỗi dòng sổ cái có nhãn chi nhánh); một kho tổng. Hàng chỉ ra kệ chi nhánh qua **lệnh chuyển kho** có FEFO và giá vốn theo lô.
- Chi nhánh không được điều khiển vẫn **chạy nền** theo mô hình rút gọn theo ngày (không mô phỏng từng khách), dùng cùng kinh tế với phần còn lại.
- Loại hình `drink_shop` (quán nước) là loại hình đầu tiên có mẫu bản đồ/nội thất/catalog riêng, dựa trên hệ trạm đồ uống đã có (`drink_counter`, `blender`, `sugarcane_press`).
- Chương 7 chuyển sang đo số chi nhánh thật; chạy được ở chơi một mình và co-op (server replay).

## Ngoài phạm vi

- Loại hình thứ ba trở đi (quầy cổng trường, chợ, khu công nghiệp...), nhượng quyền, bán/đóng chi nhánh, chi nhánh thuộc người chơi khác trong co-op (ghi là câu hỏi mở).
- Mô phỏng khách theo từng người ở chi nhánh chạy nền; chỉ chi nhánh đang điều khiển mới có khách, nhân viên đi bộ từng bước.
- Cân bằng kinh tế chính thức, thuế đã xác minh pháp lý (`docs/tax`), vẽ sprite mới (tái dùng texture hiện có, chỉ thêm biển).
- Thay đổi mô hình tiệm xôi hiện có (tiếp tục là tòa nhà trên bản đồ hub).

## Cách tiếp cận (tóm tắt, chi tiết ở `design.md`)

Không nhân đôi kho/nhân viên/sổ cái trong một `GameSimulation` (hơn 30 chỗ đụng `playerData.money`, 45 chỗ liên quan kho, 20 chỗ ghi sổ). Mỗi chi nhánh là **một save và một `GameSimulation` riêng**, tại mọi thời điểm chỉ một cái hoạt động; một lớp `Chain` điều phối: ví chung, kho tổng, lệnh chuyển kho, chạy nền theo ngày, chuyển chi nhánh. Hub giữ `player.money` làm ví chung và kho làm kho tổng để save hiện có là hub hợp lệ, không phải migration lớn; chi nhánh nằm trong trường tùy chọn của save hub.

## Tiêu chí hoàn tất

- Save cũ nạp thành chuỗi một cơ sở, không đổi hành vi, không nâng schema bắt buộc.
- Mở chi nhánh quán nước trừ tiền chung đúng một lần, tạo bản đồ/bố cục mặc định, idempotent, qua server replay.
- Chuyển hàng kho tổng → chi nhánh: FEFO, bảo toàn số lượng và giá vốn, không âm kho, từ chối khi thiếu hàng/chỗ.
- Chi nhánh chạy nền cho kết quả xác định theo (hạt giống, ngày); lưu/nạp và server replay không tính trùng ngày.
- Tổng tiền chuỗi bằng tổng các dòng sổ cái; báo cáo xem được theo chi nhánh và toàn chuỗi.
- `yarn typecheck`, `yarn test`, `yarn build` PASS bằng kết quả thực tế; browser QA ghi riêng, không suy ra từ unit test.
