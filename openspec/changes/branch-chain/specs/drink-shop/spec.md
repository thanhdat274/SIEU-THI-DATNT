# Drink Shop Specification

## ADDED Requirements

### Requirement: Store type definitions
Store types SHALL be data-driven definitions (unlock level, opening cost, map template, default layout, allowed fixtures, sellable categories, demand profile). Adding a store type SHALL NOT require changes to the chain core.

#### Scenario: Validate store types
- **WHEN** content validation runs
- **THEN** every store type SHALL reference existing fixtures, products and categories, and the default layout SHALL be valid on its map

### Requirement: Drink shop branch
A drink shop SHALL be an available store type whose default layout contains a checkout counter, a drink counter, a blender, a sugarcane press and seating, and whose sold products are drinks (including the self-made drinks produced at its stations).

#### Scenario: Produce and sell drinks
- **WHEN** the player supplies ingredients to a drink shop and starts a drink recipe at a station there
- **THEN** the output SHALL be added to that branch stock and customers SHALL be able to buy it
- **AND** ingredients SHALL come from the branch stock transferred from the central warehouse

#### Scenario: Non-drink products are not sold
- **WHEN** a customer of the drink shop chooses a product
- **THEN** only products of the allowed categories SHALL be considered

### Requirement: Branch layout and land
In a drink shop the player SHALL be able to place only allowed fixtures within its own map, buy its own plots, and the cost SHALL come from the shared wallet.

#### Scenario: Fixture not allowed for the type
- **WHEN** the player places a fixture not allowed for the store type
- **THEN** the placement SHALL be rejected and the wallet SHALL NOT change
