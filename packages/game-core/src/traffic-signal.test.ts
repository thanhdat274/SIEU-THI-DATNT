import assert from 'node:assert/strict';
import { CROSSWALK, STREET_PEDESTRIANS, STREET_VEHICLE_RULES, TRAFFIC_SIGNAL, TRAFFIC_SIGNAL_CYCLE_SEC } from '@game/data';
import { StreetVehicleState, TILE_SIZE } from '@game/shared';
import { StreetTrafficManager, STREET_LANE_RIGHT_Y } from './street-traffic';
import { pedestrianWalkSecondsLeft, trafficSignalAt } from './traffic-signal';

const crossLeft = CROSSWALK.tileX * TILE_SIZE;
const crossRight = (CROSSWALK.tileX + CROSSWALK.widthTiles) * TILE_SIZE;
const stopFront = crossLeft - STREET_VEHICLE_RULES.stopMarginPx;
const RED_START = TRAFFIC_SIGNAL.greenSec + TRAFFIC_SIGNAL.yellowSec;
const car = (id: string, x: number, speed = 85): StreetVehicleState => ({ id, type: 'car', variant: 0, direction: 'right', position: { x, y: STREET_LANE_RIGHT_Y }, speed });
const frontOf = (v: StreetVehicleState) => v.position.x + STREET_VEHICLE_RULES.halfLength[v.type];
const find = (m: StreetTrafficManager, id: string) => m.getVehicles().find(v => v.id === id)!;
const run = (m: StreetTrafficManager, seconds: number, hour = 12, rain = 0, seed = 1) => { for (let t = 0; t < seconds - 1e-9; t += 0.1) m.update(0.1, hour, rain, seed); };

export function runTrafficSignalTests(): void {
  console.log('\n--- Đèn giao thông, xe dừng trước vạch và nhường người đi bộ ---');

  // Chu kỳ đèn.
  const order: string[] = [];
  for (let t = 0; t < TRAFFIC_SIGNAL_CYCLE_SEC * 2; t += 0.1) {
    const s = trafficSignalAt(t);
    if (order[order.length - 1] !== s.vehicle) order.push(s.vehicle);
    if (s.pedestrian === 'walk') assert.equal(s.vehicle, 'red', 'Người đi bộ chỉ được đi khi xe đỏ');
    if (s.vehicle !== 'red') assert.equal(s.pedestrian, 'dont_walk', 'Xe xanh/vàng thì người đi bộ phải chờ');
    assert.ok((pedestrianWalkSecondsLeft(t) > 0) === (s.pedestrian === 'walk'), 'Giây còn lại khớp pha đi bộ');
  }
  assert.deepEqual(order, ['green', 'yellow', 'red', 'green', 'yellow', 'red'], 'Thứ tự xanh → vàng → đỏ lặp lại');
  assert.deepEqual(trafficSignalAt(3), trafficSignalAt(3 + TRAFFIC_SIGNAL_CYCLE_SEC), 'Chu kỳ tuần hoàn');
  assert.equal(TRAFFIC_SIGNAL.greenSec + TRAFFIC_SIGNAL.yellowSec + TRAFFIC_SIGNAL.redSec, TRAFFIC_SIGNAL_CYCLE_SEC);
  assert.ok(TRAFFIC_SIGNAL.pedLeadSec + TRAFFIC_SIGNAL.pedWalkSec < TRAFFIC_SIGNAL.redSec, 'Có pha nhấp nháy dọn đường trước khi xe xanh');

  // Xe dừng trước vạch khi đèn đỏ, xe sau giữ khoảng cách, rồi cùng đi khi xanh.
  {
    const m = new StreetTrafficManager([car('a', 100), car('b', 10)]);
    m.setSignalClock(RED_START);
    run(m, 9);
    const a = find(m, 'a'), b = find(m, 'b');
    assert.ok(frontOf(a) <= crossLeft, 'Xe đầu dừng trước vạch khi đỏ');
    assert.ok((a.currentSpeed ?? a.speed) < 1, 'Xe đầu đứng yên');
    assert.ok(frontOf(b) <= a.position.x - STREET_VEHICLE_RULES.halfLength.car + 0.5, 'Xe sau không chồng lên xe trước');
    m.setSignalClock(0);
    run(m, 9);
    const aAfter = m.getVehicles().find(v => v.id === 'a');
    assert.ok(!aAfter || aAfter.position.x - STREET_VEHICLE_RULES.halfLength.car > crossRight, 'Khi xanh xe đầu đi qua vạch (hoặc đã rời bản đồ)');
  }

  // Đèn xanh, không người qua đường: xe không giảm tốc.
  {
    const m = new StreetTrafficManager([car('a', 100)]);
    m.setSignalClock(0.5);
    let minSpeed = Infinity;
    for (let t = 0; t < 4; t += 0.1) { m.update(0.1, 12, 0, 1); const a = m.getVehicles().find(v => v.id === 'a'); if (a) minSpeed = Math.min(minSpeed, a.currentSpeed ?? a.speed); }
    assert.ok(minSpeed >= 84, 'Đèn xanh thì xe giữ tốc độ');
  }

  // Lưỡng lự lúc đèn vàng: xe quá gần thì đi qua, xe còn xa thì dừng.
  {
    const near = new StreetTrafficManager([car('n', stopFront - STREET_VEHICLE_RULES.halfLength.car - 8)]);
    near.setSignalClock(TRAFFIC_SIGNAL.greenSec + 0.1);
    run(near, 3);
    assert.ok(frontOf(find(near, 'n')) > stopFront + 20, 'Xe quá gần vạch lúc vàng đi tiếp');
    const far = new StreetTrafficManager([car('f', stopFront - STREET_VEHICLE_RULES.halfLength.car - 160)]);
    far.setSignalClock(TRAFFIC_SIGNAL.greenSec + 0.1);
    run(far, 8);
    assert.ok(frontOf(find(far, 'f')) <= crossLeft, 'Xe còn xa lúc vàng dừng trước vạch');
  }

  // Nhường người đang qua đường kể cả khi đèn xe xanh.
  {
    const m = new StreetTrafficManager([car('a', stopFront - STREET_VEHICLE_RULES.halfLength.car - 30)]);
    m.setSignalClock(5);
    m.addPedestrian({ id: 'p1', direction: 'south', state: 'crossing', x: crossLeft + 30 });
    run(m, 1);
    const a = find(m, 'a');
    assert.ok(frontOf(a) <= crossLeft && (a.currentSpeed ?? a.speed) < 60, 'Xe nhường người đang qua đường dù đèn xanh');
    run(m, 4);
    assert.equal(m.getPedestrians().length, 0, 'Người đi bộ qua xong thì rời cảnh');
    assert.ok(frontOf(find(m, 'a')) > crossRight, 'Người qua xong thì xe đi tiếp');
  }

  // Người đi bộ chờ đến pha đi, không bắt đầu qua khi sắp hết pha.
  {
    const m = new StreetTrafficManager();
    m.addPedestrian({ id: 'p1', direction: 'north', x: crossLeft + 20 });
    m.setSignalClock(3);
    run(m, 10, 3, 0, 5); // hour 3: không sinh thêm người
    assert.equal(m.getPedestrians()[0]?.state, 'waiting', 'Đèn xanh cho xe thì người đi bộ chờ');
    m.setSignalClock(RED_START + TRAFFIC_SIGNAL.pedLeadSec + 0.05);
    run(m, 0.2, 3, 0, 5);
    assert.equal(m.getPedestrians()[0]?.state, 'crossing', 'Đến pha đi thì bắt đầu qua');
    run(m, 3, 3, 0, 5);
    assert.equal(m.getPedestrians().length, 0, 'Qua xong thì rời cảnh');
    const late = new StreetTrafficManager();
    late.addPedestrian({ id: 'p2', direction: 'south', x: crossLeft + 20 });
    late.setSignalClock(RED_START + TRAFFIC_SIGNAL.pedLeadSec + TRAFFIC_SIGNAL.pedWalkSec - 1);
    run(late, 0.3, 3, 0, 5);
    assert.equal(late.getPedestrians()[0]?.state, 'waiting', 'Sắp hết pha đi thì người chờ không bắt đầu qua');
  }

  // Sinh người đi bộ: không ban đêm, không mưa lớn, không quá giới hạn.
  {
    const night = new StreetTrafficManager();
    run(night, 400, 3, 0, 9);
    assert.equal(night.getPedestrians().length, 0, 'Ban đêm không có người qua đường');
    const storm = new StreetTrafficManager();
    run(storm, 400, 12, 0.9, 9);
    assert.equal(storm.getPedestrians().length, 0, 'Mưa lớn không có người qua đường');
    const day = new StreetTrafficManager();
    let seen = 0, max = 0;
    for (let t = 0; t < 600; t += 0.1) { day.update(0.1, 12, 0, 9); const n = day.getPedestrians().length; seen += n > 0 ? 1 : 0; max = Math.max(max, n); }
    assert.ok(seen > 0, 'Ban ngày có người qua đường');
    assert.ok(max <= STREET_PEDESTRIANS.maxConcurrent, 'Không vượt số người tối đa');
  }

  // Bất biến khi mô phỏng dài: xe và người không cùng ở vạch; xe cùng làn không chồng nhau.
  {
    const m = new StreetTrafficManager();
    let conflicts = 0, overlaps = 0, stoppedAtRed = 0;
    for (let t = 0; t < 1800; t += 0.1) {
      m.update(0.1, 8, 0, 4242);
      const vehicles = m.getVehicles();
      const crossing = m.getPedestrians().some(p => p.state === 'crossing');
      for (const v of vehicles) {
        const half = STREET_VEHICLE_RULES.halfLength[v.type];
        if (crossing && v.position.x + half > crossLeft && v.position.x - half < crossRight) conflicts++;
        if ((v.currentSpeed ?? v.speed) < 1 && m.getSignal().vehicle === 'red') stoppedAtRed++;
      }
      for (const a of vehicles) for (const b of vehicles) {
        if (a.id >= b.id || a.direction !== b.direction) continue;
        const gap = Math.abs(a.position.x - b.position.x) - STREET_VEHICLE_RULES.halfLength[a.type] - STREET_VEHICLE_RULES.halfLength[b.type];
        if (gap < -1) overlaps++;
      }
    }
    assert.equal(conflicts, 0, 'Không bao giờ có xe ở vạch lúc người đang qua đường');
    assert.equal(overlaps, 0, 'Xe cùng làn không chồng nhau');
    assert.ok(stoppedAtRed > 0, 'Trong 30 phút mô phỏng có xe đã dừng chờ đèn đỏ');
  }
  console.log('  ✓ Passed: Đèn giao thông, xe dừng và nhường người đi bộ tại vạch qua đường');
}
