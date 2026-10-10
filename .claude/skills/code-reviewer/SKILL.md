---
name: code-reviewer
description: Use when code has been written and needs quality review before merging or delivery. Trigger when user says 'review code', 'review this', 'check my code', 'code review', 'review the implementation'. Performs structured review against security, logic, performance, and convention checklists; outputs a RED/YELLOW/GREEN verdict. (Adapted from ai-kit skill: code-reviewer)
allowed-tools: Read, Glob, Grep, Bash
---

# Code Reviewer — Structured Code Quality Gate

**Role:** Senior Code Reviewer.
**Mission:** Review implemented code against a structured checklist, identify issues by severity, produce an actionable verdict report.

**Input:** File paths, git diff, or branch.
**Output:** Code Review Report with RED / YELLOW / GREEN verdict.

> Compatibility: agent-agnostic, tech-stack agnostic (Read/Grep/Shell). Adapted to this game project.

---

## Process Flow

```
Receive code to review (files, diff, branch)
        |
Phase 0: Context Bootstrap (read AGENTS.md, tổng hợp.md, related code)
        |
Phase 1: Scope Identification (changed files + 1-hop deps; confirm with user)
        |
Phase 2: Review Against Checklist (Security/Logic/Performance/Clean code/Conventions)
        |
Phase 3: Generate Code Review Report (RED/YELLOW/GREEN)
```

---

## Phase 0: Context Bootstrap (Conditional)

Skip if context already exists in the session. Run when standalone:
- Read `package.json` (workspaces), `AGENTS.md`, and `tổng hợp.md` for current-state and conventions.
- Read 2-3 existing files similar to the code under review.

---

## Phase 1: Scope Identification

1. From git diff: `git diff <base>..HEAD --name-only`.
2. From user: provided paths.
3. Direct dependencies: 1-hop callers/callees only — do NOT review the entire codebase.
4. Present scope and STOP for confirmation.

---

## Phase 2: Review Against Checklist

### 2.1 Security
| Check | What to Look For | Severity |
|-------|------------------|----------|
| Hardcoded secrets | API keys, Firebase service-account credentials, tokens in source | CRITICAL |
| Injection | Unsanitized user input in queries/scripts | CRITICAL |
| XSS | Unsanitized render of user input in React | CRITICAL |
| Auth/Authz | Missing permission checks on server ops | CRITICAL |
| Data exposure | Sensitive fields in server responses/logs | WARNING |
| CORS/SSL | Overly permissive CORS on server | WARNING |
| Firebase/save | Client trusting unverified save/state input (cheat/save-edit vector) | WARNING |

### 2.2 Business Logic & Edge Cases
| Check | What to Look For | Severity |
|-------|------------------|----------|
| Spec compliance | Implementation matches spec/plan | CRITICAL |
| Null/empty | Missing null/empty handling on external data | CRITICAL |
| Boundary | Off-by-one; empty collections; zero/negative quantities/stock | WARNING |
| Error paths | All branches covered incl. default/fallback | WARNING |
| Concurrency | Race in co-op shared state; time-based determinism | WARNING |
| Determinism | Same seed → same outcome; no hidden Math.random/Date.now in sim path where it must be seeded | WARNING |

### 2.3 Performance
| Check | What to Look For | Severity |
|-------|------------------|----------|
| Unbounded operations | Unbounded loops/arrays in game-core tick or renderer | CRITICAL |
| Hot-path allocations | Object/array allocation per frame in renderer (~60fps); churn/GC pressure | WARNING |
| Redundant computation | Repeated calculations, missing caches; per-entity deep-copies each frame | WARNING |
| Culling/LOD | Off-screen entities rendered/updated unnecessarily | WARNING |

### 2.4 Clean Code & Maintainability
| Check | What to Look For | Severity |
|-------|------------------|----------|
| Dead code | Commented blocks, unused imports/vars | WARNING |
| Magic numbers | Hardcoded balance values without named constants (esp. economy/sim tuning) | WARNING |
| Function size | Functions > ~50 lines or doing many things | WARNING |
| Naming | Unclear/misleading names | WARNING |
| Duplication | Copy-pasted logic that should be extracted | WARNING |
| Error handling | Swallowed exceptions, generic catches | WARNING |

### 2.5 Convention Compliance
| Check | What to Look For | Severity |
|-------|------------------|----------|
| Package boundaries | sim logic in game-core, render in game-renderer, UI in apps/web | WARNING |
| Responsive rules | No new breakpoints; uses data-density/--touch/--safe-* | WARNING |
| Test coverage | Game-core changes have `*.test.ts` added to the runner | WARNING |
| Docs | `tổng hợp.md` affected sections updated per AGENTS.md | WARNING |
| Import/style/format | Match existing patterns | INFO |

---

## Phase 3: Code Review Report

```markdown
# Code Review Report

**Scope:** [N files reviewed — paths]
**Date:** [date]
**Verdict:** RED — Must Fix / YELLOW — Proceed with Caution / GREEN — Approved

## Summary
<1-2 sentences>

## Critical Issues (Must Fix)  <!-- omit if none -->
| # | File:Line | Category | Issue | Recommendation |

## Warnings (Should Fix)  <!-- omit if none -->
| # | File:Line | Category | Issue | Recommendation |

## Info (Suggestions)  <!-- omit if none -->
| # | File:Line | Category | Suggestion |

## Checklist Summary
| Category | Verdict | Issues |
|----------|---------|--------|
| Security | PASS/WARN/FAIL | n |
| Business Logic | PASS/WARN/FAIL | n |
| Performance | PASS/WARN/FAIL | n |
| Clean Code | PASS/WARN/FAIL | n |
| Conventions | PASS/WARN/FAIL | n |
```

---

## Decision Rules

| Verdict | Condition | Action |
|---------|-----------|--------|
| RED | Any CRITICAL | STOP. Present. Must fix before proceeding. |
| YELLOW | No CRITICAL but WARNINGs | Present. Ask: "Fix now or proceed?" |
| GREEN | No CRITICAL, no WARNING | Present. Proceed. |

On RED: list critical issues with paths/lines; after fixes re-run Phase 2 on affected files until GREEN/YELLOW-confirmed.

---

## Anti-Patterns

- Reviewing the entire codebase (scope creep).
- Vague findings — every finding needs specific file:line + issue + recommendation.
- Reporting style as critical (formatting is INFO).
- Skipping scope confirmation.
- Generating fixes without asking — report; let the user decide.
