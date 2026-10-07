---
name: spec-reviewer
description: Review a spec document for completeness, cross-impact risks, flow integrity, and instruction compliance before implementation planning. Trigger when the user asks to review a spec, validate a design, or check readiness for coding. (Adapted from ai-kit skill: spec-reviewer)
allowed-tools: Read, Shell, Glob, Grep, Bash
---

# Spec Reviewer — Pre-Implementation Gate

**Role:** Senior Spec Reviewer and System Architect.
**Mission:** Ensure a spec is bulletproof — complete, consistent, safe to implement, compliant with project conventions — before any code is written.

**Input:** Spec file path.
**Output:** Spec Sentinel Report with actionable verdict.

> Compatibility: agent-agnostic and tech-stack agnostic; uses Read/Grep/Shell only. Adapted to this game project's conventions.

---

## Process Flow

```
Receive spec file path
        ↓
Phase 0: Session context available? reuse or run targeted codebase scan
        ↓
Phase 1: Spec Quality Audit
        ↓
Phase 2: Cross-Impact & Dependency Tracing (grep actual codebase)
        ↓
Phase 3: Instruction & Convention Compliance (AGENTS.md / tổng hợp.md)
        ↓
Phase 4: Generate Spec Sentinel Report
        ↓
Decision Gate: ❌ Issues → STOP | ⚠️ Warnings → confirm | ✅ Approved → next
```

---

## Phase 0: Context Bootstrap (Conditional)

Never re-read files already in context. If prior design step discovered tech stack/structure/conventions, reuse. Otherwise run minimal discovery:
- Tech stack: `package.json` (yarn workspaces: game-core, game-renderer, game-data, shared, apps/web, apps/server).
- Architecture: package folders, entry points.
- Conventions: read 2-3 similar files to what the spec targets.
- Agent instructions: `AGENTS.md` at root; also consult `tổng hợp.md` (current-state doc the project requires reading when touching code).

---

## Phase 1: Spec Quality Audit

| Category | What to Look For | Severity |
|----------|------------------|----------|
| Completeness | TODO/TBD/placeholders/empty sections | ❌ Blocker |
| Clarity | Requirements with multiple conflicting implementations | ❌ Blocker |
| Consistency | Internal contradictions | ❌ Blocker |
| Coverage | Missing error/edge/boundary/unhappy paths | ⚠️ Warning |
| Scope | Covers multiple independent subsystems | ⚠️ Warning |
| YAGNI | Over-engineered abstractions | ⚠️ Warning |
| Boundaries | Units without clear input/output contracts | ⚠️ Warning |
| Gameplay-risk | Sneaky gameplay/business-logic/state/save changes beyond stated scope | ⚠️ Warning |

---

## Phase 2: Cross-Impact & Dependency Tracing

> Grep the actual codebase — do not rely on assumptions.

### 2.1 Shared Logic Scan
For every module/component/system the spec proposes to modify/extend:
1. Grep all call sites + imports across `packages/*` and `apps/*`.
2. List every consumer file/feature that depends on it.
3. Flag if a consumer expects behavior the spec would change.

### 2.2 Data & State Integrity
- Does the spec modify save/state model, shared types, or persisted data? Flag save-version/migration impact.
- Does it change data shapes passed between game-core ↔ renderer ↔ UI?

### 2.3 API / Contract Analysis (apps/server)
- Adds/removes/changes fields in server endpoints? Auth/middleware changes? Downstream (web/client) impact?

### 2.4 Flow Integrity Check
Trace affected end-to-end flows; at each step verify failure handling and that the spec doesn't interrupt existing flows (e.g., a UI change breaking a shopkeeper interaction or a traffic system).

### 2.5 Cross-Cutting Concerns
- **Performance:** N+1/allocations in renderer hot path, unbounded loops in game-core tick.
- **Security/Config:** new env vars, Firebase auth, sensitive data.
- **Mobile UI:** does the change respect `data-density="compact"`/`--touch`/`--safe-*`; no new breakpoints; touch targets ≥44px on touch devices (see `apps/web/src/responsive.*`).

### 2.6 Co-op / Multiplayer & Determinism
If the spec touches state that must stay in sync across co-op clients, verify determinism-per-seed design intent and note any desync risk.

---

## Phase 3: Instruction & Convention Compliance

1. Locate project instructions: `AGENTS.md` (root) — read it; consult `tổng hợp.md`.
2. Check naming/architecture/file-folder conventions against existing code.
3. Check the spec respects package boundaries (sim → game-core; render → game-renderer; UI → apps/web).
4. Check docs obligation: per AGENTS.md, changes to behavior/data/architecture/strategy must update affected sections of `tổng hợp.md` (+ `TASKS.md`/`ROADMAP.md` when progress is affected). Flag if the spec/plan omits this.
5. Check test requirements match the project's testing approach (game-core custom runner; UI needs real-browser QA).

---

## Phase 4: Spec Sentinel Report

```markdown
# Spec Sentinel Report

**Spec:** `<path>`
**Date:** <date>
**Status:** ✅ Approved | ⚠️ Warnings | ❌ Issues Found

## Findings (every finding includes a recommendation)

### Critical Issues (Blockers)
| # | Section | Issue | Why It Blocks | Recommendation |

### Warnings
| # | Category | Finding | Risk | Recommendation |

## Cross-Impact Analysis
| Dimension | Finding | Risk Level | Recommendation |
|-----------|---------|------------|----------------|
| Shared Logic | symbols → consumers | 🔴/🟡/🟢 | action |
| Data/State | schemas/save affected | … | … |
| API Contracts | endpoints changed → impact | … | … |
| Flow Integrity | flows traced → break points | … | … |
| Cross-Cutting | perf/security/config/mobile | … | … |

## Instruction Compliance
| Dimension | Verdict | Deviation | Recommendation |
|-----------|---------|-----------|----------------|
| Conventions | ✅/⚠️ | … | … |
| Architecture | ✅/⚠️ | … | … |
| Testing | ✅/⚠️ | … | … |
| Docs (tổng hợp.md update) | ✅/⚠️ | … | … |
```

---

## Decision Rules

| Status | Action |
|--------|--------|
| ❌ Issues Found | STOP. Present report. Do NOT proceed to planning until spec revised. |
| ⚠️ Warnings | Present report. Ask: "Warnings detected. Proceed to planning or revise first?" |
| ✅ Approved | Present report. Proceed. |

### On Approval
> "Spec approved. Choose next step: 1) Use `writing-plans` skill  2) your own planning  3) skip planning → implementation"
