# Central Warehouse Specification

## ADDED Requirements

### Requirement: Single central warehouse
Supplier deliveries SHALL always enter the hub warehouse, which acts as the central warehouse. Branches SHALL NOT order from suppliers directly.

#### Scenario: Order while controlling a branch
- **WHEN** the player places a supplier order while controlling a branch
- **THEN** the delivery SHALL be added to the central warehouse
- **AND** the cost SHALL be paid from the shared wallet

### Requirement: Stock transfer to a branch
The player SHALL be able to transfer stock from the central warehouse to a branch. A transfer SHALL take lots first-expiry-first-out, SHALL preserve expiry and unit cost of each lot, SHALL be all-or-nothing, and SHALL NOT make any quantity negative.

#### Scenario: Successful transfer
- **WHEN** the central warehouse holds enough of each requested product and the branch has capacity
- **THEN** the central quantity SHALL decrease and the branch quantity SHALL increase by exactly the transferred amounts
- **AND** total units and total cost value across the chain SHALL be unchanged

#### Scenario: Insufficient stock or capacity
- **WHEN** any requested product lacks stock or the branch lacks capacity
- **THEN** the whole transfer SHALL be rejected and no stock SHALL move

#### Scenario: Idempotent command
- **WHEN** the same transfer command id is replayed after a reload or by the server
- **THEN** stock SHALL NOT move a second time

### Requirement: Return stock to the central warehouse
The player SHALL be able to return unshelved branch stock to the central warehouse under the same rules as a transfer.

#### Scenario: Return surplus
- **WHEN** the player returns stock that exists in the branch back room
- **THEN** it SHALL move to the central warehouse with lots, expiry and cost preserved

### Requirement: Stock expiry across the chain
Expiry and spoilage SHALL apply to central and branch stock by the same rules, and expired units SHALL be recorded as spoilage cost on the branch where they expired.

#### Scenario: Stock expires in a branch
- **WHEN** units in a branch pass their expiry day
- **THEN** they SHALL be removed and their cost recorded as spoilage for that branch
