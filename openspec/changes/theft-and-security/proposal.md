# Proposal

## Why

Tiệm không có rủi ro mất mát nào ngoài hàng hết hạn: khách nào vào cũng trả tiền, cửa tiệm đóng là an toàn, và nhân viên bảo vệ chỉ làm khách đi xe máy hài lòng hơn (+1 sao). Game tham khảo `tap-hoa-dau-hem` có `security.ts` với trộm lẻ ban ngày và trộm đột nhập ban đêm, bảo vệ, camera và hồ sơ công an. Đây là hạng mục còn lại trong danh sách khoảng trống so với game tham khảo mà người dùng chọn làm trước.

## What Changes

- Từ cấp 5, trong số khách thường (không phải khách quen) có 1,5% là kẻ trộm lẻ: tới quầy mà không trả tiền. Phát hiện được thì trả hàng về kệ và nộp phạt gấp đôi tiền hàng; không thì mang hàng đi và tiệm mất theo giá vốn. Xác suất phát hiện kết hợp độc lập: bảo vệ đang trực 90%, camera 80%, nhân viên châm hàng đang trực 30%.
- Mỗi đêm từ cấp 5 có 6% (3% khi có camera) trộm đột nhập: lấy 30 đến 60% doanh thu hôm trước từ két (50%) hoặc 8 đến 20% hàng trên kệ (tối đa 20 món). Có nhân viên bảo vệ trong biên chế thì đuổi được, không mất gì.
- Báo công an (bật mặc định): mở hồ sơ, sau 2 đến 5 ngày có kết quả; bắt được (35%, cộng 25% nếu có camera) thì trả lại tiền, không thì đóng hồ sơ.
- Camera lắp một lần, 250.000 đ.
- Giao diện: nút "An ninh" trên HUD từ cấp 5 mở `SecurityModal` (camera, bảo vệ, bật/tắt báo công an, danh sách sự cố, tổng mất và thu hồi), toast mỗi sự cố.
- Sổ cái và lãi ròng: loại `theft` (mất hàng, không đổi tiền như hao hụt), `theft_cash` (mất tiền két), `recovery` (phạt và công an trả); `DailyRecord.theftCost`/`theftRecovered` trừ/cộng vào lãi ròng. Các test đối chiếu tiền với sổ cái được cập nhật cho ba loại mới.
- Lưu `SaveGameData.security` (camera, báo công an, tối đa 20 sự cố, hồ sơ công an), `CustomerState.thief`; save cũ tải được; lệnh `security_action` (mua camera, bật/tắt báo công an) thêm vào giao thức và danh sách lệnh được phép của server.

## Capabilities

### New Capabilities

- `shoplifting`: kẻ trộm lẻ, phát hiện, phạt và mất hàng.
- `night-burglary`: trộm đột nhập, bảo vệ, công an.
- `security-equipment`: camera, báo công an, sự cố và màn An ninh.

### Modified Capabilities

- Không có spec chính sửa.

## Non-goals

- Người chơi tự bắt kẻ trộm bằng thao tác (game tham khảo có cửa sổ 3 giây); ở đây phát hiện hoàn toàn theo xác suất.
- Bảo vệ ca đêm: bảo vệ trong biên chế đuổi trộm đột nhập bất kể ca (như game tham khảo); ca chỉ ảnh hưởng phát hiện trộm lẻ.
- Dấu hiệu nhìn thấy trên khách trộm, hoạt cảnh bắt trộm, âm thanh.
- Bảo hiểm, khóa cửa nâng cấp, nhiều loại camera.
- Chi phí camera trong mô-đun thuế; camera ghi như chi phí thiết bị cùng loại `maintenance`.
- Server phát lại lệnh `security_action` (như `restock`, chỉ kiểm bất biến save).
- Cân bằng bằng chơi thử.

## Impact

`packages/shared/src/index.ts` (kiểu sự cố/hồ sơ/trạng thái, `CustomerState.thief`, loại sổ cái, `DailyRecord`, lệnh), `packages/game-data/src/security.ts`, `packages/game-core/src/security.ts`, `customers.ts` (`finishShoplifter`), `simulation.ts`, `scenarios.test.ts` và `integration.test.ts` (công thức đối chiếu sổ cái), `apps/server/src/bootstrap.ts`, `apps/web` (`SecurityModal.tsx`, `HUD.tsx`, `App.tsx`), test `security.test.ts`, `tổng hợp.md`.
