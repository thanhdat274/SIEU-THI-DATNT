# Đợt 16 — Audit toàn bộ modal theo chuẩn Mobile Game UI/UX (tiến trình)

> Trạng thái: **NOT TESTED** (mọi fix suy luận static; chưa QA mắt — môi trường không dev/build/test browser: `spawn EPERM`, headless `Access denied 0x5`, `dist` chỉ bundle cũ).
> Nguyên tắc: chỉ presentation/CSS-compact + className hook, KHÔNG đổi logic/state/API/giá/gameplay.
> Báo trạng thái theo **§25.1 Technical Fit ≠ Usability Fit** (xem `docs/ui/QA.md`): typecheck/eslint/postcss/không-overflow là **Technical Fit**, mới là nền tảng code; không render được browser nên **Usability Fit chưa xác minh → all = NOT TESTED**, không ghi PASS/Mobile Ready.

## 1. Audit song song (workflow, 28 modal)

Kết quả: **27/28 có khe sót**, 1 OK, 1 màn primary action chưa rõ (ChainModal). Chi tiết từng màn trong `tổng hợp.md` + spill (đuôi ~9 màn bị cắt: Cashier/Inventory/Shelf/KitchenStation/Skills/Quest/Analytics — sẽ audit lại theo nhu cầu).

Mẫu khe sót phổ biến (đều sửa presentation-only):
- Hàng nút action gộp primary + flow P1/P2 trên 1 dòng (DiningTable, Chain, Maintenance) → tách primary / cho hàng cuộn ngang.
- Helper/explainer `.muted` dài (P2) chiếm chiều cao đỉnh màn trước P0 (Market, Save, Tax, TimeVote, Warehouse, DaySummary, Stall, LevelRoadmap) → ẩn/clamp trên compact.
- Hàng nút wrap qua **CSS** (không inline) nên rule hệ thống `[style*=flex-wrap]` không chạm → cần rule compact riêng (Save `.save-confirm>div`, StorePlanogram `.planogram-filters`).
- Collateral damage: rule hệ thống `:has(>button)` kẹp 1 hàng cuộn cho thẻ "text+nút" (Security Camera/Công an, Warehouse search+select) → override gói riêng.
- Danh sách chip wrap thành nhiều hàng / cap tạo nested scroll (Regulars) → 1 hàng cuộn ngang.
- Metadata P1/P2 nhồi vào mỗi card (Prices hint, Stall stats/ingredients) → clamp/ellipsis.
- Reset-all / batch action (P2) chiếm đỉnh màn dù disabled (Prices) → ẩn khi disabled.
- Padding inline cứng không co (TimeVote box, LevelRoadmap panel) → !important compact.

## 2. Batch 1 — ĐÃ XỬ LÝ (verify green: typecheck/eslint/postcss/diff)

| Màn | Fix | Hook/rule |
|---|---|---|
| Save | `.save-confirm>div` giữ 1 hàng; ẩn `.info-card .muted` (P2 helper) trên compact | `responsive.css` (CSS-only) |
| Prices | nút reset-all ẩn khi disabled; hint card clamp 1 dòng | `+prices-reset-row`, `+prices-card-hint` + CSS |
| Regulars | list khách quen → 1 hàng cuộn ngang; detail bỏ scroll lồng (overflow !important) | `responsive.css` (CSS-only) |
| Market | ẩn 2 helper `market-helper`; ẩn `span.muted` trong `ul[aria-label="Món cần chú ý"]` | `+market-helper` + CSS |

Verify Batch 1: `yarn typecheck` 0 lỗi · `npx eslint` 4 file 0 lỗi · `postcss` parse OK (61,110) · `git diff --check` sạch.

## 2b. Batch 2 — ĐÃ XỬ LÝ (verify green: typecheck/eslint/postcss/diff)

| Màn | Fix | Hook/rule |
|---|---|---|
| DiningTable | tách primary "Tự dọn bàn" (dòng riêng) khỏi flow giao việc (P2) trên compact | `+dining-actions`, `+dining-assign` + CSS |
| Security | 3 card text+nút (Camera/Bảo vệ/Báo CA) khỏi rule hệ thống ép 1 strip; mô tả giữ nguyên | `+security-grid` + CSS |
| TimeVote | gọn padding box + ẩn ghi chú quy tắc (P2) | `+timevote-box`, `+timevote-note` + CSS |
| Stall | clamp desc/stats/nguyên liệu 1 dòng; hàng action wrap gọn | `+stall-row`, `+stall-actions` + CSS |
| Maintenance | hàng nút bảo trì/sửa/mua wrap tự nhiên (không strip cuộn) | `+maintenance-actions` + CSS |
| StorePlanogram | `.planogram-filters` 1 hàng cuộn; `.summary-stats` giữ 1 hàng; header đổi món clamp 2 dòng | `responsive.css` (CSS-only) |
| Tax | clamp đoạn văn giải thích (P2) trong 2 section Thuế (chỉ nhắm riêng màn này) | `responsive.css` (CSS-only) |

Verify Batch 2: `yarn typecheck` 0 lỗi (4.38s) · `npx eslint` 5 file 0 lỗi · `postcss` parse OK (65,695) · `git diff --check` sạch.

## 2c. Batch 3 — ĐÃ XỬ LÝ (verify green: typecheck/eslint/postcss/diff)

| Màn | Fix | Hook/rule |
|---|---|---|
| Warehouse | search+bộ lọc 2 cạnh nhau (compact); item-actions 2-up; ẩn helper "khu nhận hàng" (P2) | `+warehouse-filter-row` + CSS |
| DaySummary | KPI 2 cột; clamp chân trang tổng kết (P2) | `+day-summary-foot` + CSS |
| Management | giữ touch min-height cho card (lưới card đã chuẩn) | `responsive.css` (`management-card`) |
| LevelRoadmap | ẩn ghi chú cuối "Mở khóa là quyền sử dụng…" (P2) | `+level-roadmap-note` + CSS |
| Titles | tên danh hiệu dài + badge khỏi tràn ngang (wrap + clamp); banner không dồn nút | `+titles-banner`, `+title-row`, `+title-main` + CSS |
| Chain | KPI 2 cột (lưới hub đã chuẩn, feature-tabs đã 1 hàng cuộn) | `responsive.css` (`chain-kpis`) |

Verify Batch 3: `yarn typecheck` 0 lỗi (5.39s) · `npx eslint` 4 file 0 lỗi · `postcss` parse OK (68,645) · `git diff --check` sạch.

## 2d. Batch 4 — ĐÃ XỬ LÝ (verify green: typecheck/eslint/postcss/diff)

| Màn | Fix | Hook/rule |
|---|---|---|
| Cashier | (đã chuẩn: tabs 1 hàng cuộn, footer Thu tiền sticky từ 14D, `.feature-kpis` hook) | — (không cần thêm) |
| Inventory | (đã chuẩn: `.inventory-*` accordion 14C/15) | — (không cần thêm) |
| Shelf | (đã chuẩn: `.action-grid`, `.product-actions`, `.shelf-slot-tabs`) | — (không cần thêm) |
| KitchenStation | (đã chuẩn: `.kitchen-station-tabs` 1 hàng cuộn, hàng recipe `.summary-row`) | — (không cần thêm) |
| Skills | (đã chuẩn: `.perk-row` column + `.perk-desc` clamp, `.feature-tabs`) | — (không cần thêm) |
| Quest | hàng thưởng+nút (QuestRow) wrap 2 dòng thay vì bị `:has(>button)` ép 1 strip cuộn | `+quest-reward-row` + CSS |
| Analytics | select mặt hàng/khoảng có touch min-height | `responsive.css` (`.dialog-content select`) |

Verify Batch 4: `yarn typecheck` 0 lỗi (3.18s) · `npx eslint` QuestModal 0 lỗi · `postcss` parse OK (71,915) · `git diff --check` sạch. ❗ Ghi chú: `responsive.css` có khối "Warehouse mobile (Đợt 15)" do worker nền thêm — không xung đột (rule độc lập); đã rà cascade.

## 2e. Batch 5 — Đợt 17 (QA tiếp: Cashier + Warehouse "Khu nhận hàng" nhiều đơn) — presentation-only

**Bối cảnh:** sau khi QA Warehouse "Kho mát"/"Khu nhận hàng" ở 852×393 (rà trước), chuyển sang audit **Cashier** và tiếp tục xử lý **"Khu nhận hàng" nhiều đơn** của Warehouse. Môi trường sandbox vẫn **không chạy được browser** (`yarn --cwd apps/web dev` fail `spawn EPERM` + `@tailwindcss/oxide` native load — cùng limb đã ghi) → phần này là **suy luận tĩnh từ `data-density="compact"`**, NOT TESTED (cần bạn QA mắt).

| Màn | Audit / Fix | Hook/rule |
|---|---|---|
| **Warehouse — "Khu nhận hàng" nhiều đơn** | danh sách nhiều đơn đang giao nằm cuối modal (trước footer), dòng cuộn theo hộp thoại. Bảo vệ tên món dài khỏi tràn ngang (ellipsis, nhãn "Giao ngày X" neo phải), giữ dòng gọn (padding/gap đã nén 14C) để nhiều đơn không ăn nhiều chiều cao | `responsive.css` (`.pending-item strong` / `.pending-item span`) |
| **Cashier — tab Báo cáo ngày & Lãi lỗ** | Audit 3 tab: (a) Thu ngân — top 3 PixelStat `.summary-row` wrap thích nghi, `.feature-tabs` 1 hàng cuộn (đã hook), product-rows compact, footer sticky "Thu tiền" khi bán (14D); (b) Sổ mua chịu — `.summary-row` mỗi khoản wrap, không tràn; (c) Báo cáo — `.feature-kpis` 2 cột, `.day-report-panel` compact (14D), lịch sử capped theo `--dialog-avail-h`. Chỉ 1 khe còn: đoạn giải thích thuế dài (P2) → clamp 2 dòng | `CashierModal.tsx` (+`.cashier-annual-prose`) + `responsive.css` |

Verify Batch 5: `yarn typecheck` 0 lỗi (6.99s) · `npx eslint` CashierModal 0 lỗi · `postcss` parse OK (74,271; 523 nodes) · `git diff --check` sạch (chỉ cảnh báo LF→CRLF có sẵn). **NOT TESTED** — cần bạn QA mắt ở 852×393 (và 568×320/932×430) cho cashier 3 tab + danh sách Khu nhận hàng nhiều đơn.

## 3. Check tĩnh "từng kích thước" (568×320…932×430, key 852×393) — KHÔNG browser, NOT TESTED

**Phương pháp (read-only, không render):** đọc `responsive.ts` + toàn bộ `responsive.css` (924 dòng) + dialog base (`index.css`/`responsive.css`) + 2 subagent quét tĩnh 28 file modal TSX tìm hằng số px cứng. Không chạy được browser (spawn EPERM / Access denied 0x5) nên **mọi kết luận là suy luận tĩnh, NOT TESTED**.

**Kết luận cấu trúc (vững):**
- Cả 7 viewport mục tiêu đều `data-density="compact"` + `data-short="true"` (do `densityFor` compact khi `height<500 || width<640`; mọi target cao ≤430 < 500) và `data-input="touch"` → `--touch:max(44px,3.1rem)`. Toàn lớp compact + footer-cột-phải + tài khoản nổi áp dụng ở mọi kích thước.
- Dialog base `width:min(780px,100%)`, `max-height:min(100%-kb-h, 760px)` → luôn được đóng khung bởi viewport (kể cả 568×320).
- `--dialog-avail-h = 100dvh - safe - space` (định nghĩa 1 nơi, L300) → mọi `maxHeight:calc(var(--dialog-avail-h)*…)` co theo chiều cao thật (kể cả 320px, không bị bàn phím/Home Indicator che vì `--vb-h`).
- 20 khối `@media` trong responsive.css đều là viewport/orientation (min/max-width, min/max-height, orientation) — **không có breakpoint theo tên/model thiết bị** (đúng luật dự án).
- `@media (max-height:340px)` (568×320) có xử lý riêng cho Supplier (bỏ phụ đề header, tab tiền 1 hàng); store-layout `-230px` đã có override `max-height:499px` → `min(avail-h, 44vh)`.

**Kết quả 2 subagent (28 modal): không file nào có hằng số px cứng tràn 568×320.** Mọi hằng số lớn đều là max-cap responsive (SVG `width:100%`+maxWidth, board aspect-ratio, grid `1fr`, `min(…,100%)`) hoặc `maxHeight` đã buộc vào `--dialog-avail-h`.

**Hardening phòng thủ (đã áp, presentation-only, verify green):**
| Chỗ yếu | Fix |
|---|---|
| `.fixture-slots-grid` `minmax(260px,1fr)` vốn chỉ được cứu bởi `@container` | thêm `.fixture-slots-grid{grid-template-columns:1fr!important}` vào lớp compact |
| TitlesModal list `min(380px, calc…)` — mốc px lớn nhất, chưa có clamp compact | `+title-list` + `.title-list{max-height:calc(var(--dialog-avail-h)*0.6)!important}` |
| ChainModal transfer list `min(260px, calc…)` | `+chain-transfer-list` + clamp `*0.45` |

**VERIFY hardening:** `yarn typecheck` 0 lỗi (2.73s) · `npx eslint` Titles+Chain 0 lỗi · `postcss` OK (73,125) · diff sạch. Vẫn **NOT TESTED** — cần bạn QA mắt ở 568×320, 852×393, 932×430 (đặc biệt AnalyticsModal heatmap, StoreLayoutModal board 16 cột, SupplierModal 568×320).
## 3. Còn lại (lần lượt tiếp ở các đợt sau)

- **Batch 2:** DiningTable (tách primary dọn bàn), Maintenance (hàng nút cuộn ngang), StorePlanogram (`.planogram-filters` 1 hàng, `.summary-stats` nowrap, change-product header clamp), Stall (stall-actions wrap + clamp ingredients/stats), Security (thẻ Camera/Công an khỏi rule cuộn 1 hàng + clamp desc), TimeVote (ẩn note + co padding), Tax (badge nowrap + gom section P2 accordion + clamp prose).
- **Batch 3:** Warehouse (ẩn P2 context + sửa search+select 2-control + item-action 2-up), DaySummary (primary lên footer sticky + ẩn breakdown P2 + clamp tips), Management (co section header + touch min-height), LevelRoadmap (accordion XP + co panel), Titles (tránh tràn ngang tên dài), Chain (tách primary Chuyển hàng/Thuê quản lý).
- **Batch 4:** Cashier, Inventory, Shelf, KitchenStation, Skills, Quest, Analytics (đuôi audit bị cắt — audit lại từng màn rồi sửa).

Mỗi màn: Feature Audit → đối chiếu → sửa presentation-only → verify → ghi vào `tổng hợp.md`. Không commit/push.
