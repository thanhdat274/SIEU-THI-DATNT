# Proposal: Công trình công cộng + chỉ số sống (QoL)

Change con 1/5 của `neighborhood-builder-expansion`.

## Why
Xóm phố chưa có gì ngoài tiệm của người chơi. Cần thứ để người chơi đầu tư "cho xóm" và thấy xóm tốt lên — nền cho dân số và mục tiêu thành phố ở các change sau.

## What Changes
- Thêm 4 loại tòa công cộng vào `BUILDING_TYPE_DEFS` (`category: 'civic'`): `park` (công viên), `clinic` (trạm y tế), `ward_police` (đồn công an phường), `primary_school` (trường tiểu học). Không bán hàng, không nhân viên, không nội thất do người chơi đặt.
- Người chơi **góp vốn xây** qua `open_building` hiện có trên lô đã sở hữu/thuê; có cấp mở khóa, giá xây, phí duy trì/ngày (phí trừ ở `civic-local-fees`; change này chỉ khai báo số).
- Chỉ số sống **theo khu** `civicQol(districtId) ∈ [0,100]`, dẫn xuất mỗi ngày từ công trình trong bán kính của lô thuộc khu; có trần, giảm dần theo khoảng cách, loại trùng chỉ cộng một phần.
- `ward_police` giảm xác suất trộm/đột nhập ở tòa trong bán kính (nối `security.ts`), có trần.
- UI: thẻ thông tin công trình + chỉ số sống khu trong một tab "Xóm phố" (mobile-first).

## Không làm
Dân số, ảnh hưởng doanh thu (change 2), trừ phí (change 3), mục tiêu (change 4), cư dân hình (change 5). Không thêm trường save — QoL dẫn xuất.

## Impact
`game-data/src/world/building-types.ts`, `game-data/src/world/civic.ts` (mới), `game-core/src/civic-qol.ts` (mới), `security.ts`, renderer mặt tiền, `apps/web` tab Xóm phố, test-runner.
