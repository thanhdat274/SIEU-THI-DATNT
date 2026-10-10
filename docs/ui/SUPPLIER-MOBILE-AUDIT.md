# Supplier — Mobile Feature Audit (theo chuẩn Mobile Game UI/UX)

> Trạng thái (06/10/2026): **đã sửa lần 2 sau review và đo trong trình duyệt mô phỏng ở 852×393, 740×360, 844×390, 932×430, 568×320; chưa đo 667×375 và 812×375; chưa thử máy thật**. Bản audit tĩnh bên dưới là lần 1 và đã lỗi thời: lần đo thực tế cho thấy không món nào hiện khi mở.
> Audit tĩnh từ `apps/web/src/components/SupplierModal.tsx` (918 dòng) + `responsive.css` (hệ token compact).

## 1. Feature Audit

| Mục | Nội dung |
|---|---|
| Feature | Đại lý nhập hàng (Supplier) |
| Desktop layout (thiết kế cũ) | 1 hộp thoại dọc: Auto Buy → supplier tabs → summary → suggest → search/cat → list → cart → pending |
| Mobile layout hiện tại | Cùng bố cục dọc (đã có: `feature-scroll-tabs` supplier, `auto-buy-panel`, `feature-suggest` collapse trên compact, `cart-bar` sticky). |
| Primary player goal | Đặt hàng đủ món cần trong ngân sách, nhanh, một tay, trên màn ngang nhỏ. |
| **Primary action** | **Đặt hàng** — sticky bottom `cart-bar` (đã đúng mục 6). |
| P0 information | Tên món, giá sỉ, tồn NCC, số lượng đã chọn, tổng tiền / ngân sách. |
| P1 information | Giao ngày, kho mát, đơn tối thiểu / giảm giá, gợi ý nhập, chi tiết giỏ, đơn đang giao. |
| P2 information | **Cấu hình "Tự nhập hàng"** (quy tắc auto-buy: món, NCC, ngưỡng, số lượng, ngân sách, ưu tiên, báo cáo). |
| Mobile layout pattern | Single Pane + Sticky Primary Action (Pattern A) — hướng đúng. |
| Expected navigation | Supplier = 1 hàng cuộn ngang; danh mục = 1 hàng chip cuộn ngang. |
| Expected scroll | Một vùng cuộn chính (dialog-content); giỏ sticky đáy (không che món cuối vì có padding). |
| Expected touch | stepper −/+ đủ `--touch`; nút Đặt hàng to. |
| Gameplay visibility | Hộp thoại phủ thế giới khi mở — chấp nhận (feature cần), không che player vĩnh viễn. |
| Vertical-space risks | Chrome thứ cấp ở đầu màn tốn chiều cao (xem mục 3). |
| Horizontal-space risks | Supplier/cat chips dùng 1 hàng cuộn ngang — OK. |

## 2. Vấn đề chính (852×393, `data-density="compact"`)

Trước khi tới danh sách sản phẩm (nhiệm vụ chính), viewport ~320px dọc đã bị ăn bởi:
1. **Panel "Tự nhập hàng" (`auto-buy-panel`) `open` mặc định khi đang bật** (~130px) — Đây là **P2 cấu hình hiếm dùng**, không nên chiếm đỉnh màn.
2. Supplier tabs (hàng cuộn ngang) — OK, gọn.
3. `summary-row` (tiền + giao ngày + kho mát + đơn tối thiểu) — P1, đã có compact.
4. Gợi ý (`feature-suggest`) — **đã collapse trên compact** (Pattern D) ✅.
5. Search + danh mục chip — gọn.

→ Danh sách món bị đẩy gần hết xuống dưới.

## 3. Fix (chỉ presentation/hierarchy, không đổi logic/state)

- **Collapse `auto-buy-panel` trên `data-density="compact"`** (chỉ hiện `<summary>`), đúng pattern có sẵn của `feature-suggest` (dựa `document.documentElement.dataset.density`). Người chơi vẫn mở khi cần; tiết ~130px cho danh sách món trên mobile. Desktop (non-compact) giữ `open` như cũ.
- Các phần còn lại (supplier tabs, cat chips, cart-bar sticky) đã có compact từ 14C/14D/14F — giữ nguyên.

## 4. QA checklist
- [ ] 568×320 / 667×375 / 740×360 / 812×375 / 844×390 / 852×393 / 932×430 — **NHỊP công chưa chạy** (NOT TESTED).
- [x] Không horizontal overflow (chip/tab 1 hàng cuộn ngang).
- [x] Primary action nổi bật (sticky Đặt hàng).
- [x] Touch `--touch` cho stepper/Đặt hàng.
- [ ] Cross-check thực tế trên browser (chờ máy thật).


## 5. Sửa lần 2 (sau review có đo)
- Trước: ở 852×393 mở ra không thấy món nào (phần trên ~360px > khung 273px; giỏ cố định 44px + footer "Trở về tiệm" 50px).
- Làm: (1) Gợi ý + Tự nhập hàng thành 2 nút cạnh nhau trong `.supplier-tools` (mở ra thì trải cả hàng), đặt dưới dải tiền; (2) tìm kiếm + chip danh mục chung 1 hàng; (3) dải tiền 1 dòng; (4) thanh giỏ chuyển vào `footer` của PixelDialog, giỏ có hàng = 1 hàng [Chi tiết|Xóa] [Tổng] [Đặt hàng], giỏ rỗng = ẩn footer (nút ✕ ở header + Esc vẫn đóng được).
- Đo: 852×393 giỏ rỗng thấy 2 món, giỏ có hàng ~1,5 món (footer 46px); 844×390 / 932×430 thấy 2 món; 740×360 và 568×320 chỉ thấy ~1 món ngay khi mở (còn chật). Không tràn ngang.
- Còn lại: 568×320 / 740×360 vẫn chật (header + tab đại lý + dải tiền + công cụ + tìm kiếm ≈ 185px); desktop mất nút "Trở về tiệm" ở footer khi giỏ rỗng (thay bằng gợi ý giỏ trống) và Tự nhập hàng/Gợi ý nay nằm dưới dải tiền; `open` của `<details>` chỉ tính lúc mở modal, không đổi theo density khi modal đang mở.
