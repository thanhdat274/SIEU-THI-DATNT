# Ghi chú nháp pháp lý — Tạp Hoá 3D

Tài liệu này tóm tắt **cơ sở pháp lý** mà các bản nháp Chính sách Bảo mật / Điều khoản dựa vào, đồng thời nêu rõ điều gì **cần xác minh** trước khi đưa dự án ra công khai. Đây là bước rà soát ban đầu, **không phải tư vấn pháp luật** và không thay thế luật sư.

## Văn bản liên quan (đối chiếu 2026-11)

| Lĩnh vực | Văn bản | Hiệu lực | Liên quan dự án |
|---|---|---|---|
| Bảo vệ dữ liệu cá nhân | Luật **91/2025/QH15** | 01/01/2026 | **Có — cao nhất** |
| | NĐ **356/2025/NĐ-CP** (thay NĐ 13/2023) | 01/01/2026 | Có |
| | NĐ **330/2026/NĐ-CP** (xử phạt) | 19/08/2026 | Có |
| An ninh mạng | Luật **116/2025/QH15** | 01/07/2026 | Một phần (tài khoản, bảo mật) |
| Thương mại điện tử | Luật **122/2025/QH15** | 01/07/2026 | **N/A** — game không giao dịch tiền thật |
| Trí tuệ nhân tạo | Luật **134/2025/QH15** | 01/03/2026 | **N/A** — không có hệ AI trong game |

> ⚠️ Một số mục trong bảng trên (vd. mức phạt, thứ tự thay thế NĐ) ghi **"chưa xác minh"** trong nguồn tham khảo `vn-law-check`. **Phải** tra lại hiệu lực văn bản gốc tại thuvienphapluat.vn / vbpl.vn trước khi dùng.

## Điều rủi ro thực tế của dự án (đã rà code)

1. 🔴 **Đăng nhập Google** → thu email, tên, avatar, uid (Firebase). Cần cơ chế **đồng ý tách riêng** + lưu bằng chứng đồng ý. → Đã thêm (consent checkbox trước khi đăng nhập + `POST /api/consent` lưu thời điểm/version).
2. 🔴 **Cloud MongoDB ở nước ngoài** → thuộc diện **chuyển dữ liệu xuyên biên giới**. Theo NĐ 356/2025 và Điều 20 Luật 91/2025, bên xử lý phải lập **hồ sơ đánh giá tác động chuyển dữ liệu ra ngoài biên giới** (Mẫu 09) và thông báo. *(Chưa triển khai trong code — là nghĩa vụ vận hành.)*
3. 🟡 **Nhật ký server ghi uid** mọi `/api/*` → là hoạt động xử lý dữ liệu; cần chính sách lưu giữ và thông báo. Đã nêu trong Chính sách Bảo mật (mục 2.4).
4. 🟡 **Chưa có cơ chế xóa dữ liệu** → đã thêm nút "Xóa tài khoản & dữ liệu" + `DELETE /api/save`.

## Điều dự án đang KHÔNG vướng

- Không cài analytics/tracking bên ngoài (không Google Analytics, không Pixel) → không quy trách xử lý dữ liệu nhạy cảm.
- Không giao dịch tiền thật → ngoài phạm vi Luật TMĐT 122/2025.
- Không có hệ AI → ngoài phạm vi Luật AI 134/2025.

## Việc cần làm khi công bố thật

1. Rà lại toàn bộ hiệu lực văn bản (thuvienphapluat.vn / vbpl.vn).
2. Xin ý kiến pháp lý về bản Chính sách Bảo mật / Điều khoản.
3. Thực hiện nghĩa vụ **hồ sơ đánh giá tác động chuyển dữ liệu xuyên biên giới** nếu xác định thuộc diện.
4. Điền kênh liên hệ vào các tài liệu.
5. Cân nhắc giữ nhật ký server ngắn hạn và ẩn danh uid trong log sản xuất.
