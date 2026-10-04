# Intent Commands Specification

## ADDED Requirements

### Requirement: Clients send intents, not state
For an online alley the client SHALL send commands that express an intent (for example order, stock, set price, check out) and SHALL NOT send a save or any computed money, inventory or revenue values. The server SHALL reject any command that carries such state.

#### Scenario: Forged save in a command
- **WHEN** a client submits a command that carries a modified save with extra money
- **THEN** the server SHALL reject the command and the stored state SHALL be unchanged

#### Scenario: Valid intent
- **WHEN** a member orders supplies with enough money
- **THEN** the server SHALL validate, deduct money once, create the orders and return a receipt with the new revision

### Requirement: Validation, idempotency and ordering
Each command SHALL include `commandId`, `expectedRevision` and a payload. The server SHALL check membership, permissions and game rules, apply the command to the running simulation, commit state and receipt atomically, then acknowledge. Retrying the same `commandId` SHALL return the prior receipt; the same `commandId` with a different payload SHALL be rejected.

#### Scenario: Retry after lost acknowledgement
- **WHEN** a client resends a command whose acknowledgement was lost
- **THEN** the server SHALL return the original receipt and SHALL NOT apply the command twice

#### Scenario: Stale revision
- **WHEN** a command carries an outdated expected revision
- **THEN** the server SHALL reject it and return the current snapshot

### Requirement: Commands that depend on live state run on the live simulation
Commands that depend on transient state (check out a waiting customer, change store status, advance day, stow, planogram restock) SHALL execute against the running simulation, not against a save rebuilt from storage.

#### Scenario: Two members check out the same customer
- **WHEN** two members send checkout for the same waiting customer
- **THEN** exactly one SHALL succeed and the sale SHALL be recorded once

### Requirement: Legacy client commit is removed
After migration the server SHALL NOT accept a business save from the client for online alleys and SHALL NOT keep save-invariant checks for client-supplied saves. A client with an older protocol version SHALL be told to update.

#### Scenario: Old client
- **WHEN** a client with an older protocol version sends a commit containing a save
- **THEN** the server SHALL reject it with an update-required response
