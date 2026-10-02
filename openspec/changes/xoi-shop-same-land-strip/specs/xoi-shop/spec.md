# Xoi Shop Specification

## ADDED Requirements

### Requirement: Rice stations live in the xoi shop
The rice soaking tank, steamer and rice display counter SHALL be placeable only inside the xoi shop building. The existing production chain (soak, steam, serve) and its recipes, timings, stock lots and shelf lives SHALL work there exactly as defined for kitchen stations, using the single shared warehouse and inventory.

#### Scenario: Produce rice dishes in the xoi shop
- **WHEN** the player starts a soak, steam or dish recipe at a matching station inside the xoi shop
- **THEN** ingredients SHALL be taken from the shared inventory using the existing first-expiry-first-out rules
- **AND** outputs SHALL be added to the shared inventory with the existing lots, cost and expiry

#### Scenario: Station requirements
- **WHEN** a recipe is started at a station outside the xoi shop, or with a mismatched station
- **THEN** it SHALL be rejected and inventory SHALL NOT change

### Requirement: Customers choose a building
When a customer is generated, the system SHALL choose a building among owned buildings that have stocked, working sales fixtures, weighted by demand for the products stocked there. The customer SHALL carry that building, SHALL enter through that building's entrance, SHALL only consider fixtures, checkout counters, queue tiles and dining tables of that building, and SHALL leave through that building's door. Saves without a recorded building SHALL be treated as the main building.

#### Scenario: Rice dish sold only in the xoi shop
- **WHEN** a customer wants a rice dish
- **THEN** the customer SHALL walk to the xoi shop door, shop there, queue at the xoi shop counter and never use the main shop counter

#### Scenario: Building with nothing to sell
- **WHEN** the xoi shop has no stocked sales fixture
- **THEN** no customer SHALL choose it and no customer SHALL be left without a reachable target

#### Scenario: Save and load mid-visit
- **WHEN** the game is saved while a customer is inside either building and then loaded
- **THEN** the customer SHALL resume in the same building with the same stage and queue position

### Requirement: Checkout and dining per building
Each building SHALL have its own cashier counter and queue. A customer SHALL be served only at a counter of the customer's building. Dine-in SHALL only use dining tables of the customer's building, and extra drink orders at the table SHALL keep working with the shared inventory.

#### Scenario: Two buildings in parallel
- **WHEN** customers are queued at both counters at the same time
- **THEN** each queue SHALL advance independently and a counter SHALL NOT serve a customer of the other building

#### Scenario: No free table in the customer's building
- **WHEN** all dining tables of the customer's building are occupied or dirty
- **THEN** the customer SHALL take the food away instead of using a table in the other building

### Requirement: Workers and owner move between buildings
The player avatar and workers SHALL be able to walk between buildings and the shared warehouse through the buildings' doors and the sidewalk. A cashier staff member SHALL serve checkouts of customers in either building (cashier staff have no fixed position in this game). Refill jobs for fixtures in the xoi shop SHALL route through its door.

#### Scenario: Refill a xoi shop shelf
- **WHEN** a refill worker is assigned to a shelf inside the xoi shop
- **THEN** its route SHALL leave the main shop or warehouse, pass the sidewalk, and enter through the xoi shop door
- **AND** the job SHALL be abandoned with a clear reason if no route exists

#### Scenario: Cashier at the xoi shop
- **WHEN** a cashier staff member is on shift and a xoi shop customer is waiting at the front of the xoi shop queue
- **THEN** that staff member SHALL check the customer out under the same rules as in the main shop

### Requirement: One business, shared accounting
Both buildings SHALL share money, the ledger, the tax calculation, the shared warehouse, staff payroll, reputation and regular customers. Reports SHALL NOT be required to split by building. Buying the xoi shop SHALL follow the existing land purchase accounting (money decreases by the price; no ledger entry, as for existing land plots).

#### Scenario: Revenue from the xoi shop
- **WHEN** a customer pays at the xoi shop counter
- **THEN** revenue, cost of goods, daily record, product sales, experience and tax treatment SHALL follow the same rules as a sale in the main shop

### Requirement: Online and local parity
Buying the building and all xoi shop gameplay SHALL work in local play and in online world play with the same rules. The purchase SHALL reuse the existing land purchase world command (`buy_plot`) with revision and idempotency, SHALL be replayed by the server, and SHALL be subject to the same save invariants as other spending commands.

#### Scenario: Online purchase
- **WHEN** the world owner buys the xoi shop online
- **THEN** the server SHALL apply the same checks as local play and broadcast the resulting owned buildings and layout

#### Scenario: Non-member attempt
- **WHEN** an account that is not a member of the world sends the purchase command
- **THEN** the server SHALL reject it and the world state SHALL NOT change
