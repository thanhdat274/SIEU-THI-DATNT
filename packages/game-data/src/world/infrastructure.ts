/**
 * Hạ tầng đợt khai hoang 0 (OpenSpec `open-world-land-grid`, task 4.5): đèn đường, cây vỉa hè, chỗ đỗ xe, mặt cắt lòng đường,
 * rãnh thoát nước. Đường cố định theo từng đợt khai hoang (chốt 05/10/2026), nên đây là dữ liệu tuyệt đối đặt tay của đợt 0,
 * không suy từ tòa nhà. Đợt sau thêm hạ tầng của mình bên cạnh, không sinh ngẫu nhiên.
 */
import type { Vector2D } from '@game/shared';

/** Đèn đường trên vỉa hè sát lòng đường; cột đèn chỉ chặn phần chân cột (`STREET_LAMP_COLLIDER`). Không đặt cột đèn chéo sát một cây (cột ở hàng 12, cây ở hàng 11, lệch một cột) vì hai vật cản chạm góc sẽ bịt kín cả vỉa hè; `sidewalk-passable.test.ts` kiểm tra. */
export const STREET_LAMP_TILES: ReadonlyArray<{ x: number; y: number }> = [{ x: 9, y: 12 }, { x: 15, y: 12 }, { x: 21, y: 12 }];
// Cột đèn đầu hẻm trước ở x=3 sát cột đèn tín hiệu phía bắc vạch qua đường (x≈106 px), nên dời sang x=9: cách đều cột tín hiệu và cột x=15 (~195 px).
/**
 * Va chạm của cột đèn: chỉ phần chân cột (khớp sprite `deco_lamp_pole` 32x64: thân rộng ~10 px quanh x=10..20, chân cột
 * cao ~10 px sát đáy ô), không chặn cả ô 32x32 như tường. Tọa độ pixel tương đối góc trên-trái của ô cột đèn.
 */
export const STREET_LAMP_COLLIDER = { offsetX: 10, offsetY: 22, width: 12, height: 10 } as const;
/** Hộp va chạm (pixel thế giới) của mọi cột đèn đường. */
export const streetLampBoxes = (): Array<{ x: number; y: number; width: number; height: number }> =>
  STREET_LAMP_TILES.map(l => ({ x: l.x * 32 + STREET_LAMP_COLLIDER.offsetX, y: l.y * 32 + STREET_LAMP_COLLIDER.offsetY, width: STREET_LAMP_COLLIDER.width, height: STREET_LAMP_COLLIDER.height }));

/**
 * Cây trên vỉa hè. `tileX/tileY` là ô gốc cây (có va chạm, tường loại 7); sprite và bóng bám theo ô này.
 * `height` (ô) quyết định độ dài bóng, `crownRadius` (ô) là bán kính tán. Thêm cây = thêm một dòng; cần tự kiểm
 * không chặn cửa tiệm, ô đỗ xe, cột đèn hay lối đi.
 */
export interface TreeProp { id: string; tileX: number; tileY: number; height: number; crownRadius: number }
export const TREE_PROPS: ReadonlyArray<TreeProp> = [
  // Cây hiện có phía tây
  { id: 'alley_shade_tree', tileX: 5, tileY: 11, height: 2.4, crownRadius: 1.1 },
  // Cây mới phía đông (gần quán nước)
  { id: 'east_tree_small', tileX: 19, tileY: 11, height: 1.8, crownRadius: 0.8 },  // Giữa tiệm xôi và quán nước
  { id: 'east_tree_tall', tileX: 25, tileY: 11, height: 2.6, crownRadius: 1.2 },   // Trước quán nước bên trái
  { id: 'east_tree_bush', tileX: 28, tileY: 11, height: 1.5, crownRadius: 1.0 },   // Trước quán nước, sát phía tây cửa (x=30..31) nhưng cách cửa 1 ô; tách khỏi cây ở mép đông (trước đây ở x=33 dính cây x=34)
  { id: 'east_tree_cluster', tileX: 34, tileY: 11, height: 2.0, crownRadius: 0.9 }, // Mép đông bản đồ
];
/** Vị trí góc trên-trái của sprite cây so với ô gốc (đơn vị ô) và độ dịch bằng pixel. `pixelsX` = 8 đặt thân cây (sprite 80 px, thân tâm ở x=40) đúng giữa ô gốc để bồn cây vừa khít ô có va chạm (`TREE_PLANTER`). */
export const TREE_SPRITE_OFFSET = { tilesX: -1, tilesY: -2, pixelsX: 8, pixelsY: -4 } as const;

/** Điểm đỗ xe máy lề đường trước tiệm (trên vỉa hè sát lòng đường, không chặn cửa tiệm hay cột đèn). */
export const STREET_PARKING_SPOTS: ReadonlyArray<Vector2D> = [
  // Xe máy dài ~62 px nên hai chỗ cạnh nhau cách ~64 px (trước đây 32 px khi xe dài 44 px).
  { x: 196, y: 12 * 32 + 10 },
  { x: 260, y: 12 * 32 + 10 },
  { x: 392, y: 12 * 32 + 10 },
  { x: 456, y: 12 * 32 + 10 },
  // Trước quán nước (cửa ở x=30..31): xe máy đỗ gần cửa, khách không phải đi bộ từ đầu hẻm.
  { x: 880, y: 12 * 32 + 10 },
  { x: 944, y: 12 * 32 + 10 },
];
/**
 * Mặt cắt lòng đường (chỉ hình ảnh, không đổi va chạm hay đường đi): vỉa hè (y 11-12) → bó vỉa + rãnh thoát nước →
 * làn bắc (y 13, đi sang trái) → vạch giữa (biên y 14) → làn nam (y 14, đi sang phải) → mặt đường còn lại.
 * Hai làn trùng với STREET_LANE_LEFT_Y/STREET_LANE_RIGHT_Y trong game-core/street-traffic.ts.
 */
export const ROAD_PROFILE = { kerbTileY: 13, centerLineTileY: 14, laneRows: 2 } as const;
/** Cửa thu nước mưa trong rãnh sát bó vỉa (ô x, ở hàng kerbTileY). */
export const STORM_DRAINS: ReadonlyArray<{ tileX: number }> = [{ tileX: 4 }, { tileX: 12 }, { tileX: 17 }, { tileX: 22 }];

/**
 * Chỗ đỗ ô tô của khách trên vỉa hè phía đông (rộng hơn chỗ xe máy, chân xe tại y px), giữa các cột đèn x = 15, 21 và
 * mép bản đồ; ô tô neo giữa-đáy tại điểm này (sprite 130x65, nửa dài 65 px: cách cột đèn > 73 px, cách chỗ xe máy > 96 px, nằm trong bản đồ). Không chặn cửa tiệm, ô đỗ xe máy hay vạch qua đường.
 */
export const CAR_PARKING_SPOTS: ReadonlyArray<Vector2D> = [
  { x: 592, y: 12 * 32 + 14 },
  { x: 772, y: 12 * 32 + 14 },
  { x: 1060, y: 12 * 32 + 14 },
];
