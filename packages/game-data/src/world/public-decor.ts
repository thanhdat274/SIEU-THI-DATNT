/**
 * Đồ công cộng làm phần thưởng cấp thành phố (OpenSpec `open-world-districts-city-goals` 2.3, design D4).
 *
 * Mỗi món có vị trí định sẵn (không chiếm lô) và xuất hiện khi cấp thành phố ≥ `cityLevel` — cấp chỉ tăng khi nhận đủ
 * thưởng mục tiêu, nên đây là phần thưởng của lần lên cấp. Suy ra từ `cityProgress.level` nên không cần thêm trường save
 * và hai máy co-op luôn thấy giống nhau. Sức hút cộng vào hệ trang trí có sẵn (`DECOR_ATTRACTION_MAX` vẫn là trần)
 * cho tiệm chính khi món nằm trong bán kính tính từ cửa tiệm. Vị trí/điểm là PROVISIONAL chờ playtest.
 */
import { MAIN_STORE_BOUNDS } from '../buildings';

export interface PublicDecorDef {
  id: string;
  name: string;
  /** Cấp thành phố tối thiểu để món xuất hiện. */
  cityLevel: number;
  /** Ô đặt (tâm chân món). */
  tile: { x: number; y: number };
  kind: 'bench' | 'fountain' | 'gate' | 'flower_bed';
  /** Điểm thu hút cộng vào hệ trang trí khi trong bán kính. */
  attraction: number;
}

/** Bán kính (Manhattan, ô) từ cửa tiệm chính để món công cộng tăng sức hút. */
export const PUBLIC_DECOR_RADIUS = 16;

export const PUBLIC_DECOR: readonly PublicDecorDef[] = [
  { id: 'pd_ghe_da_hem', name: 'Ghế đá đầu hẻm', cityLevel: 2, tile: { x: 18, y: 12 }, kind: 'bench', attraction: 8 },
  { id: 'pd_bon_hoa_hem', name: 'Bồn hoa vỉa hè', cityLevel: 3, tile: { x: 26, y: 12 }, kind: 'flower_bed', attraction: 8 },
  { id: 'pd_cong_chao_nga_tu', name: 'Cổng chào ngã tư', cityLevel: 4, tile: { x: 44, y: 12 }, kind: 'gate', attraction: 10 },
  { id: 'pd_dai_phun_nuoc', name: 'Đài phun nước', cityLevel: 6, tile: { x: 48, y: 17 }, kind: 'fountain', attraction: 15 },
  { id: 'pd_ghe_da_van_phong', name: 'Ghế đá khu văn phòng', cityLevel: 8, tile: { x: 68, y: 12 }, kind: 'bench', attraction: 8 },
];

/** Món công cộng đang có ở cấp thành phố này. */
export function publicDecorForCityLevel(cityLevel: number): PublicDecorDef[] {
  return PUBLIC_DECOR.filter((d) => cityLevel >= d.cityLevel);
}

/** Ô cửa tiệm chính (giữa mép dưới tòa). */
const MAIN_DOOR_TILE = { x: Math.floor((MAIN_STORE_BOUNDS.left + MAIN_STORE_BOUNDS.right) / 2), y: MAIN_STORE_BOUNDS.bottom };

/** Điểm thu hút từ đồ công cộng trong bán kính cửa tiệm chính (chưa kẹp trần; trần áp ở `decorAttraction`). */
export function publicDecorAttraction(cityLevel: number): number {
  return publicDecorForCityLevel(cityLevel)
    .filter((d) => Math.abs(d.tile.x - MAIN_DOOR_TILE.x) + Math.abs(d.tile.y - MAIN_DOOR_TILE.y) <= PUBLIC_DECOR_RADIUS)
    .reduce((sum, d) => sum + d.attraction, 0);
}
