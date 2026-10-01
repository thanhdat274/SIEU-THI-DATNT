# Design

## 1. Dữ liệu

Trạng thái nằm trên `StoreFixture`: `wear?: number` (0..100) và `broken?: 'minor' | 'major'`. Lý do: bố cục đã được lưu/tải/đồng bộ cùng `storeLayout.fixtures`, `validateStoreLayout`/`layout_batch` chỉ so hình học nên thêm trường không bị coi là đổi bố cục, và cất/đặt lại nội thất giữ nguyên độ mòn. Thiếu trường = 0 mòn, không hỏng nên save cũ chạy bình thường (không đổi `schemaVersion`).

Số liệu ở `MAINTENANCE_RULES` (`game-data/src/maintenance.ts`): mở khóa cấp 3, mòn 1 đến 4 mỗi đêm, hỏng từ 55 với xác suất 0,006 mỗi điểm vượt, nặng từ 88 hoặc 25%, phí sửa 25% giá (≥ 20.000 đ, làm tròn 1.000), sửa/bảo trì về mức mòn 20, nên bảo trì từ 38,5 (70% của 55).

Giá mua mới: `fixtureReplacementCost` lấy mẫu `FIXTURE_SHOP` cùng loại có sức chứa gần nhất (kệ gỗ 80.000, kệ kính 140.000, tủ mát 90.000 hoặc 220.000).

## 2. Qua đêm

`wearOvernight(fixtures, day, level)` chạy trong lệnh gọi sang ngày mới của `GameSimulation` (sau trả lương và quầy, trước hao hàng), dưới cấp mở khóa không làm gì. Với mỗi kệ/tủ mát chưa hỏng: RNG `Mulberry32Rng(daySeed(day, hash("wear:" + id)))` lấy lượng mòn rồi xét hỏng; đồ đã hỏng không mòn thêm. Trả danh sách vừa hỏng qua callback `onMaintenanceNotice` (toast).

Đo trên 2.000 kệ gỗ không bảo trì (01/10/2026, qua script tạm, không giữ lại): hỏng lần đầu ở đêm thứ 25 (p10), 31 (p50), 40 (p90); 43% hỏng nặng. Không có nghĩa là cân bằng: chưa biết doanh thu một ngày để so với chi phí.

## 3. Hành động

`maintainFixture(fixture, action, money, level)` (hàm thuần, sửa trực tiếp `fixture`, không trừ tiền, trả chi phí):

| Hành động | Điều kiện | Chi phí | Kết quả |
| --- | --- | --- | --- |
| `service` | chưa hỏng, mòn ≥ 38,5 | phí sửa | mòn về min(mòn, 20) |
| `repair` | hỏng nhẹ | phí sửa | hết hỏng, mòn về min(mòn, 20) |
| `replace` | bất kỳ (UI chỉ mời khi hỏng) | giá mua mới | hết hỏng, mòn 0 |

Hỏng nặng không sửa được. `GameSimulation.maintainFixture` trừ tiền, cộng `DailyRecord.maintenanceCost`, trừ vào lãi ròng và ghi sổ cái loại `maintenance`. Mua mới không đụng đến `assignedProductId`, `currentStock`, `stockLots` hay vị trí.

## 4. Ảnh hưởng của kệ hỏng

Khách chọn kệ lúc xuất hiện nên bỏ qua kệ hỏng; `availabilityFactor` coi kệ hỏng như hết hàng; `transferToShelf` và `applyPlanogramEntry` trả `fixture_broken`; `getRestockJobTargets` (nhân viên và tự châm) bỏ qua kệ hỏng. `transferFromShelf` vẫn dùng được để cứu hàng. Vì hỏng chỉ xảy ra qua đêm, không có khách đang đứng trước kệ lúc hỏng.

## 5. Lệnh và đồng bộ

`maintain_fixture { fixtureId, action }` được thêm vào `GameCommandPayload`, bộ kiểm tra và `ALLOWED_COMMAND_TYPES` ở server. Giống `restock`, server chưa phát lại lệnh này; bất biến save chỉ chặn tiền tăng bất thường nên chi tiền không bị từ chối. Độ mòn qua đêm tính trên mỗi máy theo cùng seed rồi đi theo save.

## 6. Giao diện và hiển thị

`MaintenanceModal` sắp xếp hỏng nặng, hỏng, mòn nhiều lên trước, mỗi dòng có thanh mòn và nút phù hợp. Nút HUD "Sửa chữa (n)" chỉ hiện khi n > 0 (tránh nới HUD vốn đã chật). Tổng kết ngày thêm dòng "Sửa chữa, bảo trì" khi có chi. Renderer: kệ hỏng tối màu (nhẹ hơn khi hỏng nhẹ), chấm đỏ sẫm, nhãn HỎNG hoặc NẶNG thay cho số hàng.

## 7. Rủi ro

- Chưa cân bằng; chi phí bảo trì định kỳ có thể tương đương vài nghìn đồng mỗi kệ mỗi đêm (ước tính từ bảng, chưa đo trong chơi thật).
- Người chơi chỉ biết đồ sắp hỏng khi nút HUD hiện (từ mòn 38,5) hoặc mở modal; chưa có chỉ báo trên kệ cho trạng thái "mòn".
- Mua mới đồ còn tốt bị chặn trong UI nhưng logic cho phép (`replace` không kiểm tra hỏng) để dùng cho thay thế chủ động sau này.
- Server không phát lại lệnh, nên tính toàn vẹn chi tiền trong co-op dựa vào save client như các lệnh còn lại (I-01).
- Chưa kiểm giao diện trong trình duyệt khi có đồ hỏng.
