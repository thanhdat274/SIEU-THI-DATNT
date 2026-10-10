# QUALITY-SCORE — Guide chấm điểm (tham chiếu pipeline)

> Người duy trì: **UI/UX Lead**. Đây là guide = bản tham chiếu đầy đủ của **§28 Quality Score** — trọng số, tiêu chí con, penalty, evidence, confidence, quality level, min-category, round-over-round và định dạng báo cáo. Điểm thực tế ghi ở `audits/*/QUALITY-SCORE.md`. Tuân thủ nguyên tắc **evidence (§28.14)** — không chấm PASS cho thứ chưa kiểm chứng. **Chỉ UI/UX Lead mới được thay đổi scoring rules (§28.20).**

---

## 1. Mục tiêu (§28.1)

Quality Score **không được là điểm số cảm tính**. Mỗi điểm phải dựa trên:
- Tiêu chí cụ thể.
- Bằng chứng kiểm tra.
- Severity của issue.
- Acceptance Criteria.
- Thiết bị/viewport đã kiểm tra.
- Regression status.
- Game UI/UX rules.
- Kết quả Tester.
- Kết quả QA.

Quality Score dùng để: (1) đánh giá chất lượng hiện tại, (2) so sánh giữa các round, (3) xác định mức cải thiện, (4) phát hiện khu vực còn yếu, (5) quyết định PASS hay không, (6) **ngăn agent tự tuyên bố "đã tốt" mà không có bằng chứng**.

---

## 2. Tổng điểm (§28.2)

```text
GAME UI / VISUAL DESIGN       20 điểm
GAME UX                       25 điểm
RESPONSIVE                   20 điểm
GAMEPLAY INTEGRATION         10 điểm
FUNCTIONAL / INTERACTION     10 điểm
ACCESSIBILITY                 5 điểm
CONSISTENCY / DESIGN SYSTEM   5 điểm
REGRESSION / STABILITY        5 điểm
---------------------------------------
TOTAL                        100 điểm
```

---

## 3. Tiêu chí con theo nhóm

### 3.1 GAME UI / VISUAL DESIGN — 20 điểm

| Tiêu chí | Max | Kiểm tra |
|---|---|---:|---|
| A. Visual Hierarchy | 4 | Player biết đâu là thông tin quan trọng nhất? Primary action nổi bật? Secondary action ít nổi bật hơn? Không quá nhiều thành phần tranh sự chú ý? HUD hierarchy rõ? |
| B. Typography | 3 | Font dễ đọc; size phù hợp; line height; text wrapping; không bị cắt; không quá nhỏ trên mobile; hierarchy heading/body/label. |
| C. Spacing & Alignment | 3 | Padding; margin; gap; alignment; grid; khoảng cách giữa các control. |
| D. Color & Contrast | 3 | Contrast; readability; game atmosphere; state colors; warning/error/success; không dùng màu gây hiểu nhầm. |
| E. Components | 4 | Button, Panel, Modal, Card, Input, Tabs, Tooltip, Notification — component cùng loại phải nhất quán behavior + visual language. |
| F. Polish | 3 | Icon quality; borders; shadows; hover; pressed; disabled; loading; animation/transition khi cần. |

**Thang điểm Visual Hierarchy (§28.3.A):** 4 = Xuất sắc · 3 = Tốt · 2 = Có vấn đề nhỏ · 1 = Có vấn đề rõ ràng · 0 = Không đạt.

### 3.2 GAME UX — 25 điểm (trọng số cao nhất)

| Tiêu chí | Max | Kiểm tra |
|---|---|---:|---|
| A. Clarity | 5 | Player hiểu: *What is this? What can I do? What happens if I click? What should I do next?* — qua label, icon, tooltip, feedback, instructions. |
| B. Discoverability | 4 | Tính năng phải tự được phát hiện; không bắt player phải "đoán" chức năng. |
| C. Interaction Flow | 5 | `Open → Understand → Interact → Confirm → Feedback → Continue gameplay` — không có bước thừa. |
| D. Cognitive Load | 4 | Quá nhiều button/thông tin/notification? Modal chồng modal? Menu quá phức tạp? Player phải nhớ quá nhiều? |
| E. Feedback | 3 | Mọi interaction quan trọng có feedback phù hợp: visual, audio (nếu cần), animation, notification, state change. |
| F. Error Prevention & Recovery | 4 | Ngăn thao tác sai; confirm hành động nguy hiểm; undo khi phù hợp; error message rõ ràng; không làm mất dữ liệu ngoài ý muốn. |

### 3.3 RESPONSIVE — 20 điểm

| Tiêu chí | Max | Viewport |
|---|---:|---|
| A. Mobile | 8 | 320 · 360 · 375 · 390 · 393 · 430 (không horizontal overflow, không clipping, không overlap, touch target, text readability, HUD placement, Modal, Inventory, Buttons, Notifications, Gameplay visibility) |
| B. Tablet | 5 | 768 · 820 · 1024 — cả Portrait lẫn Landscape |
| C. Desktop | 5 | 1280 · 1440 · 1920 (không quá nhiều khoảng trống, UI không quá nhỏ, hierarchy rõ, gameplay area hợp lý) |
| D. Extreme Aspect Ratio | 2 | Màn rất rộng; màn thấp; window resize; browser zoom (nếu phù hợp) |

### 3.4 GAMEPLAY INTEGRATION — 10 điểm

| Tiêu chí | Max | Kiểm tra |
|---|---:|---|
| A. Gameplay Visibility | 3 | Không che player/NPC/customer/shelf/counter/object tương tác/thông tin gameplay quan trọng. |
| B. Gameplay Interruption | 2 | UI không mở modal/notification quá mức làm gián đoạn gameplay. |
| C. World Integration | 2 | UI phù hợp game world, camera, pixel art, NPC, environment, day/night, weather, shop atmosphere. |
| D. Game Context | 3 | UI phù hợp gameplay thực tế (shop management, inventory, customer, staff, warehouse, delivery, purchase, sale, multiplayer, weather, time, money…). |

> UI game **không được đánh giá như website** (§28.6).

### 3.5 FUNCTIONAL / INTERACTION — 10 điểm

| Tiêu chí | Max | Kiểm tra |
|---|---:|---|
| A. Interaction Correctness | 4 | Button/control thực hiện đúng hành động. |
| B. State Management | 2 | Loading · Empty · Success · Error · Disabled · Selected · Active. |
| C. Input | 2 | Mobile: touch; Desktop: mouse + keyboard. |
| D. Feedback | 2 | Action phản hồi đúng và nhất quán. |

### 3.6 ACCESSIBILITY — 5 điểm

Text readability · Contrast · Touch target · Không chỉ dựa vào màu sắc · Keyboard accessibility (nếu phù hợp) · Focus state · Clear error state · Clear labels.

> Không yêu cầu biến game thành accessibility-heavy enterprise application — mục tiêu là mức accessibility hợp lý cho game web (§28.8).

### 3.7 CONSISTENCY / DESIGN SYSTEM — 5 điểm

Quét toàn bộ project: Button, Modal, Typography, Spacing, Colors, Icons, Panels, Notifications, HUD, Responsive behavior. **Nếu một component dùng ở 10 nơi nhưng có 5 cách hiển thị khác nhau → phải trừ điểm** (§28.9).

### 3.8 REGRESSION / STABILITY — 5 điểm

- **Regression — 3 điểm:** không được phá chức năng cũ.
- **Stability — 2 điểm:** console errors, runtime errors, build errors, broken imports, layout crash, unexpected state.

---

## 4. Severity Penalty (§28.11)

```text
P0 = -20 điểm / issue
P1 = -10 điểm / issue
P2 = -4 điểm / issue
P3 = -1 điểm / issue
```

**Penalty không thay thế Quality Gate:**
```text
Base Score = 94, P1 issue = -10 → Final = 84
Nhưng nếu còn P1 → STATUS = FAIL dù điểm vẫn có thể đạt 84.
```

---

## 5. Không cộng điểm cho lỗi chưa test (§28.12)

Một issue chỉ tính là **FIXED** khi:
```text
Developer = Implemented
Tester   = Verified
QA       = Accepted
```
Không được: `Developer says fixed → tự động cộng điểm`.

---

## 6. Evidence-Based Scoring (§28.13)

Mỗi điểm quan trọng phải có evidence. Ví dụ RESPONSIVE — 18/20 cần liệt kê từng viewport PASS + ghi issue. **Nếu browser không chạy được → `NOT TESTED`.** Không được chấm PASS chỉ dựa vào static code analysis.

---

## 7. Static Analysis vs Real Visual Testing (§28.14)

Phải phân biệt rõ hai mức:
- **STATIC VERIFIED** — code có rule (ví dụ `max-width:100%` có trong CSS) → chỉ chứng minh code tồn tại rule, KHÔNG chứng minh "UI không overflow trên iPhone".
- **VISUALLY VERIFIED** — phải có browser/screenshot/render evidence phù hợp.

Không có render evidence → **Status: NOT TESTED**.

---

## 8. Score Confidence (§28.15)

| Confidence | Bằng chứng |
|---|---|
| **HIGH** | Browser testing + screenshot/render + functional testing + regression testing |
| **MEDIUM** | Static analysis + unit/integration test + một phần visual testing |
| **LOW** | Chỉ static code inspection + suy luận |

Không được dùng **LOW confidence** để tuyên bố production-ready nếu còn phần quan trọng chưa kiểm chứng.

---

## 9. Quality Level (§28.16)

```text
95–100  EXCELLENT
90–94   VERY GOOD
85–89   GOOD
75–84   NEEDS IMPROVEMENT
60–74   POOR
0–59    CRITICAL
```
Classification chỉ mang tính tham khảo — **Quality Gate vẫn được ưu tiên**.

---

## 10. Quality Gate (§28.17)

Điều kiện mặc định để PASS:
```text
Score >= 90
P0 = 0
P1 = 0
Critical regression = 0
Tester = PASS
QA = PASS
```
→ **QUALITY GATE = PASS**

Nếu `Score >= 90` nhưng `P1 > 0` → **QUALITY GATE = FAIL** (dù điểm cao).

---

## 11. Minimum Category Score (§28.18)

Không dùng điểm tổng để che giấu nhóm quá yếu. Điều kiện tối thiểu:
```text
Responsive >= 17/20
Game UX    >= 21/25
Gameplay   >= 8/10
Functional >= 9/10
```
Nếu thấp hơn bất kỳ hạng mục nào → **FAIL** dù tổng điểm đủ cao.

*Ví dụ: Visual 19/20, UX 23/25, Responsive 10/20, Gameplay 9/10, Functional 10/10, Access 5/5, Consistency 5/5, Regression 5/5 → TOTAL 86 — KHÔNG được PASS vì Responsive quá thấp.*

---

## 12. Round-over-Round Improvement (§28.19)

Mỗi round phải so sánh:
```text
Previous Score
Current Score
Delta
```
Nếu **score giảm** → phải ghi rõ nguyên nhân. Ví dụ:
```text
Score: 93 → 89
Reason: Global modal redesign improved UX
        but introduced tablet responsive regression.
```

---

## 13. Score không được "game hóa" (§28.20)

Agent **không được** cố nâng điểm bằng cách:
- Hạ tiêu chuẩn
- Bỏ qua issue
- Đổi severity
- Không test viewport khó
- Không test regression
- Tự đánh dấu PASS
- Giảm trọng số của category điểm thấp

**Chỉ UI/UX Lead mới được thay đổi scoring rules.**

---

## 14. Quality Score Report (§28.21)

Mỗi round phải tạo `QUALITY-SCORE.md` theo format:

```text
# Quality Score — Round ###

## Overall
Score: ../100
Level: ...
Confidence: ...
Status: ...

## Category Scores
| Category | Score | Max |

## Issues
P0: 0  P1: 0  P2: 2  P3: 4

## Fixed
- UI-001, ...

## Remaining
- UI-014, ...

## Regression
None

## Evidence
Mobile / Tablet / Desktop / Browser: VERIFIED

## Decision
QUALITY GATE = PASS
```

---

## 15. Quy tắc quyết định cuối (§28.22)

```text
Score cao nhưng P1 còn tồn tại        → FAIL
Score thấp nhưng đang trong iteration → CONTINUE
Score >= 90 + P0=0 + P1=0 + Tester PASS + QA PASS + Evidence đủ → PASS
```

**Không được để một con số đẹp thay thế cho việc kiểm định chất lượng thực tế.**

---

## 16. Tóm tắt cách áp dụng trong pipeline

Pipeline (xem `ORCHESTRATOR.md`) chạy: Designer → BA → Developer → Tester → QA → Quality Gate. Bản guide này là **nguồn trọng số + quy tắc chấm** mà QA dùng để điền `QUALITY-SCORE.md`; UI/UX Lead là người duy nhất được sửa scoring rules. Evidence bắt buộc theo §6–§8; gate theo §10–§11; không có browser thật → Confidence không HIGH, mọi mục trực quan = `NOT TESTED` (§28.13–28.15).
