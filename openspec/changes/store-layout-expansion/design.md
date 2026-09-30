# Design: Sắp xếp nội thất và mở rộng mặt bằng

## Hiện trạng đã kiểm tra

- `packages/shared/src/index.ts`: `StoreFixture` đã có `id`, `type`, tọa độ tile, width/height, rotation, hàng hiện tại/lots, capacity và label; `StoreLayout` có width/height/fixtures; save schema local là 2. Chưa có mô hình vùng đất đã sở hữu.
- `packages/game-data/src/map.ts`: bản đồ 26×22, origin Y=-6; khu cửa hàng cố định x=6..13, y=3..10; fixture đầu tiệm nằm trong bounds đó, kho ở phía bắc. Geometry tường/cửa được tạo từ map.
- `packages/game-core/src/collision.ts`, `customers.ts`, `pathfinding.ts`, `avatars.ts`: va chạm, pathfinding, routing khách và avatar đều tiêu dùng tileMap/fixtures; thay fixture phải đồng bộ các hệ thống và giữ interaction points.
- `packages/game-core/src/simulation.ts`: giữ fixture runtime, export/import save; `world-runtime.ts` xử lý command online và world snapshot. Multiplayer server/client hiện có commit command/revision.
- `apps/web/src`: React modal/HUD; renderer Pixi vẽ fixtures và map. Không có editor layout hiện tại.
- Change `adapt-reference-shop-operations` đã hoàn thành planogram theo fixture ID và ghi nhận “building/kho” là change riêng. Không sửa ngữ nghĩa planogram trong change này.

## Quyết định thiết kế đề xuất

### Mô hình vùng mặt bằng

Thêm định nghĩa dữ liệu bất biến cho footprint cửa hàng ban đầu và các plot mở rộng trong `game-data` (ID, tập rect/tile, giá VND, level yêu cầu, loại: bán hàng hoặc kho). Save lưu `unlockedPlotIds`; không lưu geometry do người chơi gửi lên. Tạo bounds hiệu lực từ seed map + plot đã mở để client/server dùng chung.

Không tăng cả map một cách tùy tiện: map hiện tại vừa chứa cửa hàng vừa có hẻm/kho. Giai đoạn thiết kế/triển khai đầu phải kiểm kê ô có thể mở mà không đè đường, nhà lân cận, collider hoặc warehouse entrance. Nếu không có đủ contiguous plots trong map hiện tại, change phải mở rộng map/layer có kiểm soát trước khi bán plot đó.

### Fixture và phép biến đổi

- Dùng fixture ID ổn định làm identity; vị trí/hướng là thuộc tính layout. Rotation quay theo bội số 90; footprint đảo width/height ở 90/270, và phép quay tọa độ/texture phải thống nhất renderer, collision và interaction.
- Di chuyển/xoay là preview → validate → commit. Validation thuần dùng chung core/server kiểm tra biên plot đã sở hữu, collision, overlap, cửa/điểm vào, vùng cấm và đường tới quầy/kệ/kho cần tương tác.
- Mọi thay đổi layout là atomic. Không được chuyển một phần fixture hoặc tiêu thụ tiền nếu validate cuối thất bại.
- Di chuyển fixture không đổi ID, assignedProductId, currentStock, stockLots, capacity, planogram, worker assignment hoặc ledger. Nếu fixture có hàng, hàng đi cùng fixture.
- Không xóa fixture trong MVP: “cất vào kho” là trạng thái persisted `storedFixtures` hoặc container tương đương, giữ toàn bộ dữ liệu fixture; lấy ra lại không mất phí. Bán nội thất hoãn để tránh định giá tồn trên kệ và hoàn tiền trong multiplayer.

### Đường đi và cửa hàng đang vận hành

- Chỉ chỉnh khi đóng cửa và không có giao dịch/worker job đang commit; khi online cần command/server kiểm tra điều kiện này.
- Cửa ra vào là ô neo của map, không cho fixture chiếm hoặc plot làm mất lối vào.
- Tối thiểu bảo đảm đường đi từ cửa tới quầy, kệ bán hàng đã gán hàng, warehouse entrance và fixture đang được staff claim. Kệ trống không cần block thao tác; khi gán hàng/châm hàng thì validation đường đi áp dụng.
- Nếu bố cục cũ hoặc map đặc biệt không đạt invariant mới, hydrate không tự xóa/cất tài sản; báo lỗi sửa layout trước khi mở cửa, đồng thời cung cấp reset-to-last-valid snapshot.

### Mua plot và economy

- Plot definitions là data có version/ID; level và tiền lấy từ config đã review, không hard-code UI.
- Mua plot chỉ ở chế độ sắp xếp, xác nhận giá + diện tích + mục đích, kiểm tra level/số dư ở core; trừ tiền và thêm `unlockedPlotIds` trong một commit idempotent.
- Giai đoạn đầu chỉ mở plot liền kề hoặc được nối với vùng cửa hàng qua lối đi; không tạo quyền sở hữu lỗ rời nếu chưa có thiết kế luồng khách.
- Giá, thứ tự mở, diện tích, ảnh hưởng capacity kho/traffic và plot cụ thể còn là quyết định balance. Ghi thành data/config sau khi map audit, không lấy giá tham khảo làm mặc định.

### Local save, migration và multiplayer

- Bump local save schema khi thêm `unlockedPlotIds`/stored fixtures. Migration schema 2 gán quyền sở hữu cho đúng footprint cửa hàng hiện hữu, giữ mọi fixture, tồn, planogram và lịch sử; backup trước migration theo cơ chế persistence hiện có.
- Import/export snapshot phải runtime-validate plot IDs, fixture IDs, loại/hướng, số nguyên tọa độ, ownership, không overlap và diện tích hợp lệ trước khi persist.
- Online chỉ gửi intent/command (fixtureId, target tile, rotation; hoặc plotId), server kiểm tra level, money, ownership, collision/path và revision; không nhận geometry/giá do client tự quyết. Kết quả broadcast snapshot mới.
- Với `layout_batch`, server dựng snapshot nền từ business save hiện tại, replay action thuần trên snapshot đó rồi commit kết quả server-generated; không lưu các trường gameplay tùy ý đính kèm trong client snapshot. Response trả authoritative business save để client đồng bộ.
- Retry cùng command ID không trừ tiền lần hai. Stale revision trả conflict và client phục hồi snapshot authoritative. Offline online-world không ghi Dexie.

### UI/renderer

- Điểm vào: nút Sắp xếp trong cửa hàng đóng; layout editor overlay/modal toàn màn hình phù hợp desktop và mobile landscape.
- Renderer hiển thị grid nhẹ, vùng mở/khóa, cửa, fixture bounds, preview màu xanh/đỏ, ghost khi kéo, palette mua/đã cất, thông tin giá/level và nút xoay/đặt/hủy/hoàn tất.
- Drag pointer và thao tác tap-select → tap-destination phải cùng làm được trên touch; nút UI không phụ thuộc hover.
- “Hoàn tất” validate toàn bộ layout rồi lưu; “Hủy” rollback snapshot. Lỗi cụ thể chỉ ra fixture/plot và hướng sửa.
- Textures hiện có thể không phù hợp 4 hướng; bổ sung hướng vẽ hoặc transform có pixel-perfect, tránh ảnh hưởng Y-sort/footprint.

## Phân giai đoạn

1. **A — Audit map và domain core:** chốt vùng đất khả dụng, invariant geometry, validator và command local.
2. **B — Editor MVP trên vùng ban đầu:** chọn/kéo/xoay/cất/khôi phục, preview, undo toàn phiên và xác nhận/hủy; chưa bán plot.
3. **C — Save/migration + land expansion:** schema migration, data-driven plot, mua plot idempotent, map/tường/navmesh mở rộng.
4. **D — Multiplayer + tích hợp gameplay:** authoritative commands, conflict/rollback, worker/customer routing sau đổi layout.
5. **E — UX acceptance:** browser desktop/mobile landscape, lưu/tải, lỗi path, co-op hai session; balance plot theo telemetry/playtest.

## Rủi ro và xử lý

- **Map không còn ô phù hợp:** không khai báo plot có thể mua trước khi map audit và geometry tile/wall/road được xác định.
- **Rotation không nhất quán:** một hàm footprint/transform chuẩn trong shared/core, renderer consumes same geometry; test bội số 90.
- **Khách/worker bị kẹt sau sửa:** validate toàn cục trước commit; tái tính route sau commit; worker claims bị revalidate/release atomically.
- **Save lỗi hoặc client cũ:** migration có backup, validator từ chối dữ liệu hỏng mà không ghi default đè; protocol compatibility rõ ràng.
- **Co-op race/duplicate purchase:** repository transaction/revision/idempotency; test hai actor cùng mua hoặc di chuyển cùng fixture.
- **Mobile thao tác khó:** tap destination và nút rotate là đường dùng đầy đủ bên cạnh drag; kiểm tra kích thước hit area trên browser/device.

## Câu hỏi còn lại

- Cần map audit để chốt vùng/giá/level/diện tích plot; không chặn MVP di chuyển fixture trên vùng hiện tại.
- Cần quyết định quầy/kệ nào fixed, có cho cất quầy gốc không, và có cần một quầy luôn tồn tại.
- Khuyến nghị MVP không bán fixture và không thêm hiệu ứng kinh doanh vị trí cho tới khi layout cơ bản được nghiệm thu.
