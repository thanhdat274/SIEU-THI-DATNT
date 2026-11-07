## 1. Data layer (`src/data/chophien.ts`)

- [x] 1.1 Add `MARKET_TIERS` (unlock, maxItems, maxUnits, fee, demand) and `marketTierUnlocked(tier, level)`. Xóm uses the current constants.
- [x] 1.2 Make the caps in `marketClearValue` optional, defaulting to `MAX_CLEAR_ITEMS` / `MAX_CLEAR_UNITS`.
- [x] 1.3 Add `clampMarketMult`, `marketSellThrough(mult, tier)` and `marketTierQuote(value, tier, mult)`. All are pure, use no RNG, and cap unit gross at 0.95 × retail.
- [x] 1.4 Tests:
  - phường and đầu mối unlock above level 30
  - caps and fee table
  - sell-through never rises with the multiplier
  - multiplier is clamped to 0.3–3
  - net per unit < retail for every product × tier × multiplier

## 2. Store

- [x] 2.1 (Changed during apply) No persisted `marketPref`: tier and multiplier are passed as action args and kept in UI state. Less state, no save impact, and co-op forwards the args.
- [x] 2.2 `sellMarketSurplus(opts?)`:
  - xóm runs the existing legacy path
  - refuse a locked tier with `locked`
  - deduct the stall fee
  - allow one sale per day across all tiers
- [x] 2.3 Tests:
  - xóm gives identical revenue and units to before the change
  - locked refusal
  - fee deduction
  - `already` refusal
  - old save loads with defaults
  - quote equals the actual sale

## 3. UI

- [x] 3.1 Chợ phiên panel at level ≥ 32: tier picker plus a 0.3–3 multiplier slider. Show a live quote of units, gross, fee and net.

## 4. Verify

- [x] 4.1 Golden sim test unchanged and the full suite is green.
- [x] 4.2 Add a PROGRESS.md entry, commit and push.
