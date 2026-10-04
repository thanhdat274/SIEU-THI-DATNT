import assert from 'node:assert/strict';
import { INTERSECTIONS, VEHICLE_ROAD_MAP, roadLaneCoord, STREET_VEHICLE_RULES, TRAFFIC_SIGNAL, TRAFFIC_SIGNAL_CYCLE_SEC } from '@game/data';
import { StreetVehicleState } from '@game/shared';
import { StreetTrafficManager, STREET_LANE_RIGHT_Y } from './street-traffic';
import { intersectionSignalsAt, trafficSignalAt } from './traffic-signal';

const RED_START = TRAFFIC_SIGNAL.greenSec + TRAFFIC_SIGNAL.yellowSec;
const car = (id: string, x: number, speed = 85): StreetVehicleState => ({ id, type: 'car', variant: 0, direction: 'right', position: { x, y: STREET_LANE_RIGHT_Y }, speed });
const frontOf = (v: StreetVehicleState) => v.position.x + STREET_VEHICLE_RULES.halfLength[v.type];
const find = (m: StreetTrafficManager, id: string) => m.getVehicles().find(v => v.id === id)!;
const run = (m: StreetTrafficManager, seconds: number, hour = 12, rain = 0, seed = 1) => { for (let t = 0; t < seconds - 1e-9; t += 0.1) m.update(0.1, hour, rain, seed); };

export function runTrafficSignalTests(): void {
  console.log('\n--- Đèn giao thông ngã tư, xe dừng trước vạch, xe đường dọc ---');

  // Chu kỳ đèn.
  const order: string[] = [];
  for (let t = 0; t < TRAFFIC_SIGNAL_CYCLE_SEC * 2; t += 0.1) {
    const s = trafficSignalAt(t);
    if (order[order.length - 1] !== s.vehicle) order.push(s.vehicle);
    if (s.pedestrian === 'walk') assert.equal(s.vehicle, 'red', 'Người đi bộ chỉ được đi khi xe đỏ');
    if (s.vehicle !== 'red') assert.equal(s.pedestrian, 'dont_walk', 'Xe xanh/vàng thì người đi bộ phải chờ');
  }
  assert.deepEqual(order, ['green', 'yellow', 'red', 'green', 'yellow', 'red'], 'Thứ tự xanh → vàng → đỏ lặp lại');
  assert.deepEqual(trafficSignalAt(3), trafficSignalAt(3 + TRAFFIC_SIGNAL_CYCLE_SEC), 'Chu kỳ tuần hoàn');
  assert.equal(TRAFFIC_SIGNAL.greenSec + TRAFFIC_SIGNAL.yellowSec + TRAFFIC_SIGNAL.redSec, TRAFFIC_SIGNAL_CYCLE_SEC);
  assert.ok(TRAFFIC_SIGNAL.pedLeadSec + TRAFFIC_SIGNAL.pedWalkSec < TRAFFIC_SIGNAL.redSec, 'Có pha nhấp nháy dọn đường trước khi xe xanh');

  // Người đi bộ nền trên vỉa hè: không ban đêm, không mưa lớn, không quá 3 người cùng lúc (không còn vạch qua đường riêng trước tiệm).
  {
    const night = new StreetTrafficManager();
    run(night, 400, 3, 0, 9);
    assert.equal(night.getPedestrians().length, 0, 'Ban đêm không có người đi vỉa hè');
    const storm = new StreetTrafficManager();
    run(storm, 400, 12, 0.9, 9);
    assert.equal(storm.getPedestrians().length, 0, 'Mưa lớn không có người đi vỉa hè');
    const day = new StreetTrafficManager();
    let seen = 0, max = 0;
    for (let t = 0; t < 600; t += 0.1) { day.update(0.1, 12, 0, 9); const n = day.getPedestrians().length; seen += n > 0 ? 1 : 0; max = Math.max(max, n); }
    assert.ok(seen > 0, 'Ban ngày có người đi vỉa hè');
    assert.ok(max <= 3, 'Không vượt số người đi vỉa hè tối đa');
  }


  // Ngã tư đường dọc: hai pha xen kẽ, không bao giờ cùng xanh; xe dừng trước vạch dừng khi đường ngang đỏ rồi đi tiếp.
  {
    assert.ok(INTERSECTIONS.length >= 2 && INTERSECTIONS.every((x) => x.roadId !== 'school'), 'Có ngã tư ở đường chính/đường phía nam, ngã ba đường trường không có đèn');
    let avenueGreenSeen = false;
    for (let t = 0; t < TRAFFIC_SIGNAL_CYCLE_SEC * 2; t += 0.1) {
      const { main, avenue } = intersectionSignalsAt(t);
      assert.ok(!(main.vehicle !== 'red' && avenue.vehicle !== 'red'), 'Đường ngang và đường dọc không cùng được đi');
      if (main.pedestrian === 'walk') assert.equal(avenue.pedestrian, 'dont_walk', 'Qua đường ngang thì không đồng thời qua đường dọc');
      if (avenue.vehicle === 'green') avenueGreenSeen = true;
    }
    assert.ok(avenueGreenSeen, 'Đường dọc có pha xanh');

    const ix = INTERSECTIONS.find((x) => x.roadId === 'main' && x.avenueId === 'west')!;
    const stop = ix.crossLeft - STREET_VEHICLE_RULES.stopMarginPx;
    const half = STREET_VEHICLE_RULES.halfLength.car;
    const m = new StreetTrafficManager([car('x', stop - half - 40), car('y', stop - half - 200)]);
    m.setSignalClock(RED_START + 1 - ix.signalOffsetSec);
    assert.equal(m.getIntersectionSignals().find((s) => s.id === ix.id)!.signals.main.vehicle, 'red', 'Chuẩn bị: ngã tư đang đỏ cho đường ngang');
    run(m, 6);
    const x = find(m, 'x'), y = find(m, 'y');
    assert.ok(frontOf(x) <= ix.crossLeft && (x.currentSpeed ?? x.speed) < 1, 'Xe dừng trước vạch dừng ngã tư khi đèn đỏ');
    assert.ok(frontOf(y) <= x.position.x - half + 0.5, 'Xe sau xếp hàng sau xe đầu');
    m.setSignalClock(-ix.signalOffsetSec + 0.5);
    run(m, 8);
    const after = m.getVehicles().find((v) => v.id === 'x');
    assert.ok(!after || after.position.x - half > ix.crossRight, 'Xanh thì xe đi hết ngã tư');
  }

  // Xe đường dọc: chạy đúng làn bên phải, dừng trước vạch khi đường dọc đỏ, đi tiếp khi xanh, không bao giờ cùng ở hộp giao lộ với xe đường ngang.
  {
    const ix = INTERSECTIONS.find((x) => x.roadId === 'main' && x.avenueId === 'west')!;
    const road = VEHICLE_ROAD_MAP[ix.avenueRoadId];
    assert.equal(road.axis, 'y', 'Đường dọc chạy theo trục y');
    const halfY = STREET_VEHICLE_RULES.halfLengthY.car;
    const southbound = (id: string, y: number): StreetVehicleState => ({ id, type: 'car', variant: 0, direction: 'right', roadId: ix.avenueRoadId, axis: 'y', position: { x: roadLaneCoord(road, 'right'), y }, speed: 70 });
    assert.ok(roadLaneCoord(road, 'right') < roadLaneCoord(road, 'left'), 'Xuôi nam chạy nửa tây, ngược bắc chạy nửa đông (đi bên phải)');
    const stop = ix.crossTop - STREET_VEHICLE_RULES.stopMarginPx;
    const m = new StreetTrafficManager([southbound('s', stop - halfY - 40), southbound('t', stop - halfY - 160)]);
    m.setSignalClock(-ix.signalOffsetSec + 0.5); // đường ngang xanh → đường dọc đỏ
    assert.equal(m.getIntersectionSignals().find((s) => s.id === ix.id)!.signals.avenue.vehicle, 'red');
    run(m, 6);
    const s = find(m, 's'), t = find(m, 't');
    assert.ok(s.position.y + halfY <= ix.crossTop && (s.currentSpeed ?? s.speed) < 1, 'Xe đường dọc dừng trước vạch khi đỏ');
    assert.equal(s.position.x, roadLaneCoord(road, 'right'), 'Xe giữ nguyên làn');
    assert.ok(t.position.y + halfY <= s.position.y - halfY + 0.5, 'Xe sau xếp hàng sau xe đầu');
    m.setSignalClock(RED_START + 4 - ix.signalOffsetSec); // đường dọc xanh
    run(m, 10);
    const after = m.getVehicles().find((v) => v.id === 's');
    assert.ok(!after || after.position.y - halfY > ix.crossBottom, 'Đường dọc xanh thì xe đi hết ngã tư');

    // Mô phỏng dài: không có xe hai trục cùng đè lên một hộp giao lộ; đường dọc có xe chạy cả hai chiều.
    const sim = new StreetTrafficManager();
    let clashes = 0;
    const seen = new Set<string>();
    for (let tick = 0; tick < 3600; tick += 0.1) {
      sim.update(0.1, 8, 0, 777);
      const vs = sim.getVehicles();
      for (const v of vs) if (v.axis === 'y') seen.add(`${v.roadId}|${v.direction}`);
      for (const x of INTERSECTIONS) {
        const along = (v: StreetVehicleState) => (v.axis === 'y' ? v.position.y : v.position.x);
        const hl = (v: StreetVehicleState) => (v.axis === 'y' ? STREET_VEHICLE_RULES.halfLengthY[v.type] : STREET_VEHICLE_RULES.halfLength[v.type]);
        const inX = vs.filter((v) => v.axis !== 'y' && (v.roadId ?? 'main') === x.roadId && along(v) + hl(v) > x.avenueLeft && along(v) - hl(v) < x.avenueRight);
        const inY = vs.filter((v) => v.axis === 'y' && v.roadId === x.avenueRoadId && along(v) + hl(v) > x.roadTop && along(v) - hl(v) < x.roadBottom);
        if (inX.length && inY.length) clashes++;
      }
    }
    assert.equal(clashes, 0, 'Xe đường ngang và đường dọc không cùng ở vùng xung đột của ngã tư');
    assert.ok(seen.has('avenue-west|right') || seen.has('avenue-east|right'), 'Có xe xuôi nam trên đường dọc');
    assert.ok(seen.has('avenue-west|left') || seen.has('avenue-east|left'), 'Có xe ngược bắc trên đường dọc');
  }
  console.log('  ✓ Passed: Đèn ngã tư, xe dừng trước vạch, xe đường dọc không xung đột');
}
