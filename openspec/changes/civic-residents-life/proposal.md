# Proposal: Cư dân sống động và nhà dân lên tầng

Change con 5/5 của `neighborhood-builder-expansion`. Cần `civic-population-demand`.

## Why
Người chơi cần **thấy** xóm đông lên. Theo hướng đã chốt, NPC/xe/tầng nhà tự tăng — thế giới tự lo, người chơi không vẽ.

## What Changes
- Mở rộng `NeighborhoodLife` (`game-core/neighborhood-life.ts`): số NPC nền theo dân số khu (có trần theo thiết bị), lịch sinh hoạt đơn giản (sáng đi chợ/đi làm, chiều ra công viên, tối về nhà), đi tới công trình gần nhất bằng `findPathToAny` (`pathfinding.ts`).
- Nhà dân trên lô nhà dân tự lên tầng theo bậc dân số khu (vd 3 bậc).
- **Chỉ hình**: không đổi kinh tế, không lưu từng cư dân; sinh lại tất định từ seed + ngày + dân số.

## Không làm
Không đổi luồng khách mua hàng (`customers.ts`). Không traffic sim mới.
