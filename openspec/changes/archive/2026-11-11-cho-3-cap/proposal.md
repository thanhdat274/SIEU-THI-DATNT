## Why

Late game (level > 30) players pile up surplus stock, and the only outbound channel is the weekly **Chợ phiên cuối ngõ** (`sellMarketSurplus`). It always pays 75% of retail and caps each session at 4 items and 15 units. The channel never grows after mid-game and gives the player no pricing decision. The reference game's 3-tier market (Xóm research B1/C#1) has a mechanic worth borrowing: tiers that unlock one after another, each with its own fee and capacity. We would Việt hoá it and keep it clearly secondary to in-shop retail.

## What Changes

- Grow the existing Chợ phiên into **3 tiers** that unlock one after another. The new tiers unlock above level 30, so the golden sim stays unchanged.
  - **Chợ xóm** (tier 1): today's chợ phiên. Behaviour, caps (4 items, 15 units) and price (75%) stay exactly as they are.
  - **Chợ phường** (tier 2, level 32): higher caps, 2% stall fee.
  - **Chợ đầu mối** (tier 3, level 40): highest caps, 5% stall fee, slightly stronger demand.
- At tiers 2 and 3 the player sets a **price multiplier from 0.3× to 3× of the standard price**. A higher price sells fewer units.
- The market stays an outlet for surplus stock:
  - Only stock above 2 days of demand counts (the existing rule).
  - Net revenue per unit always stays below in-shop retail, so retail remains the main income.
- Old saves keep working. The new preference field is optional, and when it is missing the game uses today's behaviour.
- The calculation uses no randomness, so solo and co-op give identical results.

## Capabilities

### New Capabilities
- `market-tiers`: tiered outbound market sessions. Covers tier unlocks, per-tier caps and stall fees, the player price multiplier and the resulting sell-through.

### Modified Capabilities
<!-- none: no main spec exists for chợ phiên yet -->

## Impact

- `src/data/chophien.ts`: tier table plus pure helpers for unlock, caps, fee, sell-through and quote.
- `src/core/slices/sales.ts`: `sellMarketSurplus(opts?)`.
- `src/core/gameTypes.ts` / `store.ts`: optional `marketPref`, with no SAVE_VERSION bump.
- Chợ phiên UI: tier picker and price slider, shown at level 32 and above.
- New tests. The golden sim test must stay unchanged.
