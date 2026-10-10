---
name: entity-reader
description: Extract, document, or export the data model/entities of this game. Use when the user works with schema files, TypeScript data/shared types, or the DATABASE_SCHEMA.md and wants to document, export (Excel/CSV/Word/Markdown/JSON), or generate references from them. Triggers on 'read my entities', 'document my schema', 'export to Excel/CSV/Word', 'data dictionary', 'điền template' (Vietnamese). (Adapted from ai-kit skill: entity-reader — Spring JPA focus replaced with this game's TS types + schema doc)
allowed-tools: Read, Glob, Grep, Bash, Write
---

# Entity / Data Model Reader Skill

**Adapted for this game:** the "entities" here are TypeScript data model / shared types (`packages/shared`, `packages/game-data`) and the schema documented in `DATABASE_SCHEMA.md` (client save model + server Firestore). There is no Spring JPA. Detect the source framework/format from content.

## Detect source format

| Format | Signals |
|--------|---------|
| TypeScript interfaces/types | `.ts` with `interface` / `type` / `Pick`/`Readonly` |
| Game data definitions | `packages/game-data` product/recipe/tier tables |
| Schema doc | `DATABASE_SCHEMA.md` (markdown table of save model / collections) |
| Firestore | `firestore.indexes.json`, collection naming in apps/server |
| Raw DDL/SQL | `.sql` with `CREATE TABLE` |
| TypeORM/Prisma | `@Entity()` in .ts, or `schema.prisma` `model` blocks |

## Step 0 — Clarify Mode (HARD GATE, mandatory)
Confirm before touching files unless the request explicitly states: mode, scope (specific systems/all), output format, and (for export) filter + columns.
Ask:
> "Which fits? **A — Schema docs** (document the data model → Excel/Markdown/Word/JSON). **B — Data export** (write queries / export records from the live DB). **C — Both.**"
Then ask scope, output format, filters/columns. Echo a short plan and get a green light before proceeding.

## Step 1 — Ingest Sources
Based on scope: locate the relevant types in `packages/shared`, `packages/game-data`, `DATABASE_SCHEMA.md`, or server Firestore setup. List what's found and confirm before parsing (avoids documenting test/legacy structures).

## Step 2 — Parse Metadata
For each entity/collection extract:
| Column | Source |
|--------|--------|
| Name | type/interface name, or collection name |
| Fields | properties with types |
| Type | TS type (string/number/boolean/array/object/union) |
| Nullable/optional | `?` optional marker |
| Default | initializer/literal |
| Constraints | literal unions, ranges, enums |
| Description | doc comment / JSDoc on the field |
| Relationships | refs to other types/collections, Firestore subcollections |

## Step 3 — Confirm Output Mode
If not decided, confirm format. Modes:
- **A — Generate new file:** Excel (`.xlsx`), CSV, Word (`.docx`), Markdown, JSON. Structure: summary sheet/table (one row per entity: name, table/collection, field count, PK) + per-entity detail. Match any existing formatting expectations.
- **B — Fill template:** any `.xlsx`/`.docx` template — auto-detect header row/columns, map fields with fuzzy matching, append without overwriting existing data.
- **C — Generate reference/schema notes:** produce a clean Markdown/JSON data dictionary of the model (not SQL DDL — no relational DB here; Firestore collections can be shown as docs).

## Step 4 — Save & Present
Print a summary (entities/fields found, warnings, skipped). Save output to a sensible path (e.g., `docs/` or a `data-dictionary` output folder). `present` the output file.

## Anti-patterns
- Reading files before clarifying mode/scope.
- Documenting test/legacy/backup structures without user confirmation.
- Generating SQL DDL for this project (no relational DB).
- Guessing column meanings — ask when a field's purpose is unclear.
