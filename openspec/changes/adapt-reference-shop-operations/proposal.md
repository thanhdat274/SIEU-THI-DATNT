# Proposal

## Why

Game `C:/Users/Admin/Desktop/GAME/tap-hoa-dau-hem` có dữ liệu 335 sản phẩm và code vận hành tiệm phong phú; dự án hiện tại có 36 sản phẩm, kho/lô/hạn dùng và một NPC nhưng chưa có nhân viên. Chọn lọc dữ liệu và quy tắc đã tìm thấy giúp mở rộng vòng chơi mà không thay React/PixiJS/Dexie bằng Phaser hoặc làm lại nền đang có.

## What Changes

- Lập bảng đối chiếu toàn bộ catalog nguồn, giữ nguyên ID/giá của 36 sản phẩm hiện tại; thêm đợt đầu 20 mặt hàng tương thích sau khi duyệt mapping, tránh món trùng nghĩa và hàng cần freezer/bếp/quầy riêng.
- Bày hàng theo sơ đồ lưu bằng fixture ID; châm hàng trả số lượng thực chuyển, giữ lô/hạn và không tự đổi món đang bày.
- Nhiều mối nhập hàng, giỏ hàng nguyên tử, chiết khấu/đơn tối thiểu/thời điểm giao; khu hàng chờ cho phần giao không vừa kho.
- Hàng đợi khách, giỏ đã lấy và một đường thanh toán duy nhất trước khi mở thu ngân tự động.
- Tuyển thu ngân và người châm kệ; việc có người nhận, ca/lương và bàn giao, dùng cùng lệnh nghiệp vụ với người chơi.
- Ghi giá vốn từng lô và sổ ngày; gợi ý nhập theo lịch sử bán, trừ tồn/đơn chờ; tự nhập chỉ sau khi bật và giới hạn ngân sách.
- Save có migration từ schema 2 và phục hồi lỗi đọc an toàn. Chi tiết khảo sát, giới hạn và thứ tự phát hành nằm trong `research.md` và `design.md`.

## Capabilities

### New Capabilities

- `catalog-adaptation`: catalog chọn lọc và mapping nguồn sang schema hiện tại.
- `shelf-operations`: sơ đồ kệ, châm hàng thực chuyển và bảo toàn lô.
- `supplier-operations`: giỏ nhập, mối sỉ, giao hàng và hàng chờ.
- `customer-transactions`: khách/giỏ/queue và thanh toán chống trùng.
- `employee-operations`: tuyển dụng, nhận việc, ca và lương.
- `daily-stock-planning`: sổ ngày, giá vốn và gợi ý/tự nhập có kiểm soát.
- `operations-persistence`: migration và khôi phục trạng thái vận hành.

### Modified Capabilities

Không có main specs (`openspec list --specs`: No specs found). Phối hợp change `shared-alley-multiplayer` qua command có ID, không tạo world/auth/server thứ hai.

## Impact

- `packages/shared/src/index.ts`: kiểu dữ liệu catalog, lô giá vốn, supplier/cart/delivery, khách, nhân viên, ledger và save.
- `packages/game-data/src/products.ts`: catalog; thêm modules suppliers/staff/balance.
- `packages/game-core/src/simulation.ts`, `stock.ts`, `test-runner.ts`: tách modules giao dịch/kho/khách/việc/nhân viên/báo cáo, regression invariants.
- `apps/web/src/App.tsx`, `db.ts`, store, các modal kệ/kho/đại lý/quầy và modal nhân viên/báo cáo; renderer vẽ nhiều NPC/nhân viên.
- Không thêm dependency ở giai đoạn plan. Nguồn chỉ đọc, không import runtime từ thư mục ngoài dự án. TASKS/ROADMAP ghi đề xuất chưa triển khai; chưa chạy game nguồn hay bộ test nguồn trong khảo sát này.
