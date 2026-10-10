# TEST-REPORT — UI-AUDIT-2026-001 · Round 1

> Agent: **Tester**. Test theo 4 lớp (Functional / Responsive / Visual / Regression) cho các Task đã implement (BA-SPEC).
> **Trạng thái (QA.md §25.1):** Môi trường KHÔNG chạy được browser → chỉ `STATIC VERIFIED`; mọi phần trực quan (ảnh mắt) = **NOT TESTED**. Không tuyên bố pass trực quan khi chưa render.

## Phạm vi test
Task đã implement (DEV-REPORT): TASK-001 (B01), 002 (A01), 003 (C04/C05), 005 (D01/D02), 006 (D03), 007 (D05/D06), 008 (A02/A07), 009 (A03), 010 (D08).

## Layer 1 — Functional (static)

| # | Task/Issue | Check | Status | Evidence |
|---|---|---|---|---|
| F1 | B01 | aria-pressed/aria-current khớp thứ render, không đổi state | STATIC VERIFIED | grep: Prices L36/38, Reviews L54, Supplier L807/852, Regulars aria-current; logic `setFilter/setCategory/setSelectedId` không đổi |
| F2 | A01 | onStowHolding vẫn gọi; bỏ chỉ minHeight | STATIC VERIFIED | code giữ `onClick={()=>onStowHolding()}` |
| F3 | C04 | search onChange + clear setSearchQuery('') giữ nguyên | STATIC VERIFIED | code không đổi logic |
| F4 | D01/D02 | `onClose` (Tiếp tục) giữ nguyên; tab setTab giữ | STATIC VERIFIED | typecheck PASS; footer onClick={onClose} |
| F5 | D08 | heatmap max tính từ counts, không đổi dữ liệu | STATIC VERIFIED | chỉ thêm `<p>` legend |
| F6 | A02 | onOpenTitles vẫn là onClick của button | STATIC VERIFIED | code giữ |
| F7 | A03 | pointer-events:none giữ; text không đổi | STATIC VERIFIED | code giữ `pointerEvents:'none'` + text gốc |
| F8 | D03 | badge class không ảnh hưởng logic Quest/Skills | STATIC VERIFIED | chỉ thêm CSS base |

**Functional layer: PASS (static)** — Typecheck 0 lỗi, eslint 0 lỗi.

## Layer 2 — Responsive (static vs visual)

`html[data-density="compact"]` (height<500 || width<640) phủ toàn bộ mobile landscape 568×320…932×430 → các rule compact mới hoạt động trên ma trận viewport.

| # | Task | Viewport(s) | Check | Status | Evidence |
|---|---|---|---|---|---|
| R1 | A01 | touch cảm ứng | Nút "Cất vào kho" ≥44px (bỏ inline 28px) | STATIC VERIFIED (rule) | responsive.css `data-input=touch .warehouse-dock button{min-height:var(--touch)}` giờ không bị inline đè; DOM chưa đo (NOT TESTED) |
| R2 | D05/D06 | touch | link + text input trong dialog ≥44px | STATIC VERIFIED (rule) | rule mới `data-input=touch .dialog-content a/input[type=text]`|
| R3 | C05 | chuột/tablet | `.btn-slot-quick` ≥36px chuột; touch 44px | STATIC VERIFIED | store-planogram.css 36px; responsive 44px giữ |
| R4 | D02 | mobile landscape | primary CTA trong sticky footer | STATIC VERIFIED | `footer` prop PixelDialog = sticky footer; DOM/visual NOT TESTED |
| R5 | D01 | desktop+compact | tab active rõ (PixelButton teal/paper) | STATIC VERIFIED | base `.pixel-button button-teal/paper`; visual NOT TESTED |

**Responsive layer: PASS (static)/NOT TESTED (visual).** Không tràn ngang thêm; typecheck/eslint/postcss OK. Cần QA mắt để chốt pixel layout của R1–R5.

## Layer 3 — Visual (NOT TESTED — browser unavailable)

| # | Task | Check | Status |
|---|---|---|---|
| V1 | A03 | Overlay coop nhìn đúng token pixel (paper/viền cứng/bóng cứng) | NOT TESTED (chỉ static: token dùng — không thể xác nhận mắt) |
| V2 | D03 | Badge Quest/Skills đọc được (nền wood-light) | NOT TESTED |
| V3 | A07 | Danh hiệu HUD màu --sun phân biệt tagline | NOT TESTED |
| V4 | D08 | Legend heatmap đọc được trên touch | NOT TESTED |

**Visual layer: NOT TESTED.** Không thể tuyên bố pass trực quan khi không render (QA.md §25.1).

## Layer 4 — Regression (static)

| # | Old bug / shared | Check | Status |
|---|---|---|---|
| G1 | REG-14F (inline đè rule compact) | A01: inline minHeight bỏ → rule touch có hiệu lực | STATIC VERIFIED (đúng pattern, đã sửa) |
| G2 | BUG-001 toast quá lớn | Không đụng toast (ngoài scope) | Không regression |
| G3 | Global CSS / shared component | Đổi index.css (`.badge`) + responsive.css: không đụng rule compact khác (bọc density/input) | STATIC VERIFIED (postcss OK) |
| G4 | Shared Button/Modal | D01 đổi DaySummary tab sang PixelButton (shared) — kiểm tra compact `.feature-tabs .pixel-button` vẫn phủ | STATIC VERIFIED (rule L460-461 vẫn có cho `.pixel-button`) |
| G5 | typecheck/build | typecheck PASS; build web vẫn fail `spawn EPERM` (limb môi trường, không phải regression) | Không regression code |

**Regression layer: PASS (static).** Không phát hiện regression từ thay đổi; browser regression NOT TESTED.

---
## Kết luận Tester
- **STATIC VERIFIED (Technical Fit):** toàn bộ 9 task đạt typecheck/eslint/postcss + grep + rule CSS. Functional layer PASS (static).
- **NOT TESTED (Usability Fit):** toàn bộ phần trực quan/responsive pixel-layout (R1–R5, V1–V4) → cần browser QA mắt.
- **Found new failures:** không; các issue DEFERRED (C01/C02/B02/C07/A04-A06/D07) chưa test mắt — ghi vào backlog.

→ **Tester = PASS (static) / phần trực quan còn NOT TESTED.** Theo QA.md, KHÔNG tuyên bố mobile-ready.

---
## Round 8 (08/10/2026) — Tester · Browser THẬT (built-in browser, Vite dev, `?qa`, Local demo)

Sweep 19 modal (`__openModal`: market, prices, regulars, reviews, security, chain, titles, skills, quest, analytics, maintenance, stall, tax, levelRoadmap, cashier, supplier, warehouse, inventory, daySummary): dialog nằm trong viewport, `docOverflowX=0`, chỉ 1 dialog.

| Viewport | Kết quả |
|---|---|
| 568×320, 360×640, 390×844, 844×390, 820×1180, 1440×900, 1920×1080 | PASS (0 lỗi) |
| 320, 375, 393, 430, 768, 1024, 1280 | NOT TESTED vòng này |

- Tiêu đề B03 xác nhận sentence-case trên DOM (568×320).
- **Lỗi mới tìm thấy & đã sửa:** 2 dialog đồng thời → stack overflow ở `focusin`. Sau fix: mở `market`+`prices` cùng lúc, trang vẫn phản hồi. Bằng chứng console cũ còn trong buffer nên "không còn lỗi mới" chưa chứng minh bằng log sạch.
- Eye-QA 568×320 (chuột): toast không đè nút zoom/world-tools (A06 không tái hiện); HUD/dock không che player. A05 (joystick vs dock) và A04 (voice vs inert) **cần chế độ cảm ứng/co-op — NOT TESTED**.
- D07: analytics không có dữ liệu nên chưa render biểu đồ; text SVG đo được cao 12px — chưa kết luận với dữ liệu thật.
- Không chạy: touch input, functional gameplay, hiệu năng.

---
## Round 9 (08/10/2026) — Tester · browser thật, bổ sung viewport + cảm ứng
Sweep 19 modal (cùng tiêu chí R8), 0 lỗi: **375×812 (mobile preset, `data-input=touch`, 5 touch points)**, **667×375 touch**, 932×430, 768×1024, 1024×768, 1280×800. Cộng R8 → đã phủ 568×320, 360, 375, 390, 667, 768, 820, 844, 932, 1024, 1280, 1440, 1920.
- Màn dọc điện thoại hiện lớp "Xoay ngang thiết bị" (chủ đích) nên dialog dọc chỉ test được ở 360/375/390 qua sweep.
- Eye-QA 667×375 touch: joystick (dưới-trái) và nút "Xem" (dưới-phải) không đè world-tools/HUD; xe giao hàng che một phần sân (sự kiện gameplay).
- Lượt chạy đầu bị vô hiệu vì khung pane đổi kích thước giữa chừng (viewport thành 1340) — đã chạy lại sau khi đặt lại size; không dùng làm bằng chứng.
- Vẫn NOT TESTED: 320, 393, 430 (xoay dọc bị chặn); A05 khi dock kho **mở** trên touch; A04 (voice/co-op cần 2 người); D07 (biểu đồ cần `records.productSales` thật, không inject được qua hook QA); `yarn test`, build production, hiệu năng.

---
## Round 10 (08/10/2026) — Tester · browser thật, 667×375 touch
- **D07:** sau khi qua ngày tự nhiên có dữ liệu; biểu đồ rộng 560 = viewBox → nhãn SVG 10px (đạt ≥9–10px). Ở dialog ~530px quy đổi ≈9.5px. Chỉ thấy 1 điểm dữ liệu (1 ngày) nên chưa kiểm với chuỗi dài.
- **A05:** mở dock kho trên touch → `.touch-controls` không render (joystick/"Xem" ẩn), không đè dock (dock 293–613×50–375). Hệ quả: không di chuyển được khi dock mở (hành vi hiện có).
- **A06:** không tái hiện (R8–R10).
- **UI-R10-01:** tái hiện overlap thẻ Kiểm kê × Nhịp sống hẻm bằng screenshot (luồng tự nhiên). Sau fix: qua ngày bằng `__sim.getClock().advanceToNextDay()` chỉ còn 1 dialog; **chưa xác nhận thẻ hiện lại sau khi đóng bảng** vì đường tắt này không tạo `inventorySummary` (chỉ luồng ngày thật) → NOT TESTED.
- NOT TESTED: A04 (co-op), 320/393/430, eslint App.tsx, `yarn test`, build, hiệu năng.

---
## Round 11 (08/10/2026) — Tester
- `yarn test` (apps/web, 6 nhóm test): **PASS** (exit 0). `yarn build` (tsc + vite): **PASS** (exit 0; chỉ còn cảnh báo chunk >500 kB và INEFFECTIVE_DYNAMIC_IMPORT có từ trước).
- **UI-R10-01 verified** (667×375 touch): mở bảng Nhịp sống hẻm, gọi `sim.callbacks.onInventorySummary(...)` (đường callback thật, dữ liệu giả) → chỉ 1 dialog; đóng bảng → thẻ "Kiểm kê cuối ngày" hiện, đếm ngược 8s. Chưa chạy nguyên một chu kỳ ngày tự nhiên (đồng hồ chạy chậm trong pane).
- Quan sát P3 mới (UI-R11-01): ở 667×375 thẻ Kiểm kê cao ~250px × rộng ~300px che nửa phải thế giới trong 8s (có nút đóng). Không chặn thao tác; ghi backlog.
- NOT TESTED: A04 (co-op), 320/393/430 (bị chặn xoay dọc), hiệu năng.

---
## Round 12 (08/10/2026) — Tester
Browser thật, thẻ Kiểm kê (inject qua callback): 667×375 → 240×241, 568×320 → 240×190, đỉnh thẻ y=55 nằm dưới HUD (50px), không đè nút "Xem"/joystick. Nội dung vẫn cuộn trong thẻ. Chỉ kiểm hai viewport này; typecheck/test/build không chạy lại (chỉ đổi CSS). NOT TESTED: A04, 320/393/430.

---
## Round 13 (08/10/2026) — Tester
Browser thật 844×390: DaySummary hiển thị đúng — lãi ròng `rgb(42,122,67)` (= `--success`), khoản chi `rgb(180,74,44)` (fallback `--rust`). Bố cục không đổi. Chỉ DaySummary được xem bằng mắt; Quest/Regulars/Skills chỉ verify static (typecheck/eslint) → NOT TESTED visual. Không chạy lại test/build.

---
## Round 14 (08/10/2026) — Tester
`yarn test` PASS, `yarn build` PASS. Browser 844×390: Skills, Regulars, Quest render đúng, không tràn, màu token hợp lý (trạng thái mở khóa/thiếu hàng chưa kích hoạt nên chưa xem mắt). NOT TESTED: A04, 320/393/430.

---
## Round 16 (08/10/2026) — Tester · đo khung hình (built-in browser, Vite DEV, 844×390, DPR1, cửa hàng Local demo, sau warm-up ~8s)
- rAF 12s ×2: p50 33.3ms (~30 fps — khớp việc app/pane giới hạn khung), p95 33.8–34ms, p99 34.6ms.
- Có 4 stall đúng ~1000ms trong cửa sổ 25s ở các lần đo đầu; lần đo thứ tư (20s, có thêm probe setInterval 20ms) **không** thấy stall nào ở cả rAF lẫn timer → chưa tái hiện ổn định, **chưa quy cho app hay cho pane/throttle**. Cần đo lại trên bản build production và thiết bị thật.
- Giới hạn: Vite dev (chưa minify), emulation chứ không phải điện thoại, không có tải khách đông. **Không dùng làm bằng chứng đạt hiệu năng.**

---
## Round 17 (08/10/2026) — Tester · hiệu năng trên **build production** (`vite preview` :4173, 844×390, DPR1, Local demo, warm-up 8s)
rAF 30s, 900 khung: p50 33.3ms, p95 34.2ms, p99 34.6ms, **0 stall >100ms**. UI-R16-01 (stall ~1s) **không tái hiện** trên bản production → nhiều khả năng do Vite dev/pane. Giới hạn: trình giả lập trên máy dev, không phải điện thoại thật, ít khách. Không chứng minh đạt hiệu năng thiết bị thật.
