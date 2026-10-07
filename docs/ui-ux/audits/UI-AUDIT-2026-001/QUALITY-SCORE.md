# Quality Score — UI-AUDIT-2026-001 · Round 2 (per §28 Quality Score)

**Confidence: MEDIUM** — bằng chứng browser route 6 (Edge headless 568×320/852×393/932×430/1280×800: `docOverflowX=0`, dialog/board fit) là thật từ môi trường chủ dự án; round này chỉ thêm fix **presentation-estatic-verified** (D11/D07/D09-C06), **KHÔNG chạy lại browser** trong phiên này (sandbox `spawn EPERM` — cần quyền rộng như các đợt trước) nên không phải HIGH, và mục trực quan còn mở.

## Overall

- **Score: 84 / 100**
- **Level: NEEDS IMPROVEMENT** (§28.16 — 75–84)
- **Confidence: MEDIUM**
- **Status: FAIL → CONTINUE (iteration)** — không P1/critical regression nhưng chưa đủ gate.

---

## Category Scores

| Category | Score | Max | Ghi chú |
|---|---:|---:|---|
| GAME UI / VISUAL DESIGN | 15 | 20 | Token chắc + browser-verified layout; B03 (title case), B04/D09 (các màu trạng thái chưa khớp token), D10 (emoji) chờ design-decision |
| GAME UX | 20 | 25 | Cải thiện rõ (D02 sticky footer, B01 aria, D05/D06/A01 touch, B05/B06, D07 legend); **D07 phần nhãn ngày trong SVG còn cần eye-QA → giữ 20 (< ngưỡng 21)** |
| RESPONSIVE | 18 | 20 | Browser-verified (round 6): không tràn ngang mobile/tablet/desktop; D11 base-rule không đổi desktop |
| GAMEPLAY INTEGRATION | 9 | 10 | P1 board resolve; không blocker |
| FUNCTIONAL / INTERACTION | 9 | 10 | Static PASS + browser run; functional sâu NOT TESTED |
| ACCESSIBILITY | 4 | 5 | B01/C04/D05/D06/A02/D04/D07-legend đã sửa; A04–A06 eye-QA còn mở |
| CONSISTENCY / DESIGN SYSTEM | 4 | 5 | D11 base-rule đã thêm + token C06/D09-C06; B03/D10 còn mở |
| REGRESSION / STABILITY | 5 | 5 | Browser no page overflow (round 6) + presentation-only round này; typecheck/eslint/postcss PASS |
| **TOTAL** | **84** | **100** | Confidence MEDIUM |

*(Lưu ý tổng: so round 6, các fix round này (D11/D07/D09-C06) là presentation + incremental; không nâng tổng vì chưa có browser re-verify và các design-decision chưa chốt — không "game hóa" điểm theo §28.20.)*

## Issues (§28.11 severity)

- **P0: 0**
- **P1: 0** (C01/C02 — RESOLVED bằng browser QA round 6, non-defect)
- **P2:** D07 (còn phần nhãn ngày SVG cần eye-QA) — phần legend đã fix
- **P3:** B03, D10, D11(đã làm), A04, A05, A06, một số D09 màu không khớp token, D11 done

## Fixed

Round này (presentation-only, static-verified):
- **D11** — thêm base rule `.feature-tabs`/`.feature-scroll-tabs` (desktop) trong `responsive.css` → tab bar không còn phụ thuộc inline style riêng mỗi component; mọi inline thắng nên desktop không đổi, rule compact giữ trên mobile.
- **D07** (phần legend) — `AnalyticsModal`: dời 2 dòng chú thích (Cột/Đường) ra khỏi SVG thành text HTML `.muted` hệ responsive font (không còn co xuống 6–7px trên nền hẹp); cột/đường/thời điểm giữ trong SVG. Chỉ presentation, không đổi dữ liệu.
- **D09/C06 (phần an toàn)** — token hóa hex trong `AnalyticsModal` (#357f72→`var(--teal)`, #b64c3d→`var(--brick)`) và `TitlesModal` (#357f72→`var(--teal)`): cùng giá trị, **0 đổi visual**.

Kế thừa (round 6): A01, A02, A07, B01, C03, C04, C05, D01, D02, D03, D05, D06, D08, A03, D04, B06, C06(an toàn), B05, B02, C07(floor) — 20 issue.

## Remaining

- **P2:** D07 (phần nhãn ngày trong SVG — cần eye-QA browser để chốt ≥9–10px trên 568–430).
- **P3:** A04 (VoicePanel/inert), A05 (joystick vs dock), A06 (toast vs world-tools) — đều *cần QA mắt*; B03 (title-case), D10 (emoji→PixelIcon) — design-decision UI/UX Lead; D09 còn lại (các màu #16a34a/#dc2626/#d9534f/#d97706/#4eaf7c/#999999/#fef3c7/#92400e/#065f46/#f59e0b không trùng token — đổi sẽ đổi visual, cần eye-QA + quyết định Lead).
- **LoginScreen.css** hex riêng — nếu art-direction chủ đích (D09/D10 giảm nhẹ) cần chủ dự án xác nhận.

## Regression

Không phát hiện. Round này presentation-only (CSS base-rule + markup text + token 0-đổi-visual); `yarn typecheck` PASS · `npx eslint` AnalyticsModal/TitlesModal 0 lỗi · `postcss` parse responsive.css & index.css OK. Browser regression (round 6): no page overflow, dialog fit → không regression.

## Evidence

- **Mobile (320–430):** VERIFIED (round 6 browser, Edge 568/852/932; `docOverflowX=0`, dialog fit)
- **Tablet (768–1024):** VERIFIED (round 6: 1280 tested; 768/820 chờ sweep đủ)
- **Desktop (1280–1920):** VERIFIED (round 6: 1280; 1440/1920 chờ)
- **Browser:** VERIFIED (round 6, Edge headless; **round này chưa re-build/re-run** — cần chủ dự án chạy lại build+Edge để xác nhận 3 fix mới + eye-QA D07/A04-A06)

## Quality Gate (§28.17 + §28.18)

| Điều kiện | Kết quả |
|---|---|
| Score ≥ 90 | ❌ (84) |
| P0 = 0 | ✅ |
| P1 = 0 | ✅ (C01/C02 resolved) |
| Critical regression = 0 | ✅ (presentation-only) |
| Min: Responsive ≥ 17/20 | ✅ (18) |
| **Min: Game UX ≥ 21/25** | ❌ (**20/25** — còn eye-QA D07 + chưa re-verify) |
| Min: Gameplay ≥ 8/10 | ✅ (9) |
| Min: Functional ≥ 9/10 | ✅ (9) |
| Tester PASS | ✅ (static) |
| QA PASS | ✅/⚠️ (structure & overflow; mục trực quan eye-QA còn mở) |
| Browser evidence đủ (mobile/tablet/desktop) | ⚠️ mobile/desktop có; tablet 768/820 + re-run round này chưa |

## Decision

**QUALITY GATE = FAIL → CONTINUE** (§28.22: "Score thấp nhưng đang trong iteration → CONTINUE").

Lý do (không game hóa, §28.20):
1. **Score 84 < 90** — chưa đủ tổng.
2. **Game UX 20/25 < 21/25 (min-category §28.18)** — CHẶN PASS dù tổng đạt; điểm không được che nhóm yếu.
3. Chưa chạy lại browser cho 3 fix round này + eye-QA D07/A04–A06 → chưa đủ HIGH evidence.

Không phải hard-FAIL (P1=0, critical regression=0, đang iterate đúng hướng).

**Path để PASS (rõ ràng, theo §28):**
1. UI/UX Lead chốt design-decision: **B03** (title-case), **B04/D09** (thống nhất màu trạng thái → token, chọn `--success`/`--warn`/`--teal`/`--brick`), **D10** (emoji→PixelIcon hoặc aria-hidden) → Developer implement.
2. Xử lý eye-QA: **A04/A05/A06** (layering/overlap: VoicePanel-inert, joystick-dock, toast-world-tools).
3. Chạy lại **browser QA** (danger-full-access) sau khi build để: xác nhận D11/D07/D09 không regression + chốt D07 label ≥9–10px + QA tablet 768/820 + desktop 1440/1920.
4. Nếu tất cả sạch → tính lại ≥90 + Game UX ≥21 → **PASS chính thức** (Confidence HIGH).

## Round-over-Round (§28.19)

```text
ROUND 1   Score: 72  (browser unavailable, P1 > 0)
ROUND 6   Score: 84  (browser QA thật, P1 resolved, Delta +12)
ROUND 7   Score: 84  (fix presentation D11/D07/D09; Delta 0 — chưa re-verify browser, chưa chốt design-decision)
```

Không có regression mới; điểm chưa tăng vì phần nâng cần bằng chứng visual mới (không tự cộng theo §28.20).
