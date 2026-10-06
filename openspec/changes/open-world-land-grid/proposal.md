# Proposal: Nền móng thế giới mở — lưới lô đất và tòa đặt theo lô

## Vì sao

Chủ dự án chốt hướng dài hạn ngày 05/10/2026: game đi từ tiệm nhỏ → nhiều cửa hàng → khu phố → thành phố. Người chơi được tự chọn hướng mở rộng cửa hàng (mỗi cấp mở thêm một số ô), dời tòa sang mảnh đất khác và khai hoang thêm vùng, trong khi NPC/giao thông xung quanh vẫn sống động như một thành phố thật.

Hiện trạng không cho phép điều đó vì hình học đang **gõ cứng**:

- Bản đồ chơi cố định 36×22 ô (`game-data/src/map.ts`: `MAP_WIDTH`, `MAP_HEIGHT`, `MAP_ORIGIN_Y`).
- Bốn tòa có biên, cửa, ô vào cửa, mái hiên, bố cục mặc định viết bằng tọa độ tuyệt đối (`game-data/src/buildings.ts`: `MAIN_STORE_BOUNDS`, `XOI_BOUNDS`, `DRINK_BOUNDS`, `SNACK_BOUNDS`, `AWNING_SPANS`, `ROOF_EAVES`, `*_DEFAULT_FIXTURES`).
- `generateStarterTileMap` dựng từng tòa bằng một vòng lặp riêng, cửa tiệm chính gõ cứng `x !== 9 && x !== 10`, cánh đông gõ cứng `17`/`21`.
- Mảnh đất (`land.ts`) là danh sách kịch bản: mỗi mảnh gắn cứng vào một tòa và một hướng (bắc hoặc đông).
- Logic khách, nhân viên, giao thông, renderer dùng trực tiếp các hằng trên (khảo sát ở `design.md`).

Mọi tính năng sau (mở rộng tự chọn hướng, dời tòa, khai hoang, co-op chung thành phố) đều cần một mô hình dữ liệu **thế giới → đất → tòa → nội thất** trước. Change này chỉ xây nền móng đó.

## Mục tiêu

- Có mô hình dữ liệu bốn lớp: **World Grid** (biên thế giới 120×80 ô và vùng đang chơi được), **Land Parcel** (lô đất, trạng thái sở hữu), **Building Placement** (tòa nào đặt ở lô nào, gốc tọa độ, footprint), **Interior** (nội thất, giữ nguyên `storeLayout.fixtures`).
- Bốn tòa hiện có (`main`, `xoi`, `snack`, `drink`) trở thành dữ liệu "tòa X đặt tại lô Y, gốc (ox, oy)"; biên, cửa, ô vào cửa, mái hiên và bố cục mặc định được **suy ra** từ mẫu tòa (tọa độ tương đối) cộng vị trí đặt.
- `generateStarterTileMap` dựng mọi tòa bằng một đường đi chung theo vị trí đặt.
- Code gameplay/renderer đọc hình học từ mô hình mới thay vì hằng tuyệt đối, ở mọi chỗ gắn với tòa nhà hoặc phạm vi bản đồ.
- Save cũ nạp được và được chuẩn hóa sang mô hình mới (vị trí đặt mặc định), chạy được ở chơi một mình lẫn co-op.
- **Không đổi gameplay**: với cùng save và cùng chuỗi lệnh, bản đồ ô, va chạm, đường đi của khách và kết quả mô phỏng giống hệt trước khi refactor.

## Ngoài phạm vi (các bước sau, chỉ ghi định hướng trong `design.md`)

- Ngân sách ô mở rộng theo cấp và tự chọn hướng; footprint không chữ nhật (L/T/U).
- Chế độ quy hoạch (preview), tái quy hoạch/dời tòa có phí.
- Khai hoang mở thêm vùng chơi; tăng kích thước bản đồ chơi thực tế lên quá 36×22.
- Giá đất theo mặt tiền/ngã tư, thuê đất, giá đất động.
- Sở hữu đất theo từng người chơi, đất chung, hợp đồng giữa hai người.
- Tự sinh cây/đèn/NPC theo số lô đã mở; loại tòa mới.
- Đổi hình ảnh, cân bằng kinh tế.

## Quyết định đã chốt (05/10/2026)

- **Co-op chung một thành phố.** Chơi một mình và chơi chung dùng cùng mô hình; server quyết định sở hữu và hợp lệ, client chỉ preview.
- **Biên thế giới tối đa 120×80 ô.**
- **Đường cố định theo từng đợt khai hoang.** Người chơi không tự vẽ đường; đường là dữ liệu của đợt khai hoang.

## Cách tiếp cận

Refactor có lưới an toàn: trước khi đổi code, ghi lại "ảnh chụp vàng" (golden) đầu ra hiện tại — bản đồ ô/va chạm cho mọi tổ hợp đất hợp lệ, `buildingAt`/`fixtureBuilding` trên toàn bản đồ, và kết quả mô phỏng nhiều ngày có hạt giống cố định. Sau đó thêm mô hình dữ liệu mới, chuyển từng nhóm người dùng hằng sang đọc vị trí đặt, và sau mỗi nhóm chạy lại golden. Giữ hệ tọa độ thế giới hiện tại (ô (0,−6) là góc trên-trái bản đồ chơi) để tọa độ nội thất trong save không phải dịch.

## Tiêu chí hoàn tất

- Golden test bản đồ ô, va chạm, `buildingAt`, đường đi khách và mô phỏng nhiều ngày khớp 100% trước/sau refactor.
- Không còn tọa độ tòa nhà tuyệt đối ngoài file dữ liệu mẫu tòa và vị trí đặt mặc định (kiểm bằng grep có danh sách ngoại lệ ghi trong `design.md`).
- Save cũ (schema 1–4, có/không có tòa phụ, có/không có cánh đông) nạp được, ra cùng bản đồ và cùng hành vi; local và co-op cho cùng kết quả.
- `yarn typecheck`, `yarn test`, `yarn build` PASS bằng kết quả thực tế; QA trình duyệt so ảnh chụp trước/sau ghi riêng, không suy ra từ unit test.
- `tổng hợp.md`, `TASKS.md`, `ROADMAP.md` được cập nhật đúng hiện trạng.
