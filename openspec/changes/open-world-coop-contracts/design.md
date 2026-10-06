# Design: Phân công quản lý tòa và hợp đồng cung ứng

## Bối cảnh

- Co-op: một business, một quỹ, `memberships[].role` owner/member; lệnh qua envelope có receipt; phiếu `time-vote`, sau Bước 5 có `land-vote`.
- Sau `open-world-building-types`: tòa là instance, sổ cái có `buildingInstanceId`, có `internal_delivery` (giao hàng nội bộ có thời gian).
- Kho chung một (đã chốt ở `branch-chain`): mọi tòa lấy hàng từ cùng kho.

## Quyết định

### D1. Mô hình tiền — ĐÃ CHỐT A (chủ dự án, 05/10/2026)

Chủ dự án chọn **phương án A**: giữ một quỹ chung. Phương án B ghi lại dưới đây chỉ để tham khảo, không làm.

- **Phương án A (mặc định ở change này):** giữ một quỹ chung. "Phần của mỗi người" chỉ là **thành tích** (bảng điểm theo tòa phụ trách). Hợp đồng chuyển hàng giữa tòa và ghi giá nội bộ vào thành tích hai bên; quỹ chung không đổi. Ưu: không đụng mô hình co-op đã chạy, không có rủi ro nhân đôi tiền. Nhược: hợp đồng không có hậu quả tiền thật.
- **Phương án B:** mỗi người một ví riêng (chia lợi nhuận theo tòa phụ trách), quỹ chung chỉ cho chi phí chung (đất, khai hoang). Hợp đồng chuyển tiền thật giữa hai ví; mở đường cho thuê đất, mua bán tòa giữa hai người. Nhược: đổi lớn sổ cái, thuế, lương, phiếu, migration; cần change riêng trước change này.

Change này làm theo A. Không có change `coop-personal-wallets`; nếu sau này muốn B thì mở change riêng.

### D2. Người phụ trách

`BuildingPlacement.managerAccountId?`. Gán bởi chủ hẻm, hoặc người mở tòa tự thành người phụ trách. Lệnh bố cục/giá/nhân viên của tòa: người phụ trách luôn được; người kia theo `world.settings.nonManagerActions` (`allow` mặc định / `vote` / `deny`). Chơi một mình: không có người phụ trách, mọi thứ như cũ.

### D3. Hợp đồng cung ứng

`SupplyContract { id, fromInstanceId, toInstanceId, productId, quantityPerDay, internalPrice, startDay, endDay?, status, proposedBy, acceptedBy }`. Mỗi sáng: lấy hàng từ kho (FEFO) dành cho tòa nhận, tạo `internal_delivery` tới kệ/kho phụ của tòa nhận; thiếu hàng thì giao phần có và báo hai bên. Ghi sổ `internal_transfer` (không đổi quỹ). Hai tòa cùng người phụ trách vẫn ký được (tự động hóa châm hàng).

### D4. Bảng thành tích

Theo ngày và tổng: doanh thu, giá vốn, lãi theo tòa; cộng `internalPrice × số lượng` vào doanh thu tòa giao, trừ vào giá vốn tòa nhận. Gom theo người phụ trách. Hiển thị trong bảng "Thành phố" (Bước 4) và tổng kết ngày (`DaySummaryModal`).

### D5. Ký/hủy

Đề xuất → người kia đồng ý (khuôn phiếu, hết hạn 1 ngày game). Hủy: cả hai đồng ý thì hủy ngay; một bên hủy thì hiệu lực từ ngày hôm sau. Người kia offline: đề xuất chờ tới lúc họ vào.

### D6. Save

`supplyContracts[]`, `managerAccountId`, ghi sổ `internal_transfer`; schema kế tiếp sau `open-world-land-lease`.

## Rủi ro

- **Hợp đồng chiếm hết hàng** của tòa giao: giới hạn `quantityPerDay` ≤ 50% tồn trung bình 3 ngày; cảnh báo.
- **Phương án A thiếu sức nặng** (hợp đồng không đổi tiền thật): bù bằng thành tích hiển thị rõ trong tổng kết ngày; theo dõi phản hồi khi playtest.
