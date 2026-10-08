/**
 * Lớp đợt khai hoang (OpenSpec `open-world-land-reclamation` D1): vùng chơi lớn dần theo các đợt định sẵn.
 * Provisional — vùng/lô theo design.md D1, DỰA TRÊN MÔ TẢ, CHƯA chốt bằng ảnh chụp (task 0.2 cần browser).
 * Các `parcels` từng đợt (w1..w4) là ƯỚC LƯỢNG hình chữ nhật đặt phía bắc con đường của đợt — lô kê lên hàng
 * trên của đường (mặt tiền quay xuống nam). Khi chốt hình (task 0.2) mới điền cạnh/số lượng/điểm góc chính xác.
 */
import type { WorldRect } from './world-grid';
import { rectContains, rectHas, rectHeight, rectWidth, WORLD_BOUNDS } from './world-grid';

export interface ReclamationParcel {
  id: string;
  rect: WorldRect;
  /** Lô góc ngã tư (hệ số vị trí D5). */
  corner?: boolean;
  /** Đường mà mặt tiền lô quay ra (phía bắc con đường); mặc định lấy `frontageRoadId` của đợt. */
  frontageRoadId?: string;
}

export interface ReclamationWave {
  id: string;
  /** Vùng ô của đợt (theo WORLD_BOUNDS). */
  region: WorldRect;
  /** Đường mà mặt tiền các lô của đợt quay ra (phía bắc con đường). */
  frontageRoadId: string;
  /** Cấp chủ dự án cần để mở đợt (D1). */
  unlockLevel: number;
  /** Chi phí mở đợt, ₫ (D1). */
  cost: number;
  /** Số ngày game thi công (D3). */
  constructionDays: number;
  /** Các lô mới của đợt — tạm để trống cho tới khi chốt ảnh (task 0.2). */
  parcels: ReclamationParcel[];
}

export const RECONSTRUCTION_DAYS = 2;

/** Bản đồ ban đầu (đợt 0) + 4 đợt khai hoang theo design D1. */
export const RECLAMATION_WAVES: readonly ReclamationWave[] = [
  { id: 'w0', region: { x0: 0, x1: 35, y0: -6, y1: 15 }, frontageRoadId: 'main', unlockLevel: 1, cost: 0, constructionDays: 0, parcels: [] },
  // W1 Đông ngã tư (D1): 3 lô mặt đường chính phía nam; lô `w1-corner` (x 42..47) là góc ngã tư đông (D5).
  { id: 'w1', region: { x0: 36, x1: 60, y0: 3, y1: 15 }, frontageRoadId: 'main', unlockLevel: 20, cost: 800_000, constructionDays: RECONSTRUCTION_DAYS, parcels: [
    { id: 'w1-corner', rect: { x0: 42, x1: 47, y0: 8, y1: 12 }, corner: true },
    { id: 'w1-east-1', rect: { x0: 48, x1: 53, y0: 8, y1: 12 } },
    { id: 'w1-east-2', rect: { x0: 54, x1: 59, y0: 8, y1: 12 } },
  ] },
  // W2 Nam hẻm (D1): 4 lô mặt đường phía nam (phía bắc đường `south`), thay dãy `s2` đoạn x 0..35.
  { id: 'w2', region: { x0: 0, x1: 35, y0: 16, y1: 24 }, frontageRoadId: 'south', unlockLevel: 30, cost: 1_200_000, constructionDays: RECONSTRUCTION_DAYS, parcels: [
    { id: 'w2-1', rect: { x0: 0, x1: 7, y0: 20, y1: 24 } },
    { id: 'w2-2', rect: { x0: 8, x1: 15, y0: 20, y1: 24 } },
    { id: 'w2-3', rect: { x0: 16, x1: 23, y0: 20, y1: 24 } },
    { id: 'w2-4', rect: { x0: 24, x1: 31, y0: 20, y1: 24 } },
  ] },
  // W3 Đông xa (D1): 2 lô mặt đường chính phía nam, phần còn lại bãi xe chung cư.
  { id: 'w3', region: { x0: 61, x1: 76, y0: 3, y1: 15 }, frontageRoadId: 'main', unlockLevel: 40, cost: 2_000_000, constructionDays: RECONSTRUCTION_DAYS, parcels: [
    { id: 'w3-1', rect: { x0: 61, x1: 67, y0: 8, y1: 12 } },
    { id: 'w3-2', rect: { x0: 68, x1: 74, y0: 8, y1: 12 } },
  ] },
  // W4 Nam đông (D1): 4 lô mặt đường phía nam; lô `w4-corner` (x 42..47) là góc ngã tư đường nam (D5).
  { id: 'w4', region: { x0: 42, x1: 76, y0: 16, y1: 24 }, frontageRoadId: 'south', unlockLevel: 50, cost: 3_000_000, constructionDays: RECONSTRUCTION_DAYS, parcels: [
    { id: 'w4-corner', rect: { x0: 42, x1: 47, y0: 20, y1: 24 }, corner: true },
    { id: 'w4-2', rect: { x0: 48, x1: 55, y0: 20, y1: 24 } },
    { id: 'w4-3', rect: { x0: 56, x1: 63, y0: 20, y1: 24 } },
    { id: 'w4-4', rect: { x0: 64, x1: 71, y0: 20, y1: 24 } },
  ] },
];

export const RECLAMATION_WAVE_MAP: Readonly<Record<string, ReclamationWave>> = Object.freeze(
  Object.assign(Object.create(null) as Record<string, ReclamationWave>, Object.fromEntries(RECLAMATION_WAVES.map(w => [w.id, w]))),
);

/** Mã đợt tự-nhiên bên phải của `waveId` cho mỗi đợt có đợt con ngay kề (w0→w1…). */
export function nextWaveId(waveId: string): string | undefined {
  const idx = RECLAMATION_WAVES.findIndex(w => w.id === waveId);
  return idx >= 0 && idx + 1 < RECLAMATION_WAVES.length ? RECLAMATION_WAVES[idx + 1].id : undefined;
}

export interface WaveValidationProblem { waveId: string; message: string }

/**
 * Hàng ô trên cùng của lòng đường theo id (hệ tọa độ thế giới) — để kiểm lô quay mặt phía bắc đúng đường.
 * Đồng nhất với `TRAFFIC_ROADS` trong neighborhood.ts (main topRow 13, south topRow 25), duy trì ở đây để wave
 * dữ liệu độc lập với renderer. Lô hợp lệ phải có cạnh dưới (y1) NHỎ HƠN hàng trên của đường (nằm phía bắc).
 */
const FRONTAGE_ROAD_TOPROW: Readonly<Record<string, number>> = { main: 13, south: 25 };

const overlapRect = (a: WorldRect, b: WorldRect): boolean =>
  a.x0 <= b.x1 && b.x0 <= a.x1 && a.y0 <= b.y1 && b.y0 <= a.y1;

/**
 * Kiểm dữ liệu đợt (spec "Waves fit the world"): mọi vùng nằm trong 120×80, không chồng nhau,
 * mọi lô nằm trong vùng đợt, lô trong cùng đợt không chồng nhau, và lô có mặt tiền phía bắc một đường có sẵn
 * (cạnh dưới lô nhỏ hơn hàng trên của đường đợt quay ra). Thuần, không phụ thuộc mô phỏng. Trả rỗng nếu hợp lệ.
 */
export function validateReclamationWaves(waves: readonly ReclamationWave[] = RECLAMATION_WAVES): WaveValidationProblem[] {
  const problems: WaveValidationProblem[] = [];
  for (const wave of waves) {
    if (!rectContains(WORLD_BOUNDS, wave.region)) {
      problems.push({ waveId: wave.id, message: `vùng ${wave.id} nằm ngoài biên thế giới ${JSON.stringify(WORLD_BOUNDS)}` });
    }
    if (wave.region.x0 > wave.region.x1 || wave.region.y0 > wave.region.y1) {
      problems.push({ waveId: wave.id, message: 'vùng có hướng x/y đảo (x0/x1, y0/y1)' });
    }
    const roadTopRow = FRONTAGE_ROAD_TOPROW[wave.frontageRoadId];
    if (roadTopRow === undefined) {
      problems.push({ waveId: wave.id, message: `đợt ${wave.id} khai báo đường mặt tiền không rõ '${wave.frontageRoadId}'` });
    }
    for (const parcel of wave.parcels) {
      if (!rectContains(wave.region, parcel.rect)) {
        problems.push({ waveId: wave.id, message: `lô ${parcel.id} nằm ngoài vùng đợt` });
      }
      if (parcel.rect.x0 > parcel.rect.x1 || parcel.rect.y0 > parcel.rect.y1) {
        problems.push({ waveId: wave.id, message: `lô ${parcel.id} có hướng x/y đảo` });
      }
      const frontTop = FRONTAGE_ROAD_TOPROW[parcel.frontageRoadId ?? wave.frontageRoadId];
      if (frontTop !== undefined && parcel.rect.y1 >= frontTop) {
        problems.push({ waveId: wave.id, message: `lô ${parcel.id} không nằm phía bắc đường (y1=${parcel.rect.y1} ≥ hàng đường ${frontTop})` });
      }
    }
    // Lô trong cùng một đợt không được chồng nhau.
    for (let i = 0; i < wave.parcels.length; i++) {
      for (let j = i + 1; j < wave.parcels.length; j++) {
        if (overlapRect(wave.parcels[i].rect, wave.parcels[j].rect)) {
          problems.push({ waveId: wave.id, message: `hai lô ${wave.parcels[i].id} và ${wave.parcels[j].id} chồng nhau` });
        }
      }
    }
  }
  for (let i = 0; i < waves.length; i++) {
    for (let j = i + 1; j < waves.length; j++) {
      const a = waves[i].region;
      const b = waves[j].region;
      if (overlapRect(a, b)) problems.push({ waveId: `${waves[i].id}/${waves[j].id}`, message: 'hai vùng đợt chồng nhau' });
    }
  }
  return problems;
}

/** Số ô của một vùng đợt (dùng cho ngân sách mở rộng và đối chiếu dữ liệu). */
export function waveTileCount(region: WorldRect): number {
  return rectWidth(region) * rectHeight(region);
}

/** Lô có điểm (x, y) không — dùng tìm lô khách/đặt tòa thuộc vùng đã mở. */
export function waveHasTile(wave: ReclamationWave, x: number, y: number): boolean {
  return rectHas(wave.region, x, y);
}
