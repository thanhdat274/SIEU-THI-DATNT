# Proposal

## Why

Kệ và tủ mát không bao giờ xuống cấp: một khi mua xong là dùng mãi, nên tiền nhàn rỗi không có chỗ chi và không có tình huống bất ngờ cần xử lý. Game tham khảo `tap-hoa-dau-hem` có hệ thống hao mòn và sửa chữa (`src/core/maintenance.ts`: đồ mòn dần mỗi đêm, hỏng nhẹ trả phí sửa, hỏng nặng phải mua mới, đồ hỏng không dùng được). Đây là hạng mục thứ 6 trong thứ tự đề xuất của `tổng hợp.md` và là hạng mục "cheapest, richest" tôi đề xuất vì tận dụng được sổ cái, bản tin và giao diện sẵn có.

## What Changes

- Kệ gỗ, kệ kính và tủ mát có độ mòn 0..100 và trạng thái hỏng (nhẹ hoặc nặng) lưu ngay trên `StoreFixture` (`wear`, `broken`), nên đi theo bố cục khi lưu/tải và không đổi schema save; thiếu trường nghĩa là chưa mòn.
- Qua mỗi đêm từ cấp 3, mỗi đồ mòn thêm 1 đến 4; từ mức mòn 55 mới có thể hỏng với xác suất (mòn − 55) × 0,006 mỗi đêm; hỏng nặng nếu mòn ≥ 88 hoặc với xác suất 25%. Xác định theo (ngày, mã nội thất) nên các máy chơi chung cho cùng kết quả.
- Hành động: bảo trì khi mòn từ 70% ngưỡng hỏng (về mức mòn 20), sửa đồ hỏng nhẹ, mua mới đồ hỏng (mòn về 0; giữ chỗ đặt, loại hàng và hàng đang bày). Phí sửa/bảo trì bằng 25% giá mua mới (tối thiểu 20.000 đ); mua mới theo giá mẫu cùng loại gần sức chứa nhất.
- Kệ hỏng: khách không chọn, không châm hàng được (tay người chơi, auto-restock, bố trí hàng, nhân viên), không tính vào khả năng có hàng của khách. Vẫn lấy hàng ra khỏi kệ hỏng được.
- Chi phí vào sổ cái loại `maintenance`, `DailyRecord.maintenanceCost`, trừ vào lãi ròng và hiển thị ở tổng kết ngày.
- Giao diện: `MaintenanceModal` (danh sách, thanh mòn, nút), nút "Sửa chữa (n)" trên HUD chỉ hiện khi có đồ mòn/hỏng, toast khi có đồ hỏng qua đêm, kệ hỏng bị tối màu kèm nhãn HỎNG/NẶNG.
- Lệnh `maintain_fixture` (service, repair, replace) được thêm vào giao thức và danh sách lệnh được phép của server.

## Capabilities

### New Capabilities

- `fixture-wear`: hao mòn qua đêm, hỏng nhẹ/nặng, ảnh hưởng của kệ hỏng.
- `fixture-maintenance`: bảo trì, sửa, mua mới, chi phí và ghi sổ.

### Modified Capabilities

- Không có spec chính sửa.

## Non-goals

- Bóng đèn, quạt, các đồ phụ như trong game tham khảo.
- Tủ mát hỏng làm hàng lạnh hỏng nhanh hơn (hiện chỉ không dùng được).
- Thợ sửa đến sau một khoảng thời gian, tự bảo trì bằng nhân viên.
- Server phát lại lệnh sửa chữa (như `restock`, lệnh này chỉ được kiểm bất biến save, chưa phát lại).
- Thuế: chi phí bảo trì chưa đưa vào mô-đun thuế (`tax/`), chỉ là chi phí vận hành trong sổ cái.
- Cân bằng kinh tế bằng chơi thử.

## Impact

`packages/shared/src/index.ts` (trường, kiểu lệnh, loại sổ cái, kết quả `fixture_broken`), `packages/game-data/src/maintenance.ts`, `packages/game-core/src/maintenance.ts`, `simulation.ts`, `customers.ts`, `day-rhythm.ts`, `apps/server/src/bootstrap.ts`, `apps/web` (`MaintenanceModal.tsx`, `HUD.tsx`, `App.tsx`, `DaySummaryModal.tsx`), `packages/game-renderer/src/viewport.ts`, test `maintenance.test.ts`, `tổng hợp.md`.
