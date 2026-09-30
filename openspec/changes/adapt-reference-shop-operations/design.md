# Design

## Context

Xem proposal.md và research.md cho mục tiêu và bằng chứng nguồn. Đích giữ React/PixiJS/Dexie/Yarn; schema game 2 khác version Dexie 1. Fixture chỉ có một assignedProductId, customer hiện là một object. Change shared-alley-multiplayer dự kiến server authoritative và pause world khi không ai online.

## Goals / Non-Goals

**Goals:** Chuyển quy tắc nghiệp vụ thành các module thuần có thể chạy local hoặc server; bảo toàn tiền/hàng/lô; mở rộng theo các đợt có gate kiểm chứng riêng.

**Non-Goals:** Port Phaser/UI nguồn; thêm đủ 335 món; freezer/bếp/xôi/chi nhánh/bảo vệ/giao hàng/offline income; thay thiết kế auth/world/server; triển khai trong phiên lập plan.

## Decisions

1. **Catalog curated**: snapshot nguồn trong change, manifest mapping duyệt riêng trong game-data khi apply, 20 món mới đủ tương thích. Giữ 36 ID cũ để save không mất hàng; không dùng merge dựa trên ID nguồn vì trùng nghĩa khác ID. Snapshot ngoài runtime giúp build không phụ thuộc đường dẫn máy tác giả.
2. **Một command nghiệp vụ**: order/transfer/pickup/checkout có commandId, actorId, businessId khi online. Result có actualQuantity/paidTotal/reason. Simulation local và server authoritative sau này dùng cùng handler; App và worker không được tự cộng/trừ tài sản. Không xây networking riêng trong change này. Revalidate tại commit và chống replay theo ID; claim không đủ thay cho atomic commit.
3. **Tách simulation theo nghiệp vụ**: stock giữ FEFO, operations/suppliers/customers/jobs/employees/ledger là modules dự kiến dưới game-core. Simulation điều phối clock/tick/snapshot. Ưu tiên composition thay port DaySession nguồn vì nguồn phụ thuộc cả cooking/tax/branches.
4. **Kệ theo fixture ID**: planogram `fixtureId → productId`; apply chỉ châm đúng món hoặc gán kệ trống. Không tự cất/đổi món có hàng. actualQuantity giới hạn min(requested, tồn hợp lệ, capacity product, capacity fixture), giữ unitCost và expiresOnDay. Target invalid bị bỏ qua kèm lý do.
5. **Nhập hàng atomic**: supplier config gồm ID/unlock/discount/minOrder/delayDays/deliverMinute; giỏ chốt tổng/giá/lịch ở lúc đặt. Giữ mối legacy giá chuẩn giao 06:00 ngày sau; thêm mối giao ngay và mối giảm giá đơn tối thiểu, thông số là config cân bằng được duyệt khi apply. Dry capacity mặc định không giới hạn để không thay legacy; cold giữ 40, pending lạnh vẫn đặt giữ chỗ. Holding dùng khi capacity đổi hoặc save legacy vượt sức chứa, không thành kho lạnh vô hạn: giữ hạn gốc, vẫn hết hạn, không bán/châm trước khi stow. Delivery trạng thái và ID ngăn nhận hai lần; giao trễ không gia hạn lô.
6. **Khách sở hữu hàng trong giỏ**: pickup trừ tồn kệ và chuyển lô vào basket; checkout chỉ bán basket ở đầu queue. Khách bỏ đi trả lô còn hạn về fixture phù hợp hoặc kho/holding; hàng hết hạn ghi spoilage. Giỏ giữ giá chốt lúc lấy để tổng không đổi giữa lượt. Thay bán tay không gắn khách bằng phục vụ khách hợp lệ; đánh dấu thay đổi hành vi khi apply. Migration customer cũ chưa có basket phải quay tới kệ lấy hàng, không tạo tiền/hàng từ targetFixtureId.
7. **Nhân viên MVP**: cashier/refill, speed/stamina; tuyển từ bảng ứng viên có seed ngày, slot theo cấp; giới hạn mặc định 2 vị trí, ca trong khoảng giờ mở hiện tại 06–22 thay vì bê ca 08–20. Bảng balance duyệt lúc apply; accuracy luôn chính xác ở MVP, không thêm lỗi thối tiền ngẫu nhiên. Job key theo customer/fixture; end shift bàn giao sau commit hiện tại, huỷ phần chưa commit và nhả claim. Pathfinding tới điểm tương tác; không có đường thì không chuyển hàng. MVP châm từng chuyến từ kho, hàng đang mang là location riêng trong snapshot. Lương theo ca với payroll `(businessId,day)` chống trùng, thiếu tiền ghi wageDebt, không âm tiền; tâm trạng/EXP nhân viên hoãn.
8. **Ledger trước gợi ý**: StockLot thêm unitCost và provenance estimated/known, xuyên suốt kho/kệ/giỏ/hàng mang/holding. Ledger phân biệt purchase cashflow và COGS lúc bán; profit = sales - COGS - spoilage - wages, không trừ purchase lần hai. Doanh thu/khách/giao dịch/món tách riêng. Gợi ý dùng 3/7 ngày, fallback mức nhỏ khi chưa có dữ liệu, trừ tất cả location và incoming theo ETA; dùng hàng còn hạn tới lúc dùng. Cắt theo ngân sách/cold capacity; hàng mau hỏng giới hạn theo hạn. Reviews/quests không phải dependency. Tự nhập mặc định tắt, chạy mỗi sáng một lần, qua cùng handler giỏ hàng và lưu báo cáo bỏ qua.

## Risks / Trade-offs

- [Catalog quá lớn làm UI/balance nặng] → đợt đầu 20, lọc/tìm kiếm, QA danh sách dài và fallback texture.
- [Hai người/nhân viên tranh kệ hoặc quầy] → commit nguyên tử, ID chống replay, test hai tác nhân và phối hợp shared-alley-multiplayer.
- [Ôm nhiều tính năng cùng lúc] → các đợt A–E dưới đây; không coi build pass là nghiệm thu tất cả.
- [Khách/worker làm FPS tệ thêm] → cap số NPC/worker và profile tải cảnh; bằng chứng headless cũ chưa đạt vẫn giữ, không tuyên bố cải thiện.
- [Legacy không có giá vốn] → đánh dấu ước tính, không trình bày lãi cũ là số chính xác.

## Migration Plan

Đợt A sửa actual transfer, lỗi đọc save và transaction/queue. Đợt B catalog + supplier/holding/planogram. Đợt C cost lots + báo cáo/gợi ý. Đợt D nhân viên. Đợt E opt-in auto-buy và QA tích hợp. Mỗi đợt có migration version riêng khi thay save, không gán một schema tương lai cố định cho cả kế hoạch.

Backup bản lưu trước migrate; validate runtime trước persist; parse/DB error hiển thị retry/recovery và không tự ghi default đè dữ liệu. Legacy orders giữ đơn giá/ETA/ID, suppliers thiếu ID dùng legacy supplier. Planogram/rules/staff/ledger mới default rỗng, auto-buy false. UnitCost cũ lấy catalog đích đánh dấu estimated. Rebuild paths/jobs sau hydrate, giữ location đang mang và chỉ khôi phục claim khi actor/target còn hợp lệ. Day/payroll/auto-buy IDs persisted để reload không chạy lại. Save mới từ version chưa hỗ trợ bị từ chối, không downgrade tự động; rollback dùng backup trước migrate và thông báo tiến trình mới không nằm trong backup.

## Open Questions

Chọn texture cụ thể cho 20 món và thông số slot/cấp/lương/chiết khấu cuối cùng có thể chốt khi duyệt content/balance trong apply; không ảnh hưởng các ràng buộc nghiệp vụ trên. Hiệu năng thiết bị thật chưa biết và cần ghi cấu hình máy khi đo.
