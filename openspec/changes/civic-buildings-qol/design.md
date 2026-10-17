# Design: civic-buildings-qol

## D1. Dữ liệu
`game-data/src/world/civic.ts`:
```ts
export type CivicServiceId = 'green' | 'health' | 'safety' | 'education';
export interface CivicDef {
  buildingTypeId: BuildingTypeId;   // 'park' | 'clinic' | 'ward_police' | 'primary_school'
  service: CivicServiceId;
  qolPoints: number;                // điểm tối đa khi ở tâm
  radiusTiles: number;              // tái dùng đơn vị ô như PROXIMITY_RADIUS
  minCityLevel: number;
  buildCost: number;
  upkeepPerDay: number;             // dùng ở civic-local-fees
}
```
Số khởi điểm (chỉnh sau sweep): park 8đ/r12, clinic 12đ/r16, ward_police 8đ/r16, primary_school 10đ/r16. Footprint lấy từ `BuildingTypeDef`, phải vừa lô thật (kiểm tra bằng test placement, không ghi cứng 7×6 như plan cũ).

## D2. Công thức
Với mỗi khu, lấy tâm = trọng tâm các lô của khu. Với mỗi công trình c:
`contrib(c) = qolPoints × max(0, 1 − dist/radius)`.
Theo từng `service`: cộng các contrib, công trình thứ 2 cùng service ×0.5, thứ 3+ ×0 (chống spam). Điểm service bị trần ở `qolPoints` lớn nhất của service đó.
`civicQol = clamp(BASE_QOL(20) + Σ service, 0, 100)`.
Hàm thuần `computeCivicQol(placements, parcels, day)`; không phụ thuộc thời gian thực.

## D3. An ninh
`ward_police` trong bán kính của tòa → `shopliftDetectChance` + `CIVIC_POLICE_DETECT_BONUS` (0.05, trần chung giữ nguyên) và `planBurglary` giảm xác suất 25%. Dùng tham số truyền vào, không đọc global.

## D4. Save
Không thêm trường. Công trình là `BuildingInstance` có sẵn. Save cũ: không có công trình → QoL = 20 cho mọi khu, không ảnh hưởng gì (change này chưa nối doanh thu).

## D5. Hiệu năng
Tính 1 lần/ngày + khi đặt/dời tòa; O(khu × công trình), ≤ 1 ms.

## D6. UI
Tab "Xóm phố": danh sách khu + QoL + công trình đóng góp; nút góp vốn xây mở luồng đặt tòa có sẵn. Theo chuẩn mobile (vùng chạm ≥ 44px, không cuộn ngang ở 360px).

## Co-op (bổ sung 16/10/2026)
- `open_building` loại civic: quyền như `buy_plot` (owner ✔, member theo `memberLandPermissions`); giá xây > 30% quỹ → phiếu chi lớn `land-vote.ts`. Thêm loại civic vào bảng quyền + test.
- Lô đang bị người kia giữ chỗ quy hoạch → từ chối (khóa sẵn có qua `land-command-targets.ts`).
- QoL tính ở server đầu ngày và sau mỗi lệnh đặt/dời tòa; gửi trong snapshot. Client không tự tính để hiển thị số khác.
