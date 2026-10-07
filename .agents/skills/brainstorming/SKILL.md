---
name: brainstorming
description: You MUST use this before any creative work — creating features, building components, adding gameplay, or modifying behavior in this game. Explores user intent, requirements, and design before implementation. (Adapted from ai-kit skill: brainstorming)
allowed-tools: Read, Glob, Grep, Bash
---

<objective name="collaborative_to_clarify_requirements">
Help turn ideas into fully formed designs and specs through natural collaborative dialogue.
Start by understanding the current project context, then ask questions one at a time to refine the idea.
</objective>

<context name="this_project">
Đây là game "Tiệm Tạp Hóa Đầu Hẻm" — monorepo TypeScript (yarn workspaces):
- `packages/game-core` — logic mô phỏng (tiệm, AI, giao thông, nhân viên, khách); test = `tsx src/test-runner.ts`, file `*.test.ts` cạnh nguồn.
- `packages/game-renderer` — renderer 2.5D (PixiJS/canvas); hot render path mỗi frame.
- `packages/game-data`, `packages/shared` — dữ liệu & dùng chung.
- `apps/web` — UI React (mobile-first landscape); `apps/server` — server Node + Firebase.
Trước khi brainstorm feature mới, đọc `tổng hợp.md` ở root và docs liên quan để hiểu hiện trạng, đợt gần nhất và các giới hạn đã ghi.
</context>

<constraint name="no_implementation_before_approval">
Do NOT write code or take implementation action until you have presented a design/spec and the user has approved it. This applies to EVERY feature regardless of perceived simplicity.
</constraint>

<anti_pattern name="avoid_jumping_to_implementation">
Every feature goes through this process. A single mechanic, a balance tweak, a UI tweak — all of them. "Simple" features are where unexamined assumptions cause the most wasted work. The design/spec can be short, but you MUST present it and get approval.

| Anti-Pattern | Why |
|--------------|-----|
| Jumping to solutions before understanding | Wastes time on wrong problem |
| Assuming requirements without asking | Creates wrong output |
| Over-engineering first version | Delays value delivery |
| Ignoring gameplay constraints | Creates unusable designs |
| "I think" phrases | Uncertainty → Ask instead |
</anti_pattern>

<process_flow>
```
Explore project context (read tổng hợp.md, docs, related code)
        ↓
Ask clarifying questions (one at a time)
        ↓
Scan existing codebase for related logic
        ↓
Propose 2-3 approaches (reuse-first if existing logic found)
        ↓
Design for isolation and clarity
        ↓
Present design/spec sections
        ↓
User approves design/spec?
   ├── no  → revise → Present design/spec sections
   └── yes → Write design/spec doc
                  ↓
        Invoke writing-plans skill  ← TERMINAL STATE
```
The ONLY skill you invoke after brainstorming is `writing-plans`.
</process_flow>

<process>

  <step name="understand_the_idea">
    <instructions>
      - Read `tổng hợp.md` + relevant docs/code first (per AGENTS.md).
      - Ask questions one at a time to refine the idea.
      - Prefer multiple choice questions when possible; open-ended is fine too.
      - Only one question per message.
      - **Decomposition:** If the request describes multiple independent systems (e.g., "add a job system AND a weather season system"), flag this immediately and help the user decompose. Each sub-project gets its own spec → plan → implementation cycle.
      - **UI/UX features:** If the feature involves mobile UI (apps/web), scan existing components/modals (Cashier, Inventory, Warehouse, Staff, etc.) and read the responsive system (`responsive.ts` → `data-density`, `--touch`, `--safe-*`). Present: "Found [N] related components: [...]. Should the new feature follow the same pattern? Keep `data-density`/`--touch` tokens, don't create new breakpoints."
      - **Gameplay/sim features:** If it touches game-core, check for existing systems (demand, staff, traffic, weather, supply) and their tests. Present: "Found existing logic at [path] that does [similar thing]."
    </instructions>
  </step>

  <step name="scan_existing_codebase">
    <instructions>
      BEFORE proposing approaches, scan for existing logic/systems related to the feature.
      1. Use Grep/Glob to find similar modules/functions/patterns in `packages/*` and `apps/web`.
      2. Read the most relevant matches to understand scope and interface.
      3. If found, present: "Found existing logic at [path] that does [similar thing]. Options: (1) extend/reuse, (2) create new (justify), (3) refactor both into a shared abstraction."
      4. If NOT found, note: "No existing related logic found — proceeding with fresh design."
      This step is MANDATORY.
    </instructions>
  </step>

  <step name="explore_approaches">
    <instructions>
      - If existing logic found, Approach 1 MUST be "Reuse/extend existing" with specifics. Only propose "create new" as an alternative with clear justification.
      - If none found, propose 2-3 approaches with trade-offs.
      - Lead with your recommendation and explain why, tied to this codebase's architecture (game-core determinism, renderer hot path, mobile-first UI).
    </instructions>
  </step>

  <step name="design_for_isolation_and_clarity">
    <instructions>
      - Break the system into smaller units with one clear purpose, well-defined interfaces, independently testable.
      - Respect package boundaries: simulation logic → game-core; rendering → game-renderer; UI-only → apps/web. Keep game-core free of renderer/DOM dependencies so it stays testable offline.
      - Each unit: what it does, how to use it, what it depends on.
    </instructions>
  </step>

  <step name="present_design">
    <instructions>
      - Present the design scaled to complexity (a few sentences to ~300 words).
      - Ask after each section whether it looks right.
      - Cover: architecture, components, data flow/save impact, error handling, testing, mobile/performance impact.
      - Note explicitly if the feature touches gameplay/business logic/state/save — the project tracks those carefully (per AGENTS.md / tổng hợp.md). Design should minimize changes to gameplay logic unless in scope.
    </instructions>
  </step>

  <step name="write_design_doc">
    <instructions>
      - Scan `docs/plans/` for a related folder; reuse if exists, else create `<module-name>/` (noun-based, kebab-case).
      - Write validated spec to `docs/plans/<topic>/YYYY-MM-DD-spec.md`.
      - ⛔ STOP — ask user to review before proceeding.
    </instructions>
  </step>

  <step name="invoke_writing_plans">
    <instructions>
      - Invoke the `writing-plans` skill to create the implementation plan. Do NOT invoke any other skill.
    </instructions>
  </step>

</process>

<key_principles>
  <principle name="one_question_at_a_time">Ask one question, wait, then the next.</principle>
  <principle name="prefer_multiple_choice">Multiple-choice is easier to answer.</principle>
  <principle name="yagni">Remove unnecessary features ruthlessly.</principle>
  <principle name="explore_alternatives">Always propose 2-3 approaches.</principle>
  <principle name="incremental_validation">Present section by section, get approval.</principle>
  <principle name="be_flexible">Go back and clarify when uncertain.</principle>
</key_principles>
