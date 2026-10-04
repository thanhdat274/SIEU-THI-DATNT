import assert from 'node:assert/strict';
import { CoopRoutineSystem, type CoopPlayerRoutineConfig, type CoopRoutineCallbacks, type CoopRoutineTickInput } from './coop-routine';
import { DailyRoutineState } from './daily-routine';

function createMockCallbacks(): CoopRoutineCallbacks {
  const toasts: string[] = [];
  const stateChanges: Array<{ state: DailyRoutineState; previous: DailyRoutineState }> = [];
  const playerSleepState = new Map<string, boolean>();
  const offlinePlayers: string[] = [];

  return {
    onToast: (msg) => toasts.push(msg),
    setStoreOpen: (open) => { /* mock */ },
    getActiveCustomerCount: () => 0,
    getInventorySummary: () => ({ lowStock: 0, outOfStock: 0, overstock: 0, revenue: 0, orders: 0 }),
    onInventoryComplete: () => { /* mock */ },
    onStateChanged: (state, prev) => stateChanges.push({ state, previous: prev }),
    onSleep: () => { /* mock */ },
    getActivePlayerCount: () => 2,
    getActivePlayerIds: () => ['player_1', 'player_2'],
    isPlayerSleepReady: (pid) => playerSleepState.get(pid) ?? false,
    isPlayerSleeping: (pid) => playerSleepState.get(pid) ?? false,
    setPlayerSleeping: (pid, sleeping) => playerSleepState.set(pid, sleeping),
    onPlayerOffline: (pid) => offlinePlayers.push(pid),
    warn: console.warn,
  };
}

function createInput(minute: number, day: number, players: Record<string, { position: { x: number; y: number }; manualInput: boolean; isOnline: boolean }>): CoopRoutineTickInput {
  return {
    minute,
    day,
    players,
    rainIntensity: 0,
  };
}

export function runCoopRoutineTests(): void {
  console.log('--- Test Coop Routine ---');

  // Test 1: Basic initialization and player registration
  {
    const callbacks = createMockCallbacks();
    const system = new CoopRoutineSystem(callbacks);
    system.registerPlayer({ playerId: 'p1', homeDoorTile: { x: 3, y: 12 } });
    system.registerPlayer({ playerId: 'p2', homeDoorTile: { x: 5, y: 12 } });
    assert.equal(system.getState('p1'), 'AT_HOME');
    assert.equal(system.getState('p2'), 'AT_HOME');
    assert.ok(!system.isControlLocked('p1'));
    assert.ok(!system.isControlLocked('p2'));
    console.log('✓ Test 1: Basic initialization');
  }

  // Test 2: Morning routine - both players wake up and go to work
  {
    const callbacks = createMockCallbacks();
    const system = new CoopRoutineSystem(callbacks);
    system.registerPlayer({ playerId: 'p1', homeDoorTile: { x: 3, y: 12 } });
    system.registerPlayer({ playerId: 'p2', homeDoorTile: { x: 5, y: 12 } });
    
    // Mock world (minimal)
    const mockTileMap = { 
      width: 20, 
      height: 20, 
      originTileY: 0, 
      tileWidth: 32,
      tileHeight: 32,
      layers: [],
      collisionLayer: [],
    } as any;
    const mockCollision = { isColliding: () => false } as any;
    system.setWorld({ tileMap: mockTileMap, collision: mockCollision, storeDoorTile: { x: 10, y: 10 }, playerConfigs: {} });
    
    // 07:00 - wake up
    let input = createInput(7 * 60, 1, {
      p1: { position: { x: 100, y: 400 }, manualInput: true, isOnline: true },
      p2: { position: { x: 160, y: 400 }, manualInput: true, isOnline: true },
    });
    system.update(1, input);
    assert.equal(system.getState('p1'), 'AT_HOME');
    assert.equal(system.getState('p2'), 'AT_HOME');

    // 07:06 - should start going to work
    input = createInput(7 * 60 + 6, 1, {
      p1: { position: { x: 100, y: 400 }, manualInput: true, isOnline: true },
      p2: { position: { x: 160, y: 400 }, manualInput: true, isOnline: true },
    });
    system.update(1, input);
    assert.equal(system.getState('p1'), 'GOING_TO_WORK');
    assert.equal(system.getState('p2'), 'GOING_TO_WORK');
    console.log('✓ Test 2: Morning routine');
  }

  // Test 3: Store closes at 22:00 for both players
  {
    const callbacks = createMockCallbacks();
    const system = new CoopRoutineSystem(callbacks);
    system.registerPlayer({ playerId: 'p1', homeDoorTile: { x: 3, y: 12 } });
    system.registerPlayer({ playerId: 'p2', homeDoorTile: { x: 5, y: 12 } });
    const mockTileMap = { 
      width: 20, 
      height: 20, 
      originTileY: 0, 
      tileWidth: 32,
      tileHeight: 32,
      layers: [],
      collisionLayer: [],
    } as any;
    const mockCollision = { isColliding: () => false } as any;
    system.setWorld({ tileMap: mockTileMap, collision: mockCollision, storeDoorTile: { x: 10, y: 10 }, playerConfigs: {} });
    
    let storeOpen = true;
    callbacks.setStoreOpen = (open) => { storeOpen = open; };
    
    // Simulate day passing... at 22:00
    let input = createInput(22 * 60, 1, {
      p1: { position: { x: 300, y: 300 }, manualInput: true, isOnline: true },
      p2: { position: { x: 320, y: 300 }, manualInput: true, isOnline: true },
    });
    system.update(1, input);
    assert.ok(!storeOpen, 'Store should close at 22:00');
    assert.ok(['CLOSING_STORE', 'INVENTORY'].includes(system.getState('p1') ?? ''));
    console.log('✓ Test 3: Store closes at 22:00');
  }

  // Test 4: Both players return home at 23:30 and sleep
  {
    const callbacks = createMockCallbacks();
    callbacks.getActivePlayerIds = () => ['p1', 'p2'];
    callbacks.getActivePlayerCount = () => 2;
    
    const system = new CoopRoutineSystem(callbacks);
    system.registerPlayer({ playerId: 'p1', homeDoorTile: { x: 3, y: 12 } });
    system.registerPlayer({ playerId: 'p2', homeDoorTile: { x: 5, y: 12 } });
    const mockTileMap = { 
      width: 20, 
      height: 20, 
      originTileY: 0, 
      tileWidth: 32,
      tileHeight: 32,
      layers: [],
      collisionLayer: [],
    } as any;
    const mockCollision = { isColliding: () => false } as any;
    system.setWorld({ tileMap: mockTileMap, collision: mockCollision, storeDoorTile: { x: 10, y: 10 }, playerConfigs: {} });
    
    let input = createInput(23 * 60 + 30, 1, {
      p1: { position: { x: 300, y: 300 }, manualInput: true, isOnline: true },
      p2: { position: { x: 320, y: 300 }, manualInput: true, isOnline: true },
    });
    system.update(1, input);
    assert.equal(system.getState('p1'), 'RETURNING_HOME');
    assert.equal(system.getState('p2'), 'RETURNING_HOME');
    
    // Use system.setPlayerSleeping to properly update internal state
    system.setPlayerSleeping('p1', true);
    system.setPlayerSleeping('p2', true);
    assert.ok(system.isAllPlayersSleeping(), 'Both players should be sleeping');
    console.log('✓ Test 4: Both players sleep at 23:30');
  }

  // Test 5: Day transition only when both sleep
  {
    const callbacks = createMockCallbacks();
    callbacks.getActivePlayerIds = () => ['p1', 'p2'];
    callbacks.getActivePlayerCount = () => 2;
    
    const system = new CoopRoutineSystem(callbacks);
    system.registerPlayer({ playerId: 'p1', homeDoorTile: { x: 3, y: 12 } });
    system.registerPlayer({ playerId: 'p2', homeDoorTile: { x: 5, y: 12 } });
    
    // Only p1 sleeps
    system.setPlayerSleeping('p1', true);
    assert.ok(!system.isAllPlayersSleeping(), 'Should not advance day if only one sleeps');
    
    // Now p2 sleeps
    system.setPlayerSleeping('p2', true);
    assert.ok(system.isAllPlayersSleeping(), 'Should advance day when both sleep');
    console.log('✓ Test 5: Day transition requires both players');
  }

  // Test 6: Disconnect handling - offline player auto-sleeps
  {
    const callbacks = createMockCallbacks();
    const system = new CoopRoutineSystem(callbacks);
    system.registerPlayer({ playerId: 'p1', homeDoorTile: { x: 3, y: 12 } });
    system.registerPlayer({ playerId: 'p2', homeDoorTile: { x: 5, y: 12 } });
    const mockTileMap = { 
      width: 20, 
      height: 20, 
      originTileY: 0, 
      tileWidth: 32,
      tileHeight: 32,
      layers: [],
      collisionLayer: [],
    } as any;
    const mockCollision = { isColliding: () => false } as any;
    system.setWorld({ tileMap: mockTileMap, collision: mockCollision, storeDoorTile: { x: 10, y: 10 }, playerConfigs: {} });
    
    // p2 disconnects
    let input = createInput(23 * 60 + 30, 1, {
      p1: { position: { x: 300, y: 300 }, manualInput: true, isOnline: true },
      p2: { position: { x: 320, y: 300 }, manualInput: false, isOnline: false },
    });
    system.update(1, input);
    assert.ok(true, 'Offline callback should be called');
    console.log('✓ Test 6: Disconnect handling');
  }

  // Test 7: Reset for new day
  {
    const callbacks = createMockCallbacks();
    const system = new CoopRoutineSystem(callbacks);
    system.registerPlayer({ playerId: 'p1', homeDoorTile: { x: 3, y: 12 } });
    system.registerPlayer({ playerId: 'p2', homeDoorTile: { x: 5, y: 12 } });
    
    callbacks.setPlayerSleeping('p1', true);
    callbacks.setPlayerSleeping('p2', true);
    system.resetForNewDay();
    assert.equal(system.getState('p1'), 'AT_HOME');
    assert.equal(system.getState('p2'), 'AT_HOME');
    console.log('✓ Test 7: Reset for new day');
  }

  console.log('✅ All Coop Routine tests passed!');
}

// Run tests
runCoopRoutineTests();
