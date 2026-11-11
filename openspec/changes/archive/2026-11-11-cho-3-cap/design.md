## Context

Chợ phiên comes from GĐ135/136. It has two parts:
- `src/data/chophien.ts`: `marketClearValue`, `CLEAR_DISCOUNT` 0.75, caps of 4 items / 15 units, and the `CLEAR_DAYS_LEFT` surplus filter.
- `sellMarketSurplus` in `src/core/slices/sales.ts`: runs the sale on market days, at most once per day, guarded by `marketClearedDay`.

Vendor wholesale (`wholesale.ts`) is the separate inbound channel. This change does not touch it.

## Goals / Non-Goals

**Goals**
- Give the existing outbound channel tier progression and a pricing decision.
- Keep the golden sim (≤ level 30) and Chợ xóm byte-identical.

**Non-Goals**
- No new market-day schedule.
- No NPC price competition or order book.
- No market that exists only in co-op.

## Decisions

- **Extend chợ phiên instead of forking it.**
  - Add `MARKET_TIERS` to `chophien.ts`. Tier `xom` points at the current constants and calls the current `marketClearValue` unchanged.
  - Rejected alternative: a separate "chợ" system. It would mean two once-per-day flags, two UIs and extra bloat.
- **Configurable caps.** `marketClearValue` takes optional caps, and their defaults are the current constants. Tiers 2 and 3 pass larger caps.
- **Price model (tiers 2–3 only, no RNG)**
  - Unit gross = `round(sell × mult × CLEAR_DISCOUNT)`, with `mult` clamped to [0.3, 3].
  - Sell-through = `clamp(1.3 − 0.6·mult, 0.05, 1) × demand`, capped at 1.
    - `demand`: phường 1.0, đầu mối 1.1.
    - At mult ≤ 0.5 everything sells. Above that, sell-through falls in a straight line.
  - Units sold per item = `floor(rowUnits × sellThrough)`.
  - Net = gross × units × (1 − fee).
  - The formula has no randomness, so solo and co-op agree, and the quote equals the sale.
- **Retail stays the main income**
  - Net per unit = `sell·mult·0.75·(1−fee)`. This passes retail once mult > 1.33 at phường, or > 1.40 at đầu mối.
  - So hard-cap unit gross at `0.95 × sell`. Then net per unit < sell holds for every mult.
  - Higher multipliers only cut volume, which keeps 3× a real but poor choice.
  - A test sweeps every product, tier and multiplier step.
- **Exploit guard.** There is no new guard against buying stock just to dump it. The existing surplus-only filter (stock beyond 2 days of demand) and the per-tier unit caps limit it. The 0.95 × retail cap is still above the case price for some items, but volume is capped, so this is accepted.
- **State**
  - Add optional `marketPref?: { tier: 'xom' | 'phuong' | 'daumoi'; mult: number }`.
  - When it is undefined, the game uses tier xóm. No SAVE_VERSION bump.
  - Co-op syncs it like the other optional preference fields.
- **API**
  - Signature: `sellMarketSurplus(opts?: { tier?; mult? })`. It falls back to `marketPref`, then to xóm.
  - New refusal reason: `locked`. Existing reasons are unchanged.

## Risks / Trade-offs

- UI clutter. Mitigation: the tier picker and slider are hidden below level 32.
- Tuning of the sell-through slope. Mitigation: all constants live in one table and are covered by tests.

## Migration Plan

The field is additive and optional. To roll back, hide the UI; old and new saves both load.

## Open Questions

- Should Chợ đầu mối also open on extra days? Deferred; out of scope for this change.
