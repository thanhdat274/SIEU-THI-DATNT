# Spec Delta

## Purpose
Chuỗi chế biến sâu: biến nông sản vườn (fresh, hỏng nhanh) thành hàng đặc sản khô (giữ lâu, giá cao) qua bếp — mắt xích thứ ba của chuỗi vườn sau "bán tươi" và "nấu món".

## ADDED Requirements

### Requirement: Hàng đặc sản chế biến tại gia là món nấu thật trên trạm có sẵn
5 hàng `cb_*` phải là công thức RECIPES chuẩn ở trạm `food_grill` (sấy lửa nhỏ), xuất hiện trong Sổ nấu, nấu qua startCook, giao qua đơn như món nhà làm khác — không thêm trạm/UI mới.

#### Scenario: Nấu chuối sấy từ chuối vườn
- **WHEN** người chơi cấp đủ mở, có kho x_chuoi và trạm food_grill, startCook công thức chuối sấy
- **THEN** kho trừ đúng nguyên liệu (kể cả garden.homegrown), cookJobs chạy đúng duration, output là hàng `cb_chuoi_say` category `dry` vào kho bán được như hàng thường.

### Requirement: Mẻ chế biến hời hơn bán tươi thẳng (luật monKhuon)
Mỗi công thức: outputQty × sell > Σ input × sell nguyên liệu (test monKhuon bắt).

#### Scenario: Chuối sấy từ 2 chuối
- **WHEN** mẻ 2 x_chuoi (mua 20k) → 5 gói chuối sấy (bán 14k/gói = 70k)
- **THEN** 70k > bán tươi thẳng 28k — chế biến luôn là lựa chọn hời hơn khi dư nông sản.

### Requirement: Tên/mô tả đúng đời thật
Tên hàng + cách chế biến phải là đặc sản có thật (chuối sấy dẻo Nam Định, xoài sấy Cao Lãnh, vải sấy Bắc Giang, mít sấy, khoai lang sấy) — test monThat bắt đúng trạm/tên/mô tả.

#### Scenario: Xoài sấy dẻo
- **WHEN** kiểm tra product `cb_xoai_say`
- **THEN** tên "Xoài sấy dẻo", cách chế biến nêu sấy thấp lửa giữ màu vàng ruộm (Cao Lãnh, Đồng Tháp).

### Requirement: Hàng khô không hỏng như fresh
`cb_*` category `dry` — theo hệ độ bền hiện có (PRODUCT_LIFE của dry dài, không vào vòng hỏng nhanh của fresh/cold), người chơi trữ nông sản qua chuỗi bán không lo sập giá hỏng hàng.

#### Scenario: Trữ qua chuỗi dài
- **WHEN** nhập kho chuối sấy ngày thứ N, bán ngày N+5
- **THEN** hàng còn bán được như thường (không trừ hỏng như rau/thịt tươi).

### Requirement: Nhãn homegrown chảy qua chuỗi chế biến
Nấu dùng nông sản nhà trồng → `garden.homegrown` tự trừ theo cơ chế startCook hiện có; đặc sản bán ra vẫn nằm trong vòng premium HOMEGROWN như món nấu khác (không cần code mới, chỉ ghi nhận hành vi).

#### Scenario: Chuối nhà trồng thành chuối sấy
- **WHEN** startCook chuối sấy khi kho x_chuoi đến từ thu vườn
- **THEN** nhãn homegrown trừ đúng lượng nguyên liệu tiêu thụ.
