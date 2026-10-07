---
name: action-commit
description: You MUST use this when the user requests to commit code; trigger when the user says 'create commit', 'tao commit cho toi', 'commit'. Standardizes commit messages for this project. (Adapted from ai-kit skill: action-commit)
allowed-tools: Read, Grep
---

# Action Commit — Standardize Commit Messages

Follow these conventions to keep commit history consistent with this project's "Đợt" (work-batch) workflow.

> **Project note:** this game project does NOT use Jira/GitLab IDs. It organizes work by **"Đợt" (sprint/batch)** — e.g., Đợt 14D, Đợt 12 — documented in `tổng hợp.md`. Use a short, human-readable prefix derived from the branch name or the batch the change belongs to.

## 1. Prefix Mapping

Extract a prefix from the current branch or the batch name:

| Category | Branch / Context | Prefix |
| :------- | :--------------- | :----- |
| Work batch | `da-14d-*`, `wip/14d`, or user says "Đợt 14D" | `14d` (or `da-14d`) |
| Feature | `feat/...`, `feature/...` | `feat` |
| Fix | `fix/...`, `hotfix/...` | `fix` |
| Chore/maintenance | `chore/...`, `refactor/...`, `docs/...` | `chore` / `refactor` / `docs` |
| Main/latest | `main`, `master` | `main` |

If the branch contains a structured batch id, prioritize it. If none, fall back to the category.

## 2. Commit Message Format

`[Prefix]: [Summary]`

- **Summary:** concise, ideally under 15 words, accurately describing the functional change.
- **Timeline/scope hints:** you may reference the batch (e.g., "14D") or affected package (game-core / renderer / web) in the summary when it aids clarity, e.g. `14d: compact inventory list + sticky restock footer (web)`.

## 3. Rules

- Do NOT mention/trigger commits based purely on changes to: `README.md`, `.gitignore`, `tổng hợp.md`-only doc edits are allowed if they accompany code, but a pure doc change should use `docs:` prefix.
- Merges on `main`/`develop` → use the target branch name as prefix.

## 4. Examples

| Scenario | Branch | Prefix | Final Message |
| :------- | :----- | :----- | :------------ |
| Batch 14D UI | `da-14d-mobile` | `14d` | `14d: mobile-first cashier sticky footer + inventory row` |
| Fix memory leak in renderer | `fix/renderer-socket` | `fix` | `fix: reduce per-frame allocations in renderer hot path` |
| Refactor test runner | `refactor/test-runner` | `refactor` | `refactor: unify game-core test registration` |
| Direct main | `main` | `main` | `main: release cut for upcoming QA` |

## 5. AI Co-Authorship

When the AI agent contributes, append this trailer after the body and before the final closing:

```
Co-authored-by: AI Agent <agent@ai-kit>
```

Example:
```
14d: compact inventory list + sticky restock footer

- Move restock action to PixelDialog footer
- Compact product row; add .inventory-grid override

Co-authored-by: AI Agent <agent@ai-kit>
```

> **Note:** per AGENTS.md, this project generally does NOT auto-commit/push. Only create a commit when the user explicitly asks.
