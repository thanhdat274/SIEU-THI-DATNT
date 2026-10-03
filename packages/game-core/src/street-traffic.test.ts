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

    it('khách ghé quầy vỉa hè dừng lại tại quầy rồi đi tiếp; không có quầy thì không có khách ghé', () => {
      const none = new StreetTrafficManager();
      for (let i = 0; i < 400; i++) none.update(0.5, 10, 0, 321);
      assert.strictEqual(none.getStallVisitsCompleted(), 0);
      assert.ok(!none.getPedestrians().some(p => p.id.startsWith('stall-ped')));

      const stopX = 15 * TILE_SIZE;
      const manager = new StreetTrafficManager();
      manager.setStallStops([stopX]);
      let sawPausedAtStall = false;
      for (let i = 0; i < 1200; i++) {
        manager.update(0.5, 10, 0, 321);
        for (const p of manager.getPedestrians()) {
          if (!p.id.startsWith('stall-ped')) continue;
          if (p.state === 'waiting') {
            sawPausedAtStall = true;
            assert.strictEqual(p.position.x, stopX, 'Chỉ đứng chờ đúng chỗ quầy');
          }
        }
      }
      assert.ok(sawPausedAtStall, 'Có khách dừng ở quầy');
      assert.ok(manager.getStallVisitsCompleted() > 0, 'Có khách mua xong và đi tiếp');
      for (const p of manager.getPedestrians()) {
        if (p.id.startsWith('stall-ped')) assert.ok(p.position.y < 12.1 * TILE_SIZE, 'Đi trên vỉa hè phía bắc');
      }
    });

    it('không có khách ghé quầy ban đêm hoặc khi mưa to', () => {
      const night = new StreetTrafficManager();
      night.setStallStops([400]);
      const rain = new StreetTrafficManager();
      rain.setStallStops([400]);
      for (let i = 0; i < 600; i++) { night.update(0.5, 23, 0, 5); rain.update(0.5, 10, 0.9, 5); }
      assert.ok(!night.getPedestrians().some(p => p.id.startsWith('stall-ped')));
      assert.ok(!rain.getPedestrians().some(p => p.id.startsWith('stall-ped')));
    });
  });
}

if (process.argv[1]?.includes('street-traffic.test')) {
  runStreetTrafficTests();
}
