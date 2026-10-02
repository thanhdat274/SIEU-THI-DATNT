/** Tests cho hệ thống warehouse tier (ported từ tap-hoa-dau-hem). */

import { DEFAULT_INITIAL_SAVE, generateStarterTileMap } from '@game/data';
import { InputManager } from './input';
import { GameSimulation } from './simulation';
import {
  buyWarehouseTier,
  buyStorageRack,
  totalWarehouseCells,
  warehouseCellsFor,
  unitsFittingInCells,
  type LayoutResult,
} from './store-layout';
import { WAREHOUSE_TIERS, MAX_STORAGE_RACKS, STORAGE_RACK_CELL_BONUS } from '@game/data';
import type { SaveGameData } from '@game/shared';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`❌ TEST FAILED: ${message}`);
  console.log(`  ✓ ${message}`);
}

function assertEqual<T>(actual: T, expected: T, label: string): void {
  if (actual !== expected) throw new Error(`❌ ${label}: expected ${expected}, got ${actual}`);
  console.log(`  ✓ ${label}: ${actual}`);
}

function assertError(result: LayoutResult, expectedError: LayoutResult['error'], label: string): void {
  if (result.error !== expectedError) throw new Error(`❌ ${label}: expected error ${expectedError}, got ${result.error ?? 'save'}`);
  console.log(`  ✓ ${label}: error=${result.error}`);
}

function assertSave(result: LayoutResult, label: string): SaveGameData {
  if (!result.save) throw new Error(`❌ ${label}: expected save, got error ${result.error}`);
  console.log(`  ✓ ${label}: save returned`);
  return result.save;
}

// Build a fresh save with overrides
function makeSave(overrides: { money?: number; level?: number; warehouseTier?: number; storageRackCount?: number } = {}): SaveGameData {
  const save = structuredClone(DEFAULT_INITIAL_SAVE);
  save.player.money = overrides.money ?? 1_000_000;
  save.player.level = overrides.level ?? 30;
  // Force tier 0 for tests that start from base tier
  if (overrides.warehouseTier !== undefined) {
    save.warehouseTier = overrides.warehouseTier;
  } else {
    save.warehouseTier = 0;
  }
  // Reset rack count unless explicitly set (tests start fresh)
  if (overrides.storageRackCount !== undefined) {
    save.storageRackCount = overrides.storageRackCount;
  } else {
    save.storageRackCount = 0;
  }
  return save;
}

// ==========================================
// buyWarehouseTier tests
// ==========================================

export function runWarehouseTierTests(): void {
  console.log('\n--- Warehouse Tier Tests ---');

  // Test 1: Normal upgrade tier 0 → 1 (free)
  {
    const save = makeSave();
    const result = buyWarehouseTier(save, 1);
    const s1 = assertSave(result, 'tier 0→1 upgrade returns save');
    assertEqual(s1.warehouseTier, 1, 'tier upgraded to 1');
  }

  // Test 2: Upgrade tier 1 → 2
  {
    const save = makeSave({ warehouseTier: 1 });
    const result = buyWarehouseTier(save, 2);
    const s2 = assertSave(result, 'tier 1→2 upgrade returns save');
    assertEqual(s2.warehouseTier, 2, 'tier upgraded to 2');
  }

  // Test 3: Upgrade tier 2 → 3
  {
    const save = makeSave({ warehouseTier: 2 });
    const result = buyWarehouseTier(save, 3);
    const s3 = assertSave(result, 'tier 2→3 upgrade returns save');
    assertEqual(s3.warehouseTier, 3, 'tier upgraded to 3');
  }

  // Test 4: Downgrade returns 'owned' error
  {
    const save = makeSave({ warehouseTier: 2 });
    const result = buyWarehouseTier(save, 1);
    assertError(result, 'owned', 'downgrade tier 2→1 returns error');
  }

  // Test 5: Same tier returns 'owned' error
  {
    const save = makeSave({ warehouseTier: 1 });
    const result = buyWarehouseTier(save, 1);
    assertError(result, 'owned', 'same tier 1→1 returns error');
  }

  // Test 6: Future tier without upgrade path returns 'owned' error
  {
    const save = makeSave({ warehouseTier: 0 });
    const result = buyWarehouseTier(save, 3);
    assertError(result, 'owned', 'future tier 0→3 (skipping) returns error');
  }

  // Test 7: Invalid tier returns 'unknown_item' error
  {
    const save = makeSave();
    const result = buyWarehouseTier(save, 5);
    assertError(result, 'unknown_item', 'tier 5 (out of range) returns error');
  }

  // Test 8: Below unlock level (tier 1 requires level 8)
  {
    const save = makeSave({ level: 5, money: 1_000_000, warehouseTier: 0 });
    const result = buyWarehouseTier(save, 1);
    assertError(result, 'level', 'below level 8 for tier 1 returns error');
  }

  // Test 9: Insufficient money (tier 2 costs 500k, requires level 9)
  {
    const save = makeSave({ level: 30, money: 100, warehouseTier: 0 });
    const result = buyWarehouseTier(save, 1);
    assertError(result, 'money', 'insufficient money returns error');
  }
}

// ==========================================
// buyStorageRack tests
// ==========================================

export function runStorageRackTests(): void {
  console.log('\n--- Storage Rack Tests ---');

  // Test 1: First rack purchase
  {
    const save = makeSave({ money: 1_000_000 });
    const result = buyStorageRack(save);
    const s1 = assertSave(result, 'first rack purchase returns save');
    assertEqual(s1.storageRackCount, 1, 'rack count becomes 1');
  }

  // Test 2: Second rack purchase
  {
    const save = makeSave({ money: 1_000_000, storageRackCount: 1 });
    const result = buyStorageRack(save);
    const s2 = assertSave(result, 'second rack returns save');
    assertEqual(s2.storageRackCount, 2, 'rack count becomes 2');
  }

  // Test 3: Reach limit at 10
  {
    const save = makeSave({ money: 1_000_000, storageRackCount: 9 });
    const result = buyStorageRack(save);
    const s10 = assertSave(result, 'rack 10 returns save');
    assertEqual(s10.storageRackCount, 10, 'rack count becomes 10');
    // 11th should fail
    const result2 = buyStorageRack(s10);
    assertError(result2, 'owned', 'rack 11 returns owned error');
  }

  // Test 4: Insufficient money
  {
    const save = makeSave({ money: 100, storageRackCount: 0 });
    const result = buyStorageRack(save);
    assertError(result, 'money', 'insufficient money returns error');
  }

  // Test 5: Money deducted
  {
    const save = makeSave({ money: 500_000, storageRackCount: 0 });
    const result = buyStorageRack(save);
    const sm = assertSave(result, 'rack purchase with money check');
    assertEqual(sm.player.money, 450_000, '50k deducted');
  }
}

// ==========================================
// totalWarehouseCells tests
// ==========================================

export function runTotalWarehouseCellsTests(): void {
  console.log('\n--- Total Warehouse Cells Tests ---');

  // Test 1: Tier 0 base
  {
    const cells = totalWarehouseCells({ warehouseTier: 0, storageRackCount: 0 });
    assertEqual(cells, 30, 'tier 0 = 30 cells');
  }

  // Test 2: Tier 1 base
  {
    const cells = totalWarehouseCells({ warehouseTier: 1, storageRackCount: 0 });
    assertEqual(cells, 50, 'tier 1 = 50 cells');
  }

  // Test 3: Tier 2 base
  {
    const cells = totalWarehouseCells({ warehouseTier: 2, storageRackCount: 0 });
    assertEqual(cells, 80, 'tier 2 = 80 cells');
  }

  // Test 4: Tier 3 base
  {
    const cells = totalWarehouseCells({ warehouseTier: 3, storageRackCount: 0 });
    assertEqual(cells, 120, 'tier 3 = 120 cells');
  }

  // Test 5: Tier 0 + 1 rack
  {
    const cells = totalWarehouseCells({ warehouseTier: 0, storageRackCount: 1 });
    assertEqual(cells, 50, 'tier 0 + 1 rack = 50 cells');
  }

  // Test 6: Tier 2 + 5 racks
  {
    const cells = totalWarehouseCells({ warehouseTier: 2, storageRackCount: 5 });
    assertEqual(cells, 180, 'tier 2 + 5 racks = 180 cells');
  }

  // Test 7: Tier 3 + 10 racks (max)
  {
    const cells = totalWarehouseCells({ warehouseTier: 3, storageRackCount: 10 });
    assertEqual(cells, 320, 'tier 3 + 10 racks = 320 cells');
  }

  // Test 8: Missing fields default correctly
  {
    const cells = totalWarehouseCells({ warehouseTier: undefined, storageRackCount: undefined });
    assertEqual(cells, 30, 'undefined defaults to tier 0 = 30');
  }

  // Test 9: Constants are correct
  {
    assertEqual(MAX_STORAGE_RACKS, 10, 'MAX_STORAGE_RACKS = 10');
    assertEqual(STORAGE_RACK_CELL_BONUS, 20, 'STORAGE_RACK_CELL_BONUS = 20');
    assertEqual(WAREHOUSE_TIERS.length, 4, 'WAREHOUSE_TIERS has 4 entries');
  }
}

export function runWarehouseCellRoundingTests(): void {
  console.log('\n--- Làm tròn ô kho theo món ---');
  const small = { shelfCapacity: 24 };
  const bulky = { shelfCapacity: 10 };
  assertEqual(warehouseCellsFor(small, 0), 0, '0 hàng = 0 ô');
  assertEqual(warehouseCellsFor(small, 1), 1, '1 hàng nhỏ chiếm 1 ô');
  assertEqual(warehouseCellsFor(small, 10), 1, '10 hàng nhỏ vừa 1 ô');
  assertEqual(warehouseCellsFor(small, 11), 2, '11 hàng nhỏ làm tròn lên 2 ô');
  assertEqual(warehouseCellsFor(bulky, 10), 2, '10 hàng cồng kềnh chiếm 2 ô');
  assertEqual(warehouseCellsFor({ shelfCapacity: 10, warehouseSize: 1 }, 10), 1, 'warehouseSize ghi đè suy luận');
  assertEqual(unitsFittingInCells(small, 0, 3, 100), 30, '3 ô trống nhận 30 hàng nhỏ');
  assertEqual(unitsFittingInCells(small, 5, 0, 100), 5, 'ô đang dở còn 5 chỗ dù hết ô trống');
  assertEqual(unitsFittingInCells(bulky, 0, 3, 100), 10, '3 ô trống nhận 10 hàng cồng kềnh');
}
