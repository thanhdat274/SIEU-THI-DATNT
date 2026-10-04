import { StreetPedestrianState, StreetVehicleState, TILE_SIZE, Vector2D } from '@game/shared';
import { INTERSECTIONS, MAP_WIDTH, ROAD_MAP, roadLaneCoord, shelterZoneAt, STREET_PEDESTRIANS, STREET_VEHICLE_RULES, VEHICLE_ROADS, VEHICLE_ROAD_MAP, TRAFFIC_SIGNAL_CYCLE_SEC, TRAFFIC_X_RANGE, TRUCK_KINDS, CAR_VARIANTS, VEHICLE_BUDGET, trafficDensity, trafficRainSpeedFactor, vehicleMix, type IntersectionDef, type RoadDef, type StreetVehicleKind } from '@game/data';
import { Mulberry32Rng } from './staff';
import { hashSeed } from './weather';
import { rainSpeedMultiplier } from './rain-protection';
import { newShelterSeek, stepShelterSeek, type ShelterSeek } from './shelter-seek';
import { intersectionSignalsAt, type IntersectionSignals } from './traffic-signal';

export const STREET_LANE_RIGHT_Y = 14.6 * TILE_SIZE; // 467px (làn bên phải, đi từ trái qua phải)
export const STREET_LANE_LEFT_Y = 13.4 * TILE_SIZE;  // 428px (làn bên trái, đi từ phải qua trái)

/** Thời gian mô phỏng (giây) chạy trước khi bắt đầu để đường không trống rỗng lúc mở game (xe sinh ở rìa khu phố, cách xa). */
const WARM_UP_SECONDS = 70;
/** Thông tin thời gian cho mật độ giao thông; thiếu thì coi là phút 0, ngày thường. */
export interface TrafficClockContext { minute?: number; weekday?: number }

/** Bước con tối đa (giây) khi tích phân chuyển động, để một lần update dt lớn vẫn dừng đúng vạch. */
const MAX_STEP = 0.1;
/** Nửa bề rộng vùng xe phải nhường quanh nhân vật người chơi (px). */
const PLAYER_YIELD_HALF = 24;

/** Người đi bộ nền trên vỉa hè (không còn vạch qua đường riêng trước tiệm: người qua đường dùng vạch ở các ngã tư). */
interface Pedestrian {
  id: string;
  variant: number;
  direction: 'left' | 'right';
  state: 'waiting' | 'walking';
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
  /** Vị trí chân nhân vật người chơi (px thế giới) để xe nhường khi người chơi ở trên lòng đường. */
  private playerPosition: Vector2D | null = null;
  private externalCrossings: ReadonlyArray<{ roadId: string; x0: number; x1: number }> = [];
  /** Hệ số ngân sách xe theo chất lượng đồ họa (0..1); không đổi hành vi, chỉ giới hạn số xe cùng lúc. */
  private budgetScale = 1;

  constructor(initialVehicles: StreetVehicleState[] = []) {
    this.vehicles = [...initialVehicles];
  }

  public setPlayerPosition(position: Vector2D | null): void {
    this.playerPosition = position;
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

  /** Đèn hiện tại của từng ngã tư đường dọc (id trong `INTERSECTIONS`), cho renderer vẽ đèn. */
  public getIntersectionSignals(): Array<{ id: string; signals: IntersectionSignals }> {
    return INTERSECTIONS.map((x) => ({ id: x.id, signals: intersectionSignalsAt(this.signalClock + x.signalOffsetSec) }));
  }

  /** Đặt đồng hồ đèn (giây trong chu kỳ); dùng cho kiểm thử và để căn pha khi tải. */
  public setSignalClock(seconds: number): void {
    this.signalClock = ((seconds % TRAFFIC_SIGNAL_CYCLE_SEC) + TRAFFIC_SIGNAL_CYCLE_SEC) % TRAFFIC_SIGNAL_CYCLE_SEC;
  }

  /** Thêm người đi bộ (kiểm thử và dựng cảnh). */
  public addPedestrian(p: { stopX?: number; pauseSec?: number; id: string; direction: 'left' | 'right'; state?: 'waiting' | 'walking'; activity?: 'stroll' | 'grocery' | 'jog' | 'student' | 'dog'; x: number; y?: number; variant?: number; speed?: number }): void {
    this.pedestrians.push({
      id: p.id,
      variant: p.variant ?? 0,
      direction: p.direction,
      state: p.state ?? 'walking',
      activity: p.activity,
      x: p.x,
      y: p.y ?? 11.8 * TILE_SIZE,
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
    this.sidewalkPedestrianCooldown = 8;
    this.stallVisitorCooldown = 6;
    this.stallVisitsCompleted = 0;
    this.signalClock = 0;
  }

  /** Đường của xe (mặc định đường chính). */
  private roadOf(v: StreetVehicleState): RoadDef {
    return VEHICLE_ROAD_MAP[v.roadId ?? 'main'] ?? ROAD_MAP.main;
  }

  /** Nửa chiều dài xe theo trục chạy (xe đường dọc nhìn trước/sau nên ngắn hơn). */
  private halfLength(v: StreetVehicleState): number {
    return (v.axis === 'y' ? STREET_VEHICLE_RULES.halfLengthY[v.type] : STREET_VEHICLE_RULES.halfLength[v.type]) ?? 24;
  }

  /** Tọa độ của xe trên trục chạy (x với đường ngang, y với đường dọc). */
  private along(v: StreetVehicleState): number {
    return v.axis === 'y' ? v.position.y : v.position.x;
  }

  /** Xe `o` (khác trục với `ix`) đã vào hộp giao lộ (kể cả hàng vỉa hè hai bên) nên xe đường kia chưa được vào. */
  private occupiesConflictZone(o: StreetVehicleState, ix: IntersectionDef): boolean {
    const half = this.halfLength(o);
    const p = this.along(o);
    return o.axis === 'y'
      ? o.roadId === ix.avenueRoadId && p + half > ix.crossTop && p - half < ix.crossBottom
      : (o.roadId ?? 'main') === ix.roadId && p + half > ix.crossLeft && p - half < ix.crossRight;
  }

  private stepPedestrians(dt: number): void {
    const defaultSpeed = STREET_PEDESTRIANS.speed;
    for (let i = this.pedestrians.length - 1; i >= 0; i--) {
      const p = this.pedestrians[i];
      {
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
      }
    }
  }

  /** `lane`: chỉ số các xe cùng đường + cùng hướng (chỉ những xe này có thể chắn đầu xe `v`). */
  private desiredSpeed(v: StreetVehicleState, index: number, lane: readonly number[]): number {
    const sign = v.direction === 'right' ? 1 : -1;
    const half = this.halfLength(v);
    const pos = this.along(v);
    const front = pos + sign * half;
    const current = v.currentSpeed ?? v.speed;
    const { decel, stopMarginPx, followGapPx } = STREET_VEHICLE_RULES;
    let desired = v.speed;

    // Ngã tư: xe dừng trước vạch dừng khi đèn đỏ/vàng, hoặc khi xe đường kia còn đang đè lên vùng xung đột; đã vào hộp giao lộ
    // thì chạy tiếp cho thoáng. Xe đường ngang theo đèn `main`, xe đường dọc theo đèn `avenue`.
    const vertical = v.axis === 'y';
    for (const x of INTERSECTIONS) {
      if (vertical ? x.avenueRoadId !== v.roadId : x.roadId !== (v.roadId ?? 'main')) continue;
      const lo = vertical ? x.crossTop : x.crossLeft;
      const hi = vertical ? x.crossBottom : x.crossRight;
      const entered = sign > 0 ? front > lo : front < hi;
      if (entered) continue;
      const signals = intersectionSignalsAt(this.signalClock + x.signalOffsetSec);
      const lamp = vertical ? signals.avenue : signals.main;
      const stop = sign > 0 ? lo - stopMarginPx : hi + stopMarginPx;
      const gap = Math.max(0, sign > 0 ? stop - front : front - stop);
      const brake = (current * current) / (2 * decel);
      // Vàng mà đã quá gần vạch để phanh kịp thì chạy luôn, tránh phanh gấp giữa ngã tư.
      const committed = lamp.vehicle === 'yellow' && current >= v.speed - 1 && gap < brake * 0.6;
      const blocked = lamp.vehicle !== 'green' ? !committed : this.vehicles.some((o) => o !== v && (o.axis === 'y') !== vertical && this.occupiesConflictZone(o, x));
      if (blocked) desired = Math.min(desired, Math.sqrt(2 * decel * gap));
    }

    // Nhân vật người chơi đang ở trên lòng đường thì xe chưa tới nhường như với người qua đường.
    const pp = this.playerPosition;
    if (pp) {
      const road = this.roadOf(v);
      const across = vertical ? pp.x : pp.y;
      const lo = road.topRow * TILE_SIZE, hi = lo + (vertical ? 3 : 3) * TILE_SIZE;
      if (across >= lo - 6 && across <= hi + 6) {
        const at = vertical ? pp.y : pp.x;
        if (!(sign > 0 ? front > at - PLAYER_YIELD_HALF : front < at + PLAYER_YIELD_HALF)) {
          const stop = sign > 0 ? at - PLAYER_YIELD_HALF - stopMarginPx : at + PLAYER_YIELD_HALF + stopMarginPx;
          const gap = sign > 0 ? stop - front : front - stop;
          desired = Math.min(desired, Math.sqrt(2 * decel * Math.max(0, gap)));
        }
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
      const otherPos = this.along(other);
      const ahead = sign > 0 ? otherPos > pos : otherPos < pos;
      if (!ahead) continue;
      const otherRear = otherPos - sign * this.halfLength(other);
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
    for (const key of [...lanes.keys()].sort()) {
      const lane = lanes.get(key)!;
      lane.sort((a, b) => {
        const va = this.vehicles[a], vb = this.vehicles[b];
        const ahead = va.direction === 'right' ? this.along(vb) - this.along(va) : this.along(va) - this.along(vb);
        return ahead !== 0 ? ahead : a - b;
      });
      for (const i of lane) {
        const v = this.vehicles[i];
        const desired = this.desiredSpeed(v, i, lane);
        const cruise = v.currentSpeed ?? v.speed;
        const next = Math.max(0, Math.min(cruise + accel * dt, desired));
        v.currentSpeed = next;
        const travelled = (v.direction === 'right' ? 1 : -1) * next * dt;
        if (v.axis === 'y') v.position.y += travelled; else v.position.x += travelled;

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
      const span = v.axis === 'y' ? this.roadOf(v).span : undefined;
      const min = span?.min ?? TRAFFIC_X_RANGE.min, max = span?.max ?? TRAFFIC_X_RANGE.max;
      const p = this.along(v);
      const outOfBounds = (v.direction === 'right' && p > max) || (v.direction === 'left' && p < min);
      if (outOfBounds) this.vehicles.splice(i, 1);
    }
  }

  private spawnPedestrian(dt: number, hour: number, rainIntensity: number, seedNumber: number): void {
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

    for (const road of VEHICLE_ROADS) this.spawnOnRoad(road, dt, hour, rainIntensity, seedNumber, ctx);
  }

  /**
   * Sinh xe trên một đường: nhịp sinh tỉ lệ nghịch với mật độ (giờ × thứ × thời tiết × loại đường), loại xe theo giờ.
   * Xe luôn xuất hiện ở rìa khu phố trên đúng làn của đường, không sinh giữa đường; ngân sách xe giới hạn tổng số.
   */
  private spawnOnRoad(road: RoadDef, dt: number, hour: number, rainIntensity: number, seedNumber: number, ctx: TrafficClockContext): void {
    const density = trafficDensity(hour, ctx.minute ?? 0, ctx.weekday ?? 2, rainIntensity, road);
    const rng = new Mulberry32Rng(seedNumber + this.vehicleSequence * 101 + VEHICLE_ROADS.indexOf(road) * 977);
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

    const vertical = road.axis === 'y';
    const lo = road.span?.min ?? TRAFFIC_X_RANGE.min, hi = road.span?.max ?? TRAFFIC_X_RANGE.max;
    const start = direction === 'right' ? lo + 40 : hi - 40;
    const blocked = this.vehicles.some((other) => other.direction === direction && this.roadOf(other) === road && Math.abs(this.along(other) - start) < (vertical ? 90 : 140));
    if (blocked) { this.spawnCooldowns[road.id] = 1.0; return; }
    const lane = roadLaneCoord(road, direction);

    this.vehicles.push({
      id: `traffic-${seedNumber}-${this.vehicleSequence}`,
      type,
      variant,
      direction,
      roadId: road.id,
      ...(vertical ? { axis: 'y' as const } : {}),
      position: vertical ? { x: lane, y: start } : { x: start, y: lane },
      speed,
      hornTimer: type !== 'bicycle' && rng.next() < 0.3 ? 2.5 : 0,
    });
  }
}
