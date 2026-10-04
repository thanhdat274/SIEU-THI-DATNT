# Online Client Rendering Specification

## ADDED Requirements

### Requirement: Online client renders server snapshots
In an online alley the client SHALL NOT advance the game clock, customers, staff or economy locally. It SHALL render characters, customers and staff by interpolating server snapshots and SHALL read money, inventory and reports from the latest snapshot.

#### Scenario: Snapshot arrives
- **WHEN** a new snapshot is received
- **THEN** the UI SHALL update to the snapshot values without running local business logic

### Requirement: UI actions wait for the server
Actions that change business state SHALL be sent as intents and SHALL show a pending state until the server acknowledges or rejects them. A rejection SHALL show the server reason and leave the displayed state equal to the latest snapshot.

#### Scenario: Rejected action
- **WHEN** the server rejects an order for insufficient money
- **THEN** the UI SHALL show the reason and money and stock SHALL equal the latest snapshot

### Requirement: Disconnected state is read-only
When the connection is lost the client SHALL disable all mutating actions, keep showing the last snapshot marked as stale, and on reconnect SHALL replace its state with a full snapshot.

#### Scenario: Network drop
- **WHEN** the connection drops during play
- **THEN** mutating buttons SHALL be disabled and the UI SHALL indicate that data may be stale until reconnected

### Requirement: Offline play is unchanged
Local (offline) play SHALL keep running its own simulation and local save. The same UI components SHALL work with either a local state source or an online snapshot source.

#### Scenario: Local play
- **WHEN** a player starts a local game
- **THEN** the simulation SHALL run in the client and saves SHALL go to local storage as before
