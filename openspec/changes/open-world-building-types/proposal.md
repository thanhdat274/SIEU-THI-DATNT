# Proposal: Loại tòa theo dữ liệu, nhiều tòa cùng loại, chi nhánh trên cùng thành phố (Bước 6a thế giới mở)

## Vì sao

Sau Bước 4 người chơi có thêm đất ở các đợt khai hoang, nhưng chỉ có 4 tòa cố định để đặt. Chủ dự án muốn "kinh doanh nhiều thứ hơn" và (đồng ý 05/10/2026) **chi nhánh = tòa ở đợt khai hoang xa trên cùng thành phố**, thay cho `branch-chain` bản đồ riêng.

Rào cản trong code (đọc 05/10/2026): `BuildingId = 'main' | 'xoi' | 'drink' | 'snack'` là kiểu cố định; mỗi tòa một id, một mảnh `building-*`, một bộ `*_DEFAULT_FIXTURES`; nhiều chỗ `if (id === 'xoi')`. Không thể có hai quán nước hay một tiệm tạp hóa thứ hai. `STORE_TYPES` (`game-data/src/store-types.ts`) đã có dữ liệu loại hình nhưng cho mô hình chạy nền cũ.

## Mục tiêu

- **Loại tòa** (`BuildingTypeDef`) là dữ liệu: mẫu hình học, bố cục mặc định, trạm/nội thất được phép, danh mục món, nhịp khách, cấp/giá mở, số tòa tối đa.
- **Tòa cụ thể** (`BuildingInstance { instanceId, typeId }`) thay `BuildingId`; nhiều tòa cùng loại được (chi nhánh). Bốn tòa hiện có thành 4 instance với id giữ nguyên (`main`, `xoi`, `drink`, `snack`) để save cũ không đổi.
- Bốn loại tòa mới đầu tiên (nội dung provisional): **chi nhánh tạp hóa** (bản nhỏ của tiệm chính, không có kho riêng), **quán cà phê** (trạm pha, bàn ngồi, khách buổi sáng), **bãi giữ xe** (không bán hàng; thu phí giữ xe, tăng khách đi xe cho các tòa lân cận), **quán cơm/nhà hàng** (dùng lại hệ bếp + bàn ăn có sẵn).
- **Hạng cửa hàng theo diện tích**: tiệm mở rộng tới ngưỡng ô thì lên hạng Tiệm tạp hóa → Cửa hàng tiện lợi → Siêu thị mini (100) → Siêu thị (160, phải lấn sang lô kề vì lô tiệm chính tối đa 126 ô) → Đại siêu thị (240, siêu rộng); hạng cao đổi biển hiệu, đông khách hơn, mở nội thất mới (quầy thu ngân thêm, tủ đông lớn, khu gia dụng).
- Phần dùng lại từ `branch-chain`: sổ cái gắn nhãn tòa (doanh thu/chi phí theo tòa), báo cáo theo tòa, chương 7 cốt truyện đếm số chi nhánh thật.
- Kho dùng chung; tòa ở đợt xa nhận hàng qua **chuyến giao nội bộ** có thời gian (nhân viên/xe ba gác), không bày tức thì.

## Ngoài phạm vi

- Loại tòa nhiều tầng, trung tâm thương mại cho thuê gian, khu vui chơi, dịch vụ (sửa chữa, giao hàng) (change sau, dùng cùng registry).
- Bán/phá tòa; nhượng quyền.
- Cân bằng cuối (số tạm, có mô phỏng so sánh).

## Phụ thuộc

`open-world-land-reclamation` xong (cần lô ở đợt mới). `branch-chain` được viết lại theo change này: phần còn giá trị chuyển vào đây, phần bản đồ riêng bỏ.

## Tiêu chí hoàn tất

- Save cũ nạp đúng 4 tòa, golden các bước trước PASS.
- Mở được 2 quán nước (một ở W0, một ở W1) cùng lúc; khách, quầy, nhân viên, sổ cái tách đúng theo tòa.
- Tiệm chính mở rộng tới 100 ô sàn thì biển đổi thành "Siêu thị mini"; lấn sang lô kề tới 160 ô thì thành "Siêu thị"; nhịp khách tăng đúng hệ số, mở đúng nội thất theo hạng.
- Bốn loại mới chạy được trong game; bãi giữ xe tăng khách đi xe ở tòa trong bán kính (mô phỏng chứng minh).
- `yarn typecheck`, `yarn test`, `yarn build` PASS bằng kết quả thực; Browser QA ghi riêng.
