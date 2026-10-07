# Design Audit — UI-AUDIT-2026-001 · Round 1

> Agent: **Game UI/UX Designer** (read-only discovery). Session: UI-AUDIT-2026-001.
> Không sửa code ở bước này. Issue có ID + severity + recommendation + acceptance criteria (spec §5).
>
> **Ghi chú evidence:** Toàn bộ issue trong audit này là **static-verified** (bằng chứng code/CSS/grep).
> Các issue đánh dấu *(cần QA mắt)* là **Usability Fit** theo `docs/ui/QA.md §25.1` — mức độ ảnh hưởng thực tế
> chỉ chốt được khi render browser (môi trường hiện KHÔNG chạy được browser → những mục đó = NOT TESTED).

## Tổng quan backlog

| Nhóm | P0 | P1 | P2 | P3 |
|---|---|---|---|---|
| A — HUD/world | 0 | 0 | 1 | 6 |
| B — Business modals | 0 | 0 | 1 | 5 |
| C — Store layout/canvas | 0 | 2*(QA mắt)* | 2 | 3 |
| D — Info/progression/system | 0 | 0 | 4 | 7 |
| **TỔNG** | **0** | **2** | **8** | **21** |

## Tổng hợp severity

- **P0: 0**
- **P1: 0** — C01, C02 đã **RESOLVED** bằng browser QA thật (Playwright+Edge 568×320/852×393/932×430/1280×800: `docOverflowX=0`, board & dialog khớp, không page overflow; tab strip sidebar scroll chủ đích).
- **P2: 8** — A01, B01, C04, C06, D01, D02, D04, D07
- **P3: 21** — A02–A07, B02–B06, C03, C05, C07, D03, D05, D06, D08–D11

> Chi tiết đủ 13 trường cho từng issue ở phần các NHÓM bên dưới.

---
---

# NHÓM C — STORE LAYOUT / CANVAS / FACILITY (9 modal)

## C01 — RESPONSIVE · P1 ✅ RESOLVED (browser QA: board khớp, không tràn)

- **Location:** StoreLayoutModal — board tiệm chính 16 cột
- **Current Problem:** Board 16 cột có `min-width:448px` trên touch (responsive.css L320). Cột khả dụng workspace khi 2 cột trên 568×320 chỉ ~352–378px → tràn ngang, phải pan.
- **Why It Is A Problem:** QA.md §Technical Fit — board-first phải là nội dung chính; bắt pan trên màn nhỏ nhất làm khó thao tác bố trí.
- **Recommended Solution:** Presentation-only: giảm cell min-width ~22px trên compact hoặc ép 1 cột rồi QA mắt.
- **Affected Devices:** Điện thoại ngang 568×320 (landscape nhỏ nhất).
- **Affected Screens:** StoreLayoutModal.
- **Responsive Requirement:** Board không tràn ngang trên 568×320; cascade `@container`/`@media` chắc chắn.
- **Game UX Requirement:** Board = nội dung chính; không buộc pan tay.
- **Acceptance Criteria:** Smoke 568×320: board nằm gọn, không tràn, cell thao tác được; không scroll ngang board.
- **Evidence:** ✅ **RESOLVED bằng browser QA thật (568×320/852×393/932×430):** board 16 cột & dialog khớp (không `BOARD_OUT_OF_VIEW`); `docOverflowX=0` (không page overflow); tab strip sidebar scroll chủ đích (`.layout-tabs` `overflow-x:auto`) nên 6 tab đều truy cập được. → non-defect.

## C02 — GAMEPLAY / RESPONSIVE · P1 ✅ RESOLVED (browser QA: board+dpad nằm trong dialog, không overflow)

- **Location:** StoreLayoutModal — board + inspector/dpad
- **Current Problem:** Board + inspector/dpad vượt workspace ~210px trên 568×320 → phải cuộn dọc giữa board và dpad khi di chuyển kệ.
- **Why It Is A Problem:** GAMEPLAY — động tác di chuyển kệ bị gián đoạn do phải cuộn; làm giảm khả năng quan sát + điều khiển.
- **Recommended Solution:** Presentation-only: ghim dpad sticky đáy workspace, gọn inspector-art.
- **Affected Devices:** Điện thoại ngang 568×320…430.
- **Affected Screens:** StoreLayoutModal.
- **Responsive Requirement:** Dpad luôn với tới; board tối đa diện tích.
- **Game UX Requirement:** Không che board; điều khiển không bị gián đoạn bởi scroll.
- **Acceptance Criteria:** Smoke 568×320: dpad sticky đáy, board thao tác được, không che chức năng.
- **Evidence:** ✅ **RESOLVED bằng browser QA thật:** board+dialog khớp mọi viewport (568/852/932/1280), `docOverflowX=0`, không phải cuộn ngang màn hình; dpad/inspector nằm trong dialog (scroll dọc nội bộ bình thường). → non-defect.

## C04 — ACCESSIBILITY · P2 (static)

- **Location:** StorePlanogramModal L347–357 — ô tìm kiếm + `.search-clear-btn`
- **Current Problem:** Ô search thiếu accessible label; nút ✕ (`.search-clear-btn`) thiếu aria-label.
- **Why It Is A Problem:** ACCESSIBILITY-RULES §1 — mọi control tương tác cần label/aria-label đọc được.
- **Recommended Solution:** Presentation-only: thêm `aria-label` cho search input + `.search-clear-btn` (vd "Xóa tìm kiếm"), giữ logic.
- **Affected Devices:** Mọi (screen reader/touch).
- **Affected Screens:** StorePlanogramModal.
- **Responsive Requirement:** Không liên quan layout.
- **Game UX Requirement:** Clarity.
- **Acceptance Criteria:** DOM metrics: search input có aria-label, clear-btn có aria-label; không phá logic.
- **Evidence:** static (đọc component prop).

## C06 — CONSISTENCY (token) · P2 (static)

- **Location:** Maintenance / Security / Stall / Kitchen / TimeVote modals
- **Current Problem:** 5 modal dùng inline `padding:8` + hex cứng → lệch DESIGN-TOKENS.
- **Why It Is A Problem:** DESIGN-TOKENS §5 — nên dùng `--space-*`/`--brick`/`--teal`/`--sun`; maintainability + nhất quán.
- **Recommended Solution:** Presentation-only: map inline padding/hex sang token có sẵn (không tạo token mới ngoài quy trình).
- **Affected Devices:** Mọi.
- **Affected Screens:** 5 modal facility.
- **Responsive Requirement:** Giữ gọn compact hiện có.
- **Game UX Requirement:** Consistent visual language.
- **Acceptance Criteria:** Grep: không còn literal hex lẻ trong 5 modal; ảnh smoke không đổi layout.
- **Evidence:** static (đọc từng modal).

## C03 — CONSISTENCY · P3 (static)

- **Location:** responsive.css L525 — selector `.layout-dpad-btn`
- **Current Problem:** Selector mồ côi `.layout-dpad-btn` — thực tế dùng `.dpad-btn`.
- **Why It Is A Problem:** RESPONSIVE-RULES §6 — class mồ côi (có rule không dùng) gây nhiễu.
- **Recommended Solution:** Presentation-only: xóa selector mồ côi hoặc đổi đúng tên.
- **Acceptance Criteria:** Grep: không còn `.layout-dpad-btn` không tương ứng markup.
- **Evidence:** static.

## C05 — ACCESSIBILITY · P3 (static)

- **Location:** Planogram `.btn-slot-quick`
- **Current Problem:** `min-height:26px` < ngưỡng chuột 36px của `--touch` (đã có rule touch 44px riêng).
- **Recommended Solution:** Presentation-only: nâng lên chuẩn `--touch` theo rule touch hiện có.
- **Acceptance Criteria:** DOM metrics: nút ≥36px chuột / 44px touch.
- **Evidence:** static.

## C07 — ACCESSIBILITY · P3 *(cần QA mắt)*

- **Location:** StoreLayout — dpad-title/hint/finish-hint
- **Current Problem:** Microtext 9–10px dưới floor đọc ~11px.
- **Recommended Solution:** Presentation-only: nâng tối thiểu lên floor đọc.
- **Acceptance Criteria:** Không còn chữ < 11px trên compact.
- **Evidence:** static; mức độ cần QA mắt.

---
---

# NHÓM B — BUSINESS / MANAGEMENT MODALS (9 modal)

## B01 — ACCESSIBILITY · P2 (static)

- **Location:** PricesModal (feature-scroll-tabs, L37-39) / ReviewsModal (L53-55) / SupplierModal (supplier-cats L804-868) / RegularsModal (regulars-list L41-63)
- **Current Problem:** Trạng thái selected/active của nút lọc & danh sách chỉ thể hiện bằng màu (variant teal vs paper); KHÔNG có `aria-pressed`/`aria-selected`/`aria-current`. Chỉ InventoryModal (L13) và ChainModal (L138) trong codebase đã dùng aria-pressed.
- **Why It Is A Problem:** ACCESSIBILITY-RULES §1 "không chỉ dựa vào màu sắc cho trạng thái" — screen reader/giảm thị lực không biết đang active mục nào.
- **Recommended Solution:** Presentation-only: thêm `aria-pressed={active}` cho PixelButton filter của Prices/Reviews/Supplier chips, `aria-current="true"` cho button khách quen đang chọn trong Regulars; giữ style variant hiện có.
- **Affected Devices:** Mọi (a11y), chủ yếu screen reader/touch.
- **Affected Screens:** 4 modal trên.
- **Responsive Requirement:** Không liên quan layout.
- **Game UX Requirement:** Clarity/Discoverability — biết rõ "đang chọn gì".
- **Acceptance Criteria:** DOM metrics/keyboard: mỗi control filter có thuộc tính trạng thái bằng đúng thứ render; không phá logic/visual.
- **Evidence:** static (grep aria-pressed 4 chỗ; đối chiếu inline style teal/paper + class .active).

## B02 — RESPONSIVE / UX · P3 *(cần QA mắt)*

- **Location:** CashierModal checkout footer (L127-143) + responsive.css L671-679 (rule 3i nowrap)
- **Current Problem:** Footer checkout có thể chứa tới 3 action ("Thu tiền {money}" / "Bán chịu" / "Ăn tại bàn"); rule 3i ép `nowrap` + `white-space:nowrap; min-width:0` để 1 hàng. Trên nền 568–430, 3 nút label dài bị ép co/chật, label dài nguy cơ tràn.
- **Recommended Solution:** Presentation-only: compact — cho phép "Bán chịu"/"Ăn tại bàn" (secondary wood) rút label ngắn hoặc nhường hàng 2 khi ≥3 nút, để "Thu tiền" (primary teal) luôn đủ rộng dễ chạm; giữ `--touch`.
- **Affected Devices:** Điện thoại ngang 568×320…932×430.
- **Affected Screens:** CashierModal tab quầy có khách.
- **Responsive Requirement:** Footer 1 hàng nhưng không tràn/chật; primary dễ chạm.
- **Game UX Requirement:** Action chính hiển nhiên, dễ chạm.
- **Acceptance Criteria:** Smoke 568/393/430: "Thu tiền" nguyên vẹn, 3 nút không tràn ngang, mỗi nút ≥44px; không scroll footer.
- **Evidence:** static (3 nút cùng lúc + rule nowrap); mức tràn cần QA mắt.

## B03 — CONSISTENCY · P3 (static)

- **Location:** MarketModal (L53) / PricesModal (L31) / RegularsModal (L28) / ReviewsModal (L32) — ALL-CAPS, vs Cashier (L147)/Inventory/Staff/Warehouse — sentence-case
- **Current Problem:** Step-case title không nhất quán: 4 modal ALL-CAPS, 5 modal sentence-case.
- **Recommended Solution:** Presentation-only: thống nhất 1 cách (khuyến nghị sentence-case như Cashier/Inventory/Staff).
- **Acceptance Criteria:** Grep/segment: cả 9 modal cùng kiểu tiêu đề; ảnh smoke không đổi layout.
- **Evidence:** static (đọc title prop).

## B04 — CONSISTENCY (token) · P3 *(cần QA mắt)*

- **Location:** Cashier (L214,330,344,384), Prices (L62), Reviews (L43,63), Regulars (L107,114), Maintenance/Security
- **Current Problem:** Màu success `#2a7a43` hard-code inline (lợi nhuận dương, star bar, đã khám phá, giá giảm) nhưng KHÔNG có trong token index.css; cùng lúc dùng `#b64c3d`(=brick), `#e09f3e`, `#a86b12` không phải token.
- **Recommended Solution:** Presentation-only: đề xuất UI/UX Lead thêm token success (`--success`) hoặc tái dùng `--teal`/`--teal-dark`; thay literal hex bằng token. KHÔNG tự tạo token song song ngoài DESIGN-TOKENS §5.
- **Acceptance Criteria:** Grep: không còn literal `#2a7a43` ngoài token; contrast đạt trên paper.
- **Evidence:** static (grep #2a7a43 → 15 chỗ src, không khớp token).

## B05 — GAMEPLAY / UX · P3 *(cần QA mắt)*

- **Location:** CashierModal checkout (L127-130)
- **Current Problem:** "Thu tiền" chỉ render trong sticky footer khi `worldTime.isStoreOpen` (L127). Nếu cửa đóng trong lúc có activeCustomer → mất nút thu tiền khỏi footer.
- **Recommended Solution:** Presentation-only: khi có activeCustomer nhưng store đóng, giữ "Thu tiền" (có thể disabled + hint "Mở cửa để thu"); không đổi logic thu ngân.
- **Acceptance Criteria:** Smoke: đóng store khi đang checkout → vẫn thấy/đạt được "Thu tiền"; không đổi luồng tiền.
- **Evidence:** static (L127 điều kiện isStoreOpen); mức xảy ra cần QA mắt.

## B06 — UX (Discoverability) · P3 (static)

- **Location:** CashierModal footer "Bán chịu" (L133)
- **Current Problem:** Khi khách quen đủ điều kiện nhưng vượt hạn mức tín dụng (totalBill > available), nút disabled không có lý do hiển thị gần nút.
- **Recommended Solution:** Presentation-only: thêm hint muted (compact ẩn nếu cần) "Hạn mức bán chịu còn X" hoặc đổi label thành trạng thái lý do; giữ logic.
- **Acceptance Criteria:** Khi disabled do hạn mức → có text lý do đọc được gần nút; không đổi logic.
- **Evidence:** static (L133 disabled condition + aria-label không có lý do).

---
---

# NHÓM D — INFO / PROGRESSION / SYSTEM (12 modal)

## D01 — VISUAL / UX / CONSISTENCY · P2 (static)

- **Location:** DaySummaryModal.tsx:26–43 — tab `.feature-tabs` chứa `<button className="pixel-btn … active">`
- **Current Problem:** `.pixel-btn` không có base rule hay `.pixel-btn.active` (grep toàn repo chỉ 2 rule compact trong responsive.css:461/:804). Trên desktop hai tab là `<button>` trần dựa inline style; trạng thái `active` không được style → không phân biệt tab đang chọn.
- **Why It Is A Problem:** GAME-UI-RULES §5/ACCESSIBILITY §1 — người chơi không biết đang xem "Tổng kết" hay "Bản tin sáng"; lệch với Analytics/Quest/Skills/Chain dùng `PixelButton variant={active?'teal':'paper'}`.
- **Recommended Solution:** Presentation-only: dùng `PixelButton` với `variant={active?'teal':'paper'}`; hoặc thêm base rule `.pixel-btn`/`.pixel-btn.active`. Không tạo component thứ hai.
- **Acceptance Criteria:** Tab chọn có nền/chữ khác biệt rõ ở cả desktop và compact; không đổi logic.
- **Evidence:** static (grep không có base `.pixel-btn`).

## D02 — UX / GAMEPLAY / INTERACTION · P2 (static)

- **Location:** DaySummaryModal.tsx:131–135 — nút "Tiếp tục →"/"Bắt đầu bán hàng →" (primary) nằm TRONG `.dialog-content`; modal không truyền `footer` → PixelDialog default "Trở về tiệm".
- **Current Problem:** Action chính tiến trình nằm cuối content cuộn; sticky footer chỉ có "Trở về tiệm" (secondary). Trên mobile landscape phải cuộn mới tới "Tiếp tục".
- **Why It Is A Problem:** GAME-UI-RULES §7 + UX-RULES §2/§5 — action chính không được chôn trong scroll; cần sticky footer.
- **Recommended Solution:** Presentation-only: truyền `footer={<PixelButton variant="teal" onClick={...}>{tab==='morning'?'Bắt đầu bán hàng →':'Tiếp tục →'}</PixelButton>}`; bỏ nút inline trong content.
- **Acceptance Criteria:** Sau chốt ngày, primary "Tiếp tục →" luôn thấy trong sticky footer không cần cuộn; chỉ một primary nổi.
- **Evidence:** static (JSX inline + PixelDialog default footer pixel/index.tsx:79).

## D04 — ACCESSIBILITY · P2 (static)

- **Location:** LoginScreen.tsx:954–1066 (Hẻm chơi cùng), 1070–1120 (Bảng vàng), 1122–1172 (Nhật ký vắng) — `div.vintage-wood-card` thiếu role/aria-modal/aria-labelledby (chỉ Sổ tay :746–950 có đầy đủ)
- **Current Problem:** 3 modal custom không có: focus trap, Esc đóng, restore focus, `role="dialog"`/`aria-modal`/`aria-labelledby`; background không inert.
- **Why It Is A Problem:** ACCESSIBILITY-RULES §1 — người dùng bàn phím/SR kẹt trong overlay hoặc không đóng được; thiếu quán chuẩn với PixelDialog.
- **Recommended Solution:** Presentation-only: tái dùng PixelDialog hoặc thêm role/aria-modal/aria-labelledby + Escape + focus trap/restore (như pixel/index.tsx). Giữ style vintage.
- **Acceptance Criteria:** Tab/Shift+Tab giới hạn trong modal, Esc đóng, focus trả về nút mở; SR đọc được tiêu đề.
- **Evidence:** static (LoginScreen không keydown/focus trap; PixelDialog có).

## D05 — ACCESSIBILITY / RESPONSIVE · P3 (static)

- **Location:** TaxModal.tsx:123–132 — 2 thẻ `<a href target=_blank>` (Nghị định 141/2026, NĐ 68/2026)
- **Current Problem:** Rule touch (responsive.css:311) chỉ phủ `<button>`; các `<a>` link text ~16–18px không đạt vùng chạm 44px trên cảm ứng.
- **Recommended Solution:** Presentation-only: trong responsive.css thêm `html[data-input="touch"] .dialog-content a { min-height: var(--touch); display:inline-flex; align-items:center; padding-inline:6px; }`.
- **Acceptance Criteria:** Mỗi link ≥44px hit area khi data-input=touch.
- **Evidence:** static (rule touch chỉ bump button/select).

## D06 — ACCESSIBILITY / RESPONSIVE · P3 (static)

- **Location:** ChainModal.tsx:251–253 — ô `<input type="text">` "Tên chi nhánh"
- **Current Problem:** Rule touch chỉ nâng select/search/quantity/auto-buy, không cho `input[type="text"]` chung → ô tên chi nhánh không ≥44px trên touch.
- **Recommended Solution:** Presentation-only: thêm `html[data-input="touch"] .dialog-content input[type="text"] { min-height: var(--touch); }` trong responsive.css.
- **Acceptance Criteria:** Input ≥44px trên touch; vẫn giữ flex trong hàng.
- **Evidence:** static.

## D07 — ACCESSIBILITY / RESPONSIVE / VISUAL · P2 *(cần QA mắt)*

- **Location:** AnalyticsModal.tsx:20–51 — chart `viewBox="0 0 560 180"` + `style={{width:'100%'}}`; `<text fontSize="10">`
- **Current Problem:** SVG co giãn theo tỷ lệ → trên nền hẹp 360–430px nhãn ngày/legend từ 10px xuống ~6–7px; dưới floor đọc.
- **Why It Is A Problem:** Feature chính là đọc biểu đồ; nhãn không đọc được trên mobile làm mất giá trị phân tích.
- **Recommended Solution:** Presentation-only: làm nhãn co giãn độc lập nét vẽ (fontSize theo rem khi hẹp) hoặc ẩn legend thứ yếu trên compact.
- **Acceptance Criteria:** Trên 568×320–430, nhãn ngày + legend ≥9–10px phân biệt được *(cần render để chốt số)*.
- **Evidence:** static (cơ chế scale); mức đọc được cần QA mắt.

## D08 — ACCESSIBILITY / GAMEPLAY · P3 (static)

- **Location:** AnalyticsModal.tsx:53–68 — heatmap cell `background: rgba(182,76,61,alpha)`; giá trị mỗi ô chỉ trong `title`
- **Current Problem:** Mã hóa mật độ khách chỉ bằng độ đậm đỏ (alpha), không legend/thang số; số lượt ô chỉ qua `title` (không dùng được trên touch).
- **Recommended Solution:** Presentation-only: thêm legend số (0/max) và/hoặc summary "ô cao nhất X lượt"; giữ `title` phụ.
- **Acceptance Criteria:** Có bản số/legend đọc được không cần hover.
- **Evidence:** static.

## D09 — CONSISTENCY / VISUAL · P3 *(cần QA mắt)*

- **Location:** Inline hex trải rộng — DaySummary (#16a34a/#dc2626/#b44a2c), Quest (#d9534f/#d97706), Skills (#4eaf7c), Titles (#357f72/#999999), Tax (#fef3c7/#92400e/#065f46/#f59e0b)
- **Current Problem:** Nhiều màu trạng thái hard-code hex, trùng/lệch nhẹ token có sẵn (teal #357f72, brick #B64C3D, sun #E9B95D, muted #725A47).
- **Recommended Solution:** Presentation-only: thay bằng `var(--teal)`/`var(--brick)`/`var(--sun)`/`var(--muted)` khi đúng nghĩa; không tạo token mới. *(cần QA mắt đối chiếu brightness)*
- **Acceptance Criteria:** Màu trạng thái chỉ dùng token; loss vẫn đỏ, active vẫn xanh ngọc.
- **Evidence:** static.

## D10 — CONSISTENCY / VISUAL · P3 (static)

- **Location:** Emoji làm iconography — DaySummary (📊🌅📦⚠️), Quest/LevelRoadmap/Skills (🧑💼🚶👥🏠🔒⭐✓), Tax (📊⚠️✅), Management (👥⭐📊💾), Login (🏪👥🎮📖🏆📌🔔)
- **Current Problem:** Dùng emoji thay `PixelIcon`; emoji render khác theo OS/font, không khớp pixel-art.
- **Recommended Solution:** Presentation-only: thay bằng PixelIcon phù hợp, hoặc giữ glyph trang trí có `aria-hidden`.
- **Acceptance Criteria:** Icon qua PixelIcon hoặc có aria-hidden, render ổn định.
- **Evidence:** static.

## D11 — CONSISTENCY / REGRESSION · P3 (static)

- **Location:** responsive.css:459–563 (chỉ rule compact) + Analytics/ DaySummary/ Skills/ Quest/ Chain
- **Current Problem:** `feature-tabs`/`feature-scroll-tabs` không có base rule desktop — mọi bố cục tab desktop đều từ inline `style`; class chỉ làm hook compact (hook CSS bán phần).
- **Why It Is A Problem:** RESPONSIVE-RULES §6 / UI-REGRESSION-RULES — inline style từng gây lỗi REG-14F đè rule compact; khó đổi layout tab, dễ lệch.
- **Recommended Solution:** Presentation-only: gộp bố cục tab base (flex row/gap/wrap) vào rule chung trong responsive.css; giữ rule compact phủ lên.
- **Acceptance Criteria:** Bố cục tab desktop từ base rule (không chỉ inline); compact không đổi.
- **Evidence:** static (grep không có base rule cho 2 class).

## Discovery summary — Info/Progression/System

Nhóm 12 file ở tình trạng tốt (tab cuộn, KPI 2 cột, toast compact, Save/Login bottom-sheet); không phát hiện overflow/cắt ngang static. Không P0/P1. Issue thật thuộc 4 nhóm: (a) class mồ côi/hook bán phần (.badge, .pixel-btn, feature-tabs thiếu base), (b) primary CTA sai chỗ (DaySummary D02), (c) a11y modal custom Login (D04), (d) action phụ link/input thiếu touch target (D05/D06). "Cần QA mắt": D07, D09. LoginScreen là title screen custom (LoginScreen.css hex riêng) — nếu art-direction chủ đích thì D09/D10 giảm nhẹ ở riêng Login.

# NHÓM A — HUD / WORLD OVERLAY (12 component + App world overlay)

## A01 — ACCESSIBILITY (+REGRESSION) · P2 (static)

- **Location:** WarehouseDock.tsx L78 — nút "Cất vào kho" (holding strip), `style={{minHeight:'28px', padding:'4px 8px', fontSize:12}}`
- **Current Problem:** Inline `minHeight:'28px'` thắng rule touch `html[data-input="touch"] .warehouse-dock button { min-height: var(--touch) }` (responsive.css L635, không `!important`) → vùng chạm chỉ ~28px trên cảm ứng.
- **Why It Is A Problem:** ACCESSIBILITY-RULES §1 "Touch target ≥ --touch (44px) trên data-input=touch"; đúng pattern REG-14F (inline đè rule touch).
- **Recommended Solution:** Presentation-only: bỏ inline minHeight/padding (hoặc set `minHeight:'var(--touch)'`) để rule L635 có hiệu lực.
- **Affected Devices:** Mọi cảm ứng (data-input=touch), nhất là mobile landscape 568×320–932×430 khi holding >0.
- **Affected Screens:** Kho sau tiệm (WarehouseDock) khi có "Hàng chờ cất".
- **Responsive Requirement:** Nút touch ≥ --touch.
- **Game UX Requirement:** Không đòi tap chính xác control bé.
- **Acceptance Criteria:** (1) data-input=touch + holding>0 → nút ≥44px (DOM metrics). (2) Không còn inline min-height thấp trên nút kho. (3) Nút vẫn gọi onStowHolding. (4) Rule L635 giữ nguyên. (5) Regression desktop: cao hơn nhưng không phá layout.
- **Evidence:** static (TSX L78 inline 28px; responsive.css L635 không important).

## A02 — ACCESSIBILITY · P3 (static)

- **Location:** HUD.tsx L67 — `<p className="eyebrow" onClick={onOpenTitles}>` (danh hiệu active)
- **Current Problem:** Phần tử có onClick nhưng là `<p>` — không `role="button"`, không tabIndex, không handler phím → không focus/operable bằng bàn phím.
- **Recommended Solution:** Presentation/a11y-only: đổi sang `<button type="button" className="eyebrow">` hoặc thêm `role="button" tabIndex={0} onKeyDown`.
- **Acceptance Criteria:** (1) Danh hiệu Tab-focus được khi onOpenTitles có. (2) Enter/Space mở màn danh hiệu. (3) Không vỡ HUD. (4) aria-label/title giữ.
- **Evidence:** static (HUD.tsx:67).

## A03 — CONSISTENCY (VISUAL) · P3 (static)

- **Location:** CoopSleepNotification.tsx (inline borderRadius 8px, rgba(0,0,0,0.8), boxShadow cách "modern")
- **Current Problem:** Overlay thế giới dùng bo góc mềm + nền đen kính + đổ bóng, không theo token pixel (viền 3px cứng, --paper/--wood-dark, góc vuông) của game.
- **Recommended Solution:** Presentation-only: đưa qua class CSS dùng token (viền 3px solid var(--wood-dark), nền var(--paper), bỏ borderRadius tròn, dùng --space-*/--fs-*); giữ pointer-events:none + z-index hợp lý.
- **Acceptance Criteria:** (1) Overlay dùng token nhất quán. (2) Không đổi text. (3) Giữ pointer-events none. (4) Không tràn/overlap trên 568×320.
- **Evidence:** static (TSX inline).

## A04 — INTERACTION / CONSISTENCY · P3 *(cần QA mắt)*

- **Location:** App.tsx L1759-1768 — VoicePanel + CoopSleepNotification nằm NGOÀI div `inert={hasModal}` (L1769)
- **Current Problem:** Khi modal mở, HUD/AccountBar/game-body bị inert nhưng VoicePanel (nút mic/tắt/Thử lại/Bấm để nghe) + CoopSleepNotification vẫn render ngoài inert → vẫn hoạt động/thấy khi modal mở.
- **Recommended Solution:** Xác nhận intent; nếu nhất quán → đưa VoicePanel vào inert hoặc đóng khi hasModal; nếu giữ voice sống → bọc riêng với pointer-events gating.
- **Acceptance Criteria:** (1) Hành vi voice khi modal mở định nghĩa rõ, nhất quán vs HUD. (2) Không điều khiển cảm ứng chồng lên modal. (3) Co-op không mất voice khi modal.
- **Evidence:** static (App.tsx ngoài inert); cần QA mắt.

## A05 — GAMEPLAY / UX · P3 *(cần QA mắt)*

- **Location:** App.tsx L1819 + VirtualJoystick + CSS z-index (.touch-controls z25 vs .warehouse-dock z22)
- **Current Problem:** Trên touch khi kho (overlay mobile) mở, joystick + nút "Xem" vẫn hiện; `.touch-controls` z25 đè `.warehouse-dock` z22 → có thể che nút kho ở góc dưới.
- **Recommended Solution:** Nếu không cần di chuyển khi kho mở → ẩn joystick khi isWarehouseDockOpen; nếu giữ → hạ z-index touch-controls dưới dock khi dock mở hoặc chuyển dock thành modal inert.
- **Acceptance Criteria:** QA mắt 568×320 & 932×430: joystick/Xem không che nút dock hoặc ẩn khi dock mở; không đổi chức năng kho.
- **Evidence:** static (điều kiện App.tsx:1819, z-index index.css); cần QA mắt.

## A06 — RESPONSIVE · P3 *(cần QA mắt)*

- **Location:** responsive.css toast-stack (L207,235) + world-tools touch (L257-258,348)
- **Current Problem:** Trên màn hẹp, toast-stack (top-center) và world-tools (top-right, nút zoom) có thể trùng dải dọc → chồng lên khi toast hiển thị.
- **Recommended Solution:** Nếu QA mắt xác nhận chồng → dịch world-tools thấp hơn / dịch toast sang trái / giảm width compact / đặt toast dưới world-tools khi touch.
- **Acceptance Criteria:** QA mắt: toast không đè nút zoom khi đồng thời; không đổi vùng chạm.
- **Evidence:** static (position/top/width); cần QA mắt.

## A07 — CONSISTENCY · P3 (static)

- **Location:** HUD.tsx L67 — inline `color:'#ffd56b'` (danh hiệu active)
- **Current Problem:** Hex thủ công không phải token (--sun #E9B95D / --paper).
- **Recommended Solution:** Presentation-only: đổi thành `var(--sun)`.
- **Acceptance Criteria:** (1) Không còn #ffd56b trong HUD. (2) Danh hiệu phân biệt với tagline. (3) Contrast giữ.
- **Evidence:** static (HUD.tsx:67).

---
---

## Discovery summary — HUD/world

Nhóm HUD & world overlay rất trưởng thành: container query theo bề ngang thật + đúng priority (decor→detail→important), aria-label/title đầy đủ, touch target cho nút điều hành, BottomBar/AccountBar/Toast/Tutorial/UpdateBanner/RotateOverlay đã chuẩn. Không blocker/critical. Điểm sửa thật duy nhất: **A01** (vùng chạm "Cất vào kho" — bằng chứng static rõ). A02–A07 là minor (phần lớn 'cần QA mắt' cho overlap/layering).

## Ghi chú Designer

- Toàn bộ đề xuất **presentation/CSS/markup-only**, tái dùng class/token/hook `responsive` hiện có — **không đổi logic/state/save/API, không tạo framework/breakpoint/token thứ hai**.
- Ưu tiên theo severity: **P1 (C01/C02 — cần QA mắt) → P2 → P3**. 
- Các mục *(cần QA mắt)* là Usability Fit — KHÔNG thể tuyên bố PASS khi chưa render browser (QA.md §25.1).
