# Phase and Sprint Strategy Catalog

Use this catalog when proposing phase, sprint, or workflow boundaries before writing a full implementation plan. Pick 3-5 strategies that fit the spec and codebase; do not present every strategy by default.

## Selection Criteria

- User feedback timing: how soon users can review real behavior.
- Risk reduction: how early technical uncertainty is resolved.
- Integration cost: how much cross-layer work is deferred.
- Reviewability: how easy each phase is to inspect and test.
- Release value: whether each phase can ship/demo a meaningful outcome.
- Team topology: whether work can be parallelized across owners.
- Rework risk: whether wrong assumptions invalidate later tasks.

## Strategy Catalog

### 1. Vertical Slices
Split by end-to-end user-visible capability; each phase touches the layers needed for one narrow behavior.
Best when: early user feedback matters; architecture is stable enough to extend; each phase should be demoable.
Tradeoffs: cross-layer coordination each phase; can duplicate setup if shared foundations aren't identified first.

### 2. Horizontal Layers
Split by technical layer (e.g., data model, game-core logic, renderer, UI, integration).
Best when: layer contracts are clear; foundational layer must finish first.
Tradeoffs: user-visible value arrives late; integration issues surface near the end.

### 3. Core Domain First
Implement game-core domain contracts/rules/invariants + tests before UI/renderer/adapters.
Best when: simulation/mechanics are complex or high-value; UI reuses the same core behavior.
Tradeoffs: less demoable early; requires discipline to avoid premature abstractions.

### 4. Risk First / Spike First
Put the riskiest unknowns first: rendering performance, determinism, co-op sync, save migration, balance.
Best when: a single unknown can invalidate the plan.
Tradeoffs: early phases are prototypes/proof rather than user value; spike output must be converted to production tasks.

### 5. Walking Skeleton
Build a minimal production-shaped path across all major components first.
Best when: deployment/architecture wiring is uncertain.
Tradeoffs: first phase looks small; needs clear boundaries.

### 6. MVP Then Hardening
Deliver the smallest complete behavior, then add edge cases, perf, polish, observability.
Best when: fast validation > completeness; requirements may shift.
Tradeoffs: hardening must be explicitly planned or it gets skipped.

### 7. Contract First / API First
Define and stabilize public contracts (module interfaces, shared types, save-model) first.
Best when: multiple consumers depend on the interface; backward compatibility matters.
Tradeoffs: early contract decisions are expensive to change.

### 8. Data / Migration First
Handle save-model/schema changes, migration, backfill, compatibility before higher-level behavior.
Best when: existing saves must be preserved/transformed; migration risk is high.
Tradeoffs: user-visible behavior delayed; needs careful compatibility planning.

### 9. Test First / Quality Gate First
Define tests/golden/acceptance scenarios first, then implement behavior against those gates.
Best when: existing behavior must not regress (game has extensive `*.test.ts` + golden data); sensitive paths.
Tradeoffs: slower initial progress; poor tests can lock in the wrong design.

### 10. Dependency-First / Enabler First
Build shared enablers first (shared utils, design tokens, fixtures) many later tasks need.
Best when: many later tasks depend on the same foundation.
Tradeoffs: can drift into overengineering; must tie to concrete downstream tasks.

### 11. Thin Adapter First
Create minimal adapters around external systems (Firebase, server APIs, persistence) before richer behavior.
Best when: external boundaries are unstable/hard to test.
Tradeoffs: adapter contracts may change as domain needs become clearer.

### 12. Release Train / Feature Flag Phases
Split around controlled rollout (hidden → beta → full → cleanup).
Best when: production risk needs staged exposure.
Tradeoffs: operational overhead; needs explicit cleanup tasks.

### 13. Strangler Fig / Incremental Replacement
Wrap/replace an existing implementation piece by piece while keeping the game working.
Best when: replacing legacy code without a big-bang rewrite.
Tradeoffs: temporary duplication; needs a clear end state.

### 14. Hybrid Strategy
Combine two or more strategies when one approach alone creates poor sequencing.
Best when: the work has both high uncertainty and user-facing increments.
Tradeoffs: can become hard to explain.

## Recommendation Format

```markdown
## Phase Strategy Options

### Option A: <strategy name>
Phases:
- Phase 1: <name> - <scope>
- Phase 2: <name> - <scope>

Demo/test after each phase:
- Phase 1: <observable outcome>
- Phase 2: <observable outcome>

Why choose this:
- <reason tied to spec/codebase>

Tradeoffs:
- <speed/reviewability/risk/rework/user feedback timing>

### Recommended: Option <X>
<short rationale>

Please choose one option, combine parts, rename/reorder phases, or reject these and describe the split you want.
```
