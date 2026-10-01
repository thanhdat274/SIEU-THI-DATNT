import { StreetPedestrianState, StreetVehicleState, TILE_SIZE, TrafficSignalState, Vector2D } from '@game/shared';
import { CROSSWALK, MAP_WIDTH, STREET_PEDESTRIANS, STREET_VEHICLE_RULES, TRAFFIC_SIGNAL_CYCLE_SEC } from '@game/data';
import { Mulberry32Rng } from './staff';
import { pedestrianWalkSecondsLeft, trafficSignalAt } from './traffic-signal';

export const STREET_LANE_RIGHT_Y = 14.6 * TILE_SIZE; // 467px (làn bên phải, đi từ trái qua phải)
export const STREET_LANE_LEFT_Y = 13.4 * TILE_SIZE;  // 428px (làn bên trái, đi từ phải qua trái)

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
}

export class StreetTrafficManager {
  private vehicles: StreetVehicleState[] = [];
  private pedestrians: Pedestrian[] = [];
  private spawnCooldown = 4;
  private pedestrianCooldown = 7;
  private sidewalkPedestrianCooldown = 8;
  private vehicleSequence = 0;
  private pedestrianSequence = 0;
  private signalClock = 0;
  private readonly maxConcurrent = 4;

  constructor(initialVehicles: StreetVehicleState[] = []) {
    this.vehicles = [...initialVehicles];
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

  public getSignal(): TrafficSignalState {
    return trafficSignalAt(this.signalClock);
  }

  /** Đặt đồng hồ đèn (giây trong chu kỳ); dùng cho kiểm thử và để căn pha khi tải. */
  public setSignalClock(seconds: number): void {
    this.signalClock = ((seconds % TRAFFIC_SIGNAL_CYCLE_SEC) + TRAFFIC_SIGNAL_CYCLE_SEC) % TRAFFIC_SIGNAL_CYCLE_SEC;
  }

  /** Thêm người đi bộ (kiểm thử và dựng cảnh). */
  public addPedestrian(p: { id: string; direction: 'south' | 'north' | 'left' | 'right'; state?: 'waiting' | 'crossing' | 'walking'; activity?: 'stroll' | 'grocery' | 'jog' | 'student' | 'dog'; x: number; y?: number; variant?: number; speed?: number }): void {
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
    this.spawnCooldown = 4;
    this.pedestrianCooldown = 7;
    this.sidewalkPedestrianCooldown = 8;
    this.signalClock = 0;
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
      const half = this.halfLength(v);
      return v.position.x + half > crossLeft && v.position.x - half < crossRight;
    });
  }

  private stepPedestrians(dt: number): void {
    const defaultSpeed = STREET_PEDESTRIANS.speed;
    for (let i = this.pedestrians.length - 1; i >= 0; i--) {
      const p = this.pedestrians[i];
      if (p.direction === 'left' || p.direction === 'right') {
        const spd = p.speed ?? (p.activity === 'jog' ? 52 : defaultSpeed * 0.85);
        p.x += (p.direction === 'right' ? 1 : -1) * spd * dt;
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

  private desiredSpeed(v: StreetVehicleState, index: number): number {
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
    const signal = this.getSignal();
    const mustStop = signal.vehicle !== 'green' || this.anyPedestrianCrossing();
    const enteredCrosswalk = sign > 0 ? front > crossLeft : front < crossRight;
    if (mustStop) {
      if (!enteredCrosswalk) {
        const brake = (current * current) / (2 * decel);
        const committed = signal.vehicle === 'yellow' && !this.anyPedestrianCrossing() && current >= v.speed - 1 && distance < brake * 0.6;
        if (!committed) desired = Math.min(desired, Math.sqrt(2 * decel * Math.max(0, distance)));
      } else if (this.anyPedestrianCrossing()) {
        desired = 0;
      }
    }

    for (let j = 0; j < this.vehicles.length; j++) {
      if (j === index) continue;
      const other = this.vehicles[j];
      if (other.direction !== v.direction) continue;
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
    const order = this.vehicles.map((_, i) => i).sort((a, b) => {
      const va = this.vehicles[a], vb = this.vehicles[b];
      if (va.direction !== vb.direction) return 0;
      return va.direction === 'right' ? vb.position.x - va.position.x : va.position.x - vb.position.x;
    });
    for (const i of order) {
      const v = this.vehicles[i];
      const desired = this.desiredSpeed(v, i);
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
    for (let i = this.vehicles.length - 1; i >= 0; i--) {
      const v = this.vehicles[i];
      const outOfBounds =
        (v.direction === 'right' && v.position.x > MAP_WIDTH * TILE_SIZE + 60) ||
        (v.direction === 'left' && v.position.x < -60);
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
      if (awake && rainIntensity <= 0.6 && crossingCount < STREET_PEDESTRIANS.maxConcurrent) {
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
      if (awake && rainIntensity <= 0.7 && sidewalkCount < 3) {
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

  public update(dt: number, hour: number, rainIntensity = 0, seedNumber = 12345): void {
    let remaining = dt;
    while (remaining > 1e-9) {
      const step = Math.min(MAX_STEP, remaining);
      remaining -= step;
      this.signalClock = (this.signalClock + step) % TRAFFIC_SIGNAL_CYCLE_SEC;
      this.stepPedestrians(step);
      this.stepVehicles(step);
    }

    this.spawnPedestrian(dt, hour, rainIntensity, seedNumber);

    if (this.vehicles.length >= this.maxConcurrent) return;

    this.spawnCooldown -= dt;
    if (this.spawnCooldown > 0) return;

    const isRushHour = (hour >= 7 && hour <= 8) || (hour >= 17 && hour <= 19);
    const isNight = hour >= 22 || hour <= 4;
    const baseCooldown = isRushHour ? 3.5 : isNight ? 16 : 6.5;
    const rainFactor = 1 + rainIntensity * 1.0;

    const rng = new Mulberry32Rng(seedNumber + this.vehicleSequence * 101);
    this.spawnCooldown = (baseCooldown + rng.next() * 5) * rainFactor;

    this.vehicleSequence++;
    const roll = rng.next();
    let type: 'motorbike' | 'bicycle' | 'car' | 'minibus' = 'motorbike';
    if (roll < 0.35) {
      type = 'motorbike';
    } else if (roll < 0.55) {
      type = 'bicycle';
    } else if (roll < 0.72) {
      type = 'car';
    } else {
      type = 'minibus';
    }

    const direction: 'left' | 'right' = rng.next() < 0.5 ? 'right' : 'left';
    let variant = Math.floor(rng.next() * 3);
    if (type === 'minibus') {
      variant = Math.floor(rng.next() * 4); // 4 kiểu dáng xe buýt / xe khách theo đúng thiết kế
    }

    let speedBase = 80;
    if (type === 'motorbike') speedBase = 85;
    else if (type === 'bicycle') speedBase = 50;
    else if (type === 'car') speedBase = 75;
    else if (type === 'minibus') speedBase = 65;

    const speedVariation = (rng.next() - 0.5) * 16;
    const speed = Math.max(40, (speedBase + speedVariation) * (1 - rainIntensity * 0.25));

    const startX = direction === 'right' ? -52 : MAP_WIDTH * TILE_SIZE + 52;
    const blocked = this.vehicles.some((other) => other.direction === direction && Math.abs(other.position.x - startX) < 100);
    const signal = this.getSignal();
    const cantEnterLeft = direction === 'right' && (signal.vehicle !== 'green' || this.anyPedestrianCrossing());
    if (blocked || cantEnterLeft) {
      this.spawnCooldown = 1.0;
      return;
    }
    const posY = direction === 'right' ? STREET_LANE_RIGHT_Y : STREET_LANE_LEFT_Y;

    this.vehicles.push({
      id: `traffic-${seedNumber}-${this.vehicleSequence}`,
      type,
      variant,
      direction,
      position: { x: startX, y: posY },
      speed,
      hornTimer: type !== 'bicycle' && rng.next() < 0.3 ? 2.5 : 0,
    });
  }
}
