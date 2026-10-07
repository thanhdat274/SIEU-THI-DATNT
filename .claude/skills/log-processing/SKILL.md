---
name: log-processing
description: Apply consistent, structured logging and refactor existing log statements in this TypeScript/Node project — add entry/exit logs for module functions, standardize error handling, and define a log format. (Adapted from ai-kit skill: log-processing — originally Java Spring Boot; rewritten for TypeScript/Node/browser game code)
allowed-tools: Read, Glob, Grep, Bash, Write
---

# Log-Processing & Refactor Skill (TypeScript/Node)

Add and standardize logging across the game's TypeScript code (server `apps/server`, shared logic in `packages/*`, and browser-side `apps/web` where appropriate). The principles mirror the original skill but target TS/Node loggers (`console.*` and/or a logger wrapper) instead of SLF4J.

## Goals
1. Add **entry/exit logs** for important public functions in the "service/domain" layer — NOT inside render or per-tick hot loops.
2. Standardize error handling with context logging.
3. Include relevant **entity IDs / keys** (storeId, customerId, productId, orderId, staffId, inventoryItemId...).
4. Log **early returns** with the reason.
5. Never log sensitive data (save payloads, credentials, PII).

> ⚠️ **Performance rule for this game:** `game-renderer`'s per-frame render loop and `game-core`'s per-tick simulation are HOT paths. Do NOT add logs inside loops or per-frame code. Log only on discrete events (state transitions, commands, errors), ideally gated so release builds can silence them.

---

## 🚨 MANDATORY STEP 0: Ask Preferences & WAIT
Before analyzing/applying logging, ASK the user and wait:
1. **Choose log format:** Option A (scan project's existing format) or Option B (choose a format below).
2. **Additional sensitive keys** beyond defaults (credentials, full save/state objects) that must NEVER be logged.

Do NOT modify code until the user replies.

## Log Format Options

### Option A — Scan & Follow Existing Format
Grep for existing `console.log/info/warn/error` or logger calls (`packages/*`, `apps/*`); detect dominant format; present findings; confirm before applying.

### Option B — Pre-defined Formats
**Format 1 — Semantic Action Log (⭐ recommended):**
```
[functionName] <Start/End> <Action> <Object> <Result> key=value
```
Actions: `Create/Update/Delete/Call/Send/Receive/Validate/Query/Process`. Results: `success/failed/not_found/denied/skipped/empty`.
```ts
console.info('[purchaseStock] Start Process Purchase storeId=1 supplierId=2');
console.info('[purchaseStock] Call SupplierService Purchase orderId=99');
console.info('[purchaseStock] End Process Purchase success orderId=99');
console.error('[purchaseStock] End Process Purchase failed orderId=99 error=' + err.message);
```

**Format 2 — Bracket Prefix (classic):**
```
[functionName] MESSAGE - key: value
```

**Format 3 — Structured Key-Value (machine-friendly):**
```
action=START method=functionName object=Object result=... key=value
```
Best for log aggregation pipelines parsing key=value.

## Step 1: Discover Conventions
- Check for a shared logger wrapper/util in `packages/shared` or `apps/server` that the project already uses — reuse it instead of raw `console.*`.
- Check existing log formats in code.
- Check whether there's a log-level switch / verbosity setting (important for browser game to avoid console spam).

## Logging Rules
### Where to log (adapt to this game)
- **Log entry/exit** in significant domain functions (e.g., purchase, checkout, staff hire, quest completion, server request handlers) — at the "service/domain" boundary, not UI event handlers that fire every tap.
- **Controllers/UI event handlers:** do not sprinkle logs; just route through the domain layer which owns logging.
- **Hot paths (renderer per-frame, game-core per-tick loops):** DO NOT log inside loops. Only log discrete events/errors.
- **Early returns:** log reason (info if normal e.g. `skipped`, warn if abnormal e.g. `not_found`).
- **Errors:** log with full context + entity IDs + error message, then rethrow/return error.
- **Levels:** `info` entry/exit + important steps; `warn` abnormal early-return/recoverable; `error` exceptions/critical; `debug` technical detail (and gate it behind a verbosity flag in release).

### Include entity IDs
When available: `storeId`, `customerId`, `orderId`, `productId`, `staffId`, `inventoryItemId`, `supplierId`, `questId`, `uid`/`userId`. These map to the game's entities.

### Core constraints (unchanged from original skill)
- No full save/request/response objects; log IDs + necessary fields only.
- No logging inside large loops.
- No logging huge payloads (Base64, raw binary).
- **Logs only observe state — never call APIs, query DB, or mutate state inside a log statement.**

## Execution Process
1. Execute MANDATORY STEP 0 (ask + wait; remember choices for the session).
2. Read the target file(s); identify domain functions and hot paths to avoid.
3. Identify logging points: entry, exit, early returns, catch blocks, important steps, entity IDs in scope.
4. Apply the chosen format; standardize existing messages; verify no sensitive data logged; keep hot paths clean.
5. Review: format consistent, no sensitive data, levels appropriate, nothing in loops/per-frame.

### Whole-package application
1. Choose format first (same for all files).
2. List files; skip pure presentational/hot-path files.
3. Process **one file at a time**.
4. Apply same rules; report summary of changes.
