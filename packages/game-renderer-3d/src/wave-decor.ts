import { DISTRICTS, RECLAMATION_WAVES, districtForWave, parcelPrice, parcelTrafficMultiplier, type LandParcel } from '@game/data';

/** Hộp theo ô bản đồ, đầu mút x1/y1 tính cả ô cuối (giống `region`/`rect` của waves). */
export interface TileRect { x0: number; y0: number; x1: number; y1: number }

export interface DecorSign { text: string; cx: number; cz: number; width: number; bg: string }

export interface WaveDecor {
  /** Đợt đang thi công: nền đất, rào sọc, biển "còn N ngày". */
  construction: Array<{ waveId: string; region: TileRect; daysLeft: number; sign: DecorSign }>;
  /** Đợt còn khóa: phủ tối nhẹ, viền nét đứt, biển điều kiện mở. */
  locked: Array<{ waveId: string; region: TileRect; sign: DecorSign }>;
  /** Khu đã mở: phủ màu nhẹ theo chủ đề và biển tên khu. */
  districts: Array<{ waveId: string; region: TileRect; color: string; sign: DecorSign }>;
  /** Lô của đợt đã mở mà chưa có tòa: viền + biển "LÔ BÁN"/"ĐẤT TRỐNG". */
  parcels: Array<{ id: string; rect: TileRect; owned: boolean; corner: boolean; sign: DecorSign }>;
}

export interface WorldDecorInput {
  openedWaves: readonly string[];
  /** Đợt đang thi công: ngày game hoàn tất. */
  wavesUnderConstruction: Readonly<Record<string, number>>;
  ownedParcelIds: readonly string[];
  day: number;
  /** Chân diện (ô) của các tòa phụ đã dựng; lô đã có tòa thì không vẽ biển. */
  placed: ReadonlyArray<{ left: number; right: number; bottom: number }>;
}

const DISTRICT_THEME_COLORS: Record<string, string> = { commercial: '#c98a2e', suburb: '#4f8f4f', modern_office: '#3f6fa8', food_street: '#b8502e' };
export const REGION_SIGN_COLOR = { construction: '#8a1c1c', locked: '#4a4f57', parcelFree: '#2f6f5f', parcelOwned: '#6b6f73' } as const;

const centerX = (r: TileRect): number => (r.x0 + r.x1 + 1) / 2;
const centerZ = (r: TileRect): number => (r.y0 + r.y1 + 1) / 2;

/** Mô tả thuần mọi trang trí đợt khai hoang trong thế giới (chuẩn theo `updateConstruction`/`syncWorldState` của Pixi). */
export function computeWaveDecor(input: WorldDecorInput): WaveDecor {
  const out: WaveDecor = { construction: [], locked: [], districts: [], parcels: [] };
  for (const [index, wave] of RECLAMATION_WAVES.entries()) {
    if (index === 0) continue;
    const r = wave.region;
    const doneDay = input.wavesUnderConstruction[wave.id];
    const opened = input.openedWaves.includes(wave.id);
    if (doneDay !== undefined && !opened) {
      const daysLeft = Math.max(0, doneDay - input.day);
      out.construction.push({
        waveId: wave.id, region: r, daysLeft,
        sign: { text: `ĐANG THI CÔNG · còn ${daysLeft} ngày`, cx: centerX(r), cz: centerZ(r), width: 6, bg: REGION_SIGN_COLOR.construction },
      });
      continue;
    }
    if (!opened) {
      out.locked.push({
        waveId: wave.id, region: r,
        sign: { text: `ĐỢT ${wave.id.slice(1)} · KHÓA · CẤP ${wave.unlockLevel} · ${(wave.cost / 1e6).toLocaleString('vi-VN')}tr`, cx: centerX(r), cz: centerZ(r), width: 7, bg: REGION_SIGN_COLOR.locked },
      });
      continue;
    }
    const waveKey = wave.id as 'w1' | 'w2' | 'w3' | 'w4';
    const district = DISTRICTS[districtForWave(waveKey)];
    const color = DISTRICT_THEME_COLORS[district.visualTheme];
    if (color !== undefined) {
      out.districts.push({ waveId: wave.id, region: r, color, sign: { text: district.name.toUpperCase(), cx: centerX(r), cz: r.y0 + 0.6, width: 5.5, bg: color } });
    }
    for (const raw of wave.parcels) {
      if (input.placed.some(b => b.left >= raw.rect.x0 && b.right <= raw.rect.x1 + 1 && b.bottom >= raw.rect.y0 && b.bottom <= raw.rect.y1 + 1)) continue;
      const owned = input.ownedParcelIds.includes(raw.id);
      const parcel: LandParcel = {
        id: raw.id, rect: raw.rect, wave: index, frontageRoadId: raw.frontageRoadId ?? wave.frontageRoadId,
        districtId: districtForWave(waveKey), frontage: { corner: raw.corner ?? false },
      };
      const text = owned ? 'ĐẤT TRỐNG' : `LÔ BÁN · ${Math.round(parcelPrice(parcel) / 1000)}k · ×${parcelTrafficMultiplier(parcel)}`;
      out.parcels.push({
        id: raw.id, rect: raw.rect, owned, corner: raw.corner ?? false,
        sign: { text, cx: centerX(raw.rect), cz: raw.rect.y1 + 1 - 0.2, width: owned ? 4 : 5, bg: owned ? REGION_SIGN_COLOR.parcelOwned : REGION_SIGN_COLOR.parcelFree },
      });
    }
  }
  return out;
}

/** Khóa để chỉ dựng lại khi trạng thái đổi (ngày chỉ tính khi có đợt đang thi công, như Pixi). */
export function worldDecorKey(input: WorldDecorInput): string {
  const day = Object.keys(input.wavesUnderConstruction).length ? input.day : 0;
  return JSON.stringify([input.openedWaves, input.wavesUnderConstruction, input.ownedParcelIds, day, input.placed.map(b => `${b.left},${b.right},${b.bottom}`)]);
}

/** Overlay QA: viền mọi đợt và từng lô (lô góc màu cam), chữ nhãn tại góc. */
export interface WaveOverlayItem { rect: TileRect; label: string; labelAt: { x: number; z: number }; color: string; kind: 'wave' | 'parcel' }
export function computeWaveOverlay(): WaveOverlayItem[] {
  const items: WaveOverlayItem[] = [];
  for (const wave of RECLAMATION_WAVES) {
    const r = wave.region;
    items.push({ rect: r, label: `${wave.id.toUpperCase()} (x${r.x0}..${r.x1}, y${r.y0}..${r.y1})`, labelAt: { x: r.x0 + 3, z: Math.max(0, r.y0 - 0.5) }, color: '#4aa3ff', kind: 'wave' });
    for (const p of wave.parcels) {
      items.push({ rect: p.rect, label: p.id, labelAt: { x: p.rect.x0 + 1.5, z: p.rect.y0 + 0.5 }, color: p.corner ? '#ff8800' : '#3fbf5f', kind: 'parcel' });
    }
  }
  return items;
}
