---
name: code-secure-fixer
description: Analyze and fix security findings from security scanner report files (semgrep SAST, gitleaks secret detection, or similar JSON reports) or ad-hoc security review of this game's codebase. ALWAYS use when the user provides a security report file, mentions 'fix secure', 'security report', 'security scan', 'sast', 'gitleaks', 'semgrep findings', 'fix hardcode', 'fix secret'. Guides step-by-step with confirmation gates before fixing high-impact issues. (Adapted from ai-kit skill: code-secure-fixer)
allowed-tools: Read, Glob, Grep, Bash, Write
---

# code-secure-fixer — Security Vulnerability Analysis & Fix

## Overview
Analyze security scanner reports (semgrep, gitleaks, ...) or review findings, plan and execute fixes in priority order lowest-to-highest risk. High/critical-impact changes must be confirmed with the user.

## Step 1 — Request & Validate Report File
If no report file provided, ask for one. Validate: exists, parseable JSON, contains expected keys (e.g., `Findings`/`Scanners` for GitLab, or `vulnerabilities` for GHAS/Snyk formats). If invalid, report the error and re-request. Do not proceed without a valid report.

If the user has NO report file and asks for a security check directly, fall back to a targeted manual review (grep for secrets, hardcoded config, CORS, unvalidated input) and present findings in the same grouping format.

## Step 2 — Analyze High-Level Overview
**2.1** Repo/commit info (repo, branch, commit, timestamp) if present.
**2.2 Branch check gate:** run `git branch --show-current`; compare to the most recent value in this session. If different, warn and ask: continue on current branch or restart on the correct branch. Wait for answer.

**2.3 Scanner table** (only those present in the report):
| Scanner | Type | What it detects |
|---------|------|-----------------|
| gitleaks | Secret | Secrets/credentials committed to git history |
| semgrep | SAST | Security logic flaws in source (injection, crypto, etc.) |

## Step 3 — Statistics & Finding Grouping
**3.1 Summary table** by scanner (issues / critical / high / medium).
**3.2 Group findings by rule/pattern.** For each group: 🔴/🟡/🟢 severity, code status (Active/Commented/Non-source), impact scope, root cause, file list with fix approach.
**3.3 Confirmation gate — STOP**, ask:
1. Findings outside normal scope (vendor dirs, generated, test data)? Fix those too?
2. "Does the plan look reasonable? Skip any groups or adjust order?"

## Step 4 — Propose Fix Order
| Level | Fix Type | Example | Confirm |
|-------|----------|---------|---------|
| 1 | No code change — delete/gitignore unnecessary files | logs, test-data JSON, leftover scripts | No |
| 2 | Fix config files | `.env`, config with credentials, Firebase service-account placement | No |
| 3 | Fix hardcode/comments (low impact) | key in comment/commented code | No |
| 4 | Fix active hardcode (medium impact) | Firebase admin credential hardcoded → move to env/secret store; missing validation | No |
| 5 | Fix SSL/CORS bypass (medium-high) | wildcard CORS on server, `AllowAnyOrigin`, disabled SSL verify | **Ask per item** |
| 6 | Fix algorithms/encryption/auth (high) | weak crypto, broken auth/authorization | **MUST confirm** |
| 7 | System-level (critical) | libs with CVEs, git history rewrite | **MUST confirm** |

After confirm, export plan doc (e.g., `fix-code-secure-plan.md`), record `session-branch`, populate per-level `[ ]` lists. Then **context gate**: recommend a fresh session referencing the plan file; ask continue-here vs new-context.

## Step 5 — Execute Fixes
Read the plan file; verify branch matches `session-branch`. Execute Level 1→7 in order; after each task update `[ ]`→`[x]`; when done set `status: completed`.
- Level 1: DO NOT delete without confirming each file/all.
- Level 2/3/4: replace secrets with `""` or placeholders; move credentials to env or a secret manager.
- Level 5: per finding, explain bypass risk, whether intentional (dev only), options Fix/Ignore/Ignore-all; Ignore-all → add suppression comment with reason.
- Level 6/7: confirm first; explain if breaking; suggest migration.
- False positives: explain and add suppression comment with reason.

> **Project note:** this repo has a Firebase admin service-account JSON at the root. Treat it like the most critical secret: it must be git-ignored and loaded from a protected secret store, never committed or baked into a client bundle. Flag it if found in a scan or during review.

## Step 6 — Summary & Notes
**6.1** Work summary table (Level / Description / Files Fixed / Status). **6.2 MANDATORY:** any secret ever committed must be considered compromised → revoke/rotate immediately. Update `.gitignore` for sensitive files (`.env`, `*.local.json`, service-account JSON, `*.log`). Notify team of breaking changes.

## Step 7 — Git History Cleanup (only when gitleaks/secret findings present)
Rewrite history to purge committed secrets (git-filter-repo / BFG), force push with team coordination. Confirm first — this is destructive and affects all collaborators.

MUST confirm with user before rewriting history; it is very hard to undo.
