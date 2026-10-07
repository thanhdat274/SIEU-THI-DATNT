# UI Quality Dashboard

> Duy trì bởi **Orchestrator / UI/UX Lead**. Cập nhật cuối mỗi round từ QUALITY-SCORE.md và các report.

## Current Status

**Session:** UI-AUDIT-2026-001

**Current Round:** 17 (đóng)

**Score:** 89/100 (Confidence MEDIUM — browser thật round 8: 7 viewport × 19 modal, chưa test touch)

**Status:** CONTINUE — Quality Gate FAIL (Score <90 · Game UX 20/25 < 21/25)

**Quality Gate:** FAIL → CONTINUE (P1=0, critical regression=0, đang iterate; còn Score<90 + min-category Game UX + browser re-verify)

## Issues backlog

| Severity | Count | Trạng thái round 7 |
|---|---|---|
| P0 | 0 | — |
| P1 | 0 | C01, C02 — RESOLVED (browser QA round 6) |
| P2 | 8 | 7 fixed/partial · còn D07 (phần nhãn ngày SVG — eye-QA) |
| P3 | 21 | 16 fixed · còn A04,A05,A06 (eye-QA) + B03,D10,D09-còn (design-decision) |

## Fixed (round 7 + kế thừa round 6)

Round 7 (presentation-only, static-verified):
- **D11** — base rule `.feature-tabs`/`.feature-scroll-tabs` (desktop) trong `responsive.css`; bớt phụ thuộc inline style.
- **D07 (phần legend)** — `AnalyticsModal`: chú thích Cột/Đường dời khỏi SVG → text HTML `.muted` hệ responsive font (không còn co 6–7px).
- **D09/C06 (an toàn)** — token hoá hex cùng giá trị: `#357f72`→`var(--teal)` (AnalyticsModal, TitlesModal), `#b64c3d`→`var(--brick)` (AnalyticsModal) — 0 đổi visual.

Round 6: A01, A02, A07, B01, C03, C04, C05, D01, D02, D03, D05, D06, D08, A03, D04, B06, C06(an toàn), B05, B02, C07(floor) — 20 issue.

## Remaining

- **P1: 0** ✅ — C01, C02 RESOLVED (browser QA thật round 6: `docOverflowX=0`, board/dialog fit, tab strip scroll chủ đích).
- **P2:** D07 (phần nhãn ngày trong SVG — cần eye-QA ≥9–10px trên 568–430).
- **P3:** A04 (VoicePanel/inert), A05 (joystick vs dock), A06 (toast vs world-tools) — eye-QA; B03 (title-case), D10 (emoji→PixelIcon) — design-decision Lead; D09 còn (các màu không trùng token — cần eye-QA + Lead).
- **Design-decision (Lead):** B03, B04/D09 (màu còn lại), D10.

## Regression

Không phát hiện. Round 7 presentation-only; `typecheck` PASS · `eslint` Analytics/Titles 0 lỗi · `postcss` parse OK.

## Next Round (path → PASS)

1. **UI/UX Lead chốt design-decision** B03 (title-case), B04/D09 (token màu trạng thái), D10 (emoji→PixelIcon/aria-hidden) → Developer implement.
2. **Eye-QA** A04/A05/A06 (VoicePanel-inert, joystick-dock, toast-world-tools).
3. **Chạy lại browser QA** (danger-full-access) sau build: xác nhận D11/D07/D09 không regression + chốt D07 label ≥9–10px + tablet 768/820 + desktop 1440/1920.
4. Nếu sạch → tính lại ≥90 + **Game UX ≥21/25** → **PASS chính thức** (Confidence HIGH).

## Lịch sử điểm

| Round | Score | Final (sau penalty) | Status |
|---|---|---|---|
| 1 | 72 | 52 (P1 −20) | FAIL |
| 6 (browser QA) | **84** | **84 (P1=0)** | NEAR-PASS → CONTINUE (P1 resolved) |
| 7 (fix presentation) | **84** | **84** | **CONTINUE** (Score<90 + Game UX 20/25<21/25; chờ re-verify browser + design-decision) |

---
*(Round 7: áp fix D11/D07/D09-C06, verify static PASS; GATE vẫn FAIL vì chưa đủ ≥90 + min-category Game UX + cần browser re-verify. Không game hóa điểm theo §28.20.)*

## Round 8 (08/10/2026)
- Fixed: B03 (13 title → sentence-case), B04 đóng (đã có `--success`), REG-R8-01 (stack overflow khi 2 PixelDialog mount, P2, verified browser).
- Browser: 19 modal × {568×320, 360×640, 390×844, 844×390, 820×1180, 1440×900, 1920×1080} = 0 lỗi. NOT TESTED: 320/375/393/430/768/1024/1280, touch, chart có dữ liệu.
- Gate: FAIL → CONTINUE (Game UX 20/25 <21). Tiếp: test touch (A04/A05), D07 với dữ liệu, D10/D09 theo Lead.

## Round 9 (08/10/2026)
- Không đổi code. Browser thật bổ sung: 375 touch, 667×375 touch, 932×430, 768, 1024, 1280 — 19 modal × mỗi viewport 0 lỗi.
- Gate FAIL→CONTINUE, điểm 85 (không nâng). Còn: D07, A04, A05 cần dữ liệu/touch dock mở/co-op → đề nghị HUMAN REVIEW.

## Round 10 (08/10/2026)
- Fixed/closed: D07, A05, A06 (verified 667×375 touch); UI-R10-01 (thẻ Kiểm kê cuối ngày không còn đè bảng Nhịp sống hẻm — verify một phần).
- Điểm 87 (Game UX 21/25). Gate FAIL→CONTINUE (<90). Còn: A04, D09/D10, xác nhận UI-R10-01 qua ngày thật, viewport 320/393/430, test+build.

## Round 11 (08/10/2026)
- `yarn test` PASS, `yarn build` PASS. UI-R10-01 verified (thẻ Kiểm kê chờ đóng bảng tổng kết). Mới: UI-R11-01 (P3, thẻ Kiểm kê che nửa phải màn ở 667×375 trong 8s).
- Điểm 88, Gate FAIL→CONTINUE (<90). Còn: A04 co-op, viewport 320/393/430, UI-R11-01, D09/D10.

## Round 12 (08/10/2026)
- UI-R11-01 giảm (thẻ Kiểm kê 240px ở màn thấp). Điểm giữ 88; Gate FAIL→CONTINUE. **HUMAN REVIEW REQUIRED:** A04 (co-op), viewport 320/393/430, D09/D10.

## Round 13 (08/10/2026)
- D09 phần chính xong (5 hex → token trong 4 modal). Verify mắt chỉ DaySummary. Điểm 88, Gate FAIL→CONTINUE. Còn: A04, 320/393/430, `--rust` chưa định nghĩa, D10.

## Round 14 (08/10/2026)
- `--rust` mồ côi → `--brick`; D09 đóng. test+build PASS; Skills/Regulars/Quest xem mắt OK. Điểm 89, Gate FAIL→CONTINUE (<90). Còn: A04, 320/393/430 (cần người), D10 giữ emoji.

## Round 15 (08/10/2026)
- Không đổi code. Lead chốt A04 (giữ hành vi, suy luận từ z-index), 320/393/430 quy về viewport ngang đã sweep, D10 giữ emoji. Điểm 89, Gate FAIL(<90) — **chờ chủ dự án ký duyệt**; rủi ro còn lại: A04 chưa test co-op, màu trạng thái chưa xem mắt, hiệu năng chưa đo.

## Round 16 (08/10/2026)
- Đo khung hình dev/844×390: p95 ~34ms (30 fps). Thấy stall ~1s thoáng qua, không tái hiện ở lần đo cuối → UI-R16-01 (P3, chưa kết luận). Điểm 89; chờ chủ dự án ký duyệt.

## Round 17 (08/10/2026)
- Production build: p95 34ms, 0 stall/30s → UI-R16-01 đóng. Điểm 89. Khuyến nghị chủ dự án ký duyệt; thêm round không còn tạo tiến bộ (escalate).

## Đóng phiên (08/10/2026)
Chủ dự án ký duyệt thủ công ở 89/100 (gate tự động FAIL <90, chấp nhận có điều kiện). Rủi ro còn lại: co-op A04, hiệu năng thiết bị thật, màu trạng thái chưa xem mắt, P3 D10/hex xám.
