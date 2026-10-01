import { StreetVehicleState, TILE_SIZE } from '@game/shared';
import { MAP_WIDTH } from '@game/data';
import { Mulberry32Rng } from './staff';

export const STREET_LANE_RIGHT_Y = 14.6 * TILE_SIZE; // 467px (làn bên phải, đi từ trái qua phải)
export const STREET_LANE_LEFT_Y = 13.4 * TILE_SIZE;  // 428px (làn bên trái, đi từ phải qua trái)

export class StreetTrafficManager {
  private vehicles: StreetVehicleState[] = [];
  private spawnCooldown = 5;
  private vehicleSequence = 0;
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

  public reset(): void {
    this.vehicles = [];
    this.spawnCooldown = 5;
  }

  public update(dt: number, hour: number, rainIntensity = 0, seedNumber = 12345): void {
    // 1. Advance existing vehicles
    for (let i = this.vehicles.length - 1; i >= 0; i--) {
      const v = this.vehicles[i];
      const deltaX = (v.direction === 'right' ? 1 : -1) * v.speed * dt;
      v.position.x += deltaX;

      // Cập nhật timer còi nếu có
      if (v.hornTimer && v.hornTimer > 0) {
        v.hornTimer -= dt;
      }

      // Kiểm tra xe đã chạy ra ngoài giới hạn bản đồ chưa
      const outOfBounds =
        (v.direction === 'right' && v.position.x > MAP_WIDTH * TILE_SIZE + 60) ||
        (v.direction === 'left' && v.position.x < -60);

      if (outOfBounds) {
        this.vehicles.splice(i, 1);
      }
    }

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
