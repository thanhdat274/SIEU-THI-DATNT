# Implementation Plan: <FEATURE_NAME>

Spec Source: `<path-to-spec.md>`
Owner: `<dev>`
Last Updated: `<date>`
Status: `Draft | In Review | Approved | In Progress | Done`

---

# 1. Context

**Problem:**
<2-3 sentences: what this feature adds/fixes in the game and why it matters>

**Affected Modules:**
- `packages/game-core` - <one-line role>
- `packages/game-renderer` - <one-line role>
- `apps/web` - <one-line role>
- `apps/server` - <one-line role>

**Non-Goals:**
- <things explicitly NOT implemented (e.g., no new breakpoints, no gameplay logic change out of scope)>

---

# 2. Constraints

**Language:** TypeScript (yarn workspaces monorepo)
**Architecture:** game-core (deterministic sim) / game-renderer (2.5D PixiJS) / apps/web (React mobile-first) / apps/server (Node + Firebase)

**Rules:**
- Do NOT modify unrelated modules.
- Do NOT introduce new external dependencies unless justified.
- Respect package boundaries: simulation → `game-core`; rendering → `game-renderer`; UI-only → `apps/web`. Keep `game-core` free of DOM/renderer deps (offline-testable).
- Do NOT create new responsive breakpoints/frameworks; reuse `data-density="compact"`, `--touch`, `--safe-*` tokens (see `apps/web/src/responsive.*`).
- Beware hot-path allocations in `game-renderer` (per-frame render loop).

**Performance Budgets (if applicable):**
- <e.g., amortized allocation/frame, FPS target, tick budget>

---

# 3. Conventions

**Naming:** follow existing codebase conventions (read 2-3 similar files first).
**Error Handling / Logging:** follow project pattern; do not log sensitive client data; keep `game-core` observer-style logs.
**Testing:**
- `game-core`: `tsx src/test-runner.ts`; add `*.test.ts` beside source, matching the existing custom runner assert style. Add to the runner suite.
- `apps/web` / `apps/server`: run their unit tests if the sandbox permits; UI/browser QA often unavailable in this environment — mark visual items as needing real-browser QA, not just typecheck.
- `apps/web` build/dev may fail with `spawn EPERM` in sandbox (documented in tổng hợp.md) — do not claim build/browser PASS unless actually run.
**Docs:** per AGENTS.md, update affected sections of `tổng hợp.md` in the same batch, plus `TASKS.md`/`ROADMAP.md` if progress is affected.

**Task Size:** max ~200 LOC per task excluding tests; split if larger.

---

# 4. Contracts

> Define ALL interfaces and data structures BEFORE task specs.

## Interface: `<InterfaceName>`

```text
methodA(param: ParamType): ReturnType
  - pre: <precondition>
  - post: <postcondition>
  - throws: <error type when condition>
```

## Data Structure: `<EntityName>`

```text
EntityName {
  field: Type   - <semantics, constraints>
}
```

## Shared types / save-model impact

```text
(If this feature changes the save/state model or a shared DTO, document it here and flag save-compatibility.)
```

---

# 5. Target Architecture

**Components:**
- `<Module>` - <one-line responsibility>

**Interaction Flow:**
```text
(source flow with arrows between components)
```

**Key Decisions:**
- <decision> - <rationale>

---

# 6. Artifact Registry

| Artifact | Type | Owner Task | Implements |
|----------|------|------------|------------|
| `path/to/file.ts` | create/modify | TASK-001 | `InterfaceName` |

---

# 7. Task Graph

**User-Approved Phase/Sprint Strategy:**
Selected: `<strategy name>` — rationale + rejected alternatives (from `references/phase-strategies.md`).

| Phase/Sprint | Goal | Testable/Demoable Outcome |
|--------------|------|---------------------------|
| Phase 1 | <scope> | <outcome> |

| ID | Phase | Name | Depends On | Effort |
|----|-------|------|------------|--------|
| TASK-001 | Phase 1 | <name> | - | S/M/L |

**Dependency Graph:**
```text
TASK-001
  `-- TASK-002
```

**Execution Rules:**
- <parallel opportunities, ordering based on dependencies>

---

# 8. Task Specifications

## TASK-001: <task name>

**Phase/Sprint:** `<Phase 1>`

**Description:**
<2-3 sentences>

**Input:**
- None (root task) OR From TASK-XXX - `Type`

**Output:**
- `Artifact` - consumed by TASK-YYY

**Files:**
- `packages/game-core/src/x.ts` - **create**: <what>
- `packages/game-core/src/x.test.ts` - **create**: tests

**Responsibilities:**
- Implement `Interface.method()` per Section 4.

**Acceptance Criteria:**
- [ ] `method(input)` -> `expected output`
- [ ] Edge case #N from Section 9 handled
- [ ] `yarn --cwd packages/game-core test` includes passing cases for this module
- [ ] `yarn typecheck` passes (if runnable in environment)
- [ ] Docs updated in `tổng hợp.md` per AGENTS.md

---

# 9. Edge Cases

| # | Scenario | Expected Behavior | Handled In |
|---|----------|-------------------|------------|
| 1 | <description> | <behavior> | TASK-XXX |

**Game-specific edge cases to consider (as applicable):** empty inventory/stock=0, negative/zero quantities, first/last day boundary, day/night & weather transitions, multiplayer/co-op sync, save version migration, off-by-one in demand/state, concurrency in co-op.

---

# 10. Risks

| # | Risk | Impact | Likelihood | Mitigation |
|---|------|--------|------------|------------|
| 1 | <description> | H/M/L | H/M/L | <solution> |

---

# 11. Verification Plan

**Unit:** `<TestClass>` — validates <what>.
**Integration:** <component interaction test> — validates <end-to-end>.
**Manual/Smoke:** <scenario> — steps -> expected.
**Success Criteria:** all runnable automated tests pass; feature matches spec; perf within budget if applicable; no regressions; docs updated.

**Browser QA note:** if the change touches UI, list the viewports/steps the owner MUST verify in a real browser (e.g., `tools/e2e/layout-qa.js`), since browser QA is often blocked in the agent sandbox.

---

# 12. Rollout Plan (Optional)

| Phase | Scope | Gate Criteria |
|-------|-------|---------------|
| 1 | <scope> | <gate> |

**Rollback:** <trigger + action>

---

# 13. Future Improvements (Optional)

- <improvement> - rationale: <why deferred>
