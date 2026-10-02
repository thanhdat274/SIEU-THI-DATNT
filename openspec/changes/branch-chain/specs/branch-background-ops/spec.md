# Branch Background Operation Specification

## ADDED Requirements

### Requirement: Branches run in the background
A branch that is not being controlled SHALL be simulated once per game day by a reduced model, without individual customers. The result for a given branch seed and day SHALL be deterministic.

#### Scenario: Day passes while elsewhere
- **WHEN** a game day ends while the player controls another branch
- **THEN** each background branch SHALL record sales, cost of goods, spoilage and wages for that day in the shared ledger tagged with the branch
- **AND** the same day SHALL NOT be processed twice after save, load or server replay

### Requirement: Sales limited by stock, demand and capacity
Background sales SHALL NOT exceed demand, shelved stock or staffed checkout capacity, SHALL consume stock by first-expiry-first-out and use the lot cost for cost of goods. When stock runs out the branch SHALL stop selling and record the unmet demand.

#### Scenario: Empty shelves
- **WHEN** a background branch has no shelved stock for a product it would otherwise sell
- **THEN** it SHALL sell none of that product and report unmet demand to the player

#### Scenario: No automatic restocking
- **WHEN** background branch stock is low
- **THEN** the system SHALL NOT transfer stock or order from suppliers automatically

### Requirement: Wages and costs in the background
Background operation SHALL charge staff wages and maintenance to the shared wallet. When the wallet cannot cover wages, affected staff SHALL not work that day and the shortfall SHALL be reported.

#### Scenario: Wallet cannot cover wages
- **WHEN** the shared wallet is below the daily wages of a background branch
- **THEN** the wallet SHALL NOT go negative and the branch SHALL operate without the unpaid staff

### Requirement: Controlled branch outperforms background
For equal conditions, a branch operated by the player SHALL earn more than the same branch on background operation, by a configured factor.

#### Scenario: Compare operation modes
- **WHEN** the same branch with the same stock is simulated in background mode and player-controlled mode over the same days
- **THEN** expected background revenue SHALL be lower than controlled revenue by the configured factor

### Requirement: Catch-up on return
When the player switches into a branch that ran in the background, the branch SHALL reflect the background results and report an overview of the days missed.

#### Scenario: Return after several days
- **WHEN** the player enters a branch after three background days
- **THEN** its records, stock and staff state SHALL match the background results and a summary SHALL be shown
