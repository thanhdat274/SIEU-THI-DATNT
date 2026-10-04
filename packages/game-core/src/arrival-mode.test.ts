import assert from 'node:assert/strict';
import { isSalesFixture } from '@game/shared';
import { ARRIVAL_BASE_WEIGHTS, CAR_PARKING_SPOTS, DEFAULT_INITIAL_SAVE, PRODUCT_MAP, STORE_BOUNDS, STREET_LAMP_TILES, STREET_PARKING_SPOTS, MAP_WIDTH, generateStarterTileMap } from '@game/data';
import { arrivalModeWeights, pickArrivalMode } from './arrival-mode';
import { CustomerManager } from './customers';
import { InputManager } from './input';
import { GameSimulation } from './simulation';

const sum = (w: { walk: number; motorbike: number; car: number }) => w.walk + w.motorbike + w.car;

export function runArrivalModeTests(): void {
  console.log('\n--- Phương thức đến tiệm theo giờ, thứ, mưa và chỗ đỗ ---');

  // Cơ bản: không ngữ cảnh thì đúng tỷ trọng gốc, tổng bằng 1.
  const base = arrivalModeWeights();
  assert.ok(Math.abs(sum(base) - 1) < 1e-9, 'Tổng tỷ trọng bằng 1');
  assert.ok(Math.abs(base.motorbike - ARRIVAL_BASE_WEIGHTS.motorbike) < 1e-9 && Math.abs(base.car - ARRIVAL_BASE_WEIGHTS.car) < 1e-9, 'Không ngữ cảnh giữ tỷ trọng cơ bản');
  assert.deepEqual(arrivalModeWeights({ hour: 15, weekday: 2, rainIntensity: 0 }), base, 'Giờ thường, ngày thường, trời khô giữ tỷ trọng cơ bản');

  // Mưa: người đi bộ giảm, ô tô tăng, đơn điệu theo cường độ.
  let prev = arrivalModeWeights({ rainIntensity: 0 });
  for (const rain of [0.2, 0.4, 0.6, 0.8, 1]) {
    const cur = arrivalModeWeights({ rainIntensity: rain });
    assert.ok(cur.walk < prev.walk, `Mưa ${rain}: người đi bộ giảm`);
    assert.ok(cur.car > prev.car, `Mưa ${rain}: ô tô tăng`);
    assert.ok(Math.abs(sum(cur) - 1) < 1e-9);
    prev = cur;
  }
  assert.ok(arrivalModeWeights({ rainIntensity: 0.9 }).walk < base.walk * 0.6, 'Mưa lớn giảm mạnh người đi bộ');

  // Khung giờ và cuối tuần.
  const midday = arrivalModeWeights({ hour: 12 }), rushMorning = arrivalModeWeights({ hour: 8 }), rushEvening = arrivalModeWeights({ hour: 18 });
  const evening = arrivalModeWeights({ hour: 20 }), night = arrivalModeWeights({ hour: 22 });
  assert.ok(rushMorning.motorbike > midday.motorbike && rushEvening.motorbike > midday.motorbike, 'Cao điểm nhiều xe máy hơn giờ trưa');
  assert.ok(evening.car > midday.car && evening.car > rushEvening.car, 'Buổi tối nhiều ô tô nhất');
  assert.ok(midday.walk > rushMorning.walk, 'Giờ trưa nhiều người đi bộ hơn cao điểm sáng');
  assert.deepEqual(night, arrivalModeWeights(), 'Sau 22 giờ không có hệ số khung giờ');
  const weekday = arrivalModeWeights({ hour: 15, weekday: 2 }), weekend = arrivalModeWeights({ hour: 15, weekday: 5 }), sunday = arrivalModeWeights({ hour: 15, weekday: 6 });
  assert.ok(weekend.car > weekday.car && sunday.car > weekday.car && weekend.walk > weekday.walk * 0.9, 'Cuối tuần nhiều ô tô hơn');

  // Chỗ đỗ: hết chỗ thì loại đó không được chọn.
  const noCar = arrivalModeWeights({ rainIntensity: 0.9, freeCarSpot: false });
  assert.equal(noCar.car, 0);
  assert.ok(Math.abs(sum(noCar) - 1) < 1e-9);
  assert.equal(arrivalModeWeights({ freeMotorbikeSpot: false }).motorbike, 0);
  assert.deepEqual(arrivalModeWeights({ freeMotorbikeSpot: false, freeCarSpot: false }).walk > 0.9, true, 'Hết chỗ cả hai thì hầu như đi bộ');

  // Chọn theo roll, thứ tự xe máy → ô tô → đi bộ.
  const w = { walk: 0.5, motorbike: 0.3, car: 0.2 };
  assert.equal(pickArrivalMode(w, 0), 'motorbike');
  assert.equal(pickArrivalMode(w, 0.31), 'car');
  assert.equal(pickArrivalMode(w, 0.51), 'walk');
  assert.equal(pickArrivalMode(w, 0.999), 'walk');

  // Hình học chỗ đỗ ô tô: không chồng cột đèn, ô đỗ xe máy hay cửa tiệm.
  const carHalf = 65; // ô tô dài 130 px
  for (const spot of CAR_PARKING_SPOTS) {
    for (const lamp of STREET_LAMP_TILES) assert.ok(Math.abs(spot.x - (lamp.x + 0.5) * 32) > carHalf + 8, 'Ô tô không chồng cột đèn');
    for (const bike of STREET_PARKING_SPOTS) assert.ok(Math.abs(spot.x - bike.x) > carHalf + 31, 'Ô tô không chồng ô đỗ xe máy');
    assert.ok(spot.x - carHalf > (STORE_BOUNDS.right + 1) * 32 - 1 || Math.floor(spot.y / 32) > STORE_BOUNDS.bottom, 'Ô tô không nằm trong tiệm');
    assert.ok(spot.x + carHalf < MAP_WIDTH * 32, 'Ô tô trong bản đồ');
    for (const other of CAR_PARKING_SPOTS) if (other !== spot) assert.ok(Math.abs(spot.x - other.x) > carHalf * 2, 'Hai ô tô đỗ không chồng nhau');
  }

  // Tích hợp: khách thật mang phương thức đến theo ngữ cảnh, ô tô có chỗ đỗ, không trùng chỗ.
  const save = structuredClone(DEFAULT_INITIAL_SAVE);
  const sim = new GameSimulation(save, generateStarterTileMap(), new InputManager());
  const map = generateStarterTileMap();
  const sales = sim.getFixtures().filter(isSalesFixture);
  const water = PRODUCT_MAP['nuoc_suoi'] ?? Object.values(PRODUCT_MAP)[0];
  sales[0].assignedProductId = water.id;
  sales[0].currentStock = 9;
  for (const other of sales.slice(1)) { other.currentStock = 0; other.stockLots = []; other.assignedProductId = undefined; }
  const tally = (rain: number, hour: number, weekday: number) => {
    const counts = { walk: 0, motorbike: 0, car: 0 };
    for (let i = 0; i < 500; i++) {
      const manager = new CustomerManager([], i, 0);
      const customer = manager.maybeSpawnCustomer(1, true, sim.getFixtures(), map, 3 + (i % 7), i, { traffic: 1, weightOf: () => 1 }, null, rain, false, { hour, weekday });
      if (!customer) continue;
      counts[customer.arrivalMode!]++;
      if (customer.arrivalMode === 'car') assert.ok(customer.vehicleSpot && CAR_PARKING_SPOTS.some(s => s.x === customer.vehicleSpot!.x && s.y === customer.vehicleSpot!.y), 'Khách đi ô tô có chỗ đỗ ô tô');
      if (customer.arrivalMode === 'motorbike') assert.ok(customer.vehicleSpot && STREET_PARKING_SPOTS.some(s => s.x === customer.vehicleSpot!.x && s.y === customer.vehicleSpot!.y), 'Khách đi xe máy có chỗ đỗ xe máy');
      if (customer.arrivalMode === 'walk') assert.equal(customer.vehicleSpot, undefined, 'Khách đi bộ không có chỗ đỗ');
    }
    return counts;
  };
  const dry = tally(0, 15, 2), wet = tally(0.9, 15, 2), eveningWeekend = tally(0, 20, 5);
  assert.ok(wet.walk < dry.walk, `Mưa làm giảm khách đi bộ (${wet.walk} < ${dry.walk})`);
  assert.ok(wet.car > dry.car, `Mưa làm tăng khách đi ô tô (${wet.car} > ${dry.car})`);
  assert.ok(eveningWeekend.car > dry.car * 2, `Tối cuối tuần nhiều khách ô tô hơn hẳn (${eveningWeekend.car} vs ${dry.car})`);
  assert.deepEqual(tally(0.9, 15, 2), wet, 'Cùng đầu vào cho cùng phân bố');

  // Hai khách ô tô liên tiếp không dùng chung chỗ; hết chỗ thì đi bộ.
  const crowded = new CustomerManager([], 0, 0);
  const seen = new Set<string>();
  let carCount = 0;
  for (let i = 0; i < 40; i++) {
    const c = crowded.maybeSpawnCustomer(10, true, sim.getFixtures(), map, 3, i, { traffic: 1, weightOf: () => 1, maxConcurrentCustomers: 99 }, null, 1, false, { hour: 20, weekday: 5 });
    if (c?.arrivalMode === 'car') {
      carCount++;
      const key = `${c.vehicleSpot!.x},${c.vehicleSpot!.y}`;
      assert.ok(!seen.has(key), 'Hai khách đang ở tiệm không dùng chung một chỗ ô tô');
      seen.add(key);
    }
  }
  assert.ok(carCount > 0 && carCount <= CAR_PARKING_SPOTS.length, 'Số khách ô tô đồng thời không vượt số chỗ đỗ');
  console.log('  ✓ Passed: Phương thức đến theo giờ/thứ/mưa/chỗ đỗ và khách ô tô có chỗ đỗ riêng');
}
