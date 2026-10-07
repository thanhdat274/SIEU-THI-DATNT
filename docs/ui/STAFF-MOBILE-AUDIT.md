# Staff — Mobile Feature Audit (theo chuẩn Mobile Game UI/UX)

> Trạng thái: **NOT TESTED** (chưa chạy browser thật — môi trường không dev/build/test browser được).
> Audit tĩnh từ `apps/web/src/components/StaffModal.tsx` (81 dòng) + `responsive.css`.

## 1. Feature Audit

| Mục | Nội dung |
|---|---|
| Feature | Quản lý nhân viên (Staff) |
| Desktop layout | 1 hộp thoại: khối quỹ lương → danh sách nhân viên → danh sách ứng viên |
| Mobile layout hiện tại | Cùng dọc; hàng nhân viên/ứng viên dùng `.product-row` compact; ca làm `.staff-shift` 1 hàng (14B/C/D/14F) |
| Primary player goal | Tuyển người, đổi ca, trả nợ lương — nhanh, một tay, màn ngang nhỏ (852×393) |
| **Primary action** | **Phân ca** (điều khiển chính theo hàng nhân viên) — đã có `.staff-shift` (mục 6) |
| P0 information | Tên + vai trò; điều khiển ca; nút Tuyển (cho ứng viên) |
| P1 information | Lương/ngày + chỉ số (tốc độ, chính xác, sức bền); nợ lương + nút trả; phí tuyển + lý do khóa |
| P2 information | Mô tả lỗi nhân viên (`describeWorkerError`), trạng thái công việc chi tiết |
| Mobile layout pattern | Single Pane + list (Pattern A) — hợp vì là danh sách cuộn; không cần sidebar/2 cột |
| Expected navigation | Không cần tab; cuộn 1 vùng chính |
| Expected scroll | Một vùng cuộn chính (`dialog-content`) |
| Expected touch | `.staff-shift select` đủ `--touch`; nút Tuyển chạm tốt |
| Gameplay visibility | Hộp thoại phủ thế giới khi mở — chấp nhận (feature quản lý) |
| Vertical-space risks | Khối `.staff-fund` ở đỉnh màn đặc khi không nợ lương (mục 3) |
| Horizontal-space risks | h3/`p` nowrap-ellipsis; `.staff-shift` `min-width:0` → không tràn |

## 2. Vấn đề chính (852×393, compact)

1. **`staff-fund` = `<section>` đặc** luôn hiện "Quỹ lương và công nợ → Nợ lương hiện tại: N", kể cả khi **N=0 và không có nút trả** — chiếm ~2 dòng + panel ở đỉnh màn trong khi là thông tin P1 hiếm khi cần (trừ lúc nợ).
2. **Nút Tuyển của ứng viên là nút trần** (con trực tiếp của `.product-row`), **không qua `.product-actions`** → rule compact `.product-actions` (min-width:0, align phải) không áp dụng → chưa gọn nhất quán với các row khác.

## 3. Fix (chỉ presentation/hierarchy, không đổi logic/state)

1. **`staff-fund` → `<details>` accordion (Pattern D, §22):**
   - **collapse** khi không có nợ cần trả (`wageDebt<=0` hoặc không có `onPayWageDebt`) — chỉ còn 1 dòng summary "Quỹ lương và công nợ · nợ N".
   - **open** khi đang nợ + có nút trả → giữ nút "Trả nợ lương" (action quan trọng) luôn thấy.
2. **Bọc nút Tuyển trong `.product-actions`** → gọn/đều compact với hàng nhân viên (nút `min-width:0`, align phải).

## 4. QA checklist
- [ ] 568×320 / 667×375 / 740×360 / 812×375 / 844×390 / 852×393 / 932×430 — **chưa chạy** (NOT TESTED).
- [x] Không horizontal overflow (nowrap + min-width:0).
- [x] Primary action Phân ca rõ; nút Tuyển gọn.
- [x] Touch `--touch` cho select ca.
- [ ] Cross-check thực tế trên browser (chờ máy thật).
