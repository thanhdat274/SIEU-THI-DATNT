import { StreetPedestrianState, StreetVehicleState, TILE_SIZE, TrafficSignalState, Vector2D } from '@game/shared';
import { CROSSWALK, MAP_WIDTH, ROAD_MAP, roadLaneY, shelterZoneAt, STREET_PEDESTRIANS, STREET_VEHICLE_RULES, TRAFFIC_ROADS, TRAFFIC_SIGNAL_CYCLE_SEC, TRAFFIC_X_RANGE, TRUCK_KINDS, CAR_VARIANTS, VEHICLE_BUDGET, trafficDensity, trafficRainSpeedFactor, vehicleMix, type RoadDef, type StreetVehicleKind } from '@game/data';
import { Mulberry32Rng } from './staff';
import { hashSeed } from './weather';
import { rainSpeedMultiplier } from './rain-protection';
import { newShelterSeek, stepShelterSeek, type ShelterSeek } from './shelter-seek';
import { pedestrianWalkSecondsLeft, trafficSignalAt } from './traffic-signal';

export const STREET_LANE_RIGHT_Y = 14.6 * TILE_SIZE; // 467px (làn bên phải, đi từ trái qua phải)
export const STREET_LANE_LEFT_Y = 13.4 * TILE_SIZE;  // 428px (làn bên trái, đi từ phải qua trái)

/** Thời gian mô phỏng (giây) chạy trước khi bắt đầu để đường không trống rỗng lúc mở game (xe sinh ở rìa khu phố, cách xa). */
const WARM_UP_SECONDS = 70;
/** Thông tin thời gian cho mật độ giao thông; thiếu thì coi là phút 0, ngày thường. */
export interface TrafficClockContext { minute?: number; weekday?: number }

/** Bước con tối đa (giây) khi tích phân chuyển động, để một lần update dt lớn vẫn dừng đúng vạch. */
const MAX_STEP = 0.1;
const CROSS_DISTANCE = STREET_PEDESTRIANS.southCurbY - STREET_PEDESTRIANS.northCurbY;
const CROSS_SECONDS = CROSS_DISTANCE / STREET_PEDESTRIANS.speed;

interface Pedestrian {
  id: string;
  variant: number;
  direction: 'south' | 'north' | 'left' | 'right';
  state: 'waiting' | 'crossing' | 'walking';
  activity?: 'stroll' | 'grocery' | 'jog' | 'student' | 'dog';
  x: number;
  y: number;
  speed?: number;
  /** Khách ghé quầy vỉa hè: dừng ở x này một lúc rồi đi tiếp (chỉ hiển thị, không đổi doanh thu quầy). */
  stopX?: number;
  pauseLeft?: number;
  stopped?: boolean;
  /** Trạng thái trú mưa của người đi bộ vỉa hè. */
  shelter?: ShelterSeek;
  /** Hướng đi ban đầu, để đi tiếp đúng chiều sau khi trú xong. */
  heading?: 'left' | 'right';
}

export class StreetTrafficManager {
  private vehicles: StreetVehicleState[] = [];
  private pedestrians: Pedestrian[] = [];
  /** Hạn chờ sinh xe tiếp theo của từng đường (giây). */
  private spawnCooldowns: Record<string, number> = {};
  private pedestrianCooldown = 7;
  private sidewalkPedestrianCooldown = 8;
  private stallVisitorCooldown = 6;
  private stallStops: number[] = [];
  private stallVisitsCompleted = 0;
  private vehicleSequence = 0;
  private pedestrianSequence = 0;
  private signalClock = 0;
  /** Cường độ mưa của nhịp cập nhật hiện tại (cho hành vi trú mưa). */
  private rain = 0;
  /** Vạch qua đường ngoài vạch có đèn (NPC nền khu phố đang chờ/qua đường): xe chưa vào vạch phải dừng nhường. */
  private externalCrossings: ReadonlyArray<{ roadId: string; x0: number; x1: number }> = [];
  /** Hệ số ngân sách xe theo chất lượng đồ họa (0..1); không đổi hành vi, chỉ giới hạn số xe cùng lúc. */
  private budgetScale = 1;

  constructor(initialVehicles: StreetVehicleState[] = []) {
    this.vehicles = [...initialVehicles];
  }

  public setExternalCrossings(crossings: ReadonlyArray<{ roadId: string; x0: number; x1: number }>): void {
    this.externalCrossings = crossings;
  }

  /** Số xe tối đa cùng lúc (chất lượng thấp ít xe hơn, nhưng luôn đủ để đường không trống). */
  public setBudgetScale(scale: number): void {
    this.budgetScale = Number.isFinite(scale) ? Math.max(0.2, Math.min(1, scale)) : 1;
  }

  public getVehicleBudget(): number {
    return Math.max(4, Math.round(VEHICLE_BUDGET * this.budgetScale));
  }

  /** Chạy trước vài chục giây mô phỏng để đường đã có xe khi bắt đầu (xe sinh ở rìa khu phố rộng). Gọi một lần sau khi tạo. */
  public warmUp(hour: number, rainIntensity = 0, seedNumber = 12345, ctx: TrafficClockContext = {}): void {
    for (let t = 0; t < WARM_UP_SECONDS; t += 0.5) this.update(0.5, hour, rainIntensity, seedNumber, ctx);
    this.pedestrians = [];
  }

  public getVehicles(): StreetVehicleState[] {
    return this.vehicles.map((v) => ({
      ...v,
      position: { ...v.position },
    }));
  }

  public getPedestrians(): StreetPedestrianState[] {
    return this.pedestrians.map((p) => ({
      id: p.id,
      variant: p.variant,
      direction: p.direction,
      state: p.state,
      activity: p.activity,
      position: { x: p.x, y: p.y },
    }));
  }

  /** Tọa độ x (px) giữa các quầy vỉa hè đang mở; rỗng thì không có khách ghé quầy. */
  public setStallStops(xs: number[]): void {
    this.stallStops = [...xs];
  }

  /** Số lượt khách ghé quầy đã dừng xong (dùng cho kiểm thử). */
  public getStallVisitsCompleted(): number {
    return this.stallVisitsCompleted;
  }

  public getSignal(): TrafficSignalState {
    return trafficSignalAt(this.signalClock);
  }

  /** Đặt đồng hồ đèn (giây trong chu kỳ); dùng cho kiểm thử và để căn pha khi tải. */
  public setSignalClock(seconds: number): void {
    this.signalClock = ((seconds % TRAFFIC_SIGNAL_CYCLE_SEC) + TRAFFIC_SIGNAL_CYCLE_SEC) % TRAFFIC_SIGNAL_CYCLE_SEC;
  }

  /** Thêm người đi bộ (kiểm thử và dựng cảnh). */
  public addPedestrian(p: { stopX?: number; pauseSec?: number; id: string; direction: 'south' | 'north' | 'left' | 'right'; state?: 'waiting' | 'crossing' | 'walking'; activity?: 'stroll' | 'grocery' | 'jog' | 'student' | 'dog'; x: number; y?: number; variant?: number; speed?: number }): void {
    const isSidewalk = p.direction === 'left' || p.direction === 'right';
    const defY = isSidewalk ? (p.y ?? 11.8 * TILE_SIZE) : (p.direction === 'south' ? STREET_PEDESTRIANS.northCurbY : STREET_PEDESTRIANS.southCurbY);
    this.pedestrians.push({
      id: p.id,
      variant: p.variant ?? 0,
      direction: p.direction,
      state: p.state ?? (isSidewalk ? 'walking' : 'waiting'),
      activity: p.activity,
      x: p.x,
      y: p.y ?? defY,
      speed: p.speed,
      ...(p.stopX !== undefined ? { stopX: p.stopX, pauseLeft: p.pauseSec ?? 4 } : {}),
    });
  }

  /** Chuyển khách mua sắm xong lên xe và lái xe rời tiệm, hòa vào dòng giao thông. */
  public addDepartingVehicle(spot: Vector2D, type: 'motorbike' | 'car', variant: number): void {
    this.vehicleSequence++;
    const direction: 'left' | 'right' = spot.x > (MAP_WIDTH * TILE_SIZE * 0.75) ? 'left' : 'right';
    this.vehicles.push({
      id: `departing-${this.vehicleSequence}`,
      type,
      variant,
      direction,
      position: { x: spot.x, y: spot.y },
      speed: type === 'motorbike' ? 82 : 72,
      currentSpeed: 28,
      isDeparting: true,
    });
  }

  public reset(): void {
    this.vehicles = [];
    this.pedestrians = [];
    this.spawnCooldowns = {};
    this.pedestrianCooldown = 7;
    this.sidewalkPedestrianCooldown = 8;
    this.stallVisitorCooldown = 6;
    this.stallVisitsCompleted = 0;
    this.signalClock = 0;
  }

  /** Đường của xe (mặc định đường chính). */
  private roadOf(v: StreetVehicleState): RoadDef {
    return ROAD_MAP[v.roadId ?? 'main'] ?? ROAD_MAP.main;
  }

  private halfLength(v: StreetVehicleState): number {
    return STREET_VEHICLE_RULES.halfLength[v.type] ?? 24;
  }

  private anyPedestrianCrossing(): boolean {
    return this.pedestrians.some((p) => p.state === 'crossing');
  }

  private anyVehicleInCrosswalk(): boolean {
    const crossLeft = CROSSWALK.tileX * TILE_SIZE;
    const crossRight = (CROSSWALK.tileX + CROSSWALK.widthTiles) * TILE_SIZE;
    return this.vehicles.some((v) => {
      if (!this.roadOf(v).signal) return false; // xe trên đường khác không qua vạch này
      const half = this.halfLength(v);
      return v.position.x + half > crossLeft && v.position.x - half < crossRight;
    });
  }

  private stepPedestrians(dt: number): void {
    const defaultSpeed = STREET_PEDESTRIANS.speed;
    for (let i = this.pedestrians.length - 1; i >= 0; i--) {
      const p = this.pedestrians[i];
      if (p.direction === 'left' || p.direction === 'right') {
        // Trú mưa: chỉ người đi vỉa hè không đang ghé quầy; đi tới mái hiên gần, đứng chờ, rồi đi tiếp đúng chiều cũ.
        const atStall = p.stopX !== undefined && !p.stopped;
        const sh = (p.shelter ??= newShelterSeek((hashSeed(p.id) % 1000) / 1000));
        p.heading ??= p.direction;
        const act = stepShelterSeek(sh, p.x, this.rain, dt, !atStall && p.state === 'walking', p.speed ?? defaultSpeed * 0.85);
        if (act.action === 'seek' && act.targetX !== undefined) p.direction = act.targetX > p.x ? 'right' : 'left';
        else if (act.action === 'arrived' && act.targetX !== undefined) { p.x = this.freeStandingX(p, act.targetX); sh.targetX = p.x; p.state = 'waiting'; }
        else if (act.action === 'leave') { p.direction = p.heading; p.state = 'walking'; }
        if (sh.phase === 'sheltered') { p.state = 'waiting'; continue; }
        if (p.state === 'waiting') {
          p.pauseLeft = (p.pauseLeft ?? 0) - dt;
          if (p.pauseLeft <= 0) {
            p.state = 'walking';
            p.stopped = true;
            this.stallVisitsCompleted++;
          }
          continue;
        }
        const spd = p.speed ?? (p.activity === 'jog' ? 52 : defaultSpeed * 0.85);
        const dir = p.direction === 'right' ? 1 : -1;
        const before = p.x;
        p.x += dir * spd * dt;
        if (p.stopX !== undefined && !p.stopped && (p.x - p.stopX) * dir >= 0 && (before - p.stopX) * dir < 0) {
          p.x = p.stopX;
          p.state = 'waiting';
        }
        if (p.x < -40 || p.x > MAP_WIDTH * TILE_SIZE + 40) {
          this.pedestrians.splice(i, 1);
        }
        continue;
      }

      if (p.state === 'waiting') {
        if (this.getSignal().pedestrian === 'walk' && pedestrianWalkSecondsLeft(this.signalClock) >= CROSS_SECONDS + 0.5 && !this.anyVehicleInCrosswalk()) {
          p.state = 'crossing';
        }
        continue;
      }
      const targetY = p.direction === 'south' ? STREET_PEDESTRIANS.southCurbY : STREET_PEDESTRIANS.northCurbY;
      const step = defaultSpeed * dt;
      const remaining = targetY - p.y;
      if (Math.abs(remaining) <= step) {
        this.pedestrians.splice(i, 1);
      } else {
        p.y += Math.sign(remaining) * step;
      }
    }
  }

  /** `lane`: chỉ số các xe cùng đường + cùng hướng (chỉ những xe này có thể chắn đầu xe `v`). */
  private desiredSpeed(v: StreetVehicleState, index: number, lane: readonly number[], signal: TrafficSignalState, pedestrianCrossing: boolean): number {
    const sign = v.direction === 'right' ? 1 : -1;
    const half = this.halfLength(v);
    const front = v.position.x + sign * half;
    const current = v.currentSpeed ?? v.speed;
    const { decel, stopMarginPx, followGapPx } = STREET_VEHICLE_RULES;
    let desired = v.speed;

    const crossLeft = CROSSWALK.tileX * TILE_SIZE;
    const crossRight = (CROSSWALK.tileX + CROSSWALK.widthTiles) * TILE_SIZE;
    const stopFront = sign > 0 ? crossLeft - stopMarginPx : crossRight + stopMarginPx;
    const distance = sign > 0 ? stopFront - front : front - stopFront;
    const signalled = this.roadOf(v).signal;
    const mustStop = signalled && (signal.vehicle !== 'green' || pedestrianCrossing);
    const enteredCrosswalk = sign > 0 ? front > crossLeft : front < crossRight;
    const passedCrosswalk = sign > 0 ? front > crossRight : front < crossLeft;
    if (mustStop) {
      if (!enteredCrosswalk) {
        const brake = (current * current) / (2 * decel);
        const committed = signal.vehicle === 'yellow' && !pedestrianCrossing && current >= v.speed - 1 && distance < brake * 0.6;
        if (!committed) desired = Math.min(desired, Math.sqrt(2 * decel * Math.max(0, distance)));
      } else if (pedestrianCrossing && !passedCrosswalk) {
        desired = 0; // xe đã qua hẳn vạch thì cứ chạy, nếu không sẽ đứng giữa đường và kéo cả hàng phía sau
      }
    }

    for (const c of this.externalCrossings) {
      if ((v.roadId ?? 'main') !== c.roadId) continue;
      const entered = sign > 0 ? front > c.x0 : front < c.x1;
      if (entered) continue; // đã vào vạch thì chạy tiếp, nếu không sẽ đứng chắn giữa đường
      const stop = sign > 0 ? c.x0 - stopMarginPx : c.x1 + stopMarginPx;
      const gap = sign > 0 ? stop - front : front - stop;
      desired = Math.min(desired, Math.sqrt(2 * decel * Math.max(0, gap)));
    }

    for (const j of lane) {
      if (j === index) continue;
      const other = this.vehicles[j];
      const ahead = sign > 0 ? other.position.x > v.position.x : other.position.x < v.position.x;
      if (!ahead) continue;
      const otherRear = other.position.x - sign * this.halfLength(other);
      const gap = (sign > 0 ? otherRear - front : front - otherRear) - followGapPx;
      desired = Math.min(desired, Math.sqrt(2 * decel * Math.max(0, gap)));
    }
    return desired;
  }

  private stepVehicles(dt: number): void {
    const { accel } = STREET_VEHICLE_RULES;
    // Gom xe theo làn (đường + hướng), trong làn xe đi đầu cập nhật trước để xe sau thấy vị trí mới của xe trước.
    // Trước đây sắp cả mảng bằng hàm so sánh trả 0 khi khác làn: không bắc cầu nên thứ tự cập nhật phụ thuộc thuật toán sort.
    const lanes = new Map<string, number[]>();
    this.vehicles.forEach((v, i) => {
      const key = `${this.roadOf(v).id}|${v.direction}`;
      const lane = lanes.get(key);
      if (lane) lane.push(i); else lanes.set(key, [i]);
    });
    const signal = this.getSignal();
    const pedestrianCrossing = this.anyPedestrianCrossing();
    for (const key of [...lanes.keys()].sort()) {
      const lane = lanes.get(key)!;
      lane.sort((a, b) => {
        const va = this.vehicles[a], vb = this.vehicles[b];
        const ahead = va.direction === 'right' ? vb.position.x - va.position.x : va.position.x - vb.position.x;
        return ahead !== 0 ? ahead : a - b;
      });
      for (const i of lane) {
        const v = this.vehicles[i];
        const desired = this.desiredSpeed(v, i, lane, signal, pedestrianCrossing);
        const cruise = v.currentSpeed ?? v.speed;
        const next = Math.max(0, Math.min(cruise + accel * dt, desired));
        v.currentSpeed = next;
        v.position.x += (v.direction === 'right' ? 1 : -1) * next * dt;

        if (v.isDeparting) {
          const targetLaneY = v.direction === 'right' ? STREET_LANE_RIGHT_Y : STREET_LANE_LEFT_Y;
          const diffY = targetLaneY - v.position.y;
          if (Math.abs(diffY) > 1) {
            v.position.y += Math.sign(diffY) * Math.min(Math.abs(diffY), 26 * dt);
          } else {
            v.position.y = targetLaneY;
            v.isDeparting = false;
          }
        }

        if (v.hornTimer && v.hornTimer > 0) {
          v.hornTimer -= dt;
        }
      }
    }
    for (let i = this.vehicles.length - 1; i >= 0; i--) {
      const v = this.vehicles[i];
      const outOfBounds =
        (v.direction === 'right' && v.position.x > TRAFFIC_X_RANGE.max) ||
        (v.direction === 'left' && v.position.x < TRAFFIC_X_RANGE.min);
      if (outOfBounds) this.vehicles.splice(i, 1);
    }
  }

  private spawnPedestrian(dt: number, hour: number, rainIntensity: number, seedNumber: number): void {
    this.pedestrianCooldown -= dt;
    if (this.pedestrianCooldown <= 0) {
      const rng = new Mulberry32Rng(seedNumber + this.pedestrianSequence * 57 + 11);
      this.pedestrianCooldown = STREET_PEDESTRIANS.minCooldownSec + rng.next() * (STREET_PEDESTRIANS.maxCooldownSec - STREET_PEDESTRIANS.minCooldownSec);
      this.pedestrianSequence++;
      const awake = hour >= 5 && hour < 22;
      const crossingCount = this.pedestrians.filter(p => p.direction === 'south' || p.direction === 'north').length;
      if (awake && rainIntensity <= STREET_PEDESTRIANS.maxRainCrossing && crossingCount < STREET_PEDESTRIANS.maxConcurrent) {
        const direction: 'south' | 'north' = rng.next() < 0.5 ? 'south' : 'north';
        const left = CROSSWALK.tileX * TILE_SIZE + 10;
        const x = left + rng.next() * (CROSSWALK.widthTiles * TILE_SIZE - 20);
        this.addPedestrian({ id: `ped-${seedNumber}-${this.pedestrianSequence}`, direction, x, variant: Math.floor(rng.next() * 5) });
      }
    }

    this.sidewalkPedestrianCooldown -= dt;
    if (this.sidewalkPedestrianCooldown <= 0) {
      const rng2 = new Mulberry32Rng(seedNumber + this.pedestrianSequence * 79 + 33);
      this.sidewalkPedestrianCooldown = 10 + rng2.next() * 15;
      const awake = hour >= 6 && hour < 21;
      const sidewalkCount = this.pedestrians.filter(p => p.direction === 'left' || p.direction === 'right').length;
      if (awake && rainIntensity <= STREET_PEDESTRIANS.maxRainSidewalk && sidewalkCount < 3) {
        this.pedestrianSequence++;
        const dir: 'left' | 'right' = rng2.next() < 0.5 ? 'right' : 'left';
        const startX = dir === 'right' ? -20 : MAP_WIDTH * TILE_SIZE + 20;
        const sidewalkY = (11.6 + rng2.next() * 0.6) * TILE_SIZE;
        const acts: Array<'stroll' | 'grocery' | 'jog' | 'student' | 'dog'> = ['stroll', 'grocery', 'jog', 'student', 'dog'];
        const activity = acts[Math.floor(rng2.next() * acts.length)];
        this.addPedestrian({
          id: `side-ped-${seedNumber}-${this.pedestrianSequence}`,
          direction: dir,
          state: 'walking',
          activity,
          x: startX,
          y: sidewalkY,
          variant: Math.floor(rng2.next() * 5),
          speed: activity === 'jog' ? 50 : 28 + rng2.next() * 8,
        });
      }
    }
  }

  private spawnStallVisitor(dt: number, hour: number, rainIntensity: number, seedNumber: number): void {
    if (!this.stallStops.length) return;
    this.stallVisitorCooldown -= dt;
    if (this.stallVisitorCooldown > 0) return;
    const rng = new Mulberry32Rng(seedNumber + this.pedestrianSequence * 131 + 71);
    // Càng nhiều quầy mở, khách ghé càng dày.
    this.stallVisitorCooldown = (14 - Math.min(this.stallStops.length, 3) * 3) + rng.next() * 8;
    this.pedestrianSequence++;
    const active = this.pedestrians.filter(p => p.stopX !== undefined).length;
    if (hour < 6 || hour >= 21 || rainIntensity > STREET_PEDESTRIANS.maxRainStallVisit || active >= 3) return;
    const dir: 'left' | 'right' = rng.next() < 0.5 ? 'right' : 'left';
    const stopX = this.stallStops[Math.floor(rng.next() * this.stallStops.length)];
    this.addPedestrian({
      id: `stall-ped-${seedNumber}-${this.pedestrianSequence}`,
      direction: dir,
      state: 'walking',
      activity: 'stroll',
      x: dir === 'right' ? -20 : MAP_WIDTH * TILE_SIZE + 20,
      y: (11.7 + rng.next() * 0.3) * TILE_SIZE,
      variant: Math.floor(rng.next() * 5),
      speed: 28 + rng.next() * 8,
      stopX,
      pauseSec: 3 + rng.next() * 3,
    });
  }

  /**
   * Chọn điểm đứng gần `x` trong khu trú sao cho cách người đã trú gần nhất ít nhất 12 px (cùng làn); khi mái đã đông thì lấy điểm
   * thoáng nhất còn lại, không bao giờ để hai người đứng cùng một điểm nếu còn chỗ.
   */
  private freeStandingX(self: Pedestrian, x: number): number {
    const zone = shelterZoneAt(x, self.y);
    const lo = (zone?.x0 ?? x) + 10;
    const hi = (zone?.x1 ?? x) - 10;
    const others = this.pedestrians.filter((o) => o !== self && o.shelter?.phase === 'sheltered' && Math.abs(o.y - self.y) < 8);
    const gapAt = (cx: number) => others.reduce((m, o) => Math.min(m, Math.abs(o.x - cx)), Infinity);
    let best = Math.max(lo, Math.min(hi, x));
    let bestGap = gapAt(best);
    if (bestGap >= 12) return best;
    for (let cx = lo; cx <= hi; cx += 3) {
      const g = gapAt(cx);
      // Đủ thoáng thì lấy điểm gần x nhất; còn không thì giữ điểm thoáng nhất.
      if (g > bestGap + 0.5 || (g >= 12 && Math.abs(cx - x) < Math.abs(best - x))) { best = cx; bestGap = g; }
    }
    return best;
  }

  public update(dt: number, hour: number, rainIntensity = 0, seedNumber = 12345, ctx: TrafficClockContext = {}): void {
    this.rain = rainIntensity;
    let remaining = dt;
    while (remaining > 1e-9) {
      const step = Math.min(MAX_STEP, remaining);
      remaining -= step;
      this.signalClock = (this.signalClock + step) % TRAFFIC_SIGNAL_CYCLE_SEC;
      this.stepPedestrians(step * rainSpeedMultiplier(rainIntensity));
      this.stepVehicles(step);
    }

    this.spawnPedestrian(dt, hour, rainIntensity, seedNumber);
    this.spawnStallVisitor(dt, hour, rainIntensity, seedNumber);

    for (const road of TRAFFIC_ROADS) this.spawnOnRoad(road, dt, hour, rainIntensity, seedNumber, ctx);
  }

  /**
   * Sinh xe trên một đường: nhịp sinh tỉ lệ nghịch với mật độ (giờ × thứ × thời tiết × loại đường), loại xe theo giờ.
   * Xe luôn xuất hiện ở rìa khu phố trên đúng làn của đường, không sinh giữa đường; ngân sách xe giới hạn tổng số.
   */
  private spawnOnRoad(road: RoadDef, dt: number, hour: number, rainIntensity: number, seedNumber: number, ctx: TrafficClockContext): void {
    const density = trafficDensity(hour, ctx.minute ?? 0, ctx.weekday ?? 2, rainIntensity, road);
    const rng = new Mulberry32Rng(seedNumber + this.vehicleSequence * 101 + TRAFFIC_ROADS.indexOf(road) * 977);
    // Lần đầu: hẹn xe đầu tiên theo đúng mật độ giờ đó (đêm thì phải chờ lâu, giờ cao điểm vài giây).
    const left = (this.spawnCooldowns[road.id] ?? ((4.5 + rng.next() * 2) / Math.max(density, 0.008) * (road.id === 'main' ? 0.5 : 1))) - dt;
    this.spawnCooldowns[road.id] = left;
    if (left > 0) return;

    // Mật độ 1 → trung bình ~5,5 s một xe trên đường; 0,015 (đêm) → vài phút mới có xe.
    this.spawnCooldowns[road.id] = (4.5 + rng.next() * 2) / Math.max(density, 0.008);
    if (this.vehicles.length >= this.getVehicleBudget()) { this.spawnCooldowns[road.id] = 1; return; }

    this.vehicleSequence++;
    const mix = vehicleMix(hour, road.kind, rainIntensity);
    const kinds = Object.keys(mix) as StreetVehicleKind[];
    const total = kinds.reduce((sum, k) => sum + mix[k], 0);
    let pick = rng.next() * total;
    let type: StreetVehicleKind = 'motorbike';
    for (const k of kinds) { pick -= mix[k]; if (pick <= 0) { type = k; break; } }

    const direction: 'left' | 'right' = rng.next() < 0.5 ? 'right' : 'left';
    let variant = Math.floor(rng.next() * 3);
    if (type === 'minibus') variant = Math.floor(rng.next() * 4); // 4 kiểu dáng xe buýt / xe khách theo đúng thiết kế
    else if (type === 'truck') variant = Math.floor(rng.next() * TRUCK_KINDS.length);
    else if (type === 'car') variant = Math.floor(rng.next() * CAR_VARIANTS);

    const speedBase = { motorbike: 85, bicycle: 50, car: 75, minibus: 65, truck: 62 }[type];
    const speedVariation = (rng.next() - 0.5) * 16;
    const speed = Math.max(34, (speedBase + speedVariation) * road.speedMul * trafficRainSpeedFactor(rainIntensity));

    const startX = direction === 'right' ? TRAFFIC_X_RANGE.min + 40 : TRAFFIC_X_RANGE.max - 40;
    const blocked = this.vehicles.some((other) => other.direction === direction && this.roadOf(other) === road && Math.abs(other.position.x - startX) < 140);
    if (blocked) { this.spawnCooldowns[road.id] = 1.0; return; }

    this.vehicles.push({
      id: `traffic-${seedNumber}-${this.vehicleSequence}`,
      type,
      variant,
      direction,
      roadId: road.id,
      position: { x: startX, y: roadLaneY(road, direction) },
      speed,
      hornTimer: type !== 'bicycle' && rng.next() < 0.3 ? 2.5 : 0,
    });
  }
}
