# Branch Chain Specification

## ADDED Requirements

### Requirement: Chain of branches with a shared wallet
The system SHALL model a chain consisting of the main shop (hub) and zero or more branches. All branches SHALL share one wallet and one ledger; every ledger entry SHALL identify its branch (absent means hub). A save without chain data SHALL load as a chain with only the hub and behave exactly as before.

#### Scenario: Existing save loads as a one-shop chain
- **WHEN** a save created before this change is loaded
- **THEN** it SHALL load without error as a chain with only the hub
- **AND** money, inventory, ledger and statistics SHALL be unchanged

#### Scenario: Money moves only through the shared wallet
- **WHEN** any branch earns or spends money
- **THEN** the shared wallet SHALL change by exactly the amount of the ledger entries recorded for that change
- **AND** the wallet SHALL equal the opening balance plus the sum of all chain ledger entries

### Requirement: Opening a branch
The player SHALL be able to open a branch of an available store type when the player level, branch limit and wallet allow. Opening SHALL deduct the cost from the shared wallet exactly once, create the branch from the store type template, and be idempotent for the same command id.

#### Scenario: Open a drink shop
- **WHEN** the player meets the level requirement and has enough money and issues the open-branch command
- **THEN** the wallet SHALL decrease by the opening cost once and a branch with the default layout SHALL exist
- **AND** repeating the same command id SHALL NOT charge again or create a second branch

#### Scenario: Rejected opening
- **WHEN** the level is too low, the wallet is insufficient, the branch limit is reached or the store type is unknown
- **THEN** the command SHALL be rejected and wallet and branches SHALL NOT change

### Requirement: Switching the controlled branch
The player SHALL control exactly one branch at a time and SHALL be able to switch to any owned branch. The branch left SHALL keep its state and continue under background operation; the branch entered SHALL resume from its saved state including layout, staff, shelves and plots.

#### Scenario: Visit a branch to rearrange it
- **WHEN** the player switches to a branch and changes its layout or buys land there
- **THEN** the change SHALL apply to that branch only, spend from the shared wallet, and persist after save and load

#### Scenario: Rapid switching
- **WHEN** the player switches branches repeatedly in quick succession
- **THEN** no money, stock or ledger entry SHALL be lost or duplicated

### Requirement: Chain progress
Story and goals SHALL be able to measure the number of real branches. Chapter 7 SHALL complete on opening the required number of branches instead of the xoi shop proxy. Saves that already claimed chapter 7 SHALL stay claimed.

#### Scenario: Chapter 7 with a real branch
- **WHEN** the player has opened the required number of branches and has begun chapter 7
- **THEN** chapter 7 SHALL be completable and claimable once

### Requirement: Server-authoritative chain commands
Opening a branch, switching branch, transferring stock and returning stock SHALL be committed through the world command path and replayed by the server. The server SHALL reject any such command whose resulting wallet change differs from the replayed result.

#### Scenario: Forged wallet
- **WHEN** a client commits an open-branch or transfer command with a wallet higher than the replayed result
- **THEN** the server SHALL reject the commit and the world SHALL NOT change
