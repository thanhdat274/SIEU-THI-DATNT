# Proposal: Neighborhood Builder Expansion (change tổng — lộ trình)

> **Change tổng, không áp dụng trực tiếp.** Viết lại 16/10/2026 sau review. Phần việc thật nằm ở 5 change con `civic-*` (xem `tasks.md`). Change này chỉ giữ quyết định chung, phạm vi và thứ tự; không có spec delta riêng.

## Why

Game đã có nửa vòng lặp "xây → phục vụ khách → kiếm tiền → mở rộng tòa". Muốn cảm giác "thành phố sống" kiểu City: Skylines thì cần thêm nửa còn lại: **tiệm đóng góp cho xóm → xóm tốt lên → đông dân hơn → nhiều khách hơn**.

Nhưng hướng đã chốt ngày 05/10/2026 (`open-world-*`) là **mô phỏng kinh doanh thế giới mở, city-building nhẹ, KHÔNG thành city-builder thuần**: người chơi là **chủ tiệm**, kiểm soát đất/tòa/nội thất; thế giới tự lo đường, nhà dân, NPC, giao thông. Bản plan đầu của change này đặt người chơi vào vai thị trưởng (thu thuế, vẽ đường, quy hoạch vùng) nên mâu thuẫn với hướng đó. Bản viết lại giữ ý tưởng "xóm phố lớn dần" nhưng qua vai chủ tiệm.

## Quyết định chính (thay cho plan cũ)

| Vấn đề trong plan cũ | Quyết định mới |
|---|---|
| Người chơi tự vẽ đường (Phase 2) | **Bỏ.** Đường cố định theo đợt khai hoang (đã chốt). |
| Zoning paint + tự sinh tòa | **Bỏ.** Lô là chữ nhật khai báo sẵn. Thay bằng "nhà dân tự lên tầng theo dân số" (đúng ý "chỉ NPC/xe/tầng nhà tự tăng") ở `civic-residents-life`. |
| Người chơi thu thuế tài sản/doanh nghiệp | **Bỏ vai thị trưởng.** Người chơi đã nộp GTGT + TNCN qua `game-core/src/tax/`; thêm `business_tax` 5% là đánh thuế hai lần. Chỉ thêm **phí xóm** nhỏ, minh bạch (`civic-local-fees`). |
| Người chơi "xây" trường/bệnh viện | Người chơi **góp vốn xây công trình công cộng** cho phường (fiction chủ tiệm), đặt trên lô qua mô hình placement có sẵn; đổi lại xóm tốt lên và danh tiếng. |
| 8 loại công trình một lượt | Bắt đầu **4 loại** gắn với hệ đã có: công viên, trạm y tế, đồn công an phường (nối `security.ts`), trường tiểu học. Thêm loại sau khi cân bằng xong. |
| 500 citizen agent có home/job, lưu trong save | **Dân số là con số dẫn xuất/lưu gọn**, điều khiển lưu lượng khách qua `demand.ts`. Cư dân hiển thị chỉ là lớp hình (mở rộng `neighborhood-life.ts`), không ảnh hưởng kinh tế, không lưu từng agent. |
| QoL đếm loại duy nhất, bỏ khoảng cách | QoL **theo khu** (`districts.ts`) và **theo bán kính** (tái dùng cách tính của `proximity-cluster.ts`), có trần. |
| Sự kiện flood/power_outage/health crisis | Chỉ `power_outage` (và `w4_fair`) có trong `world-events.ts`; ngập/dịch bệnh chưa có. Để ngoài phạm vi; nếu làm thì mở rộng change `neighborhood-events`, không làm ở đây. |
| Traffic sim, giao thông xe | Đã có `street-traffic.ts` + đèn tín hiệu. Ngoài phạm vi. |
| Bảng "% so với City: Skylines" | Bỏ — không đo được, không phải tiêu chí nghiệm thu. |

## Ngoài phạm vi (giữ nguyên plan cũ)
Mạng điện/nước/cống, giao thông công cộng, traffic 10.000 agent, người chơi tự vẽ đường, zoning tự do, thị trưởng thu thuế toàn thành phố.

## Các change con (thứ tự phụ thuộc)

1. `civic-buildings-qol` — 4 loại công trình công cộng + chỉ số sống (QoL) theo khu, bán kính, có trần.
2. `civic-population-demand` — dân số xóm theo QoL, nối vào lưu lượng khách; balance sweep.
3. `civic-local-fees` — phí xóm + chi phí duy trì công trình; ghi sổ cái/báo cáo; không đánh thuế trùng.
4. `civic-city-goals` — mục tiêu thành phố + **Sổ góp xóm** (góp hàng từ kho để mở công trình) (sau khi `open-world-districts-city-goals` xong 2.2 + 4.1).
5. `civic-residents-life` — cư dân có lịch sinh hoạt hiển thị + nhà dân lên tầng theo dân số (chỉ hình).

**Điều kiện tiên quyết:** `open-world-building-types` (loại tòa theo dữ liệu, `open_building`) và `open-world-districts-city-goals` mục 1.1 (gán `parcel.districtId`) phải chạy thật trước change 1. Save schema hiện tại là **10**; số schema mới lấy theo thứ tự merge thực tế, không ghi cứng "11".

## Impact
Xem từng change con. Tổng quát: thêm `game-data/world/civic-*.ts`, `game-core/civic-*.ts`, mở rộng `BUILDING_TYPE_DEFS`, `demand.ts`, `ledger`, `neighborhood-life.ts`, UI một tab "Xóm phố" theo chuẩn mobile (QA 7 viewport).
