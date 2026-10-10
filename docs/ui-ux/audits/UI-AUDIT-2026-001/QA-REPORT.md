# QA-REPORT — UI-AUDIT-2026-001 · Round 1

> Agent: **QA**. Đánh giá sản phẩm tổng thể (5 lớp), không chỉ lặp Tester. Câu hỏi: "Đã đạt chất lượng sản phẩm chưa?".

## Bối cảnh bằng chứng
- **Browser QA THẬT đã chạy (Playwright 1.63 + Microsoft Edge headless, danger-full-access):** build web THÀNH CÔNG (rolldown+tsc 0 lỗi, dist mới chứa code hiện tại + QA hook `?qa`), serve bằng `vite preview` port 4173 (sẵn có), drive qua `window.__openModal`. Chụp ảnh tại `.qa/shots/`.
- **Kết quả overflow ngang = KHÔNG có page-level overflow:** `docOverflowX=0` ở mọi modal kiểm thử × mọi viewport (568×320, 852×393, 932×430, 1280×800). Các mục `worstOverflowX` (supplier +19xx, prices +7xx, regulars +19x) đều là phần tử nằm trong **strip cuộn ngang chủ ý** (`.supplier-cats`, chip, feature-scroll-tabs) bị clip bởi `overflow-x:auto/hidden` → KHÔNG gây tràn màn hình (đúng kết luận QA Đợt 18).
- **StoreLayout (C01/C02) — P1 ĐÃ RESOLVE bằng bằng chứng thật:** dialog khớp mọi viewport (568/842/922); board 16 cột khớp, KHÔNG `BOARD_OUT_OF_VIEW`; `docOverflowX=0`. Tab strip sidebar (6 tab) tràn ngang là **có chủ đích** (`responsive.css` L660 `repeat(6,minmax(max-content,1fr))` + `overflow-x:auto` = scroll strip như mobile pattern), tất cả tab đều truy cập được bằng cuộn — KHÔNG phải bug tràn màn hình. → **C01/C02 = verified OK / non-defect.**
- **Cashier (B02 my fix):** 568×320 dlg 558×310 **OK** (no overflow) — footer wrap hoạt động.
- **Desktop 1280×800:** StoreLayout 1080×690 + cashier/supplier/prices/warehouse/analytics đều **OK** (no page overflow, dialog fit), `density=normal`.
- Static Technical Fit: typecheck PASS, eslint 0 lỗi, postcss OK, build PASS.

## Lớp 1 — Design Quality
- **Đã cải thiện (static):** D01 (tab active rõ), D03 (badge có nền token), A03 (overlay coop đúng token pixel), A07 (màu token), B04-part (dùng token).
- **Chưa đạt/để mở:** B03 (title case chưa thống nhất), B04/D09 (màu success chưa token hoá triệt để — chờ Lead), D10 (emoji→PixelIcon chưa làm).
- **Chưa kiểm chứng (visual):** nhất quán mắt giữa màn — NOT TESTED.
- **Điểm: 14/20** (static).

## Lớp 2 — UX Quality
- **Đã cải thiện:** D02 (primary CTA sticky footer — action chính không chôn scroll), B01 (trạng thái active đọc được), D05/D06/A01 (touch target), B06 (lý do disabled bán chịu — DEFER, chưa làm).
- **Nguy cơ chưa chốt (eye QA):** D07 chart chữ scale nhỏ; A04/A05/A06 (layering/overlap); B05 (mất "Thu tiền" khi store đóng) — chưa xác định xảy ra thực tế.
- **Điểm: 18/25** (static; UX cải thiện rõ nhưng phần lớn cần mắt).

## Lớp 3 — Responsive Quality
- **Browser verified (Playwright+Edge 568×320 / 852×393 / 932×430 / 1280×800):** KHÔNG có page-level overflow (`docOverflowX=0`); mọi dialog/board khớp viewport; các overflow-khác nằm trong strip cuộn chủ ý (clipped, không tràn màn hình).
- **P1 C01/C02 — RESOLVED (non-defect):** board 16 cột & dialog khớp mọi viewport; tab strip sidebar scroll chủ ý (responsive.css L660 `overflow-x:auto`), tất cả tab truy cập được → không phải bug tràn màn hình.
- **Touch (`data-input=touch`):** layout/overflow không đổi so với mouse (chỉ touch-target do responsive.ts/css, đã static-verify); tap target ≥44px.
- **Điểm: 18/20** (responsive đạt với bằng chứng browser trên mobile/tablet/desktop; chỉ còn eye-QA mắt cuối cùng cho một vài chi tiết).

## Lớp 4 — Functional Quality
- **Static PASS:** typecheck/eslint/postcss; logic giữ nguyên (chỉ presentation).
- **Browser functional:** NOT TESTED (không khởi chạy được app).
- **Điểm: 9/10** (static chắc nhưng thiếu functional run).

## Lớp 5 — Regression Quality
- **Static PASS:** không phát hiện regression; các rule compact mới không đụng desktop; shared button modal vẫn được bảo phủ.
- **NOT TESTED:** regression browser (dependency-aware đầy đủ).
- **Điểm: 4/5.**

## Tổng câu hỏi QA
- Có giải quyết đúng vấn đề Designer phát hiện? → **Phần lớn static-verifiable: CÓ** (a11y, touch, token, hierarchy).
- Có nhất quán game-ui rules? → CÓ (presentation-only, tái dùng token/class).
- Có đúng mobile? → **CHƯA XÁC MINH** (NOT TESTED).
- Có phá gameplay/regression? → Không thấy static; chưa kiểm tra browser.
- Vấn đề mới? → Không trong phạm vi sửa.

## Kết luận QA
- **Thay đổi hiện có đúng hướng, an toàn (technical fit), và đã verify browser thật.**
- **P1 C01/C02 = RESOLVED (non-defect)** với bằng chứng render (board & dialog khớp mọi viewport; không page-overflow; tab strip scroll có chủ đích).
- **Usability Fit (overflow/layout) giờ đã TESTED** trên mobile/tablet/desktop (Playwright+Edge, `docOverflowX=0`, dialog fit) — nâng bản chất so với "NOT TESTED" trước đó.
- Còn lại: eye-QA mắt cuối cùng cho vài chi tiết cosmetic P2/P3 (D07 chart scale, A04-A06 layering) + design-decision (B03/B04/D09/D10) — không phải blocker P1/overflow.
- → **QA = PASS (cấu trúc & overflow)** dựa trên bằng chứng thật. Khuyến nghị chủ dự án xem mắt ảnh `.qa/shots/` để chốt nghiệm thu cuối.

## Đề xuất (feedback loop)
- P1 đã cleared bằng browser QA thật — đây là mốc quan trọng của vòng này.
- **Còn lại (P2/P3, không chặn gate):** eye-QA mắt D07/A04-A06; design-decision B03/B04/D09/D10 (Lead duyệt) → hoàn nốt C06 success token; D11 (base rule feature-tabs) defer vì rủi ro desktop chưa finalize.
- Khuyến nghị: chủ dự án duyệt mắt ảnh `.qa/shots/` (568/852/932/1280 layout + smoke) rồi ký PASS Usability Fit cuối cùng.

---
## Round 8 (08/10/2026) — QA

- Tiến bộ: B03 xong; B04 đóng; phát hiện + sửa lỗi treo trang tiềm ẩn khi 2 dialog mount (REG-R8-01, P2 → fixed, đã verify browser).
- Gate: **FAIL → CONTINUE**. P0=0, P1=0, regression nghiêm trọng=0, nhưng Game UX vẫn 20/25 (<21 theo §28.18) và tổng <90. Không nâng điểm khi chưa có bằng chứng cảm ứng/biểu đồ có dữ liệu.
- Điểm Round 8: **85/100** (+1: Consistency do B03), Confidence MEDIUM (browser thật nhưng thiếu touch, 7 viewport, chart data).
- Còn lại: D07 (cần dữ liệu), A04, A05 (cần touch/co-op), D09 phần còn lại, D10 (Lead: giữ emoji, thêm aria-hidden nếu muốn).

---
## Round 9 (08/10/2026) — QA
- Responsive: bằng chứng browser giờ phủ mobile/tablet/desktop + cảm ứng; không phát hiện lỗi mới, không regression. Không đổi code vòng này.
- Gate: **FAIL → CONTINUE**. Điểm giữ **85** (không có fix mới, không nâng điểm khi chưa test A04/A05/D07). Game UX 20/25 vẫn <21.
- Cần để PASS: (1) chơi thật vài ngày trên browser để có dữ liệu biểu đồ → chốt D07; (2) mở dock kho trên touch kiểm A05; (3) 2 người co-op kiểm A04; hoặc chủ dự án chấp nhận 3 P2/P3 này là rủi ro còn lại. Đề xuất HUMAN REVIEW cho 3 mục này (không agent nào tự test được).

---
## Round 10 (08/10/2026) — QA
- Đóng: D07 (nhãn 10px, dữ liệu 1 ngày), A05, A06. Sửa: UI-R10-01 (verify một phần). Còn mở: A04 (co-op), D09 phần còn lại, D10 (giữ emoji), P3 khác.
- Điểm **87/100** (+2; Game UX 21/25 đạt ngưỡng 21). Confidence MEDIUM. Tổng <90 → **Gate FAIL → CONTINUE**. P0=P1=0, không regression.
- Cần để PASS: xác nhận UI-R10-01 qua một ngày chơi thật, test A04 co-op, đủ viewport 320/393/430; chạy `yarn test` + build.

---
## Round 11 (08/10/2026) — QA
- Đóng: UI-R10-01. Test + build PASS (Stability/Regression có bằng chứng). Mới: UI-R11-01 (P3).
- Điểm **88/100** (+1, Functional/Stability có test+build). Game UX 21/25. Confidence MEDIUM. Tổng <90 → **Gate FAIL → CONTINUE**; P0=P1=0.
- Còn lại: A04 (co-op, cần 2 client), 320/393/430, UI-R11-01, D09/D10 (Lead).

---
## Round 12 (08/10/2026) — QA
- UI-R11-01: **giảm** (thẻ nhỏ hơn, vẫn che một phần thế giới 8s) — đóng ở mức P3 chấp nhận được. Điểm **88/100**, không đổi (cải thiện nhỏ, chưa đủ bằng chứng nâng). Gate **FAIL → CONTINUE** (<90). Escalate: phần còn lại cần chủ dự án (A04 co-op, 320/393/430, D09/D10) — **HUMAN REVIEW REQUIRED**.

---
## Round 13 (08/10/2026) — QA
D09 đóng một phần (màu trạng thái chính dùng token). Điểm giữ **88** (Consistency cải thiện nhẹ nhưng 3/4 modal chưa xem mắt). Gate FAIL→CONTINUE (<90). Còn HUMAN REVIEW: A04, 320/393/430; D10 giữ emoji; D09 còn `--rust` chưa định nghĩa/`#999999`.

---
## Round 14 (08/10/2026) — QA
D09 đóng (còn 2 hex xám P3 nhỏ). Điểm **89/100** (+1: Consistency + Stability có test/build). Gate FAIL→CONTINUE (<90). Phần còn lại cần người: A04, 320/393/430.

---
## Round 15 (08/10/2026) — UI/UX Lead + QA (không đổi code)
**Quyết định Lead (static, từ code):**
- **A04:** VoicePanel (`z-index:19`) nằm dưới `.dialog-backdrop` (`z-index:50`, nền tối 72%) nên khi modal mở nó bị che và không bấm được; mic vẫn chạy ngầm → hành vi hợp lý cho co-op, **không sửa**. `CoopSleepNotification` (`zIndex:60`) chủ ý nằm trên modal để thông báo bạn chơi đi ngủ. Đây là suy luận từ code, **chưa test co-op** (Confidence LOW cho A04).
- **320/393/430:** màn dọc điện thoại bị chặn bởi lớp "Xoay ngang" (chủ đích), nên chiều rộng chơi thực tế là cạnh dài khi xoay ngang: 568, 667, 844, 852, 932 đã sweep (R8–R10) — không còn cạnh nào khác phải test. Chiều cao thấp nhất 320 (568×320) đã đạt.
- **D10:** giữ emoji trang trí (Lead chốt), backlog P3.

**Kết luận:** điểm **89/100**, Gate **FAIL (<90)**, không nâng điểm bằng suy luận (§28.14, §28.20). Trạng thái: **sẵn sàng cho chủ dự án ký duyệt** — không còn P0/P1, không regression, test+build PASS. Rủi ro còn lại chấp nhận được: A04 chưa test co-op; trạng thái màu mở khóa/thiếu hàng chưa xem mắt; hiệu năng chưa đo; D10/hex xám P3.

---
## Round 16 (08/10/2026) — QA
Không đổi code. Bổ sung số đo khung hình (nhiều khả năng chỉ ở mức "không thấy vấn đề rõ ràng", chưa đạt/không đạt). Điểm **89**, Gate FAIL (<90), chờ chủ dự án ký duyệt như R15. Backlog mới P3: UI-R16-01 — stall ~1s không tái hiện ổn định, cần đo lại trên build production/thiết bị thật.

---
## Round 17 (08/10/2026) — QA
UI-R16-01 đóng (không tái hiện ở production). Điểm **89**, Gate FAIL(<90), không đổi; không còn việc agent tự làm được có giá trị. **Khuyến nghị: chủ dự án ký duyệt ở 89** (P0=P1=0, test+build PASS, 13+ viewport sweep, rủi ro còn lại: co-op A04 chưa test, hiệu năng thiết bị thật chưa đo). Tiếp tục thêm round sẽ vi phạm "không lặp vòng vô nghĩa" (§13).

---
## ĐÓNG PHIÊN — 08/10/2026 (Round 17)
**Chủ dự án ký duyệt thủ công ở mức 89/100** (Quality Gate tự động = FAIL vì <90; đây là chấp nhận có điều kiện của con người, **không phải PASS tự động**, Confidence MEDIUM).
Rủi ro còn lại được chấp nhận: (1) A04 co-op chưa test với 2 client; (2) hiệu năng thiết bị thật chưa đo (production emulator p95 34ms, 0 stall); (3) màu trạng thái mở khóa/thiếu hàng chưa xem mắt; (4) P3: D10 (giữ emoji), hex xám `#999999`/`#888`.
P0=0, P1=0, regression nghiêm trọng=0; typecheck/test/build PASS.
