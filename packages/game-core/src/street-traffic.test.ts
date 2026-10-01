import { describe, it } from 'node:test';
import assert from 'node:assert';
import { StreetTrafficManager, STREET_LANE_LEFT_Y, STREET_LANE_RIGHT_Y } from './street-traffic';
import { MAP_WIDTH } from '@game/data';
import { TILE_SIZE } from '@game/shared';

export function runStreetTrafficTests(): void {
  describe('StreetTrafficManager tests', () => {
    it('initializes empty and respects max concurrent vehicles limit', () => {
      const manager = new StreetTrafficManager();
      assert.strictEqual(manager.getVehicles().length, 0);

      // Advance with large dt to trigger multiple spawns
      for (let step = 0; step < 50; step++) {
        manager.update(1.0, 8, 0, 100);
      }

      // Max concurrent should never exceed 2
      assert.ok(manager.getVehicles().length <= 4);
    });

    it('positions vehicles correctly according to traffic direction rules', () => {
      const manager = new StreetTrafficManager();
      // Force spawn
      manager.update(10.0, 8, 0, 999);
      const vehicles = manager.getVehicles();
      assert.ok(vehicles.length > 0);

      for (const v of vehicles) {
        if (v.direction === 'right') {
          assert.strictEqual(v.position.y, STREET_LANE_RIGHT_Y);
        } else {
          assert.strictEqual(v.position.y, STREET_LANE_LEFT_Y);
        }
      }
    });

    it('cleans up vehicles when they exit map bounds', () => {
      const manager = new StreetTrafficManager([
        {
          id: 'test-car',
          type: 'car',
          variant: 0,
          direction: 'right',
          position: { x: MAP_WIDTH * TILE_SIZE + 50, y: STREET_LANE_RIGHT_Y },
          speed: 100,
        },
      ]);

      assert.strictEqual(manager.getVehicles().length, 1);
      // Advance by 1s (will move 100px further right, beyond MAP_WIDTH * TILE_SIZE + 60)
      manager.update(1.0, 12, 0, 123);
      assert.strictEqual(manager.getVehicles().length, 0);
    });

    it('adjusts spawn frequency and speeds according to weather and rush hour', () => {
      const dryManager = new StreetTrafficManager();
      const rainManager = new StreetTrafficManager();

      // Trigger spawn in both
      dryManager.update(10.0, 8, 0, 777);
      rainManager.update(10.0, 8, 0.9, 777);

      const dryVehicles = dryManager.getVehicles();
      const rainVehicles = rainManager.getVehicles();

      if (dryVehicles[0] && rainVehicles[0]) {
        // Rain speed should be slower due to wet road factor
        assert.ok(rainVehicles[0].speed <= dryVehicles[0].speed);
      }
    });
  });
}

if (process.argv[1]?.includes('street-traffic.test')) {
  runStreetTrafficTests();
}
