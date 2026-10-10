---
name: test-strategy
description: Gateway skill for planning and writing tests in this game. Analyzes code and spec to generate structured, prioritized test cases covering happy paths, error paths, edge cases, and boundary conditions; then writes tests using the project's custom runner in packages/game-core. Trigger when user says 'write tests', 'test strategy', 'test plan', 'test cases', 'edge cases', 'test coverage'. (Adapted from ai-kit skill: test-strategy)
allowed-tools: Read, Glob, Grep, Bash, Write
---

# Test Strategy — Structured Test Planning & Case Generation

**Role:** Senior QA Engineer / Test Architect for a simulation game.
**Mission:** Generate comprehensive, prioritized test cases that catch real bugs — not just prove the happy path.

**Input:** Code files, spec, plan, or feature description.
**Output:** Structured test plan; then test code using the project's custom runner.

> Compatibility: tech-stack agnostic planning phase; code generation targets this game's TypeScript test setup.

---

## About This Project's Test Setup (read before writing tests)

- **`packages/game-core`**: the simulation core. Tests live beside source as `*.test.ts` and run through a **custom runner**: `yarn --cwd packages/game-core test` (→ `tsx src/test-runner.ts`). Tests are NOT vitest/jest — they use the project's own assert/approval style. **Read 2-3 existing `*.test.ts` files and `src/runner.ts`/`src/test-runner.ts` first to match the exact API** (how cases are registered, how assertions/expectations are written, how they're added to the suite).
- **`packages/game-renderer`**: rendering. Mostly visual — plan for real-browser/Q&A verification rather than unit-testing these; focus tests on any pure logic (e.g., `packages/game-renderer/src/viewport.ts`).
- **`apps/web`** (React UI) and **`apps/server`** (Node + Firebase): have their own unit test scripts. Browser/e2e UI QA is often blocked in the agent sandbox (documented in `tổng hợp.md`); do not claim UI PASS without a real browser.
- **Golden data:** some game-core tests use golden/approved outputs (`src/__golden__`). When behavior intentionally changes, update goldens deliberately, not blindly.
- **Docs:** per AGENTS.md, test-related or behavior changes should be reflected in `tổng hợp.md`.

---

## Process Flow

```
Receive input (code, spec, or description)
        |
Phase 0: Context Bootstrap (detect modules, read conventions)
        |
Phase 1: Identify Test Subjects (functions/systems/inputs/outputs/side effects/state)
        |
Phase 2: Generate Test Cases (happy / error / 4 mandatory edge categories / integration)
        |
Phase 3: Present Test Plan  -> STOP, user approves
        |
Phase 4: Generate Test Code (game-core custom runner or platform tests)
        |
Done
```

---

## Phase 0: Context Bootstrap

### 0.1 Detect modules & systems
Map the subject to game systems. Common `game-core` modules: customers, staff, demand/forecast, market/pricing (markup/tax), supply/purchasing (suppliers, cart), warehouse/inventory (stock, spoilage, shelf slots), store layout/planogram, checkout/cashier/ledger, daily-routine/day-rhythm, quests, regulars, delivery, weather/rain, traffic/street, neighborhood pedestrians, co-op/day, goals/titles/perks, security, production/dining/xoi/snack/drink/stalls.

### 0.2 Match test style
Read 2-3 existing `*.test.ts` files to learn: naming, setup/teardown patterns, the runner's assertion style, how randomness/time is controlled (determinism/seed), and how tests get added to the suite. Mirror it.

### 0.3 Read spec/plan (if available)
Extract acceptance criteria and edge-case sections → direct test cases.

---

## Phase 1: Identify Test Subjects

For each subject, capture:
| Aspect | What to Identify |
|--------|-----------------|
| Inputs | params, state, injected deps, RNG/seed, time-of-day/weather |
| Outputs | return values, state mutations, emitted events |
| Side effects | save writes, co-op sync, spawned entities/vehicles, ledger entries |
| Dependencies | other systems, persistence, server/Firebase |
| State | precedex, mutations, invariants that must hold |

Present subjects and STOP for confirmation.

---

## Phase 2: Generate Test Cases

### 2.1 Happy Path (Required)
Main success scenarios: valid flow, complete state transitions, coverage of distinct roles/modes (e.g., dine-in vs take-away, multi-day, co-op).

### 2.2 Error / Unhappy Paths (Required)
Missing input, out-of-range (negative/zero stock/qty), unauthorized/edge permissions (server), external failure (server/Firebase), duplicate operations.

### 2.3 Edge Cases (MANDATORY — all 4 categories, never skip)
| # | Category | Examples in this game |
|---|----------|------------------------|
| 1 | Null/Undefined/Empty | empty inventory, empty list, no customers that day, zero stock, undefined config |
| 2 | Boundary | min/max stock, first/last day, single vs many items, exact limit (budget cap, shelf slots), midnight/day-change |
| 3 | Format Outliers | huge quantities/values, long strings (names/notes), extreme weather, negative prices, Unicode in product data |
| 4 | Concurrency & State | double-checkout, rapid successive ops, co-op race on shared state, desync with seed, replay determinism |

### 2.4 Integration Points (if applicable)
- game-core ↔ renderer/UI contracts; game-core ↔ server; co-op multi-client sync; save load/save-version migration.

---

## Phase 3: Present Test Plan

```markdown
# Test Plan: <module/feature>
## Framework: game-core custom runner (`tsx src/test-runner.ts`) / apps web|server unit tests
## Test Subjects: [N]

### Happy Path
| # | Case | Input | Expected | Priority |
### Error Paths
| # | Case | Input | Expected Error | Priority |
### Edge Cases  (must include all 4 categories)
| # | Category | Case | Input | Expected | Priority |
### Integration
| # | Case | Components | Expected | Priority |

## Summary
| Category | Count | High | Med | Low |
```

STOP: "Test plan generated with N cases. Review and approve before proceeding." Options: approve / add / remove / generate code.

---

## Phase 4: Generate Test Code

Only after approval. For **game-core**: create/extend `*.test.ts` beside source, matching the custom runner API and convents; register in the suite. For **apps/web|server**: use their unit test scripts. For anything renderer/UI-only: output the plan as steps for real-browser QA (browser QA often blocked in this sandbox).

Rules (generic):
1. Follow existing patterns (naming, setup, assertions).
2. One test file per subject (unless convention differs).
3. Group by category (happy/error/edge/integration).
4. Clear test names.
5. Independent tests.
6. Mock external deps, NOT the unit under test; keep sim deterministic (inject/seed RNG, fixed time-of-day).
7. Assertion failure messages that diagnose without re-reading code.
8. Place correctly; add to the runner so they actually execute.

---

## Anti-Patterns

- Testing only happy path.
- Testing implementation details instead of observable behavior/contracts.
- No assertion messages.
- Mocking everything (hides real integration bugs).
- Copy-pasting setup without shared fixtures — but keep fixtures aligned with existing game fixtures.
- Ignoring determinism/concurrency (game's hardest bugs).
- Giant test methods (one behavior each).
- Skipping edge-case categories.
