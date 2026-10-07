# BA-SPEC — UI-AUDIT-2026-001 · Round 1

> Agent: **Business Analyst**. Nguồn: `DESIGN-AUDIT.md` (31 issues: P0=0, P1=2, P2=8, P3=21).
> Nguyên tắc: mọi task presentation/CSS/markup-only (KHÔNG đổi logic/state/save/API/gameplay). Type ghi rõ.
> **Ràng buộc môi trường:** browser KHÔNG sẵn → issue `(cần QA mắt)` = Usability Fit, KHÔNG implement/verify được vòng này → DEFER. Chỉ implement task static-verifiable.

## Phân loại issue

| Loại | Issue | Hướng xử lý |
|---|---|---|
| **Implement + static-verify** | B01, A01, C04, C05, C03, D11, D01, D02, D03, D05, D06, A02, A07, A03, D08 | Task bên dưới |
| **Design decision — UI/UX Lead** | B03 (title case), B04/D09 (success token), D10 (emoji→PixelIcon) | Cần Lead quyết định; KHÔNG tự làm |
| **Deferred — need eye QA** | C01, C02 (P1), B02, C07, A04, A05, A06, D07 | NOT TESTED vòng này (browser unavailable) |

---

## TASK-001 — a11y: trạng thái selected/active qua ARIA

- **Related UI Issues:** B01 (P2)
- **Objective:** Nút lọc/list active hiển thị bằng ARIA, không chỉ màu.
- **Scope:** `PricesModal.tsx`, `ReviewsModal.tsx`, `SupplierModal.tsx`, `RegularsModal.tsx`.
- **Type:** UX / ACCESSIBILITY (presentation-only)
- **Current Behavior:** active filter chỉ bằng màu (teal vs paper), không aria.
- **Expected Behavior:** `aria-pressed={active}` cho filter của Prices/Reviews/Supplier chip; `aria-current="true"` cho khách quen đang chọn trong Regulars.
- **Functional Constraints:** Không đổi state/logic; chỉ thêm thuộc tính.
- **Acceptance Criteria:** Grep/DOM: mỗi filter có ARIA trạng thái khớp render; typecheck/eslint PASS.
- **Regression Risks:** Thấp (attr-only).

## TASK-002 — Touch target nút "Cất vào kho" (WarehouseDock)

- **Related UI Issues:** A01 (P2)
- **Objective:** Nút đạt ≥44px trên touch.
- **Scope:** `WarehouseDock.tsx` L78.
- **Type:** ACCESSIBILITY / REGRESSION (presentation-only)
- **Current Behavior:** inline `minHeight:28px` thắng rule touch `--touch`.
- **Expected Behavior:** Bỏ/đổi inline để rule `data-input=touch` L635 có hiệu lực; giữ chức năng onStowHolding.
- **Acceptance Criteria:** static: không còn inline min-height thấp; typecheck/eslint PASS.
- **Regression Risks:** Desktop nút cao hơn chút — chấp nhận (QA.md).

## TASK-003 — Planogram a11y: label search + clear + touch slot-quick

- **Related UI Issues:** C04 (P2), C05 (P3)
- **Scope:** `StorePlanogramModal.tsx` (input + clear btn), `store-planogram.css` (`.btn-slot-quick`).
- **Type:** ACCESSIBILITY (presentation-only)
- **Expected Behavior:** search input + `.search-clear-btn` có tên accessible; `.btn-slot-quick` min-height ≥36px (nền), touch 44px giữ.
- **Acceptance Criteria:** static; typecheck/eslint/postcss PASS.
- **Regression Risks:** Thấp.

## TASK-004 — Cleanup hook: xoá selector mồ côi + base rule feature-tabs

- **Related UI Issues:** C03 (P3), D11 (P3)
- **Scope:** `responsive.css`.
- **Type:** CONSISTENCY / maintainability (CSS-only)
- **Expected Behavior:** Bỏ `.layout-dpad-btn` mồ côi; gộp bố cục base `.feature-tabs`/`.feature-scroll-tabs` (flex row/gap/wrap) — KHÔNG đổi rule compact, KHÔNG đổi desktop visual.
- **Acceptance Criteria:** postcss parse OK; compact rule giữ nguyên; typecheck/eslint PASS.
- **Regression Risks:** Trung bình — chỉ CSS; phải đảm bảo rule base không đụng compact (bọc `:not([data-density="compact"])` hoặc để base rồi compact override).

## TASK-005 — DaySummary: active tab + primary CTA sticky footer

- **Related UI Issues:** D01 (P2), D02 (P2)
- **Scope:** `DaySummaryModal.tsx`.
- **Type:** UX / VISUAL (presentation-only)
- **Current Behavior:** tab `.pixel-btn active` không có style; primary "Tiếp tục" nằm cuối content, footer default "Trở về tiệm".
- **Expected Behavior:** Tab active có nền/chữ phân biệt (dùng PixelButton variant hoặc base rule `.pixel-btn.active`); truyền `footer` vào PixelDialog cho primary sticky.
- **Acceptance Criteria:** static: typecheck/eslint PASS; one primary; không đổi logic chốt ngày.
- **Regression Risks:** Trung bình — phải giữ nguyên callback của nút "Tiếp tục".

## TASK-006 — Badge base class (Quest/Skills)

- **Related UI Issues:** D03 (P3)
- **Scope:** `responsive.css` (base `.badge`) + `QuestModal.tsx`, `SkillsModal.tsx`.
- **Type:** VISUAL (CSS/markup-only)
- **Expected Behavior:** `<span class="badge">` có nền/viền đọc được theo token (paper/wood/muted); không tạo token mới.
- **Acceptance Criteria:** postcss OK; typecheck/eslint PASS.
- **Regression Risks:** Thấp.

## TASK-007 — Touch target link/input trong dialog

- **Related UI Issues:** D05 (P3), D06 (P3)
- **Scope:** `responsive.css`.
- **Type:** ACCESSIBILITY (CSS-only)
- **Expected Behavior:** `html[data-input="touch"] .dialog-content a` và `... input[type="text"]` đạt `min-height: var(--touch)`.
- **Acceptance Criteria:** postcss OK; typecheck/eslint PASS.
- **Regression Risks:** Thấp (chỉ touch, không đụng desktop).

## TASK-008 — HUD: eyebrow keyboard + token màu

- **Related UI Issues:** A02 (P3), A07 (P3)
- **Scope:** `HUD.tsx`.
- **Type:** ACCESSIBILITY / CONSISTENCY (presentation-only)
- **Expected Behavior:** Danh hiệu active là button/keyboard-operable; màu `#ffd56b` → `var(--sun)`.
- **Acceptance Criteria:** typecheck/eslint PASS; không vỡ HUD.
- **Regression Risks:** Thấp-Trung bình.

## TASK-009 — CoopSleepNotification theo token

- **Related UI Issues:** A03 (P3)
- **Scope:** `CoopSleepNotification.tsx` (+ responsive.css nếu cần).
- **Type:** VISUAL consistency (presentation-only)
- **Expected Behavior:** Bỏ borderRadius tròn + đen kính + bóng mềm; dùng token (viền 3px wood-dark, nền token, góc vuông); giữ text + pointer-events.
- **Acceptance Criteria:** typecheck/eslint PASS; postcss OK.
- **Regression Risks:** Thấp.

## TASK-010 — Analytics heatmap legend/dòng summary

- **Related UI Issues:** D08 (P3)
- **Scope:** `AnalyticsModal.tsx`.
- **Type:** ACCESSIBILITY (presentation + text)
- **Expected Behavior:** Có legend số/thang hoặc dòng "ô cao nhất X lượt" dạng text không cần hover; giữ màu làm phụ.
- **Acceptance Criteria:** typecheck/eslint PASS; không đổi dữ liệu.
- **Regression Risks:** Thấp.

---

## DEFERRED / DESIGN-DECISION (KHÔNG làm vòng này)

| Group | Issue | Lý do |
|---|---|---|
| Eye QA | C01, C02 (P1), B02, C07, A04, A05, A06, D07 | Usability Fit — cần render browser (browser không sẵn); NOT TESTED |
| Lead decision | B03, B04, D09, D10 | Quyết định thiết kế: title-case, token success (đổi index.css), emoji→PixelIcon |

> Nếu chủ dự án khởi chạy browser thật (máy cá nhân) → QA mắt cho nhóm DEFERRED, sau đó có thể quay vòng iterate.

## BA Quality Gate
- [x] Mọi P0/P1: P0=0 (0 issue); P1=2 → C01/C02 đều được map vào DEFERRED + ghi rõ cần QA mắt (không bỏ sót).
- [x] Mọi P2 có acceptance criteria.
- [x] Không task mơ hồ; không đổi logic ngoài scope.
- [x] Mọi task presentation/CSS/markup-only.
