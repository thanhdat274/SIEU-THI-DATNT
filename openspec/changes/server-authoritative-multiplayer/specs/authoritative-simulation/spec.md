# Authoritative Simulation Specification

## ADDED Requirements

### Requirement: One simulation per active alley runs on the server
For every alley that has at least one connected session, the server SHALL run exactly one `GameSimulation` that advances the clock, customers, staff, money, inventory, stalls, tax and all automatic behaviors. No client SHALL run business logic for an online alley.

#### Scenario: Two clients connected
- **WHEN** two members are connected to the same alley
- **THEN** both SHALL receive state produced by the same single server simulation
- **AND** no second simulation for that alley SHALL advance on the server or on any client

#### Scenario: No session connected
- **WHEN** the last session disconnects
- **THEN** the simulation SHALL pause and checkpoint, and SHALL NOT accrue income or cost until a session returns

### Requirement: Automatic behaviors run on the server
Automatic purchasing (rule-based, stall ingredients, mid-day top-up), stall day processing, payroll and tax SHALL run inside the server simulation and SHALL record their results in the ledger and daily reports without any client-originated sync command.

#### Scenario: Morning auto-buy
- **WHEN** a new game day begins with auto-buy enabled
- **THEN** the server simulation SHALL place the orders, deduct money once and record the report
- **AND** a client SHALL learn the result only through snapshots

### Requirement: Snapshot is complete enough for the UI
The server SHALL publish snapshots containing the money, inventory, pending orders, fixtures and stock, customers, staff, stalls and the latest daily report needed by the client UI, with the revision they correspond to.

#### Scenario: Client reconnects
- **WHEN** a client reconnects after a network drop
- **THEN** it SHALL receive a full snapshot with the current revision and replace its read model

### Requirement: Single active runtime and serialized mutations per alley
The server SHALL keep at most one runtime per alley per process and SHALL apply commands for that alley one at a time, from both HTTP and WebSocket entry points.

#### Scenario: Two commands race
- **WHEN** two commands with the same expected revision arrive concurrently
- **THEN** exactly one SHALL be accepted and the other SHALL be rejected with the current revision
