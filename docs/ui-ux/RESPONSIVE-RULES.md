# RESPONSIVE-RULES — Tiệm Tạp Hóa Đầu Hẻm

> Người duy trì: **UI/UX Lead**. Tài liệu này tham chiếu hệ responsive **hiện có**; KHÔNG tạo breakpoint/framework thứ hai.

## 1. Hệ thống responsive hiện có (bắt buộc dùng)

- **`responsive.ts`** là nguồn duy nhất ghi `data-density` (compact khi `height<500 || width<640`), `data-size`, `data-orient`, `data-short` lên `html`.
- **`responsive.css`** là nơi DUY NHẤT thêm rule responsive/compact/touch. Mọi rule compact bọc `html[data-density="compact"]`, rule touch bọc `html[data-input="touch"]` — không để rò sang desktop.
- **`index.css`** chứa token: `--touch:44px`, `--safe-*`, `--dialog-avail-h`, `--top-ui-height`, `--hud-bottom`, `--footer-h`, `--account-h`, `--kb-h`, `--vb-h`, container query.
- **`PIXEL_UI.md` §Layout**: desktop dock 300px; mobile (width<1024 || height<500) kho mặc định đóng, panel overlay, touch controls; 667×375 giữ world >60% chiều cao; safe-area ở shell+dialog.

## 2. Mobile-first, không mobile-only

- Thiết kế & audit: **Mobile → Tablet → Desktop → Ultrawide** (game UX trước, rồi từng layout).
- KHÔNG thiết kế desktop rồi thu nhỏ xuống mobile.
- Input method: Mobile=touch, Tablet=touch+larger, Desktop=mouse+keyboard.
- Mobile landscape nhỏ (568×320…932×430) tự compact (`data-density=compact`) — đây là môi trường chính cần chuẩn.

## 3. Viewport audit matrix (Designer/QA phải duyệt ít nhất)

| Nhóm | Viewport |
|---|---|
| Mobile | 320, 360, 375, 390, 393, 430 (width) — cả landscape 568×320…932×430 |
| Tablet | 768, 820, 1024 — portrait + landscape |
| Desktop | 1280, 1440, 1920 |
| Extreme | màn rất rộng (ultrawide), màn thấp, resize, zoom |

Tester test matrix: 320/360/375/390/393/430/768/820/1024/1280/1440/1920.

## 4. Tiêu chí responsive (per viewport)

- Không horizontal overflow / clipping / overlap.
- Text đọc được, không bị cắt, wrap hợp lý (không bể chữ quan trọng).
- Touch target ≥ `--touch` (44px) trên `data-input=touch`.
- Modal không giữ kích thước desktop vô lý; `.pixel-dialog` `width:min(var(--dialog-w),100%)`, màn nhỏ thành bottom-sheet full-width.
- HUD placement không che gameplay; action chính dễ chạm.
- Desktop không quá nhiều khoảng trống, UI không quá nhỏ, hierarchy rõ, gameplay area dùng hợp lý.

## 5. Breakpoint / pattern (tái sử dụng class đã có)

- `feature-tabs` / `feature-scroll-tabs`: tab → 1 hàng cuộn ngang trên compact.
- `feature-kpis`/`summary-kpis`/`chain-kpis`: KPI → 2 cột compact.
- `product-row`: dòng dẹp [icon+tên+tồn+action].
- `inventory-grid` → 1 cột dày compact.
- `regulars-split/list/detail`: master/detail → stack 1 cột.
- `dialog-footer` sticky: action chính giữ 1 hàng trên màn thấp.
- Accordion `summary`/`details` (Pattern D) cho cấu hình hiếm dùng (staff-fund, auto-buy-panel).

Không tạo class trùng; nếu thiếu, thêm hook `className` + rule trong `responsive.css`.

## 6. Không chấp thuận

- Rule responsive rò sang desktop; breakpoint mới song song; hard-code thiết bị; class mồ côi (có hook không rule / có rule không hook).
- Rescue cách viết inline style cứng đè rule compact (đã từng gây lỗi Đợt 14F).
