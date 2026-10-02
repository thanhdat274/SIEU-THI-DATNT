# Ma trận quy tắc

| Quy tắc | Căn cứ đầu mối | Tham số nghiên cứu | Trạng thái chạy |
|---|---|---|---|
| Ngưỡng hộ VAT | Điều 3 NĐ 68 sửa bởi Điều 1 NĐ 141 | 1.000.000.000 đồng/năm, từ 01/01/2026 | UNVERIFIED — khóa |
| Ngưỡng hộ PIT | Điều 4 NĐ 68 sửa bởi Điều 1 NĐ 141 | 1.000.000.000 đồng/năm, từ 01/01/2026 | UNVERIFIED — khóa |
| VAT/PIT theo hoạt động và phương pháp | NĐ 68 và luật liên quan | Chưa gán tỷ lệ hoặc công thức | UNVERIFIED |
| CIT | Luật 67; NĐ 320 | 15/17/20% là yêu cầu cần thẩm định, không phải bảng đang chạy | UNVERIFIED |
| Miễn CIT doanh nghiệp nhỏ | Điều 2 NĐ 141 bổ sung khoản 15 Điều 4 NĐ 320 | Cần doanh thu tham chiếu, số tháng, quan hệ liên kết | UNVERIFIED |
| Miễn CIT doanh nghiệp mới | NQ 198 và hướng dẫn | Chưa xác định đủ điều kiện | UNVERIFIED |
| Hóa đơn | NĐ 141, NĐ 254 | Cần giải quyết quy tắc trước/sau 01/07/2026 và đúng tại ngưỡng | UNVERIFIED |
| BHXH, TTĐB, xuất nhập khẩu, thực phẩm | Chưa xác minh | Không suy ra từ tên sản phẩm | UNVERIFIED |

Không dùng 500 triệu làm ngưỡng hiện hành. Phiên bản lịch sử chỉ thêm khi có căn cứ độc lập. Trên ngưỡng không đồng nghĩa toàn bộ doanh thu là căn cứ PIT hoặc phải chuyển thành công ty.

## Ghi chú 03/10/2026 — chính sách trong game
Gameplay dùng `TaxPolicy` (`packages/game-core/src/tax/annual-revenue.ts`) theo tổng hợp tra cứu thứ cấp: bán hàng hóa, ngưỡng 1 tỷ đồng/năm, trên ngưỡng GTGT 1% + TNCN 0,5%. Đây là mô phỏng đơn giản hóa cho game. Các dòng ở bảng trên **vẫn UNVERIFIED** và registry không kích hoạt chính sách này; cần đối chiếu NĐ 68/2026, NĐ 141/2026, Luật 09/2026/QH16, VBHN 25/2026/VBHN-BTC trước khi nâng trạng thái VERIFIED.
