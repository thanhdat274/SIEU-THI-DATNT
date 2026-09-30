# Store Layout Specification

## Requirements

### Requirement: Edit store layout while closed
The game SHALL provide a store layout mode when the store is closed. The mode SHALL let the player inspect owned floor tiles and fixtures, select a fixture, preview a destination and rotation, commit a valid move, or cancel the edit session without changing the saved layout.

#### Scenario: Move a fixture within owned floor
- **WHEN** the player previews a destination where the complete rotated footprint is inside owned floor, non-overlapping, and reachable constraints remain satisfied
- **THEN** the editor SHALL show a valid preview and commit the fixture at that destination when confirmed
- **AND** the fixture ID, product assignment, stock lots, capacity and planogram mapping SHALL remain unchanged

#### Scenario: Reject invalid placement
- **WHEN** the proposed footprint crosses unowned/out-of-map tiles, overlaps another fixture, covers a reserved entrance, or violates required access paths
- **THEN** the editor SHALL show an invalid preview and a specific reason
- **AND** it SHALL NOT mutate the saved layout

#### Scenario: Rotate fixture
- **WHEN** the player rotates a fixture by 90 degrees
- **THEN** collision, footprint, renderer and interaction geometry SHALL use the same resulting dimensions and orientation
- **AND** the rotation SHALL be rejected if the resulting placement is invalid

#### Scenario: Cancel layout editing
- **WHEN** the player cancels before final confirmation
- **THEN** all layout and land changes made during that edit session SHALL revert to the session snapshot

### Requirement: Preserve fixture identity and contents
The system SHALL preserve fixture identity and all fixture-owned gameplay data when moving, rotating, storing or retrieving a fixture. Storage SHALL NOT create or destroy product quantity, lots, value or planogram assignments.

#### Scenario: Store and retrieve fixture
- **WHEN** the player stores a movable fixture and later retrieves it into a valid owned tile
- **THEN** the same fixture ID and attached stock/product data SHALL be restored
- **AND** retrieval SHALL NOT charge again

### Requirement: Reachable operating layout
The system SHALL prevent confirmation/opening of a layout that disconnects the entrance from required operating fixtures, including the cashier, stocked sales fixtures, warehouse interaction points and active staff targets. The validator SHALL identify blocked fixtures and SHALL be shared by local gameplay and authoritative server commands.

#### Scenario: Preserve customer and staff access
- **WHEN** a layout change blocks the only route to a required fixture
- **THEN** the change SHALL be rejected with the blocked fixture identified
- **AND** no partial position or worker-claim update SHALL be persisted

### Requirement: Purchase and persist land plots
The system SHALL expose data-defined land plots with stable IDs, area, purpose, price and level requirement. A plot purchase SHALL atomically verify eligibility and funds, deduct the price once, and persist ownership. The system SHALL not permit placement on unowned plots.

#### Scenario: Buy eligible plot
- **WHEN** the player confirms purchase and has the required level and funds
- **THEN** the plot SHALL become owned and the exact configured price SHALL be deducted once
- **AND** retrying the same purchase command SHALL NOT deduct money again

#### Scenario: Purchase is ineligible
- **WHEN** the player lacks level, funds, or required adjacent access
- **THEN** the game SHALL explain the unmet condition and SHALL leave money and ownership unchanged

### Requirement: Migrate existing saves safely
The system SHALL migrate existing saves to include ownership for the existing floor footprint and any stored fixture state required by the new layout model. Migration SHALL preserve all existing fixtures, stock lots, planogram, player progress and money, and SHALL create a recoverable backup before persistence.

#### Scenario: Load legacy save
- **WHEN** a supported legacy save is loaded
- **THEN** the original store footprint SHALL be treated as owned
- **AND** all existing assets and planogram associations SHALL be preserved
- **AND** a migration failure SHALL NOT overwrite the legacy save with defaults

### Requirement: Authoritative multiplayer layout changes
In a shared world, layout edits and plot purchases SHALL use authoritative commands. The server SHALL validate actor permission, store-closed state, command idempotency, revision, money, geometry, ownership and reachability before committing; clients SHALL apply the resulting authoritative snapshot.

#### Scenario: Duplicate or stale command
- **WHEN** the server receives a duplicate command ID or a command based on a stale revision
- **THEN** a duplicate SHALL return the original result without repeating side effects
- **AND** a stale command SHALL return a conflict and the client SHALL restore the latest authoritative snapshot

#### Scenario: Concurrent fixture edits
- **WHEN** two members try to move the same fixture from the same revision
- **THEN** at most one command SHALL commit
- **AND** the losing client SHALL receive the committed snapshot and a conflict result

### Requirement: Layout editor accessibility and input
The editor SHALL support mouse/pointer dragging and a touch-friendly select-then-place interaction, with visible controls for rotation, confirmation, cancellation and invalid reasons. All essential actions SHALL be available without hover.

#### Scenario: Touch placement
- **WHEN** a touch user selects a fixture and taps a valid destination
- **THEN** the preview and placement controls SHALL remain operable without drag precision or hover-only affordances
