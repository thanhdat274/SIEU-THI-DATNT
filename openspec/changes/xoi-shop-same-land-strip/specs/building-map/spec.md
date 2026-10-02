# Building Map Specification

## ADDED Requirements

### Requirement: Multiple buildings on one map
The game SHALL model shops as buildings defined in shared data (identifier, bounds, door tiles, entrance tile, optional unlock condition) on the existing single map. The map dimensions and the coordinates of existing buildings, fixtures, vehicles and parking spots SHALL NOT change. A fixture, customer or worker's building SHALL be derived from its tile position and SHALL NOT require a new persisted field on fixtures.

#### Scenario: Existing save has only the main building
- **WHEN** a save without owned-building data is loaded
- **THEN** the game SHALL treat only the main building as owned
- **AND** every fixture, customer, stored fixture, planogram entry and ledger entry SHALL load unchanged

#### Scenario: Building lookup by position
- **WHEN** the system asks which building contains a tile
- **THEN** it SHALL return the main building for tiles inside its bounds including purchased east wings, the second building for tiles inside its bounds, and none for street, sidewalk and warehouse tiles

### Requirement: Second building beside the main shop
The map SHALL contain a second building adjacent to the main shop that shares one wall with it. Its footprint, walls, door tiles and entrance tile SHALL come from shared data, SHALL NOT overlap the main shop, the warehouse, the street or parking spots, and SHALL leave the sidewalk in front of its door walkable. Door tiles SHALL be exempt from the low fence on the sidewalk row.

#### Scenario: Door is reachable from the street
- **WHEN** a pedestrian or customer path is computed from the street to the second building's entrance tile
- **THEN** a path SHALL exist that crosses no wall, fence, tree, lamp or parked vehicle

#### Scenario: Shared wall blocks movement
- **WHEN** a customer or worker is inside one building
- **THEN** it SHALL NOT be able to reach the other building except by leaving through its own door and entering through the other building's door

### Requirement: Buying the second building
The player (any member of the shared alley when online, as for land plots) SHALL be able to buy the second building once, when the level requirement is met and the player can afford the price. Buying SHALL be idempotent per building identifier, SHALL charge the price exactly once, SHALL place the building's default layout, and SHALL persist across save and load. Ownership SHALL be recorded as a land plot identifier so existing saves need no migration. Before purchase the building SHALL be rendered closed and SHALL NOT admit customers, fixtures or workers.

#### Scenario: Successful purchase
- **WHEN** the player meets the level and money requirements and buys the building
- **THEN** money SHALL decrease by exactly the price
- **AND** the building SHALL become owned, open its door tiles, and contain the default layout fixtures

#### Scenario: Retried purchase
- **WHEN** the same purchase command is applied again for an already owned building
- **THEN** the save SHALL NOT change and money SHALL NOT be charged again

#### Scenario: Requirements not met
- **WHEN** the level or money requirement is not met
- **THEN** the purchase SHALL be rejected with a specific reason and the save SHALL NOT change

### Requirement: Per-building fixture placement
Fixture shop items SHALL declare which buildings accept them. Placement, move and retrieve operations SHALL require the complete rotated footprint to lie inside one owned building that accepts the item, SHALL check entrance reachability using that building's entrance tile, and SHALL keep every required interaction tile reachable. Fixtures that are not accepted in their current building when a save loads SHALL be moved to stored fixtures without losing any data.

#### Scenario: Reject a station outside its building
- **WHEN** the player places a rice soaking tank, steamer or rice display counter inside the main shop
- **THEN** the placement SHALL be rejected with a reason naming the required building

#### Scenario: Footprint crosses the shared wall
- **WHEN** a footprint covers tiles of two buildings or the shared wall
- **THEN** the placement SHALL be rejected

#### Scenario: Legacy station in the main shop
- **WHEN** a save loads with a rice station already placed in the main shop
- **THEN** the fixture SHALL be moved to stored fixtures with its identity and data intact
- **AND** the player SHALL be informed once

### Requirement: Rendering of multiple buildings
The renderer SHALL draw walls, doors, shadows, signs and lights for every building from shared data, SHALL draw a shared wall once, and SHALL NOT change the appearance or layout of the main shop. The second building SHALL show a sign identifying it, and a closed state before purchase.

#### Scenario: Closed building
- **WHEN** the second building is not owned
- **THEN** it SHALL render with a closed door and a sign indicating it is not open, and SHALL NOT be lit as an open shop

#### Scenario: Day and night
- **WHEN** the game time changes between day and night
- **THEN** the second building's facade lighting SHALL follow the same lighting phases as the main shop
