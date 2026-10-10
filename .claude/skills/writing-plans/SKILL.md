---
name: writing-plans
description: Use when you have a spec or requirements for a multi-step task, before touching code. Transforms a spec (from brainstorming) into a detailed, structured implementation plan using a proven template, with an explicit stop point for the user to choose the phase/sprint strategy before the full plan is written. (Adapted from ai-kit skill: writing-plans)
allowed-tools: Read, Glob, Grep, Bash, Write
---

# Writing Plans

Transform a validated spec into a concrete, structured implementation plan using the plan template at `references/plan-template.md`.

## When You're Invoked

Typically called after `brainstorming` completes and a spec exists at `docs/plans/<topic>/YYYY-MM-DD-spec.md`. You can also be invoked with inline requirements or a file path.

Output: `docs/plans/<topic>/YYYY-MM-DD-plan.md`

**Announce at start:** "I'm using the writing-plans skill to create the implementation plan."

## Scope Check

If the spec covers multiple independent subsystems, it should have been broken into sub-project specs during brainstorming. If not, suggest splitting — each plan should produce working, testable software on its own.

## Step 1: Read the Template

Read `references/plan-template.md` (same directory). Follow it section by section.

## Step 2: Find and Read the Spec

1. Check `$ARGUMENTS` for a file path or inline requirements.
2. Search `docs/plans/` for the most recent spec file.
3. Read full codebase context: key files, tech stack, existing patterns, recent commits; read `tổng hợp.md` per AGENTS.md.
4. If no spec exists, ask the user to provide one.

## Step 3: Analyze Before Writing

- **Contracts first**: interfaces/data structures before tasks.
- **Phases**: natural implementation order; each phase leaves the game working/testable/reviewable.
- **Artifact Registry**: files created/modified + owner task.
- **Task Graph**: parallel tasks + true dependencies.
- **Edge Cases**: explicit handling + which task owns each.
- **Risks**: uncertainties; plan spikes (e.g., performance, determinism).

**Project-specific considerations for this game:**
- **Correctness vs. performance boundary:** simulation correctness lives in `game-core` (deterministic, offline-testable); rendering/perf lives in `game-renderer` (hot path — allocations, culling, LOD). A plan must say where each change lands.
- **Testing:** game-core tests run via `tsx src/test-runner.ts`; use `*.test.ts` beside source, matching the existing custom runner's assert style. UI tests are inconsistent in this environment (browser QA often blocked) — be explicit that UI changes need real-browser QA (per tổng hợp.md), not just typecheck.
- **Docs:** per AGENTS.md, every change to behavior/data/architecture must update the affected sections of `tổng hợp.md` in the same work batch, plus `TASKS.md`/`ROADMAP.md` if progress is affected.

## Step 3.5: Propose Phase Strategy and Stop

Before writing the full plan, read `references/phase-strategies.md`, present 3-5 viable phase strategies, and STOP for the user to choose/combine/rename. Do not write the complete plan until they confirm. After confirmation, preserve the chosen phase names and order in Sections 7 and 8.

## Task Granularity

Bite-sized, actionable tasks. Each task should make sense independently.
- If a task exceeds ~200 LOC (excluding tests), split it.
- Each task: clear goal, files it touches, behavior added/changed.

## No Placeholders

Never write: "TBD", "TODO", "implement later", "add appropriate error handling" without specifics, "write tests for the above" without criteria, or steps that describe what without showing how (include concrete examples/criteria for code steps).

## Step 4: Fill in the Plan Template

Work through each section of `references/plan-template.md` in order. Key guidance:

- **Section 4 (Contracts):** define all interfaces/data structures before task specs, with pre/post conditions and throws. This is what separates a solid plan from a bullet list.
- **Section 7 (Task Graph):** start from the user-approved phase strategy; build dependency table + ASCII graph; explicit parallel work.
- **Section 8 (Tasks):** phase/sprint, input, output, files (create/modify), responsibilities, concrete acceptance criteria (`method(input) -> expected output`), referencing Section 9 edge cases.
- **Section 9 (Edge Cases):** every edge case MUST have a "Handled In" column pointing to a task.
- **Section 10 (Risks):** add spike tasks for high-risk unknowns.

## Self-Review

1. **Spec coverage:** every spec requirement → a task. List gaps.
2. **Placeholder scan:** none of the "No Placeholders" red flags.
3. **Type consistency:** names/signatures/properties match across tasks.
4. **Phase consistency:** Sections 7 & 8 preserve the user-approved phase names/order.

Fix inline; if a spec requirement has no task, add the task.

## After Writing the Plan

1. Save to `docs/plans/<topic>/YYYY-MM-DD-plan.md`.
2. Tell the user the plan is ready with its path.
3. STOP — ask: "Plan document written. Commit plan and spec to git?" (this project generally does not auto-commit — confirm with user per working style).
