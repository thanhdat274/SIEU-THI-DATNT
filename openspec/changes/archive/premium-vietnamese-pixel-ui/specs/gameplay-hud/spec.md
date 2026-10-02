# Spec Delta

## Purpose

Cho người chơi theo dõi trạng thái tiệm và thực hiện các hành động quản lý bằng thông tin chính xác gắn với mô phỏng đang chạy.

## ADDED Requirements

### Requirement: Simulation backed indicators
The HUD SHALL display day, time, store status, money and level from current gameplay state. Any shown experience progress, customer count, storage count or capacity SHALL match the corresponding game mechanic. The HUD MUST NOT claim an economic buff or capacity unsupported by gameplay.

#### Scenario: Successful sale
- **WHEN** a sale completes and gameplay updates money and experience
- **THEN** the HUD displays those updated values and level progress using the actual level rules

#### Scenario: No capacity mechanic
- **WHEN** the simulation exposes active customers without a store customer capacity
- **THEN** the HUD shows the active count without an invented capacity denominator

### Requirement: Accessible management actions
The HUD SHALL provide labeled access to store status, inventory, supplier, warehouse visibility, save, speed and zoom actions with visible enabled or disabled states.

#### Scenario: Close store
- **WHEN** the player activates the store status control
- **THEN** the gameplay store status changes and the displayed label reflects its actual result

### Requirement: Stock based actionable notices
Any stock alert SHALL be computed from current stock and distinguish empty shelves from shelves that can be restocked using available goods.

#### Scenario: No matching warehouse goods
- **WHEN** shelves need stock but warehouse goods do not match
- **THEN** the UI explains why automatic restocking cannot transfer goods instead of reporting successful restocking

### Requirement: Preserve transaction and save behavior
Redesigned controls SHALL retain the existing purchase, restock, unstock, checkout and save rules. Persistence success SHALL be displayed only after the save completes.

#### Scenario: Save and reload
- **WHEN** the player saves after purchasing, stocking and selling, then reloads
- **THEN** money, experience, shelf stock, warehouse stock and pending orders restore consistently with the persisted game state

#### Scenario: Save failure
- **WHEN** persistence fails
- **THEN** the interface shows a failure message and does not replace the displayed last successful save time with a success claim
