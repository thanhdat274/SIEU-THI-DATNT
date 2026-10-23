import assert from 'node:assert/strict';
import { INTERSECTIONS, VEHICLE_ROAD_MAP, roadLaneCoord, STREET_VEHICLE_RULES, INTERSECTION_SIGNAL, STORE_FRONT_CROSSWALK, STORE_FRONT_SIGNAL, TRAFFIC_SIGNAL_CYCLE_SEC, trafficRainSpeedFactor } from '@game/data';
import { StreetVehicleState } from '@game/shared';
import { StreetTrafficManager, STREET_LANE_RIGHT_Y } from './street-traffic';
import { intersectionSignalsAt, storeFrontSignalAt, trafficSignalPhaseFromWorldClock } from './traffic-signal';

const RED_START = INTERSECTION_SIGNAL.greenSec + INTERSECTION_SIGNAL.yellowSec; // 29
const car = (id: string, x: number, speed = 85): StreetVehicleState => ({ id, type: 'car', variant: 0, direction: 'right', position: { x, y: STREET_LANE_RIGHT_Y }, speed });
const frontOf = (v: StreetVehicleState) => v.position.x + STREET_VEHICLE_RULES.halfLength[v.type];
const find = (m: StreetTrafficManager, id: string) => m.getVehicles().find(v => v.id === id)!;
const run = (m: StreetTrafficManager, seconds: number, hour = 12, rain = 0, seed = 1) => { for (let t = 0; t < seconds - 1e-9; t += 0.1) m.update(0.1, hour, rain, seed); };

export function runTrafficSignalTests(): void {
  console.log('\n--- Đèn giao thông: vạch trước tiệm (ưu tiên người đi bộ) + ngã tư (ưu tiên xe), xe dừng trước vạch ---');

  // Hai chu kỳ cùng tổng 39 phút (nền pha worldTime là một); tổng pha hợp lệ.
  assert.equal(INTERSECTION_SIGNAL.greenSec + INTERSECTION_SIGNAL.yellowSec + INTERSECTION_SIGNAL.redSec, TRAFFIC_SIGNAL_CYCLE_SEC, 'Ngã tư: tổng pha = chu kỳ');
  assert.equal(STORE_FRONT_SIGNAL.greenSec + STORE_FRONT_SIGNAL.yellowSec + STORE_FRONT_SIGNAL.redSec, TRAFFIC_SIGNAL_CYCLE_SEC, 'Vạch trước tiệm: tổng pha = chu kỳ');
  // Yêu cầu review: ngã tư phải để xe xanh ≥ 50% chu kỳ (không để xe đứng chờ đỏ hầu hết thời gian).
  assert.ok(INTERSECTION_SIGNAL.greenSec >= TRAFFIC_SIGNAL_CYCLE_SEC / 2, `Ngã tư xe xanh ${INTERSECTION_SIGNAL.greenSec}/${TRAFFIC_SIGNAL_CYCLE_SEC} ≈ ${(100 * INTERSECTION_SIGNAL.greenSec / TRAFFIC_SIGNAL_CYCLE_SEC).toFixed(0)}% ≥ 50%`);
  assert.ok(INTERSECTION_SIGNAL.pedLeadSec + INTERSECTION_SIGNAL.pedWalkSec < INTERSECTION_SIGNAL.redSec, 'Ngã tư: có pha nhấp nháy dọn đường trước khi xe xanh');
  assert.ok(STORE_FRONT_SIGNAL.pedLeadSec + STORE_FRONT_SIGNAL.pedWalkSec < STORE_FRONT_SIGNAL.redSec, 'Vạch trước tiệm: có pha nhấp nháy dọn đường');

  // Chu kỳ vạch trước tiệm (ưu tiên người đi bộ): người đi bộ chỉ qua khi xe đỏ; thứ tự xanh → vàng → đỏ lặp lại.
  {
    const order: string[] = [];
    for (let t = 0; t < TRAFFIC_SIGNAL_CYCLE_SEC * 2; t += 0.1) {
      const s = storeFrontSignalAt(t);
      if (order[order.length - 1] !== s.vehicle) order.push(s.vehicle);
      if (s.pedestrian === 'walk') assert.equal(s.vehicle, 'red', 'Người đi bộ chỉ được đi khi xe đỏ');
      if (s.vehicle !== 'red') assert.equal(s.pedestrian, 'dont_walk', 'Xe xanh/vàng thì người đi bộ phải chờ');
    }
    assert.deepEqual(order, ['green', 'yellow', 'red', 'green', 'yellow', 'red'], 'Thứ tự xanh → vàng → đỏ lặp lại');
    assert.deepEqual(storeFrontSignalAt(3), storeFrontSignalAt(3 + TRAFFIC_SIGNAL_CYCLE_SEC), 'Chu kỳ tuần hoàn');
    // Pha walk (22/39 ≈ 56%) đủ rộng để khách thật băng vạch không chờ lâu.
    assert.ok(STORE_FRONT_SIGNAL.pedLeadSec + STORE_FRONT_SIGNAL.pedWalkSec >= TRAFFIC_SIGNAL_CYCLE_SEC / 2, 'Vạch trước tiệm: pha đi bộ ≥ 50% chu kỳ');
  }

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


  // Ngã tư đường dọc (ưu tiên xe): hai pha xen kẽ, không bao giờ cùng xanh; xe dừng trước vạch dừng khi đường ngang đỏ rồi đi tiếp.
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

  // ---- Pha đèn là hàm thuần của worldTime (ngày + phút), giống nhau ở client và WorldRuntime cùng giờ (OpenSpec 4.5)
  {
    // Tuần hoàn theo chu kỳ phút game: từ 07:00 cộng một chu kỳ (TRAFFIC_SIGNAL_CYCLE_SEC phút) → cùng pha.
    assert.equal(trafficSignalPhaseFromWorldClock(1, 7, 0), 0, 'Ngày 1 07:00 là mốc bắt đầu chu kỳ (pha 0)');
    assert.equal(trafficSignalPhaseFromWorldClock(1, 7, TRAFFIC_SIGNAL_CYCLE_SEC), 0, 'Sau một chu kỳ (số phút = TRAFFIC_SIGNAL_CYCLE_SEC) pha lặp lại');
    assert.equal(trafficSignalPhaseFromWorldClock(1, 8, 18), 0, '78 phút = 2 chu kỳ cũng về pha 0');
    // Hai manager cùng giờ cho cùng pha đèn (không gửi qua mạng mỗi khung) — cả vạch trước tiệm lẫn ngã tư.
    const a = new StreetTrafficManager();
    a.setWorldClock(4, 9, 31);
    const b = new StreetTrafficManager();
    b.setWorldClock(4, 9, 31);
    assert.deepEqual(a.getIntersectionSignals(), b.getIntersectionSignals(), 'Hai manager cùng giờ có cùng pha ngã tư');
    assert.deepEqual(a.getStoreFrontSignal(), b.getStoreFrontSignal(), 'Hai manager cùng giờ có cùng pha vạch trước tiệm');
    // Pha đổi theo giờ: các giờ khác nhau trải ra nhiều trạng thái đèn khác nhau (cả hai tín hiệu).
    const storeFrontStates = new Set([7, 9, 11, 13, 15].map((h) => storeFrontSignalAt(trafficSignalPhaseFromWorldClock(4, h, 0)).vehicle));
    assert.ok(storeFrontStates.size >= 2, 'Pha vạch trước tiệm thay đổi theo giờ game (có ít nhất hai trạng thái đèn khác nhau)');
    const intersectionStates = new Set([7, 9, 11, 13, 15].map((h) => intersectionSignalsAt(trafficSignalPhaseFromWorldClock(4, h, 0)).main.vehicle));
    assert.ok(intersectionStates.size >= 2, 'Pha ngã tư thay đổi theo giờ game (có ít nhất hai trạng thái đèn khác nhau)');
  }
  console.log('  ✓ Passed: Vạch trước tiệm ưu tiên người đi bộ, ngã tư ưu tiên xe (≥50% xanh), xe dừng trước vạch, không xung đột');
  console.log('  ✓ Passed: Pha đèn là hàm thuần của worldTime, cùng giờ → cùng pha');

  // ---- Mưa to (rain-intensity-forecast 4.4): xe chậm hơn nhưng vẫn dừng trước vạch ngã tư và vạch trước tiệm ----
  {
    const ix = INTERSECTIONS.find((x) => x.roadId === 'main' && x.avenueId === 'west')!;
    const half = STREET_VEHICLE_RULES.halfLength.car;
    const stop = ix.crossLeft - STREET_VEHICLE_RULES.stopMarginPx;
    const m = new StreetTrafficManager([car('wet', stop - half - 40)]);
    m.setSignalClock(RED_START + 1 - ix.signalOffsetSec);
    run(m, 6, 14, 1);
    const wet = find(m, 'wet');
    assert.ok(frontOf(wet) <= ix.crossLeft && (wet.currentSpeed ?? wet.speed) < 1, 'Mưa to: xe vẫn dừng trước vạch ngã tư khi đỏ');

    // Mô phỏng dài lúc mưa to: không xe nào MỚI lấn vào vạch trước tiệm khi người đi bộ đang xanh (xe đang dọn vạch lúc
    // đèn chuyển thì được đi hết — giống trời khô).
    const entriesDuringWalk = (rain: number) => {
      const mgr = new StreetTrafficManager();
      const prevFront = new Map<string, number>();
      let entries = 0;
      for (let t = 0; t < 1800; t += 0.1) {
        mgr.update(0.1, 14, rain, 99);
        const walk = mgr.getStoreFrontSignal().pedestrian === 'walk';
        for (const v of mgr.getVehicles()) {
          if (v.axis === 'y' || (v.roadId ?? 'main') !== 'main' || v.isDeparting) continue;
          const hl = STREET_VEHICLE_RULES.halfLength[v.type];
          const front = v.direction === 'right' ? v.position.x + hl : v.position.x - hl;
          const before = prevFront.get(v.id);
          const entered = before !== undefined && (v.direction === 'right' ? before <= STORE_FRONT_CROSSWALK.x0 && front > STORE_FRONT_CROSSWALK.x0 : before >= STORE_FRONT_CROSSWALK.x1 && front < STORE_FRONT_CROSSWALK.x1);
          if (walk && entered) entries++;
          prevFront.set(v.id, front);
        }
      }
      return entries;
    };
    assert.equal(entriesDuringWalk(1), 0, 'Mưa to: không xe nào lấn vào vạch trước tiệm lúc người đi bộ xanh');
    assert.equal(entriesDuringWalk(0), 0, 'Trời khô: (đối chứng) không xe nào lấn vào vạch lúc người đi bộ xanh');

    // Xe khách rời tiệm chậm hơn khi mưa to; tốc độ xe nền giảm thêm từ ngưỡng mưa to.
    const dry = new StreetTrafficManager(); dry.update(0.1, 14, 0, 5); dry.addDepartingVehicle({ x: 300, y: 450 }, 'motorbike', 0);
    const rainy = new StreetTrafficManager(); rainy.update(0.1, 14, 1, 5); rainy.addDepartingVehicle({ x: 300, y: 450 }, 'motorbike', 0);
    const depSpeed = (mgr: StreetTrafficManager) => mgr.getVehicles().find((v) => v.isDeparting)!.speed;
    assert.ok(depSpeed(rainy) < depSpeed(dry), `Xe khách rời tiệm chậm hơn khi mưa to (${depSpeed(rainy).toFixed(1)} < ${depSpeed(dry)})`);
    assert.ok(trafficRainSpeedFactor(1) < 1 - 0.28 && Math.abs(trafficRainSpeedFactor(0.5) - (1 - 0.28 * 0.5)) < 1e-9, 'Chậm thêm chỉ từ mưa to trở lên');
  }
}
