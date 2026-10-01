import type { CustomerArrivalMode } from '@game/shared';
import { ARRIVAL_BASE_WEIGHTS, ARRIVAL_RAIN, ARRIVAL_TIME_BANDS, ARRIVAL_WEEKEND, type ArrivalWeights } from '@game/data';

export interface ArrivalContext {
  /** Giờ trong ngày (0..23); bỏ trống thì không áp hệ số khung giờ. */
  hour?: number;
  /** Chỉ số thứ theo `weekdayOf` (0 = Thứ Hai); bỏ trống thì không áp hệ số cuối tuần. */
  weekday?: number;
  /** Cường độ mưa hiện tại 0..1. */
  rainIntensity?: number;
  /** Còn chỗ đỗ cho từng loại xe không; hết chỗ thì loại đó không được chọn. */
  freeMotorbikeSpot?: boolean;
  freeCarSpot?: boolean;
}

/** Tỷ trọng (đã chuẩn hóa, tổng 1) các phương thức đến tiệm theo giờ, thứ, mưa và chỗ đỗ còn trống. Hàm thuần. */
export function arrivalModeWeights(ctx: ArrivalContext = {}): ArrivalWeights {
  const w: ArrivalWeights = { ...ARRIVAL_BASE_WEIGHTS };
  const apply = (m: ArrivalWeights) => { w.walk *= m.walk; w.motorbike *= m.motorbike; w.car *= m.car; };
  if (ctx.hour !== undefined) {
    const band = ARRIVAL_TIME_BANDS.find(b => ctx.hour! >= b.fromHour && ctx.hour! < b.toHour);
    if (band) apply(band.multiplier);
  }
  if (ctx.weekday !== undefined && (ARRIVAL_WEEKEND.weekdays as readonly number[]).includes(ctx.weekday)) apply(ARRIVAL_WEEKEND.multiplier);
  const rain = Math.max(0, Math.min(1, ctx.rainIntensity ?? 0));
  w.walk *= 1 - ARRIVAL_RAIN.walkPenalty * rain;
  w.motorbike *= 1 - ARRIVAL_RAIN.motorbikePenalty * rain;
  w.car *= 1 + ARRIVAL_RAIN.carBonus * rain;
  if (ctx.freeMotorbikeSpot === false) w.motorbike = 0;
  if (ctx.freeCarSpot === false) w.car = 0;
  const total = w.walk + w.motorbike + w.car;
  return total > 0 ? { walk: w.walk / total, motorbike: w.motorbike / total, car: w.car / total } : { walk: 1, motorbike: 0, car: 0 };
}

/** Chọn phương thức từ `roll` trong [0, 1): thứ tự xe máy, ô tô, đi bộ (giữ thứ tự cũ để dễ so sánh). */
export function pickArrivalMode(weights: ArrivalWeights, roll: number): CustomerArrivalMode {
  if (roll < weights.motorbike) return 'motorbike';
  if (roll < weights.motorbike + weights.car) return 'car';
  return 'walk';
}
