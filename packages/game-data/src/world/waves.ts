/**
 * Lớp đợt khai hoang (OpenSpec `open-world-land-reclamation` D1): vùng chơi lớn dần theo các đợt định sẵn.
 * Provisional — vùng/lô theo design.md D1, DỰA TRÊN MÔ TẢ, chưa chốt bằng ảnh chụp (task 0.2 cần browser).
 * Khi chốt hình mới điền lô chính xác (cạnh/số lượng/điểm góc ngã tư) cho mỗi đợt.
 */
import type { WorldRect } from './world-grid';
import { rectContains, rectHas, rectHeight, rectWidth, WORLD_BOUNDS } from './world-grid';

export interface ReclamationParcel {
  id: string;
  rect: WorldRect;
  /** Lô góc ngã tư (hệ số vị trí D5). */
  corner?: boolean;
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
  { id: 'w1', region: { x0: 36, x1: 60, y0: 3, y1: 15 }, frontageRoadId: 'main', unlockLevel: 20, cost: 800_000, constructionDays: RECONSTRUCTION_DAYS, parcels: [] },
  { id: 'w2', region: { x0: 0, x1: 35, y0: 16, y1: 24 }, frontageRoadId: 'south', unlockLevel: 30, cost: 1_200_000, constructionDays: RECONSTRUCTION_DAYS, parcels: [] },
  { id: 'w3', region: { x0: 61, x1: 76, y0: 3, y1: 15 }, frontageRoadId: 'main', unlockLevel: 40, cost: 2_000_000, constructionDays: RECONSTRUCTION_DAYS, parcels: [] },
  { id: 'w4', region: { x0: 42, x1: 76, y0: 16, y1: 24 }, frontageRoadId: 'south', unlockLevel: 50, cost: 3_000_000, constructionDays: RECONSTRUCTION_DAYS, parcels: [] },
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
 * Kiểm dữ liệu đợt (spec "Waves fit the world"): mọi vùng nằm trong 120×80, không chồng nhau,
 * mọi lô nằm trong vùng đợt và nằm PHÍA BẮC một con đường (mép dưới lô chạm mép dưới vùng — lô có mặt tiền ra đường).
 * Thuần, không phụ thuộc mô phỏng. Trả rỗng nếu hợp lệ.
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
    for (const parcel of wave.parcels) {
      if (!rectContains(wave.region, parcel.rect)) {
        problems.push({ waveId: wave.id, message: `lô ${parcel.id} nằm ngoài vùng đợt` });
      }
    }
  }
  for (let i = 0; i < waves.length; i++) {
    for (let j = i + 1; j < waves.length; j++) {
      const a = waves[i].region;
      const b = waves[j].region;
      const overlap = a.x0 <= b.x1 && b.x0 <= a.x1 && a.y0 <= b.y1 && b.y0 <= a.y1;
      if (overlap) problems.push({ waveId: `${waves[i].id}/${waves[j].id}`, message: 'hai vùng đợt chồng nhau' });
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
