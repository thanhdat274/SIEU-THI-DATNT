# DESIGN-TOKENS — Tiệm Tạp Hóa Đầu Hẻm

> Người duy trì: **UI/UX Lead**. Tài liệu này tham chiếu token **hiện có**; KHÔNG tạo bộ token trùng.
> Nguồn chính thức: `apps/web/src/index.css` + `docs/ui/PIXEL_UI.md`.

## 1. Màu (index.css)

`ink`, `wood-dark`, `wood`, `wood-light`, `paper`, `paper-shade`, `teal`, `teal-dark`, `brick`, `sun`, `muted`.
- CTA: `teal-dark`/`paper` (đạt contrast). `teal` sáng: progress/decor. `brick`: cảnh báo/action nguy hiểm. `sun`: highlight.
- Palette ấm hoài niệm (nâu gỗ, vàng ấm, xanh ngọc, đỏ gạch) — giữ tinh thần game.

## 2. Typography

- Hệ thống font có đủ dấu tiếng Việt. Body ≥14px; title 18–20px.
- Hierarchy heading/body/label rõ; số dùng `tabular-nums` cho PixelStat.

## 3. Spacing / Layout token

`--space-*`; `--touch:44px`; `--safe-*` (safe-area); `--dialog-avail-h`, `--dialog-w/h`; `--top-ui-height`, `--hud-bottom`, `--footer-h`, `--account-h`, `--kb-h`, `--vb-h`; container query (`@container plano`…).

## 4. Density / input

- `data-density=compact|normal|comfortable` (từ `responsive.ts`).
- `data-input=touch|mouse` (từ `control-mode.ts`) — gate cho rule touch.

## 5. Quy tắc dùng token

- Không hard-code px cho padding/size responsive — dùng token hoặc rule compact.
- Không tạo token trùng tên/ý nghĩa.
- Nếu cần token mới → đề xuất qua UI/UX Lead, thêm vào `index.css` và cập nhật tài liệu.
