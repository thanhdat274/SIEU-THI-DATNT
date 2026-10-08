/**
 * Hạ tầng các đợt khai hoang W1–W4 (OpenSpec `open-world-land-reclamation`, task 1.1).
 *
 * PROVISIONAL — chưa chốt bằng ảnh chụp (task 0.2 chưa làm): các ô đèn/cây/chỗ đỗ/rãnh/vỉa hè là
 * ƯỚC LƯỢNG HỢP LÝ theo design D1, KHÔNG tuyên bố chốt. Khi chốt hình (0.2) mới tinh chỉnh vị trí.
 *
 * Kiểu dữ liệu đồng nhất với hạ tầng W0 (`./infrastructure.ts`, `map.ts`):
 *   - đèn / cây / rãnh / vỉa hè: toạ độ ô thế giới (x, y);
 *   - chỗ đỗ xe máy / ô tô: toạ độ pixel `Vector2D` (chân xe), như `STREET_PARKING_SPOTS` / `CAR_PARKING_SPOTS`.
 *
 * Quy ước đường theo mặt cắt W0 (`ROAD_PROFILE` / `map.ts`):
 *   - Đường `main`: lòng đường hàng 13–15, vỉa hè phía bắc hàng 11–12, bó vỉa (kerb) hàng 13, hai làn.
 *   - Đường `south`: lòng đường hàng 25–27, vỉa hè phía bắc hàng 23–24, bó vỉa (kerb) hàng 25.
 *
 * Đèn, cây và chỗ đỗ là VẬT CẢN (cột đèn chặn chân cột; cây là tường ô 7). Các lô của đợt chiếm gần hết
 * mặt tiền đường, nên đồ nội thất đường chỉ đặt ở KHE / MÉP LÔ (ô/Hàng nằm NGOÀI rect lô) để không chặn cửa
 * hoặc mặt tiền lô. Việc bố trí dày đặc hơn sẽ thực hiện khi chốt hình (0.2).
 *
 * Rãnh thoát nước (`stormDrains`) đặt ở bó vỉa (kerb): với đợt W1/W3 vùng đợt GỒM cả lòng đường `main`
 * (region y3..15 chứa hàng 13) nên có rãnh; với W2/W4 vùng đợt (y16..24) NẰM PHÍA BẮC đường `south`
 * (kerb hàng 25 NGOÀI region) nên đợt không khai báo rãnh — rãnh đường nam là hạ tầng đường có sẵn.
 */
import type { Vector2D } from '@game/shared';
import type { TreeProp } from './infrastructure';
import { ROAD_PROFILE } from './infrastructure';
import type { WorldRect } from './world-grid';

/** Hạ tầng một đợt khai hoang (W1–W4). */
export interface WaveInfrastructure {
  waveId: string;
  /** Vỉa hè phía bắc con đường của đợt — ô (x,y), mặc trong region đợt. */
  sidewalk: ReadonlyArray<{ x: number; y: number }>;
  /** Cột đèn đường trên vỉa hè sát lòng đường — ô (x,y). */
  streetLamps: ReadonlyArray<{ x: number; y: number }>;
  /** Cây vỉa hè — `TreeProp` như W0. */
  trees: ReadonlyArray<TreeProp>;
  /** Chỗ đỗ xe máy lề đường — pixel `Vector2D`. */
  streetParking: ReadonlyArray<Vector2D>;
  /** Chỗ đỗ ô tô khách — pixel `Vector2D` (có thể rỗng). */
  carParking: ReadonlyArray<Vector2D>;
  /** Cửa thu nước mưa trong rãnh sát bó vỉa — chỉ khi bó vỉa nằm trong region đợt. */
  stormDrains: ReadonlyArray<{ tileX: number }>;
}

/** Khai triển một vùng ô thành danh sách `{x,y}` (ổn định, thuần; chỉ là dữ liệu). */
function cells(rect: WorldRect): Array<{ x: number; y: number }> {
  const out: Array<{ x: number; y: number }> = [];
  for (let y = rect.y0; y <= rect.y1; y++) for (let x = rect.x0; x <= rect.x1; x++) out.push({ x, y });
  return out;
}

/** Dải vỉa hè 2 hàng phía bắc của một đường (như W0: hàng kerb-2, kerb-1). */
function sidewalkStrip(x0: number, x1: number, kerb: number): Array<{ x: number; y: number }> {
  return [
    ...cells({ x0, x1, y0: kerb - 2, y1: kerb - 2 }),
    ...cells({ x0, x1, y0: kerb - 1, y1: kerb - 1 }),
  ];
}

/** Hằng số bó vỉa theo đường, đồng nhất `FRONTAGE_ROAD_TOPROW`/TRAFFIC_ROADS (main 13, south 25). */
const KERB_ROW: Readonly<Record<string, number>> = { main: ROAD_PROFILE.kerbTileY, south: 25 } as const;

const MAIN_KERB = KERB_ROW.main; // 13
const SOUTH_KERB = KERB_ROW.south; // 25

/**
 * Hạ tầng W1–W4 theo đợt. Đèn/cây/chỗ đỗ chỉ ở KHE/MÉP LÔ (ngoài rect lô) — xem header.
 * PROVISIONAL (task 0.2 chưa chốt hình).
 */
export const WAVE_INFRASTRUCTURE: Readonly<Record<string, WaveInfrastructure>> = Object.freeze({
  // W1 — Đông ngã tư, đường `main` (vỉa hè main hàng 11–12, kerb 13). Region x36..60, y3..15; lô x42..59 (khe: 36–41, 60).
  w1: Object.freeze({
    waveId: 'w1',
    sidewalk: sidewalkStrip(36, 60, MAIN_KERB),
    streetLamps: Object.freeze([{ x: 36, y: 12 }, { x: 41, y: 12 }]),
    trees: Object.freeze([
      { id: 'w1_west_tree', tileX: 39, tileY: 11, height: 1.8, crownRadius: 0.8 },
    ]),
    // Chỗ đỗ xe máy ở khe tây lô (hàng vỉa hè y=12, ô 37–38) — xe máy dài ~62 px vừa khe, không đè cửa lô/cột đèn.
    streetParking: Object.freeze([{ x: 38 * 32, y: 12 * 32 + 10 }]),
    carParking: Object.freeze([]),
    stormDrains: Object.freeze([{ tileX: 38 }, { tileX: 46 }, { tileX: 54 }]),
  }),
  // W3 — Đông xa, đường `main` (vỉa hè main hàng 11–12, kerb 13). Region x61..76; lô x61..74 (khe: 75–76).
  // Khe chỉ 2 ô → đủ chỗ 1 cột đèn; KHÔNG có chỗ đỗ trong region (bãi xe chung cư x giáp ranh có sẵn, D1). PROVISIONAL.
  w3: Object.freeze({
    waveId: 'w3',
    sidewalk: sidewalkStrip(61, 76, MAIN_KERB),
    streetLamps: Object.freeze([{ x: 75, y: 12 }]),
    trees: Object.freeze([]),
    streetParking: Object.freeze([]),
    carParking: Object.freeze([]),
    stormDrains: Object.freeze([{ tileX: 64 }, { tileX: 70 }, { tileX: 74 }]),
  }),
  // W2 — Nam hẻm, đường `south` (vỉa hè south hàng 23–24, kerb 25). Region x0..35, y16..24; lô x0..31 (khe: 32–35).
  // Kerb 25 NGOÀI region (region y0..y1 = 16..24) nên đợt không khai báo rãnh.
  w2: Object.freeze({
    waveId: 'w2',
    sidewalk: sidewalkStrip(0, 35, SOUTH_KERB),
    streetLamps: Object.freeze([{ x: 32, y: 24 }]),
    trees: Object.freeze([
      { id: 'w2_east_tree', tileX: 35, tileY: 23, height: 1.8, crownRadius: 0.8 },
    ]),
    // Chỗ đỗ xe máy ở khe đông lô (hàng vỉa hè y=24, ô 33–34) — khe 4 ô không kịp ô tô nên chỉ xe máy.
    streetParking: Object.freeze([{ x: 34 * 32, y: 24 * 32 + 10 }]),
    carParking: Object.freeze([]),
    stormDrains: Object.freeze([]),
  }),
  // W4 — Nam đông, đường `south` (vỉa hè south hàng 23–24, kerb 25). Region x42..76, y16..24; lô x42..71 (khe: 72–76).
  // Kerb 25 NGOÀI region → đợt không khai báo rãnh (rãnh đường nam là hạ tầng đường có sẵn).
  w4: Object.freeze({
    waveId: 'w4',
    sidewalk: sidewalkStrip(42, 76, SOUTH_KERB),
    streetLamps: Object.freeze([{ x: 72, y: 24 }]),
    trees: Object.freeze([
      { id: 'w4_east_tree', tileX: 76, tileY: 23, height: 1.8, crownRadius: 0.8 },
    ]),
    // Chỗ đỗ xe máy ở khe đông lô (hàng vỉa hè y=24, ô 74–75); khe 5 ô hẹp cho ô tô nên chỉ xe máy (provisional).
    streetParking: Object.freeze([{ x: 75 * 32, y: 24 * 32 + 10 }]),
    carParking: Object.freeze([]),
    stormDrains: Object.freeze([]),
  }),
});

/** Danh sách id đợt có hạ tầng được khai báo (W1–W4). */
export const WAVE_INFRASTRUCTURE_IDS: readonly string[] = Object.keys(WAVE_INFRASTRUCTURE);

/** Hạ tầng của một đợt (undefined nếu chưa khai báo). */
export const waveInfrastructureOf = (waveId: string): WaveInfrastructure | undefined => WAVE_INFRASTRUCTURE[waveId];
