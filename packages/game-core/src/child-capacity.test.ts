/** Tests cho child slot capacity adjustment (ported từ tap-hoa-dau-hem). */

import { DEFAULT_INITIAL_SAVE, generateStarterTileMap } from '@game/data';
import { InputManager } from './input';
import { GameSimulation } from './simulation';
import { syncSlotChildren, isSlotChild, type StoreFixture } from '@game/shared';
import { effectiveShelfCapacity } from '@game/data';
import { upgradeFixtureSlots } from './store-layout';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`❌ TEST FAILED: ${message}`);
  console.log(`  ✓ ${message}`);
}

function assertEqual<T>(actual: T, expected: T, label: string): void {
  if (actual !== expected) throw new Error(`❌ ${label}: expected ${expected}, got ${actual}`);
  console.log(`  ✓ ${label}: ${actual}`);
}

function fixture(overrides: Partial<StoreFixture>): StoreFixture {
  return {
    id: overrides.id ?? 'f1',
    type: overrides.type ?? 'shelf_wooden',
    tileX: overrides.tileX ?? 0,
    tileY: overrides.tileY ?? 0,
    widthTiles: overrides.widthTiles ?? 2,
    heightTiles: overrides.heightTiles ?? 1,
    rotation: overrides.rotation ?? 0,
    currentStock: 0,
    maxCapacity: overrides.maxCapacity ?? 24,
    label: overrides.label ?? 'Kệ',
    slotCount: overrides.slotCount,
  } as StoreFixture;
}

// ==========================================
// syncSlotChildren child capacity tests
// ==========================================

export function runChildCapacityTests(): void {
  console.log('\n--- Child Capacity Tests ---');

  // Test 1: shelf_wooden (parent maxCapacity=24) → children cap 20
  {
    const parent = fixture({ id: 'shelf_main', type: 'shelf_wooden', maxCapacity: 24, label: 'Kệ gỗ chính' });
    const fixtures = [parent];
    const result = syncSlotChildren(fixtures);
    assert(result.length === 12, 'shelf_wooden has 12 total fixtures (1 parent + 11 children)');
    const children = result.filter(f => isSlotChild(f));
    assert(children.length === 11, 'shelf_wooden has 11 children');
    children.forEach((child, i) => {
      assertEqual(child.maxCapacity, 20, `shelf_wooden child ${i + 1} capacity = 20`);
      assert(child.parentId === 'shelf_main', `child ${i + 1} parentId = shelf_main`);
      assert(child.tileX === 0 && child.tileY === 0, `child ${i + 1} shares parent position`);
      assert(child.label.startsWith('Kệ gỗ chính'), `child ${i + 1} label references parent`);
    });
  }

  // Test 2: fridge 2x1 (parent maxCapacity=24) → children cap 20
  {
    const parent = fixture({
      id: 'fridge_main', type: 'refrigerator', widthTiles: 2, heightTiles: 1,
      maxCapacity: 24, label: 'Tủ lạnh chính',
    });
    const fixtures = [parent];
    const result = syncSlotChildren(fixtures);
    assert(result.length === 24, 'fridge 2x1 has 24 total fixtures');
    const children = result.filter(f => isSlotChild(f));
    children.forEach((child, i) => {
      assertEqual(child.maxCapacity, 20, `fridge 2x1 child ${i + 1} capacity = 20`);
    });
  }

  // Test 3: fridge_single (parent maxCapacity=12) → children cap 12 (min(20, 12))
  {
    const parent = fixture({
      id: 'fridge1_main', type: 'refrigerator', widthTiles: 1, heightTiles: 1,
      maxCapacity: 12, label: 'Tủ lạnh nhỏ',
    });
    const fixtures = [parent];
    const result = syncSlotChildren(fixtures);
    assert(result.length === 8, 'fridge_single has 8 total fixtures');
    const children = result.filter(f => isSlotChild(f));
    assert(children.length === 7, 'fridge_single has 7 children');
    assertEqual(children[0].maxCapacity, 12, 'fridge_single child capacity = 12 (capped at parent)');
  }

  // Test 4: freezer (parent maxCapacity=18) → children cap 18 (min(20, 18))
  {
    const parent = fixture({
      id: 'freezer_main', type: 'refrigerator', widthTiles: 2, heightTiles: 1,
      maxCapacity: 18, label: 'Tủ đông',
    });
    const fixtures = [parent];
    const result = syncSlotChildren(fixtures);
    assert(result.length === 24, 'freezer (default, no slotCount) has 24 total fixtures');
    const children = result.filter(f => isSlotChild(f));
    children.forEach((child, i) => {
      assertEqual(child.maxCapacity, 18, `freezer child ${i + 1} capacity = 18`);
    });
  }

  // Test 5: Custom slotCount overrides
  {
    const parent = fixture({
      id: 'double_main', type: 'shelf_wooden', maxCapacity: 24,
      slotCount: 6, label: 'Kệ đôi',
    });
    const fixtures = [parent];
    const result = syncSlotChildren(fixtures);
    assert(result.length === 6, `custom slotCount 6 = 1 parent + 5 children`);
    const children = result.filter(f => isSlotChild(f));
    assertEqual(children.length, 5, '5 child slots');
    children.forEach((child, i) => {
      assertEqual(child.maxCapacity, 20, `custom child ${i + 1} capacity = 20`);
    });
  }

  // Test 6: Existing children with stockLots preserved
  {
    const existingChild: StoreFixture = {
      id: 'shelf_main#s2',
      type: 'shelf_wooden',
      tileX: 0, tileY: 0,
      widthTiles: 2, heightTiles: 1,
      rotation: 0,
      maxCapacity: 6, // old value
      currentStock: 5,
      stockLots: [{ quantity: 5, expiresOnDay: 10, unitCost: 1000, provenance: 'known' }],
      label: 'Kệ · ô 2',
      parentId: 'shelf_main',
    };
    const parent = fixture({ id: 'shelf_main', maxCapacity: 24, label: 'Kệ gỗ chính' });
    const fixtures = [parent, existingChild];
    const result = syncSlotChildren(fixtures);
    const child = result.find(f => f.id === 'shelf_main#s2')!;
    assert(child !== undefined, 'existing child preserved');
    assertEqual(child.maxCapacity, 20, 'existing child updated to new capacity formula');
    assertEqual(child.currentStock, 5, 'existing child stock preserved');
    assert(child.stockLots !== undefined && child.stockLots.length === 1, 'existing child stockLots preserved');
  }

  // Test 7: Parent with custom slotCount=1 (no children)
  {
    const parent = fixture({ id: 'no_children', maxCapacity: 10, slotCount: 1 });
    const fixtures = [parent];
    const result = syncSlotChildren(fixtures);
    assertEqual(result.length, 1, 'slotCount=1 means no children');
    assertEqual(result[0].maxCapacity, 10, 'parent capacity unchanged');
  }

  // Test 8: save cũ — nâng khay theo catalog, ô chính về 20 nhưng không cắt hàng đang có
  {
    const old = { ...fixture({ id: 'old', maxCapacity: 24, slotCount: 4 }), shopId: 'shelf_double', currentStock: 0 };
    const full = { ...fixture({ id: 'full', maxCapacity: 24 }), currentStock: 24 };
    const [a, b] = upgradeFixtureSlots([old, full]);
    assertEqual(a.slotCount, 24, 'kệ đôi cũ 4 khay được nâng lên 24');
    assertEqual(a.maxCapacity, 20, 'ô chính kệ về 20');
    assertEqual(b.maxCapacity, 24, 'ô chính đang chứa 24 món không bị cắt');
  }
}
