# Spec Delta

## Purpose
Xác lập đường cong tiến trình người chơi tường minh đến cấp 35, bảo toàn tiến độ save cũ và đồng nhất các mốc mở khóa nhân viên, lưu lượng, sức chứa NPC.

## ADDED Requirements

### Requirement: Bounded level and explicit XP thresholds
The game MUST define an explicit cumulative XP threshold for every level from 1 through 35, MUST stop level advancement at 35, and MUST preserve a legacy save's progress proportion within its current level when normalizing XP to the new threshold table.

#### Scenario: Player reaches a threshold
- **WHEN** the player's XP reaches the XP required for the next level below 35
- **THEN** the simulation advances the level, carries remaining XP forward, and loads the next threshold from the shared progression data

#### Scenario: Player reaches the cap
- **WHEN** the player reaches level 35 or receives XP while already at level 35
- **THEN** level remains 35, next-level XP is zero, and additional XP does not advance progression

#### Scenario: Legacy save is loaded
- **WHEN** a save has a valid level and an XP amount expressed against its legacy `experienceToNextLevel`
- **THEN** normalization preserves the clamped progress fraction and converts it to the new per-level XP interval without changing save schema

### Requirement: Level rewards remain understandable and consistent
The game MUST use shared progression rules for XP intervals, employee slots, level-based traffic, and concurrent customer capacity. Sale XP MUST use the configured high-level multipliers. Traffic and NPC concurrency MUST remain bounded by the current simulation/map limits.

#### Scenario: Level roadmap is opened
- **WHEN** a player opens the level roadmap or Quest modal
- **THEN** the UI shows current XP and remaining XP, level milestones through 35, and the configured unlock/reward signals for products, suppliers, staff slots, stalls, plots, traffic and customer capacity

#### Scenario: Player reaches a level with benefits
- **WHEN** a level-up callback is emitted
- **THEN** the notification summarizes the benefits unlocked at that level and directs the player to the full roadmap

#### Scenario: Player is at maximum level
- **WHEN** the player opens the Quest modal or roadmap at level 35
- **THEN** the UI identifies the cap and does not present level 36 as a future unlock
