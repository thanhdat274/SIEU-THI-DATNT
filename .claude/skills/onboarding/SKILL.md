---
name: onboarding
description: Discover, consolidate, and document the high-level architecture, project structure, coding conventions, simulation systems, and external integrations of this game, so future AI can load only what it needs. Creates/refreshes a modular onboarding guide under docs/onboarding/ that cross-references the project's existing docs (ARCHITECTURE.md, tổng hợp.md, HIEN-TRANG-CODE.md, GAME_DESIGN.md, DATABASE_SCHEMA.md). Use when the user says 'onboarding', 'document architecture', 'understand codebase', 'map project structure'. (Adapted from ai-kit skill: onboarding)
allowed-tools: Read, Glob, Grep, Bash, Write
---

# Onboarding Skill

## Goal
Create or refresh a modular onboarding guide under `docs/onboarding/` so any AI can:
- Load only the context it needs (save tokens).
- See high-level architecture and how packages/systems connect (with diagrams).
- Navigate the monorepo structure.
- Follow coding/documentation conventions (AGENTS.md).
- Know which files call external services (Firebase server) and why.
- Avoid breaking existing systems (simulation determinism, responsive UI tokens, save model).

> **Important — reuse existing docs, don't duplicate them.** This project already has:
> - `AGENTS.md` (working rules), `ARCHITECTURE.md`, `GAME_DESIGN.md`, `DATABASE_SCHEMA.md`, `HIEN-TRANG-CODE.md`, `tổng hợp.md` (batch/current-state log), `TASKS.md`, `ROADMAP.md`.
> The onboarding guide should **point to and summarize these** rather than rewrite them. Only create content not already covered.

## Output Structure (thin, cross-referencing)
```
docs/onboarding/
├── 01-architecture.md        <- packages, renderer/sim split, component diagram
├── 02-project-structure.md   <- monorepo tree + where things live
├── 03-conventions.md         <- naming, patterns, responsive tokens, docs rules (from AGENTS.md)
├── 04-systems.md             <- game systems map (sim vs render vs UI) — the simulation "domain glossary"
├── 05-testing-guide.md       <- game-core custom runner, apps tests, browser-QA caveat
├── 06-external-services.md   <- apps/server, Firebase Firestore, service-account handling
└── 07-troubleshooting.md     <- build/typecheck, spawn EPERM sandbox notes, common issues
```
Register an index in `AGENTS.md` (or a dedicated onboarding index block) so agents discover it on demand.

## Phase 0 — Check for Existing Guide
If `docs/onboarding/` exists and is indexed → run **Refresh Mode** (delta only). Otherwise run full generation (Phases 1–3).

## Phase 1 — Scan & Discover
Analyze the codebase:
1. **Architecture** — monorepo: `packages/game-core` (sim), `packages/game-renderer` (2.5D), `packages/game-data`, `packages/shared`, `apps/web` (React mobile UI), `apps/server` (Node + Firebase). Entry points, module relationships.
2. **Project structure** — top-level dirs, key entry files.
3. **Conventions** — from `AGENTS.md`: read `tổng hợp.md` on any code edit; update affected docs in the same batch; distinguish "has code" vs "verified"; no fake results.
4. **Game systems** — map the main simulation systems (customers/staff/demand/supply/warehouse/checkout/quests/regulars/weather/traffic/co-op, etc.) and where they live; cross-link to `GAME_DESIGN.md`.
5. **Testing** — `packages/game-core`: `tsx src/test-runner.ts` custom runner, `*.test.ts` beside source; apps unit tests; browser/UI QA often blocked in sandbox (documented).
6. **External connections** — `apps/server`, Firebase Firestore, service-account JSON, save model.
7. **Troubleshooting** — typecheck, `spawn EPERM` build/dev issue in sandbox, golden-data updates.

**Read before you infer.** Open key files; consistent patterns are conventions, one-offs are not.

## Phase 2 — Confirm & Discuss
Present findings in groups (Architecture / Conventions / Systems / External). Ask one question at a time; skip items the code scan already answers clearly. Prefer predefined options.

## Phase 3 — Write/Refresh
Generate/update the thin guide files above with **real findings**, cross-referencing the existing docs. Register the index in `AGENTS.md`. Do not duplicate content that lives elsewhere — link to it.

### Refresh Mode
Read `AGENTS.md` index + existing files (note "Generated on" date). Do a targeted delta scan (recently added modules/systems, new server endpoints, changed conventions). Present a compact delta summary grouped by file; update only changed files and the date. Re-ask only genuinely new questions.
