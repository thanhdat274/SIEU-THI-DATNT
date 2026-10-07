# Store Layout — Mobile Feature Audit (theo chuẩn Mobile Game UI/UX)

> Trạng thái: **NOT TESTED** (chưa chạy browser thật — môi trường không dev/build/test browser được).
> Audit tĩnh từ `apps/web/src/components/StoreLayoutModal.tsx` (1155 dòng) + `store-layout.css` + `responsive.css`.

## 1. Feature Audit

| Mục | Nội dung |
|---|---|
| Feature | Sắp xếp cửa hàng (canvas editor) |
| Desktop layout | Board (trái, chiếm chính) + sidebar catalog 290px (phải) + footer action |
| Mobile layout hiện tại | **Canvas-first (Pattern F)**: board + sidebar ~190px/32% (landscape), `@container(max-width:860px)` → 1 cột khi hẹp; footer action |
| Primary player goal | Đặt / di chuyển nội thất lên sàn, mở rộng diện tích — nhìn rõ board, một tay |
| **Primary action** | Tương tác board (đặt/di chuyển) chốt bằng footer **"Áp dụng bố cục"** |
| P0 information | Board/ô sàn, kệ hiện có, nút đặt/di chuyển, tiền |
| P1 information | Catalog (sidebar theo tab), status hướng dẫn, thông tin kệ được chọn |
| P2 information | Mở đất / mở rộng / nhà kho (cấu hình hiếm dùng) |
| Mobile layout pattern | Canvas First (Pattern F) — đúng; cần gọn toolbar/catalog |
| Expected navigation | 6 tab `.layout-tabs` → 1 hàng cuộn ngang; tòa nhà `.layout-building-tabs`; sidebar theo tab |
| Expected scroll | Board cuộn ngang khi hẹp (canvas); catalog cuộn dọc trong sidebar |
| Expected touch | Board `--layout-cols*28px` min-width; dpad `--touch` (44px) |
| Gameplay visibility | Board ưu tiên; sidebar 190px không che board (2 cột landscape) |
| Vertical-space risks | 852×393 (~350px): status bar + board + bottom-panel; catalog `max-height` |
| Horizontal-space risks | Board `overflow-x:auto`; sidebar `minmax(190px,32%)` |

## 2. Đã tối ưu từ 14B/14C/14D/14F (giữ nguyên)

- `.layout-tabs` (6 tab) → **1 hàng cuộn ngang** trên compact (`repeat(6,minmax(max-content,1fr)) !important; nowrap; overflow-x:auto`).
- `.layout-status-bar > span` → clamp 1 dòng (không chiếm 2 dòng trên màn thấp).
- Touch: board `min-width: calc(var(--layout-cols)*28px)`, dpad `--touch` 44px.
- Compact padding: `.layout-heading`, `.layout-footer`, `.layout-workspace`, `.layout-sidebar`.
- `@container layoutdlg(max-width:860px)` → sidebar xếp dọc khi hộp thoại hẹp.

## 3. Điểm còn tồn tại (fix đợt này — chỉ presentation, không đổi logic/state)

**`.layout-footer-actions { flex-wrap: wrap }` (store-layout.css L1072) chưa có rule compact giữ 1 hàng.**
Màn này dùng footer riêng `.layout-footer` (KHÔNG phải `.dialog-footer`), nên rule sticky 1 hàng của 14F không chạm tới. 3 nút footer (Hoàn tác / Hủy / **Áp dụng bố cục**) — "Áp dụng bố cục" là primary action — trên màn thấp nếu wrap thì che bảng / mất vị trí nổi bật.

**Fix:** rule compact:
```css
html[data-density="compact"] .layout-footer-actions { flex-wrap: nowrap !important; }
html[data-density="compact"] .layout-footer-actions .pixel-button { flex: 0 1 auto; }
```
→ giữ 3 nút footer 1 hàng trên mobile, khớp rule `.dialog-footer` đã làm; primary action luôn thấy.

## 4. QA checklist
- [ ] 568×320 / 667×375 / 740×360 / 812×375 / 844×390 / 852×393 / 932×430 — **chưa chạy** (NOT TESTED).
- [x] Không horizontal overflow (board scroll ngang; tab 1 hàng).
- [x] Primary action "Áp dụng bố cục" giữ 1 hàng footer.
- [x] Touch `--touch` cho board + dpad.
- [ ] Cross-check thực tế trên browser (chờ máy thật).
