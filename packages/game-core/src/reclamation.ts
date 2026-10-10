/**
 * Core khai hoang đất (OpenSpec `open-world-land-reclamation`, task 2.2/2.3/2.4) — các hàm THUẦN đóng gói lô-gíc
 * để teammate khác nối vào simulation/server. Không phụ thuộc mô phỏng; chỉ ăn state + dữ liệu game-data.
 *
 * Phạm vi: chỉ tạo module này + `reclamation.test.ts`. Không sửa simulation/server/shared/game-data.
 */
import {
  BUILDING_TRAFFIC_SHARE,
  LAND_PARCELS,
  PARCEL_MAP,
  RECLAMATION_WAVE_MAP,
  RECLAMATION_WAVES,
  WAVE_EXPANSION_BONUS,
  cityGrowthFactor,
  cityTierFrom,
  expansionBudgetAtLevel,
  parcelPrice,
  parcelTrafficMultiplier,
  type LandParcel,
  type ReclamationParcel,
} from '@game/data';

// Re-export để không làm vỡ API cho teammate khác (module này trước đây tự định nghĩa fallback).
// Nguồn chuẩn là `@game/data` (packages/game-data/src/neighborhood.ts): cityTierFrom / cityGrowthFactor / cityFloorBonus / scaledNpcBudget / scaledVehicleBudget.
export { cityFloorBonus, cityGrowthFactor, cityTierFrom } from '@game/data';

// ==========================================
// Kiểu state thế giới (khớp `WorldOpenState` @game/shared + `ownedParcelIds`)
// ==========================================

export interface ReclaimState {
  level: number;
  money: number;
  openedWaves: string[];
  wavesUnderConstruction: Record<string, number>;
  day: number;
}

export interface BuyParcelState extends ReclaimState {
  ownedParcelIds: string[];
}

// ==========================================
// Resolver lô: trước hết `PARCEL_MAP` (4 lô W0), rồi các lô đợt mới đã điền trong `RECLAMATION_WAVES[*].parcels`
// (w1..w4). `ReclamationParcel` chưa có trường `wave`/`frontageRoadId` trên thân nên chuyển thành `LandParcel`
// với `wave` = chỉ số đợt chứa nó và `frontageRoadId` fallback về đường mặt tiền của đợt. Thuần, trả `undefined`
// khi không tìm thấy.
// ==========================================

function parcelFromWaveParcels(parcelId: string): LandParcel | undefined {
  for (let wi = 1; wi < RECLAMATION_WAVES.length; wi++) {
    const wave = RECLAMATION_WAVES[wi];
    const found = wave.parcels.find((p: ReclamationParcel) => p.id === parcelId);
    if (found) {
      return {
        id: found.id,
        rect: found.rect,
        wave: wi,
        frontageRoadId: found.frontageRoadId ?? wave.frontageRoadId,
        frontage: { corner: found.corner ?? false },
      };
    }
  }
  return undefined;
}

/** Tra lô theo id: `PARCEL_MAP` hoặc lô đợt mới trong `RECLAMATION_WAVES`. */
export function resolveLandParcel(parcelId: string): LandParcel | undefined {
  return PARCEL_MAP[parcelId] ?? parcelFromWaveParcels(parcelId);
}

// ==========================================
// 1) reclaimWaveAllowed: điều kiện mở đợt (cấp + tiền) nhưng CHƯA tính vào thi công
// ==========================================

export function reclaimWaveAllowed(state: ReclaimState, waveId: string): { ok: boolean; reason?: string } {
  const wave = RECLAMATION_WAVE_MAP[waveId];
  if (!wave) return { ok: false, reason: 'unknown_wave' };
  if (state.openedWaves.includes(waveId)) return { ok: false, reason: 'already_open' };
  const completion = state.wavesUnderConstruction[waveId];
  if (completion !== undefined && state.day < completion) return { ok: false, reason: 'under_construction' };
  if (state.level < wave.unlockLevel) return { ok: false, reason: 'not_enough_level' };
  if (state.money < wave.cost) return { ok: false, reason: 'not_enough_money' };
  return { ok: true };
}

// ==========================================
// 2) startReclaimWave: đưa đợt vào thi công (mở khi xong). KHÔNG đổi tiền (nối ở simulation).
// ==========================================

export function startReclaimWave(state: ReclaimState, waveId: string, day: number): {
  openedWaves: string[];
  wavesUnderConstruction: Record<string, number>;
} {
  const wave = RECLAMATION_WAVE_MAP[waveId];
  if (!wave) return { openedWaves: [...state.openedWaves], wavesUnderConstruction: { ...state.wavesUnderConstruction } };
  const wavesUnderConstruction = { ...state.wavesUnderConstruction };
  if (!state.openedWaves.includes(waveId)) {
    // openedWaves chưa đổi ở đây — chỉ set ngày hoàn thành thi công. `day + constructionDays` = ngày mở (đầu ngày).
    wavesUnderConstruction[waveId] = day + wave.constructionDays;
  }
  return { openedWaves: [...state.openedWaves], wavesUnderConstruction };
}

// ==========================================
// 3) buyParcelAllowed: lô phải mua trước khi đặt tòa (trừ W0).
//    `buyParcelAllowed` (chữ ký đúng theo task) resolve PARCEL_MAP rồi giao cho `buyParcelAllowedFor` —
//    tách lõi để có thể test với lô đợt mới dạng tổng hợp (game-data chưa có lô W1..W4, khóa task 0.2).
// ==========================================

export function buyParcelAllowed(state: BuyParcelState, parcelId: string): { ok: boolean; reason?: string; price?: number } {
  const parcel = resolveLandParcel(parcelId);
  if (!parcel) return { ok: false, reason: 'unknown_parcel' };
  return buyParcelAllowedFor(parcel, state);
}

/** Lõi lô-gíc mua lô cho một `LandParcel` cụ thể (test được với lô đợt mới chưa có trong game-data). */
export function buyParcelAllowedFor(parcel: LandParcel, state: BuyParcelState): { ok: boolean; reason?: string; price?: number } {
  // Lô W0 (đợt 0) coi như đã sở hữu — không bán.
  if (parcel.wave === 0) return { ok: false, reason: 'already_owned' };

  // Lô đợt mới: đợt phải MỞ XONG (id trong openedWaves và không đang thi công).
  const wave = RECLAMATION_WAVES[parcel.wave];
  const waveOpen = wave && state.openedWaves.includes(wave.id) && state.wavesUnderConstruction[wave.id] === undefined;
  if (!waveOpen) return { ok: false, reason: 'wave_not_open' };

  if (state.ownedParcelIds.includes(parcel.id)) return { ok: false, reason: 'already_owned' };

  const price = parcelPrice(parcel);
  if (state.money < price) return { ok: false, reason: 'not_enough_money', price };
  return { ok: true, price };
}

// ==========================================
// 4) validateParcelOwnedForPlacement: đặt tòa yêu cầu lô đã sở hữu (W0 luôn OK).
// ==========================================

export function validateParcelOwnedForPlacement(parcelId: string, ownedParcelIds: string[]): string | null {
  const parcel = resolveLandParcel(parcelId);
  if (!parcel) return 'unknown_parcel';
  return validateParcelOwnedForPlacementFor(parcel, ownedParcelIds);
}

/** Lõi: kiểm một `LandParcel` cụ thể (test được với lô đợt mới dạng tổng hợp). */
export function validateParcelOwnedForPlacementFor(parcel: LandParcel, ownedParcelIds: string[]): string | null {
  if (parcel.wave === 0) return null;
  return ownedParcelIds.includes(parcel.id) ? null : 'parcel_not_owned';
}

// ==========================================
// 5) expansionBudgetAt: ngân sách ô mở rộng = mốc theo cấp + thưởng theo từng đợt đã mở (D6).
// ==========================================

export function expansionBudgetAt(level: number, openedWaves: string[], floorTilesUsed: number): { ok: boolean; remaining: number } {
  let bonus = 0;
  for (const w of RECLAMATION_WAVES) {
    if (openedWaves.includes(w.id)) bonus += WAVE_EXPANSION_BONUS[w.id] ?? 0;
  }
  const budget = expansionBudgetAtLevel(level) + bonus;
  const remaining = budget - floorTilesUsed;
  return { ok: remaining >= 0, remaining };
}

// ==========================================
// 6) customerTrafficMultiplier: hệ số khách của lô (D5). Tòa W0 ra 1.
// ==========================================

export function customerTrafficMultiplier(parcelId: string): number {
  const parcel = resolveLandParcel(parcelId);
  if (!parcel) return 1;
  return parcelTrafficMultiplier(parcel);
}

/**
 * D5 (provisional): nhịp sinh khách của tòa phụ = `BUILDING_TRAFFIC_SHARE` × hệ số khách của LÔ tòa đứng.
 * - `buildingId` là một trong các tòa phụ trong `BUILDING_TRAFFIC_SHARE` (`xoi`/`drink`/`snack`); tòa không có share → 0.
 * - `parcel` là lô chứa tòa (tra trực tiếp bằng `parcelTrafficMultiplier` từ game-data, nên dùng được với lô TỔNG HỢP
 *   chưa nằm trong `PARCEL_MAP`/`RECLAMATION_WAVES` — phục vụ mô phỏng so ba vị trí D5 + spec "Location value").
 * - Lô W0 (mặt đường chính, hệ số 1) → tích bằng share cũ → golden không đổi.
 * Thuần, dùng làm "cơ chế" chuẩn để balance-sim/test chứng minh tỉ lệ góc > mặt chính > đường nam.
 */
export function effectiveSecondaryBuildingTrafficShare(buildingId: string, parcel: LandParcel): number {
  const share = BUILDING_TRAFFIC_SHARE.find(([id]) => id === buildingId)?.[1] ?? 0;
  return share * parcelTrafficMultiplier(parcel);
}

// ==========================================
// 7) isWaveConstructing: còn trong thời gian thi công chưa mở (day < ngày hoàn thành).
// ==========================================

export function isWaveConstructing(wavesUnderConstruction: Record<string, number>, waveId: string, day: number): boolean {
  const completion = wavesUnderConstruction[waveId];
  return completion !== undefined && day < completion;
}

// ==========================================
// 8) cityTier + cityGrowthFactor + cityFloorBonus — DÙNG EXPORT CHUẨN @game/data.
//    (packages/game-data/src/neighborhood.ts) — module này KHÔNG còn định nghĩa fallback nội bộ nữa;
//    các hàm được re-export lại ở đầu file để giữ API cho teammate khác.
//    `cityTierFrom(openedWaves, buildingCount)` 0..5 đơn điệu; `cityGrowthFactor(tier)` 0.6→1.4 (D7).
// ==========================================

// Giữ tham chiếu `LAND_PARCELS` để lộ rõ nguồn dữ liệu lô (dùng trong module mở rộng sau này).
export const PARCEL_SOURCE = LAND_PARCELS;
