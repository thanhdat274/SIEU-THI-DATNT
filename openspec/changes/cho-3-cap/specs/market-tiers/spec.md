## ADDED Requirements

### Requirement: Tier unlocks
The market SHALL offer three tiers — Chợ xóm, Chợ phường, Chợ đầu mối — unlocking at the existing chợ phiên unlock, level 32 and level 40 respectively. Selling at a locked tier SHALL be refused.

#### Scenario: Locked tier refused
- **WHEN** a level-31 player tries to sell at Chợ phường
- **THEN** the sale is refused with reason `locked` and money and stock are unchanged

#### Scenario: Chợ xóm unchanged
- **WHEN** a player sells surplus at Chợ xóm
- **THEN** units sold and revenue equal the pre-change chợ phiên result for the same state

### Requirement: Per-tier caps and stall fee
Each tier SHALL apply its own caps and fee:

| Tier | Max items | Max units | Fee |
|---|---|---|---|
| xóm | 4 | 15 | 0% |
| phường | 6 | 30 | 2% |
| đầu mối | 8 | 60 | 5% |

The fee SHALL be deducted from gross revenue.

#### Scenario: Fee deducted
- **WHEN** a Chợ đầu mối sale grosses 1.000.000đ
- **THEN** the player receives 950.000đ

### Requirement: Player price multiplier
At tiers phường and đầu mối the player SHALL choose a multiplier, clamped to 0.3–3, applied to the standard price. Units sold SHALL not increase as the multiplier rises. Net revenue per unit SHALL stay below the item's in-shop retail price at every multiplier.

#### Scenario: Overpricing sells no more
- **WHEN** the same surplus is offered at 2× instead of 1×
- **THEN** the 2× sale sells no more units than the 1× sale

#### Scenario: Out-of-range value clamped
- **WHEN** a multiplier of 5 is submitted
- **THEN** it is treated as 3

#### Scenario: Retail stays more profitable
- **WHEN** any product is quoted at any multiplier and any tier
- **THEN** net revenue per unit is below that product's in-shop retail price

### Requirement: Once per market day and deterministic
A sale SHALL be allowed only once per market day, counted across all tiers. For a given game state, the same tier and multiplier SHALL always give the same result, so solo and co-op are identical. The quote shown before selling SHALL equal the actual result.

#### Scenario: Second sale on the same day
- **WHEN** the player has already sold at any tier today
- **THEN** another sale is refused with reason `already`

### Requirement: Save compatibility
A save that has no market preference SHALL load without a SAVE_VERSION bump. The market SHALL then default to Chợ xóm.

#### Scenario: Old save loads
- **WHEN** a save made before this change is loaded
- **THEN** it loads without error and the market defaults to Chợ xóm
