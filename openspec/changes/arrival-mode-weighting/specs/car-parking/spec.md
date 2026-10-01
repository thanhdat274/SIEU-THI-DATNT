# Spec Delta

## Purpose

Khách đến bằng ô tô có chỗ đỗ riêng, nhìn thấy được và không trùng chỗ.

## ADDED Requirements

### Requirement: Car bays
Hệ thống SHALL khai báo chỗ đỗ ô tô trong dữ liệu bản đồ, không chồng cột đèn, ô đỗ xe máy, vạch qua đường hay trong tiệm, và nằm trong bản đồ.

#### Scenario: Geometry
- **WHEN** đọc danh sách chỗ đỗ ô tô
- **THEN** mỗi chỗ cách cột đèn và ô đỗ xe máy đủ xa, nằm ngoài vạch qua đường và ngoài tiệm

### Requirement: Car customers use a bay
Khách đến bằng ô tô SHALL có chỗ đỗ ô tô, xuất phát tại đó và rời bằng cách trở lại chỗ đó; hai khách đang ở tiệm SHALL không dùng chung chỗ; hết chỗ thì khách không được là khách ô tô.

#### Scenario: Assigned bay
- **WHEN** khách ô tô xuất hiện
- **THEN** vị trí đỗ của khách là một trong các chỗ đỗ ô tô khai báo

#### Scenario: No sharing
- **WHEN** nhiều khách ô tô cùng ở tiệm
- **THEN** không hai khách cùng chỗ và số khách ô tô đồng thời không vượt số chỗ

### Requirement: Parked car shown
Renderer SHALL hiển thị ô tô đỗ tại chỗ của khách đang ở tiệm và gỡ khi khách rời.

#### Scenario: Arrival and departure
- **WHEN** khách ô tô tới rồi rời tiệm
- **THEN** ô tô xuất hiện tại chỗ đỗ rồi biến mất
