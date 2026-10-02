# Spec Delta

## Purpose

Thêm nhà kho vật lý phía sau tiệm, đi vào được và quản lý hàng dự trữ bằng dữ liệu gameplay thật.

## ADDED Requirements

### Requirement: Aligned rear placement
The warehouse SHALL sit directly north of the sales floor, share its back wall and align with its left and right boundaries. Its placement and central doorway SHALL derive from the same store bounds instead of a separate side-room offset. Loading the former side-room layout SHALL preserve money and stock and move a player standing in that removed room to the new rear entrance.

#### Scenario: View the connected building
- **WHEN** the player views the shop and warehouse together
- **THEN** the warehouse appears immediately above the sales floor with aligned side walls, a two-tile rear doorway and free space on both sides of the shop

#### Scenario: Load a player in the old side room
- **WHEN** a save from the previous side-room layout contains a player standing in that room
- **THEN** the player starts at the new rear doorway and money, warehouse goods, lots and pending orders remain intact

### Requirement: Walkable store warehouse
The game SHALL provide a visibly distinct warehouse room behind the shop with a connected doorway, dry goods racks, cold storage corner and receiving area. The player SHALL be able to enter and leave through a passable aisle. Existing sales fixtures and customer shopping routes SHALL remain functional.

#### Scenario: Enter and leave the warehouse
- **WHEN** the player walks through the warehouse doorway using keyboard or touch controls
- **THEN** the player enters the room without teleporting or resetting the simulation and can return through the same doorway, with the camera following at the selected zoom

#### Scenario: Collision and customer routes
- **WHEN** a player approaches warehouse walls or racks while a customer visits the sales floor
- **THEN** solid warehouse furniture blocks the player, the doorway remains passable and customers target sales fixtures without entering the warehouse

### Requirement: Single source of reserve stock
The warehouse SHALL represent the existing reserve inventory rather than create a second stock ledger. Warehouse panels, quick dock and inventory views SHALL agree on product quantity and expiry. Cold capacity SHALL follow the existing capacity and pending-order reservation rules. Viewing the warehouse SHALL NOT change quantity or money.

#### Scenario: Stock transferred to and from a shelf
- **WHEN** the player stocks a sales shelf from reserve inventory and then returns goods to storage
- **THEN** warehouse and shelf quantities update through simulation rules and the combined quantities are conserved unless a sale, delivery or expiry occurs

#### Scenario: Cold storage reserved by orders
- **WHEN** pending cold orders reserve storage and a new order or return would exceed capacity
- **THEN** warehouse UI shows used and reserved space and explains the unavailable action without recording a successful transfer

### Requirement: Receiving area reflects delivery state
The warehouse receiving area SHALL show real pending orders and arrival days. Due deliveries SHALL enter reserve inventory through the existing day advancement rules exactly once, without requiring a second claim operation.

#### Scenario: Delivery arrives
- **WHEN** the game advances to an order's arrival day
- **THEN** ordered quantity is added once to warehouse inventory, the pending order is removed and warehouse visual stock and notices reflect the result

### Requirement: Accessible warehouse management
Warehouse interaction points SHALL open a single accessible warehouse dialog with product groups, quantity, expiry, cold capacity and valid restock/supplier actions. The quick dock SHALL identify the physical warehouse and provide a way to locate its entrance without teleporting the player. Dialog input isolation, focus and responsive rules SHALL match other management dialogs.

#### Scenario: Open warehouse and switch to supplier
- **WHEN** the player interacts with the warehouse desk and opens the supplier from its dialog
- **THEN** exactly one dialog is active, movement is blocked and closing restores focus through the modal coordinator

#### Scenario: Empty warehouse on mobile
- **WHEN** the reserve inventory is empty at a target mobile landscape viewport
- **THEN** the warehouse shows an empty state with an available supplier action, readable Vietnamese text and reachable controls of at least 44 by 44 CSS pixels

### Requirement: Original stock aware warehouse art
The warehouse SHALL use the shared pixel palette, clear entrance signage and readable dry/cold/receiving silhouettes. Reserve stock art SHALL distinguish empty, low and full states from actual inventory, and SHALL NOT imply goods that are absent. Decor SHALL NOT obscure the traversable aisle or interaction cues.

#### Scenario: Last goods leave storage
- **WHEN** the last units in a displayed warehouse group are transferred or expire
- **THEN** that group's visual stock changes to empty while the room remains navigable and labels remain readable

### Requirement: Preserve old saves during warehouse expansion
Loading a pre-warehouse save SHALL add required warehouse fixtures idempotently without changing valid money, XP, inventory lots, pending orders or sales fixture stock. Valid player positions SHALL remain unchanged; an invalid position SHALL be relocated to a safe reachable point without resetting progress.

#### Scenario: Load and reload an existing save
- **WHEN** a pre-warehouse save is loaded, saved and loaded again
- **THEN** warehouse fixtures appear once, stock and pending orders are preserved, and the player can access both warehouse and sales floor
