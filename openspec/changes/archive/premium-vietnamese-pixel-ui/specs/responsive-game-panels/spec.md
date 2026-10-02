# Spec Delta

## Purpose

Đảm bảo HUD và panel quản lý dùng được trên desktop và điện thoại ngang, hỗ trợ bàn phím và cảm ứng mà không che các điều khiển cần thiết.

## ADDED Requirements

### Requirement: Landscape adaptive layout
The game SHALL adapt between desktop and mobile landscape layouts at target viewports 1920×1080, 1366×768, 1024×768, 844×390 and 667×375. Essential actions SHALL remain reachable without horizontal page scrolling; touch targets SHALL be at least 44×44 CSS pixels.

#### Scenario: Short mobile landscape
- **WHEN** the game is viewed at 667×375
- **THEN** the warehouse starts collapsed, primary HUD information stays readable, and movement and interaction controls remain reachable

#### Scenario: Opening desktop warehouse
- **WHEN** the player expands the warehouse on desktop
- **THEN** the world adapts to the remaining visible area and the warehouse does not cover the HUD

### Requirement: Scrollable panels and safe areas
Panels SHALL fit the available viewport, respect device safe areas, and provide scrolling for long content with reachable close and primary action controls.

#### Scenario: Long supplier list
- **WHEN** the supplier catalogue exceeds the available height
- **THEN** the player can scroll the list and reach quantity controls, total cost, purchase and close actions

### Requirement: Single active modal and isolated input
The game SHALL present at most one interactive management modal at a time, focus it on opening, contain keyboard focus within it and restore focus on closing. World movement and interaction input SHALL be blocked while a modal is active.

#### Scenario: Supplier opened from shelf context
- **WHEN** the player opens the supplier while a shelf modal is active
- **THEN** the supplier replaces the shelf modal and no second interactive modal remains underneath

#### Scenario: Keyboard control in modal
- **WHEN** the player presses movement keys or adjusts quantities inside a modal
- **THEN** the world player does not move, Escape closes the modal and focus returns to its calling control

### Requirement: Explain unavailable actions and confirm reset
Each empty, locked, insufficient-funds, insufficient-capacity or failed-action state SHALL provide a visible explanation. Resetting saved progress SHALL require a separate confirmation that can be cancelled.

#### Scenario: Insufficient money
- **WHEN** an order costs more than available money
- **THEN** the purchase action indicates the unavailable state and explains the missing funds

#### Scenario: Cancel reset
- **WHEN** the player opens reset confirmation and cancels
- **THEN** current and persisted progress remain unchanged
