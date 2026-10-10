# Agent Orchestrator — Game UI/UX Quality Pipeline

> Orchestrator điều phối workflow, KHÔNG tự thiết kế/code/test. Nó quản lý trạng thái, dispatch đúng agent, validate artifact, route PASS/FAIL, persist (`.agent-state/`).

## State machine

```
INIT → DISCOVERY → DESIGN_AUDIT → DESIGN_REVIEW → BA_ANALYSIS → BA_REVIEW
     → DEVELOPMENT → DEV_CHECK → TESTING → QA_REVIEW → QUALITY_GATE → PASS(COMPLETE) / FAIL(ITERATION)
```

## Persisted state (`.agent-state/`)

| File | Nội dung |
|---|---|
| `current-session.json` | session, round, stage, status, currentTask, lastCompletedStage, envEvidence |
| `current-round.json` | round, score, issues found/fixed/remaining, regression, decision |
| `task-state.json` | các task BA/Dev mapped với issues |
| `history.json` | lịch sử round |

Resume: đọc `current-session.json` → tiếp tục từ `lastCompletedStage` (không chạy lại từ đầu).

## Quyền agent (lock)

| Agent | Đọc | Ghi tài liệu | Sửa source |
|---|---|---|---|
| UI/UX Lead | ✓ | ✓ | ✗ |
| Designer | ✓ | ✓ (DESIGN-AUDIT) | ✗ |
| BA | ✓ | ✓ (BA-SPEC) | ✗ |
| Developer | ✓ | ✓ (DEV-REPORT) | ✓ (chỉ task được giao, presentation-only) |
| Tester | ✓ | ✓ (TEST-REPORT) | ✗ |
| QA | ✓ | ✓ (QA-REPORT, QUALITY-SCORE) | ✗ |

Chỉ Developer sửa source trong workflow chuẩn.

## Artifact chain (input sau ← output của trước)

```
DESIGN-AUDIT.md → BA-SPEC.md → DEV-REPORT.md → TEST-REPORT.md → QA-REPORT.md → QUALITY-SCORE.md
```

## Routing

- **PASS**: P0=0, P1=0, critical regression=0, Tester PASS, QA PASS, evidence đủ → COMPLETE (session close).
- **FAIL — Implementation**: QA → Developer → Tester → QA (design vẫn đúng).
- **FAIL — Design**: QA → Designer → BA → Developer → Tester → QA.
- **FAIL — Requirement**: QA → BA → Designer → BA → Developer.
- **Technical blocker**: Developer → Block report → BA → UI/UX Lead → Designer.
- **Escalate**: cùng issue FAIL 2–3 round liên tiếp → UI/UX Lead review architecture; nếu vẫn không → HUMAN REVIEW REQUIRED.
- **Human approval** khi: đổi business logic, architecture lớn, redesign lớn, breaking API, data migration, dependency ảnh hưởng lớn, gameplay change, irreversible op, conflict lặp.

## Targeted vs Full

- **FULL-AUDIT**: Design quét toàn bộ → backlog P0→P1→P2→P3; xử theo độ ưu tiên.
- **Targeted**: chỉ designer→BA→dev→test→QA cho scope cụ thể.
- Thay đổi global (HUD, tokens, responsive system, shared Button/Modal, Global CSS) → **FULL UI REGRESSION** (Tester tìm mọi nơi dùng component).

## Execution rules (không được vi phạm)

```
DO NOT SKIP AGENTS (trừ khi stage prove không cần).
DO NOT CLAIM PASS WITHOUT EVIDENCE.
DO NOT CLAIM BROWSER TESTING IF BROWSER UNAVAILABLE.
DO NOT CLAIM VISUAL VERIFICATION FROM STATIC CODE ANALYSIS.
DO NOT MODIFY SOURCE FROM DESIGNER/BA/TESTER/QA.
DO NOT LOOP WITHOUT PROGRESS.
DO NOT CLOSE A FAILED TASK.
DO NOT IGNORE REGRESSION.
DO NOT SACRIFICE GAMEPLAY FOR DECORATIVE UI.
DO NOT SACRIFICE MOBILE FOR DESKTOP (hoặc ngược lại).
ALWAYS PRESERVE WORKING FUNCTIONALITY.
```
