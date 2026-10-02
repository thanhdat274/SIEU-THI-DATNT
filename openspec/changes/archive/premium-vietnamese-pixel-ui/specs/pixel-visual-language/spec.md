# Spec Delta

## Purpose

Định nghĩa trải nghiệm pixel art hoài cổ Việt Nam đồng nhất giữa thế giới, biểu tượng và giao diện quản lý, có chữ rõ và phản hồi chính xác.

## ADDED Requirements

### Requirement: Consistent pixel visual identity
The game SHALL present original Vietnamese nostalgic pixel visuals with consistent icon silhouettes, stepped panel borders and a shared palette across gameplay screens. Primary gameplay icons SHALL use designed pixel assets rather than platform-dependent emoji.

#### Scenario: Opening different screens
- **WHEN** the player opens warehouse, supplier, shelf and cashier screens
- **THEN** the panels share border, button, icon and typography conventions and products remain visually identifiable

### Requirement: Readable Vietnamese text
The interface SHALL display Vietnamese diacritics and currency correctly, provide body text at least 14 CSS pixels on target landscape viewports, and maintain text contrast of at least 4.5:1 for body copy.

#### Scenario: Long name and money
- **WHEN** a panel displays “Tiệm Tạp Hóa Đầu Hẻm”, “hạn sử dụng” and a large formatted currency balance
- **THEN** diacritics remain visible and essential text does not overlap, clip or rely on color alone

### Requirement: Crisp rendering with fallback assets
The world and product icons SHALL use nearest-neighbor rendering and provide a readable consistent fallback when an asset is unavailable. Default pixel zoom modes SHALL avoid subpixel jitter during camera movement.

#### Scenario: Missing product icon
- **WHEN** an item has no dedicated icon asset
- **THEN** a styled fallback appears while its name, quantity and actions remain usable

#### Scenario: Camera follows player
- **WHEN** the player moves at a default integer zoom
- **THEN** sprites remain sharp without visibly oscillating subpixel edges

### Requirement: Honest and reduced motion feedback
Success effects SHALL occur only after a successful gameplay or persistence operation. Reduced-motion preferences SHALL suppress nonessential looping motion without suppressing status messages.

#### Scenario: Failed purchase
- **WHEN** a purchase is rejected
- **THEN** the UI explains the failure and does not show a success coin or inventory gain animation

#### Scenario: Reduced motion enabled
- **WHEN** the device requests reduced motion
- **THEN** decorative bouncing and repeated movement are disabled while transaction status remains visible
