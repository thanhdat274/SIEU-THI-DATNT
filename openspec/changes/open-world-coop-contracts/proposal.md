# Proposal: Phân công quản lý tòa và hợp đồng cung ứng trong co-op (Bước 6c thế giới mở)

## Vì sao

Ý tưởng (từ phân tích chủ dự án chia sẻ): hai người chơi chung một khu phố, mỗi người phụ trách loại hình riêng (người A siêu thị, người B quán ăn), hỗ trợ nhau như đối tác: A cung cấp nguyên liệu cho B, khách của tòa này kéo khách cho tòa kia. Hiện tại co-op là **một doanh nghiệp, một quỹ chung** (`shared-alley-multiplayer` D1), và chủ dự án đã chốt chơi chung một thành phố, nên chưa có cách thể hiện "phần của tôi, phần của bạn".

## Mục tiêu

- **Người phụ trách tòa**: mỗi tòa có `managerAccountId` (tùy chọn). Người phụ trách được ưu tiên quyền thao tác tòa đó (bố cục, giá, nhân viên); người kia vẫn xem được và thao tác được nếu chủ hẻm cho phép.
- **Hợp đồng cung ứng nội bộ**: thỏa thuận giữa hai tòa (ví dụ tạp hóa cấp trứng, rau cho quán ăn vặt mỗi sáng với số lượng và giá nội bộ cố định). Hàng tự chuyển theo lịch, có ghi sổ chuyển giao nội bộ.
- **Bảng thành tích theo người**: doanh thu, lãi, khách phục vụ theo các tòa mỗi người phụ trách; giá nội bộ của hợp đồng ghi vào lãi của hai bên để "hợp đồng" có ý nghĩa với thành tích.
- **Ký và hủy hợp đồng** qua lời mời/đồng ý giữa hai người (khuôn phiếu của Bước 5).

## Ngoài phạm vi

- Ví riêng mỗi người, chuyển tiền giữa hai người, cho thuê đất cho nhau, mua bán tòa giữa hai người (đã chọn quỹ chung).
- Hợp đồng với NPC (nhà cung cấp, khách sỉ đã có hệ riêng).

## Phụ thuộc

`open-world-building-types` (instance, sổ cái theo tòa, giao hàng nội bộ) và `open-world-coop-land` (quyền, phiếu).

## Quyết định

Chủ dự án chốt 05/10/2026: **giữ một quỹ chung** (phương án A, `design.md` D1). Không làm ví riêng.

## Tiêu chí hoàn tất

- A phụ trách tiệm chính, B phụ trách quán ăn vặt; ký hợp đồng cấp 10 trứng/ngày giá nội bộ; 5 ngày chạy đúng: hàng chuyển mỗi sáng, thiếu hàng thì báo, bảng thành tích hai bên cộng/trừ đúng giá nội bộ, tổng tiền quỹ chung không đổi do chuyển nội bộ.
- Hủy hợp đồng cần đồng ý hoặc báo trước 1 ngày.
- `test:coop`, `yarn typecheck`, `yarn test`, `yarn build` PASS bằng kết quả thực; QA hai trình duyệt.
