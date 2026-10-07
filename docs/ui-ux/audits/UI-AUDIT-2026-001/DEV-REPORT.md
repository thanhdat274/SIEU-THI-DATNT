# DEV-REPORT — UI-AUDIT-2026-001 · Round 1

> Agent: **Developer**. Mọi thay đổi **presentation/CSS/markup-only** — KHÔNG đổi logic/state/save/API/gameplay.
> Bám BA-SPEC Task 001–010 (trừ D11 deferred). Verify: `yarn typecheck` PASS, `npx eslint` 0 lỗi (chỉ 5 warning có sẵn không liên quan), `postcss` parse OK.

## Files changed

| File | Tasks / Issues | What changed | Why |
|---|---|---|---|
| `WarehouseDock.tsx` | A01 | Bỏ inline `minHeight:'28px'` ở nút "Cất vào kho" (giữ padding/font). | Rule touch `--touch` (responsive.css) giờ áp dụng → vùng chạm ≥44px trên cảm ứng. |
| `PricesModal.tsx` | B01 | Thêm `aria-pressed={filter===...}` cho nút lọc "Tất cả" + từng nhóm. | Trạng thái active đọc được bằng AT, không chỉ màu. |
| `ReviewsModal.tsx` | B01 | Thêm `aria-pressed={filter===f.id}` cho nút lọc. | a11y trạng thái selected. |
| `SupplierModal.tsx` | B01 | Thêm `aria-pressed` cho chip "Tất cả" + từng danh mục. | a11y trạng thái selected (chips). |
| `RegularsModal.tsx` | B01 | Thêm `aria-current={isSelected?'true':undefined}` cho nút khách quen. | a11y trạng thái đang chọn trong list. |
| `StorePlanogramModal.tsx` | C04 | Thêm `aria-label` cho search input + `aria-label="Xoá tìm kiếm"` cho nút ✕. | Input/clear có tên accessible (trước thiếu). |
| `store-planogram.css` | C05 | `.btn-slot-quick` `min-height:26px` → `36px` (nền chuột); touch giữ 44px. | Đạt ngưỡng chuột `--touch`; không hạ chuẩn cảm ứng. |
| `DaySummaryModal.tsx` | D01, D02 | 2 tab `.pixel-btn` → `PixelButton` variant teal/paper + `aria-pressed`; chuyển nút "Tiếp tục"/"Bắt đầu bán hàng" vào `footer` của PixelDialog (bỏ inline). | D01: active tab có hiển thị rõ (đúng chuẩn Analytics/Quest/Skills). D02: primary CTA luôn sticky footer, không chôn trong scroll. |
| `HUD.tsx` | A02, A07 | Danh hiệu active: `<p onClick>` → `<button type=button>` (khi onOpenTitles) — keyboard-operable; màu `#ffd56b` → `var(--sun)`. | A02: bàn phím/AT access. A07: dùng token. |
| `responsive.css` | C03, D05, D06 | (C03) Xoá selector mồ côi `.layout-dpad-btn` khỏi rule touch (dpad thật dùng `.dpad-btn`, đã styled). (D05/D06) Thêm `html[data-input="touch"] .dialog-content a` + `... input[type="text"] { min-height: var(--touch) }`. | C03: bỏ rule chết. D05/D06: link (Tax) + text input (Chain) đạt vùng chạm touch. |
| `index.css` | D03 | Thêm base `.badge {…}` (nền wood-light, chữ wood-dark, viền/bo theo token) cạnh `.management-badge`. | Quest (trạng thái đơn) + Skills (cấp) badge không còn là chữ trần. |
| `CoopSleepNotification.tsx` | A03 | Inline `rgba(0,0,0,0.8)`+`borderRadius:8px`+bóng mềm → nền `var(--paper)`, chữ `var(--ink)`, viền 3px `var(--wood-dark)`, bóng pixel cứng `4px 4px 0`. | Overlay nhất quán token pixel, hết kiểu "modern glass". |
| `AnalyticsModal.tsx` | D08 | Heatmap thêm dòng legend: "Màu đậm = nhiều lượt hơn · ô cao nhất: N lượt. Chạm/lướt ô để xem số cụ thể." | Độ đậm màu không còn là kênh duy nhất; đọc được numeric trên touch. |

## What changed (tóm tắt)
12 file; toàn bộ presentation/CSS/markup/a11y. Không đổi bất kỳ logic thuật toán, state, dữ liệu, DB, API, hay gameplay.

## Why changed
Sửa các issue **static-verified** từ DESIGN-AUDIT (a11y + touch target + token nhất quán + hierarchy), theo GAME-UI-RULES/ACCESSIBILITY-RULES/DESIGN-TOKENS/RESPONSIVE-RULES.

## Potential regression
- **Thấp** ở hầu hết (chỉ attr/class/CSS token).
- **DaySummary** (D01/D02): đổi tab → PixelButton + primary sang footer — cần QA mắt xác nhận bố cục desktop/compact (đã typecheck/eslint PASS; logic `onClose` giữ nguyên).
- **HUD** (A02): đổi `<p>`→`<button>` cho danh hiệu — khả năng đổi chiều dòng nhẹ; cần QA mắt.
- **C05**: `.btn-slot-quick` cao hơn trên chuột (26→36px) — có thể đổi chút lưới planogram; touch không đổi.
- **A03**: đổi màu overlay coop — chỉ visual.

## Known limitations
- **Browser không sẵn** → KHÔNG visual-verified; Usability Fit của từng thay đổi chốt bằng QA mắt khi có browser (issue DEFERRED C01/C02/B02/C07/A04-A06/D07 + các thay đổi layout trên).
- **D11** (base rule feature-tabs) bị defer: cần refactor inline style nhiều modal, rủi ro desktop regression, không verify được khi không có browser.
- B03/B04/D09/D10 (Lead decision) không tự xử lý (đúng quy trình DESIGN-TOKENS/Lead review).

## Testing performed
- `yarn typecheck` — PASS (exit 0).
- `npx eslint` 10 file TSX sửa — **0 lỗi**; 5 warning có sẵn trong StorePlanogramModal (unused vars/hooks — KHÔNG do thay đổi này).
- `postcss.parse` 3 CSS sửa (responsive.css, index.css, store-planogram.css) — OK.
- Grep xác nhận: `.layout-dpad-btn` đã hết; `aria-pressed/current` hiện diện ở 4 modal; `#ffd56b` hết trong HUD; `.badge` base mới có rule.
- **KHÔNG chạy browser** — NOT TESTED phần trực quan (QA.md §25.1: Technical Fit PASS, Usability Fit chờ QA mắt).

---

## Supplement — Round 1 theo đợt tăng cường (presentation/a11y-only, static-verified)

| File | Tasks / Issues | What changed | Why |
|---|---|---|---|
| `LoginScreen.tsx` | D04 | 3 modal tùy chỉnh (Hẻm chơi cùng / Bảng vàng / Nhật ký vắng): thêm `role="dialog"` + `aria-modal="true"` + `aria-labelledby` (mỗi `<h3>` có id) + `useEffect` đóng bằng phím **Escape**. | a11y: modal giờ có vai trò/tên và thao tác phím (trước không có). Không đổi logic nghiệp vụ; Escape ở modal Nhật ký tái hiện đúng `onEnter` như click overlay. |
| `CashierModal.tsx` | B06 | Nút "Bán chịu" khi `disabled` (vượt hạn mức) thêm `title` giải thích "Vượt hạn mức mua chịu (còn X)". | UX: lý do disabled rõ trên hover/touch; không đổi logic bán chịu. |
| `MaintenanceModal.tsx`, `SecurityModal.tsx` | C06 (phần an toàn) | Map màu `#b64c3d` → `var(--brick)` (cùng màu B64C3D, đổi 0 visual) ở trạng thái hỏng (Maintenance) & sự cố trộm thoát (Security). | Token nhất quán; để lại `#2a7a43`/`#a86b12`/`#e09f3e` (success/amber) cho quyết định Lead B04/D09. |
| `CashierModal.tsx` | B05 | Khi có khách quầy nhưng cửa đóng, footer vẫn giữ (bỏ điều kiện `isStoreOpen`), nút "Thu tiền" disabled + title/hint "Cửa đang đóng — mở cửa để thu tiền"; Bán chịu/Ăn tại bàn ẩn khi cửa đóng. | UX: không mất nút thu tiền khi đóng cửa; không đổi luồng tiền (`onCheckout` args giữ nguyên). |
| `responsive.css` | B02 | Rule (3i) `.dialog-footer [style*=flex-wrap]:has(> .pixel-button)` — đổi ép `nowrap` thành `wrap` trên compact: nút phụ nhường hàng 2 khi chật, primary "Thu tiền" đủ rộng dễ chạm; giữ `--touch`. | Footer Cashier 3 nút không tràn/co label trên 568–430; compact-only. |
| `responsive.css` | C07 | Thêm rule compact-only nâng `dpad-title`/`dpad-hint`/`finish-hint` lên floor 11px (chống microtext 9–10px). | Không còn chữ <11px trên compact; không đụng desktop. |

**Verify bổ sung:** `npx eslint` LoginScreen = 0 lỗi, CashierModal = 0 lỗi; `yarn typecheck` = 0 lỗi.
**Ghi chú (C06/B04/D09):** token màu success (`#2a7a43` ở Maintenance…) đan xen B04/D09 — quyết định token là của **UI/UX Lead** (không tự ý thêm token mới); defer đúng quy trình.


---
## Round 8 (08/10/2026) — Developer

| File | Issue | Thay đổi | Lý do |
|---|---|---|---|
| 13 modal `components/*.tsx` (Market, Prices, Regulars, Reviews, Security, Chain, Titles, Skills, Quest, Maintenance, Stall, TimeVote, LevelRoadmap) | **B03** (Lead chốt sentence-case) | `title` ALL-CAPS → sentence-case ("Giá bán", "Thị trường hẻm"…). Chỉ chuỗi hiển thị. | Nhất quán với Cashier/Inventory/Staff/Warehouse. |
| `components/pixel/index.tsx` (`PixelDialog`) | **REG-R8-01 (mới, P2)** | Handler `focusin` chỉ giữ focus khi dialog là `.pixel-dialog` trên cùng (`isTop()`). | Khi 2 `PixelDialog` cùng mount, handler hai bên giành focus lẫn nhau → `RangeError: Maximum call stack size exceeded`, trang treo (tái hiện bằng `__openModal` ở 360×640). Hành vi 1-dialog giữ nguyên. |

B04: đã có token `--success` (index.css) và không còn `#2a7a43` trong src → đóng. D10: Lead chốt giữ emoji trang trí, chưa thêm `aria-hidden` (backlog P3). Không đổi logic/state/save.
Self-check: `yarn typecheck` 0 lỗi; `eslint pixel/index.tsx` 0 lỗi. Chưa chạy `yarn test`/build production vòng này.

---
## Round 10 (08/10/2026) — Developer
| File | Issue | Thay đổi | Lý do |
|---|---|---|---|
| `apps/web/src/App.tsx` (~L2266) | **UI-R10-01 (mới, P2)** | `InventorySummaryCard` chỉ render khi `!daySummaryRecord && !hasModal` (thêm điều kiện hiển thị; state/auto-close giữ nguyên). | Cuối ngày thẻ "Kiểm kê cuối ngày" (góc dưới-phải) đè lên bảng "Nhịp sống hẻm" ở 667×375, che các chỉ số bên phải. Nay thẻ chờ tới khi đóng bảng tổng kết. |
Self-check: `yarn typecheck` 0 lỗi. Chưa chạy eslint App.tsx / test / build.

---
## Round 12 (08/10/2026) — Developer
`apps/web/src/responsive.css` (khối `@media (max-height:499px)` của `.inventory-summary-card`): **UI-R11-01** — thẻ rộng `min(240px, …)` (trước 290), `summary-body` padding 6/10px, gap 3px. Chỉ CSS màn thấp; desktop không đổi. Chưa chạy postcss/eslint CSS.

---
## Round 13 (08/10/2026) — Developer · D09 (Lead chốt: dùng token có sẵn)
`DaySummaryModal`, `QuestModal`, `RegularsModal`, `SkillsModal`: `#16a34a`→`var(--success)`, `#dc2626`/`#d9534f`→`var(--brick)`, `#d97706`→`var(--warn)`, `#4eaf7c`→`var(--teal)`. Không tạo token mới; màu tối hơn một chút, tương phản tốt hơn trên nền giấy. Còn lại: `var(--rust, #b44a2c)` (token `--rust` chưa định nghĩa, đang dùng fallback), `#999999` (TitlesModal), `#888`, màu Tax/Login. typecheck 0 lỗi; eslint 4 file 0 lỗi.

---
## Round 14 (08/10/2026) — Developer
`DaySummaryModal`, `RegularsModal`: `var(--rust, #b44a2c)` → `var(--brick)` (token `--rust` không tồn tại; #B64C3D gần như cùng màu). Hết hex trạng thái chính (còn `#999999` TitlesModal, `#888` Regulars). typecheck 0 lỗi.
