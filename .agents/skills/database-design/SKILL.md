---
name: database-design
description: Design or review data models for this game's persistence. Analyzes requirements, picks the right store (Firestore NoSQL vs JSON/local persistence), designs collections/documents, indexes, and relationships. Uses generic data-model principles; not bound to enterprise SQL vendors. (Adapted from ai-kit skill: database-design — enterprise SQL dialect removed, Firestore added)
allowed-tools: Read, Glob, Grep, Bash, Write
---

# Database Design Skill (game project)

> **Analyze requirements first, design the data model later.**

## 🎯 When to Use
- Designing the save/persistence model or server-backed data (Firestore).
- Choosing where data lives: client-side save/localStorage vs `apps/server` (Node + Firebase Firestore).
- Designing collections/documents, indexes, relationships, and access patterns.
- Modeling game state that must survive reload, and leaderboard/social/multiplayer data that needs a server.

## ⚠️ Do Not Use When
- Only simple query tweaking.
- You must not change the save/data model.
- Only playing with UI or renderer logic.

---

## About This Project's Persistence

- **Client save:** the game persists simulation state (tiệm, inventory, money, staff, day) — a structured JSON/game-state model. There is a `DATABASE_SCHEMA.md` in the repo documenting the intended data model. Read it first.
- **Server (`apps/server`) + Firebase:** Firestore is used (a Firebase admin service-account JSON is present at repo root). Persists server-side data such as account/cloud-save and any co-op/social feature.
- **No relational SQL in this project.** Do not write Oracle/MySQL/PostgreSQL DDL.

---

## Step 1: Analyze Requirements
- Collect/analyze requirements (gameplay features that persist).
- Identify entities/collections and relationships.
- Define access patterns (read/write frequency, per-user vs global, offline vs online).
- Estimate scale (single-user save; server: users, cloud saves, leaderboards).
- Determine consistency needs (offline-first client save vs server sync).

## Step 2: Choose Store / Location
Decide where data lives:
- **Client-side save (localStorage / game-state):** most simulation state — cheap, offline, per-player closet. Best for single-player, non-shared state.
- **Firestore (server):** cloud save, cross-device sync, social/co-op shared state, admin features. Not for per-tick simulation writes (cost/latency).

## Step 3: Design Model

**Firestore NoSQL (document store):**
```text
users/{uid}            -> { displayName, createdAt, ... }
cloudSaves/{uid}       -> { saveVersion, data, updatedAt }   (consider a versioned subcollection for history)
leaderboards/{key}     -> { scores: [ { uid, value, at } ] }  (denormalized; consider aggregates)
```

**Design principles:**
- Model by **access pattern**, not by entity (NoSQL/query-first).
- Denormalize for read-heavy data that changes rarely (e.g., a player summary used by a leaderboard).
- Keep the **save-version** explicit in the client save model; plan migration/backfill for old saves (see `tổng hợp.md` convention about save changes).
- Relationships:
  - One-to-one / extension data → separate field or child doc.
  - One-to-many → parent holds ids / child holds parent ref.
  - Many-to-many → junction or array of refs; prefer arrays ≤ ~10k entries in Firestore.
- Composite indexes in Firestore: combine equality fields first, range fields last; add composite indexes for compound queries via `firestore.indexes.json`.

**Money/currency:** use integers in the smallest unit or a lossless decimal representation — never float — for game money/balance (avoids precision bugs). (Mirrors the money-safety principle, stated without SQL.)

## Step 4: Indexing & Query Optimization
- Firestore indexes: single-field auto-indexed; add **composite indexes** for compound queries (range + orderBy needs composite).
- Avoid N+1: batch reads / denormalize instead of per-item queries in a loop.
- Select only needed fields; avoid reading whole docs in hot server paths.
- Server: avoid unbounded scans / missing pagination on large collections.

## Step 5: Schema Doc & Migration
- Keep `DATABASE_SCHEMA.md` (or the relevant schema doc) in sync when you change the data model.
- Save-version migration: if the client save shape changes, add a migration that upgrades old saves and updates the version; never silently drop data.
- Rollback plan: be able to revert a save-model change without data loss.

---

## ✅ Design Checklist
- [ ] Requirements analyzed (which features persist, where)?
- [ ] Data location chosen (client save vs Firestore) with rationale?
- [ ] Collections/documents match **access patterns** (query-first)?
- [ ] Save-version + migration/backfill planned?
- [ ] Money/balance uses integer/lossless representation (no float)?
- [ ] Firestore composite indexes defined where needed?
- [ ] No N+1 / unbounded scans in server hot paths?
- [ ] `DATABASE_SCHEMA.md` (or schema doc) updated?

---

## ❌ Anti-Patterns
- Designing the model before understanding requirements.
- Treating Firestore like a relational DB (using it for per-second simulation writes).
- Storing floats for game money/balance.
- No save-version / migration plan (breaks existing saves).
- N+1 query loops in server code.
- The absent "partitioning" concept from the SQL-only world is not applicable here — skip it.
