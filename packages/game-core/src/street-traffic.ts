import { StreetPedestrianState, StreetVehicleState, TILE_SIZE, TrafficSignalState } from '@game/shared';
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
  direction: 'south' | 'north';
  state: 'waiting' | 'crossing';
  x: number;
  y: number;
}

export class StreetTrafficManager {
  private vehicles: StreetVehicleState[] = [];
  private pedestrians: Pedestrian[] = [];
  private spawnCooldown = 5;
  private pedestrianCooldown = 8;
  private vehicleSequence = 0;
  private pedestrianSequence = 0;
  private signalClock = 0;
  private readonly maxConcurrent = 2;

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
  public addPedestrian(p: { id: string; direction: 'south' | 'north'; state?: 'waiting' | 'crossing'; x: number; variant?: number }): void {
    this.pedestrians.push({
      id: p.id,
      variant: p.variant ?? 0,
      direction: p.direction,
      state: p.state ?? 'waiting',
      x: p.x,
      y: p.direction === 'south' ? STREET_PEDESTRIANS.northCurbY : STREET_PEDESTRIANS.southCurbY,
    });
  }

  public reset(): void {
    this.vehicles = [];
    this.pedestrians = [];
    this.spawnCooldown = 5;
    this.pedestrianCooldown = 8;
    this.signalClock = 0;
  }

  private halfLength(v: StreetVehicleState): number {
    return STREET_VEHICLE_RULES.halfLength[v.type];
  }

  private anyPedestrianCrossing(): boolean {
    return this.pedestrians.some((p) => p.state === 'crossing');
  }

  private stepPedestrians(dt: number): void {
    const speed = STREET_PEDESTRIANS.speed;
    for (let i = this.pedestrians.length - 1; i >= 0; i--) {
      const p = this.pedestrians[i];
      if (p.state === 'waiting') {
        // Chỉ bắt đầu qua khi đèn đi bộ xanh và còn đủ thời gian đi hết đường.
        if (this.getSignal().pedestrian === 'walk' && pedestrianWalkSecondsLeft(this.signalClock) >= CROSS_SECONDS + 0.5) p.state = 'crossing';
        continue;
      }
      const targetY = p.direction === 'south' ? STREET_PEDESTRIANS.southCurbY : STREET_PEDESTRIANS.northCurbY;
      const step = speed * dt;
      const remaining = targetY - p.y;
      if (Math.abs(remaining) <= step) {
        this.pedestrians.splice(i, 1);
      } else {
        p.y += Math.sign(remaining) * step;
      }
    }
  }

  /** Tốc độ mong muốn của xe: dừng trước vạch khi đèn không xanh hoặc có người đang qua, và giữ khoảng cách với xe trước. */
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
    // Xe chỉ được coi là đã vào vạch khi đầu xe chạm mép vạch; vượt vạch dừng nhẹ (trong lề dừng) vẫn phải dừng hẳn.
    const enteredCrosswalk = sign > 0 ? front > crossLeft : front < crossRight;
    if (mustStop && !enteredCrosswalk) {
      // Xe đã quá gần để dừng êm (chỉ còn trong vùng phanh gấp) thì cứ đi, như vùng lưỡng lự lúc đèn vàng.
      const brake = (current * current) / (2 * decel);
      // Chỉ áp dụng cho xe còn chạy tốc độ thường; xe đã bắt đầu phanh thì tiếp tục dừng (không "đổi ý" giữa chừng).
      const committed = current >= v.speed - 1 && distance < brake * 0.6;
      if (!committed) desired = Math.min(desired, Math.sqrt(2 * decel * Math.max(0, distance)));
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
    // Xử lý xe đi đầu trước để xe sau thấy vị trí đã cập nhật.
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

      // Cập nhật timer còi nếu có
      if (v.hornTimer && v.hornTimer > 0) {
        v.hornTimer -= dt;
      }
    }
    // Kiểm tra xe đã chạy ra ngoài giới hạn bản đồ chưa
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
    if (this.pedestrianCooldown > 0) return;
    const rng = new Mulberry32Rng(seedNumber + this.pedestrianSequence * 57 + 11);
    this.pedestrianCooldown = STREET_PEDESTRIANS.minCooldownSec + rng.next() * (STREET_PEDESTRIANS.maxCooldownSec - STREET_PEDESTRIANS.minCooldownSec);
    this.pedestrianSequence++;
    const awake = hour >= 5 && hour < 22;
    if (!awake || rainIntensity > 0.6 || this.pedestrians.length >= STREET_PEDESTRIANS.maxConcurrent) return;
    const direction: 'south' | 'north' = rng.next() < 0.5 ? 'south' : 'north';
    const left = CROSSWALK.tileX * TILE_SIZE + 12;
    const x = left + rng.next() * (CROSSWALK.widthTiles * TILE_SIZE - 24);
    this.addPedestrian({ id: `ped-${seedNumber}-${this.pedestrianSequence}`, direction, x, variant: Math.floor(rng.next() * 3) });
  }

  public update(dt: number, hour: number, rainIntensity = 0, seedNumber = 12345): void {
    // 1. Advance signal, pedestrians and existing vehicles in small steps so they stop exactly at the line
    let remaining = dt;
    while (remaining > 1e-9) {
      const step = Math.min(MAX_STEP, remaining);
      remaining -= step;
      this.signalClock = (this.signalClock + step) % TRAFFIC_SIGNAL_CYCLE_SEC;
      this.stepPedestrians(step);
      this.stepVehicles(step);
    }

    // Người đi bộ ra vạch qua đường (không phụ thuộc giới hạn xe)
    this.spawnPedestrian(dt, hour, rainIntensity, seedNumber);

    // 2. Spawn logic
    if (this.vehicles.length >= this.maxConcurrent) return;

    this.spawnCooldown -= dt;
    if (this.spawnCooldown > 0) return;

    // Tính cooldown kế tiếp dựa trên giờ và thời tiết
    const isRushHour = (hour >= 7 && hour <= 8) || (hour >= 17 && hour <= 19);
    const isNight = hour >= 22 || hour <= 4;
    const baseCooldown = isRushHour ? 6 : isNight ? 28 : 12;
    // Mưa lớn thì xe cộ ít ra đường hơn
    const rainFactor = 1 + rainIntensity * 1.2;

    const rng = new Mulberry32Rng(seedNumber + this.vehicleSequence * 101);
    this.spawnCooldown = (baseCooldown + rng.next() * 8) * rainFactor;

    // Sinh phương tiện mới
    this.vehicleSequence++;
    const isMotorbike = rng.next() < (rainIntensity > 0.4 ? 0.65 : 0.85);
    const type: 'motorbike' | 'car' = isMotorbike ? 'motorbike' : 'car';
    const direction: 'left' | 'right' = rng.next() < 0.5 ? 'right' : 'left';
    const variant = Math.floor(rng.next() * 3);

    const speedBase = type === 'motorbike' ? 85 : 75;
    const speedVariation = (rng.next() - 0.5) * 20;
    // Đường trơn lúc mưa chạy chậm hơn
    const speed = Math.max(50, (speedBase + speedVariation) * (1 - rainIntensity * 0.25));

    const startX = direction === 'right' ? -48 : MAP_WIDTH * TILE_SIZE + 48;
    // Không sinh xe chồng lên đuôi hàng chờ ở đầu làn: hoãn ngắn rồi thử lại.
    const blocked = this.vehicles.some((other) => other.direction === direction && Math.abs(other.position.x - startX) < 90);
    if (blocked) {
      this.spawnCooldown = 2;
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
      hornTimer: rng.next() < 0.35 ? 2.5 : 0, // 35% xác suất bấm còi khi đi qua hẻm
    });
  }
}
