# Giai đoạn 4 — Bảng phong cách asset và tòa mẫu tạp hóa

Ngày lập: 21/10/2026. Nhánh `thay-doi-game-sang-3d`.
**Tiến độ:** 4.0 ✅ (`7316850`), 4.1 ✅ (`6d1875f`), 4.2 ✅ (`5d9f85d`), 4.3 ✅ (số mục vẽ tạp hóa 6 → 28 mesh, ngân sách 60), 4.4 ✅ (vỏ trong 14 mesh, dựng lười). Các bước còn lại chưa làm.
Tiền đề (đã chốt): bỏ hẳn 2D, chỉ còn 3D Babylon; asset theo **A (tự dựng bằng code, đồng bộ) + chút B (Kenney bổ trợ)**; tầm nhìn Cafeland + chút quy hoạch CS2; "vào trong" là một cảnh riêng; mỗi loại cửa hàng làm sâu xong hẳn rồi mới sang loại khác; **làm từng bước nhỏ, xong là khóa**.

## 1. Mục tiêu và ranh giới

**Làm:**
1. Một **bảng phong cách** (màu, vật liệu, tỉ lệ, mật độ chi tiết) viết thành code + tài liệu để mọi asset sau này đồng bộ.
2. **Tòa mẫu: Tiệm Tạp Hóa (`grocery_main`)** làm sâu cả ngoài lẫn trong, dùng làm khuôn cho các loại tòa sau.
3. **"Vào trong"** thành chế độ cảnh riêng (chuyển cảnh, cô lập tòa, camera trong nhà).

**Không làm (để giai đoạn sau):** các loại cửa hàng khác, bảng chi tiết hoạt động đầy đủ (biểu đồ theo giờ, danh sách nhân viên...), tối ưu điện thoại, đổi luật chơi / save / `game-core`.

## 2. Hiện trạng (đọc từ code, chưa đo hiệu năng)

| Mảng | Hiện có | Khoảng trống |
|---|---|---|
| Vỏ tòa | `map-builder.ts` dựng hộp: tường (thin instances), mái phẳng, mặt tiền mỏng, mái hiên sọc, biển, cửa sổ đêm. Màu lấy từ `BUILDING_VISUALS` (game-data). Công trình civic dùng model Kenney | Mọi tòa "shop" nhìn giống nhau chỉ khác màu; không có khung cửa, cửa kính, trụ, phào, chi tiết mái |
| Nội thất | `Fixtures3D` (kệ, tủ, quầy; kệ dựng bằng khối code, tủ lạnh + quầy dùng model Kenney, đã sửa đặt đúng ở `847599f`), hàng trên kệ (`shelf-stock`) | Sàn/tường trong nhà trơn, không có trần, đèn, áp phích; tủ lạnh/quầy Kenney khác phong cách kệ code |
| "Vào trong" | `enterBuilding()`: camera trượt tới cửa + bóc mái trong **cùng bản đồ** | Chưa có cảnh riêng: tòa khác, xe, đường vẫn hiện; chưa có chuyển cảnh |
| Phong cách | `scale-spec.ts` (mốc D = 1,6, kích thước người/xe/nội thất) | **Chưa có bảng màu/vật liệu**: hex rải rác ở `BUILDING_VISUALS`, `fixture-shapes`, `box-car`, `GROUND_COLORS`... `docs/ART-BIBLE.md` là của thời pixel 2D |
| Rủi ro cùng họ | Mẫu `mesh.clone(); parent = null; thin instance` còn ở `map-builder` (tòa civic, cây, bụi, đèn), `world-decor-3d` (rào, cọc, thùng rác). Lỗi cũ ở tủ lạnh đến từ chính mẫu này | Chưa kiểm xem model nào có nút trung gian/mesh con bị mất vị trí |

## 3. Các quyết định cần bạn chốt (kèm đề xuất)

| # | Quyết định | Phương án | Đề xuất |
|---|---|---|---|
| D1 | **Hướng phong cách** | (a) Toy-town pastel kiểu Cafeland: màu ấm bão hòa vừa, khối bo nhẹ, bóng mềm, không viền. (b) Voxel đậm nét (gần Kenney hiện tại). (c) Phẳng sạch kiểu stylized, có viền đen mỏng | **(a)** |
| D2 | **"Cảnh riêng" làm thế nào** | (a) Một `Scene` Babylon thứ hai cho nội thất. (b) Chế độ cô lập trong **cùng cảnh**: ẩn mọi thứ ngoài tòa, đổi camera/ánh sáng, mờ chuyển cảnh | **(b)**: nhìn như cảnh riêng nhưng không phải nhân đôi toàn bộ khách/nhân viên/nội thất sang cảnh thứ hai (tránh lệch dữ liệu và gấp đôi bộ nhớ) |
| D3 | **Tòa mẫu** | Tạp hóa chính trước, hay quán xôi/quán nước | **Tạp hóa chính**: có đủ nội thất, dữ liệu, hàng hóa, khách |
| D4 | **Tủ lạnh/quầy của tạp hóa** | (a) Dựng lại bằng bộ khối code cho đồng bộ kệ. (b) Giữ Kenney, chỉnh màu | **(a)** cho tạp hóa; Kenney giữ cho civic, cây, xe, đèn đường |

## 4. Kiến trúc đề xuất (để mỗi bước không động vào bước trước)

1. **`style-spec.ts`** (mới, gói `game-renderer-3d`): token màu (trung tính, gỗ, kim loại, kính, sàn, nhấn theo loại tòa), quy tắc vật liệu (không specular, kính alpha cố định, phát sáng ban đêm), ngân sách chi tiết. Gắn cạnh `scale-spec.ts`. Code mới chỉ dùng token, không gõ hex.
2. **Bộ dựng chi tiết (`kit/`)**: hàm nhỏ có kích thước tính từ `scale-spec` (khung cửa, cửa kính, cửa sổ có chấn song, trụ góc, phào chân tường, mái hiên có viền, biển có đèn, điều hòa, bồn nước...). Mỗi hàm trả về danh sách khối kèm hộp bao để test.
3. **Registry dựng tòa (`building-registry.ts`)**: `typeId → { buildExterior, buildInterior }`. `map-builder` chỉ thêm **một điểm móc**: có builder cho loại tòa thì dùng, không có thì chạy đường cũ. Sau này thêm loại mới là thêm file, không sửa `map-builder`.
4. **Studio xem trước** (dev): tái dùng bộ chụp ngoài màn hình của `fixture-preview-3d` để chụp từng mảnh/cả tòa ở góc cố định, dùng cho QA bằng mắt và ảnh tham chiếu.
5. **`interior-mode.ts`** (thuần, có test): máy trạng thái `idle → entering → inside → exiting`, quyết định lớp nào hiện/ẩn và độ mờ; `babylon-viewport` chỉ áp kết quả.

## 5. Các bước (mỗi bước nhỏ, có tiêu chí xong, rồi **khóa**)

| Bước | Việc | Chạm | Xong khi | Cỡ |
|---|---|---|---|---|
| **4.0** Rà họ lỗi clone | Kiểm các model dùng mẫu `clone + parent = null` (civic, cây, bụi, đèn, rào, cọc, thùng rác) bằng số đo hộp bao thật như đã làm với tủ lạnh; sửa model nào lệch (commit riêng, có test) | `map-builder`, `world-decor-3d` (chỉ chỗ clone) | Báo cáo bảng "đúng/lệch" + test; model lệch được sửa | S |
| **4.1** Bảng phong cách | Chốt D1; viết `style-spec.ts` + `docs/art-bible/3D-STYLE.md` (thay phần 2D của `ART-BIBLE.md`); chuyển hex của **tạp hóa** sang token | `style-spec.ts` (mới), `building-visuals.ts` (chỉ `grocery_main`), doc | Test: token đủ, độ tương phản chữ biển đạt; ảnh bảng màu mẫu | S |
| **4.2** Studio + kit khung | Studio chụp mảnh/tòa; bộ `kit/` đầu tiên (khung cửa, cửa kính, cửa sổ, phào, trụ) + test hộp bao | `kit/*` (mới), mở rộng `fixture-preview-3d` | Ảnh chụp từng mảnh trông đúng phong cách; test bao khít kích thước | M |
| **4.3** Registry + vỏ ngoài tạp hóa | Điểm móc trong `map-builder`; `grocery-exterior`: bệ, tường hai tông, cửa sổ + cửa kính có tay nắm, mái hiên viền, biển có đèn, mái (lan can, điều hòa, bồn nước), đồ trưng trước tiệm (thùng hàng, biển A) | `building-registry.ts`, `grocery-exterior.ts`, 1 điểm móc `map-builder` | Cửa khớp `doorTiles`, biển nằm trong mặt tiền, bóc mái/mờ mặt tiền (`roof-fade`) vẫn chạy, cửa sổ sáng ban đêm vẫn chạy; ảnh ngày/đêm | L |
| **4.4** Vỏ trong tạp hóa | `grocery-interior`: sàn lát, tường + phào, đèn trần, thảm cửa, áp phích/biển giá | `grocery-interior.ts` | Không đè nội thất; chỉ dựng khi bóc mái/gần camera (giữ E3); đo số mesh | M |
| **4.5** Nội thất tạp hóa đồng bộ | Dựng lại tủ lạnh, quầy thu ngân (+ máy tính tiền, giỏ), đầu dãy kệ bằng `kit/`; kệ giữ nguyên khối hiện tại | `kit/furniture-*`, `fixtures-3d` (chỉ nhánh tạp hóa) | Test hộp bao nằm trong chân diện ở 4 hướng xoay (khuôn đã có); ảnh xem trước nội thất khớp | M |
| **4.6** "Vào trong" kiểu cảnh riêng | `interior-mode.ts` + áp vào `babylon-viewport`: mờ chuyển cảnh, ẩn thế giới ngoài tòa, camera/ánh sáng trong nhà, đi lại bình thường, Esc hoặc bước ra cửa thì thoát | `interior-mode.ts`, `babylon-viewport` (enter/exit), `BuildingPanel` (nút) | Test máy trạng thái; trên trình duyệt: vào/ra không rò rỉ trạng thái, mô phỏng vẫn chạy, khách/nhân viên trong tòa vẫn thấy | M |
| **4.7** Khóa và QA | Bộ ảnh tham chiếu (ngày, đêm, mưa; ngoài, trong; 1280×720 và 1920×1080); đo FPS và số draw call; cập nhật `3d-migration-plan.md` | docs, ảnh | Không hồi quy (typecheck, test, build, xem trình duyệt); ghi mốc "tạp hóa v1 đã khóa" | S |

Quy tắc xuyên suốt: mỗi bước một commit (hoặc hai nếu có sửa lỗi riêng), commit chỉ khi typecheck + test + build + xem trình duyệt đều qua; bước sau chỉ **gọi** phần đã khóa, nếu phải sửa thì sửa tối thiểu và ghi rõ.

## 6. Tòa tạp hóa v1: danh sách chi tiết (để "thật chi tiết" mà không phình)

**Ngoài (8 mảnh):** bệ chân tường; tường hai tông + phào; cửa sổ có khung và bậu; cửa kính có tay nắm và biển MỞ/ĐÓNG; mái hiên sọc có viền; biển hiệu có đèn rọi; chi tiết mái (lan can, điều hòa, bồn nước); đồ trưng trước tiệm (thùng hàng, biển A, chậu cây).
**Trong (6 mảnh):** sàn lát; tường + phào chân; đèn trần; thảm cửa; áp phích/biển giá; cửa sau thông kho. Cùng tủ lạnh, quầy thu ngân (máy tính tiền, giỏ), đầu dãy kệ ở 4.5.
Ngân sách: tạp hóa ≤ khoảng 60 mục vẽ (dùng thin instances/gộp mesh); nếu vượt thì gộp trước khi thêm chi tiết.

## 7. Kiểm thử và QA

- **Test thuần:** hộp bao mọi mảnh nằm trong chân diện/mặt tiền; cửa khớp `doorTiles`; token màu đủ và tương phản; máy trạng thái "vào trong".
- **Trình duyệt (desktop trước):** chụp ngày/đêm/mưa, ngoài/trong, ba mức zoom, bốn hướng xoay camera; kiểm bóc mái và mặt tiền mờ; vào/ra nhiều lần.
- **Đo:** FPS và draw call trước/sau mỗi bước lớn (4.3, 4.4, 4.6).

## 8. Rủi ro

| Rủi ro | Cách giảm |
|---|---|
| Thêm chi tiết làm nặng cảnh | Thin instances/gộp mesh, chỉ dựng trong khi bóc mái/gần camera, đo từng bước |
| Chi tiết mới phá bóc mái, chọn tòa (picking), đèn đêm | Mọi mesh mới gắn `metadata.buildingId`, đăng ký vào `RoofInfo`/danh sách đêm; có test và chụp lại |
| Cảnh "cô lập" ẩn nhầm hoặc quên bật lại | Máy trạng thái thuần có test; thoát luôn trả đúng trạng thái trước đó |
| Lệch phong cách giữa mảnh dựng code và Kenney | Mọi màu qua token; Kenney chỉ cho loại đồ đã chốt ở D4; studio chụp cạnh nhau |
| Phạm vi phình | Chỉ danh sách mục 6; mảnh mới phải thêm vào danh sách và được bạn duyệt |

## 9. Sau giai đoạn 4

Giai đoạn 5 (đề xuất): bảng chi tiết hoạt động từng tòa (dữ liệu theo giờ, nhân viên, tồn kho) + loại cửa hàng thứ hai dùng đúng khuôn tạp hóa (quán xôi hoặc quán cà phê, chọn sau).
